(() => {
  const STORAGE_KEY = 'instruments_best_streak';
  const FEEDBACK_KEYS = {
    correct: 'game.instruments.feedback.correct',
    wrong: 'game.instruments.feedback.wrong',
  };

  const instruments = [
    {
      id: 'violin',
      family: 'cuerdas',
      name: { es: 'Violín', val: 'Violí', en: 'Violin' },
      info: {
        es: 'Cordas frotadas en el registro agudo',
        val: 'Cordes fregades en el registre agut',
        en: 'Bowed strings in the high register'
      },
      imagePath: '../assets/image/orquesta/violin.jpg',
      audioPath: '../assets/audio/violin.ogg'
    },
    {
      id: 'viola',
      family: 'cuerdas',
      name: { es: 'Viola', val: 'Viola', en: 'Viola' },
      info: {
        es: 'Cordas frotadas con sonoridad más cálida',
        val: 'Cordes fregades amb sonoritat més càlida',
        en: 'Bowed strings with a warm sound'
      },
      imagePath: '../assets/image/orquesta/viola.jpg'
    },
    {
      id: 'violoncello',
      family: 'cuerdas',
      name: { es: 'Violoncello', val: 'Violoncel', en: 'Cello' },
      info: {
        es: 'Cordas graves con el arquet de pie',
        val: 'Cordes greus amb l’arquet a terra',
        en: 'Low bowed strings with the bow on the floor'
      },
      imagePath: '../assets/image/orquesta/violonchelo.jpg',
      audioPath: '../assets/audio/cello.mp3'
    },
    {
      id: 'contrabajo',
      family: 'cuerdas',
      name: { es: 'Contrabajo', val: 'Contrabaix', en: 'Double bass' },
      info: {
        es: 'La cuerda más grave de la orquesta',
        val: 'La corda més greu de l’orquestra',
        en: 'The orchestra’s lowest string'
      },
      imagePath: '../assets/image/orquesta/contrabajo.jpg'
    },
    {
      id: 'flauta',
      family: 'viento_madera',
      name: { es: 'Flauta travesera', val: 'Flauta travessera', en: 'Flute' },
      info: {
        es: 'Tubo metálico delgado soplado lateralmente',
        val: 'Tub fi metàl·lic bufat lateralment',
        en: 'Thin metal tube blown from the side'
      },
      imagePath: '../assets/image/orquesta/flauta.jpg',
      audioPath: '../assets/audio/flute.ogg'
    },
    {
      id: 'clarinete',
      family: 'viento_madera',
      name: { es: 'Clarinete', val: 'Clarinete', en: 'Clarinet' },
      info: {
        es: 'Boquilla con lengüeta simple y cuerpo cilíndrico',
        val: 'Boquilla amb canya simple i cos cilíndric',
        en: 'Single reed mouthpiece with cylindrical body'
      },
      imagePath: '../assets/image/orquesta/clarinete.jpg',
      audioPath: '../assets/audio/clarinet.mp3'
    },
    {
      id: 'oboe',
      family: 'viento_madera',
      name: { es: 'Oboe', val: 'Oboè', en: 'Oboe' },
      info: {
        es: 'Lengüeta doble, sonido nasal y brillante',
        val: 'Canya doble, so nasal i brillant',
        en: 'Double reed, bright nasal tone'
      },
      imagePath: '../assets/image/orquesta/oboe.jpg',
      audioPath: '../assets/audio/oboe.mp3'
    },
    {
      id: 'fagot',
      family: 'viento_madera',
      name: { es: 'Fagot', val: 'Fagot', en: 'Bassoon' },
      info: {
        es: 'Instrumento grave con tubos plegados',
        val: 'Instrument greu amb tubs plegats',
        en: 'Low woodwind with folded tubing'
      },
      imagePath: '../assets/image/orquesta/fagot.jpg',
      audioPath: '../assets/audio/fagot.mp3'
    },
    {
      id: 'trompeta',
      family: 'viento_metal',
      name: { es: 'Trompeta', val: 'Trompeta', en: 'Trumpet' },
      info: {
        es: 'Metal brillante y notas agudas con pistones',
        val: 'Metall brillant i notes agudes amb pistons',
        en: 'Bright metal with valves for high notes'
      },
      imagePath: '../assets/image/orquesta/trompeta.png',
      audioPath: '../assets/audio/trompeta.ogg'
    },
    {
      id: 'trompa',
      family: 'viento_metal',
      name: { es: 'Trompa', val: 'Trompa', en: 'Horn' },
      info: {
        es: 'Tubos enrollados con sonido cálido y redondo',
        val: 'Tubs enrotllats amb so càlid i rodó',
        en: 'Coiled tubes with warm rounded tone'
      },
      imagePath: '../assets/image/orquesta/trompa.jpg'
    },
    {
      id: 'trombon',
      family: 'viento_metal',
      name: { es: 'Trombón', val: 'Trombó', en: 'Trombone' },
      info: {
        es: 'Deslizamiento que cambia la longitud del tubo',
        val: 'Desplaçament que canvia la longitud del tub',
        en: 'Slide changes the pipe length'
      },
      imagePath: '../assets/image/orquesta/trombon.jpg',
      audioPath: '../assets/audio/trombone.mp3'
    },
    {
      id: 'tuba',
      family: 'viento_metal',
      name: { es: 'Tuba', val: 'Tuba', en: 'Tuba' },
      info: {
        es: 'El metal más grave de la sección de viento-métal',
        val: 'El metall més greu de la secció de vent-metal',
        en: 'Lowest brass voice in the wind section'
      },
      imagePath: '../assets/image/orquesta/tuba.jpg'
    },
    {
      id: 'caja',
      family: 'percusion',
      name: { es: 'Caja', val: 'Caixa', en: 'Snare drum' },
      info: {
        es: 'Tambor central en ritmos marcados con bordones tensados',
        val: 'Tambor central en ritmes marcats amb cordes tensades',
        en: 'Core drum with tight snares for crisp rhythms'
      },
      imagePath: '../assets/image/orquesta/caja.png',
      audioPath: '../assets/audio/caja.mp3'
    },
    {
      id: 'xilofono',
      family: 'percusion',
      name: { es: 'Xilófono', val: 'Xilòfon', en: 'Xylophone' },
      info: {
        es: 'Sonidos agudos generados por barras de madera',
        val: 'Sons aguts generats per barres de fusta',
        en: 'High tones from wooden bars'
      },
      imagePath: '../assets/image/orquesta/marimba.jpg'
    },
    {
      id: 'triangulo',
      family: 'percusion',
      name: { es: 'Triángulo', val: 'Triangle', en: 'Triangle' },
      info: {
        es: 'Pequeño metal en forma de triángulo, sostenido por un hilo',
        val: 'Metal petit en forma de triangle, suspés per un fil',
        en: 'Small triangle-shaped metal suspended by thread'
      }
    }
  ];

  let sequence = [];
  let currentInstrument = null;
  const state = {
    total: 0,
    correct: 0,
    streak: 0,
    bestStreak: Number(localStorage.getItem(STORAGE_KEY) || 0),
    lives: 3,
    over: false,
  };

  const refs = {
    name: document.getElementById('instrumentName'),
    info: document.getElementById('instrumentInfo'),
    image: document.getElementById('instrumentImage'),
    soundBtn: document.getElementById('playInstrumentSound'),
    feedback: document.getElementById('feedback'),
    correct: document.getElementById('correctCount'),
    missed: document.getElementById('missedCount'),
    streak: document.getElementById('streakCount'),
    highscore: document.getElementById('highScore'),
    buttons: Array.from(document.querySelectorAll('.family-btn')),
    next: document.getElementById('nextInstrument'),
  };

  const modal = document.getElementById('instrumentModal');
  const modalImage = document.getElementById('instrumentModalImage');
  const modalLabel = document.getElementById('instrumentModalLabel');
  const modalClosers = modal ? Array.from(modal.querySelectorAll('[data-image-close]')) : [];
  const audioPlayer = new Audio();
  audioPlayer.preload = 'auto';
  function stopAudio() {
    try {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
    } catch (_) {}
  }

  function getLang() {
    return (window.i18n && typeof window.i18n.getLang === 'function')
      ? window.i18n.getLang()
      : 'es';
  }

  function translate(obj) {
    if (!obj) return '';
    const lang = getLang();
    return obj[lang] || obj.es || '';
  }

  function normalizeLabel(text) {
    return String(text || '').replace(/&/g, '&amp;');
  }

  function buildInstrumentImage(label, color) {
    const text = normalizeLabel(label).split(' ').slice(0, 2).join(' ');
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 160">
        <rect x="8" y="8" width="164" height="144" rx="20" ry="20" fill="${color}" opacity="0.12"/>
        <path d="M36 120 Q60 30 124 30 L144 68 Q112 66 110 110 Z" fill="${color}" opacity="0.3"/>
        <circle cx="110" cy="90" r="40" fill="${color}" opacity="0.6"/>
        <text x="90" y="95" font-size="18" text-anchor="middle" fill="#0f172a" font-weight="700">${text}</text>
      </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  function shuffle() {
    sequence = instruments.slice();
    for (let i = sequence.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
    }
  }

  function pickInstrument() {
    if (!sequence.length) shuffle();
    currentInstrument = sequence.pop();
    renderInstrument();
  }

  function renderInstrument() {
    if (!currentInstrument) return;
    stopAudio();
    resetButtons();
    refs.name.textContent = translate(currentInstrument.name);
    refs.info.textContent = translate(currentInstrument.info);
    refs.feedback.textContent = '';
    if (refs.image) {
      const label = translate(currentInstrument.name);
      if (currentInstrument.imagePath) {
        refs.image.src = currentInstrument.imagePath;
      } else {
        refs.image.src = buildInstrumentImage(label, currentInstrument.imageColor || '#cbd5e1');
      }
      refs.image.alt = label;
      refs.image.onerror = () => {
        refs.image.src = buildInstrumentImage(label, currentInstrument.imageColor || '#cbd5e1');
      };
    }
    if (refs.soundBtn) {
      const hasSound = Boolean(currentInstrument.audioPath);
      refs.soundBtn.disabled = !hasSound;
      if (hasSound) {
        refs.soundBtn.dataset.audio = currentInstrument.audioPath;
      } else {
        delete refs.soundBtn.dataset.audio;
      }
    }
  }

  function setInteraction(enabled) {
    refs.buttons.forEach((btn) => { btn.disabled = !enabled; });
    if (refs.next) refs.next.disabled = !enabled;
    if (refs.soundBtn) {
      const hasSound = Boolean(refs.soundBtn.dataset.audio);
      refs.soundBtn.disabled = !enabled || !hasSound;
    }
  }

  function showGameOver() {
    if (state.over) return;
    state.over = true;
    setInteraction(false);
    if (window.GameOverOverlay && typeof window.GameOverOverlay.show === 'function') {
      window.GameOverOverlay.show({
        gameId: 'instrument-families',
        score: state.bestStreak,
        onRetry: () => {
          resetToStart();
          if (window.GameOverOverlay && typeof window.GameOverOverlay.hide === 'function') {
            window.GameOverOverlay.hide();
          }
        }
      });
    }
  }

  function resetToStart() {
    state.total = 0;
    state.correct = 0;
    state.streak = 0;
    state.lives = 3;
    state.over = false;
    setInteraction(true);
    updateStats();
    pickInstrument();
  }

  function openImageModal(src, label) {
    if (!modal || !modalImage) return;
    modalImage.src = src;
    modalImage.alt = label;
    if (modalLabel) modalLabel.textContent = label;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeImageModal() {
    if (!modal || !modalImage) return;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    modalImage.src = '';
  }

  function updateStats() {
    refs.correct.textContent = state.correct;
    refs.missed.textContent = state.total - state.correct;
    refs.streak.textContent = state.streak;
    refs.highscore.textContent = state.bestStreak;
    const livesEl = document.getElementById('livesCount');
    if (livesEl) livesEl.textContent = state.lives;
  }

  function updateScoreboardHeading() {
    const text = window.i18n && typeof window.i18n.t === 'function'
      ? window.i18n.t('rankings.instrumentfamilies')
      : 'Familias de instrusmentos';
    document.querySelectorAll('[data-scoreboard][data-heading-key="rankings.instrumentfamilies"]').forEach((el) => {
      el.setAttribute('data-heading', text);
    });
  }

  function storeHighScore() {
    if (state.streak > state.bestStreak) {
      state.bestStreak = state.streak;
      localStorage.setItem(STORAGE_KEY, String(state.bestStreak));
    }
  }

  function resetButtons() {
    refs.buttons.forEach((btn) => {
      btn.classList.remove('correct', 'wrong');
      btn.disabled = false;
    });
  }

  function handleSelection(event) {
    const button = event.currentTarget;
    if (!currentInstrument) return;
    const guess = button.dataset.family;
    const correct = guess === currentInstrument.family;
    state.total += 1;
    if (correct) {
      state.correct += 1;
      state.streak += 1;
      button.classList.add('correct');
      refs.feedback.textContent = window.i18n ? window.i18n.t(FEEDBACK_KEYS.correct) : '¡Correcto!';
    } else {
      state.lives -= 1;
      state.streak = 0;
      button.classList.add('wrong');
      refs.feedback.textContent = window.i18n ? window.i18n.t(FEEDBACK_KEYS.wrong) : 'Inténtalo otra vez';
      if (state.lives <= 0) {
        showGameOver();
        return;
      }
    }
    storeHighScore();
    refs.buttons.forEach((btn) => { btn.disabled = true; });
    updateStats();
    setTimeout(() => pickInstrument(), 900);
  }

  function bindEvents() {
    refs.buttons.forEach((btn) => btn.addEventListener('click', handleSelection));
    if (refs.next) {
      refs.next.addEventListener('click', () => {
        state.total += 1;
        state.streak = 0;
        refs.feedback.textContent = '';
        updateStats();
        setTimeout(() => pickInstrument(), 50);
      });
    }
    if (refs.image) {
      refs.image.addEventListener('click', () => {
        if (!currentInstrument) return;
        const label = translate(currentInstrument.name);
        const src = currentInstrument.imagePath || refs.image.src;
        if (src) openImageModal(src, label || 'Instrumento');
      });
    }
    if (refs.soundBtn) {
      refs.soundBtn.addEventListener('click', () => {
        const audioPath = refs.soundBtn.dataset.audio;
        if (audioPath) {
          audioPlayer.src = audioPath;
          audioPlayer.currentTime = 0;
          audioPlayer.play().catch(() => {});
        }
      });
    }
    modalClosers.forEach((el) => el.addEventListener('click', closeImageModal));
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && modal && modal.getAttribute('aria-hidden') === 'false') {
        closeImageModal();
      }
    });
    if (window.i18n && typeof window.i18n.onChange === 'function') {
      window.i18n.onChange(() => {
        renderInstrument();
        updateStats();
        updateScoreboardHeading();
      });
    }

  }

  function init() {
    updateStats();
    bindEvents();
    pickInstrument();
    updateScoreboardHeading();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
