(() => {
  const root = document.getElementById('sequencer-grid');
  if (!root) return;

  const dom = {
    bpm: document.getElementById('bpm'),
    bpmVal: document.getElementById('bpm-val'),
    signatureButtons: Array.from(document.querySelectorAll('.signature-btns button')),
    exampleButtons: Array.from(document.querySelectorAll('.example-btn')),
    beatIndicatorsHost: document.getElementById('beatIndicators'),
    measureCount: document.getElementById('measure-count'),
    infoBox: document.getElementById('info-box'),
    playBtn: document.getElementById('play-btn'),
    clearBtn: document.getElementById('clear-btn'),
  };

  // ---- i18n helper ----
  function t(key, params, fallback) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      const res = window.i18n.t(key, params);
      if (res && res !== key) return res;
    }
    return fallback != null ? fallback : key;
  }

  // ---- Audio engine (lazy, respects EduMusic volume) ----
  let audioCtx = null;
  let masterGain = null;
  let noiseBuffer = null;
  let lastKnownVolume = 0.7;

  function ensureAudio() {
    if (audioCtx && masterGain) return { audioCtx, masterGain };
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;

    audioCtx = new Ctx();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = lastKnownVolume;
    masterGain.connect(audioCtx.destination);

    // White noise buffer for snare/hat
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
    noiseBuffer = buffer;

    // Hook global volume controls if present
    if (window.Sfx && typeof window.Sfx.onGameVolumeChange === 'function') {
      window.Sfx.onGameVolumeChange((vol) => {
        const v = Number(vol);
        if (!Number.isFinite(v)) return;
        lastKnownVolume = v;
        if (masterGain) masterGain.gain.value = v;
      });
    }

    return { audioCtx, masterGain };
  }

  async function resumeAudioIfNeeded() {
    const a = ensureAudio();
    if (!a) return;
    if (audioCtx.state === 'suspended') {
      try { await audioCtx.resume(); } catch (_) {}
    }
  }

  function connectToMaster(node) {
    const a = ensureAudio();
    if (!a) return;
    node.connect(masterGain);
  }

  function makeSoftClipCurve(amount = 0.6, n = 2048) {
    // amount: 0..1 (higher = more drive)
    const k = Math.max(0, Math.min(1, Number(amount))) * 50;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / (n - 1) - 1;
      // Classic arctan soft-clip
      curve[i] = (1 + k) * x / (1 + k * Math.abs(x));
    }
    return curve;
  }

  function playKick(time) {
    const a = ensureAudio();
    if (!a) return;

    // A more kick-like synth: fast pitch drop + short click + gentle saturation.
    const kickBus = audioCtx.createGain();
    kickBus.gain.setValueAtTime(1, time);
    connectToMaster(kickBus);

    // Body (sub)
    const bodyOsc = audioCtx.createOscillator();
    bodyOsc.type = 'sine';
    const bodyGain = audioCtx.createGain();
    bodyGain.gain.setValueAtTime(0.0001, time);
    bodyGain.gain.exponentialRampToValueAtTime(1.0, time + 0.005);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);

    bodyOsc.frequency.setValueAtTime(170, time);
    bodyOsc.frequency.exponentialRampToValueAtTime(60, time + 0.06);
    bodyOsc.frequency.exponentialRampToValueAtTime(45, time + 0.25);

    const shaper = audioCtx.createWaveShaper();
    shaper.curve = makeSoftClipCurve(0.55);
    shaper.oversample = '4x';

    bodyOsc.connect(shaper);
    shaper.connect(bodyGain);
    bodyGain.connect(kickBus);

    // Punch (adds a bit of mid, helps small speakers)
    const punchOsc = audioCtx.createOscillator();
    punchOsc.type = 'triangle';
    const punchGain = audioCtx.createGain();
    punchGain.gain.setValueAtTime(0.0001, time);
    punchGain.gain.exponentialRampToValueAtTime(0.28, time + 0.004);
    punchGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
    punchOsc.frequency.setValueAtTime(260, time);
    punchOsc.frequency.exponentialRampToValueAtTime(110, time + 0.03);
    punchOsc.connect(punchGain);
    punchGain.connect(kickBus);

    // Click (very short, filtered noise)
    if (noiseBuffer) {
      const clickSrc = audioCtx.createBufferSource();
      clickSrc.buffer = noiseBuffer;
      const clickFilter = audioCtx.createBiquadFilter();
      clickFilter.type = 'highpass';
      clickFilter.frequency.value = 2500;
      const clickGain = audioCtx.createGain();
      clickGain.gain.setValueAtTime(0.0001, time);
      clickGain.gain.exponentialRampToValueAtTime(0.22, time + 0.001);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);
      clickSrc.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(kickBus);
      clickSrc.start(time);
      clickSrc.stop(time + 0.03);
    }

    bodyOsc.start(time);
    punchOsc.start(time);
    bodyOsc.stop(time + 0.4);
    punchOsc.stop(time + 0.12);
  }

  function playSnare(time) {
    const a = ensureAudio();
    if (!a || !noiseBuffer) return;

    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    noise.connect(noiseFilter);

    const noiseEnvelope = audioCtx.createGain();
    noiseFilter.connect(noiseEnvelope);
    connectToMaster(noiseEnvelope);

    noiseEnvelope.gain.setValueAtTime(1, time);
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

    noise.start(time);
    noise.stop(time + 0.2);
  }

  function playHiHat(time) {
    const a = ensureAudio();
    if (!a || !noiseBuffer) return;

    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 7000;
    noise.connect(noiseFilter);

    const noiseEnvelope = audioCtx.createGain();
    noiseFilter.connect(noiseEnvelope);
    connectToMaster(noiseEnvelope);

    noiseEnvelope.gain.setValueAtTime(0.3, time);
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    noise.start(time);
    noise.stop(time + 0.05);
  }

  const instruments = [
    { key: 'kick', labelKey: 'cajaritmos.instrument.kick', play: playKick },
    { key: 'snare', labelKey: 'cajaritmos.instrument.snare', play: playSnare },
    { key: 'hihat', labelKey: 'cajaritmos.instrument.hihat', play: playHiHat },
  ];

  // ---- Sequencer state ----
  let bpm = 120;
  let currentSignature = 4; // 2,3,4,6
  let currentStep = 0;
  let isPlaying = false;
  let pattern = instruments.map(() => Array(16).fill(false));
  let timerId = null;
  let measureCount = 1;

  const examples = {
    rock: {
      signature: 4,
      patterns: [
        [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
        [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
        [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
      ],
    },
    waltz: {
      signature: 3,
      patterns: [
        // Classic 3/4: "oom-pah-pah"
        // 1: kick, 2-3: snare (chord feel), hi-hat on eighth notes.
        [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, false, false, true, false, false, false, true, false, false, false, false, false, false, false],
        [true, false, true, false, true, false, true, false, true, false, true, false, false, false, false, false],
      ],
    },
    march: {
      signature: 2,
      patterns: [
        [true, false, false, false, true, false, false, false, false, false, false, false, false, false, false, false],
        [false, false, true, false, false, false, true, false, false, false, false, false, false, false, false, false],
        [true, true, true, true, true, true, true, true, false, false, false, false, false, false, false, false],
      ],
    },
    compound: {
      signature: 6,
      patterns: [
        [true, false, false, false, false, false, true, false, false, false, false, false, false, false, false, false],
        [false, false, false, true, false, false, false, false, false, true, false, false, false, false, false, false],
        [true, false, false, true, false, false, true, false, false, true, false, false, false, false, false, false],
      ],
    },
  };

  function stepsInMeasure() {
    return currentSignature === 6 ? 12 : currentSignature * 4;
  }

  function beatIndexForStep(step) {
    // visual metronome highlights beats (top number)
    if (currentSignature === 6) {
      // 6/8: beat = eighth note => 2 sixteenth steps
      return Math.floor(step / 2) % 6;
    }
    // 2/4,3/4,4/4: beat = quarter note => 4 sixteenth steps
    return Math.floor(step / 4) % currentSignature;
  }

  function updateCellStyling(cell, stepIndex) {
    const maxSteps = stepsInMeasure();
    const accentEvery = currentSignature === 6 ? 6 : 4;

    cell.classList.remove('disabled', 'accent');

    if (stepIndex >= maxSteps) cell.classList.add('disabled');

    if (stepIndex % accentEvery === 0 && stepIndex < maxSteps) cell.classList.add('accent');
  }

  function rebuildBeatIndicators() {
    if (!dom.beatIndicatorsHost) return;
    dom.beatIndicatorsHost.innerHTML = '';
    const count = currentSignature; // 2,3,4,6
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'beat-indicator';
      el.dataset.beat = String(i);
      dom.beatIndicatorsHost.appendChild(el);
    }
  }

  function setInfoMessage() {
    if (!dom.infoBox) return;
    const key = `cajaritmos.info.${currentSignature}`;
    // This string is owned by us (i18n bundle) and includes <strong> markup.
    dom.infoBox.innerHTML = t(key, null, dom.infoBox.innerHTML);
  }

  function initGrid() {
    root.innerHTML = '';
    instruments.forEach((inst, instIdx) => {
      const row = document.createElement('div');
      row.className = 'sequencer-row';

      const label = document.createElement('div');
      label.className = 'instrument-label';
      label.textContent = t(inst.labelKey, null, inst.key);
      row.appendChild(label);

      const grid = document.createElement('div');
      grid.className = 'grid';

      for (let i = 0; i < 16; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.inst = String(instIdx);
        cell.dataset.step = String(i);

        if (pattern[instIdx][i]) cell.classList.add('active');
        updateCellStyling(cell, i);

        cell.addEventListener('click', async () => {
          await resumeAudioIfNeeded();
          const maxSteps = stepsInMeasure();
          if (i >= maxSteps) return;
          pattern[instIdx][i] = !pattern[instIdx][i];
          cell.classList.toggle('active');
          if (pattern[instIdx][i]) inst.play(audioCtx.currentTime);
        });

        grid.appendChild(cell);
      }

      row.appendChild(grid);
      root.appendChild(row);
    });
  }

  function updateUIForSignature() {
    document.querySelectorAll('.cell').forEach((cell) => {
      updateCellStyling(cell, Number(cell.dataset.step));
    });
    rebuildBeatIndicators();
    setInfoMessage();
  }

  function clearPlayingVisuals() {
    document.querySelectorAll('.cell.playing').forEach((c) => c.classList.remove('playing'));
    document.querySelectorAll('.beat-indicator').forEach((ind) => ind.classList.remove('strong', 'weak'));
  }

  function highlightStep(step) {
    document.querySelectorAll('.cell.playing').forEach((c) => c.classList.remove('playing'));
    document.querySelectorAll(`.cell[data-step="${step}"]`).forEach((c) => {
      if (!c.classList.contains('disabled')) c.classList.add('playing');
    });
  }

  function highlightBeat(beatIdx) {
    const indicators = Array.from(document.querySelectorAll('.beat-indicator'));
    indicators.forEach((ind, idx) => {
      ind.classList.remove('strong', 'weak');
      if (idx === beatIdx) ind.classList.add(idx === 0 ? 'strong' : 'weak');
    });
  }

  function playLoop() {
    if (!isPlaying) return;

    const maxSteps = stepsInMeasure();
    const secondsPerBeat = 60 / bpm;

    // Each step represents a sixteenth note.
    const secondsPerStep = secondsPerBeat / 4;

    highlightStep(currentStep);

    instruments.forEach((inst, idx) => {
      if (pattern[idx][currentStep] && currentStep < maxSteps) {
        inst.play(audioCtx.currentTime);
      }
    });

    highlightBeat(beatIndexForStep(currentStep));

    if (currentStep === maxSteps - 1) {
      measureCount += 1;
      if (dom.measureCount) dom.measureCount.textContent = String(measureCount);
    }

    currentStep = (currentStep + 1) % maxSteps;
    timerId = window.setTimeout(playLoop, secondsPerStep * 1000);
  }

  function setPlaying(nextPlaying) {
    isPlaying = Boolean(nextPlaying);
    if (!dom.playBtn) return;

    dom.playBtn.classList.toggle('playing', isPlaying);
    dom.playBtn.textContent = isPlaying ? `⏸ ${t('cajaritmos.transport.stop', null, 'Detener')}` : `▶ ${t('cajaritmos.transport.play', null, 'Iniciar')}`;
  }

  function stop() {
    setPlaying(false);
    if (timerId) window.clearTimeout(timerId);
    timerId = null;
    clearPlayingVisuals();
  }

  async function start() {
    await resumeAudioIfNeeded();
    if (!audioCtx) return;
    currentStep = 0;
    measureCount = 1;
    if (dom.measureCount) dom.measureCount.textContent = String(measureCount);
    setPlaying(true);
    playLoop();
  }

  // ---- Wire UI ----
  if (dom.bpm) {
    dom.bpm.addEventListener('input', () => {
      bpm = Number(dom.bpm.value) || 120;
      if (dom.bpmVal) dom.bpmVal.textContent = String(bpm);
    });
  }

  dom.signatureButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      dom.signatureButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentSignature = Number(btn.dataset.sig) || 4;
      currentStep = 0;
      stop();
      updateUIForSignature();
    });
  });

  dom.exampleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const exampleName = btn.dataset.example;
      const example = examples[exampleName];
      if (!example) return;

      currentSignature = example.signature;
      dom.signatureButtons.forEach((b) => {
        b.classList.toggle('active', Number(b.dataset.sig) === currentSignature);
      });

      pattern = example.patterns.map((row) => row.slice());
      stop();
      initGrid();
      updateUIForSignature();
    });
  });

  if (dom.playBtn) {
    dom.playBtn.addEventListener('click', async () => {
      if (isPlaying) stop();
      else await start();
    });
  }

  if (dom.clearBtn) {
    dom.clearBtn.addEventListener('click', () => {
      pattern = instruments.map(() => Array(16).fill(false));
      stop();
      initGrid();
      updateUIForSignature();
    });
  }

  // Stop if tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isPlaying) stop();
  });

  // Re-apply translated labels when language changes
  if (window.i18n && typeof window.i18n.onChange === 'function') {
    window.i18n.onChange(() => {
      initGrid();
      setInfoMessage();
      setPlaying(isPlaying);
    });
  }

  // ---- Initial render ----
  if (dom.bpmVal) dom.bpmVal.textContent = String(bpm);
  if (dom.bpm) dom.bpm.value = String(bpm);

  rebuildBeatIndicators();
  initGrid();
  updateUIForSignature();
})();
