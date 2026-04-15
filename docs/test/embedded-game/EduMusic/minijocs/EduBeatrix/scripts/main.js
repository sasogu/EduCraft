var levels = [screenStart,
              level1_1, level1_2, level2_1,
              screenEasy,
              level2_2, level2_3, level2_4, level2_5,
              screenTricky,
              level3_1, level3_2, level3_3, level3_4,
              screenWin, screenCredits,
              levelbonus_1, levelbonus_2,
              screenEnd];

var GameState = function(game){};

GameState.prototype.preload = function() {
};

function detectLocale() {
  if (typeof navigator === 'undefined') {
    return 'en';
  }
  var lang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
  if (lang.indexOf('ca') === 0 || lang.indexOf('val') === 0) {
    return 'val';
  }
  if (lang.indexOf('es') === 0) {
    return 'es';
  }
  return 'en';
}

var I18N = {
  en: {
    play: 'PLAY',
    stop: 'STOP',
    pause: 'PAUSE',
    resume: 'RESUME',
    install: 'INSTALL',
    exportWav: 'EXPORT WAV',
    bpm: 'BPM',
    step: 'Bar/Step',
    screen: 'Screen',
    tutorial: [
      'Press PLAY to listen to the target pattern.',
      'Press STOP to begin moving the red snare.',
      'Drag the red snare onto the path of the moving beat.',
      'Let the beat hit the snare and watch for green.',
      'Great! Tap the screen to continue to the next challenge.'
    ]
  },
  val: {
    play: 'PLAY',
    stop: 'STOP',
    pause: 'PAUSA',
    resume: 'CONTINUA',
    install: 'INSTAL·LA',
    exportWav: 'EXPORTAR WAV',
    bpm: 'BPM',
    step: 'Compas/Pas',
    screen: 'Pantalla',
    tutorial: [
      'Prem PLAY per escoltar el patro objectiu.',
      'Prem STOP per comencar a moure la caixa roja.',
      'Arrossega la caixa roja al cami del beat en moviment.',
      'Deixa que el beat colpege la caixa i mira el verd.',
      'Estupend! Toca la pantalla per continuar al seguent repte.'
    ]
  },
  es: {
    play: 'PLAY',
    stop: 'STOP',
    pause: 'PAUSA',
    resume: 'CONTINUAR',
    install: 'INSTALAR',
    exportWav: 'EXPORTAR WAV',
    bpm: 'BPM',
    step: 'Compas/Paso',
    screen: 'Pantalla',
    tutorial: [
      'Pulsa PLAY para escuchar el patron objetivo.',
      'Pulsa STOP para empezar a mover la caja roja.',
      'Arrastra la caja roja a la ruta del beat en movimiento.',
      'Deja que el beat golpee la caja y mira el verde.',
      'Estupendo, lo has conseguido. Pulsa en la pantalla para continuar al siguiente reto.'
    ]
  }
};

GameState.prototype.updateStepText = function() {
  var locale = I18N[this.locale] || I18N.en;
  var label = locale.step;
  if (this.domHud && this.domHud.stepText) {
    var domStep = (this.beatStep % this.totalSteps) + 1;
    this.domHud.stepText.textContent =
      label + ": " + domStep + "/" + this.totalSteps;
  }
  if (!this.stepText) {
    return;
  }
  var step = (this.beatStep % this.totalSteps) + 1;
  this.stepText.text = label + ": " + step + "/" + this.totalSteps;
};

GameState.prototype.updateMetronomeVisual = function() {
  if (this.domHud && this.domHud.metro) {
    if (this.metroPulse) {
      this.metroPulseTime += this.game.time.elapsedMS;
      var dt = Math.min(1, this.metroPulseTime / 150);
      var dScale = 1.4 - 0.4 * dt;
      var dAlpha = 1.0 - 0.4 * dt;
      this.domHud.metro.style.transform = "scale(" + dScale + ")";
      this.domHud.metro.style.opacity = dAlpha;
      if (dt >= 1) {
        this.metroPulse = false;
      }
    } else {
      this.domHud.metro.style.transform = "scale(1)";
      this.domHud.metro.style.opacity = 0.6;
    }
    return;
  }
  if (!this.metro) {
    return;
  }
  if (this.metroPulse) {
    this.metroPulseTime += this.game.time.elapsedMS;
    var t = Math.min(1, this.metroPulseTime / 150);
    var scale = 1.4 - 0.4 * t;
    this.metro.scale.set(scale, scale);
    this.metro.alpha = 1.0 - 0.4 * t;
    if (t >= 1) {
      this.metroPulse = false;
    }
  } else {
    this.metro.scale.set(1, 1);
    this.metro.alpha = 0.6;
  }
};

GameState.prototype.updateSpeedText = function() {
  var locale = I18N[this.locale] || I18N.en;
  if (this.domHud && this.domHud.speedText) {
    this.domHud.speedText.textContent = locale.bpm + ": " + this.BPM;
  }
  if (!this.speedText) {
    return;
  }
  this.speedText.text = locale.bpm + ": " + this.BPM;
};

GameState.prototype.changeSpeed = function(delta) {
  this.BPM = Math.max(this.bpmMin, Math.min(this.bpmMax, this.BPM + delta));
  this.updateSpeedText();
};

GameState.prototype.togglePause = function() {
  this.game.paused = !this.game.paused;
  var locale = I18N[this.locale] || I18N.en;
  if (this.domHud && this.domHud.pauseButton) {
    this.domHud.pauseButton.textContent =
      this.game.paused ? locale.resume : locale.pause;
  }
  if (this.pauseButtonText) {
    this.pauseButtonText.text = this.game.paused ? locale.resume : locale.pause;
  }
};

GameState.prototype.startSolutionPlayback = function(loop) {
  if (loop) {
    this.loopSolution = true;
  }
  if (this.tutorialActive) {
    this.tutorialSawPreview = true;
  }
  if (this.solutionBeats.length !== 0) {
    return;
  }
  var sRect = getSolutionRect(this.solutionRows,
                              this.correctSolution.length);
  var dir = {x: 1, y: 0};
  for (var i = 0; i < this.solutionRows; i++) {
    var pos = {
      x: sRect.x,
      y: (GRID_SIZE - this.solutionRows + i) * PIXEL_SIZE};
    this.solutionBeats.add(new Beat(this.game, pos, dir));
  }
  this.playAnyway = true;
};

GameState.prototype.stopSolutionPlayback = function() {
  this.loopSolution = false;
  this.playAnyway = false;
  this.solutionBeats.removeAll(true);
  if (this.tutorialActive) {
    this.tutorialSawStop = true;
  }
};

