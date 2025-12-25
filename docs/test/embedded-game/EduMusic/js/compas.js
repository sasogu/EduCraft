(() => {
  const tileLibrary = {
    negra: { id: 'negra', duration: 1, labelKey: 'compas.tiles.negra', figure: '♩' },
    tiTi: { id: 'tiTi', duration: 1, labelKey: 'compas.tiles.titi', figure: '♫' },
    corchea: { id: 'corchea', duration: 0.5, labelKey: 'compas.tiles.corchea', figure: '♪' },
    silencioCorchea: { id: 'silencioCorchea', duration: 0.5, labelKey: 'compas.tiles.corcheaRest', figure: '𝄾' },
    negraPuntillo: { id: 'negraPuntillo', duration: 1.5, labelKey: 'compas.tiles.dottedQuarter', figure: '♩·' },
    blanca: { id: 'blanca', duration: 2, labelKey: 'compas.tiles.half', figure: '𝅗𝅥' },
    silencioNegra: { id: 'silencioNegra', duration: 1, labelKey: 'compas.tiles.quarterRest', figure: '𝄽' },
    semicorcheas: { id: 'semicorcheas', duration: 1, labelKey: 'compas.tiles.semicorcheas', figure: '♬♬' },
  };

  const puzzles = [
    {
      meter: '2/4',
      beats: 2,
      deck: ['negra', 'negra', 'corchea', 'corchea', 'silencioCorchea'],
    },
    {
      meter: '2/4',
      beats: 2,
      deck: ['negraPuntillo', 'corchea', 'negra', 'silencioCorchea'],
    },
    {
      meter: '3/4',
      beats: 3,
      deck: ['blanca', 'corchea', 'corchea', 'negra', 'silencioNegra'],
    },
    {
      meter: '3/4',
      beats: 3,
      deck: ['negraPuntillo', 'negra', 'semicorcheas', 'corchea', 'silencioCorchea'],
    },
    {
      meter: '4/4',
      beats: 4,
      deck: ['blanca', 'negra', 'negra', 'corchea', 'corchea', 'semicorcheas'],
    },
    {
      meter: '4/4',
      beats: 4,
      deck: ['negraPuntillo', 'negraPuntillo', 'corchea', 'corchea', 'negra'],
    },
  ];

  const dom = {
    tilePool: document.getElementById('tilePool'),
    measureZone: document.getElementById('measureZone'),
    usedBeats: document.getElementById('usedBeats'),
    totalBeats: document.getElementById('totalBeats'),
    statusMessage: document.getElementById('statusMessage'),
    solvedCount: document.getElementById('solvedCount'),
    currentStreak: document.getElementById('currentStreak'),
    targetInfo: document.getElementById('targetInfo'),
    btnNew: document.getElementById('newPuzzleBtn'),
    btnCheck: document.getElementById('checkBtn'),
    btnReset: document.getElementById('resetBtn'),
  };

  if (!dom.tilePool || !dom.measureZone) return;

  const state = {
    puzzle: null,
    hasSolved: false,
    solvedCount: 0,
    streak: 0,
    difficulty: 1,
    lastStatus: null,
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

  const registry = new Map();
  let currentLang = 'es';

  const SCOREBOARD_ID = 'compas';
  function showScoreboardPrompt(score) {
    const finalScore = Number(score) || 0;
    if (finalScore <= 0) return;
    if (window.GameOverOverlay && typeof window.GameOverOverlay.show === 'function') {
      window.GameOverOverlay.show({
        gameId: SCOREBOARD_ID,
        score: finalScore,
        onRetry: () => resetPuzzle(),
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

  function translate(key, params, fallback) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      const res = window.i18n.t(key, params);
      if (res && res !== key) return res;
    }
    if (fallback != null) {
      return typeof fallback === 'function' ? fallback() : fallback;
    }
    return key;
  }

  function formatNumber(num) {
    const rounded = Math.round(num * 100) / 100;
    if (Number.isInteger(rounded)) return String(rounded);
    return rounded.toFixed(2).replace(/\.?0+$/, '').replace(',', '.');
  }

  function tileDurationText(duration) {
    return translate('compas.tile.duration', { n: formatNumber(duration) }, () => `Duración: ${formatNumber(duration)} tiempos`);
  }

  function getTileLabel(tile) {
    const { labelKey } = tile;
    const fallback = tile.id;
    return translate(labelKey, null, fallback);
  }

  function applyDifficultyToTile(el) {
    if (!el) return;
    el.classList.remove('difficulty-1', 'difficulty-2', 'difficulty-3');
    const level = Math.max(1, Math.min(3, state.difficulty || 1));
    el.classList.add(`difficulty-${level}`);
  }

  function applyDifficultyToBoard() {
    const tiles = document.querySelectorAll('.tile-card');
    tiles.forEach(tile => applyDifficultyToTile(tile));
  }

  function advanceDifficulty() {
    if (state.difficulty < 3) state.difficulty += 1;
  }

  function updateSummaryVisibility() {
    const summary = document.getElementById('measureSummary');
    if (!summary) return;
    if (state.solvedCount >= 6) summary.classList.add('hidden');
    else summary.classList.remove('hidden');
  }

  function clearDropzone(zone) {
    while (zone.firstChild) zone.removeChild(zone.firstChild);
  }

  function buildTileElement(tileId, index = 0) {
    const def = tileLibrary[tileId];
    if (!def) return null;
    const el = document.createElement('div');
    el.className = 'tile-card';
    el.draggable = true;
    el.dataset.tile = def.id;
    el.dataset.duration = String(def.duration);
    el.dataset.instance = `${def.id}-${Date.now()}-${Math.random().toString(36).slice(2)}-${index}`;
    el.setAttribute('aria-label', getTileLabel(def));

    if (def.figure) {
      const figure = document.createElement('span');
      figure.className = 'tile-figure';
      figure.textContent = def.figure;
      figure.setAttribute('aria-hidden', 'true');
      el.appendChild(figure);
    }
    const label = document.createElement('span');
    label.className = 'tile-label';
    label.textContent = getTileLabel(def);
    el.appendChild(label);

    const duration = document.createElement('span');
    duration.className = 'tile-duration';
    duration.textContent = tileDurationText(def.duration);
    el.appendChild(duration);

    el.addEventListener('dragstart', handleDragStart);
    el.addEventListener('dragend', handleDragEnd);
    registry.set(el.dataset.instance, el);
    applyDifficultyToTile(el);
    return el;
  }

  let draggedId = null;

  function handleDragStart(ev) {
    const target = ev.currentTarget;
    draggedId = target.dataset.instance;
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', draggedId);
    clearStatus();
    dom.measureZone.classList.remove('completed');
    if (state.hasSolved) {
      state.hasSolved = false;
      dom.btnCheck.disabled = false;
    }
    target.classList.add('dragging');
  }

  function handleDragEnd() {
    draggedId = null;
    allDropzones.forEach(zone => zone.classList.remove('over'));
    const dragging = document.querySelector('.tile-card.dragging');
    if (dragging) dragging.classList.remove('dragging');
  }

  function handleDragOver(ev) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
  }

  function handleDragEnter(ev) {
    ev.preventDefault();
    ev.currentTarget.classList.add('over');
  }

  function handleDragLeave(ev) {
    const zone = ev.currentTarget;
    const related = ev.relatedTarget;
    if (!zone.contains(related)) zone.classList.remove('over');
  }

  function handleDrop(ev) {
    ev.preventDefault();
    const zone = ev.currentTarget;
    zone.classList.remove('over');
    const id = ev.dataTransfer.getData('text/plain') || draggedId;
    const tile = registry.get(id);
    if (!tile) return;
    if (tile.parentElement === zone) return;
    zone.appendChild(tile);
    updateUsedBeats();
  }

  const allDropzones = [dom.tilePool, dom.measureZone];
  allDropzones.forEach(zone => {
    zone.addEventListener('dragover', handleDragOver);
    zone.addEventListener('dragenter', handleDragEnter);
    zone.addEventListener('dragleave', handleDragLeave);
    zone.addEventListener('drop', handleDrop);
  });

  function updateUsedBeats() {
    const tiles = Array.from(dom.measureZone.querySelectorAll('.tile-card'));
    const sum = tiles.reduce((acc, el) => acc + Number(el.dataset.duration || 0), 0);
    dom.usedBeats.textContent = formatNumber(sum);
    return sum;
  }

  function setStatus(kind, keyFallback, fallback) {
    dom.statusMessage.classList.remove('success', 'error');
    if (!keyFallback) {
      dom.statusMessage.textContent = '';
      state.lastStatus = null;
      return;
    }
    const text = translate(keyFallback, null, fallback);
    dom.statusMessage.textContent = text;
    if (kind) dom.statusMessage.classList.add(kind);
    state.lastStatus = { kind, key: keyFallback, fallback };
  }

  function clearStatus() {
    setStatus(null, null, '');
  }

  function renderPuzzle(puzzle) {
    state.puzzle = puzzle;
    state.hasSolved = false;
    dom.btnCheck.disabled = false;
    hideScoreboardPrompt();
    dom.measureZone.classList.remove('completed');
    clearStatus();
    state.lastStatus = null;

    registry.clear();
    clearDropzone(dom.tilePool);
    clearDropzone(dom.measureZone);

    puzzle.deck.forEach((tileId, index) => {
      const tile = buildTileElement(tileId, index);
      if (tile) dom.tilePool.appendChild(tile);
    });

    dom.totalBeats.textContent = formatNumber(puzzle.beats);
    dom.usedBeats.textContent = '0';

    dom.targetInfo.textContent = translate(
      'compas.target.info',
      { meter: puzzle.meter, beats: formatNumber(puzzle.beats) },
      () => `Compás de ${puzzle.meter} · ${formatNumber(puzzle.beats)} tiempos`
    );
    applyDifficultyToBoard();
    updateSummaryVisibility();
  }

  function randomPuzzle() {
    const index = Math.floor(Math.random() * puzzles.length);
    return puzzles[index];
  }

  function checkSolution() {
    if (!state.puzzle) return;
    const used = updateUsedBeats();
    const target = state.puzzle.beats;
    const diff = Math.round((used - target) * 100) / 100;

    if (used === 0) {
      setStatus('error', 'compas.feedback.empty', 'Añade fichas al compás para empezar.');
      state.streak = 0;
      updateMetrics();
      return;
    }

    if (Math.abs(diff) < 0.01) {
      state.hasSolved = true;
      state.solvedCount += 1;
      state.streak += 1;
      setStatus('success', 'compas.feedback.perfect', '¡Muy bien! Has completado el compás.');
      dom.measureZone.classList.add('completed');
      dom.btnCheck.disabled = true;
      advanceDifficulty();
      applyDifficultyToBoard();
      updateMetrics();
      updateSummaryVisibility();
      showScoreboardPrompt(state.solvedCount);
      playSuccess();
      return;
    }

    if (diff > 0) {
      setStatus('error', 'compas.feedback.tooMuch', 'Te has pasado de tiempos. Retira alguna ficha.');
    } else {
      setStatus('error', 'compas.feedback.missing', 'Todavía faltan tiempos por completar.');
    }
    playError();
    state.streak = 0;
    dom.measureZone.classList.remove('completed');
    updateMetrics();
  }

  function updateMetrics() {
    dom.solvedCount.textContent = String(state.solvedCount);
    dom.currentStreak.textContent = String(state.streak);
    updateSummaryVisibility();
  }

  function resetPuzzle() {
    if (!state.puzzle) return;
    renderPuzzle(state.puzzle);
  }

  function startNewPuzzle() {
    renderPuzzle(randomPuzzle());
  }

  dom.btnNew.addEventListener('click', () => {
    startNewPuzzle();
  });
  dom.btnCheck.addEventListener('click', () => checkSolution());
  dom.btnReset.addEventListener('click', () => resetPuzzle());

  function applyTranslations() {
    if (!state.puzzle) return;
    dom.targetInfo.textContent = translate(
      'compas.target.info',
      { meter: state.puzzle.meter, beats: formatNumber(state.puzzle.beats) },
      () => `Compás de ${state.puzzle.meter} · ${formatNumber(state.puzzle.beats)} tiempos`
    );
    const cards = document.querySelectorAll('.tile-card');
    cards.forEach(card => {
      const def = tileLibrary[card.dataset.tile];
      if (!def) return;
      const labelEl = card.querySelector('.tile-label');
      const durationEl = card.querySelector('.tile-duration');
      card.setAttribute('aria-label', getTileLabel(def));
      if (labelEl) labelEl.textContent = getTileLabel(def);
      if (durationEl) durationEl.textContent = tileDurationText(def.duration);
      applyDifficultyToTile(card);
    });
    if (state.lastStatus) {
      const { kind, key, fallback } = state.lastStatus;
      setStatus(kind, key, fallback);
    }
    updateSummaryVisibility();
  }

  function refreshLabels() {
    currentLang = (window.i18n && typeof window.i18n.getLang === 'function')
      ? window.i18n.getLang()
      : currentLang;
    applyTranslations();
  }

  function bindI18n() {
    if (window.i18n && typeof window.i18n.onChange === 'function') {
      window.i18n.onChange(() => {
        refreshLabels();
        updateMetrics();
        updateUsedBeats();
      });
      applyTranslations();
    } else {
      setTimeout(bindI18n, 120);
    }
  }

  startNewPuzzle();
  bindI18n();
})();
