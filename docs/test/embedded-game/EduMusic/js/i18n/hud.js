// Shared HUD/control labels
(function() {
  const payload = {
    es: {
      'hud.points': 'Puntos: {n}',
      'hud.lives': 'Vidas: {n}',
      'hud.start': 'Iniciar',
      'hud.pause': 'Pausa',
      'hud.restart': 'Reiniciar',
      'hud.speed': 'Velocidad:',
      'hud.speed.slow': 'Lento',
      'hud.speed.normal': 'Normal',
      'hud.speed.fast': 'Rápido'
    },
    val: {
      'hud.points': 'Punts: {n}',
      'hud.lives': 'Vides: {n}',
      'hud.start': 'Inicia',
      'hud.pause': 'Pausa',
      'hud.restart': 'Reinicia',
      'hud.speed': 'Velocitat:',
      'hud.speed.slow': 'Lent',
      'hud.speed.normal': 'Normal',
      'hud.speed.fast': 'Ràpid'
    },
    en: {
      'hud.points': 'Points: {n}',
      'hud.lives': 'Lives: {n}',
      'hud.start': 'Start',
      'hud.pause': 'Pause',
      'hud.restart': 'Restart',
      'hud.speed': 'Speed:',
      'hud.speed.slow': 'Slow',
      'hud.speed.normal': 'Normal',
      'hud.speed.fast': 'Fast'
    }
  };
  if (window.i18n && typeof window.i18n.registerBundle === 'function') {
    window.i18n.registerBundle('hud', payload);
  } else {
    window.__i18nPendingBundles = window.__i18nPendingBundles || [];
    window.__i18nPendingBundles.push({ name: 'hud', payload });
  }
})();
