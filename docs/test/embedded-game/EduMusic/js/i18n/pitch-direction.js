(function() {
  const payload = {
    es: {
      'pitchdir.title': 'Dirección del sonido',
      'pitchdir.subtitle': 'Escucha dos sonidos y elige si el segundo sube, baja o se mantiene.',
      'pitchdir.stats.attempts': 'Intentos: {n}',
      'pitchdir.stats.correct': 'Aciertos: {n}',
      'pitchdir.stats.lives': 'Vidas: {n}',
      'pitchdir.stats.streak': 'Racha: {n}',
      'pitchdir.controls.start': 'Iniciar',
      'pitchdir.controls.playing': 'Reproduciendo…',
      'pitchdir.controls.reset': 'Reiniciar partida',
      'pitchdir.option.up': 'Sube ⤴',
      'pitchdir.option.same': 'Igual ↔',
      'pitchdir.option.down': 'Baja ⤵',
      'pitchdir.feedback.prompt': 'Escucha la secuencia y elige si sube, baja o se mantiene.',
      'pitchdir.feedback.ready': 'Nuevo reto listo. Pulsa “Iniciar”.',
      'pitchdir.feedback.ready.multi': 'Nivel avanzado: escucharás dos secuencias seguidas. Responde a ambas.',
      'pitchdir.feedback.correct.up': '¡Correcto! El sonido sube.',
      'pitchdir.feedback.correct.down': '¡Correcto! El sonido baja.',
      'pitchdir.feedback.correct.same': '¡Correcto! El sonido se mantiene.',
      'pitchdir.feedback.retry': 'Intenta de nuevo: escucha con atención.',
      'pitchdir.feedback.partial': '¡Bien! Ahora responde a la segunda secuencia.',
      'pitchdir.feedback.locked': 'Reproduciendo… espera a que termine.',
      'pitchdir.feedback.gameover': 'Partida finalizada. Pulsa “Reiniciar partida” para intentarlo de nuevo.',
      'pitchdir.modal.title': 'Doble secuencia',
      'pitchdir.modal.body': 'Has avanzado de nivel. Ahora escucharás dos secuencias seguidas: responde después de cada una.',
      'pitchdir.modal.close': '¡Entendido!'
    },
    val: {
      'pitchdir.title': 'Direcció del so',
      'pitchdir.subtitle': 'Escolta dos sons i tria si el segon puja, baixa o es manté.',
      'pitchdir.stats.attempts': 'Intents: {n}',
      'pitchdir.stats.correct': 'Encerts: {n}',
      'pitchdir.stats.lives': 'Vides: {n}',
      'pitchdir.stats.streak': 'Ratxa: {n}',
      'pitchdir.controls.start': 'Inicia',
      'pitchdir.controls.playing': 'Reproduint…',
      'pitchdir.controls.reset': 'Reinicia partida',
      'pitchdir.option.up': 'Puja ⤴',
      'pitchdir.option.same': 'Igual ↔',
      'pitchdir.option.down': 'Baixa ⤵',
      'pitchdir.feedback.prompt': 'Escolta la seqüència i tria si puja, baixa o es manté.',
      'pitchdir.feedback.ready': 'Repte llest. Prem “Inicia”.',
      'pitchdir.feedback.ready.multi': 'Nivell avançat: escoltaràs dos seqüències seguides. Respon totes dues.',
      'pitchdir.feedback.correct.up': 'Correcte! El so puja.',
      'pitchdir.feedback.correct.down': 'Correcte! El so baixa.',
      'pitchdir.feedback.correct.same': 'Correcte! El so es manté.',
      'pitchdir.feedback.retry': 'Torna-ho a provar: escolta amb atenció.',
      'pitchdir.feedback.partial': 'Molt bé! Ara respon a la segona seqüència.',
      'pitchdir.feedback.locked': 'Reproduint… espera que acabe.',
      'pitchdir.feedback.gameover': 'Partida finalitzada. Prem “Reinicia partida” per a tornar-ho a provar.',
      'pitchdir.modal.title': 'Doble seqüència',
      'pitchdir.modal.body': 'Has avançat de nivell. Ara escoltaràs dos seqüències seguides: respon després de cadascuna.',
      'pitchdir.modal.close': 'Entés!'
    },
    en: {
      'pitchdir.title': 'Pitch Direction',
      'pitchdir.subtitle': 'Listen to two tones and choose whether the second rises, falls or stays the same.',
      'pitchdir.stats.attempts': 'Attempts: {n}',
      'pitchdir.stats.correct': 'Correct: {n}',
      'pitchdir.stats.lives': 'Lives: {n}',
      'pitchdir.stats.streak': 'Streak: {n}',
      'pitchdir.controls.start': 'Start',
      'pitchdir.controls.playing': 'Playing…',
      'pitchdir.controls.reset': 'Restart game',
      'pitchdir.option.up': 'Up ⤴',
      'pitchdir.option.same': 'Same ↔',
      'pitchdir.option.down': 'Down ⤵',
      'pitchdir.feedback.prompt': 'Listen to the sequence and decide if it goes up, down or stays level.',
      'pitchdir.feedback.ready': 'Challenge ready. Press “Start”.',
      'pitchdir.feedback.ready.multi': 'Advanced level: you will hear two sequences in a row. Answer both.',
      'pitchdir.feedback.correct.up': 'Correct! The sound rises.',
      'pitchdir.feedback.correct.down': 'Correct! The sound falls.',
      'pitchdir.feedback.correct.same': 'Correct! The sound stays the same.',
      'pitchdir.feedback.retry': 'Try again and listen carefully.',
      'pitchdir.feedback.partial': 'Great! Now answer the second sequence.',
      'pitchdir.feedback.locked': 'Playing… please wait.',
      'pitchdir.feedback.gameover': 'Game over. Press “Restart game” to try again.',
      'pitchdir.modal.title': 'Double sequence',
      'pitchdir.modal.body': 'You have advanced a level. From now on you will hear two sequences in a row—answer after each one.',
      'pitchdir.modal.close': 'Understood!'
    }
  };

  if (window.i18n && typeof window.i18n.registerBundle === 'function') {
    window.i18n.registerBundle('pitch-direction', payload);
  } else {
    window.__i18nPendingBundles = window.__i18nPendingBundles || [];
    window.__i18nPendingBundles.push({ name: 'pitch-direction', payload });
  }
})();
