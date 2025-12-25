(() => {
  const ui = {
    playBtn: document.getElementById('pitchdirPlay'),
    feedback: document.getElementById('pitchdirFeedback'),
    attempts: document.getElementById('pitchdirAttempts'),
    correct: document.getElementById('pitchdirCorrect'),
    lives: document.getElementById('pitchdirLives'),
    streak: document.getElementById('pitchdirStreak'),
    options: Array.from(document.querySelectorAll('.pitchdir-option')),
    modal: document.getElementById('pitchdirModal'),
    modalClose: document.getElementById('pitchdirModalClose'),
    modalTitle: document.getElementById('pitchdirModalTitle'),
    modalBody: document.getElementById('pitchdirModalBody')
  };

  if (!ui.playBtn || !ui.feedback || ui.options.length !== 3) return;

  const INITIAL_LIVES = 3;
  const AUTO_NEXT_DELAY_MS = 900;
  const AUTO_PLAY_DELAY_MS = 260;
  const ADVANCED_THRESHOLD = 10;
  const SCOREBOARD_ID = 'pitch-direction';
  const GLISS_TONE_MS = 1200;
  const STEADY_TONE_MS = 1100;
  const MIN_GLISS_STEPS = 2;

  const NOTES = [
    { id: 'A3', freq: 220.0 },
    { id: 'C4', freq: 261.63 },
    { id: 'E4', freq: 329.63 },
    { id: 'G4', freq: 392.0 },
    { id: 'B4', freq: 493.88 },
    { id: 'D5', freq: 587.33 },
    { id: 'F5', freq: 698.46 },
    { id: 'A5', freq: 880.0 },
    { id: 'C6', freq: 1046.5 }
  ];

  function showScoreboardPrompt(score) {
    const finalScore = Number(score) || 0;
    if (finalScore <= 0) return;
    if (window.GameOverOverlay && typeof window.GameOverOverlay.show === 'function') {
      window.GameOverOverlay.show({
        gameId: SCOREBOARD_ID,
        score: finalScore,
        onRetry: () => resetGame({ autoplay: true }),
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

  const FALLBACK_TEXT = {
    'pitchdir.stats.attempts': ({ n }) => `Intentos: ${n != null ? n : 0}`,
    'pitchdir.stats.correct': ({ n }) => `Aciertos: ${n != null ? n : 0}`,
    'pitchdir.stats.lives': ({ n }) => `Vidas: ${n != null ? n : INITIAL_LIVES}`,
    'pitchdir.stats.streak': ({ n }) => `Racha: ${n != null ? n : 0}`,
    'pitchdir.controls.start': () => 'Iniciar',
    'pitchdir.controls.playing': () => 'Reproduciendo…',
    'pitchdir.controls.reset': () => 'Reiniciar partida',
    'pitchdir.option.up': () => 'Sube ⤴',
    'pitchdir.option.same': () => 'Igual ↔',
    'pitchdir.option.down': () => 'Baja ⤵',
    'pitchdir.feedback.prompt': () => 'Escucha la secuencia y elige si sube, baja o se mantiene.',
    'pitchdir.feedback.ready': () => 'Nuevo reto listo. Pulsa “Iniciar”.',
    'pitchdir.feedback.ready.multi': () => 'Nivel avanzado: escucharás dos secuencias seguidas. Responde a ambas.',
    'pitchdir.feedback.correct.up': () => '¡Correcto! El sonido sube.',
    'pitchdir.feedback.correct.down': () => '¡Correcto! El sonido baja.',
    'pitchdir.feedback.correct.same': () => '¡Correcto! El sonido se mantiene.',
    'pitchdir.feedback.retry': () => 'Intenta de nuevo: escucha con atención.',
    'pitchdir.feedback.partial': () => '¡Bien! Ahora responde a la segunda secuencia.',
    'pitchdir.feedback.locked': () => 'Reproduciendo… espera a que termine.',
    'pitchdir.feedback.gameover': () => 'Partida finalizada. Pulsa “Reiniciar partida” para intentarlo de nuevo.',
    'pitchdir.modal.title': () => 'Doble secuencia',
    'pitchdir.modal.body': () => 'Has avanzado de nivel. Ahora escucharás dos secuencias seguidas: responde después de cada una.',
    'pitchdir.modal.close': () => '¡Entendido!'
  };

  const audio = { ctx: null, nodes: [] };
  const state = {
    challenge: null,
    playing: false,
    answered: false,
    stepIndex: 0,
    partial: false,
    attempts: 0,
    correct: 0,
    streak: 0,
    lives: INITIAL_LIVES,
    running: true,
    nextTimer: null,
    pendingAutoplay: false,
    modalVisible: false,
    advancedNotified: false,
    feedbackKey: 'pitchdir.feedback.prompt',
    feedbackParams: null
  };

  function clamp01(v) {
    const num = Number(v);
    if (!Number.isFinite(num)) return 0;
    return Math.min(1, Math.max(0, num));
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
      if (AC) audio.ctx = new AC();
    }
    if (audio.ctx && audio.ctx.state === 'suspended') {
      audio.ctx.resume().catch(() => {});
    }
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function clearAutoNext() {
    if (state.nextTimer) {
      clearTimeout(state.nextTimer);
      state.nextTimer = null;
    }
    state.pendingAutoplay = false;
  }

  function scheduleAutoNext() {
    clearAutoNext();
    state.nextTimer = setTimeout(() => {
      state.nextTimer = null;
      if (!state.running || state.lives <= 0) return;
      newChallenge({ autoplay: true });
    }, AUTO_NEXT_DELAY_MS);
  }

  function showModal() {
    if (!ui.modal) return;
    state.modalVisible = true;
    ui.modal.hidden = false;
    ui.modal.classList.add('is-active');
    if (ui.modalTitle) ui.modalTitle.textContent = t('pitchdir.modal.title');
    if (ui.modalBody) ui.modalBody.textContent = t('pitchdir.modal.body');
    if (ui.modalClose) ui.modalClose.textContent = t('pitchdir.modal.close');
    if (ui.modalClose) {
      setTimeout(() => {
        try { ui.modalClose.focus(); } catch (_) {}
      }, 30);
    }
    disableOptions();
    updatePlayButtonState();
  }

  function hideModal() {
    if (!ui.modal || !state.modalVisible) return;
    state.modalVisible = false;
    ui.modal.hidden = true;
    ui.modal.classList.remove('is-active');
    enableOptions();
    updatePlayButtonState();
    if (state.pendingAutoplay) {
      state.pendingAutoplay = false;
      setTimeout(() => playChallenge(), 120);
    }
  }

  function t(key, params) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key, params);
    }
    const fallback = FALLBACK_TEXT[key];
    if (typeof fallback === 'function') return fallback(params || {});
    if (typeof fallback === 'string') return fallback;
    return key;
  }

  function setFeedback(key, params) {
    state.feedbackKey = key;
    state.feedbackParams = params || null;
    ui.feedback.textContent = t(key, params);
  }

  function updateStats() {
    if (ui.attempts) ui.attempts.textContent = t('pitchdir.stats.attempts', { n: state.attempts });
    if (ui.correct) ui.correct.textContent = t('pitchdir.stats.correct', { n: state.correct });
    if (ui.lives) ui.lives.textContent = t('pitchdir.stats.lives', { n: state.lives });
    if (ui.streak) ui.streak.textContent = t('pitchdir.stats.streak', { n: state.streak });
  }

  function updatePlayButtonState() {
    const key = state.playing ? 'pitchdir.controls.playing' : 'pitchdir.controls.start';
    ui.playBtn.textContent = t(key);
    ui.playBtn.disabled = state.playing || !state.running || !state.challenge || state.modalVisible;
  }

  function stopPlayback() {
    if (audio.nodes.length) {
      audio.nodes.forEach(({ osc }) => {
        try { osc.stop(); } catch (_) {}
      });
      audio.nodes = [];
    }
    state.playing = false;
    updatePlayButtonState();
  }

  async function playTone(freq, duration = 620) {
    ensureAudio();
    const ctx = audio.ctx;
    const vol = clamp01(currentGameVolume());
    const ms = Math.max(180, duration);
    if (!ctx || vol <= 0) {
      await wait(ms);
      return;
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const attack = 0.05;
    const release = 0.22;
    const sustain = Math.max(0.15, (ms / 1000) - release);
    const peak = 0.32 * vol;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + attack);
    gain.gain.setValueAtTime(peak, now + sustain);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + sustain + release);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    const stopAt = now + sustain + release + 0.05;
    osc.stop(stopAt);
    const entry = { osc, gain };
    audio.nodes.push(entry);
    osc.addEventListener('ended', () => {
      audio.nodes = audio.nodes.filter((node) => node !== entry);
    });
    await wait(ms);
  }

  async function playGliss(fromFreq, toFreq, duration = 720) {
    ensureAudio();
    const ctx = audio.ctx;
    const vol = clamp01(currentGameVolume());
    const ms = Math.max(220, duration);
    if (!ctx || vol <= 0) {
      await wait(ms);
      return;
    }
    const now = ctx.currentTime;
    const totalSec = ms / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const attack = Math.min(0.12, totalSec * 0.25);
    const release = Math.min(0.28, totalSec * 0.35);
    const sustain = Math.max(0.14, totalSec - release);
    const peak = 0.3 * vol;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(fromFreq, now);
    const rampEnd = now + Math.max(0.12, totalSec - 0.08);
    osc.frequency.linearRampToValueAtTime(toFreq, rampEnd);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + attack);
    gain.gain.setValueAtTime(peak, now + sustain);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + sustain + release);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    const stopAt = now + sustain + release + 0.05;
    osc.stop(stopAt);
    const entry = { osc, gain };
    audio.nodes.push(entry);
    osc.addEventListener('ended', () => {
      audio.nodes = audio.nodes.filter((node) => node !== entry);
    });
    await wait(ms);
  }

  async function playChallenge() {
    if (!state.challenge || state.playing || !state.running || state.lives <= 0 || state.modalVisible) return;
    state.playing = true;
    updatePlayButtonState();
    const prevKey = state.feedbackKey;
    const prevParams = state.feedbackParams;
    setFeedback('pitchdir.feedback.locked');
    const steps = (state.challenge && state.challenge.steps) || [];
    try {
      for (let i = 0; i < steps.length; i += 1) {
        const step = steps[i];
        if (step.direction === 'up' || step.direction === 'down') {
          await playGliss(step.start.freq, step.target.freq, GLISS_TONE_MS);
        } else {
          await playTone(step.target.freq, STEADY_TONE_MS);
        }
        if (i < steps.length - 1) await wait(300);
      }
      if (state.answered) setFeedback(prevKey, prevParams);
      else if (steps.length > 1 && state.stepIndex > 0) setFeedback('pitchdir.feedback.partial');
      else if (steps.length > 1) setFeedback('pitchdir.feedback.ready.multi');
      else setFeedback('pitchdir.feedback.prompt');
    } finally {
      state.playing = false;
      updatePlayButtonState();
    }
  }

  function randomIndex(max) {
    if (max <= 0) return 0;
    return Math.floor(Math.random() * max);
  }

  function createStep(prevDirection = null) {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const startIdx = randomIndex(NOTES.length);
      const options = ['same'];
      if (startIdx >= MIN_GLISS_STEPS) options.push('down');
      if (startIdx <= NOTES.length - 1 - MIN_GLISS_STEPS) options.push('up');
      const directionPool = options.filter((dir) => dir !== prevDirection || options.length === 1);
      if (!directionPool.length) continue;
      const direction = directionPool[randomIndex(directionPool.length)];
      let targetIdx = startIdx;
      if (direction === 'up') {
        const maxStep = NOTES.length - startIdx - 1;
        if (maxStep < MIN_GLISS_STEPS) continue;
        const diff = MIN_GLISS_STEPS + randomIndex(maxStep - MIN_GLISS_STEPS + 1);
        targetIdx = startIdx + diff;
      } else if (direction === 'down') {
        const maxStep = startIdx;
        if (maxStep < MIN_GLISS_STEPS) continue;
        const diff = MIN_GLISS_STEPS + randomIndex(maxStep - MIN_GLISS_STEPS + 1);
        targetIdx = startIdx - diff;
      }
      if (targetIdx >= 0 && targetIdx < NOTES.length) {
        return {
          start: NOTES[startIdx],
          target: NOTES[targetIdx],
          direction
        };
      }
    }
    const fallbackIdx = Math.max(0, Math.min(NOTES.length - 1, 3));
    return {
      start: NOTES[fallbackIdx],
      target: NOTES[fallbackIdx],
      direction: 'same'
    };
  }

  function createChallenge(stepCount) {
    const steps = [];
    let lastDirection = null;
    for (let i = 0; i < stepCount; i += 1) {
      const step = createStep(lastDirection);
      steps.push(step);
      lastDirection = step.direction;
    }
    return { steps };
  }

  function enableOptions() {
    ui.options.forEach((btn) => {
      btn.disabled = !state.running || state.modalVisible;
      btn.classList.remove('is-correct', 'is-wrong');
    });
  }

  function disableOptions() {
    ui.options.forEach((btn) => { btn.disabled = true; });
  }

  function handleChoice(choice) {
    if (!state.challenge || !state.running || state.lives <= 0) return;
    if (state.playing) {
      setFeedback('pitchdir.feedback.locked');
      return;
    }
    const steps = state.challenge.steps || [];
    const currentStep = steps[Math.min(state.stepIndex, steps.length - 1)];
    if (!currentStep) return;
    hideScoreboardPrompt();
    hideScoreboardPrompt();
    const correctDirection = currentStep.direction;
    state.attempts += 1;
    if (choice === correctDirection) {
      if (window.Sfx && typeof window.Sfx.success === 'function') {
        window.Sfx.success();
      }
      const isFinalStep = state.stepIndex >= steps.length - 1;
      if (!isFinalStep) {
        state.stepIndex += 1;
        state.partial = true;
        setFeedback('pitchdir.feedback.partial');
        ui.options.forEach((btn) => {
          btn.disabled = false;
          btn.classList.remove('is-correct', 'is-wrong');
        });
        updateStats();
        return;
      }
      if (!state.answered) {
        state.correct += 1;
        state.streak += 1;
      }
      state.answered = true;
      state.partial = false;
      state.stepIndex = steps.length;
      setFeedback(`pitchdir.feedback.correct.${correctDirection}`);
      ui.options.forEach((btn) => {
        const btnChoice = btn.getAttribute('data-choice');
        if (btnChoice === choice) {
          btn.classList.add('is-correct');
        }
        btn.disabled = true;
      });
      updateStats();
      scheduleAutoNext();
    } else {
      state.streak = 0;
      state.lives = Math.max(0, state.lives - 1);
      setFeedback('pitchdir.feedback.retry');
      const pressed = ui.options.find((btn) => btn.getAttribute('data-choice') === choice);
      if (pressed) {
        pressed.disabled = true;
        pressed.classList.add('is-wrong');
      }
      ui.options.forEach((btn) => {
        if (btn !== pressed) btn.classList.remove('is-correct');
      });
      updateStats();
      if (window.Sfx && typeof window.Sfx.error === 'function') {
        window.Sfx.error();
      }
      if (state.lives <= 0) {
        handleGameOver();
      }
    }
  }

  function newChallenge({ autoplay = false } = {}) {
    if (!state.running || state.lives <= 0) return;
    clearAutoNext();
    stopPlayback();
    const stepsCount = state.correct >= ADVANCED_THRESHOLD ? 2 : 1;
    state.challenge = createChallenge(stepsCount);
    state.answered = false;
    state.partial = false;
    state.stepIndex = 0;
    if (stepsCount === 1) state.advancedNotified = false;
    const key = stepsCount > 1 ? 'pitchdir.feedback.ready.multi' : 'pitchdir.feedback.ready';
    setFeedback(key);
    let delayAutoplay = false;
    if (stepsCount > 1 && !state.advancedNotified) {
      showModal();
      state.advancedNotified = true;
      delayAutoplay = true;
    }
    enableOptions();
    updateStats();
    updatePlayButtonState();
    if (delayAutoplay && autoplay) {
      state.pendingAutoplay = true;
      return;
    }
    if (autoplay) {
      const challengeRef = state.challenge;
      setTimeout(() => {
        if (state.running && state.challenge === challengeRef) {
          playChallenge();
        }
      }, AUTO_PLAY_DELAY_MS);
    }
  }

  function handleGameOver() {
    if (!state.running) return;
    state.running = false;
    state.answered = true;
    state.partial = false;
    state.stepIndex = 0;
    state.advancedNotified = false;
    clearAutoNext();
    stopPlayback();
    hideModal();
    disableOptions();
    setFeedback('pitchdir.feedback.gameover');
    updateStats();
    updatePlayButtonState();
    showScoreboardPrompt(state.correct);
  }

  function resetGame({ autoplay = false } = {}) {
    clearAutoNext();
    hideScoreboardPrompt();
    stopPlayback();
    state.challenge = null;
    state.playing = false;
    state.answered = false;
    state.partial = false;
    state.stepIndex = 0;
    state.advancedNotified = false;
    state.attempts = 0;
    state.correct = 0;
    state.streak = 0;
    state.lives = INITIAL_LIVES;
    state.running = true;
    hideModal();
    ui.options.forEach((btn) => btn.classList.remove('is-correct', 'is-wrong'));
    updateStats();
    setFeedback('pitchdir.feedback.prompt');
    updatePlayButtonState();
    newChallenge({ autoplay });
  }

  function handleLanguageChange() {
    updateStats();
    setFeedback(state.feedbackKey, state.feedbackParams);
    updatePlayButtonState();
  }

  ui.playBtn.addEventListener('click', () => playChallenge());
  ui.options.forEach((btn) => {
    btn.addEventListener('click', () => handleChoice(btn.getAttribute('data-choice')));
  });

  if (ui.modalClose) {
    ui.modalClose.addEventListener('click', () => hideModal());
  }
  if (ui.modal) {
    ui.modal.addEventListener('click', (ev) => {
      if (ev.target === ui.modal || ev.target.classList.contains('pitchdir-modal__backdrop')) {
        hideModal();
      }
    });
  }
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && state.modalVisible) {
      hideModal();
    }
  });

  window.addEventListener('score:saved', (ev) => {
    if (!ev || !ev.detail || ev.detail.gameId !== SCOREBOARD_ID) return;
    if (state.running) return;
    resetGame({ autoplay: true });
  });

  if (window.i18n && typeof window.i18n.onChange === 'function') {
    window.i18n.onChange(handleLanguageChange);
  }

  resetGame({ autoplay: false });
})();