GameState.prototype.updatePlayButtonPosition = function() {
  if (this.useDomHud) {
    return;
  }
  if (!this.playButton || !this.playButtonText ||
      !this.stopButton || !this.stopButtonText) {
    return;
  }
  var sRect = getSolutionRect(this.solutionRows,
                              this.correctSolution.length);
  var btnWidth = 6 * PIXEL_SIZE;
  var btnHeight = 2 * PIXEL_SIZE;
  var padding = PIXEL_SIZE;
  var gap = Math.floor(PIXEL_SIZE / 2);
  var x = sRect.x;
  var y = sRect.y - btnHeight - padding;
  if (y < padding) {
    y = sRect.y + sRect.height + padding;
  }
  x = Math.max(padding,
               Math.min(x, GRID_SIZE * PIXEL_SIZE - btnWidth - padding));
  if (y + btnHeight > GRID_SIZE * PIXEL_SIZE - padding) {
    y = GRID_SIZE * PIXEL_SIZE - btnHeight - padding;
  }

  var stopX = x + btnWidth + gap;
  if (stopX + btnWidth > GRID_SIZE * PIXEL_SIZE - padding) {
    stopX = x - btnWidth - gap;
  }
  stopX = Math.max(padding,
                   Math.min(stopX, GRID_SIZE * PIXEL_SIZE - btnWidth - padding));

  this.playButton.clear();
  this.playButton.beginFill(0x111111, 0.8);
  this.playButton.lineStyle(2, 0xffffff, 0.8);
  this.playButton.drawRect(x, y, btnWidth, btnHeight);
  this.playButton.endFill();
  this.playButtonText.x = x + btnWidth / 2;
  this.playButtonText.y = y + btnHeight / 2;

  this.stopButton.clear();
  this.stopButton.beginFill(0x331111, 0.8);
  this.stopButton.lineStyle(2, 0xffffff, 0.8);
  this.stopButton.drawRect(stopX, y, btnWidth, btnHeight);
  this.stopButton.endFill();
  this.stopButtonText.x = stopX + btnWidth / 2;
  this.stopButtonText.y = y + btnHeight / 2;
};

GameState.prototype.updatePauseButtonPosition = function() {
  if (this.useDomHud) {
    return;
  }
  if (!this.pauseButton || !this.pauseButtonText) {
    return;
  }
  var btnWidth = 6 * PIXEL_SIZE;
  var btnHeight = 2 * PIXEL_SIZE;
  var padding = PIXEL_SIZE;
  var x = padding;
  var y = this.stepText.y + Math.floor(PIXEL_SIZE * 1.2);

  this.pauseButton.clear();
  this.pauseButton.beginFill(0x111111, 0.8);
  this.pauseButton.lineStyle(2, 0xffffff, 0.8);
  this.pauseButton.drawRect(x, y, btnWidth, btnHeight);
  this.pauseButton.endFill();
  this.pauseButtonText.x = x + btnWidth / 2;
  this.pauseButtonText.y = y + btnHeight / 2;
};

GameState.prototype.updateSpeedControlsPosition = function() {
  if (this.useDomHud) {
    return;
  }
  if (!this.speedText || !this.speedDownButton || !this.speedUpButton) {
    return;
  }
  var btnWidth = 2 * PIXEL_SIZE;
  var btnHeight = 2 * PIXEL_SIZE;
  var padding = PIXEL_SIZE;
  var x = padding;
  var y = this.pauseButtonText.y + Math.floor(PIXEL_SIZE * 1.6);

  this.speedDownButton.clear();
  this.speedDownButton.beginFill(0x111111, 0.8);
  this.speedDownButton.lineStyle(2, 0xffffff, 0.8);
  this.speedDownButton.drawRect(x, y, btnWidth, btnHeight);
  this.speedDownButton.endFill();
  this.speedDownText.x = x + btnWidth / 2;
  this.speedDownText.y = y + btnHeight / 2;

  var upX = x + btnWidth + Math.floor(PIXEL_SIZE / 2);
  this.speedUpButton.clear();
  this.speedUpButton.beginFill(0x111111, 0.8);
  this.speedUpButton.lineStyle(2, 0xffffff, 0.8);
  this.speedUpButton.drawRect(upX, y, btnWidth, btnHeight);
  this.speedUpButton.endFill();
  this.speedUpText.x = upX + btnWidth / 2;
  this.speedUpText.y = y + btnHeight / 2;

  this.speedText.x = upX + btnWidth + Math.floor(PIXEL_SIZE / 2);
  this.speedText.y = y + btnHeight / 2;
};

GameState.prototype.applyLocaleToHud = function() {
  var locale = I18N[this.locale] || I18N.en;
  if (this.domHud) {
    if (this.domHud.playButton) {
      this.domHud.playButton.textContent = locale.play;
    }
    if (this.domHud.stopButton) {
      this.domHud.stopButton.textContent = locale.stop;
    }
    if (this.domHud.pauseButton) {
      this.domHud.pauseButton.textContent =
        this.game.paused ? locale.resume : locale.pause;
    }
    if (this.domHud.speedText) {
      this.domHud.speedText.textContent = locale.bpm + ": " + this.BPM;
    }
    if (this.domHud.stepText) {
      var step = (this.beatStep % this.totalSteps) + 1;
      this.domHud.stepText.textContent =
        locale.step + ": " + step + "/" + this.totalSteps;
    }
    if (this.domHud.levelLabel) {
      this.domHud.levelLabel.textContent = locale.screen;
    }
    var installBtn = document.getElementById('installBtn');
    if (installBtn) {
      installBtn.textContent = locale.install;
    }
    var exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.textContent = locale.exportWav;
    }
  } else {
    if (this.playButtonText) {
      this.playButtonText.text = locale.play;
    }
    if (this.stopButtonText) {
      this.stopButtonText.text = locale.stop;
    }
    if (this.pauseButtonText) {
      this.pauseButtonText.text =
        this.game.paused ? locale.resume : locale.pause;
    }
    if (this.speedText) {
      this.speedText.text = locale.bpm + ": " + this.BPM;
    }
    if (this.stepText) {
      var localStep = (this.beatStep % this.totalSteps) + 1;
      this.stepText.text =
        locale.step + ": " + localStep + "/" + this.totalSteps;
    }
  }
};

