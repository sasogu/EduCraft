// Resources page translations
(function() {
  const payload = {
    es: {
      'resources.title': 'Recursos de Juegos Musicales',
      'resources.intro': 'Una pequeña selección de páginas con actividades, juegos y materiales musicales interactivos para seguir practicando.',
      'resources.aprendo.title': 'Aprendomusica.com',
      'resources.aprendo.desc': 'Plataforma con juegos de lenguaje musical, dictados, lecturas rítmicas y recursos para aula.',
      'resources.aprendo.meta': 'Gratuito',
      'resources.edutictac.title': 'EduTicTac',
      'resources.edutictac.desc': 'Recursos y actividades interactivas para la enseñanza musical en primaria.',
      'resources.edutictac.meta': 'Gratuito',
      'resources.musictech.title': 'Music Tech Teacher',
      'resources.musictech.desc': 'Cuestionarios y juegos en línea sobre teoría, ritmos, instrumentos y lectura de notas.',
      'resources.musictech.meta': 'Idioma: Inglés · Recomendado a partir de 8 años',
      'resources.classics.title': 'Classics for Kids',
      'resources.classics.desc': 'Juegos sobre compositores, estilos y escucha activa con un enfoque lúdico.',
      'resources.classics.meta': 'Idioma: Inglés · Actividades guiadas',
      'resources.teoria.title': 'Teoría.com',
      'resources.teoria.desc': 'Ejercicios interactivos de teoría musical, dictados y lectura a primera vista.',
      'resources.teoria.meta': 'Idioma: Español · Registro opcional'
    },
    val: {
      'resources.title': 'Recursos de Jocs Musicals',
      'resources.intro': 'Una xicoteta selecció de pàgines amb activitats, jocs i materials musicals interactius per a continuar practicant.',
      'resources.aprendo.title': 'Aprendomusica.com',
      'resources.aprendo.desc': 'Plataforma amb jocs de llenguatge musical, dictats, lectures rítmiques i recursos per a l\'aula.',
      'resources.aprendo.meta': 'Gratuït',
      'resources.edutictac.title': 'EduTicTac',
      'resources.edutictac.desc': 'Recursos i activitats interactives per a l\'ensenyament musical en primària.',
      'resources.edutictac.meta': 'Gratuït',
      'resources.musictech.title': 'Music Tech Teacher',
      'resources.musictech.desc': 'Qüestionaris i jocs en línia sobre teoria, ritmes, instruments i lectura de notes.',
      'resources.musictech.meta': 'Idioma: Anglés · Recomanat a partir de 8 anys',
      'resources.classics.title': 'Classics for Kids',
      'resources.classics.desc': 'Jocs sobre compositors, estils i escolta activa amb un enfocament lúdic.',
      'resources.classics.meta': 'Idioma: Anglés · Activitats guiades',
      'resources.teoria.title': 'Teoria.com',
      'resources.teoria.desc': 'Exercicis interactius de teoria musical, dictats i lectura a primera vista.',
      'resources.teoria.meta': 'Idioma: Castellà · Registre opcional'
    },
    en: {
      'resources.title': 'Musical Game Resources',
      'resources.intro': 'A small selection of sites with interactive music games, activities and materials to keep practising.',
      'resources.aprendo.title': 'Aprendomusica.com',
      'resources.aprendo.desc': 'Platform featuring music theory games, dictations, rhythm reading and classroom resources.',
      'resources.aprendo.meta': 'Free',
      'resources.edutictac.title': 'EduTicTac',
      'resources.edutictac.desc': 'Interactive resources and activities for teaching music in primary education.',
      'resources.edutictac.meta': 'Free',
      'resources.musictech.title': 'Music Tech Teacher',
      'resources.musictech.desc': 'Online quizzes and games about theory, rhythms, instruments and note reading.',
      'resources.musictech.meta': 'Language: English · Recommended from age 8',
      'resources.classics.title': 'Classics for Kids',
      'resources.classics.desc': 'Games about composers, styles and active listening with a playful approach.',
      'resources.classics.meta': 'Language: English · Guided activities',
      'resources.teoria.title': 'Teoria.com',
      'resources.teoria.desc': 'Interactive exercises in music theory, dictation and sight reading.',
      'resources.teoria.meta': 'Language: Spanish · Optional sign-up'
    }
  };

  if (window.i18n && typeof window.i18n.registerBundle === 'function') {
    window.i18n.registerBundle('resources', payload);
  } else {
    window.__i18nPendingBundles = window.__i18nPendingBundles || [];
    window.__i18nPendingBundles.push({ name: 'resources', payload });
  }
})();
