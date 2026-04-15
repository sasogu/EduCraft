const gridContainer = document.getElementById('grid-container');
const playPauseButton = document.getElementById('play-pause-button');
const clearButton = document.getElementById('clear-button');
const randomizeButton = document.getElementById('randomize-button');
const tempoSlider = document.getElementById('tempo-slider');
const tempoValue = document.getElementById('tempo-value');
const tonicSelect = document.getElementById('tonic-select');
const scaleSelect = document.getElementById('scale-select');
const noteCountSelect = document.getElementById('note-count-select');
const pulseCountSelect = document.getElementById('pulse-count-select');
const instrumentSelect = document.getElementById('instrument-select');
const articulationSelect = document.getElementById('articulation-select');
const languageSelect = document.getElementById('language-select');
const downloadButton = document.getElementById('download-button');
const controlsToggle = document.getElementById('controls-toggle');
const controlsContainer = document.getElementById('controls-container');
const playPauseLabel = document.getElementById('play-pause-label');
const helpButton = document.getElementById('help-button');
const helpOverlay = document.getElementById('help-overlay');
const helpClose = document.getElementById('help-close');
const exportOverlay = document.getElementById('export-overlay');
const exportProgress = document.getElementById('export-progress');
const exportPercent = document.getElementById('export-percent');
const installButton = document.getElementById('install-button');
const swVersionLabel = document.getElementById('sw-version');
const CONTROLS_STATE_KEY = 'edumelody.controls.collapsed';

let isPlaying = false;
let currentColumn = 0;
let audioContext;
let oscillators = [];
let oscillatorGains = [];
let synthNoteEndTimes = [];
let sfInstrument = null;
let sfInstrumentName = null;
let sfLoading = null;
let sfLoadToken = 0;
let activeNotes = [];

let playTimerId = null;

const grid = [];
let rows = 8;
let cols = 8;
let numCells = rows * cols;

let bpm = 120;
let interval = (60 / bpm) * 500;

const scales = {
  'Major':      [0, 2, 4, 5, 7, 9, 11, 12],
  'Minor':      [0, 2, 3, 5, 7, 8, 10, 12],
  // Compat: 'Pentatonic' era la pentatónica mayor.
  'Pentatonic': [0, 2, 4, 7, 9, 12],
  'PentatonicMajor': [0, 2, 4, 7, 9, 12],
  'PentatonicMinor': [0, 3, 5, 7, 10, 12],
  'Lydian':     [0, 2, 4, 6, 7, 9, 11, 12],
  'Mixolydian': [0, 2, 4, 5, 7, 9, 10, 12],
  'Dorian':     [0, 2, 3, 5, 7, 9, 10, 12],
  'Phrygian':   [0, 1, 3, 5, 7, 8, 10, 12],
  'Locrian':    [0, 1, 3, 5, 6, 8, 10, 12]
};

const tonics = {
  'C':  261.63,
  'C#': 277.18,
  'D':  293.66,
  'D#': 311.13,
  'E':  329.63,
  'F':  349.23,
  'F#': 369.99,
  'G':  392.00,
  'G#': 415.30,
  'A':  440.00,
  'A#': 466.16,
  'B':  493.88
};

let frequencies = calculateFrequencies('C', 'Major', rows);

const MAX_NOTE_LENGTH = 4;
const LONG_PRESS_MS = 450;
const SOUNDFONT_FORMATS = ['mp3', 'ogg'];
const OSC_FALLBACK_MAP = {
  acoustic_grand_piano: 'triangle',
  electric_piano_1: 'sine',
  acoustic_guitar_nylon: 'sine',
  violin: 'sawtooth',
  lead_1_square: 'square',
  viola: 'sawtooth',
  cello: 'sawtooth',
  acoustic_bass: 'square',
  string_ensemble_1: 'sawtooth',
  string_ensemble_2: 'sawtooth',
  flute: 'sine',
  piccolo: 'sine',
  oboe: 'sine',
  english_horn: 'sine',
  clarinet: 'sine',
  bassoon: 'square',
  trumpet: 'square',
  french_horn: 'square',
  trombone: 'square',
  tuba: 'square',
  timpani: 'triangle'
};