GameState.prototype.captureTutorialDrums = function() {
  this.tutorialDrums = [];
  for (var i = 0; i < this.drums.length; i++) {
    var drum = this.drums.getAt(i);
    if (drum.beatDirs === null) {
      var grid = p2g(drum);
      this.tutorialDrums.push({drum: drum, x: grid.x, y: grid.y});
    }
  }
};

GameState.prototype.tutorialHasMovedDrum = function() {
  for (var i = 0; i < this.tutorialDrums.length; i++) {
    var entry = this.tutorialDrums[i];
    var grid = p2g(entry.drum);
    if (grid.x !== entry.x || grid.y !== entry.y) {
      return true;
    }
  }
  return false;
};

GameState.prototype.setTutorialText = function(text) {
  if (!this.tutorialText || !this.tutorialBg) {
    return;
  }
  var padding = Math.floor(PIXEL_SIZE / 2);
  var width = GRID_SIZE * PIXEL_SIZE - padding * 2;
  var height = padding * 4;
  var y = GRID_SIZE * PIXEL_SIZE - padding * 9;
  this.tutorialText.text = text;
  this.tutorialText.wordWrapWidth = width - padding * 2;
  this.tutorialText.x = padding * 2;
  this.tutorialText.y = y + padding;
  this.tutorialBg.clear();
  this.tutorialBg.beginFill(0x000000, 0.7);
  this.tutorialBg.drawRect(padding, y, width, height);
  this.tutorialBg.endFill();
};

GameState.prototype.initTutorial = function(levelIndex) {
  if (!this.tutorialGroup || !this.tutorialText) {
    return;
  }
  this.tutorialActive = levelIndex === 1;
  this.tutorialStep = 0;
  this.tutorialSawPreview = false;
  this.tutorialSawHit = false;
  this.tutorialSawStop = false;
  this.tutorialGroup.visible = this.tutorialActive;
  if (this.tutorialActive) {
    this.captureTutorialDrums();
    var locale = I18N[this.locale] || I18N.en;
    this.setTutorialText(locale.tutorial[0]);
  }
};

GameState.prototype.updateTutorial = function() {
  if (!this.tutorialActive) {
    return;
  }
  var locale = I18N[this.locale] || I18N.en;
  if (this.tutorialStep === 0 && this.tutorialSawPreview) {
    this.tutorialStep = 1;
    this.setTutorialText(locale.tutorial[1]);
  } else if (this.tutorialStep === 1 && this.tutorialSawStop) {
    this.tutorialStep = 2;
    this.setTutorialText(locale.tutorial[2]);
  } else if (this.tutorialStep === 2 && this.tutorialHasMovedDrum()) {
    this.tutorialStep = 3;
    this.setTutorialText(locale.tutorial[3]);
  } else if (this.tutorialStep === 3 && this.tutorialSawHit) {
    this.tutorialStep = 4;
    this.setTutorialText(locale.tutorial[4]);
  } else if (this.tutorialStep === 4 && this.hasWon) {
    this.tutorialActive = false;
    this.tutorialGroup.visible = false;
  }
};

GameState.prototype.loadProgress = function() {
  var saved = 0;
  try {
    saved = parseInt(localStorage.getItem('edubeatrixScreenIndex'), 10);
    if (isNaN(saved)) {
      saved = 0;
    }
  } catch (e) {
    saved = 0;
  }
  this.unlockedScreenIndex = Math.max(0, Math.min(saved, levels.length - 1));
};

GameState.prototype.saveProgress = function() {
  var value = this.unlockedScreenIndex;
  try {
    localStorage.setItem('edubeatrixScreenIndex', String(value));
  } catch (e) {
  }
};

GameState.prototype.refreshLevelSelect = function() {
  if (!this.domHud || !this.domHud.levelSelect) {
    return;
  }
  var locale = I18N[this.locale] || I18N.en;
  var select = this.domHud.levelSelect;
  select.innerHTML = '';
  for (var i = 0; i <= this.unlockedScreenIndex; i++) {
    var option = document.createElement('option');
    option.value = String(i);
    option.textContent = locale.screen + " " + (i + 1);
    select.appendChild(option);
  }
  select.value = String(this.levelIndex);
};

GameState.prototype.handleLevelSelect = function() {
  if (!this.domHud || !this.domHud.levelSelect) {
    return;
  }
  var value = parseInt(this.domHud.levelSelect.value, 10);
  if (!isNaN(value) &&
      value >= 0 &&
      value <= this.unlockedScreenIndex) {
    this.levelIndex = value;
    this.loadLevel(levels[this.levelIndex]);
    this.refreshLevelSelect();
  }
};

GameState.prototype.getDrumBuffer = function(drumdef) {
  var key = drumdef.name(0);
  var sound = this.game.cache.getSound(key);
  if (!sound || !sound.data) {
    return null;
  }
  return sound.data;
};

GameState.prototype.audioBufferToWav = function(buffer) {
  var numChannels = buffer.numberOfChannels;
  var sampleRate = buffer.sampleRate;
  var length = buffer.length * numChannels * 2;
  var arrayBuffer = new ArrayBuffer(44 + length);
  var view = new DataView(arrayBuffer);
  var offset = 0;

  var writeString = function(str) {
    for (var i = 0; i < str.length; i++) {
      view.setUint8(offset++, str.charCodeAt(i));
    }
  };
  var writeUint32 = function(value) {
    view.setUint32(offset, value, true);
    offset += 4;
  };
  var writeUint16 = function(value) {
    view.setUint16(offset, value, true);
    offset += 2;
  };

  writeString('RIFF');
  writeUint32(36 + length);
  writeString('WAVE');
  writeString('fmt ');
  writeUint32(16);
  writeUint16(1);
  writeUint16(numChannels);
  writeUint32(sampleRate);
  writeUint32(sampleRate * numChannels * 2);
  writeUint16(numChannels * 2);
  writeUint16(16);
  writeString('data');
  writeUint32(length);

  var channelData = [];
  for (var c = 0; c < numChannels; c++) {
    channelData.push(buffer.getChannelData(c));
  }
  for (var i = 0; i < buffer.length; i++) {
    for (var ch = 0; ch < numChannels; ch++) {
      var sample = Math.max(-1, Math.min(1, channelData[ch][i]));
      view.setInt16(offset, sample * 0x7fff, true);
      offset += 2;
    }
  }
  return arrayBuffer;
};

