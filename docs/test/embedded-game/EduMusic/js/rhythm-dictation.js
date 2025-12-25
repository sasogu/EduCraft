(() => {
  const ui = {
    scoreEl: document.getElementById('score'),
    livesEl: document.getElementById('lives'),
    startBtn: document.getElementById('startBtn'),
    repeatBtn: document.getElementById('repeatBtn'),
    optionsSel: document.getElementById('optionsSelect'),
    difficultySel: document.getElementById('difficultySelect'),
    feedback: document.getElementById('feedback'),
    grid: document.getElementById('optionGrid')
  };

  const audio = { ctx: null };

  function playError() {
    if (window.Sfx && typeof window.Sfx.error === 'function') {
      window.Sfx.error();
    }
  }

  function playSuccess() {
    if (window.Sfx && typeof window.Sfx.success === 'function') {
      window.Sfx.success();
    }
  }
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
    difficulty: 'text',
    includeRest: false
  };

  const SCOREBOARD_ID = 'rhythm-dictation';
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
    listen: 'Escucha el patrón y elige la opción correcta.',
    correct: '¡Correcto! Prepárate para el siguiente patrón.',
    wrong: 'Casi... Escucha de nuevo y vuelve a intentarlo.',
    gameover: 'Juego terminado. Pulsa Iniciar para practicar de nuevo.'
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

  const TEMPO_BPM = 96;
  const BEAT_SEC = 60 / TEMPO_BPM;
  const TOKEN_SPACING_MS = 140;
  const TOKEN_SPACING_SEC = TOKEN_SPACING_MS / 1000;
  const HIT_DEFAULT_DECAY_SEC = 0.26;
  const TITI_FIRST_DECAY_SEC = 0.17;
  const TITI_SECOND_DECAY_SEC = 0.22;
  const HIT_DEFAULT_VOLUME = 0.26;
  const TITI_FIRST_VOLUME = 0.25;
  const TITI_SECOND_VOLUME = 0.2;
  const BASE_TOKENS = ['TA', 'TITI'];
  const SYMBOL_TOKEN_MAP = {
    TA: { label: '♩', announce: 'TA' },
    TITI: { label: '♫', announce: 'TI-TI' },
    SU: { label: '𝄽', announce: 'silencio' }
  };
  const PATTERN_CACHE = new Map();

  function getTokenPool() {
    const pool = BASE_TOKENS.slice();
    if (state.includeRest) pool.push('SU');
    return pool;
  }

  function patternCacheKey(tokens) {
    return tokens.slice().sort().join('|');
  }

  function enumeratePatterns(tokens) {
    const key = patternCacheKey(tokens);
    if (PATTERN_CACHE.has(key)) return PATTERN_CACHE.get(key);
    const combos = [];
    const seq = new Array(4);
    const build = (idx) => {
      if (idx >= 4) {
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

  function randomPattern(excludeSet = new Set()) {
    const tokens = getTokenPool();
    const list = enumeratePatterns(tokens);
    const available = excludeSet.size
      ? list.filter(item => !excludeSet.has(item.key))
      : list;
    const source = available.length ? available : list;
    return source[Math.floor(Math.random() * source.length)];
  }

  const CAJA_SRC = '../assets/audio/caja.mp3';
  let cajaBuffer = null;
  let cajaLoading = null;

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
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function clickSound(gain = 0.18, freq = 900, dur = 0.09) {
    if (!audio.ctx) return;
    const now = audio.ctx.currentTime;
    const osc = audio.ctx.createOscillator();
    const g = audio.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(gain * currentGameVolume(), now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g).connect(audio.ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function resolveCajaUrl() {
    try {
      return new URL(CAJA_SRC, window.location.href).href;
    } catch (_) {
      return CAJA_SRC;
    }
  }

  async function loadCajaSample() {
    ensureAudio();
    const ctx = audio.ctx;
    if (!ctx) return null;
    if (cajaBuffer) return cajaBuffer;
    if (cajaLoading) return cajaLoading;
    cajaLoading = fetch(resolveCajaUrl())
      .then((resp) => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.arrayBuffer();
      })
      .then((data) => new Promise((resolve, reject) => {
        try {
          ctx.decodeAudioData(data, resolve, reject);
        } catch (err) {
          reject(err);
        }
      }))
      .then((buffer) => {
        cajaBuffer = buffer;
        cajaLoading = null;
        return buffer;
      })
      .catch((err) => {
        console.warn('[rhythm-dictation] No se pudo cargar caja.mp3', err);
        cajaLoading = null;
        return null;
      });
    return cajaLoading;
  }

  async function playCaja(volume = 0.22) {
    ensureAudio();
    const ctx = audio.ctx;
    if (!ctx) return;
    const buffer = await loadCajaSample();
    if (buffer) {
      try {
        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        gain.gain.value = volume * currentGameVolume();
        source.buffer = buffer;
        source.connect(gain).connect(ctx.destination);
        source.start();
      } catch (err) {
        console.warn('[rhythm-dictation] Error reproduciendo caja.mp3', err);
        clickSound(volume, 900, 0.09);
      }
    } else {
      clickSound(volume, 900, 0.09);
    }
  }

  async function playTokenFallback(token) {
    const beatMs = BEAT_SEC * 1000;
    ensureAudio();
    const ctx = audio.ctx;
    if (token === 'SU') {
      await wait(beatMs);
      return;
    }
    if (!ctx) {
      await wait(beatMs);
      return;
    }
    const baseFreq = 920;
    if (token === 'TA') {
      clickSound(0.2, baseFreq, 0.1);
      await wait(beatMs);
    } else if (token === 'TITI') {
      clickSound(0.18, baseFreq, 0.06);
      await wait(beatMs / 2);
      clickSound(0.14, baseFreq, 0.06);
      await wait(beatMs / 2);
    } else {
      await wait(beatMs);
    }
  }

  async function playPattern(sequence) {
    if (!sequence || !sequence.length || state.isPlayingAudio) return;
    state.isPlayingAudio = true;
    updateControls();

    const beatMs = BEAT_SEC * 1000;
    const beatGapMs = TOKEN_SPACING_MS;
    const beatGapSec = TOKEN_SPACING_SEC;

    ensureAudio();
    const ctx = audio.ctx;
    let usedBuffer = false;

    if (ctx) {
      const buffer = await loadCajaSample();
      if (buffer) {
        usedBuffer = true;
        const startTime = ctx.currentTime + 0.03;
        const decayDefault = Math.max(0.06, Math.min(buffer.duration, HIT_DEFAULT_DECAY_SEC));
        const decayTitiFirst = Math.max(0.06, Math.min(buffer.duration, TITI_FIRST_DECAY_SEC));
        const decayTitiSecond = Math.max(0.06, Math.min(buffer.duration, TITI_SECOND_DECAY_SEC));
        const mixVolume = currentGameVolume();
        const events = [];
        let cursor = startTime;
        const halfBeat = BEAT_SEC * 0.6;

        for (let i = 0; i < sequence.length; i += 1) {
          const token = sequence[i];
          if (token === 'TA') {
            events.push({ when: cursor, volume: HIT_DEFAULT_VOLUME * mixVolume, decay: decayDefault });
          } else if (token === 'TITI') {
            events.push({ when: cursor, volume: TITI_FIRST_VOLUME * mixVolume, decay: decayTitiFirst });
            events.push({ when: cursor + halfBeat, volume: TITI_SECOND_VOLUME * mixVolume, decay: decayTitiSecond });
          }
          cursor += BEAT_SEC;
          if (i < sequence.length - 1) cursor += beatGapSec;
        }

        let longestTail = 0;
        for (const evt of events) {
          const tailSec = Math.max(0.06, Math.min(buffer.duration, evt.decay || decayDefault));
          longestTail = Math.max(longestTail, tailSec);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(evt.volume, evt.when);
          gain.gain.setValueAtTime(evt.volume, evt.when + 0.04);
          gain.gain.linearRampToValueAtTime(0.0001, evt.when + tailSec);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(gain).connect(ctx.destination);
          source.start(evt.when);
          source.stop(evt.when + tailSec + 0.02);
        }

        const totalDuration = (cursor - startTime) + longestTail + 0.02;
        await wait(Math.ceil(totalDuration * 1000));
      }
    }

    if (!usedBuffer) {
      for (let i = 0; i < sequence.length; i += 1) {
        await playTokenFallback(sequence[i]);
        if (i < sequence.length - 1) await wait(beatGapMs);
      }
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
    let suffix = 'welcome';
    if (state.feedback === 'listen') suffix = 'listen';
    else if (state.feedback === 'correct') suffix = 'correct';
    else if (state.feedback === 'wrong') suffix = 'wrong';
    else if (state.feedback === 'gameover') suffix = 'gameover';
    const text = fmt(`dictation.feedback.${suffix}`) || FEEDBACK_FALLBACK[suffix] || '';
    ui.feedback.textContent = text;
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
      const row = document.createElement('div');
      row.className = 'pattern-row';
      opt.seq.forEach(token => {
        const span = document.createElement('span');
        let tokenClass = 'ta';
        if (token === 'TITI') tokenClass = 'titi';
        else if (token === 'SU') tokenClass = 'su';
        span.className = 'pattern-token ' + tokenClass;
        const isSymbols = state.difficulty === 'symbols';
        if (isSymbols) {
          const meta = SYMBOL_TOKEN_MAP[token];
          span.classList.add('as-symbol');
          span.textContent = meta ? meta.label : '♩';
          span.setAttribute('aria-label', meta ? meta.announce : token);
          span.setAttribute('title', meta ? meta.announce : token);
        } else {
          if (token === 'TA') span.textContent = 'TA';
          else if (token === 'TITI') span.textContent = 'TI-TI';
          else span.textContent = 'SU';
        }
        row.appendChild(span);
      });
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
    const chosen = randomPattern();
    state.currentPattern = chosen.seq.slice();
    state.currentKey = chosen.key;
    const answers = [chosen];
    const exclude = new Set([chosen.key]);
    while (answers.length < state.optionsCount) {
      const alt = randomPattern(exclude);
      exclude.add(alt.key);
      answers.push(alt);
    }
    // Shuffle array
    for (let i = answers.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [answers[i], answers[j]] = [answers[j], answers[i]];
    }
    state.options = answers.map(item => ({ key: item.key, seq: item.seq.slice() }));
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
      updateHud();
      updateFeedback();
      updateControls();
      setTimeout(() => {
        state.locked = false;
        state.feedback = 'listen';
        prepareRound();
      }, 900);
      if (!state.includeRest && state.score >= 5) {
        state.includeRest = true;
      }
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
    hideScoreboardPrompt();
    state.running = true;
    state.locked = false;
    state.score = 0;
    state.lives = 3;
    state.disabledOptions.clear();
    state.feedback = 'welcome';
    state.includeRest = false;
    if (ui.difficultySel) {
      const choice = ui.difficultySel.value === 'symbols' ? 'symbols' : 'text';
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
    const initial = ui.difficultySel.value === 'symbols' ? 'symbols' : 'text';
    state.difficulty = initial;
    ui.difficultySel.addEventListener('change', () => {
      const choice = ui.difficultySel.value === 'symbols' ? 'symbols' : 'text';
      state.difficulty = choice;
      renderOptions();
    });
  }

  updateHud();
  updateFeedback();
  updateControls();
})();
