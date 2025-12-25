(() => {
  const ui = {
    startBtn: document.getElementById('pitchheightStart'),
    listenBtn: document.getElementById('pitchheightListen'),
    resetBtn: document.getElementById('pitchheightReset'),
    cardsHost: document.getElementById('pitchheightCards'),
    prompt: document.getElementById('pitchheightPrompt'),
    feedback: document.getElementById('pitchheightFeedback'),
    score: document.getElementById('pitchheightScore'),
    streak: document.getElementById('pitchheightStreak'),
    lives: document.getElementById('pitchheightLives'),
    level: document.getElementById('pitchheightLevel'),
  };

  if (!ui.startBtn || !ui.cardsHost || !ui.prompt || !ui.feedback) return;

  const GAME_ID = 'pitch-height';
  const MAX_LIVES = 3;
  const NEXT_DELAY_MS = 900;
  const STEP_DURATION = 0.48;
  const STEP_GAP = 0.14;

  const LEVEL_BREAKPOINTS = [
    { min: 10, level: 3, options: 4 },
    { min: 5, level: 2, options: 3 },
    { min: 0, level: 1, options: 2 },
  ];

  const LINE_OFFSETS = {
    low: '12%',
    mid: '46%',
    high: '78%',
  };

  const HEIGHT_TONES = {
    low: 196.0, // G3
    mid: 329.63, // E4
    high: 523.25, // C5
  };

  const PATTERNS = [
    {
      id: 'low-mid-high',
      heights: ['low', 'mid', 'high'],
      labelKey: 'pitchheight.pattern.low_mid_high',
      fallback: 'grave → medio → agudo',
    },
    {
      id: 'low-high-mid',
      heights: ['low', 'high', 'mid'],
      labelKey: 'pitchheight.pattern.low_high_mid',
      fallback: 'grave → agudo → medio',
    },
    {
      id: 'mid-low-high',
      heights: ['mid', 'low', 'high'],
      labelKey: 'pitchheight.pattern.mid_low_high',
      fallback: 'medio → grave → agudo',
    },
    {
      id: 'mid-high-low',
      heights: ['mid', 'high', 'low'],
      labelKey: 'pitchheight.pattern.mid_high_low',
      fallback: 'medio → agudo → grave',
    },
    {
      id: 'high-mid-low',
      heights: ['high', 'mid', 'low'],
      labelKey: 'pitchheight.pattern.high_mid_low',
      fallback: 'agudo → medio → grave',
    },
    {
      id: 'high-low-mid',
      heights: ['high', 'low', 'mid'],
      labelKey: 'pitchheight.pattern.high_low_mid',
      fallback: 'agudo → grave → medio',
    },
  ];

  const FALLBACK_TEXT = {
    'pitchheight.prompt.idle': () => 'Pulsa “Comenzar” para crear un patrón.',
    'pitchheight.prompt.listen': () => 'Escucha el patrón y elige la tarjeta correcta.',
    'pitchheight.prompt.levelup': ({ cards }) => `Nuevo nivel: ${cards || 0} tarjetas disponibles.`,
    'pitchheight.feedback.idle': () => 'Selecciona la tarjeta que corresponde al patrón escuchado.',
    'pitchheight.feedback.ready': () => 'Escucha el patrón y elige la tarjeta correcta.',
    'pitchheight.feedback.listening': () => 'Escucha el patrón y prepárate para elegir.',
    'pitchheight.feedback.correct': ({ score }) => `¡Correcto! Puntuación: ${score ?? 0}`,
    'pitchheight.feedback.levelup': ({ cards }) => `Nuevo nivel: ahora se muestran ${cards ?? 0} tarjetas.`,
    'pitchheight.feedback.wrong': ({ lives }) => {
      if (lives === 1) return 'No coincide. ¡Última vida!';
      const remaining = lives ?? 0;
      return remaining > 0
        ? `No coincide. Te quedan ${remaining} vidas.`
        : 'No coincide. Te quedaste sin vidas.';
    },
    'pitchheight.feedback.lastlife': () => 'No coincide. ¡Última vida!',
    'pitchheight.feedback.gameover': ({ score }) => `Partida terminada. Puntuación: ${score ?? 0}`,
    'pitchheight.controls.start': () => 'Comenzar',
    'pitchheight.controls.playing': () => 'Jugando…',
    'pitchheight.controls.listen': () => 'Escuchar patrón',
    'pitchheight.controls.reset': () => 'Reiniciar',
    'pitchheight.pattern.low_mid_high': () => 'grave → medio → agudo',
    'pitchheight.pattern.low_high_mid': () => 'grave → agudo → medio',
    'pitchheight.pattern.mid_low_high': () => 'medio → grave → agudo',
    'pitchheight.pattern.mid_high_low': () => 'medio → agudo → grave',
    'pitchheight.pattern.high_mid_low': () => 'agudo → medio → grave',
    'pitchheight.pattern.high_low_mid': () => 'agudo → grave → medio',
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
    nextTimer: null,
    awaitingAnswer: false,
  };

  const audio = {
    ctx: null,
    master: null,
    playing: false,
  };

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
      audio.master.gain.value = currentGameVolume();
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
      audio.master.gain.linearRampToValueAtTime(vol, now + 0.08);
    }
    return audio.ctx;
  }

  function wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  function scheduleTone(height, when) {
    if (!audio.ctx || !audio.master) return;
    const freq = HEIGHT_TONES[height] || HEIGHT_TONES.mid;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    const volume = clamp01(currentGameVolume()) * 0.78;
    gain.gain.value = 0;
    gain.connect(audio.master);
    osc.connect(gain);
    try {
      osc.type = 'sine';
    } catch (_) {}
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(volume, when + 0.03);
    gain.gain.linearRampToValueAtTime(volume * 0.82, when + Math.max(0.12, STEP_DURATION - 0.12));
    gain.gain.linearRampToValueAtTime(0, when + STEP_DURATION);
    osc.start(when);
    osc.stop(when + STEP_DURATION + 0.02);
  }

  async function playPatternHeights(heights) {
    const ctx = ensureAudio();
    if (!ctx) return;
    for (let index = 0; index < heights.length; index += 1) {
      const height = heights[index];
      const when = ctx.currentTime + 0.04;
      scheduleTone(height, when);
      const tail = index < heights.length - 1 ? STEP_GAP : 0.25;
      await wait((STEP_DURATION + tail) * 1000);
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
    if (ui.listenBtn) {
      ui.listenBtn.disabled = true;
    }
    const hadLock = state.locked;
    const unlockAfter = lock && !hadLock;
    if (lock) {
      state.locked = true;
      setCardsDisabled(true);
    }
    if (state.awaitingAnswer) {
      setFeedback('pitchheight.feedback.listening');
    }
    audio.playing = true;
    try {
      await playPatternHeights(state.target.heights);
    } finally {
      audio.playing = false;
      if (ui.listenBtn) {
        ui.listenBtn.disabled = !state.running || state.lives <= 0;
      }
      if (!state.running || state.lives <= 0) return;
      if (unlockAfter) {
        state.locked = false;
        setCardsDisabled(false);
        if (state.awaitingAnswer) {
          setFeedback('pitchheight.feedback.ready');
        }
      } else {
        state.locked = hadLock;
        setCardsDisabled(state.locked);
        if (state.awaitingAnswer && !state.locked) {
          setFeedback('pitchheight.feedback.ready');
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
    for (const entry of LEVEL_BREAKPOINTS) {
      if (score >= entry.min) return entry;
    }
    return LEVEL_BREAKPOINTS[LEVEL_BREAKPOINTS.length - 1];
  }

  function currentOptions() {
    const entry = getLevelEntry(state.score);
    return entry ? entry.options : 2;
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

  function clearNextTimer() {
    if (state.nextTimer) {
      clearTimeout(state.nextTimer);
      state.nextTimer = null;
    }
  }

  function setPrompt(key, params, fallback) {
    if (!ui.prompt) return;
    ui.prompt.textContent = t(key, params, fallback);
  }

  function setFeedback(key, params, fallback) {
    if (!ui.feedback) return;
    ui.feedback.textContent = t(key, params, fallback);
  }

  function setCardsDisabled(disabled) {
    if (!ui.cardsHost) return;
    ui.cardsHost.querySelectorAll('.pitchheight-card').forEach((btn) => {
      btn.classList.toggle('is-disabled', disabled);
      btn.disabled = disabled;
    });
  }

  function getPatternLabel(pattern) {
    if (!pattern) return '';
    return t(pattern.labelKey, null, pattern.fallback);
  }

  function renderCards(options) {
    if (!ui.cardsHost) return;
    ui.cardsHost.innerHTML = '';
    const fragment = document.createDocumentFragment();

    options.forEach((pattern) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pitchheight-card';
      button.dataset.pattern = pattern.id;
      const label = getPatternLabel(pattern);
      button.setAttribute('aria-label', label);

      const grid = document.createElement('div');
      grid.className = 'pitchheight-card__grid';

      pattern.heights.forEach((height) => {
        const slot = document.createElement('div');
        slot.className = 'pitchheight-card__slot';
        const line = document.createElement('span');
        line.className = 'pitchheight-card__line';
        const offset = LINE_OFFSETS[height] || LINE_OFFSETS.mid;
        line.style.bottom = offset;
        slot.appendChild(line);
        grid.appendChild(slot);
      });

      button.appendChild(grid);
      button.addEventListener('click', () => handleSelection(pattern.id, button));
      fragment.appendChild(button);
    });

    ui.cardsHost.appendChild(fragment);
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
    const totalOptions = Math.min(currentOptions(), PATTERNS.length);
    const choices = shuffle(PATTERNS);
    const target = choices[0];
    const selection = shuffle(choices.slice(0, totalOptions));
    if (!selection.some((item) => item.id === target.id)) {
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
    setPrompt('pitchheight.prompt.listen');
    setFeedback('pitchheight.feedback.ready');
    setTimeout(() => {
      if (state.running && state.target === target) {
        playCurrentPattern({ lock: true }).catch(() => {});
      }
    }, 120);
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
    setPrompt('pitchheight.prompt.idle');
    setFeedback('pitchheight.feedback.gameover', { score: state.score });
    if (ui.startBtn) {
      ui.startBtn.disabled = false;
      ui.startBtn.dataset.i18n = 'pitchheight.controls.start';
      ui.startBtn.textContent = t('pitchheight.controls.start');
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
    updateHud();
    playSuccess();
    if (selectionButton) {
      selectionButton.dataset.state = 'correct';
    }
    setFeedback('pitchheight.feedback.correct', { score: state.score });
    const levelChanged = state.level !== previousLevel;
    if (levelChanged) {
      const cards = currentOptions();
      setFeedback('pitchheight.feedback.levelup', { cards });
      setPrompt('pitchheight.prompt.levelup', { cards });
    }
    if (ui.listenBtn) {
      ui.listenBtn.disabled = true;
    }
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
    if (selectionButton) {
      selectionButton.dataset.state = 'wrong';
    }
    if (state.lives <= 0) {
      setFeedback('pitchheight.feedback.gameover', { score: state.score });
      endGame();
      return;
    }
    if (state.lives === 1) {
      setFeedback('pitchheight.feedback.lastlife');
    } else {
      setFeedback('pitchheight.feedback.wrong', { lives: state.lives });
    }
    state.locked = true;
    setCardsDisabled(true);
    if (ui.listenBtn) {
      ui.listenBtn.disabled = true;
    }
    setTimeout(() => {
      if (!state.running || state.lives <= 0) return;
      if (selectionButton) selectionButton.dataset.state = '';
      state.locked = false;
      state.awaitingAnswer = true;
      playCurrentPattern({ lock: true }).catch(() => {
        if (ui.listenBtn) ui.listenBtn.disabled = false;
        setCardsDisabled(false);
      });
    }, 700);
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
    state.awaitingAnswer = false;
    updateHud();
    setPrompt('pitchheight.prompt.listen');
    setFeedback('pitchheight.feedback.ready');
    setCardsDisabled(false);
    if (ui.startBtn) {
      ui.startBtn.disabled = true;
      ui.startBtn.dataset.i18n = 'pitchheight.controls.playing';
      ui.startBtn.textContent = t('pitchheight.controls.playing');
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

  setPrompt('pitchheight.prompt.idle');
  setFeedback('pitchheight.feedback.idle');
})();