const INSTRUMENT_SEMITONE_SHIFT = {
  acoustic_bass: -12
};

function soundfontNameToUrl(name, soundfont, format) {
  const sf = soundfont || 'FluidR3_GM';
  const fmt = format || 'mp3';
  return `https://gleitz.github.io/midi-js-soundfonts/${sf}/${name}-${fmt}.js`;
}

const SYNTH_TYPES = new Set(['sine', 'triangle', 'square', 'sawtooth']);

function isSynthInstrument() {
  return SYNTH_TYPES.has(instrumentSelect.value);
}

function getOscillatorType() {
  if (isSynthInstrument()) return instrumentSelect.value;
  return OSC_FALLBACK_MAP[instrumentSelect.value] || 'triangle';
}

function getInstrumentSemitoneShift() {
  return INSTRUMENT_SEMITONE_SHIFT[instrumentSelect.value] || 0;
}

function applySemitoneShiftToFrequency(freq) {
  const shift = getInstrumentSemitoneShift();
  if (!shift) return freq;
  return freq * Math.pow(2, shift / 12);
}

function getArticulationMode() {
  return articulationSelect ? articulationSelect.value : 'sustain';
}

function getCell(row, col) {
  const cellIndex = row * cols + col;
  return grid[cellIndex] || null;
}

function setCellLength(cell, length) {
  cell.classList.remove('length-1', 'length-2', 'length-3', 'length-4');
  if (!length) {
    cell.classList.remove('highlighted');
    delete cell.dataset.length;
    return;
  }
  cell.classList.add('highlighted', `length-${length}`);
  cell.dataset.length = String(length);
}

function getCellLength(row, col) {
  const cell = getCell(row, col);
  if (!cell || !cell.classList.contains('highlighted')) return 0;
  const length = parseInt(cell.dataset.length || '1', 10);
  return Number.isNaN(length) ? 1 : length;
}

function isCellHighlighted(row, col) {
  return getCellLength(row, col) > 0;
}

function getRunLength(row, startCol) {
  let run = 1;
  for (let col = startCol + 1; col < cols; col++) {
    if (isCellHighlighted(row, col) && getCellLength(row, col) === 1) {
      run += 1;
    } else {
      break;
    }
  }
  return run;
}

function getSoundfontOptions(format) {
  return {
    soundfont: 'FluidR3_GM',
    format,
    nameToUrl: soundfontNameToUrl
  };
}

function getSoundfontFormatsForInstrument(instrumentName) {
  return SOUNDFONT_FORMATS;
}

function getSoundfontFamilyForInstrument(instrumentName) {
  return 'FluidR3_GM';
}

// Calculate frequencies based on tonic and scale
function calculateFrequencies(tonic, scale, noteCount) {
  const tonicFrequency = tonics[tonic];
  const intervals = scales[scale];
  const octaveCount = Math.ceil(noteCount / intervals.length);
  const expandedIntervals = [];

  for (let octave = 0; octave < octaveCount; octave++) {
    intervals.forEach(interval => expandedIntervals.push(interval + (12 * octave)));
  }

  return expandedIntervals
    .slice(0, noteCount)
    .map(interval => tonicFrequency * Math.pow(2, interval / 12))
    .reverse();
}

// Create the grid of cells
function createGrid() {
  for (let i = 0; i < numCells; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');

    let longPressTimer = null;
    let longPressTriggered = false;

    function clearLongPressTimer() {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }

    function handleShortPress() {
      const currentLength = cell.classList.contains('highlighted')
        ? parseInt(cell.dataset.length || '1', 10)
        : 0;
      const nextLength = currentLength >= MAX_NOTE_LENGTH ? 0 : currentLength + 1;
      setCellLength(cell, nextLength);
    }

    cell.addEventListener('pointerdown', event => {
      // Solo botón principal en ratón.
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      longPressTriggered = false;
      clearLongPressTimer();
      longPressTimer = setTimeout(() => {
        longPressTriggered = true;
        // Pulsación larga sobre una nota: eliminar directamente.
        if (cell.classList.contains('highlighted')) {
          setCellLength(cell, 0);
        }
      }, LONG_PRESS_MS);
    });

    cell.addEventListener('pointerup', () => {
      clearLongPressTimer();
      if (!longPressTriggered) {
        handleShortPress();
      }
    });

    cell.addEventListener('pointercancel', () => {
      clearLongPressTimer();
    });

    gridContainer.appendChild(cell);
    grid.push(cell);
  }
}