GameState.prototype.exportCurrentPatternWav = function() {
  if (!this.correctSolution || this.correctSolution.length === 0) {
    return;
  }
  var stepsPerBar = this.correctSolution.length;
  var totalSteps = stepsPerBar * 2;
  var stepDuration = 60 / this.BPM / 4;
  var totalDuration = totalSteps * stepDuration;
  var sampleRate = 44100;
  var frameCount = Math.ceil(totalDuration * sampleRate);
  var offline = new OfflineAudioContext(2, frameCount, sampleRate);

  for (var step = 0; step < totalSteps; step++) {
    var drums = this.correctSolution[step % stepsPerBar];
    for (var i = 0; i < drums.length; i++) {
      var buffer = this.getDrumBuffer(drums[i]);
      if (!buffer) {
        continue;
      }
      var source = offline.createBufferSource();
      source.buffer = buffer;
      source.connect(offline.destination);
      source.start(step * stepDuration);
    }
  }

  var self = this;
  offline.startRendering().then(function(rendered) {
    var wav = self.audioBufferToWav(rendered);
    var blob = new Blob([wav], { type: 'audio/wav' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'edubeatrix-screen-' + (self.levelIndex + 1) +
      '-' + self.BPM + 'bpm.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() {
      URL.revokeObjectURL(url);
    }, 1000);
  });
};

function loadSolution(level) {
  var solution = [];
  if (level.solution !== undefined) {
    var i;
    for (i = 0; i < level.solution[0].length; i++) {
      solution.push([]);
    }
    for (var row = 0; row < level.solution.length; row++) {
      for (i = 0; i < level.solution[row].length; i++) {
        var ch = level.solution[row].charAt(i);
        if (ch !== " ") {
          solution[i].push(level[ch].drum);
        }
      }
    }
  }
  return solution;
}

GameState.prototype.addSolutionDrums = function(level) {
  this.solutionBg.removeAll(true);
  this.correctSolutionDrums.removeAll(true);
  this.solutionRows = 1;
  var i;
  for (i = 0; i < this.correctSolution.length; i++) {
    this.solutionRows = Math.max(this.solutionRows, this.correctSolution[i].length);
  }

  // Display background - big enough for solution plus one row
  var sRect = getSolutionRect(this.solutionRows,
                              this.correctSolution.length);
  var left = (GRID_SIZE - this.correctSolution.length) / 2;
  var bg = this.solutionBg.add(new Phaser.Sprite(this.game,
                                                 sRect.x, sRect.y,
                                                 'black'));
  bg.width = sRect.width;
  bg.height = sRect.height;
  // Add checkerboard to solution too
  // Create checkerboard background
  for (i = 0; i < this.correctSolution.length; i++) {
    for (var j = 0; j < this.solutionRows + 1; j++) {
      if (((i % 2) === 0) ^ ((j % 2) === 0)) {
        var pixel = g2p({
          x: left + i,
          y: GRID_SIZE - this.solutionRows - 1 + j});
        var check = this.solutionBg.add(
          new Phaser.Sprite(this.game,
                            pixel.x, pixel.y,
                            'black2'));
        check.width = PIXEL_SIZE;
        check.height = PIXEL_SIZE;
      }
    }
  }
  if (level.solution !== undefined) {
    for (var row = 0; row < level.solution.length; row++) {
      var y = GRID_SIZE - this.solutionRows + row;
      for (i = 0; i < level.solution[row].length; i++) {
        var x = left + i;
        var ch = level.solution[row].charAt(i);
        if (ch !== " ") {
          this.correctSolutionDrums.add(new Drum(this,
                                                 {x:x, y:y}, level[ch].drum,
                                                 null, null, null));
        }
      }
    }
  }
};

GameState.prototype.loadLevel = function(level) {
  // Reset everything
  this.solutionBg.removeAll(true);
  this.correctSolutionDrums.removeAll(true);
  this.solutionBeats.removeAll(true);
  this.solutionDrums.removeAll(true);
  this.beats.removeAll(true);
  this.drums.removeAll(true);
  this.indicators.removeAll(true);
  this.draggedDrum = null;
  if (this.tapSelectedDrum) {
    this.tapSelectedDrum.tint = 0xffffff;
  }
  this.tapSelectedDrum = null;
  this.solution = [];
  this.correctSolution = [[]];
  this.solutionRows = 1;
  this.solutionBeat = 0;
  this.BPM = 120;
  this.bpmMin = 40;
  this.bpmMax = 200;
  this.loopSolution = false;
  this.beatStep = 0;
  this.totalSteps = 1;
  
  // Load solution
  if (level.solution !== undefined) {
    this.correctSolution = loadSolution(level);
  }
  if (this.correctSolution.length > 0) {
    this.totalSteps = this.correctSolution.length;
  }
  this.updateStepText();
  this.updateSpeedText();
  this.applyLocaleToHud();
  // Add pseudo-drums to display the solution
  this.addSolutionDrums(level);
  this.updatePlayButtonPosition();
  this.updatePauseButtonPosition();
  this.updateSpeedControlsPosition();
  // Load the level
  for (var y = 0; y < GRID_SIZE; y++) {
    var row = level.cells[y];
    for (var x = 0; x < GRID_SIZE; x++) {
      var ch = row.charAt(x);
      if (ch !== " ") {
        var drumdef = level[ch].drum;
        var bounce = null;
        if (level[ch].bounce !== undefined) {
          bounce = dir2vel(level[ch].bounce);
        }
        var beats = null;
        if (level[ch].beat !== undefined) {
          beats = [];
          for (var i = 0; i < level[ch].beat.length; i++) {
            var dir = level[ch].beat[i];
            beats.push(dir2vel(dir));
          }
        }
        this.drums.add(new Drum(this,
                                {x:x, y:y}, drumdef,
                                bounce, beats, level[ch].period));
      }
    }
  }
  this.solutionBeat = 0;
  this.hasWon = false;
  this.alwaysWin = level.alwaysWin;
  if (level.BPM !== undefined) {
    this.BPM = level.BPM;
  }
  this.initTutorial(this.levelIndex);
};

