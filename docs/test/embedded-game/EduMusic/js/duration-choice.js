(() => {
  const ui = {
    startBtn: document.getElementById('durationStart'),
    listenBtn: document.getElementById('durationListen'),
    resetBtn: document.getElementById('durationReset'),
    viewTabs: Array.from(document.querySelectorAll('[data-duration-view]')),
    cardsHost: document.getElementById('durationCards'),
    prompt: document.getElementById('durationPrompt'),
    feedback: document.getElementById('durationFeedback'),
    score: document.getElementById('durationScore'),
    streak: document.getElementById('durationStreak'),
    lives: document.getElementById('durationLives'),
    level: document.getElementById('durationLevel'),
  };

  if (!ui.startBtn || !ui.cardsHost || !ui.prompt || !ui.feedback) return;

  const GAME_ID = 'duration-choice';
  const MAX_LIVES = 3;
  const NEXT_DELAY_MS = 900;
  const BASE_BEAT_SEC = 0.62;
  const TOKEN_GAP_SEC = 0.12;

  const LEVELS = [
    { min: 18, level: 4, options: 4, tokens: ['quarter', 'pair-eighths', 'quarter-rest', 'half', 'sixteenth-group'] },
    { min: 9, level: 3, options: 3, tokens: ['quarter', 'pair-eighths', 'quarter-rest', 'half'] },
    { min: 4, level: 2, options: 3, tokens: ['quarter', 'pair-eighths', 'quarter-rest'] },
    { min: 0, level: 1, options: 2, tokens: ['quarter', 'pair-eighths'] },
  ];

  const TOKEN_LIBRARY = {
    quarter: {
      id: 'quarter',
      beats: 1,
      labelKey: 'duration.token.quarter',
      fallback: 'Negra',
      symbol: '♩',
    },
    'pair-eighths': {
      id: 'pair-eighths',
      beats: 1,
      labelKey: 'duration.token.pair_eighths',
      fallback: 'Dos corcheas',
      symbol: '♫',
    },
    'quarter-rest': {
      id: 'quarter-rest',
      beats: 1,
      labelKey: 'duration.token.quarter_rest',
      fallback: 'Silencio de negra',
      symbol: '𝄽',
    },
    half: {
      id: 'half',
      beats: 2,
      labelKey: 'duration.token.half',
      fallback: 'Blanca',
      symbol: '𝅗𝅥',
    },
    'sixteenth-group': {
      id: 'sixteenth-group',
      beats: 1,
      labelKey: 'duration.token.sixteenth_group',
      fallback: 'Cuatro semicorcheas',
      symbol: '♬',
    },
  };

  const FALLBACK_TEXT = {
    'duration.prompt.idle': () => 'Pulsa “Comenzar” para generar un patrón de duraciones.',
    'duration.prompt.listen': () => 'Escucha el patrón y elige la tarjeta con la misma combinación.',
    'duration.prompt.levelup': ({ cards }) => `Nuevo nivel: ahora hay ${cards || 0} tarjetas disponibles.`,
    'duration.feedback.idle': () => 'Escucha el patrón y elige la tarjeta correcta.',
    'duration.feedback.ready': () => 'Pulsa en la tarjeta que coincida con el patrón.',
    'duration.feedback.listening': () => 'Escucha con atención…',
    'duration.feedback.correct': ({ score }) => `¡Correcto! Puntuación: ${score ?? 0}`,
    'duration.feedback.levelup': ({ cards }) => `Subiste de nivel: ${cards ?? 0} opciones por ronda.`,
    'duration.feedback.wrong': ({ lives }) => {
      if (lives === 1) return 'No coincide. ¡Última vida!';
      const remaining = lives ?? 0;
      return remaining > 0
        ? `No coincide. Te quedan ${remaining} vidas.`
        : 'No coincide. Te quedaste sin vidas.';
    },
    'duration.feedback.lastlife': () => 'No coincide. ¡Última vida!',
    'duration.feedback.gameover': ({ score }) => `Partida terminada. Puntuación: ${score ?? 0}`,
    'duration.controls.start': () => 'Comenzar',
    'duration.controls.playing': () => 'Jugando…',
    'duration.controls.listen': () => 'Escuchar patrón',
    'duration.controls.reset': () => 'Reiniciar',
    'duration.view.lines': () => 'Líneas',
    'duration.view.symbols': () => 'Representación musical',
  };

  const state = {
    running: false,
    locked: false,
    score: 0,
    streak: 0,
    lives: MAX_LIVES,
    level: 1,
    target: null,
    options: [],
    awaitingAnswer: false,
    nextTimer: null,
    previousKey: null,
    view: 'lines',
  };

  const audio = {
    ctx: null,
    master: null,
    playing: false,
  };

  function clamp01(v) {
    const num = Number(v);
    if (!Number.isFinite(num)) return 0;
    if (num <= 0) return 0;
    if (num >= 1) return 1;
    return num;
  }

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

  function ensureAudio() {
    if (!audio.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audio.ctx = new AC();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = clamp01(currentGameVolume());
      audio.master.connect(audio.ctx.destination);
    }
    if (!audio.ctx) return null;
    if (audio.ctx.state === 'suspended') {
      audio.ctx.resume().catch(() => {});
    }
    if (audio.master) {
      const now = audio.ctx.currentTime;
      const vol = clamp01(currentGameVolume());
      try {
        audio.master.gain.cancelScheduledValues(now);
        audio.master.gain.setValueAtTime(audio.master.gain.value, now);
      } catch (_) {}
      audio.master.gain.linearRampToValueAtTime(vol, now + 0.1);
    }
    return audio.ctx;
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

  function wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  const BASE_FREQ = 540;

  function scheduleBeep(start, duration, options = {}) {
    const ctx = audio.ctx;
    if (!ctx || !audio.master) return;
    const freq = Number(options.freq) || BASE_FREQ;
    const baseVolume = Number.isFinite(options.volume) ? options.volume : 0.75;
    const volume = clamp01(currentGameVolume()) * baseVolume;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), start + 0.015);
    const sustain = Math.max(0.04, duration * 0.6);
    gain.gain.linearRampToValueAtTime(Math.max(0.001, volume * 0.78), start + sustain);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(audio.master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  function tokenDurationSec(tokenId) {
    const token = TOKEN_LIBRARY[tokenId];
    if (!token) return BASE_BEAT_SEC;
    return token.beats * BASE_BEAT_SEC;
  }

  function scheduleToken(tokenId, when) {
    const ctx = audio.ctx;
    if (!ctx) return tokenDurationSec(tokenId) + TOKEN_GAP_SEC;
    const total = tokenDurationSec(tokenId);
    switch (tokenId) {
      case 'quarter': {
        scheduleBeep(when, total * 0.92, { volume: 0.3 });
        break;
      }
      case 'pair-eighths': {
        const halfBeat = BASE_BEAT_SEC * 0.6;
        const firstDur = Math.max(0.12, Math.min(total, halfBeat) * 0.88);
        const secondDur = Math.max(0.1, Math.min(total, halfBeat) * 0.8);
        scheduleBeep(when, firstDur, { volume: 0.32, freq: BASE_FREQ });
        scheduleBeep(when + halfBeat, secondDur, { volume: 0.25, freq: BASE_FREQ });
        break;
      }
      case 'quarter-rest': {
        break;
      }
      case 'half': {
        scheduleBeep(when, total * 0.95, { volume: 0.36, freq: BASE_FREQ });
        break;
      }
      case 'sixteenth-group': {
        const slice = total / 4;
        for (let i = 0; i < 4; i += 1) {
          const level = i === 0 ? 0.28 : 0.22;
          scheduleBeep(when + (slice * i), slice * 0.78, { volume: level, freq: BASE_FREQ });
        }
        break;
      }
      default: {
        scheduleBeep(when, total * 0.9, { volume: 0.74 });
        break;
      }
    }
    return total + TOKEN_GAP_SEC;
  }

  async function playPattern(patternTokens) {
    const ctx = ensureAudio();
    if (!ctx) return;
    audio.playing = true;
    try {
      let when = ctx.currentTime + 0.08;
      for (let index = 0; index < patternTokens.length; index += 1) {
        const tokenId = patternTokens[index];
        const step = scheduleToken(tokenId, when);
        when += step;
      }
      await wait((when - ctx.currentTime + 0.25) * 1000);
    } finally {
      audio.playing = false;
    }
  }

  async function playCurrentPattern(options = {}) {
    if (!state.target || audio.playing) return;
    const ctx = ensureAudio();
    const { lock = true } = options;
    if (!ctx) {
      if (lock) {
        state.locked = false;
        setCardsDisabled(false);
      }
      if (ui.listenBtn) {
        ui.listenBtn.disabled = !state.running || state.lives <= 0;
      }
      return;
    }
    if (ui.listenBtn) ui.listenBtn.disabled = true;
    const hadLock = state.locked;
    const unlockAfter = lock && !hadLock;
    if (lock) {
      state.locked = true;
      setCardsDisabled(true);
    }
    if (state.awaitingAnswer) {
      setFeedback('duration.feedback.listening');
    }
    try {
      await playPattern(state.target.tokens);
    } finally {
      if (ui.listenBtn) {
        ui.listenBtn.disabled = !state.running || state.lives <= 0;
      }
      if (!state.running || state.lives <= 0) return;
      if (unlockAfter) {
        state.locked = false;
        setCardsDisabled(false);
        if (state.awaitingAnswer) {
          setFeedback('duration.feedback.ready');
        }
      } else {
        state.locked = hadLock;
        setCardsDisabled(state.locked);
        if (state.awaitingAnswer && !state.locked) {
          setFeedback('duration.feedback.ready');
        }
      }
    }
  }

  function t(key, params, fallback) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      const value = window.i18n.t(key, params);
      if (value && value !== key) return value;
    }
    const fb = FALLBACK_TEXT[key];
    if (typeof fb === 'function') return fb(params || {});
    if (fb != null) return fb;
    if (typeof fallback === 'function') return fallback(params || {});
    return fallback != null ? fallback : key;
  }

  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getLevelEntry(score) {
    for (const entry of LEVELS) {
      if (score >= entry.min) return entry;
    }
    return LEVELS[LEVELS.length - 1];
  }

  function updateLevel() {
    const previous = state.level;
    const entry = getLevelEntry(state.score);
    state.level = entry ? entry.level : 1;
    if (ui.level) ui.level.textContent = String(state.level);
    return state.level !== previous;
  }

  function updateHud() {
    if (ui.score) ui.score.textContent = String(state.score);
    if (ui.streak) ui.streak.textContent = String(state.streak);
    if (ui.lives) ui.lives.textContent = String(state.lives);
    updateLevel();
  }

  function setPrompt(key, params, fallback) {
    if (!ui.prompt) return;
    ui.prompt.textContent = t(key, params, fallback);
  }

  function setFeedback(key, params, fallback) {
    if (!ui.feedback) return;
    ui.feedback.textContent = t(key, params, fallback);
  }

  function clearNextTimer() {
    if (state.nextTimer) {
      clearTimeout(state.nextTimer);
      state.nextTimer = null;
    }
  }

  function setCardsDisabled(disabled) {
    if (!ui.cardsHost) return;
    ui.cardsHost.querySelectorAll('.duration-card').forEach((btn) => {
      btn.classList.toggle('is-disabled', disabled);
      btn.disabled = disabled;
    });
  }

  function describeToken(tokenId) {
    const token = TOKEN_LIBRARY[tokenId];
    if (!token) return tokenId;
    return t(token.labelKey, null, token.fallback);
  }

  function describePattern(tokens) {
    return tokens.map((tokenId) => describeToken(tokenId)).join(', ');
  }

  function renderCards(options) {
    if (!ui.cardsHost) return;
    ui.cardsHost.innerHTML = '';
    const fragment = document.createDocumentFragment();
    options.forEach((pattern) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'duration-card';
      button.dataset.pattern = pattern.id;
      button.setAttribute('aria-label', describePattern(pattern.tokens));

      const sequence = document.createElement('div');
      sequence.className = 'duration-card__sequence';
      if (state.view === 'lines') {
        sequence.classList.add('duration-card__sequence--lines');
      }
      pattern.tokens.forEach((tokenId) => {
        const element = createTokenVisual(tokenId, state.view);
        if (element) sequence.appendChild(element);
      });

      button.append(sequence);
      button.addEventListener('click', () => handleSelection(pattern.id, button));
      fragment.appendChild(button);
    });
    ui.cardsHost.appendChild(fragment);
    setCardsDisabled(state.locked);
  }

  function createTokenVisual(tokenId, view) {
    if (view === 'notation') {
      const token = TOKEN_LIBRARY[tokenId];
      const span = document.createElement('span');
      span.className = `duration-card__token duration-card__token--${token ? token.id : 'unknown'}`;
      span.textContent = token ? token.symbol : '?';
      span.setAttribute('aria-hidden', 'true');
      return span;
    }
    return createLineToken(tokenId);
  }

  function createLineToken(tokenId) {
    const wrapper = document.createElement('span');
    wrapper.className = `duration-line duration-line--${tokenId}`;
    wrapper.setAttribute('aria-hidden', 'true');

    const addBar = (size) => {
      const bar = document.createElement('span');
      bar.className = `duration-line__bar duration-line__bar--${size}`;
      wrapper.appendChild(bar);
    };

    switch (tokenId) {
      case 'pair-eighths': {
        addBar('short');
        addBar('short');
        break;
      }
      case 'sixteenth-group': {
        for (let i = 0; i < 4; i += 1) addBar('short');
        break;
      }
      case 'quarter': {
        addBar('medium');
        break;
      }
      case 'half': {
        addBar('long');
        break;
      }
      case 'quarter-rest': {
        wrapper.classList.add('duration-line--blank');
        break;
      }
      default: {
        addBar('medium');
        break;
      }
    }
    return wrapper;
  }

  function randomPatternTokens(tokenIds) {
    const tokens = [];
    const available = tokenIds.map((id) => TOKEN_LIBRARY[id]).filter(Boolean);
    if (!available.length) return tokens;
    let remaining = 4; // beats per bar
    while (remaining > 0) {
      const candidates = available.filter((entry) => entry.beats <= remaining);
      const entry = candidates[Math.floor(Math.random() * candidates.length)];
      tokens.push(entry.id);
      remaining -= entry.beats;
    }
    return tokens;
  }

  let patternCounter = 0;
  function createPattern(tokenIds, avoidKey) {
    let attempts = 0;
    while (attempts < 40) {
      const tokens = randomPatternTokens(tokenIds);
      const key = tokens.join('|');
      if (tokens.length && key !== avoidKey) {
        patternCounter += 1;
        return {
          id: `pattern-${patternCounter}`,
          tokens,
          key,
        };
      }
      attempts += 1;
    }
    return null;
  }

  function scheduleNextChallenge() {
    clearNextTimer();
    state.nextTimer = setTimeout(() => {
      state.nextTimer = null;
      if (state.running) {
        newChallenge();
      }
    }, NEXT_DELAY_MS);
  }

  function newChallenge() {
    if (!state.running) return;
    clearNextTimer();
    state.locked = false;
    const entry = getLevelEntry(state.score);
    const totalOptions = Math.min(entry ? entry.options : 2, 4);
    const tokenPool = entry ? entry.tokens : LEVELS[LEVELS.length - 1].tokens;
    const seen = new Map();
    const options = [];
    let target = null;
    while (options.length < totalOptions) {
      const pattern = createPattern(tokenPool, options.length === 0 ? state.previousKey : null);
      if (!pattern) break;
      if (seen.has(pattern.key)) continue;
      seen.set(pattern.key, pattern);
      options.push(pattern);
    }
    if (options.length === 0) return;
    const [first, ...rest] = shuffle(options);
    target = first;
    const selection = shuffle([target, ...rest]);
    if (!selection.some((opt) => opt.key === target.key)) {
      selection[Math.floor(Math.random() * selection.length)] = target;
    }
    state.target = target;
    state.options = selection;
    state.awaitingAnswer = true;
    renderCards(selection);
    if (ui.listenBtn) {
      ui.listenBtn.hidden = false;
      ui.listenBtn.disabled = false;
    }
    setPrompt('duration.prompt.listen');
    setFeedback('duration.feedback.ready');
    setTimeout(() => {
      if (state.running && state.target && state.target.key === target.key) {
        playCurrentPattern({ lock: true }).catch(() => {});
      }
    }, 140);
  }

  function hideScorePrompt() {
    if (window.GameOverOverlay && typeof window.GameOverOverlay.isOpen === 'function' && window.GameOverOverlay.isOpen()) {
      window.GameOverOverlay.hide();
    }
    if (window.ScoreService && typeof window.ScoreService.hideSave === 'function') {
      window.ScoreService.hideSave(GAME_ID);
    }
  }

  function showScorePrompt(finalScore) {
    const score = Number(finalScore) || 0;
    if (score <= 0) return;
    if (window.GameOverOverlay && typeof window.GameOverOverlay.show === 'function') {
      window.GameOverOverlay.show({
        gameId: GAME_ID,
        score,
        onRetry: () => {
          startGame();
        },
      });
      return;
    }
    if (window.ScoreService && typeof window.ScoreService.showSave === 'function') {
      window.ScoreService.showSave(GAME_ID, score);
    }
  }

  function endGame() {
    state.running = false;
    state.locked = true;
    clearNextTimer();
    setCardsDisabled(true);
    setPrompt('duration.prompt.idle');
    setFeedback('duration.feedback.gameover', { score: state.score });
    if (ui.startBtn) {
      ui.startBtn.disabled = false;
      ui.startBtn.dataset.i18n = 'duration.controls.start';
      ui.startBtn.textContent = t('duration.controls.start');
    }
    if (ui.resetBtn) {
      ui.resetBtn.hidden = true;
    }
    if (ui.listenBtn) {
      ui.listenBtn.hidden = true;
      ui.listenBtn.disabled = true;
    }
    showScorePrompt(state.score);
  }

  function handleCorrect(selectionButton) {
    const previousLevel = state.level;
    state.awaitingAnswer = false;
    state.score += 1;
    state.streak += 1;
    state.previousKey = state.target ? state.target.key : null;
    updateHud();
    playSuccess();
    if (selectionButton) selectionButton.dataset.state = 'correct';
    setFeedback('duration.feedback.correct', { score: state.score });
    const levelChanged = state.level !== previousLevel;
    if (levelChanged) {
      const cards = getLevelEntry(state.score)?.options || 2;
      setFeedback('duration.feedback.levelup', { cards });
      setPrompt('duration.prompt.levelup', { cards });
    }
    if (ui.listenBtn) ui.listenBtn.disabled = true;
    setCardsDisabled(true);
    scheduleNextChallenge();
  }

  function handleWrong(selectionButton) {
    state.awaitingAnswer = false;
    state.lives -= 1;
    if (state.lives < 0) state.lives = 0;
    state.streak = 0;
    updateHud();
    playError();
    if (selectionButton) selectionButton.dataset.state = 'wrong';
    if (state.lives <= 0) {
      setFeedback('duration.feedback.gameover', { score: state.score });
      endGame();
      return;
    }
    if (state.lives === 1) {
      setFeedback('duration.feedback.lastlife');
    } else {
      setFeedback('duration.feedback.wrong', { lives: state.lives });
    }
    state.locked = true;
    setCardsDisabled(true);
    if (ui.listenBtn) ui.listenBtn.disabled = true;
    setTimeout(() => {
      if (!state.running || state.lives <= 0) return;
      if (selectionButton) selectionButton.dataset.state = '';
      state.locked = false;
      state.awaitingAnswer = true;
      playCurrentPattern({ lock: true }).catch(() => {
        if (ui.listenBtn) ui.listenBtn.disabled = false;
        setCardsDisabled(false);
      });
    }, 800);
  }

  function handleSelection(patternId, button) {
    if (!state.running || state.locked) return;
    if (!state.target) return;
    state.locked = true;
    const isCorrect = patternId === state.target.id;
    if (isCorrect) {
      handleCorrect(button);
    } else {
      handleWrong(button);
    }
  }

  function startGame() {
    hideScorePrompt();
    clearNextTimer();
    state.running = true;
    state.locked = false;
    state.score = 0;
    state.streak = 0;
    state.lives = MAX_LIVES;
    state.level = 1;
    state.target = null;
    state.options = [];
    state.awaitingAnswer = false;
    state.previousKey = null;
    updateHud();
    setPrompt('duration.prompt.listen');
    setFeedback('duration.feedback.ready');
    setCardsDisabled(false);
    if (ui.startBtn) {
      ui.startBtn.disabled = true;
      ui.startBtn.dataset.i18n = 'duration.controls.playing';
      ui.startBtn.textContent = t('duration.controls.playing');
      if (window.i18n && typeof window.i18n.apply === 'function') {
        window.i18n.apply(ui.startBtn.parentElement || ui.startBtn);
      }
    }
    if (ui.resetBtn) {
      ui.resetBtn.hidden = false;
      ui.resetBtn.disabled = false;
    }
    if (ui.listenBtn) {
      ui.listenBtn.hidden = true;
      ui.listenBtn.disabled = true;
    }
    newChallenge();
  }

  ui.startBtn.addEventListener('click', () => {
    if (state.running) return;
    startGame();
  });

  if (ui.resetBtn) {
    ui.resetBtn.addEventListener('click', () => {
      startGame();
    });
  }

  if (ui.listenBtn) {
    ui.listenBtn.addEventListener('click', () => {
      if (!state.running || !state.target || audio.playing) return;
      playCurrentPattern({ lock: true }).catch(() => {});
    });
  }

  function setViewMode(mode) {
    if (mode !== 'lines' && mode !== 'notation') return;
    state.view = mode;
    if (Array.isArray(ui.viewTabs)) {
      ui.viewTabs.forEach((btn) => {
        const isActive = btn.dataset.durationView === mode;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    }
    if (state.options.length) {
      renderCards(state.options);
    }
  }

  if (Array.isArray(ui.viewTabs)) {
    ui.viewTabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.durationView;
        setViewMode(view);
      });
      const key = btn.dataset.i18n;
      if (key) {
        btn.textContent = t(key, null, FALLBACK_TEXT[key]);
      }
    });
  }

  setViewMode('lines');
  setPrompt('duration.prompt.idle');
  setFeedback('duration.feedback.idle');
})();