function applyGridStyles() {
  gridContainer.style.setProperty('--rows', rows);
  gridContainer.style.setProperty('--cols', cols);
  updateCellSize();
  updateGridAlignment();
}

function updateCellSize() {
  const styles = window.getComputedStyle(gridContainer);
  const baseValue = parseFloat(styles.getPropertyValue('--cell-base')) || 35;
  gridContainer.style.setProperty('--cell-size', `${baseValue}px`);
}

function updateGridAlignment() {
  const isDesktop = window.matchMedia('(min-width: 701px)').matches;
  const shouldCenter = isDesktop && cols <= 16;
  gridContainer.classList.toggle('grid-centered', shouldCenter);
}

function rebuildGrid() {
  gridContainer.innerHTML = '';
  grid.length = 0;
  numCells = rows * cols;
  applyGridStyles();
  createGrid();
  gridContainer.scrollLeft = 0;
}

// Start playing the grid
function playGrid() {
  // Asegura que no queden schedulers anteriores activos.
  if (playTimerId) {
    clearTimeout(playTimerId);
    playTimerId = null;
  }
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (window.Soundfont && !isSynthInstrument()) {
    const desiredName = instrumentSelect.value;

    // Si no está cargado el instrumento deseado, lánzalo en background.
    if (!sfInstrument || sfInstrumentName !== desiredName) {
      if (!sfLoading) {
        sfLoading = loadSoundfontInstrument(desiredName);
        sfLoading.catch(error => {
          console.error('Soundfont load failed, falling back to synth:', error);
          // Si no había ningún SF sonando, cae a synth para no quedar en silencio.
          if (!sfInstrument) {
            createOscillators();
          }
        });
      }

      // Si no hay ninguno cargado aún, espera a que cargue (o a fallback) y arranca.
      if (!sfInstrument) {
        sfLoading.then(() => {
          if (isPlaying) playNextColumn();
        }).catch(() => {
          if (isPlaying) playNextColumn();
        });
        return;
      }
      // Si ya hay uno cargado (aunque sea el anterior), sigue sonando con él.
    }

    playNextColumn();
    return;
  }
  createOscillators();
  playNextColumn();
}

// Stop playing the grid
function stopGrid() {
  if (playTimerId) {
    clearTimeout(playTimerId);
    playTimerId = null;
  }
  oscillators.forEach(osc => osc.stop());
  oscillators = [];
  oscillatorGains = [];
  synthNoteEndTimes = [];
  activeNotes.forEach(note => {
    if (note && typeof note.stop === 'function') {
      note.stop();
    }
  });
  activeNotes = [];
  grid.forEach(cell => cell.classList.remove('playing'));
  currentColumn = 0;
}

// Create oscillators for each frequency
function createOscillators() {
  oscillatorGains = [];
  synthNoteEndTimes = [];
  oscillators = frequencies.map(freq => {
    const osc = audioContext.createOscillator();
    osc.type = getOscillatorType();
    osc.frequency.setValueAtTime(0, audioContext.currentTime);
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0;
    osc.connect(gainNode).connect(audioContext.destination);
    osc.start();
    oscillatorGains.push(gainNode);
    synthNoteEndTimes.push(0);
    return osc;
  });
}

