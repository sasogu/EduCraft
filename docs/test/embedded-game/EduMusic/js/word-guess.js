(function() {
  const MAX_MISTAKES = 6;
  const LETTERS = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G',
    'H', 'I', 'J', 'K', 'L', 'M', 'N',
    'Ñ', 'O', 'P', 'Q', 'R', 'S', 'T',
    'U', 'V', 'W', 'X', 'Y', 'Z'
  ];

  const SCOREBOARD_ID = 'wordguess';
  const BASE_ROUND_SCORE = 50;
  const BONUS_PER_ATTEMPT = 10;

  const WORD_BANK = {
    instruments: [
      {
        id: 'piano',
        term: { es: 'PIANO', val: 'PIANO', en: 'PIANO' },
        hint: {
          es: 'Instrumento de teclado con cuerdas percutidas.',
          val: 'Instrument de teclat amb cordes percudides.',
          en: 'Keyboard instrument whose strings are struck by hammers.'
        }
      },
      {
        id: 'viola',
        term: { es: 'VIOLA', val: 'VIOLA', en: 'VIOLA' },
        hint: {
          es: 'Instrumento de cuerda frotada ligeramente mayor que el violín.',
          val: 'Instrument de corda fregada lleugerament més gran que el violí.',
          en: 'Bowed string instrument slightly larger than the violin.'
        }
      },
      {
        id: 'oboe',
        term: { es: 'OBOE', val: 'OBOE', en: 'OBOE' },
        hint: {
          es: 'Instrumento de viento madera con doble lengüeta.',
          val: 'Instrument de vent-fusta amb doble canya.',
          en: 'Woodwind instrument with a double reed.'
        }
      },
      {
        id: 'marimba',
        term: { es: 'MARIMBA', val: 'MARIMBA', en: 'MARIMBA' },
        hint: {
          es: 'Instrumento de placas afinadas que se golpean con mazas.',
          val: 'Instrument de làmines afinades que es colpegen amb baquetes.',
          en: 'Tuned wooden bars struck with mallets.'
        }
      },
      {
        id: 'fagot',
        term: { es: 'FAGOT', val: 'FAGOT', en: 'BASSOON' },
        hint: {
          es: 'Instrumento grave de viento madera de gran longitud.',
          val: 'Instrument greu de vent-fusta de gran llargària.',
          en: 'Low-pitched woodwind instrument with a long body.'
        }
      },
      {
        id: 'arpa',
        term: { es: 'ARPA', val: 'ARPA', en: 'HARP' },
        hint: {
          es: 'Instrumento de cuerdas pulsadas con forma triangular.',
          val: 'Instrument de cordes polsades amb forma triangular.',
          en: 'Plucked string instrument with a triangular frame.'
        }
      },
      {
        id: 'clarinete',
        term: { es: 'CLARINETE', val: 'CLARINET', en: 'CLARINET' },
        hint: {
          es: 'Instrumento de viento madera con boquilla de caña simple.',
          val: 'Instrument de vent-fusta amb boqueta de canya senzilla.',
          en: 'Woodwind instrument with a single-reed mouthpiece.'
        }
      },
      {
        id: 'flauta',
        term: { es: 'FLAUTA', val: 'FLAUTA', en: 'FLUTE' },
        hint: {
          es: 'Instrumento agudo de viento madera que se toca de forma transversal.',
          val: 'Instrument agut de vent-fusta que es toca de manera transversal.',
          en: 'High-pitched woodwind instrument played transversely.'
        }
      },
      {
        id: 'trombon',
        term: { es: 'TROMBON', val: 'TROMBON', en: 'TROMBONE' },
        hint: {
          es: 'Instrumento de metal con vara deslizante.',
          val: 'Instrument de vent-metall amb vara lliscant.',
          en: 'Brass instrument that uses a slide to change pitch.'
        }
      },
      {
        id: 'trompa',
        term: { es: 'TROMPA', val: 'TROMPA', en: 'HORN' },
        hint: {
          es: 'Instrumento de metal de tubo enrollado con campana ancha.',
          val: 'Instrument de metall de tub enrotllat amb campana ampla.',
          en: 'Brass instrument with coiled tubing and a wide bell.'
        }
      },
      {
        id: 'trompeta',
        term: { es: 'TROMPETA', val: 'TROMPETA', en: 'TRUMPET' },
        hint: {
          es: 'Instrumento de metal agudo con pistones y sonido brillante.',
          val: 'Instrument de metall agut amb pistons i so brillant.',
          en: 'High brass instrument with valves and a bright tone.'
        }
      },
      {
        id: 'timbales',
        term: { es: 'TIMBALES', val: 'TIMBALS', en: 'TIMPANI' },
        hint: {
          es: 'Pareja de tambores afinables presentes en la orquesta.',
          val: 'Parell de tambors afinables presents en l\'orquestra.',
          en: 'Pair of tunable kettledrums used in the orchestra.'
        }
      },
      {
        id: 'violin',
        term: { es: 'VIOLIN', val: 'VIOLI', en: 'VIOLIN' },
        hint: {
          es: 'Instrumento de cuerda frotada más agudo de la orquesta.',
          val: 'Instrument de corda fregada més agut de l\'orquestra.',
          en: 'Highest-pitched bowed string instrument in the orchestra.'
        }
      },
      {
        id: 'violonchelo',
        term: { es: 'VIOLONCHELO', val: 'VIOLONCEL', en: 'CELLO' },
        hint: {
          es: 'Cuerda frotada grave que aporta calidez y melodía.',
          val: 'Corda fregada greu que aporta calidesa i melodia.',
          en: 'Low bowed string instrument known for its warm tone.'
        }
      },
      {
        id: 'contrabajo',
        term: { es: 'CONTRABAJO', val: 'CONTRABAIX', en: 'DOUBLEBASS' },
        hint: {
          es: 'Instrumento de cuerda frotada más grave de la orquesta.',
          val: 'Instrument de corda fregada més greu de l\'orquestra.',
          en: 'Lowest-pitched bowed string instrument in the orchestra.'
        }
      },
      {
        id: 'tuba',
        term: { es: 'TUBA', val: 'TUBA', en: 'TUBA' },
        hint: {
          es: 'Instrumento de metal más grave, base del viento metal.',
          val: 'Instrument de metall més greu, base del vent metall.',
          en: 'Lowest brass instrument providing the brass foundation.'
        }
      },
      {
        id: 'caja',
        term: { es: 'CAJA', val: 'CAIXA', en: 'SNAREDRUM' },
        hint: {
          es: 'Tambor de parche doble con bordonera metálica vibrante.',
          val: 'Tambor de doble pedaç amb bordonera metàl·lica vibrant.',
          en: 'Double-headed drum with a vibrating metal snare.'
        }
      },
      {
        id: 'bombo',
        term: { es: 'BOMBO', val: 'BOMBO', en: 'BASSDRUM' },
        hint: {
          es: 'Tambor de gran tamaño que marca golpes profundos.',
          val: 'Tambor de gran mida que marca colps profunds.',
          en: 'Large drum that provides deep, resonant beats.'
        }
      },
      {
        id: 'platillos',
        term: { es: 'PLATILLOS', val: 'PLATETS', en: 'CYMBALS' },
        hint: {
          es: 'Discos metálicos que producen un choque brillante.',
          val: 'Discos metàl·lics que produeixen un xoc brillant.',
          en: 'Metal discs that create a bright crashing sound.'
        }
      },
      {
        id: 'triangulo',
        term: { es: 'TRIANGULO', val: 'TRIANGLE', en: 'TRIANGLE' },
        hint: {
          es: 'Barra metálica doblada que suena con un golpe claro.',
          val: 'Barra metàl·lica corbada que sona amb un colp clar.',
          en: 'Bent metal bar that rings with a clear strike.'
        }
      }
    ],
    signs: [
      {
        id: 'pentagrama',
        term: { es: 'PENTAGRAMA', val: 'PENTAGRAMA', en: 'STAFF' },
        hint: {
          es: 'Conjunto de cinco líneas y cuatro espacios para escribir música.',
          val: 'Conjunt de cinc línies i quatre espais per a escriure música.',
          en: 'Set of five lines and four spaces used to write music.'
        }
      },
      {
        id: 'sostenido',
        term: { es: 'SOSTENIDO', val: 'SOSTINGUT', en: 'SHARP' },
        hint: {
          es: 'Signo que eleva medio tono a la nota.',
          val: 'Signe que eleva mig to a la nota.',
          en: 'Symbol that raises a note by a semitone.'
        }
      },
      {
        id: 'bemol',
        term: { es: 'BEMOL', val: 'BEMOLL', en: 'FLAT' },
        hint: {
          es: 'Signo que baja medio tono a la nota.',
          val: 'Signe que baixa mig to a la nota.',
          en: 'Symbol that lowers a note by a semitone.'
        }
      },
      {
        id: 'compas',
        term: { es: 'COMPAS', val: 'COMPAS', en: 'TIME SIGNATURE' },
        hint: {
          es: 'Unidad que agrupa pulsos con un número superior e inferior.',
          val: 'Unitat que agrupa pulsacions amb un numerador i un denominador.',
          en: 'Unit that groups beats, shown with a top and bottom number.'
        }
      },
      {
        id: 'calderon',
        term: { es: 'CALDERON', val: 'CALDERON', en: 'FERMATA' },
        hint: {
          es: 'Signo que indica prolongar una nota más de su valor.',
          val: 'Signe que indica perllongar una nota més del seu valor.',
          en: 'Sign that indicates holding a note beyond its value.'
        }
      },
      {
        id: 'ligadura',
        term: { es: 'LIGADURA', val: 'LLIGADURA', en: 'TIE' },
        hint: {
          es: 'Une dos notas iguales para sumar su duración.',
          val: 'Une dues notes iguals per a sumar la seua duració.',
          en: 'Connects two equal notes to add their durations.'
        }
      },
      {
        id: 'silencio',
        term: { es: 'SILENCIO', val: 'SILENCI', en: 'REST' },
        hint: {
          es: 'Símbolo que representa ausencia de sonido.',
          val: 'Símbol que representa absència de so.',
          en: 'Symbol that represents silence.'
        }
      },
      {
        id: 'dinamica',
        term: { es: 'DINAMICA', val: 'DINAMICA', en: 'DYNAMICS' },
        hint: {
          es: 'Indicaciones de intensidad como forte o piano.',
          val: 'Indicacions d\'intensitat com forte o piano.',
          en: 'Indications of loudness such as forte or piano.'
        }
      },
      {
        id: 'crescendo',
        term: { es: 'CRESCENDO', val: 'CRESCENDO', en: 'CRESCENDO' },
        hint: {
          es: 'Indica aumentar progresivamente el volumen.',
          val: 'Indica augmentar progressivament el volum.',
          en: 'Indicates gradually increasing the volume.'
        }
      }
    ],
    language: [
      {
        id: 'arpegio',
        term: { es: 'ARPEGIO', val: 'ARPEGI', en: 'ARPEGGIO' },
        hint: {
          es: 'Acorde cuyas notas suenan de forma sucesiva.',
          val: 'Acord les notes del qual sonen de manera successiva.',
          en: 'Chord whose notes sound one after another.'
        }
      },
      {
        id: 'escala',
        term: { es: 'ESCALA', val: 'ESCALA', en: 'SCALE' },
        hint: {
          es: 'Sucesión ordenada de notas que define una tonalidad.',
          val: 'Successió ordenada de notes que defineix una tonalitat.',
          en: 'Ordered sequence of notes that defines a key.'
        }
      },
      {
        id: 'intervalo',
        term: { es: 'INTERVALO', val: 'INTERVAL', en: 'INTERVAL' },
        hint: {
          es: 'Distancia entre dos sonidos.',
          val: 'Distància entre dos sons.',
          en: 'Distance between two sounds.'
        }
      },
      {
        id: 'tonalidad',
        term: { es: 'TONALIDAD', val: 'TONALITAT', en: 'TONALITY' },
        hint: {
          es: 'Centro sonoro que organiza una escala.',
          val: 'Centre sonor que organitza una escala.',
          en: 'Sound center that organizes a scale.'
        }
      },
      {
        id: 'polirritmo',
        term: { es: 'POLIRRITMO', val: 'POLIRRITME', en: 'POLYRHYTHM' },
        hint: {
          es: 'Superposición de patrones rítmicos diferentes.',
          val: 'Superposició de patrons rítmics diferents.',
          en: 'Overlap of different rhythmic patterns.'
        }
      },
      {
        id: 'sincopa',
        term: { es: 'SINCOPA', val: 'SINCOPA', en: 'SYNCOPATION' },
        hint: {
          es: 'Desplazamiento del acento hacia tiempos débiles.',
          val: 'Desplaçament de l\'accent cap als temps febles.',
          en: 'Shift of the accent onto weak beats.'
        }
      },
      {
        id: 'armadura',
        term: { es: 'ARMADURA', val: 'ARMADURA', en: 'KEY SIGNATURE' },
        hint: {
          es: 'Conjunto de sostenidos o bemoles al inicio del pentagrama.',
          val: 'Conjunt de sostinguts o bemolls a l\'inici del pentagrama.',
          en: 'Set of sharps or flats placed at the start of the staff.'
        }
      },
      {
        id: 'cromatica',
        term: { es: 'CROMATICA', val: 'CROMATICA', en: 'CHROMATIC' },
        hint: {
          es: 'Escala que avanza por semitonos.',
          val: 'Escala que avança per semitons.',
          en: 'Scale that moves by semitones.'
        }
      },
      {
        id: 'modulacion',
        term: { es: 'MODULACION', val: 'MODULACIO', en: 'MODULATION' },
        hint: {
          es: 'Cambio de tonalidad dentro de una pieza.',
          val: 'Canvi de tonalitat dins d\'una peça.',
          en: 'Change of key within a piece.'
        }
      }
    ]
  };

  const pools = {
    mix: [],
    instruments: [],
    signs: [],
    language: []
  };

  const state = {
    entry: null,
    term: '',
    hint: '',
    mistakes: 0,
    usedLetters: new Set(),
    active: false,
    solved: 0,
    sessionScore: 0,
    messageKey: null,
    messageParams: null,
    messageType: null,
    status: 'idle'
  };

  const elements = {};
  const keyboardButtons = new Map();

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

  function showScoreboardPrompt(score) {
    const finalScore = Number(score) || 0;
    if (finalScore <= 0) return;
    if (window.GameOverOverlay && typeof window.GameOverOverlay.show === 'function') {
      window.GameOverOverlay.show({
        gameId: SCOREBOARD_ID,
        score: finalScore,
        onRetry: () => startRound(),
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

  function t(key, params) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key, params);
    }
    return key;
  }

  function getLang() {
    if (window.i18n && typeof window.i18n.getLang === 'function') {
      return window.i18n.getLang();
    }
    return 'es';
  }

  function flattenBank() {
    return Object.keys(WORD_BANK)
      .map((key) => WORD_BANK[key])
      .flat();
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function ensurePool(category) {
    if (category === 'mix') {
      if (!pools.mix.length) {
        pools.mix = shuffle(flattenBank().slice());
      }
      return pools.mix;
    }
    const source = WORD_BANK[category];
    if (!source) return [];
    if (!pools[category].length) {
      pools[category] = shuffle(source.slice());
    }
    return pools[category];
  }

  function drawWord(category) {
    const pool = ensurePool(category);
    if (!pool.length) return null;
    return pool.pop();
  }

  function createKeyboard() {
    elements.keyboard.innerHTML = '';
    keyboardButtons.clear();
    LETTERS.forEach((letter) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = letter;
      button.disabled = true;
      button.addEventListener('click', () => handleGuess(letter));
      keyboardButtons.set(letter, button);
      elements.keyboard.appendChild(button);
    });
  }

  function resetKeyboard() {
    keyboardButtons.forEach((button) => {
      button.disabled = false;
      button.classList.remove('correct', 'wrong');
    });
  }

  function updateLocalizedEntry(resetLetters) {
    if (!state.entry) {
      state.term = '';
      state.hint = '';
      updateWordDisplay();
      return;
    }
    const lang = getLang();
    const term = state.entry.term[lang] || state.entry.term.es || '';
    const hint = state.entry.hint[lang] || state.entry.hint.es || '';
    if (resetLetters) {
      state.usedLetters = new Set();
    }
    state.term = term.toUpperCase();
    state.hint = hint;
    if (elements.hintText) {
      elements.hintText.textContent = state.hint;
    }
    updateWordDisplay();
    if (state.messageKey === 'wordguess.feedback.fail') {
      state.messageParams = { word: state.term };
    }
  }

  function updateWordDisplay() {
    if (!elements.word) return;
    elements.word.innerHTML = '';
    if (!state.term) {
      const span = document.createElement('span');
      span.textContent = '_';
      elements.word.appendChild(span);
      return;
    }
    state.term.split('').forEach((char) => {
      const span = document.createElement('span');
      if (state.usedLetters.has(char)) {
        span.textContent = char;
        span.classList.add('revealed');
      } else {
        span.textContent = '_';
      }
      elements.word.appendChild(span);
    });
  }

  function renderProgress() {
    if (!elements.progress) return;
    elements.progress.innerHTML = '';
    for (let i = 0; i < MAX_MISTAKES; i++) {
      const span = document.createElement('span');
      if (i < state.mistakes) {
        span.textContent = '♭';
        span.classList.add('filled');
      } else {
        span.textContent = '♩';
      }
      elements.progress.appendChild(span);
    }
  }

  function updateAttempts() {
    if (!elements.attempts) return;
    const remaining = Math.max(0, MAX_MISTAKES - state.mistakes);
    elements.attempts.textContent = String(remaining);
  }

  function isWordSolved() {
    if (!state.term) return false;
    return state.term.split('').every((char) => state.usedLetters.has(char));
  }

  function setMessage(key, type, params) {
    state.messageKey = key;
    state.messageParams = params || null;
    state.messageType = type || null;

    if (!elements.message) return;
    elements.message.textContent = key ? t(key, params) : '';
    elements.message.classList.remove('success', 'fail');
    if (type) elements.message.classList.add(type);
  }

  function refreshMessage() {
    setMessage(state.messageKey, state.messageType, state.messageParams);
  }

  function startRound() {
    if (state.status === 'lost' || state.status === 'idle') {
      state.sessionScore = 0;
    }
    hideScoreboardPrompt();
    const category = elements.category.value || 'mix';
    const entry = drawWord(category);
    if (!entry) {
      state.active = false;
      state.status = 'idle';
      setMessage('wordguess.feedback.empty', 'fail');
      elements.hintBtn.disabled = true;
      keyboardButtons.forEach((button) => { button.disabled = true; });
      return;
    }

    state.entry = entry;
    state.mistakes = 0;
    state.active = true;
    state.status = 'playing';

    resetKeyboard();
    updateLocalizedEntry(true);

    renderProgress();
    updateAttempts();
    elements.hintText.hidden = true;
    elements.hintBtn.disabled = false;

    setMessage('wordguess.feedback.new', null);
  }

  function handleGuess(rawLetter) {
    if (!state.active || !state.term) return;
    const letter = rawLetter.toUpperCase();
    if (state.usedLetters.has(letter)) return;

    state.usedLetters.add(letter);
    const button = keyboardButtons.get(letter);
    if (button) button.disabled = true;

    if (state.term.includes(letter)) {
      if (button) button.classList.add('correct');
      updateWordDisplay();
      if (isWordSolved()) {
        playSuccess();
        endRound(true);
      }
    } else {
      state.mistakes += 1;
      if (button) button.classList.add('wrong');
      playError();
      renderProgress();
      updateAttempts();
      if (state.mistakes >= MAX_MISTAKES) {
        endRound(false);
      } else {
        const remaining = MAX_MISTAKES - state.mistakes;
        setMessage('wordguess.feedback.retry', null, { remaining });
      }
    }
  }

  function endRound(win) {
    state.active = false;
    keyboardButtons.forEach((button) => { button.disabled = true; });
    elements.hintBtn.disabled = true;

    if (win) {
      state.status = 'won';
      state.solved += 1;
      elements.solved.textContent = String(state.solved);
      const remaining = Math.max(0, MAX_MISTAKES - state.mistakes);
      const roundScore = BASE_ROUND_SCORE + (remaining * BONUS_PER_ATTEMPT);
      state.sessionScore += roundScore;
      hideScoreboardPrompt();
      setMessage('wordguess.feedback.win', 'success', {
        round: roundScore,
        total: state.sessionScore
      });
    } else {
      state.status = 'lost';
      state.term.split('').forEach((char) => state.usedLetters.add(char));
      updateWordDisplay();
      const finalScore = state.sessionScore;
      setMessage('wordguess.feedback.fail', 'fail', {
        word: state.term,
        score: finalScore
      });
      if (finalScore > 0) showScoreboardPrompt(finalScore);
      else hideScoreboardPrompt();
    }
  }

  function onHint() {
    if (!state.term) return;
    elements.hintText.hidden = false;
    elements.hintBtn.disabled = true;
    elements.hintText.textContent = state.hint;
  }

  function handleKeydown(event) {
    if (!state.active) return;
    const letter = (event.key || '').toUpperCase();
    if (!keyboardButtons.has(letter)) return;
    event.preventDefault();
    handleGuess(letter);
  }

  function onLanguageChange() {
    updateLocalizedEntry(false);
    if (state.status === 'lost') {
      state.messageParams = {
        word: state.term,
        score: state.sessionScore
      };
    } else if (state.status === 'won' && state.messageParams && typeof state.messageParams.round === 'number') {
      state.messageParams = {
        round: state.messageParams.round,
        total: state.sessionScore
      };
    }
    refreshMessage();
  }

  function setupElements() {
    elements.category = document.getElementById('wordguessCategory');
    elements.start = document.getElementById('wordguessStart');
    elements.hintBtn = document.getElementById('wordguessHint');
    elements.word = document.getElementById('wordguessWord');
    elements.message = document.getElementById('wordguessMessage');
    elements.progress = document.getElementById('wordguessProgress');
    elements.attempts = document.getElementById('wordguessAttempts');
    elements.solved = document.getElementById('wordguessSolved');
    elements.hintText = document.getElementById('wordguessHintText');
    elements.keyboard = document.getElementById('wordguessKeyboard');
  }

  function init() {
    setupElements();
    if (
      !elements.start || !elements.keyboard || !elements.word || !elements.message ||
      !elements.progress || !elements.attempts || !elements.hintText ||
      !elements.hintBtn || !elements.category || !elements.solved
    ) {
      return;
    }

    createKeyboard();
    renderProgress();
    updateWordDisplay();
    updateAttempts();

    elements.start.addEventListener('click', startRound);
    elements.hintBtn.addEventListener('click', onHint);
    document.addEventListener('keydown', handleKeydown);

    if (window.i18n && typeof window.i18n.onChange === 'function') {
      window.i18n.onChange(onLanguageChange);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
