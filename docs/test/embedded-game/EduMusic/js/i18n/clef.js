// Clave de sol activity translations
(function() {
  const payload = {
    es: {
      'clef.title': 'Dibuja la Clave de Sol',
      'clef.instructions': 'Traza con el dedo o el ratón siguiendo los puntos guía para dibujar la clave de sol. Intenta rodear la 2ª línea (la línea de SOL). Pulsa Evaluar para comprobar tu dibujo.',
      'clef.reset': 'Borrar',
      'clef.evaluate': 'Evaluar',
      'clef.show_guides': 'Mostrar guía',
      'clef.result.good': '¡Muy bien! Buena forma de clave de sol.',
      'clef.result.near': 'Casi. Recorre mejor los puntos guía.',
      'clef.result.try': 'Intenta de nuevo siguiendo la guía.'
    },
    val: {
      'clef.title': 'Dibuixa la Clau de Sol',
      'clef.instructions': 'Traça amb el dit o el ratolí seguint els punts guia per a dibuixar la clau de sol. Intenta envoltar la 2a línia (la línia de SOL). Prem Avaluar per a comprovar el teu dibuix.',
      'clef.reset': 'Esborrar',
      'clef.evaluate': 'Avaluar',
      'clef.show_guides': 'Mostrar guia',
      'clef.result.good': 'Molt bé! Bona forma de clau de sol.',
      'clef.result.near': 'Quasi. Recorre millor els punts guia.',
      'clef.result.try': 'Intenta-ho de nou seguint la guia.'
    },
    en: {
      'clef.title': 'Draw the Treble Clef',
      'clef.instructions': 'Trace with your finger or mouse following the guide dots to draw the treble clef. Try to loop around the 2nd line (the G line). Press Evaluate to check your drawing.',
      'clef.reset': 'Clear',
      'clef.evaluate': 'Check',
      'clef.show_guides': 'Show guide',
      'clef.result.good': 'Well done! Nice treble clef shape.',
      'clef.result.near': 'Almost there. Follow the guide dots more closely.',
      'clef.result.try': 'Give it another go following the guide.'
    }
  };
  if (window.i18n && typeof window.i18n.registerBundle === 'function') {
    window.i18n.registerBundle('clef', payload);
  } else {
    window.__i18nPendingBundles = window.__i18nPendingBundles || [];
    window.__i18nPendingBundles.push({ name: 'clef', payload });
  }
})();
