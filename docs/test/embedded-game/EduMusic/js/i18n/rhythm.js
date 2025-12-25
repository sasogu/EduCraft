// Rhythm game translations
(function() {
  const payload = {
    es: {
      'rhythm.title': 'Ritmo: TA, SU (y TITI)',
      'rhythm.instructions': 'Identifica patrones rítmicos de una negra (TA) y silencio (SU). A partir de 10 puntos se añade TITI (dos corcheas).',
      'rhythm.play': 'Repetir',
      'rhythm.play_hint': 'Vuelve a escuchar el patrón actual',
      'rhythm.include_titi': 'Incluir TITI',
      'rhythm.level': 'Nivel:',
      'rhythm.level1': 'Nivel 1',
      'rhythm.level2': 'Nivel 2',
      'rhythm.level3': 'Nivel 3'
    },
    val: {
      'rhythm.title': 'Ritme: TA, SU (i TITI)',
      'rhythm.instructions': 'Identifica patrons rítmics d’una negra (TA) i silenci (SU). A partir de 10 punts s’afegeix TITI (dos corxeres).',
      'rhythm.play': 'Repetir',
      'rhythm.play_hint': 'Torna a escoltar el patró actual',
      'rhythm.include_titi': 'Incloure TITI',
      'rhythm.level': 'Nivell:',
      'rhythm.level1': 'Nivell 1',
      'rhythm.level2': 'Nivell 2',
      'rhythm.level3': 'Nivell 3'
    },
    en: {
      'rhythm.title': 'Rhythm: TA, SU (and TITI)',
      'rhythm.instructions': 'Identify rhythmic patterns using a quarter note (TA) and a rest (SU). After 10 points, TITI (two eighth notes) joins the challenges.',
      'rhythm.play': 'Replay',
      'rhythm.play_hint': 'Hear the current pattern again',
      'rhythm.include_titi': 'Include TITI',
      'rhythm.level': 'Level:',
      'rhythm.level1': 'Level 1',
      'rhythm.level2': 'Level 2',
      'rhythm.level3': 'Level 3'
    }
  };
  if (window.i18n && typeof window.i18n.registerBundle === 'function') {
    window.i18n.registerBundle('rhythm', payload);
  } else {
    window.__i18nPendingBundles = window.__i18nPendingBundles || [];
    window.__i18nPendingBundles.push({ name: 'rhythm', payload });
  }
})();