GameState.prototype.create = function() {
  this.game.stage.backgroundColor = 0x333333;
  this.locale = detectLocale();

  // En móvil: tocar para seleccionar + mover con flechas (D-pad).
  // (En desktop se mantiene el arrastre con ratón.)
  this.tapToMove = !!(this.game.device && this.game.device.touch);
  this.dpadEnabled = false;
  this.tapSelectedDrum = null;
  this.tapSelectedTint = 0xa8ffa8;
  
  this.sounds = {
    win: this.game.add.audio("yeah"),
    newLevel: this.game.add.audio("mmhmm"),
    rollover: this.game.add.audio("rollover"),
    move: this.game.add.audio("move"),
    place: this.game.add.audio("place")
  };
  
  this.timeAccumMS = 0;
  this.bg = this.game.add.group();
  this.solutionBg = this.game.add.group();
  this.correctSolutionDrums = this.game.add.group();
  this.solutionBeats = this.game.add.group();
  this.solutionDrums = this.game.add.group();
  this.indicators = this.game.add.group();
  this.beats = this.game.add.group();
  this.drums = this.game.add.group();
  this.draggedDrum = null;
  this.solution = [];
  this.playAnyway = false;
  this.loopSolution = false;
  this.beatStep = 0;
  this.totalSteps = 1;
  this.bpmMin = 40;
  this.bpmMax = 200;
  
  // Create checkerboard background
  for (var i = 0; i < GRID_SIZE; i++) {
    for (var j = 0; j < GRID_SIZE; j++) {
      if (((i % 2) === 0) ^ ((j % 2) === 0)) {
        var pixel = g2p({x: i, y: j});
        var check = this.bg.add(new Phaser.Sprite(this.game,
                                                  pixel.x, pixel.y,
                                                  'bg'));
        check.width = PIXEL_SIZE;
        check.height = PIXEL_SIZE;
      }
    }
  }

  this.useDomHud = typeof document !== 'undefined' &&
    document.getElementById('hud');
  this.domHud = null;
  if (this.useDomHud) {
    this.domHud = {
      playButton: document.getElementById('playBtn'),
      stopButton: document.getElementById('stopBtn'),
      pauseButton: document.getElementById('pauseBtn'),
      speedDownButton: document.getElementById('speedDownBtn'),
      speedUpButton: document.getElementById('speedUpBtn'),
      speedText: document.getElementById('speedText'),
      stepText: document.getElementById('stepText'),
      metro: document.getElementById('metro'),
      levelSelect: document.getElementById('levelSelect'),
      levelLabel: document.querySelector('label[for=\"levelSelect\"]'),
      exportButton: document.getElementById('exportBtn')
    };
    if (this.domHud.playButton) {
      this.domHud.playButton.addEventListener('click', function() {
        this.startSolutionPlayback(true);
      }.bind(this));
    }
    if (this.domHud.stopButton) {
      this.domHud.stopButton.addEventListener('click', function() {
        this.stopSolutionPlayback();
      }.bind(this));
    }
    if (this.domHud.pauseButton) {
      this.domHud.pauseButton.addEventListener('click', function() {
        this.togglePause();
      }.bind(this));
    }
    if (this.domHud.speedDownButton) {
      this.domHud.speedDownButton.addEventListener('click', function() {
        this.changeSpeed(-5);
      }.bind(this));
    }
    if (this.domHud.speedUpButton) {
      this.domHud.speedUpButton.addEventListener('click', function() {
        this.changeSpeed(5);
      }.bind(this));
    }
    if (this.domHud.exportButton) {
      this.domHud.exportButton.addEventListener('click', function() {
        this.exportCurrentPatternWav();
      }.bind(this));
    }
    if (this.domHud.levelSelect) {
      this.domHud.levelSelect.addEventListener('change', function() {
        this.handleLevelSelect();
      }.bind(this));
    }
    this.metro = null;
  } else {
    this.playButton = this.game.add.graphics(0, 0);
    this.playButton.inputEnabled = true;
    this.playButton.events.onInputDown.add(function() {
      this.startSolutionPlayback(true);
    }, this);
    this.playButtonText = this.game.add.text(0, 0, 'PLAY', {
      font: '14px Arial',
      fill: '#ffffff'
    });
    this.playButtonText.anchor.set(0.5, 0.5);
    this.stopButton = this.game.add.graphics(0, 0);
    this.stopButton.inputEnabled = true;
    this.stopButton.events.onInputDown.add(this.stopSolutionPlayback, this);
    this.stopButtonText = this.game.add.text(0, 0, 'STOP', {
      font: '14px Arial',
      fill: '#ffffff'
    });
    this.stopButtonText.anchor.set(0.5, 0.5);

    this.stepText = this.game.add.text(PIXEL_SIZE, Math.floor(PIXEL_SIZE / 2),
                                       '', {
      font: '14px Arial',
      fill: '#ffffff'
    });
    this.pauseButton = this.game.add.graphics(0, 0);
    this.pauseButton.inputEnabled = true;
    this.pauseButton.events.onInputDown.add(this.togglePause, this);
    this.pauseButtonText = this.game.add.text(0, 0, 'PAUSE', {
      font: '14px Arial',
      fill: '#ffffff'
    });
    this.pauseButtonText.anchor.set(0.5, 0.5);
    this.speedDownButton = this.game.add.graphics(0, 0);
    this.speedDownButton.inputEnabled = true;
    this.speedDownButton.events.onInputDown.add(function() {
      this.changeSpeed(-5);
    }, this);
    this.speedDownText = this.game.add.text(0, 0, '-', {
      font: '18px Arial',
      fill: '#ffffff'
    });
    this.speedDownText.anchor.set(0.5, 0.5);
    this.speedUpButton = this.game.add.graphics(0, 0);
    this.speedUpButton.inputEnabled = true;
    this.speedUpButton.events.onInputDown.add(function() {
      this.changeSpeed(5);
    }, this);
    this.speedUpText = this.game.add.text(0, 0, '+', {
      font: '18px Arial',
      fill: '#ffffff'
    });
    this.speedUpText.anchor.set(0.5, 0.5);
    this.speedText = this.game.add.text(0, 0, '', {
      font: '14px Arial',
      fill: '#ffffff'
    });
    this.speedText.anchor.set(0, 0.5);
    this.metro = this.game.add.graphics(0, 0);
    this.metroRadius = Math.max(4, Math.floor(PIXEL_SIZE / 4));
    this.metroBase = {
      x: GRID_SIZE * PIXEL_SIZE - PIXEL_SIZE,
      y: Math.floor(PIXEL_SIZE / 2) + this.metroRadius
    };
    this.metro.beginFill(0xffffff, 1);
    this.metro.drawCircle(this.metroBase.x, this.metroBase.y,
                          this.metroRadius * 2);
    this.metro.endFill();
  }
  this.tutorialGroup = this.game.add.group();
  this.tutorialBg = this.game.add.graphics(0, 0);
  this.tutorialGroup.add(this.tutorialBg);
  this.tutorialText = this.game.add.text(0, 0, '', {
    font: '14px Arial',
    fill: '#ffffff',
    wordWrap: true
  });
  this.tutorialGroup.add(this.tutorialText);
  this.tutorialActive = false;
  this.tutorialGroup.visible = false;
  this.metroPulse = false;
  this.metroPulseTime = 0;
  this.updateStepText();
  this.updatePauseButtonPosition();
  this.updateSpeedText();
  this.updateSpeedControlsPosition();
  this.applyLocaleToHud();
  this.loadProgress();
  this.levelIndex = this.unlockedScreenIndex || 0;
  var queryLevelIndex = null;
  if (typeof window !== 'undefined' &&
      window.location &&
      window.location.search) {
    try {
      var params = new URLSearchParams(window.location.search);
      var screenParam = params.get('screen') || params.get('level');
      var indexParam = params.get('index');
      if (indexParam !== null) {
        queryLevelIndex = parseInt(indexParam, 10);
      } else if (screenParam !== null) {
        queryLevelIndex = parseInt(screenParam, 10) - 1;
      }
    } catch (e) {
    }
  }
  if (typeof queryLevelIndex === 'number' &&
      !isNaN(queryLevelIndex)) {
    queryLevelIndex = Math.max(0, Math.min(queryLevelIndex, levels.length - 1));
    this.levelIndex = queryLevelIndex;
    this.unlockedScreenIndex = Math.max(this.unlockedScreenIndex, queryLevelIndex);
  }
  
  // FPS timer
  // Turn off in prod
  /*this.game.time.advancedTiming = true;
  this.fpsText = this.game.add.text(
    20, 20, '', { font: '16px Arial', fill: '#ffffff' }
  );*/

  if (this.game && this.game.input && this.game.input.onTap) {
    this.game.input.onTap.add(this.handleTap, this);
  }

  var dpad = (typeof document !== 'undefined') ? document.getElementById('dpad') : null;
  this.dpadEnabled = !!(this.tapToMove && dpad);
  if (this.dpadEnabled) {
    var bindBtn = function(id, dx, dy) {
      var btn = document.getElementById(id);
      if (!btn) {
        return;
      }
      var handler = function(e) {
        if (e && e.preventDefault) {
          e.preventDefault();
        }
        this.moveSelectedDrumBy(dx, dy);
      }.bind(this);
      btn.addEventListener('click', handler);
      btn.addEventListener('touchstart', handler, {passive: false});
    }.bind(this);
    bindBtn('dpadUp', 0, -1);
    bindBtn('dpadDown', 0, 1);
    bindBtn('dpadLeft', -1, 0);
    bindBtn('dpadRight', 1, 0);
  }
  
  this.loadLevel(levels[this.levelIndex]);
  this.refreshLevelSelect();
};

