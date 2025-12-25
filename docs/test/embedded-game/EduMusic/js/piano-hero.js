(function() {
  const GAME_ID = 'piano-hero';
  const MAX_LIVES = 3;
  const NOTE_HEIGHT = 52;
  const NOTE_START_TOP = 16;
  const TARGET_HEIGHT = 64;
  const TARGET_BOTTOM_OFFSET = 22;
  const LEVELS = [
    { id: 'intro', lanes: 3, spawnInterval: 2050, travelTime: 3300, hitWindow: 400, threshold: 0, labelFallback: 'Entrenamiento' },
    { id: 'duet', lanes: 5, spawnInterval: 1700, travelTime: 2700, hitWindow: 330, threshold: 1200, labelFallback: 'Dúo rítmico' },
    { id: 'trio', lanes: 7, spawnInterval: 1400, travelTime: 2300, hitWindow: 270, threshold: 3200, labelFallback: 'Trío eléctrico' },
    { id: 'quartet', lanes: 9, spawnInterval: 1150, travelTime: 1950, hitWindow: 220, threshold: 5800, labelFallback: 'Cuarteto' },
    { id: 'full', lanes: 10, spawnInterval: 920, travelTime: 1700, hitWindow: 190, threshold: 8200, labelFallback: 'Modo arcade' },
  ];
  const KEY_TO_LANE = {
    KeyA: 0,
    KeyS: 1,
    KeyD: 2,
    KeyF: 3,
    KeyG: 4,
    KeyH: 5,
    KeyJ: 6,
    KeyK: 7,
    KeyL: 8,
    Semicolon: 9,
  };
  const LANES = [
    {
      key: 'g3',
      color: '#2563eb',
      sample: '../assets/piano/key02.ogg',
      keyLabel: 'A',
      badgeFallback: 'Sol₃',
      noteLabelFallback: 'Sol',
    },
    {
      key: 'a3',
      color: '#0ea5e9',
      sample: '../assets/piano/key04.ogg',
      keyLabel: 'S',
      badgeFallback: 'La₃',
      noteLabelFallback: 'La',
    },
    {
      key: 'b3',
      color: '#f97316',
      sample: '../assets/piano/key06.ogg',
      keyLabel: 'D',
      badgeFallback: 'Si₃',
      noteLabelFallback: 'Si',
    },
    {
      key: 'c4',
      color: '#a855f7',
      sample: '../assets/piano/key07.ogg',
      keyLabel: 'F',
      badgeFallback: 'Do₄',
      noteLabelFallback: 'Do',
    },
    {
      key: 'd4',
      color: '#ec4899',
      sample: '../assets/piano/key09.ogg',
      keyLabel: 'G',
      badgeFallback: 'Re₄',
      noteLabelFallback: 'Re',
    },
    {
      key: 'e4',
      color: '#f43f5e',
      sample: '../assets/piano/key11.ogg',
      keyLabel: 'H',
      badgeFallback: 'Mi₄',
      noteLabelFallback: 'Mi',
    },
    {
      key: 'f4',
      color: '#facc15',
      sample: '../assets/piano/key12.ogg',
      keyLabel: 'J',
      badgeFallback: 'Fa₄',
      noteLabelFallback: 'Fa',
    },
    {
      key: 'g4',
      color: '#22d3ee',
      sample: '../assets/piano/key14.ogg',
      keyLabel: 'K',
      badgeFallback: 'Sol₄',
      noteLabelFallback: 'Sol',
    },
    {
      key: 'a4',
      color: '#34d399',
      sample: '../assets/piano/key16.ogg',
      keyLabel: 'L',
      badgeFallback: 'La₄',
      noteLabelFallback: 'La',
    },
    {
      key: 'b4',
      color: '#fb7185',
      sample: '../assets/piano/key18.ogg',
      keyLabel: ';',
      badgeFallback: 'Si₄',
      noteLabelFallback: 'Si',
    },
  ];
  const STATUS_KEYS = {
    ready: 'pianohero.status.ready',
    start: 'pianohero.status.start',
    hit: 'pianohero.status.hit',
    miss: 'pianohero.status.miss',
    wrong: 'pianohero.status.wrong',
    early: 'pianohero.status.early',
    gameover: 'pianohero.status.gameover',
    levelup: 'pianohero.status.levelup',
  };
  const STATUS_FALLBACK = {
    ready: 'Prepara tus manos y pulsa «Iniciar partida».',
    start: '¡Empieza la partitura! Sigue el ritmo.',
    hit: '¡Bien hecho! +{points} pts',
    miss: 'Se escapó una nota, mantén la concentración.',
    wrong: 'Tecla incorrecta: observa el carril iluminado.',
    early: 'Demasiado pronto, espera a que el bloque llegue a la zona.',
    gameover: 'Fin de la partida: {score} puntos',
    levelup: 'Nuevo modo: {level}',
  };

  const dom = {
    board: null,
    lanes: [],
    keys: [],
    target: null,
    start: null,
    status: null,
    outputs: {
      score: null,
      combo: null,
      lives: null,
      best: null,
      level: null,
    },
    trainingToggle: null,
  };

  const state = {
    running: false,
    notes: [],
    rafId: 0,
    nextSpawn: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    lives: MAX_LIVES,
    prevLane: null,
    pressedKeys: new Set(),
    startedOnce: false,
    travelCache: null,
    lastStatus: { kind: 'ready', payload: {} },
    levelIndex: 0,
    activeLaneCount: 1,
    training: false,
  };

  function tr(key, fallback, params) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key, params);
    }
    if (fallback == null) return key;
    if (!params) return fallback;
    return fallback.replace(/\{(\w+)\}/g, (_, token) => (params[token] != null ? params[token] : `{${token}}`));
  }

  function applyI18n(element) {
    if (window.i18n && typeof window.i18n.apply === 'function') {
      window.i18n.apply(element);
    }
  }

  function updateStartLabel() {
    if (!dom.start) return;
    const key = state.startedOnce ? 'pianohero.controls.restart' : 'pianohero.controls.start';
    dom.start.dataset.i18n = key;
    const fallback = state.startedOnce ? 'Volver a jugar' : 'Iniciar partida';
    applyI18n(dom.start);
    if (!dom.start.textContent || dom.start.textContent.trim() === key) {
      dom.start.textContent = fallback;
    }
  }

  function updateStatus(kind, payload = {}) {
    if (!dom.status) return;
    state.lastStatus = { kind, payload: { ...payload } };
    const key = STATUS_KEYS[kind] || STATUS_KEYS.ready;
    const fallback = STATUS_FALLBACK[kind] || STATUS_FALLBACK.ready;
    const text = tr(key, fallback, payload);
    dom.status.textContent = text;
    const alertKinds = kind === 'miss' || kind === 'wrong' || kind === 'gameover';
    dom.status.classList.toggle('pianohero-message--alert', alertKinds);
  }

  function refreshStatus() {
    const { kind, payload } = state.lastStatus || { kind: 'ready', payload: {} };
    updateStatus(kind, payload);
  }

  function playError() {
    if (window.Sfx && typeof window.Sfx.error === 'function') {
      window.Sfx.error();
    }
  }

  function getGameVolume() {
    if (window.Sfx) {
      if (typeof window.Sfx.getGameVolume === 'function') {
        const vol = window.Sfx.getGameVolume();
        if (Number.isFinite(vol)) return Math.max(0, Math.min(1, vol));
      }
      if (typeof window.Sfx.getState === 'function') {
        const snapshot = window.Sfx.getState();
        if (snapshot) {
          if (snapshot.muted) return 0;
          if (snapshot.volumeGame != null) return Math.max(0, Math.min(1, snapshot.volumeGame));
          if (snapshot.volumeSfx != null) return Math.max(0, Math.min(1, snapshot.volumeSfx));
        }
      }
    }
    return 0.6;
  }

  function getLevelConfig() {
    return LEVELS[state.levelIndex] || LEVELS[0];
  }

  function showScoreboardPrompt(score) {
    if (state.training) return;
    const finalScore = Number(score) || 0;
    if (finalScore <= 0) return;
    if (window.GameOverOverlay && typeof window.GameOverOverlay.show === 'function') {
      window.GameOverOverlay.show({
        gameId: GAME_ID,
        score: finalScore,
        onRetry: () => startGame(),
      });
      return;
    }
    if (window.ScoreService) {
      window.ScoreService.showSave(GAME_ID, finalScore);
    }
  }

  function hideScoreboardPrompt() {
    if (window.GameOverOverlay && typeof window.GameOverOverlay.isOpen === 'function' && window.GameOverOverlay.isOpen()) {
      window.GameOverOverlay.hide();
    }
    if (window.ScoreService) {
      window.ScoreService.hideSave(GAME_ID);
    }
  }

  function playLaneSample(laneIndex) {
    const lane = LANES[laneIndex];
    if (!lane) return;
    if (!lane.baseClip) {
      const audio = new Audio(lane.sample);
      audio.preload = 'auto';
      lane.baseClip = audio;
    }
    try {
      const clone = lane.baseClip.cloneNode(true);
      clone.volume = getGameVolume();
      if (clone.volume <= 0) return;
      clone.currentTime = 0;
      clone.play().catch(() => {});
    } catch (_) {}
  }

  function pickNextLane() {
    const maxLane = Math.max(1, state.activeLaneCount || 1);
    let lane = Math.floor(Math.random() * maxLane);
    if (lane === state.prevLane) {
      lane = (lane + 1) % maxLane;
    }
    state.prevLane = lane;
    return lane;
  }

  function computeTravelDistance() {
    if (!dom.board) return 0;
    const width = dom.board.clientWidth;
    const height = dom.board.clientHeight;
    if (state.travelCache
      && Math.abs(state.travelCache.width - width) < 2
      && Math.abs(state.travelCache.height - height) < 2) {
      return state.travelCache.distance;
    }
    const boardHeight = height;
    const targetTop = Math.max(0, boardHeight - TARGET_BOTTOM_OFFSET - TARGET_HEIGHT);
    const alignOffset = targetTop + (TARGET_HEIGHT - NOTE_HEIGHT) / 2 - NOTE_START_TOP;
    const distance = Math.max(0, Math.round(alignOffset));
    state.travelCache = { width, height, distance };
    return distance;
  }

  function clearNotes() {
    state.notes.forEach((note) => {
      if (note.el && note.el.parentNode) {
        note.el.remove();
      }
    });
    state.notes = [];
  }

  function spawnNote(now, config) {
    if (!dom.board) return;
    const laneIndex = pickNextLane();
    const laneEl = dom.lanes[laneIndex];
    if (!laneEl) return;
    const lane = LANES[laneIndex];
    const noteEl = document.createElement('div');
    noteEl.className = 'pianohero-note';
    noteEl.dataset.label = tr(`pianohero.noteLabel.${lane.key}`, lane.noteLabelFallback);
    laneEl.appendChild(noteEl);
    const travelDistance = computeTravelDistance();
    noteEl.style.transform = `translateY(${Math.max(0, Math.min(travelDistance, 0))}px)`;
    state.notes.push({
      lane: laneIndex,
      el: noteEl,
      spawn: now,
      hitTime: now + config.travelTime,
      status: 'active',
      removeAt: 0,
    });
    state.nextSpawn = now + config.spawnInterval;
  }

  function updateHud() {
    if (state.training) {
      if (dom.outputs.score) dom.outputs.score.textContent = '--';
      if (dom.outputs.combo) dom.outputs.combo.textContent = '--';
      if (dom.outputs.lives) dom.outputs.lives.textContent = '∞';
      if (dom.outputs.best) dom.outputs.best.textContent = '--';
    } else {
      if (dom.outputs.score) dom.outputs.score.textContent = String(state.score);
      if (dom.outputs.combo) dom.outputs.combo.textContent = String(state.combo);
      if (dom.outputs.lives) dom.outputs.lives.textContent = String(state.lives);
      if (dom.outputs.best) dom.outputs.best.textContent = String(state.bestCombo);
    }
  }

  function loseLife() {
    if (state.training) return;
    if (state.lives <= 0) return;
    state.lives -= 1;
    updateHud();
    if (state.lives <= 0) {
      endGame();
    }
  }

  function markNoteForRemoval(note, status, now) {
    note.status = status;
    note.removeAt = now + 260;
    if (status === 'hit') {
      note.el.classList.add('is-hit');
      note.el.style.opacity = '0.35';
    } else if (status === 'missed') {
      note.el.classList.add('is-missed');
    }
  }

  function processNotes(now, config) {
    const travelDistance = computeTravelDistance();
    const active = [];
    state.notes.forEach((note) => {
      const progress = (now - note.spawn) / config.travelTime;
      const clamped = Math.min(Math.max(progress, 0), 1.2);
      const translateY = Math.max(0, Math.min(travelDistance, clamped * travelDistance));
      note.el.style.transform = `translateY(${translateY}px)`;
      if (progress >= 1 && note.status === 'active') {
        markNoteForRemoval(note, 'missed', now);
        state.combo = 0;
        updateHud();
        updateStatus('miss');
        playError();
        loseLife();
      }
      if (note.removeAt && now >= note.removeAt) {
        note.el.remove();
      } else {
        active.push(note);
      }
    });
    state.notes = active;
  }

  function gameLoop(now) {
    if (!state.running) return;
    const config = getLevelConfig();
    if (!state.nextSpawn) state.nextSpawn = now + 600;
    if (now >= state.nextSpawn) {
      spawnNote(now, config);
    }
    processNotes(now, config);
    state.rafId = requestAnimationFrame(gameLoop);
  }

  function awardPoints(points) {
    if (state.training) return;
    state.score += points;
    updateHud();
  }

  function handleSuccessfulHit(note, laneIndex, now, config) {
    markNoteForRemoval(note, 'hit', now);
    playLaneSample(laneIndex);
    if (state.training) {
      updateStatus('hit', { points: 0 });
      return;
    }
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    const base = 100;
    const comboBonus = Math.max(0, (state.combo - 1) * 25);
    const gained = base + comboBonus;
    awardPoints(gained);
    updateStatus('hit', { points: gained });
    maybeLevelUp();
  }

  function handleWrongKey() {
    state.combo = 0;
    updateHud();
    updateStatus('wrong');
    playError();
    loseLife();
  }

  function handleEarlyInput() {
    state.combo = 0;
    updateHud();
    updateStatus('early');
  }

  function onInput(laneIndex) {
    if (!state.running) return;
    const now = performance.now();
    const config = getLevelConfig();
    const hitWindow = config.hitWindow;
    let candidate = null;
    let otherLaneCandidate = null;
    for (const note of state.notes) {
      if (note.status !== 'active') continue;
      const delta = Math.abs(note.hitTime - now);
      if (delta > hitWindow) continue;
      if (note.lane === laneIndex) {
        candidate = note;
        break;
      } else if (!otherLaneCandidate) {
        otherLaneCandidate = note;
      }
    }
    if (candidate) {
      handleSuccessfulHit(candidate, laneIndex, now, config);
    } else if (otherLaneCandidate) {
      handleWrongKey();
    } else {
      handleEarlyInput();
    }
  }

  function flashKey(lane) {
    const btn = dom.keys[lane];
    if (!btn) return;
    if (btn.disabled) return;
    btn.classList.add('is-pressed');
    setTimeout(() => btn.classList.remove('is-pressed'), 160);
  }

  function updateLaneLocks() {
    dom.lanes.forEach((laneEl, idx) => {
      if (!laneEl) return;
      const locked = idx >= state.activeLaneCount;
      laneEl.classList.toggle('is-locked', locked);
    });
    dom.keys.forEach((btn, idx) => {
      const locked = idx >= state.activeLaneCount;
      btn.disabled = locked;
      btn.setAttribute('aria-disabled', locked ? 'true' : 'false');
    });
  }

  function updateLevelUI({ announce = false } = {}) {
    const level = getLevelConfig();
    state.activeLaneCount = Math.min(LANES.length, Math.max(1, level.lanes));
    updateLaneLocks();
    if (dom.outputs.level) {
      const label = tr(`pianohero.level.${level.id}`, level.labelFallback);
      dom.outputs.level.textContent = label;
    }
    if (announce) {
      const label = tr(`pianohero.level.${level.id}`, level.labelFallback);
      updateStatus('levelup', { level: label });
    }
  }

  function maybeLevelUp() {
    while (state.levelIndex < LEVELS.length - 1) {
      const next = LEVELS[state.levelIndex + 1];
      if (state.score >= next.threshold) {
        state.levelIndex += 1;
        updateLevelUI({ announce: true });
      } else {
        break;
      }
    }
  }

  function startGame() {
    if (!dom.board) return;
    cancelAnimationFrame(state.rafId);
    state.running = true;
    state.startedOnce = true;
    hideScoreboardPrompt();
    state.training = !!(dom.trainingToggle && dom.trainingToggle.checked);
    state.notes = [];
    state.prevLane = null;
    state.travelCache = null;
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.lives = state.training ? Infinity : MAX_LIVES;
    state.levelIndex = 0;
    updateLevelUI();
    state.nextSpawn = 0;
    clearNotes();
    updateHud();
    updateStartLabel();
    updateStatus('start');
    if (window.ScoreService && typeof window.ScoreService.hideSave === 'function') {
      window.ScoreService.hideSave(GAME_ID);
    }
    state.rafId = requestAnimationFrame(gameLoop);
  }

  function endGame() {
    if (!state.running) return;
    state.running = false;
    cancelAnimationFrame(state.rafId);
    state.rafId = 0;
    updateStartLabel();
    updateStatus('gameover', { score: state.score });
    showScoreboardPrompt(state.score);
  }

  function bindKeyListeners() {
    document.addEventListener('keydown', (ev) => {
      if (!state.running) return;
      const lane = KEY_TO_LANE[ev.code];
      if (lane == null) return;
      if (state.pressedKeys.has(ev.code)) return;
      state.pressedKeys.add(ev.code);
      ev.preventDefault();
      flashKey(lane);
      onInput(lane);
    });
    document.addEventListener('keyup', (ev) => {
      const lane = KEY_TO_LANE[ev.code];
      if (lane == null) return;
      state.pressedKeys.delete(ev.code);
    });
    window.addEventListener('blur', () => {
      state.pressedKeys.clear();
    });
  }

  function bindButtons() {
    dom.keys.forEach((btn) => {
      const lane = Number(btn.dataset.lane);
      if (!Number.isFinite(lane)) return;
      btn.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        flashKey(lane);
        onInput(lane);
      });
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
      });
    });
  }

  function applyAccessibilityHints() {
    dom.lanes.forEach((laneEl, idx) => {
      const lane = LANES[idx];
      if (!laneEl) return;
      const badge = laneEl.querySelector('[data-lane-note]');
      const noteText = tr(`pianohero.lane.${lane.key}`, lane.badgeFallback);
      if (badge) badge.textContent = noteText;
      laneEl.setAttribute('aria-label', `${noteText} — ${lane.keyLabel}`);
    });
    dom.keys.forEach((btn, idx) => {
      const lane = LANES[idx];
      const label = tr(`pianohero.button.${lane.key}`, `${lane.noteLabelFallback} · ${lane.keyLabel}`);
      btn.setAttribute('aria-label', tr('pianohero.button.hint', '{label} (tecla {key})', {
        label,
        key: lane.keyLabel,
      }));
    });
  }

  function onResize() {
    state.travelCache = null;
  }

  function init() {
    dom.board = document.querySelector('[data-pianohero-board]');
    if (!dom.board) return;
    dom.board.style.setProperty('--lane-count', String(LANES.length));
    dom.lanes = Array.from(dom.board.querySelectorAll('.pianohero-lane'));
    dom.target = dom.board.querySelector('.pianohero-target');
    dom.keys = Array.from(document.querySelectorAll('[data-pianohero-keys] .pianohero-key'));
    dom.start = document.querySelector('[data-start]');
    dom.status = document.querySelector('[data-status]');
    dom.outputs.score = document.querySelector('[data-score]');
    dom.outputs.combo = document.querySelector('[data-combo]');
    dom.outputs.lives = document.querySelector('[data-lives]');
    dom.outputs.best = document.querySelector('[data-best]');
    dom.outputs.level = document.querySelector('[data-level]');
    dom.trainingToggle = document.querySelector('[data-training]');
    updateHud();
    updateLevelUI();
    updateStartLabel();
    refreshStatus();
    bindKeyListeners();
    bindButtons();
    if (dom.start) {
      dom.start.addEventListener('click', (ev) => {
        ev.preventDefault();
        startGame();
      });
    }
    window.addEventListener('resize', onResize);
    if (window.i18n && typeof window.i18n.onChange === 'function') {
      window.i18n.onChange(() => {
        updateStartLabel();
        refreshStatus();
        applyAccessibilityHints();
        updateLevelUI();
      });
    }
    applyAccessibilityHints();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
