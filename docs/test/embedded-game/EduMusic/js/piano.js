(function() {
  const KEYBOARD_POOL = [
    'a','w','s','e','d','f','t','g','y','h','u','j',
    'k','o','l','p',';','\'','[',']','\\','1','2','3','4'
  ];
  const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const SHARP_NOTES = new Set(['C#','D#','F#','G#','A#']);
  const KEYBOARD_RANGES = {
    full: {
      start: { octave: 4, index: 0 }, // C4
      end: { octave: 5, index: NOTE_NAMES.indexOf('F') } // F5
    },
    compact: {
      start: { octave: 4, index: 0 }, // C4
      end: { octave: 4, index: NOTE_NAMES.indexOf('B') } // B4
    }
  };
  const COMPACT_MEDIA_QUERY = '(max-width: 768px)';
  const DEFAULT_AUDIO_START = 7; // key07.ogg -> Do4 con las muestras actuales
  const AUDIO_START_INDEX = (function() {
    if (typeof window === 'undefined') return DEFAULT_AUDIO_START;
    const user = Number(window.pianoAudioBaseIndex);
    return Number.isFinite(user) && user >= 1 ? user : DEFAULT_AUDIO_START;
  })();
  const AUDIO_PATH_PREFIX = '../assets/piano/';
  const AUDIO_FILE_PREFIX = 'key';
  const PLAYBACK_RATE = 2; // reproducir una octava más aguda
  const SOLFEGE = {
    C: 'Do',
    'C#': 'Do♯',
    D: 'Re',
    'D#': 'Re♯',
    E: 'Mi',
    F: 'Fa',
    'F#': 'Fa♯',
    G: 'Sol',
    'G#': 'Sol♯',
    A: 'La',
    'A#': 'La♯',
    B: 'Si'
  };

  const keyBindings = new Map();
  const pressedKeys = new Set();
  const audioEntries = new Map();
  let audioCtx = null;
  let audioSupportWarned = false;
  let triggerIndex = 0;
  let noteSequence = [];
  let mediaQueryList = null;
  let compactLayoutCache = null;
  const clamp01 = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.min(1, Math.max(0, num));
  };
  const NOTE_ALTERNATE_TRIGGERS = new Map([
    ['E5', ['ñ']],
    ['F5', ["'", '´', 'dead']]
  ]);
  function computeGameVolume() {
    if (window.Sfx) {
      if (typeof window.Sfx.getGameVolume === 'function') {
        const vol = window.Sfx.getGameVolume();
        if (Number.isFinite(vol)) return clamp01(vol);
      }
      if (typeof window.Sfx.getState === 'function') {
        const snapshot = window.Sfx.getState();
        if (snapshot) {
          if (snapshot.muted) return 0;
          if (snapshot.volumeGame != null) return clamp01(snapshot.volumeGame);
          if (snapshot.volumeSfx != null) return clamp01(snapshot.volumeSfx);
        }
      }
    }
    return 1;
  }
  let gameVolume = computeGameVolume();
  function getGameVolume() { return gameVolume; }
  function setGameVolume(vol) {
    if (Number.isFinite(vol)) gameVolume = clamp01(vol);
    else gameVolume = computeGameVolume();
  }
  (function bindGameVolumeWatcher(attempt = 0) {
    if (window.Sfx && typeof window.Sfx.onGameVolumeChange === 'function') {
      window.Sfx.onGameVolumeChange((vol) => setGameVolume(vol));
      return;
    }
    if (attempt < 5) {
      setTimeout(() => bindGameVolumeWatcher(attempt + 1), 500);
    }
  })();

  function t(key, params, fallback) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key, params);
    }
    return fallback != null ? fallback : key;
  }

  function nextTrigger() {
    if (triggerIndex >= KEYBOARD_POOL.length) return null;
    return KEYBOARD_POOL[triggerIndex++];
  }

  function noteDisplay(noteName, octave) {
    const base = SOLFEGE[noteName] || noteName;
    return base + octave;
  }

  function padIndex(num) {
    return String(num).padStart(2, '0');
  }

  function ensureMediaQuery() {
    if (mediaQueryList || typeof window === 'undefined') return mediaQueryList;
    if (typeof window.matchMedia !== 'function') return null;
    mediaQueryList = window.matchMedia(COMPACT_MEDIA_QUERY);
    return mediaQueryList;
  }

  function matchesCompactLayout() {
    const mql = ensureMediaQuery();
    if (mql) return mql.matches;
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  }

  function getActiveRange() {
    return matchesCompactLayout() ? KEYBOARD_RANGES.compact : KEYBOARD_RANGES.full;
  }

  function ensureAudioContext() {
    if (audioCtx) return audioCtx;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (typeof Ctor !== 'function') return null;
    audioCtx = new Ctor();
    return audioCtx;
  }

  function resumeAudioContext() {
    const ctx = ensureAudioContext();
    if (!ctx) return null;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  function decodeAudioBuffer(ctx, data) {
    return new Promise((resolve, reject) => {
      try {
        ctx.decodeAudioData(data, resolve, reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  function initAudioEntries() {
    audioEntries.clear();
    noteSequence.forEach((entry, idx) => {
      const sampleIndex = AUDIO_START_INDEX + idx;
      const src = `${AUDIO_PATH_PREFIX}${AUDIO_FILE_PREFIX}${padIndex(sampleIndex)}.ogg`;
      audioEntries.set(entry.noteId, {
        src,
        buffer: null,
        loading: null,
        error: null,
        index: sampleIndex
      });
    });
  }

  function loadAudioEntry(entry, ctx) {
    if (!entry) return Promise.resolve(null);
    if (entry.buffer) return Promise.resolve(entry.buffer);
    if (!ctx) ctx = ensureAudioContext();
    if (!ctx) return Promise.resolve(null);
    if (entry.loading) return entry.loading;
    entry.loading = fetch(entry.src)
      .then((resp) => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.arrayBuffer();
      })
      .then((data) => decodeAudioBuffer(ctx, data))
      .then((buffer) => {
        entry.buffer = buffer;
        return buffer;
      })
      .catch((err) => {
        entry.error = err;
        console.warn('[piano] Error cargando muestra', entry.src, err);
        return null;
      });
    return entry.loading;
  }

  function playBuffer(ctx, buffer) {
    if (!ctx || !buffer) return;
    try {
      const mix = getGameVolume();
      if (mix <= 0) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = PLAYBACK_RATE;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(Math.max(0.001, mix), ctx.currentTime);
      source.connect(gain).connect(ctx.destination);
      source.start();
    } catch (err) {
      console.warn('[piano] No se pudo reproducir la muestra', err);
    }
  }

  function playNoteAudio(noteId) {
    if (!noteId) return;
    const entry = audioEntries.get(noteId);
    if (!entry) return;
    const ctx = resumeAudioContext();
    if (!ctx) {
      if (!audioSupportWarned) {
        audioSupportWarned = true;
        console.warn('[piano] Reproducción de audio no soportada en este navegador.');
      }
      return;
    }
    if (entry.buffer) {
      playBuffer(ctx, entry.buffer);
      return;
    }
    loadAudioEntry(entry, ctx).then((buffer) => {
      if (buffer) playBuffer(ctx, buffer);
    });
  }

  function registerTrigger(key, btn) {
    if (!key || !btn) return;
    const normalized = String(key).toLowerCase();
    if (!normalized) return;
    keyBindings.set(normalized, btn);
  }

  function bindAlternateTriggers(noteId, btn) {
    if (!noteId || !btn) return;
    const alternates = NOTE_ALTERNATE_TRIGGERS.get(noteId);
    if (!alternates || !alternates.length) return;
    alternates.forEach((altKey) => registerTrigger(altKey, btn));
  }

  function createKeyElement(options) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'piano-key';
    btn.dataset.note = options.note;
    btn.dataset.display = options.display;
    if (options.offset != null) {
      btn.dataset.offset = String(options.offset);
    }
    btn.setAttribute('aria-label', options.aria);

    if (options.trigger) {
      btn.dataset.trigger = options.trigger;
      registerTrigger(options.trigger, btn);
    }

    btn.classList.add(options.type === 'black' ? 'piano-key--black' : 'piano-key--white');
    btn.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      btn.setPointerCapture(ev.pointerId);
      setKeyActive(btn, true);
    });
    btn.addEventListener('pointerup', (ev) => {
      ev.stopPropagation();
      setKeyActive(btn, false);
    });
    btn.addEventListener('pointercancel', (ev) => {
      ev.stopPropagation();
      setKeyActive(btn, false);
    });
    btn.addEventListener('pointerleave', (ev) => {
      if (ev.pressure === 0) {
        ev.stopPropagation();
        setKeyActive(btn, false);
      }
    });

    return btn;
  }

  function setKeyActive(btn, active) {
    if (!btn) return;
    btn.classList.toggle('is-active', active);
    if (active) {
      updateDisplay(btn.dataset.display || '');
      playNoteAudio(btn.dataset.note);
    }
  }

  function buildNoteSequence(range) {
    const selectedRange = range || KEYBOARD_RANGES.full;
    const { start, end } = selectedRange;
    if (!start || !end) return [];
    const notes = [];
    let octave = start.octave;
    let index = start.index;
    while (octave < end.octave || (octave === end.octave && index <= end.index)) {
      const name = NOTE_NAMES[index];
      const noteId = `${name}${octave}`;
      notes.push({
        name,
        octave,
        type: SHARP_NOTES.has(name) ? 'black' : 'white',
        noteId,
        display: noteDisplay(name, octave)
      });
      index += 1;
      if (index >= NOTE_NAMES.length) {
        index = 0;
        octave += 1;
      }
    }
    return notes;
  }

  function renderKeyboard() {
    const host = document.getElementById('pianoKeyboard');
    if (!host) return;
    const range = getActiveRange();
    const isCompact = matchesCompactLayout();
    host.dataset.layout = isCompact ? 'compact' : 'full';
    host.innerHTML = '';
    keyBindings.clear();
    pressedKeys.clear();
    triggerIndex = 0;
    noteSequence = buildNoteSequence(range);
    initAudioEntries();

    let lastWhiteWrapper = null;

    noteSequence.forEach((entry, idx) => {
      const note = entry.noteId;
      const display = entry.display;
      const trigger = nextTrigger();
      const aria = trigger
        ? `${display}. ${t('piano.keyboard.trigger', { key: trigger.toUpperCase() }, `Tecla ${trigger.toUpperCase()}`)}`
        : display;

      if (entry.type === 'white') {
        const wrapper = document.createElement('div');
        wrapper.className = 'piano-key-wrapper';
        const whiteKey = createKeyElement({
          note,
          display,
          trigger,
          aria,
          type: 'white',
          offset: idx
        });
        wrapper.appendChild(whiteKey);
        bindAlternateTriggers(note, whiteKey);
        host.appendChild(wrapper);
        lastWhiteWrapper = wrapper;
      } else if (lastWhiteWrapper) {
        const blackKey = createKeyElement({
          note,
          display,
          trigger,
          aria,
          type: 'black',
          offset: idx
        });
        lastWhiteWrapper.appendChild(blackKey);
        bindAlternateTriggers(note, blackKey);
      }
    });
  }

  function setupKeyboardListeners() {
    window.addEventListener('keydown', (ev) => {
      const key = ev.key.toLowerCase();
      if (!keyBindings.has(key)) return;
      if (pressedKeys.has(key)) return;
      pressedKeys.add(key);
      ev.preventDefault();
      setKeyActive(keyBindings.get(key), true);
    });

    window.addEventListener('keyup', (ev) => {
      const key = ev.key.toLowerCase();
      if (!keyBindings.has(key)) return;
      pressedKeys.delete(key);
      ev.preventDefault();
      setKeyActive(keyBindings.get(key), false);
    });
  }

  function setupResponsiveKeyboard() {
    const updateLayout = () => {
      const compact = matchesCompactLayout();
      if (compactLayoutCache === compact) return;
      compactLayoutCache = compact;
      renderKeyboard();
    };

    compactLayoutCache = matchesCompactLayout();
    renderKeyboard();

    const mql = ensureMediaQuery();
    const mediaListener = () => updateLayout();
    if (mql) {
      if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', mediaListener);
      } else if (typeof mql.addListener === 'function') {
        mql.addListener(mediaListener);
      }
    }

    window.addEventListener('resize', updateLayout, { passive: true });
  }

  function updateDisplay(text) {
    const output = document.getElementById('pianoDisplay');
    if (!output) return;
    if (!text) {
      output.textContent = t('piano.keyboard.none', null, '—');
    } else {
      output.textContent = text;
    }
  }

  function currentScoreOption(select) {
    if (!select) return null;
    const { selectedIndex } = select;
    if (selectedIndex < 0) return null;
    const option = select.options[selectedIndex];
    if (!option || !option.value) return null;
    return option;
  }

  function setScoreStatus(key, params, fallback) {
    const caption = document.getElementById('scoreStatus');
    if (!caption) return;
    caption.textContent = t(key, params, fallback);
  }

  function resetScoreImage() {
    const img = document.getElementById('scoreImage');
    if (!img) return;
    img.removeAttribute('src');
    img.alt = '';
    img.dataset.loadedSrc = '';
    setScoreStatus('piano.score.hint', null, 'Selecciona una partitura para mostrarla.');
  }

  function applyScoreSelection(fromLanguageChange) {
    const select = document.getElementById('scoreSelect');
    const img = document.getElementById('scoreImage');
    if (!select || !img) return;

    const option = currentScoreOption(select);
    if (!option) {
      resetScoreImage();
      return;
    }

    const src = option.dataset.src;
    const title = option.textContent.trim();
    const captionParams = { title };

    img.alt = t('piano.score.alt', captionParams, `Partitura: ${title}`);

    const alreadyLoaded = img.dataset.loadedSrc === src;
    if (!alreadyLoaded || !fromLanguageChange) {
      if (src) {
        setScoreStatus('piano.score.loading', null, 'Cargando partitura…');
        img.dataset.loadedSrc = src;
        img.src = src;
      } else {
        resetScoreImage();
      }
    } else {
      setScoreStatus('piano.score.caption', captionParams, `Mostrando: ${title}`);
    }
  }

  function setupScoreSelector() {
    const select = document.getElementById('scoreSelect');
    if (!select) return;

    // Ensure there is a default selection (first available option)
    const firstAvailable = Array.from(select.options).find(opt => opt.value);
    if (firstAvailable) {
      select.value = firstAvailable.value;
    }

    applyScoreSelection(false);

    select.addEventListener('change', () => {
      applyScoreSelection(false);
    });

    const img = document.getElementById('scoreImage');
    if (img) {
      img.addEventListener('load', () => {
        const selectEl = document.getElementById('scoreSelect');
        const option = currentScoreOption(selectEl);
        if (!option) return;
        const title = option.textContent.trim();
        setScoreStatus('piano.score.caption', { title }, `Mostrando: ${title}`);
      });
      img.addEventListener('error', () => {
        setScoreStatus('piano.score.error', null, 'No se pudo cargar la partitura.');
      });
    }
  }

  function handleLanguageChange() {
    applyScoreSelection(true);
    const placeholder = document.querySelector('.score-select [value=""]');
    if (placeholder) {
      placeholder.selected = false;
    }
  }

  function init() {
    setupResponsiveKeyboard();
    setupKeyboardListeners();
    setupScoreSelector();
    updateDisplay('');

    if (window.i18n && typeof window.i18n.onChange === 'function') {
      window.i18n.onChange(handleLanguageChange);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
