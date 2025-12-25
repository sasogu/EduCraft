(() => {
  const ui = {
    scoreEl: document.getElementById('score'),
    livesEl: document.getElementById('lives'),
    startBtn: document.getElementById('startBtn'),
    repeatBtn: document.getElementById('repeatBtn'),
    optionsSel: document.getElementById('optionsSelect'),
    difficultySel: document.getElementById('difficultySelect'),
    feedback: document.getElementById('feedback'),
    grid: document.getElementById('optionGrid'),
  };

  const audio = { ctx: null };
  const state = {
    running: false,
    locked: false,
    score: 0,
    lives: 3,
    isPlayingAudio: false,
    optionsCount: 3,
    currentPattern: null,
    currentKey: null,
    options: [],
    disabledOptions: new Set(),
    lastSelection: null,
    feedback: 'welcome',
    difficulty: 'names',
    includeLa: false,
    includeDo: false,
    includeFa: false,
    includeRe: false,
    includeSi: false,
  };

  const clamp01 = (v) => {
    const num = Number(v);
    if (!Number.isFinite(num)) return 0;
    return Math.min(1, Math.max(0, num));
  };

  function currentGameVolume() {
    if (window.Sfx) {
      if (typeof window.Sfx.getGameVolume === 'function') {
        const val = window.Sfx.getGameVolume();
        if (Number.isFinite(val)) return clamp01(val);
      }
      if (typeof window.Sfx.getState === 'function') {
        const s = window.Sfx.getState();
        if (s) {
          if (s.muted) return 0;
          if (s.volumeGame != null) return clamp01(s.volumeGame);
          if (s.volumeSfx != null) return clamp01(s.volumeSfx);
        }
      }
    }
    return 1;
  }

  const SCOREBOARD_ID = 'melody-dictation';
  function showScoreboardPrompt(score) {
    const finalScore = Number(score) || 0;
    if (finalScore <= 0) return;
    if (window.GameOverOverlay && typeof window.GameOverOverlay.show === 'function') {
      window.GameOverOverlay.show({
        gameId: SCOREBOARD_ID,
        score: finalScore,
        onRetry: () => startGame(),
      });
      return;
    }
    if (window.ScoreService) {
      window.ScoreService.showSave(SCOREBOARD_ID, finalScore);
    }
  }
  function hideScoreboardPrompt() {
    if (window.GameOverOverlay && typeof window.GameOverOverlay.isOpen === 'function' && window.GameOverOverlay.isOpen()) {
      window.GameOverOverlay.hide();
    }
    if (window.ScoreService) {
      window.ScoreService.hideSave(SCOREBOARD_ID);
    }
  }

  const FEEDBACK_FALLBACK = {
    welcome: 'Pulsa Iniciar para comenzar un nuevo dictado.',
    listen: 'Escucha la melodía y elige la opción correcta.',
    correct: '¡Correcto! Presta atención al siguiente dictado.',
    wrong: 'Casi... Escucha de nuevo y vuelve a intentarlo.',
    gameover: 'Juego terminado. Pulsa Iniciar para practicar de nuevo.',
  };

  const TEMPO_BPM = 96;
  const BEAT_MS = (60 / TEMPO_BPM) * 1000;
  const BASE_NOTES = ['SOL', 'MI'];
  const EXTRA_LA = 'LA';
  const EXTRA_DO = 'DO';
  const EXTRA_FA = 'FA';
  const EXTRA_RE = 'RE';
  const EXTRA_SI = 'SI';
  const NOTE_FREQ = {
    SOL: 392.0,
    MI: 329.63,
    LA: 440.0,
    DO: 261.63,
    FA: 349.23,
    RE: 293.66,
    SI: 493.88,
  };
  const SAMPLE_BASE_PATH = '../assets/piano/';
  const SAMPLE_FILES = {
    SOL: 'key14.ogg',
    MI: 'key11.ogg',
    LA: 'key16.ogg',
    DO: 'key07.ogg',
    FA: 'key12.ogg',
    RE: 'key09.ogg',
    SI: 'key18.ogg',
  };
  const SAMPLE_PLAYBACK_RATE = 2;
  const sampleCache = new Map();
  const PATTERN_CACHE = new Map();
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const STAFF_HEIGHT = 80;
  const STAFF_WIDTH = 180;
  const NOTE_STAFF_POS = {
    SOL: 3,
    MI: 4,
    LA: 2.5,
    DO: 5,
    FA: 3.5,
    RE: 4.5,
    SI: 2,
  };

  function enumeratePatterns(tokens) {
    const key = tokens.slice().sort().join('|');
    if (PATTERN_CACHE.has(key)) return PATTERN_CACHE.get(key);
    const combos = [];
    const seq = new Array(4);
    const build = (idx) => {
      if (idx >= seq.length) {
        const finalSeq = seq.slice();
        combos.push({ key: finalSeq.join('-'), seq: finalSeq });
        return;
      }
      for (const token of tokens) {
        seq[idx] = token;
        build(idx + 1);
      }
    };
    build(0);
    PATTERN_CACHE.set(key, combos);
    return combos;
  }

  function randomPattern(tokens, excludeSet = new Set()) {
    const list = enumeratePatterns(tokens);
    const available = excludeSet.size
      ? list.filter((item) => !excludeSet.has(item.key))
      : list;
    const source = available.length ? available : list;
    return source[Math.floor(Math.random() * source.length)];
  }

  function getNotePool() {
    const pool = BASE_NOTES.slice();
    if (state.includeLa) pool.push(EXTRA_LA);
    if (state.includeDo) pool.push(EXTRA_DO);
    if (state.includeFa) pool.push(EXTRA_FA);
    if (state.includeRe) pool.push(EXTRA_RE);
    if (state.includeSi) pool.push(EXTRA_SI);
    return pool;
  }

  function ensureAudio() {
    if (!audio.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audio.ctx = new AC();
    }
    if (audio.ctx && audio.ctx.state === 'suspended') {
      audio.ctx.resume().catch(() => {});
    }
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getSampleEntry(note) {
    if (!SAMPLE_FILES[note]) return null;
    if (!sampleCache.has(note)) {
      sampleCache.set(note, {
        buffer: null,
        loading: null,
        error: null,
      });
    }
    return sampleCache.get(note);
  }

  function decodeBuffer(ctx, data) {
    return new Promise((resolve, reject) => {
      try {
        ctx.decodeAudioData(data, resolve, reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  async function loadSample(note) {
    const entry = getSampleEntry(note);
    ensureAudio();
    const ctx = audio.ctx;
    if (!entry || !ctx) return null;
    if (entry.buffer) return entry.buffer;
    if (entry.loading) return entry.loading;
    const src = SAMPLE_BASE_PATH + SAMPLE_FILES[note];
    entry.loading = fetch(src)
      .then((resp) => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.arrayBuffer();
      })
      .then((data) => decodeBuffer(ctx, data))
      .then((buffer) => {
        entry.buffer = buffer;
        entry.loading = null;
        entry.error = null;
        return buffer;
      })
      .catch((err) => {
        entry.error = err;
        entry.loading = null;
        console.warn('[melody-dictation] Error loading sample', note, err);
        return null;
      });
    return entry.loading;
  }

  async function playSample(note) {
    const ctx = audio.ctx;
    if (!ctx) return false;
    const buffer = await loadSample(note);
    if (!buffer) return false;
    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = SAMPLE_PLAYBACK_RATE;
      const mixVolume = currentGameVolume();
      const gain = ctx.createGain();
      gain.gain.value = mixVolume;
      source.connect(gain).connect(ctx.destination);
      source.start();
      return true;
    } catch (err) {
      console.warn('[melody-dictation] Unable to play sample', note, err);
      return false;
    }
  }

  async function preloadSamples() {
    Object.keys(SAMPLE_FILES).forEach((note) => {
      loadSample(note).catch(() => {});
    });
  }

  async function playNote(noteName) {
    ensureAudio();
    const ctx = audio.ctx;
    if (!ctx) {
      await wait(BEAT_MS);
      return;
    }
    const played = await playSample(noteName);
    if (!played) {
      const freq = NOTE_FREQ[noteName] || 440;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      const gain = ctx.createGain();
      const mix = currentGameVolume();
      gain.gain.setValueAtTime(Math.max(mix, 0.0001), now);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    }
    await wait(BEAT_MS);
  }

  function playSuccess() {
    if (window.Sfx && typeof window.Sfx.success === 'function') {
      window.Sfx.success();
    }
  }

  function playError() {
    if (window.Sfx && typeof window.Sfx.error === 'function') {
      window.Sfx.error();
    }
  }

  async function playPattern(sequence) {
    if (!sequence || !sequence.length || state.isPlayingAudio) return;
    state.isPlayingAudio = true;
    updateControls();
    for (let i = 0; i < sequence.length; i += 1) {
      await playNote(sequence[i]);
      if (i < sequence.length - 1) await wait(120);
    }
    state.isPlayingAudio = false;
    updateControls();
  }

  function fmt(key, params) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key, params);
    }
    return null;
  }

  function updateHud() {
    if (ui.scoreEl) {
      ui.scoreEl.textContent = fmt('hud.points', { n: state.score }) || `Puntos: ${state.score}`;
    }
    if (ui.livesEl) {
      ui.livesEl.textContent = fmt('hud.lives', { n: state.lives }) || `Vidas: ${state.lives}`;
    }
  }

  function updateFeedback() {
    if (!ui.feedback) return;
    let key = 'welcome';
    if (state.feedback === 'listen') key = 'listen';
    else if (state.feedback === 'correct') key = 'correct';
    else if (state.feedback === 'wrong') key = 'wrong';
    else if (state.feedback === 'gameover') key = 'gameover';
    const text = fmt(`melodic.feedback.${key}`) || FEEDBACK_FALLBACK[key] || '';
    ui.feedback.textContent = text;
  }

  function createStaffSvg(sequence) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${STAFF_WIDTH} ${STAFF_HEIGHT}`);
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('aria-hidden', 'true');

    const paddingX = 18;
    const paddingY = 14;
    const spacingY = 9;
    const lineLength = STAFF_WIDTH - paddingX * 2;
    for (let i = 0; i < 5; i += 1) {
      const y = paddingY + i * spacingY;
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', String(paddingX));
      line.setAttribute('x2', String(paddingX + lineLength));
      line.setAttribute('y1', String(y));
      line.setAttribute('y2', String(y));
      svg.appendChild(line);
    }

    const noteSpacing = (lineLength - 24) / 3;
    for (let i = 0; i < sequence.length; i += 1) {
      const note = sequence[i];
      const cx = paddingX + 12 + i * noteSpacing;
      const pos = NOTE_STAFF_POS[note] != null ? NOTE_STAFF_POS[note] : 3;
      const cy = paddingY + spacingY * pos;

      const head = document.createElementNS(SVG_NS, 'ellipse');
      head.setAttribute('cx', String(cx));
      head.setAttribute('cy', String(cy));
      head.setAttribute('rx', '8');
      head.setAttribute('ry', '6');
      head.setAttribute('class', 'note-head');
      svg.appendChild(head);

      const stem = document.createElementNS(SVG_NS, 'line');
      stem.setAttribute('x1', String(cx + 7));
      stem.setAttribute('x2', String(cx + 7));
      stem.setAttribute('y1', String(cy - 1));
      stem.setAttribute('y2', String(cy - spacingY * 3));
      stem.setAttribute('class', 'stem');
      svg.appendChild(stem);

      if (note === EXTRA_DO) {
        const ledger = document.createElementNS(SVG_NS, 'line');
        const ledgerY = paddingY + spacingY * 5;
        ledger.setAttribute('x1', String(cx - 12));
        ledger.setAttribute('x2', String(cx + 12));
        ledger.setAttribute('y1', String(ledgerY));
        ledger.setAttribute('y2', String(ledgerY));
        ledger.setAttribute('class', 'ledger');
        svg.appendChild(ledger);
      }
    }

    return svg;
  }

  function updateControls() {
    if (ui.repeatBtn) {
      ui.repeatBtn.disabled = !state.currentPattern || state.isPlayingAudio;
    }
    if (ui.optionsSel) {
      ui.optionsSel.value = String(state.optionsCount);
    }
    if (ui.difficultySel) {
      ui.difficultySel.value = state.difficulty;
    }
    renderOptions();
  }

  function renderOptions() {
    if (!ui.grid) return;
    const frag = document.createDocumentFragment();
    const disabled = !state.running || state.locked || state.isPlayingAudio;
    for (const opt of state.options) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pattern-card';
      btn.dataset.patternKey = opt.key;
      const label = opt.seq.join(' ');
      btn.setAttribute('aria-label', label);
      btn.title = label;
      let row;
      if (state.difficulty === 'staff') {
        row = document.createElement('div');
        row.className = 'pattern-staff';
        row.appendChild(createStaffSvg(opt.seq));
      } else {
        row = document.createElement('div');
        row.className = 'pattern-row';
        opt.seq.forEach((note) => {
          const span = document.createElement('span');
          span.className = 'pattern-token ' + note.toLowerCase();
          span.textContent = note;
          span.setAttribute('aria-label', note);
          row.appendChild(span);
        });
      }
      btn.appendChild(row);
      const alreadyDisabled = state.disabledOptions.has(opt.key);
      btn.disabled = disabled || alreadyDisabled;
      if (state.feedback === 'correct' && opt.key === state.currentKey) {
        btn.classList.add('is-correct');
      }
      if (state.feedback === 'wrong' && opt.key === state.lastSelection) {
        btn.classList.add('is-error');
      }
      if (state.feedback === 'gameover') {
        if (opt.key === state.currentKey) btn.classList.add('is-correct');
        if (opt.key === state.lastSelection && state.lastSelection !== state.currentKey) {
          btn.classList.add('is-error');
        }
      }
      btn.addEventListener('click', () => handleAnswer(opt.key));
      frag.appendChild(btn);
    }
    ui.grid.innerHTML = '';
    ui.grid.appendChild(frag);
  }

  function prepareRound() {
    if (!state.running) return;
    state.locked = false;
    state.disabledOptions.clear();
    state.feedback = 'listen';
    state.lastSelection = null;
    const pool = getNotePool();
    const chosen = randomPattern(pool);
    state.currentPattern = chosen.seq.slice();
    state.currentKey = chosen.key;
    const answers = [chosen];
    const exclude = new Set([chosen.key]);
    while (answers.length < state.optionsCount) {
      const alt = randomPattern(pool, exclude);
      exclude.add(alt.key);
      answers.push(alt);
    }
    for (let i = answers.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [answers[i], answers[j]] = [answers[j], answers[i]];
    }
    state.options = answers.map((item) => ({ key: item.key, seq: item.seq.slice() }));
    updateHud();
    updateFeedback();
    updateControls();
    setTimeout(() => playPattern(state.currentPattern), 350);
  }

  function handleAnswer(key) {
    if (!state.running || state.locked || !state.currentPattern) return;
    if (state.disabledOptions.has(key)) return;
    state.lastSelection = key;
    if (key === state.currentKey) {
      state.score += 1;
      state.feedback = 'correct';
      state.locked = true;
      playSuccess();
      if (!state.includeLa && state.score >= 5) {
        state.includeLa = true;
        loadSample(EXTRA_LA).catch(() => {});
      }
      if (!state.includeDo && state.score >= 10) {
        state.includeDo = true;
        loadSample(EXTRA_DO).catch(() => {});
      }
      if (!state.includeFa && state.score >= 15) {
        state.includeFa = true;
        loadSample(EXTRA_FA).catch(() => {});
      }
      if (!state.includeRe && state.score >= 20) {
        state.includeRe = true;
        loadSample(EXTRA_RE).catch(() => {});
      }
      if (!state.includeSi && state.score >= 25) {
        state.includeSi = true;
        loadSample(EXTRA_SI).catch(() => {});
      }
      updateHud();
      updateFeedback();
      updateControls();
      setTimeout(() => {
        state.locked = false;
        state.feedback = 'listen';
        prepareRound();
      }, 900);
    } else {
      state.lives -= 1;
      state.feedback = 'wrong';
      state.disabledOptions.add(key);
      playError();
      updateHud();
      updateFeedback();
      updateControls();
      if (state.lives <= 0) {
        state.feedback = 'gameover';
        state.running = false;
        state.locked = true;
        updateFeedback();
        updateControls();
        showScoreboardPrompt(state.score);
      }
    }
  }

  function startGame() {
    ensureAudio();
    preloadSamples();
    hideScoreboardPrompt();
    state.running = true;
    state.locked = false;
    state.score = 0;
    state.lives = 3;
    state.disabledOptions.clear();
    state.feedback = 'welcome';
    state.includeLa = false;
    state.includeDo = false;
    state.includeFa = false;
    state.includeRe = false;
    state.includeSi = false;
    if (ui.difficultySel) {
      const choice = ui.difficultySel.value === 'staff' ? 'staff' : 'names';
      state.difficulty = choice;
    }
    updateHud();
    updateFeedback();
    updateControls();
    prepareRound();
  }

  if (ui.startBtn) {
    ui.startBtn.addEventListener('click', () => {
      startGame();
    });
  }

  if (ui.repeatBtn) {
    ui.repeatBtn.addEventListener('click', () => {
      if (state.isPlayingAudio || !state.currentPattern) return;
      playPattern(state.currentPattern);
    });
  }

  if (ui.optionsSel) {
    state.optionsCount = parseInt(ui.optionsSel.value, 10) || 3;
    ui.optionsSel.addEventListener('change', () => {
      const next = parseInt(ui.optionsSel.value, 10);
      if (!Number.isFinite(next) || next < 2 || next > 4) return;
      state.optionsCount = next;
      if (state.running) {
        prepareRound();
      } else {
        updateControls();
      }
    });
  }

  if (ui.difficultySel) {
    const initial = ui.difficultySel.value === 'staff' ? 'staff' : 'names';
    state.difficulty = initial;
    ui.difficultySel.addEventListener('change', () => {
      const choice = ui.difficultySel.value === 'staff' ? 'staff' : 'names';
      state.difficulty = choice;
      renderOptions();
    });
  }

  updateHud();
  updateFeedback();
  updateControls();
})();
