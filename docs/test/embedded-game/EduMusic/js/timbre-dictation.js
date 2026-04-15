(() => {
  const instruments = [
    {
      id: 'violin',
      family: 'cuerdas',
      name: { es: 'Violín', val: 'Violí', en: 'Violin' },
      imagePath: '../assets/image/orquesta/violin.jpg',
      audioPath: '../assets/audio/violin.ogg'
    },
    {
      id: 'viola',
      family: 'cuerdas',
      name: { es: 'Viola', val: 'Viola', en: 'Viola' },
      imagePath: '../assets/image/orquesta/viola.jpg',
      audioPath: '../assets/audio/viola.mp3'
    },
    {
      id: 'violoncello',
      family: 'cuerdas',
      name: { es: 'Violonchelo', val: 'Violoncel', en: 'Cello' },
      imagePath: '../assets/image/orquesta/violonchelo.jpg',
      audioPath: '../assets/audio/violonchelo.mp3'
    },
    {
      id: 'contrabajo',
      family: 'cuerdas',
      name: { es: 'Contrabajo', val: 'Contrabaix', en: 'Double bass' },
      imagePath: '../assets/image/orquesta/contrabajo.jpg',
      audioPath: '../assets/audio/contrabajo.mp3'
    },
    {
      id: 'flauta',
      family: 'viento_madera',
      name: { es: 'Flauta travesera', val: 'Flauta travessera', en: 'Flute' },
      imagePath: '../assets/image/orquesta/flauta.jpg',
      audioPath: '../assets/audio/flute.ogg'
    },
    {
      id: 'clarinete',
      family: 'viento_madera',
      name: { es: 'Clarinete', val: 'Clarinete', en: 'Clarinet' },
      imagePath: '../assets/image/orquesta/clarinete.jpg',
      audioPath: '../assets/audio/clarinet.mp3'
    },
    {
      id: 'oboe',
      family: 'viento_madera',
      name: { es: 'Oboe', val: 'Oboè', en: 'Oboe' },
      imagePath: '../assets/image/orquesta/oboe.jpg',
      audioPath: '../assets/audio/oboe.mp3'
    },
    {
      id: 'fagot',
      family: 'viento_madera',
      name: { es: 'Fagot', val: 'Fagot', en: 'Bassoon' },
      imagePath: '../assets/image/orquesta/fagot.jpg',
      audioPath: '../assets/audio/fagot.mp3'
    },
    {
      id: 'saxo',
      family: 'viento_madera',
      name: { es: 'Saxofón', val: 'Saxòfon', en: 'Saxophone' },
      imagePath: '../assets/image/orquesta/saxo.png',
      audioPath: '../assets/audio/saxo.mp3'
    },
    {
      id: 'trompeta',
      family: 'viento_metal',
      name: { es: 'Trompeta', val: 'Trompeta', en: 'Trumpet' },
      imagePath: '../assets/image/orquesta/trompeta.png',
      audioPath: '../assets/audio/trompeta.ogg'
    },
    {
      id: 'trombon',
      family: 'viento_metal',
      name: { es: 'Trombón', val: 'Trombó', en: 'Trombone' },
      imagePath: '../assets/image/orquesta/trombon.jpg',
      audioPath: '../assets/audio/trombone.mp3'
    },
    {
      id: 'trompa',
      family: 'viento_metal',
      name: { es: 'Trompa', val: 'Trompa', en: 'French horn' },
      imagePath: '../assets/image/orquesta/trompa.jpg',
      audioPath: '../assets/audio/trompa.mp3'
    },
    {
      id: 'tuba',
      family: 'viento_metal',
      name: { es: 'Tuba', val: 'Tuba', en: 'Tuba' },
      imagePath: '../assets/image/orquesta/tuba.jpg',
      audioPath: '../assets/audio/tuba.mp3'
    },
    {
      id: 'caja',
      family: 'percusion',
      name: { es: 'Caja', val: 'Caixa', en: 'Snare drum' },
      imagePath: '../assets/image/orquesta/caja.png',
      audioPath: '../assets/audio/caja.mp3'
    },
    {
      id: 'arpa',
      family: 'cuerdas',
      name: { es: 'Arpa', val: 'Arpa', en: 'Harp' },
      audioPath: '../assets/audio/arpa.mp3'
    }
  ];

  const SCOREBOARD_ID = 'timbre-dictation';
  const ui = {
    practiceGrid: document.getElementById('practiceGrid'),
    practicePanel: document.getElementById('practicePanel'),
    practiceToggle: document.getElementById('practiceToggle'),
    answerGrid: document.getElementById('answerGrid'),
    familyFilter: document.getElementById('familyFilter'),
    optionsSelect: document.getElementById('optionsSelect'),
    startBtn: document.getElementById('startBtn'),
    playBtn: document.getElementById('playBtn'),
    feedback: document.getElementById('feedback'),
    score: document.getElementById('score'),
    lives: document.getElementById('lives'),
    round: document.getElementById('round'),
  };

  const state = {
    running: false,
    locked: false,
    score: 0,
    lives: 3,
    round: 0,
    currentInstrument: null,
    options: [],
    family: 'all',
    optionsCount: 4,
    practiceOpen: false,
  };

  const player = new Audio();
  player.preload = 'auto';

  function t(key, params) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key, params);
    }
    return key;
  }

  function getLang() {
    return window.i18n && typeof window.i18n.getLang === 'function' ? window.i18n.getLang() : 'es';
  }

  function getName(item) {
    const lang = getLang();
    return item.name[lang] || item.name.es;
  }

  function familyLabel(family) {
    return t(`timbre.family.${family}`);
  }

  function buildFallbackImage(label) {
    const safe = String(label || '').replace(/&/g, '&amp;');
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#e0ecff"/>
            <stop offset="100%" stop-color="#c7d2fe"/>
          </linearGradient>
        </defs>
        <rect width="240" height="240" rx="28" fill="url(#g)"/>
        <circle cx="120" cy="92" r="42" fill="#ffffff" opacity="0.72"/>
        <path d="M92 156 C110 110, 138 92, 154 60" stroke="#1e3a8a" stroke-width="8" fill="none" stroke-linecap="round"/>
        <path d="M92 156 L156 156" stroke="#1e3a8a" stroke-width="8" stroke-linecap="round"/>
        <text x="120" y="202" text-anchor="middle" font-size="20" font-weight="700" fill="#0f172a">${safe}</text>
      </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  function getImage(item) {
    return item.imagePath || buildFallbackImage(getName(item));
  }

  function filteredPool() {
    return state.family === 'all'
      ? instruments.slice()
      : instruments.filter((item) => item.family === state.family);
  }

  function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function playAudio(src) {
    if (!src) return;
    try {
      player.pause();
      player.currentTime = 0;
      player.src = src;
      player.play().catch(() => {});
    } catch (_) {}
  }

  function updateHud() {
    ui.score.textContent = t('hud.points', { n: state.score });
    ui.lives.textContent = t('hud.lives', { n: state.lives });
    ui.round.textContent = t('timbre.round', { n: state.round });
  }

  function updateScoreboardHeading() {
    const text = window.i18n && typeof window.i18n.t === 'function'
      ? window.i18n.t('rankings.timbre_dictation')
      : 'Dictado de timbre';
    document.querySelectorAll('[data-scoreboard][data-heading-key="rankings.timbre_dictation"]').forEach((el) => {
      el.setAttribute('data-heading', text);
    });
  }

  function updatePracticeToggle() {
    if (!ui.practiceToggle || !ui.practicePanel) return;
    ui.practicePanel.hidden = !state.practiceOpen;
    ui.practiceToggle.setAttribute('aria-expanded', state.practiceOpen ? 'true' : 'false');
    ui.practiceToggle.textContent = state.practiceOpen
      ? t('timbre.practice.hide')
      : t('timbre.practice.show');
  }

  function renderPractice() {
    ui.practiceGrid.innerHTML = '';
    instruments.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'practice-card';
      card.innerHTML = `
        <img src="${getImage(item)}" alt="${getName(item)}">
        <h3>${getName(item)}</h3>
        <p>${familyLabel(item.family)}</p>
        <button type="button" class="game-btn">${t('timbre.practice.play')}</button>
      `;
      card.querySelector('button').addEventListener('click', () => playAudio(item.audioPath));
      ui.practiceGrid.appendChild(card);
    });
  }

  function buildRound() {
    const pool = filteredPool();
    if (pool.length < state.optionsCount) {
      state.running = false;
      state.currentInstrument = null;
      state.options = [];
      ui.answerGrid.innerHTML = '';
      ui.playBtn.disabled = true;
      ui.feedback.textContent = t('timbre.feedback.not_enough');
      return;
    }

    const options = shuffle(pool).slice(0, state.optionsCount);
    const answer = options[Math.floor(Math.random() * options.length)];
    state.currentInstrument = answer;
    state.options = shuffle(options);
    state.round += 1;
    state.locked = false;
    ui.feedback.textContent = t('timbre.feedback.listen');
    renderAnswers();
    updateHud();
    playAudio(answer.audioPath);
    ui.playBtn.disabled = false;
  }

  function renderAnswers() {
    ui.answerGrid.innerHTML = '';
    state.options.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'answer-card';
      card.dataset.id = item.id;
      card.innerHTML = `
        <img src="${getImage(item)}" alt="${getName(item)}">
        <h3>${getName(item)}</h3>
        <p><span class="family-chip">${familyLabel(item.family)}</span></p>
        <button type="button" class="game-btn">${t('timbre.answer')}</button>
      `;
      card.querySelector('button').addEventListener('click', () => handleAnswer(item, card));
      ui.answerGrid.appendChild(card);
    });
  }

  function showScoreboardPrompt(score) {
    if (score <= 0) return;
    if (window.GameOverOverlay && typeof window.GameOverOverlay.show === 'function') {
      window.GameOverOverlay.show({
        gameId: SCOREBOARD_ID,
        score,
        onRetry: () => startGame(),
      });
      return;
    }
    if (window.ScoreService) {
      window.ScoreService.showSave(SCOREBOARD_ID, score);
    }
  }

  function endGame() {
    state.running = false;
    state.locked = true;
    ui.playBtn.disabled = true;
    showScoreboardPrompt(state.score);
  }

  function handleAnswer(item, card) {
    if (!state.running || state.locked || !state.currentInstrument) return;
    state.locked = true;
    const correct = item.id === state.currentInstrument.id;

    Array.from(ui.answerGrid.children).forEach((el) => {
      if (el.dataset.id === state.currentInstrument.id) el.classList.add('is-correct');
    });

    if (correct) {
      state.score += 1;
      card.classList.add('is-correct');
      ui.feedback.textContent = t('timbre.feedback.correct');
    } else {
      state.lives -= 1;
      card.classList.add('is-error');
      ui.feedback.textContent = t('timbre.feedback.wrong');
    }

    updateHud();

    if (state.lives <= 0) {
      setTimeout(() => endGame(), 800);
      return;
    }

    setTimeout(() => buildRound(), 1000);
  }

  function startGame() {
    state.running = true;
    state.locked = false;
    state.score = 0;
    state.lives = 3;
    state.round = 0;
    state.family = ui.familyFilter.value;
    state.optionsCount = Number(ui.optionsSelect.value) || 4;
    if (window.GameOverOverlay && typeof window.GameOverOverlay.hide === 'function') {
      window.GameOverOverlay.hide();
    }
    buildRound();
    updateHud();
  }

  function bindEvents() {
    ui.startBtn.addEventListener('click', startGame);
    if (ui.practiceToggle) {
      ui.practiceToggle.addEventListener('click', () => {
        state.practiceOpen = !state.practiceOpen;
        updatePracticeToggle();
      });
    }
    ui.playBtn.addEventListener('click', () => {
      if (state.currentInstrument) playAudio(state.currentInstrument.audioPath);
    });
    ui.familyFilter.addEventListener('change', () => {
      state.family = ui.familyFilter.value;
      if (state.running) startGame();
    });
    ui.optionsSelect.addEventListener('change', () => {
      state.optionsCount = Number(ui.optionsSelect.value) || 4;
      if (state.running) startGame();
    });
    if (window.i18n && typeof window.i18n.onChange === 'function') {
      window.i18n.onChange(() => {
        renderPractice();
        if (state.options.length) renderAnswers();
        updateHud();
        updateScoreboardHeading();
        updatePracticeToggle();
      });
    }
  }

  function init() {
    renderPractice();
    bindEvents();
    updateHud();
    updateScoreboardHeading();
    updatePracticeToggle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
