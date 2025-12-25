(() => {
  const payload = {
    es: {
      'game.instruments.title': 'Familias de instrusmentos',
      'game.instruments.instructions': 'Identifica rápidamente a qué familia pertenece cada instrumento para familiarizarte con la orquesta.',
      'game.instruments.prompt': '¿A qué familia pertenece?',
      'game.instruments.family.cuerdas': 'Cuerdas',
      'game.instruments.family.viento_madera': 'Viento madera',
      'game.instruments.family.viento_metal': 'Viento metal',
      'game.instruments.family.percusion': 'Percusión',
      'game.instruments.ranking_title': 'Ranking de mejor racha',
      'game.instruments.ranking_general': 'General',
      'game.instruments.ranking_weekly': 'Semanal',
      'game.instruments.correct_label': 'Respuestas correctas',
      'game.instruments.missed_label': 'Errores',
      'game.instruments.streak_label': 'Racha',
      'game.instruments.highscore_label': 'Mejor racha',
      'game.instruments.sound_button': 'Escuchar sonido',
      'game.instruments.lives_label': 'Vidas',
      'game.instruments.gameover.title': 'Juego terminado',
      'game.instruments.gameover.message': 'Has perdido todas las vidas. Tu mejor racha ha sido',
      'game.instruments.button.restart': 'Reiniciar juego',
      'game.instruments.button.next': 'Siguiente instrumento',
      'game.instruments.feedback.correct': '¡Perfecto! Sigue así.',
      'game.instruments.feedback.wrong': 'Casi, inténtalo con otro botón.'
    },
    val: {
      'game.instruments.title': 'Famílies instrumentals',
      'game.instruments.instructions': 'Identifica ràpidament a quina família pertany cada instrument per familiaritzar-te amb l’orquestra.',
      'game.instruments.prompt': 'A quina família pertany?',
      'game.instruments.family.cuerdas': 'Cordes',
      'game.instruments.family.viento_madera': 'Vent fusta',
      'game.instruments.family.viento_metal': 'Vent metall',
      'game.instruments.family.percusion': 'Percussió',
      'game.instruments.ranking_title': 'Rànquing de millor ratxa',
      'game.instruments.ranking_general': 'General',
      'game.instruments.ranking_weekly': 'Setmanal',
      'game.instruments.correct_label': 'Respostes correctes',
      'game.instruments.missed_label': 'Errors',
      'game.instruments.streak_label': 'Ratxa',
      'game.instruments.highscore_label': 'Millor ratxa',
      'game.instruments.sound_button': 'Escolta el so',
      'game.instruments.lives_label': 'Vides',
      'game.instruments.gameover.title': 'Joc acabat',
      'game.instruments.gameover.message': 'Has perdut totes les vides. La teua millor ratxa ha estat',
      'game.instruments.button.restart': 'Reiniciar joc',
      'game.instruments.button.next': 'Siguiente instrument',
      'game.instruments.feedback.correct': 'Perfecte! Continua així.',
      'game.instruments.feedback.wrong': 'Quasi, prova un altre botó.'
    },
    en: {
      'game.instruments.title': 'Instrument families',
      'game.instruments.instructions': 'Quickly identify which family each instrument belongs to and learn the orchestra layout.',
      'game.instruments.prompt': 'Which family is this?',
      'game.instruments.family.cuerdas': 'Strings',
      'game.instruments.family.viento_madera': 'Woodwinds',
      'game.instruments.family.viento_metal': 'Brass',
      'game.instruments.family.percusion': 'Percussion',
      'game.instruments.ranking_title': 'Best streak rankings',
      'game.instruments.ranking_general': 'General',
      'game.instruments.ranking_weekly': 'Weekly',
      'game.instruments.correct_label': 'Correct answers',
      'game.instruments.missed_label': 'Missed',
      'game.instruments.streak_label': 'Streak',
      'game.instruments.highscore_label': 'Best streak',
      'game.instruments.sound_button': 'Listen to sound',
      'game.instruments.lives_label': 'Lives',
      'game.instruments.gameover.title': 'Game over',
      'game.instruments.gameover.message': 'You lost all your lives. Your best streak was',
      'game.instruments.button.restart': 'Restart game',
      'game.instruments.button.next': 'Next instrument',
      'game.instruments.feedback.correct': 'Perfect! Keep it up.',
      'game.instruments.feedback.wrong': 'Almost—try another option.'
    }
  };

  if (window.i18n && typeof window.i18n.registerBundle === 'function') {
    window.i18n.registerBundle('instruments', payload);
  } else {
    window.__i18nPendingBundles = window.__i18nPendingBundles || [];
    window.__i18nPendingBundles.push({ name: 'instruments', payload });
  }
})();