function loadSoundfontInstrument(instrumentName) {
  if (!window.Soundfont) return Promise.reject(new Error('Soundfont not available'));

  const desiredName = instrumentName || instrumentSelect.value;
  const token = ++sfLoadToken;

  return loadSoundfontInstrumentWithFallback(audioContext, desiredName)
    .then(instrument => {
      // Si el usuario cambió de instrumento mientras cargaba, ignora esta carga.
      if (token !== sfLoadToken) return instrument;

      sfInstrument = instrument;
      sfInstrumentName = desiredName;
      sfLoading = null;

      // Si veníamos de synth, para osciladores cuando ya hay SF.
      if (oscillators.length) {
        oscillators.forEach(osc => osc.stop());
        oscillators = [];
        oscillatorGains = [];
        synthNoteEndTimes = [];
      }
      return instrument;
    })
    .catch(error => {
      if (token === sfLoadToken) {
        sfLoading = null;
      }
      throw error;
    });
}

async function loadSoundfontInstrumentWithFallback(context, instrumentName) {
  let lastError = null;
  const formats = getSoundfontFormatsForInstrument(instrumentName);
  for (const format of formats) {
    try {
      return await window.Soundfont.instrument(context, instrumentName, {
        ...getSoundfontOptions(format),
        soundfont: getSoundfontFamilyForInstrument(instrumentName)
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Soundfont load failed');
}

function frequencyToMidi(freq) {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

// Play the next column in the grid
function playNextColumn() {
  if (!isPlaying) return;

  grid.forEach(cell => cell.classList.remove('playing'));

  const stepDuration = interval / 1000;
  if (sfInstrument) {
    const articulationMode = getArticulationMode();
    for (let row = 0; row < rows; row++) {
      const cell = getCell(row, currentColumn);
      if (!cell || !cell.classList.contains('highlighted')) continue;
      cell.classList.add('playing');

      const cellLength = getCellLength(row, currentColumn);
      let durationSteps = cellLength;

      if (articulationMode === 'sustain' && cellLength === 1) {
        const prevCol = currentColumn - 1;
        const prevHighlighted = prevCol >= 0 ? (getCellLength(row, prevCol) === 1) : false;
        if (prevHighlighted) continue;
        durationSteps = getRunLength(row, currentColumn);
      }

      const shiftedFrequency = applySemitoneShiftToFrequency(frequencies[row]);
      const midiNote = Math.max(0, Math.min(127, frequencyToMidi(shiftedFrequency)));
      const note = sfInstrument.play(midiNote, audioContext.currentTime, {
        duration: durationSteps * stepDuration,
        gain: 0.25
      });
      activeNotes.push(note);
    }
    if (activeNotes.length > rows * 8) {
      activeNotes = activeNotes.slice(-rows * 4);
    }
  } else {
    if (!oscillators.length && !sfLoading) {
      createOscillators();
    }
    const articulationMode = getArticulationMode();
    const now = audioContext.currentTime;
    for (let row = 0; row < rows; row++) {
      const cell = getCell(row, currentColumn);
      const osc = oscillators[row];
      if (!osc) continue;
      const gainNode = oscillatorGains[row];

      if (cell && cell.classList.contains('highlighted')) {
        const cellLength = getCellLength(row, currentColumn);
        let durationSteps = cellLength;

        if (articulationMode === 'sustain' && cellLength === 1) {
          const prevCol = currentColumn - 1;
          const prevHighlighted = prevCol >= 0 ? (getCellLength(row, prevCol) === 1) : false;
          if (prevHighlighted) {
            if (now >= (synthNoteEndTimes[row] || 0)) {
              if (gainNode) {
                gainNode.gain.cancelScheduledValues(now);
                gainNode.gain.setValueAtTime(0, now);
              }
            }
            continue;
          }
          durationSteps = getRunLength(row, currentColumn);
        }

        const duration = durationSteps * stepDuration;
        const shiftedFrequency = applySemitoneShiftToFrequency(frequencies[row]);
        osc.frequency.setValueAtTime(shiftedFrequency, now);
        synthNoteEndTimes[row] = now + duration;

        if (gainNode) {
          const attack = 0.01;
          const release = 0.03;
          gainNode.gain.cancelScheduledValues(now);
          gainNode.gain.setValueAtTime(0, now);
          gainNode.gain.linearRampToValueAtTime(0.1, now + attack);
          if (articulationMode === 'discrete') {
            gainNode.gain.setValueAtTime(0.1, Math.max(now + attack, now + duration - release));
            gainNode.gain.linearRampToValueAtTime(0, now + duration);
          } else {
            gainNode.gain.setValueAtTime(0.1, Math.max(now + attack, now + duration - release));
            gainNode.gain.linearRampToValueAtTime(0, now + duration);
          }
        }
        cell.classList.add('playing');
      } else {
        if (now >= (synthNoteEndTimes[row] || 0)) {
          osc.frequency.setValueAtTime(0, now);
          if (gainNode) {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(0, now);
          }
        }
      }
    }
  }

  const firstCellIndex = currentColumn;
  const firstCell = grid[firstCellIndex];
  if (firstCell) {
    const targetLeft = firstCell.offsetLeft - (gridContainer.clientWidth / 2) + (firstCell.offsetWidth / 2);
    gridContainer.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: cols <= 16 ? 'smooth' : 'auto'
    });
  }

  currentColumn = (currentColumn + 1) % cols;
  playTimerId = setTimeout(playNextColumn, interval);
}

// Clear the grid and stop playback
function clearGrid() {
  isPlaying = false;
  updatePlayPauseLabel();
  stopGrid();
  grid.forEach(cell => setCellLength(cell, 0));
}

// Update the tempo based on the slider value
function updateTempo() {
  bpm = tempoSlider.value;
  interval = (60 / bpm) * 500;
  tempoValue.textContent = bpm;
}

// Update frequencies based on selected tonic and scale
function updateKey() {
  frequencies = calculateFrequencies(tonicSelect.value, scaleSelect.value, rows);
}

// Randomize the highlighted notes on the grid
function randomizeGrid() {
  grid.forEach(cell => setCellLength(cell, 0));

  // Menos densidad + duraciones variables para melodías más naturales.
  // - `noteChance` controla cuántas columnas tienen nota.
  // - `gapSteps` fuerza al menos un pulso de silencio tras cada nota en la misma fila.
  const noteChance = 0.55;
  const gapSteps = 1;

  const rowBusyUntilCol = Array.from({ length: rows }, () => -1);
  let lastRow = Math.floor(rows / 2);

  function pickLength(maxLen) {
    // Pesos: más cortas que largas.
    const r = Math.random();
    if (r < 0.55) return Math.min(1, maxLen);
    if (r < 0.80) return Math.min(2, maxLen);
    if (r < 0.93) return Math.min(3, maxLen);
    return Math.min(4, maxLen);
  }

  function pickRow(freeRows) {
    // Sesgo suave hacia movimientos conjuntos (cercanos a la fila anterior).
    const weights = freeRows.map(r => {
      const d = Math.abs(r - lastRow);
      return 1 / (1 + d);
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let t = Math.random() * total;
    for (let i = 0; i < freeRows.length; i++) {
      t -= weights[i];
      if (t <= 0) return freeRows[i];
    }
    return freeRows[freeRows.length - 1];
  }

  for (let col = 0; col < cols; col++) {
    if (Math.random() > noteChance) continue;

    const freeRows = [];
    for (let row = 0; row < rows; row++) {
      if (col > rowBusyUntilCol[row]) freeRows.push(row);
    }
    if (!freeRows.length) continue;

    const row = pickRow(freeRows);
    const maxLen = Math.min(MAX_NOTE_LENGTH, cols - col);
    const length = pickLength(maxLen);

    const cell = getCell(row, col);
    if (!cell) continue;
    setCellLength(cell, length);

    // Bloquea la fila hasta que termine la nota + un pequeño silencio.
    rowBusyUntilCol[row] = col + length - 1 + gapSteps;
    lastRow = row;
  }
}

function getTotalDurationSeconds() {
  const secondsPerStep = interval / 1000;
  return Math.max(cols * secondsPerStep, secondsPerStep);
}

async function renderGridToBuffer() {
  const sampleRate = 44100;
  const secondsPerStep = interval / 1000;
  const totalDuration = getTotalDurationSeconds();
  const frameCount = Math.ceil(sampleRate * totalDuration);
  const offlineContext = new OfflineAudioContext(1, frameCount, sampleRate);
  const masterGain = offlineContext.createGain();
  masterGain.gain.value = 0.8;
  masterGain.connect(offlineContext.destination);

  const fadeTime = 0.01;
  let offlineInstrument = null;
  const articulationMode = getArticulationMode();

  if (window.Soundfont && !isSynthInstrument()) {
    try {
      offlineInstrument = await loadSoundfontInstrumentWithFallback(offlineContext, instrumentSelect.value);
    } catch (error) {
      console.error('Soundfont export failed, using synth fallback:', error);
      offlineInstrument = null;
    }
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cellLength = getCellLength(row, col);
      if (!cellLength) continue;

      if (articulationMode === 'sustain' && cellLength === 1) {
        const prevCol = col - 1;
        const prevHighlighted = prevCol >= 0 ? (getCellLength(row, prevCol) === 1) : false;
        if (prevHighlighted) continue;
      }

      const durationSteps = (articulationMode === 'sustain' && cellLength === 1)
        ? getRunLength(row, col)
        : cellLength;
      const startTime = col * secondsPerStep;
      const duration = durationSteps * secondsPerStep;
      const endTime = startTime + duration;

      if (offlineInstrument) {
        const shiftedFrequency = applySemitoneShiftToFrequency(frequencies[row]);
        const midiNote = Math.max(0, Math.min(127, frequencyToMidi(shiftedFrequency)));
        offlineInstrument.play(midiNote, startTime, {
          duration,
          gain: 0.3
        });
      } else {
        const osc = offlineContext.createOscillator();
        osc.type = getOscillatorType();
        const shiftedFrequency = applySemitoneShiftToFrequency(frequencies[row]);
        osc.frequency.setValueAtTime(shiftedFrequency, startTime);

        const gainNode = offlineContext.createGain();
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.1, startTime + fadeTime);
        gainNode.gain.setValueAtTime(0.1, Math.max(startTime + fadeTime, endTime - fadeTime));
        gainNode.gain.linearRampToValueAtTime(0, endTime);

        osc.connect(gainNode).connect(masterGain);
        osc.start(startTime);
        osc.stop(endTime);
      }
    }
  }

  return offlineContext.startRendering();
}

function encodeWav(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const numFrames = audioBuffer.length;
  const blockAlign = numChannels * bitDepth / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = audioBuffer.getChannelData(channel)[i];
      const clamped = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
      offset += 2;
    }
  }

  return buffer;
}

async function downloadWav() {
  if (!downloadButton) return;
  downloadButton.disabled = true;
  showExportOverlay();
  const progressStop = startExportProgress(getTotalDurationSeconds());
  try {
    const audioBuffer = await renderGridToBuffer();
    const wavData = encodeWav(audioBuffer);
    const blob = new Blob([wavData], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'edumelody.wav';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error('Error exporting WAV:', error);
  } finally {
    if (progressStop) progressStop();
    finishExportProgress();
    downloadButton.disabled = false;
  }
}

// Event listener for play/pause button
playPauseButton.addEventListener('click', () => {
  isPlaying = !isPlaying;
  updatePlayPauseLabel();
  if (isPlaying) playGrid();
  else stopGrid();
});

// Event listener for clear button
clearButton.addEventListener('click', clearGrid);

// Event listener for randomize button
randomizeButton.addEventListener('click', randomizeGrid);

if (downloadButton) {
  downloadButton.addEventListener('click', downloadWav);
}

if (helpButton) {
  helpButton.addEventListener('click', openHelp);
}

if (helpClose) {
  helpClose.addEventListener('click', closeHelp);
}

if (helpOverlay) {
  helpOverlay.addEventListener('click', (event) => {
    if (event.target === helpOverlay) {
      closeHelp();
    }
  });
}

document.addEventListener('keydown', (event) => {
  if (event.code !== 'Space') return;
  event.preventDefault();
  playPauseButton.click();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  closeHelp();
});

// Event listener for tempo slider
tempoSlider.addEventListener('input', () => {
  updateTempo();
  if (isPlaying) {
    stopGrid();
    playGrid();
  }
});

// Event listeners for tonic and scale changes
tonicSelect.addEventListener('change', updateKey);
scaleSelect.addEventListener('change', updateKey);

noteCountSelect.addEventListener('change', () => {
  const previousRows = rows;
  const previousCols = cols;
  const previousLengths = [];
  for (let row = 0; row < previousRows; row++) {
    previousLengths[row] = [];
    for (let col = 0; col < previousCols; col++) {
      previousLengths[row][col] = getCellLength(row, col);
    }
  }
  rows = parseInt(noteCountSelect.value, 10);
  frequencies = calculateFrequencies(tonicSelect.value, scaleSelect.value, rows);
  const wasPlaying = isPlaying;
  if (wasPlaying) {
    stopGrid();
  }
  rebuildGrid();
  for (let row = 0; row < Math.min(rows, previousRows); row++) {
    for (let col = 0; col < Math.min(cols, previousCols); col++) {
      const cell = getCell(row, col);
      if (cell) {
        setCellLength(cell, previousLengths[row][col]);
      }
    }
  }
  if (wasPlaying) {
    playGrid();
  }
});

pulseCountSelect.addEventListener('change', () => {
  const previousRows = rows;
  const previousCols = cols;
  const previousLengths = [];
  for (let row = 0; row < previousRows; row++) {
    previousLengths[row] = [];
    for (let col = 0; col < previousCols; col++) {
      previousLengths[row][col] = getCellLength(row, col);
    }
  }
  cols = parseInt(pulseCountSelect.value, 10);
  const wasPlaying = isPlaying;
  if (wasPlaying) {
    stopGrid();
  }
  rebuildGrid();
  for (let row = 0; row < Math.min(rows, previousRows); row++) {
    for (let col = 0; col < Math.min(cols, previousCols); col++) {
      const cell = getCell(row, col);
      if (cell) {
        setCellLength(cell, previousLengths[row][col]);
      }
    }
  }
  if (wasPlaying) {
    playGrid();
  }
});

instrumentSelect.addEventListener('change', () => {
  const desiredName = instrumentSelect.value;

  // Si pasamos a un instrumento synth, sí limpiamos el SF.
  if (isSynthInstrument()) {
    sfInstrument = null;
    sfInstrumentName = null;
    sfLoading = null;
    sfLoadToken += 1;

    if (isPlaying) {
      if (!oscillators.length) {
        createOscillators();
      }
      oscillators.forEach(osc => {
        osc.type = getOscillatorType();
      });
    }
    return;
  }

  // SoundFont: NO anulamos el instrumento actual para evitar que suenen
  // las primeras notas con synth mientras carga el nuevo.
  if (isPlaying) {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Dispara carga si es necesario.
    if (!sfInstrument || sfInstrumentName !== desiredName) {
      sfLoading = loadSoundfontInstrument(desiredName).catch(error => {
        console.error('Soundfont load failed, falling back to synth:', error);
        // Solo cae a synth si no hay un SF previo que mantener.
        if (!sfInstrument && !oscillators.length) {
          createOscillators();
        }
        sfLoading = null;
      });
    }
  }
});

function updatePlayPauseLabel() {
  const fallbackLabel = isPlaying ? 'Pause' : 'Play';
  const label = window.i18n && window.i18n.t ? window.i18n.t(isPlaying ? 'pause' : 'play') : fallbackLabel;
  if (playPauseLabel) {
    playPauseLabel.textContent = label;
  } else {
    playPauseButton.textContent = label;
  }
  playPauseButton.setAttribute('aria-label', label);
  playPauseButton.setAttribute('title', label);
  playPauseButton.classList.toggle('is-playing', isPlaying);
}

function updateControlsToggleLabel() {
  if (!controlsToggle || !window.i18n || !window.i18n.t) return;
  const isCollapsed = document.body.classList.contains('controls-collapsed');
  controlsToggle.textContent = window.i18n.t(isCollapsed ? 'controlsShow' : 'controlsHide');
}

function openHelp() {
  if (!helpOverlay) return;
  helpOverlay.classList.add('is-visible');
  helpOverlay.setAttribute('aria-hidden', 'false');
}

function closeHelp() {
  if (!helpOverlay) return;
  helpOverlay.classList.remove('is-visible');
  helpOverlay.setAttribute('aria-hidden', 'true');
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(() => {
      if (!swVersionLabel) return;
      navigator.serviceWorker.ready.then(reg => {
        const active = reg.active || reg.waiting || reg.installing;
        if (!active) return;
        const channel = new MessageChannel();
        channel.port1.onmessage = event => {
          if (event.data && event.data.version) {
            swVersionLabel.textContent = `SW ${event.data.version}`;
          }
        };
        active.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
      });
    }).catch(error => {
      console.error('Service worker registration failed:', error);
    });
  });
}

