// Offline page translations
(function() {
  const payload = {
    es: {
      'offline.metaTitle': 'EduMúsic — Sin conexión',
      'offline.heading': 'Sin conexión',
      'offline.message': 'Parece que no tienes conexión a la red. Puedes seguir usando las actividades que ya estén almacenadas en la aplicación.',
      'offline.retry': 'Reintentar',
      'offline.hint': 'La aplicación funcionará sin conexión para las páginas y audios guardados.'
    },
    val: {
      'offline.metaTitle': 'EduMúsic — Sense connexió',
      'offline.heading': 'Sense connexió',
      'offline.message': 'Sembla que no tens connexió a la xarxa. Pots continuar utilitzant les activitats que ja estiguen guardades a l\'aplicació.',
      'offline.retry': 'Tornar-ho a provar',
      'offline.hint': 'L\'aplicació funcionarà sense connexió per a les pàgines i àudios emmagatzemats.'
    },
    en: {
      'offline.metaTitle': 'EduMúsic — Offline',
      'offline.heading': 'Offline',
      'offline.message': 'It looks like you are not connected right now. You can keep using the activities that are already stored in the app.',
      'offline.retry': 'Try again',
      'offline.hint': 'The app works offline for pages and audio that have been cached.'
    }
  };

  if (window.i18n && typeof window.i18n.registerBundle === 'function') {
    window.i18n.registerBundle('offline', payload);
  } else {
    window.__i18nPendingBundles = window.__i18nPendingBundles || [];
    window.__i18nPendingBundles.push({ name: 'offline', payload });
  }
})();