GameState.prototype.moveSelectedDrumBy = function(dx, dy) {
  if (!this.tapSelectedDrum) {
    return;
  }
  // Solo movemos los que no generan beats.
  if (this.tapSelectedDrum.beatDirs !== null) {
    return;
  }

  var from = p2g(this.tapSelectedDrum);
  var to = {x: from.x + dx, y: from.y + dy};
  if (to.x < 0 || to.x >= GRID_SIZE || to.y < 0 || to.y >= GRID_SIZE) {
    return;
  }
  for (var i = 0; i < this.drums.length; i++) {
    var other = this.drums.getAt(i);
    if (other === this.tapSelectedDrum) {
      continue;
    }
    var og = p2g(other);
    if (og.x == to.x && og.y == to.y) {
      return;
    }
  }

  var pixel = g2p(to);
  if (this.tapSelectedDrum.x !== pixel.x || this.tapSelectedDrum.y !== pixel.y) {
    this.sounds.rollover.play();
  }
  this.tapSelectedDrum.x = pixel.x;
  this.tapSelectedDrum.y = pixel.y;
  this.sounds.place.play();
};

GameState.prototype.handleTap = function(pointer) {
  if (!this.tapToMove || !pointer) {
    return;
  }
  // Mientras está la previsualización (beats) no movemos piezas.
  if (this.solutionBeats.length !== 0) {
    return;
  }

  var clampGrid = function(grid) {
    return {
      x: Math.max(0, Math.min(GRID_SIZE - 1, grid.x)),
      y: Math.max(0, Math.min(GRID_SIZE - 1, grid.y))
    };
  };
  var getDrumAt = function(drums, grid) {
    for (var i = 0; i < drums.length; i++) {
      var drum = drums.getAt(i);
      var drumGrid = p2g(drum);
      if (drumGrid.x == grid.x && drumGrid.y == grid.y) {
        return drum;
      }
    }
    return null;
  };
  var getDrumNearPoint = function(drums, point, maxDistPx) {
    var best = null;
    var bestD2 = maxDistPx * maxDistPx;
    for (var i = 0; i < drums.length; i++) {
      var drum = drums.getAt(i);
      var cx = drum.x + PIXEL_SIZE / 2;
      var cy = drum.y + PIXEL_SIZE / 2;
      var dx = cx - point.x;
      var dy = cy - point.y;
      var d2 = dx * dx + dy * dy;
      if (d2 <= bestD2) {
        bestD2 = d2;
        best = drum;
      }
    }
    return best;
  };

  var tapPos = {x: pointer.x, y: pointer.y};
  // Esto hace que las "casillas" se sientan más grandes al dedo.
  var pickRadius = PIXEL_SIZE * 1.45;

  // Tap en solución = reproducir preview.
  var sRect = getSolutionRect(this.solutionRows, this.correctSolution.length);
  var isOverSolution =
    tapPos.x >= sRect.x &&
    tapPos.x < sRect.x + sRect.width &&
    tapPos.y >= sRect.y &&
    tapPos.y < sRect.y + sRect.height;
  if (isOverSolution) {
    this.startSolutionPlayback();
    return;
  }

  // 1) Tap cerca de un drum movible => seleccionar.
  var tappedDrum = getDrumNearPoint(this.drums, tapPos, pickRadius);
  var canSelect = tappedDrum !== null && tappedDrum.beatDirs === null;
  if (canSelect) {
    if (this.tapSelectedDrum === tappedDrum) {
      tappedDrum.tint = 0xffffff;
      this.tapSelectedDrum = null;
      return;
    }
    if (this.tapSelectedDrum) {
      this.tapSelectedDrum.tint = 0xffffff;
    }
    this.tapSelectedDrum = tappedDrum;
    this.tapSelectedDrum.tint = this.tapSelectedTint;
    this.sounds.move.play();
    return;
  }

  // Con D-pad activo, el tap NO mueve: solo selecciona/deselecciona.
  if (this.dpadEnabled) {
    return;
  }

  // (Fallback) Sin D-pad: tap a destino para mover.
  if (!this.tapSelectedDrum) {
    return;
  }
  var targetGrid = clampGrid({
    x: Math.round(tapPos.x / PIXEL_SIZE),
    y: Math.round(tapPos.y / PIXEL_SIZE)
  });
  var occupant = getDrumAt(this.drums, targetGrid);
  if (occupant && occupant.beatDirs === null && occupant !== this.tapSelectedDrum) {
    this.tapSelectedDrum.tint = 0xffffff;
    this.tapSelectedDrum = occupant;
    this.tapSelectedDrum.tint = this.tapSelectedTint;
    this.sounds.move.play();
    return;
  }
  if (occupant === null || occupant === this.tapSelectedDrum) {
    var pixel = g2p(targetGrid);
    if (this.tapSelectedDrum.x !== pixel.x || this.tapSelectedDrum.y !== pixel.y) {
      this.sounds.rollover.play();
    }
    this.tapSelectedDrum.x = pixel.x;
    this.tapSelectedDrum.y = pixel.y;
    this.sounds.place.play();
    this.tapSelectedDrum.tint = 0xffffff;
    this.tapSelectedDrum = null;
  }
};

