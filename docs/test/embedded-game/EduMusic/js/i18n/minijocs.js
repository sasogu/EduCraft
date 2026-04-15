// Minijocs page translations
(function() {
  const payload = {
    es: {
      'minijocs.title': 'Minijocs EduMúsic',
      'minijocs.intro': 'Elige un minijuego musical, juega y guarda tu puntuación.'
    },
    val: {
      'minijocs.title': 'Minijocs EduMúsic',
      'minijocs.intro': 'Tria un minijoc musical, juga i guarda la teua puntuació.'
    },
    en: {
      'minijocs.title': 'EduMúsic Minigames',
      'minijocs.intro': 'Pick a musical minigame, play, and save your score.'
    }
  };

  if (window.i18n && typeof window.i18n.registerBundle === 'function') {
    window.i18n.registerBundle('minijocs', payload);
  } else {
    window.__i18nPendingBundles = window.__i18nPendingBundles || [];
    window.__i18nPendingBundles.push({ name: 'minijocs', payload });
  }
})();