function initInstallPrompt() {
  if (!installButton) return;
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    installButton.hidden = false;
  });

  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      deferredPrompt = null;
      installButton.hidden = true;
    }
  });
}

function showExportOverlay() {
  if (!exportOverlay || !exportProgress || !exportPercent) return;
  exportProgress.style.width = '0%';
  exportPercent.textContent = '0';
  exportOverlay.classList.add('is-visible');
  exportOverlay.setAttribute('aria-hidden', 'false');
}

function updateExportProgress(value) {
  if (!exportProgress || !exportPercent) return;
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  exportProgress.style.width = `${clamped}%`;
  exportPercent.textContent = String(clamped);
}

function startExportProgress(totalSeconds) {
  if (!exportOverlay) return null;
  const startTime = performance.now();
  const targetMs = Math.max(1200, totalSeconds * 1000 * 0.6);
  const timer = setInterval(() => {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(90, (elapsed / targetMs) * 90);
    updateExportProgress(progress);
  }, 120);
  return () => clearInterval(timer);
}

function finishExportProgress() {
  updateExportProgress(100);
  setTimeout(() => {
    if (!exportOverlay) return;
    exportOverlay.classList.remove('is-visible');
    exportOverlay.setAttribute('aria-hidden', 'true');
  }, 250);
}