GameState.prototype.dragAndInput = function() {
  var clampGrid = function(grid) {
    return {
      x: Math.max(0, Math.min(GRID_SIZE - 1, grid.x)),
      y: Math.max(0, Math.min(GRID_SIZE - 1, grid.y))
    };
  };
  var getDrumAt = function(drums, grid) {
    for (var i = 0; i < drums.length; i++) {
      var drum = drums.getAt(i);
      var drumGrid = p2g(drum);
      if (drumGrid.x == grid.x &&
          drumGrid.y == grid.y) {
        return drum;
      }
    }
    return null;
  };
  var getDrumNearPoint = function(drums, point, maxDistPx) {
    var best = null;
    var bestD2 = maxDistPx * maxDistPx;
    for (var i = 0; i < drums.length; i++) {
      var drum = drums.getAt(i);
      var cx = drum.x + PIXEL_SIZE / 2;
      var cy = drum.y + PIXEL_SIZE / 2;
      var dx = cx - point.x;
      var dy = cy - point.y;
      var d2 = dx * dx + dy * dy;
      if (d2 <= bestD2) {
        bestD2 = d2;
        best = drum;
      }
    }
    return best;
  };

  var pointer = this.game.input.activePointer;
  var pointerPos = {x: pointer.x, y: pointer.y};
  var isMouse = (typeof pointer.isMouse !== 'undefined') ? pointer.isMouse : !this.game.device.touch;
  if (!isMouse && this.tapToMove) {
    return;
  }
  var pickRadius = isMouse ? PIXEL_SIZE * 0.65 : PIXEL_SIZE * 1.15;
  var moveThreshold = isMouse ? 4 : 36; // px^2

  // Mouse overs: drum or solution
  var mouseGrid = p2g(pointerPos);
  var drum = getDrumNearPoint(this.drums, pointerPos, pickRadius);
  // Can't drag drums that make beats
  var canDragDrum = drum !== null && drum.beatDirs === null;
  var sRect = getSolutionRect(this.solutionRows,
                              this.correctSolution.length);
  var isOverSolution =
    pointerPos.x >= sRect.x &&
    pointerPos.x < sRect.x + sRect.width &&
    pointerPos.y >= sRect.y &&
    pointerPos.y < sRect.y + sRect.height;
  if (canDragDrum || isOverSolution) {
    this.game.canvas.style.cursor = "pointer";
  } else {
    this.game.canvas.style.cursor = "default";
  }
  if (this.solutionBeats.length === 0) {
    if (pointer.isDown) {
      // Check if this is a solution click; if so add beats
      if (isOverSolution &&
          this.solutionBeats.length === 0) {
        this.startSolutionPlayback();
      }
      
      this.rolloverDrum = null;
      mouseGrid = p2g(pointerPos);
      // Find the drum under the mouse
      if (this.draggedDrum === null) {
        if (canDragDrum) {
          this.draggedDrum = drum;
          this.draggedDrumStart = {x: pointerPos.x, y: pointerPos.y};
          // En táctil, centra el agarre para que sea más consistente
          this.draggedDrumOffset = isMouse ?
            {x: pointerPos.x - drum.x, y: pointerPos.y - drum.y} :
            {x: PIXEL_SIZE / 2, y: PIXEL_SIZE / 2};
          this.sounds.move.play();
        }
      }
      if (this.draggedDrum) {
        // Move drum around
        var desiredX = pointerPos.x - (this.draggedDrumOffset ? this.draggedDrumOffset.x : 0);
        var desiredY = pointerPos.y - (this.draggedDrumOffset ? this.draggedDrumOffset.y : 0);
        var targetGrid = clampGrid({
          x: Math.round(desiredX / PIXEL_SIZE),
          y: Math.round(desiredY / PIXEL_SIZE)
        });
        var occupant = getDrumAt(this.drums, targetGrid);
        if (occupant === null || occupant === this.draggedDrum) {
          var pixel = g2p(targetGrid);
          if (this.draggedDrum.x !== pixel.x || this.draggedDrum.y !== pixel.y) {
            if (!this.draggedDrumStart) {
              this.draggedDrumStart = {x: pointerPos.x, y: pointerPos.y};
            }
            var dx = pointerPos.x - this.draggedDrumStart.x;
            var dy = pointerPos.y - this.draggedDrumStart.y;
            if (dx * dx + dy * dy >= moveThreshold) {
              this.sounds.rollover.play();
            }
          }
          this.draggedDrum.x = pixel.x;
          this.draggedDrum.y = pixel.y;
        }
      }
    } else {
      if (this.draggedDrum !== null) {
        this.sounds.place.play();
      }
      this.draggedDrum = null;
      this.draggedDrumOffset = null;
      this.draggedDrumStart = null;
      mouseGrid = p2g(pointerPos);
      // play rollover sound if mouse over a drum
      drum = getDrumNearPoint(this.drums, pointerPos, pickRadius);
      // Can't drag drums that make beats
      if (drum !== null && drum.beatDirs === null && drum !== this.rolloverDrum) {
        this.sounds.rollover.play();
        drum.beatLast = 0;
      }
      this.rolloverDrum = drum;
    }
  }
};

