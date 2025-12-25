(function() {
  const payload = {
    es: {
      'wordguess.title': 'Palabras Musicales Secretas',
      'wordguess.subtitle': 'Descubre términos de instrumentos, signos y lenguaje musical antes de agotar tus intentos.',
      'wordguess.category.label': 'Colección:',
      'wordguess.category.mix': 'Mezcla musical',
      'wordguess.category.instruments': 'Instrumentos',
      'wordguess.category.signs': 'Signos musicales',
      'wordguess.category.language': 'Lenguaje musical',
      'wordguess.actions.start': 'Nueva palabra',
      'wordguess.actions.hint': 'Pedir pista',
      'wordguess.status.remaining': 'Intentos disponibles:',
      'wordguess.status.completed': 'Palabras resueltas:',
      'wordguess.board.title': 'Elige una letra',
      'wordguess.helper.keyboard': 'También puedes jugar con tu teclado.',
      'wordguess.feedback.empty': 'No quedan palabras en esta categoría. ¡Prueba otra!',
      'wordguess.feedback.new': 'Elige letras para adivinar la palabra musical.',
      'wordguess.feedback.retry': 'Sigue probando, aún te quedan intentos ({remaining}).',
      'wordguess.feedback.win': '¡Lo lograste! Sumaste {round} puntos. Total: {total}.',
      'wordguess.feedback.fail': 'Se agotaron los intentos. La palabra era {word}. Puntos finales: {score}.',
      'wordguess.rank.title': 'Ranking de Palabras Musicales'
    },
    val: {
      'wordguess.title': 'Paraules Musicals Secretes',
      'wordguess.subtitle': 'Descobreix termes d\'instruments, signes i llenguatge musical abans d\'esgotar els intents.',
      'wordguess.category.label': 'Col·lecció:',
      'wordguess.category.mix': 'Barreja musical',
      'wordguess.category.instruments': 'Instruments',
      'wordguess.category.signs': 'Signes musicals',
      'wordguess.category.language': 'Llenguatge musical',
      'wordguess.actions.start': 'Nova paraula',
      'wordguess.actions.hint': 'Demanar pista',
      'wordguess.status.remaining': 'Intents disponibles:',
      'wordguess.status.completed': 'Paraules resoltes:',
      'wordguess.board.title': 'Tria una lletra',
      'wordguess.helper.keyboard': 'També pots jugar amb el teclat.',
      'wordguess.feedback.empty': 'No queden paraules en esta categoria. Prova una altra!',
      'wordguess.feedback.new': 'Tria lletres per a endevinar la paraula musical.',
      'wordguess.feedback.retry': 'Continua provant, encara et queden intents ({remaining}).',
      'wordguess.feedback.win': 'Ho has aconseguit! Has sumat {round} punts. Total: {total}.',
      'wordguess.feedback.fail': 'S\'han esgotat els intents. La paraula era {word}. Punts finals: {score}.',
      'wordguess.rank.title': 'Rànquing de Paraules Musicals'
    },
    en: {
      'wordguess.title': 'Secret Musical Words',
      'wordguess.subtitle': 'Guess terms about instruments, notation and music language before you run out of attempts.',
      'wordguess.category.label': 'Collection:',
      'wordguess.category.mix': 'Musical mix',
      'wordguess.category.instruments': 'Instruments',
      'wordguess.category.signs': 'Musical symbols',
      'wordguess.category.language': 'Music language',
      'wordguess.actions.start': 'New word',
      'wordguess.actions.hint': 'Ask for a hint',
      'wordguess.status.remaining': 'Attempts remaining:',
      'wordguess.status.completed': 'Words solved:',
      'wordguess.board.title': 'Pick a letter',
      'wordguess.helper.keyboard': 'You can also play with your keyboard.',
      'wordguess.feedback.empty': 'No words left in this category. Try another one!',
      'wordguess.feedback.new': 'Choose letters to guess the musical word.',
      'wordguess.feedback.retry': 'Keep going, you still have attempts ({remaining}).',
      'wordguess.feedback.win': 'Nice! You earned {round} points. Total: {total}.',
      'wordguess.feedback.fail': 'No attempts left. The word was {word}. Final score: {score}.',
      'wordguess.rank.title': 'Musical Words Leaderboard'
    }
  };

  if (window.i18n && typeof window.i18n.registerBundle === 'function') {
    window.i18n.registerBundle('wordguess', payload);
  } else {
    window.__i18nPendingBundles = window.__i18nPendingBundles || [];
    window.__i18nPendingBundles.push({ name: 'wordguess', payload });
  }
})();
