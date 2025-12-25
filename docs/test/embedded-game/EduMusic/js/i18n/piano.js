// Piano page translations
(function() {
  const payload = {
    es: {
      'piano.title': 'Teclado y Partituras',
      'piano.intro': 'Selecciona una partitura y acompáñala con el teclado. El rango se adapta a tu dispositivo.',
      'piano.selector.label': 'Elige una partitura:',
      'piano.selector.none': 'Selecciona una partitura',
      'piano.scores.enriqueta': 'En la tienda de Enriqueta',
      'piano.scores.frerejacques': 'Frère Jacques',
      'piano.scores.bellaciao': 'Bella Ciao',
      'piano.scores.carabu': 'Carabú',
      'piano.score.hint': 'Si la partitura tarda en aparecer, comprueba tu conexión.',
      'piano.score.loading': 'Cargando partitura…',
      'piano.score.caption': 'Mostrando: {title}',
      'piano.score.error': 'No se pudo cargar la partitura seleccionada.',
      'piano.score.alt': 'Partitura: {title}',
      'piano.keyboard.title': 'Teclado interactivo',
      'piano.keyboard.help': 'Pulsa o toca las teclas del piano para practicar. También puedes usar tu teclado del ordenador.',
      'piano.keyboard.last': 'Última nota:',
      'piano.keyboard.none': '—',
      'piano.keyboard.trigger': 'Tecla {key}'
    },
    val: {
      'piano.title': 'Teclat i Partitures',
      'piano.intro': 'Selecciona una partitura i acompanya-la amb el teclat. El rang s’adapta al teu dispositiu.',
      'piano.selector.label': 'Tria una partitura:',
      'piano.selector.none': 'Selecciona una partitura',
      'piano.scores.enriqueta': "En la tienda de Enriqueta",
      'piano.scores.frerejacques': "Frère Jacques",
      'piano.scores.bellaciao': 'Bella Ciao',
      'piano.scores.carabu': 'Carabú',
      'piano.score.hint': 'Si la partitura tarda a aparéixer, comprova la connexió.',
      'piano.score.loading': 'Carregant partitura…',
      'piano.score.caption': 'Mostrant: {title}',
      'piano.score.error': 'No s’ha pogut carregar la partitura seleccionada.',
      'piano.score.alt': 'Partitura: {title}',
      'piano.keyboard.title': 'Teclat interactiu',
      'piano.keyboard.help': 'Prem o toca les tecles del teclat per a practicar. També pots usar el teclat de l’ordinador.',
      'piano.keyboard.last': 'Última nota:',
      'piano.keyboard.none': '—',
      'piano.keyboard.trigger': 'Tecla {key}'
    },
    en: {
      'piano.title': 'Keyboard and Scores',
      'piano.intro': 'Pick a score and play along on the keyboard. The range adapts to your device.',
      'piano.selector.label': 'Choose a score:',
      'piano.selector.none': 'Select a score',
      'piano.scores.enriqueta': 'Enriqueta’s Shop',
      'piano.scores.frerejacques': 'Frère Jacques',
      'piano.scores.bellaciao': 'Bella Ciao',
      'piano.scores.carabu': 'Carabú',
      'piano.score.hint': 'If the score takes a moment to appear, check your connection.',
      'piano.score.loading': 'Loading score…',
      'piano.score.caption': 'Showing: {title}',
      'piano.score.error': 'The selected score could not be loaded.',
      'piano.score.alt': 'Score: {title}',
      'piano.keyboard.title': 'Interactive keyboard',
      'piano.keyboard.help': 'Tap or click the keys to practise. You can also use your computer keyboard.',
      'piano.keyboard.last': 'Last note:',
      'piano.keyboard.none': '—',
      'piano.keyboard.trigger': 'Key {key}'
    }
  };

  if (window.i18n && typeof window.i18n.registerBundle === 'function') {
    window.i18n.registerBundle('piano', payload);
  } else {
    window.__i18nPendingBundles = window.__i18nPendingBundles || [];
    window.__i18nPendingBundles.push({ name: 'piano', payload });
  }
})();