function setControlsCollapsed(collapsed) {
  document.body.classList.toggle('controls-collapsed', collapsed);
  document.body.classList.toggle('controls-fixed', !collapsed);
  updateControlsToggleLabel();
  updateCellSize();
}

function initControlsToggle() {
  if (!controlsToggle || !controlsContainer) return;
  const isMobile = window.matchMedia('(max-width: 700px)').matches;
  let storedValue = null;
  try {
    storedValue = localStorage.getItem(CONTROLS_STATE_KEY);
  } catch (error) {
    storedValue = null;
  }
  const hasStored = storedValue === 'true' || storedValue === 'false';
  const initialCollapsed = hasStored ? storedValue === 'true' : isMobile;
  setControlsCollapsed(initialCollapsed);
  controlsToggle.addEventListener('click', () => {
    const isCollapsed = document.body.classList.contains('controls-collapsed');
    const nextCollapsed = !isCollapsed;
    setControlsCollapsed(nextCollapsed);
    try {
      localStorage.setItem(CONTROLS_STATE_KEY, String(nextCollapsed));
    } catch (error) {
      return;
    }
  });
}

function initLanguage() {
  if (!window.i18n || !languageSelect) return;
  const savedLanguage = window.i18n.getSavedLanguage();
  const initialLanguage = savedLanguage || window.i18n.getDefaultLanguage();
  window.i18n.setLanguage(initialLanguage);
  languageSelect.value = initialLanguage;
  updatePlayPauseLabel();
  updateControlsToggleLabel();
}

if (languageSelect) {
  languageSelect.addEventListener('change', () => {
    if (!window.i18n) return;
    window.i18n.setLanguage(languageSelect.value);
    window.i18n.saveLanguage(languageSelect.value);
    updatePlayPauseLabel();
    updateControlsToggleLabel();
  });
}

applyGridStyles();
createGrid();
updateTempo();
initLanguage();
initControlsToggle();
registerServiceWorker();
initInstallPrompt();

window.addEventListener('resize', () => {
  updateCellSize();
  updateGridAlignment();
  if (controlsToggle) {
    updateControlsToggleLabel();
  }
});