GameState.prototype.moveTheBeat = function(beats, drums) {
  this.timeAccumMS += this.game.time.elapsedMS;
  if (this.timeAccumMS > msPerMinibeat(this.BPM)) {
    this.timeAccumMS = this.timeAccumMS % msPerMinibeat(this.BPM);
    this.beatStep++;
    this.updateStepText();
    this.metroPulse = true;
    this.metroPulseTime = 0;
    if (this.solutionBeat === 0) {
      this.solutionDrums.removeAll(true);
    }
    var i;
    for (i = 0; i < beats.length; i++) {
      beats.getAt(i).updateBeat();
    }
    for (i = 0; i < drums.length; i++) {
      var drum = drums.getAt(i);
      drum.updateBeat();
    }

    return true;
  }
  return false;
};

GameState.prototype.moveBeatAndHitDrums = function(beats, drums) {
  if (this.moveTheBeat(beats, drums) || this.playAnyway) {
    var i;
    var drum;
    // Check collisions between beats and drums
    // Activate drums that collide with beats
    for (i = 0; i < drums.length; i++) {
      drum = drums.getAt(i);
      var drumGrid = p2g(drum);
      for (var j = 0; j < beats.length; j++) {
        var beat = beats.getAt(j);
        var beatGrid = p2g(beat);
        if (drumGrid.x == beatGrid.x && drumGrid.y == beatGrid.y) {
          drum.hit = true;
          // Check if this is a bouncy drum
          // Change the beat direction
          if (drum.bounceDir !== null) {
            beat.vel = drum.bounceDir;
          }
          break;
        }
      }
    }
    
    // Hit drums that have been hit with beats, or beat themselves
    for (i = 0; i < drums.length; i++) {
      drum = drums.getAt(i);
      if (drum.hit) {
        if (this.tutorialActive && drum.name === 'SD') {
          this.tutorialSawHit = true;
        }
        drum.play(this.timeAccumMS);
      }
    }
    this.playAnyway = false;
    return true;
  }
  return false;
};

GameState.prototype.win = function() {
  this.game.canvas.style.cursor = "pointer";
  this.sounds.win.play('', 0, 0.3);
  this.hasWon = true;
  if (this.levelIndex > this.unlockedScreenIndex) {
    this.unlockedScreenIndex = this.levelIndex;
    this.saveProgress();
    this.refreshLevelSelect();
  }
  // Add win squares all around
  var solutionXMin = Math.floor((GRID_SIZE - this.correctSolution.length) / 2);
  var solutionXMax = solutionXMin + this.correctSolution.length;
  for (var x = 0; x < GRID_SIZE; x++) {
    for (var y = 0; y < GRID_SIZE; y++) {
      if (x === 0 || y === 0 || x === GRID_SIZE - 1 ||
          (y === GRID_SIZE - 1 && (x < solutionXMin || x >= solutionXMax))) {  
        var pixel = g2p({x:x, y:y});
        var sd = this.solutionDrums.add(new Phaser.Sprite(
          this.game, pixel.x, pixel.y, 'good'));
        sd.width = PIXEL_SIZE;
        sd.height = PIXEL_SIZE;
      }
    }
  }
};

GameState.prototype.update = function() {
  // Update FPS
  /*if (this.game.time.fps !== 0) {
    this.fpsText.setText(this.game.time.fps + ' FPS');
  }*/
  this.updateMetronomeVisual();
  this.updateTutorial();
  
  if (!this.hasWon) {
    this.dragAndInput();

    // If we're listening to solution, update those beats only
    if (this.solutionBeats.length !== 0) {
      this.moveBeatAndHitDrums(this.solutionBeats,
                               this.correctSolutionDrums);
      // Special for solution:
      // destroy beats if they are outside solution area
      var sRect = getSolutionRect(this.solutionRows,
                                  this.correctSolution.length);
      if (this.solutionBeats.getAt(0).x >= sRect.x + sRect.width) {
        this.solutionBeats.removeAll(true);
        if (this.loopSolution) {
          this.startSolutionPlayback(false);
        }
      }
    } else {
      if (this.moveBeatAndHitDrums(this.beats, this.drums)) {
        var i;
        var j;
        // Check solution too
        var beats = [];
        for (i = 0; i < this.drums.length; i++) {
          drum = this.drums.getAt(i);
          if (drum.hit) {
            beats.push(drum.name);
          }
        }
        
        // Add the drums beaten this beat
        this.solution.push(beats);
        // Check our solution so far
        var ourBeats = this.solution[this.solutionBeat].sort();
        var correctBeats = [];
        var isCorrect = true;
        for (j = 0; j < this.correctSolution[this.solutionBeat].length; j++) {
          correctBeats.push(this.correctSolution[this.solutionBeat][j].basename);
        }
        correctBeats = correctBeats.sort();
        if (ourBeats.length != correctBeats.length) {
          isCorrect = false;
        } else {
          for (j = 0; j < correctBeats.length; j++) {
            if (ourBeats[j] != correctBeats[j]) {
              isCorrect = false;
            }
          }
        }
        // Add a sprite showing whether these beats are correct
        var x = (GRID_SIZE - this.correctSolution.length) / 2 + this.solutionBeat;
        var y = GRID_SIZE - this.solutionRows - 1;
        var pixel = g2p({x:x, y:y});
        var sd = this.solutionDrums.add(new Phaser.Sprite(
          this.game, pixel.x, pixel.y, isCorrect ? 'good' : 'bad'));
        sd.width = PIXEL_SIZE;
        sd.height = PIXEL_SIZE;
        if (!isCorrect) {
          this.isCorrect = false;
        }
        this.solutionBeat++;
        if (this.solutionBeat == this.correctSolution.length) {
          if (this.alwaysWin) {
            this.isCorrect = true;
          }
          if (this.isCorrect && !this.hasWon) {
            this.win();
          } else {
            this.solution = [];
            this.isCorrect = true;
            this.solutionBeat = 0;
          }
        }
      }
    }
  } else {
    // keep the beat
    this.moveBeatAndHitDrums(this.beats, this.drums);
    
    // Move to next level
    if (this.game.input.activePointer.justPressed()) {
      this.levelIndex++;
      if (this.levelIndex > this.unlockedScreenIndex) {
        this.unlockedScreenIndex = Math.min(this.levelIndex, levels.length - 1);
        this.saveProgress();
      }
      console.log("Loading level " + this.levelIndex);
      this.loadLevel(levels[this.levelIndex]);
      this.sounds.newLevel.play('', 0, 0.3);
      this.refreshLevelSelect();
    }
  }
};
