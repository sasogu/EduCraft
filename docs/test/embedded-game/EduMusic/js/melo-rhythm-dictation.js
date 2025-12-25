(() => {
  const ui = {
    scoreEl: document.getElementById('score'),
    livesEl: document.getElementById('lives'),
    startBtn: document.getElementById('startBtn'),
    repeatBtn: document.getElementById('repeatBtn'),
    optionsSel: document.getElementById('optionsSelect'),
    speedSel: document.getElementById('speedSelect'),
    viewSel: document.getElementById('viewSelect'),
    feedback: document.getElementById('feedback'),
    grid: document.getElementById('optionGrid'),
  };

  const audio = { ctx: null };
  const sampleCache = new Map();
  function playError() {
    if (window.Sfx && typeof window.Sfx.error === 'function') {
      window.Sfx.error();
    }
  }

  function playSuccess() {
    if (window.Sfx && typeof window.Sfx.success === 'function') {
      window.Sfx.success();
    }
  }
  const state = {
    running: false,
    locked: false,
    score: 0,
    lives: 3,
    isPlayingAudio: false,
    optionsCount: 3,
    currentPattern: null,
    currentKey: null,
    options: [],
    disabledOptions: new Set(),
    lastSelection: null,
    feedback: 'welcome',
    includeLa: false,
    includeDo: false,
    includeFa: false,
    includeRe: false,
    includeSi: false,
    includeRest: false,
    includeHalf: false,
    lastUnlock: null,
    viewMode: 'names',
    speed: 'normal',
    speedFactor: 1,
  };

  const SCOREBOARD_ID = 'melody-rhythm';
  function showScoreboardPrompt(score) {
    const finalScore = Number(score) || 0;
    if (finalScore <= 0) return;
    if (window.GameOverOverlay && typeof window.GameOverOverlay.show === 'function') {
      window.GameOverOverlay.show({
        gameId: SCOREBOARD_ID,
        score: finalScore,
        onRetry: () => startGame(),
      });
      return;
    }
    if (window.ScoreService) {
      window.ScoreService.showSave(SCOREBOARD_ID, finalScore);
    }
  }
  function hideScoreboardPrompt() {
    if (window.GameOverOverlay && typeof window.GameOverOverlay.isOpen === 'function' && window.GameOverOverlay.isOpen()) {
      window.GameOverOverlay.hide();
    }
    if (window.ScoreService) {
      window.ScoreService.hideSave(SCOREBOARD_ID);
    }
  }

  const BASE_TEMPO_BPM = 96;
  const BASE_BEAT_MS = (60 / BASE_TEMPO_BPM) * 1000;
  const SPEED_FACTORS = {
    slow: 0.75,
    normal: 1,
    fast: 1.3,
  };
  const SAMPLE_BASE_PATH = '../assets/piano/';
  const SAMPLE_PLAYBACK_RATE = 2;

  const PITCH_DATA = {
    MI: { id: 'MI', label: 'MI', className: 'mi', freq: 329.63, sample: 'key11.ogg' },
    SOL: { id: 'SOL', label: 'SOL', className: 'sol', freq: 392.0, sample: 'key14.ogg' },
    LA: { id: 'LA', label: 'LA', className: 'la', freq: 440.0, sample: 'key16.ogg' },
    DO: { id: 'DO', label: 'DO', className: 'do', freq: 261.63, sample: 'key07.ogg' },
    FA: { id: 'FA', label: 'FA', className: 'fa', freq: 349.23, sample: 'key12.ogg' },
    RE: { id: 'RE', label: 'RE', className: 're', freq: 293.66, sample: 'key09.ogg' },
    SI: { id: 'SI', label: 'SI', className: 'si', freq: 493.88, sample: 'key18.ogg' },
  };

  const FIGURE_DATA = {
    quarter: { id: 'quarter', beats: 1, symbol: '♩', rest: false, announce: 'negra' },
    eighthPair: { id: 'eighthPair', beats: 1, symbol: '♫', rest: false, announce: 'dos corcheas' },
    quarterRest: { id: 'quarterRest', beats: 1, symbol: '𝄽', rest: true, announce: 'silencio de negra' },
    half: { id: 'half', beats: 2, symbol: '𝅗𝅥', rest: false, announce: 'blanca' },
  };

  const STAFF_CONF = {
    width: 240,
    height: 90,
    paddingX: 18,
    paddingY: 16,
    spacingY: 9,
  };

  const STAFF_POSITIONS = {
    MI: 4,
    SOL: 3,
    LA: 2.5,
    FA: 3.5,
    DO: 5,
    RE: 4.5,
    SI: 2,
  };

  const BASE_PITCH_SEQ = ['SOL', 'MI'];
  const THRESHOLD_UNLOCKS = {
    LA: 5,
    DO: 10,
    FA: 15,
    RE: 20,
    SI: 25,
  };
  const FIGURE_THRESHOLDS = {
    quarterRest: 12,
    half: 18,
  };

  const SAMPLE_GAIN_NORMAL = 0.9;
  const SAMPLE_GAIN_ACCENT = 1.1;
  const OSC_PEAK_NORMAL = 0.2;
  const OSC_PEAK_ACCENT = 0.26;

  const FEEDBACK_FALLBACK = {
    welcome: 'Pulsa Iniciar para comenzar un nuevo dictado.',
    listen: 'Escucha el patrón y elige la opción correcta.',
    correct: '¡Correcto! Prepárate para el siguiente patrón.',
    wrong: 'Casi... Escucha de nuevo y vuelve a intentarlo.',
    gameover: 'Juego terminado. Pulsa Iniciar para practicar de nuevo.',
    unlock: '¡Nuevo desbloqueo!',
  };

  const clamp01 = (v) => {
    const num = Number(v);
    if (!Number.isFinite(num)) return 0;
    return Math.min(1, Math.max(0, num));
  };

  function currentGameVolume() {
    if (window.Sfx) {
      if (typeof window.Sfx.getGameVolume === 'function') {
        const val = window.Sfx.getGameVolume();
        if (Number.isFinite(val)) return clamp01(val);
      }
      if (typeof window.Sfx.getState === 'function') {
        const s = window.Sfx.getState();
        if (s) {
          if (s.muted) return 0;
          if (s.volumeGame != null) return clamp01(s.volumeGame);
          if (s.volumeSfx != null) return clamp01(s.volumeSfx);
        }
      }
    }
    return 1;
  }

  function fmt(key, params) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key, params);
    }
    return null;
  }

  function ensureAudio() {
    if (!audio.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audio.ctx = new AC();
    }
    if (audio.ctx && audio.ctx.state === 'suspended') {
      audio.ctx.resume().catch(() => {});
    }
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function beatMs() {
    const factor = state.speedFactor || 1;
    return BASE_BEAT_MS / factor;
  }

  function getSampleEntry(pitchId) {
    const meta = PITCH_DATA[pitchId];
    if (!meta) return null;
    if (!sampleCache.has(pitchId)) {
      sampleCache.set(pitchId, {
        buffer: null,
        loading: null,
        error: null,
        sample: meta.sample,
      });
    }
    return sampleCache.get(pitchId);
  }

  function decodeBuffer(ctx, data) {
    return new Promise((resolve, reject) => {
      try {
        ctx.decodeAudioData(data, resolve, reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  async function loadSample(pitchId) {
    const entry = getSampleEntry(pitchId);
    ensureAudio();
    const ctx = audio.ctx;
    if (!entry || !ctx) return null;
    if (entry.buffer) return entry.buffer;
    if (entry.loading) return entry.loading;
    const src = SAMPLE_BASE_PATH + entry.sample;
    entry.loading = fetch(src)
      .then((resp) => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.arrayBuffer();
      })
      .then((data) => decodeBuffer(ctx, data))
      .then((buffer) => {
        entry.buffer = buffer;
        entry.loading = null;
        entry.error = null;
        return buffer;
      })
      .catch((err) => {
        entry.error = err;
        entry.loading = null;
        console.warn('[melody-rhythm] Error loading sample', pitchId, err);
        return null;
      });
    return entry.loading;
  }

  async function playPitch(pitchId, beats, accent = false) {
    ensureAudio();
    const ctx = audio.ctx;
    const durationMs = beats * beatMs();
    const durationSec = durationMs / 1000;
    if (!ctx) {
      await wait(durationMs);
      return;
    }
    const buffer = await loadSample(pitchId);
    const targetGain = accent ? SAMPLE_GAIN_ACCENT : SAMPLE_GAIN_NORMAL;
    const mixVolume = currentGameVolume();
    const scaledGain = targetGain * mixVolume;
    if (buffer) {
      try {
        const now = ctx.currentTime;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = SAMPLE_PLAYBACK_RATE;
        const sustain = Math.max(0.35, durationSec);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(scaledGain, now);
        source.connect(gain).connect(ctx.destination);
        source.start(now);
        source.stop(now + sustain);
      } catch (err) {
        console.warn('[melody-rhythm] Unable to play sample', pitchId, err);
      }
    } else {
      // Fallback oscillator
      const freq = (PITCH_DATA[pitchId] && PITCH_DATA[pitchId].freq) || 440;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      const peak = (accent ? OSC_PEAK_ACCENT : OSC_PEAK_NORMAL) * mixVolume;
      gain.gain.linearRampToValueAtTime(peak, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + durationSec + 0.2);
    }
    await wait(durationMs);
  }

  function availablePitchIds() {
    const list = new Set(['MI', 'SOL']);
    if (state.includeLa) list.add('LA');
    if (state.includeDo) list.add('DO');
    if (state.includeFa) list.add('FA');
    if (state.includeRe) list.add('RE');
    if (state.includeSi) list.add('SI');
    return Array.from(list);
  }

  function availableFigures() {
    const list = ['quarter', 'eighthPair'];
    if (state.includeRest) list.push('quarterRest');
    if (state.includeHalf) list.push('half');
    return list.map((id) => FIGURE_DATA[id]);
  }

  function randomOf(array) {
    if (!array.length) return null;
    const idx = Math.floor(Math.random() * array.length);
    return array[idx];
  }

  function generatePattern() {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const pattern = [];
      let beats = 0;
      while (beats < 4) {
        const remaining = 4 - beats;
        const figures = availableFigures().filter((fig) => fig.beats <= remaining);
        if (!figures.length) break;
        const figure = randomOf(figures);
        const event = { type: figure.id, beats: figure.beats };
        if (!figure.rest) {
          const pitches = availablePitchIds();
          if (!pitches.length) break;
          if (figure.id === 'eighthPair') {
            event.pitches = [randomOf(pitches), randomOf(pitches)];
          } else {
            event.pitches = [randomOf(pitches)];
          }
        } else {
          event.pitches = [];
        }
        pattern.push(event);
        beats += figure.beats;
      }
      if (beats === 4 && pattern.length) return pattern;
    }
    return [];
  }

  function patternKey(pattern) {
    return pattern.map((event) => `${event.type}:${(event.pitches || []).join(',')}`).join('|');
  }

  function describeEvent(event) {
    const figure = FIGURE_DATA[event.type];
    if (!figure) return '';
    if (figure.rest) {
      return figure.announce;
    }
    if (event.pitches && event.pitches.length) {
      return `${event.pitches.join(' - ')} ${figure.announce}`;
    }
    return figure.announce;
  }

  function describePattern(pattern) {
    return pattern.map((event) => describeEvent(event)).join(', ');
  }

  function staffY(pitchId) {
    const conf = STAFF_CONF;
    const pos = STAFF_POSITIONS[pitchId];
    return pos != null ? conf.paddingY + pos * conf.spacingY : conf.paddingY + 4 * conf.spacingY;
  }

  function createStaffSvg(pattern) {
    const conf = STAFF_CONF;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${conf.width} ${conf.height}`);
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('aria-hidden', 'true');

    const lineLength = conf.width - conf.paddingX * 2;
    for (let i = 0; i < 5; i += 1) {
      const y = conf.paddingY + i * conf.spacingY;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(conf.paddingX));
      line.setAttribute('x2', String(conf.paddingX + lineLength));
      line.setAttribute('y1', String(y));
      line.setAttribute('y2', String(y));
      line.setAttribute('class', 'staff-line');
      svg.appendChild(line);
    }

    const baseSpacing = lineLength / 4;
    let beatCursor = 0;
    pattern.forEach((event) => {
      const figure = FIGURE_DATA[event.type];
      const symbol = figure ? figure.symbol : '';
      const eventStartX = conf.paddingX + (beatCursor / 4) * lineLength;
      if (figure && figure.rest) {
        const rest = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        rest.setAttribute('x', String(eventStartX + baseSpacing / 2));
        rest.setAttribute('y', String(conf.paddingY + conf.spacingY * 2));
        rest.setAttribute('class', 'staff-rest');
        rest.setAttribute('text-anchor', 'middle');
        rest.setAttribute('dominant-baseline', 'middle');
        rest.textContent = symbol || '𝄽';
        svg.appendChild(rest);
        beatCursor += figure.beats;
        return;
      }

      const pitches = event.pitches || [];
      const positions = [];
      if (event.type === 'eighthPair' && pitches.length >= 2) {
        const firstX = eventStartX + baseSpacing * 0.35;
        const secondX = conf.paddingX + ((beatCursor + 0.5) / 4) * lineLength + baseSpacing * 0.35;
        positions.push({ pitch: pitches[0], x: firstX });
        positions.push({ pitch: pitches[1], x: secondX });
      } else {
        const noteX = eventStartX + baseSpacing * (figure && figure.beats === 2 ? 1 : 0.5);
        positions.push({ pitch: pitches[0], x: noteX });
      }

      const stems = [];
      positions.forEach(({ pitch, x }) => {
        const y = staffY(pitch);
        const head = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        head.setAttribute('cx', String(x));
        head.setAttribute('cy', String(y));
        head.setAttribute('rx', event.type === 'half' ? '8' : '7');
        head.setAttribute('ry', event.type === 'half' ? '6' : '5.5');
        head.setAttribute('class', `staff-note${event.type === 'half' ? ' is-half' : ''}`);
        svg.appendChild(head);

        const stemTop = Math.max(conf.paddingY - conf.spacingY * 0.5, y - conf.spacingY * 3.6);
        const stem = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        stem.setAttribute('x1', String(x + 7));
        stem.setAttribute('x2', String(x + 7));
        stem.setAttribute('y1', String(y - 2));
        stem.setAttribute('y2', String(stemTop));
        stem.setAttribute('class', 'staff-stem');
        svg.appendChild(stem);
        stems.push({ x, topY: stemTop });

        if (pitch === 'DO') {
          const ledger = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          const ledgerY = staffY('DO');
          ledger.setAttribute('x1', String(x - 10));
          ledger.setAttribute('x2', String(x + 10));
          ledger.setAttribute('y1', String(ledgerY));
          ledger.setAttribute('y2', String(ledgerY));
          ledger.setAttribute('class', 'staff-ledger');
          svg.appendChild(ledger);
        }
      });

      if (event.type === 'eighthPair' && stems.length === 2) {
        const beam = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const beamY = Math.min(stems[0].topY, stems[1].topY) + 2;
        beam.setAttribute('x1', String(stems[0].x + 7));
        beam.setAttribute('y1', String(beamY));
        beam.setAttribute('x2', String(stems[1].x + 7));
        beam.setAttribute('y2', String(beamY));
        beam.setAttribute('class', 'staff-beam');
        svg.appendChild(beam);
      }

      beatCursor += figure ? figure.beats : 1;
    });

    return svg;
  }

  function buildEventDom(event) {
    const figure = FIGURE_DATA[event.type];
    const wrap = document.createElement('div');
    wrap.className = 'combo-event';
    const symbol = document.createElement('span');
    symbol.className = 'symbol';
    symbol.textContent = figure ? figure.symbol : '?';
    wrap.appendChild(symbol);
    if (figure && figure.rest) {
      const rest = document.createElement('span');
      rest.className = 'rest-label';
      rest.textContent = fmt('melorhythm.rest.label') || 'Silencio';
      wrap.appendChild(rest);
    } else {
      const list = document.createElement('div');
      list.className = 'pitch-list';
      (event.pitches || []).forEach((pitchId) => {
        const meta = PITCH_DATA[pitchId];
        const tag = document.createElement('span');
        tag.className = `pitch-tag ${(meta && meta.className) || ''}`.trim();
        tag.textContent = meta ? meta.label : pitchId;
        list.appendChild(tag);
      });
      wrap.appendChild(list);
    }
    return wrap;
  }

  function renderOptions() {
    if (!ui.grid) return;
    const disabled = !state.running || state.locked || state.isPlayingAudio;
    const frag = document.createDocumentFragment();
    state.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'combo-card';
      btn.dataset.patternKey = opt.key;
      btn.disabled = disabled || state.disabledOptions.has(opt.key);
      const label = describePattern(opt.events);
      btn.setAttribute('aria-label', label);
      btn.title = label;

      if (state.feedback === 'correct' && opt.key === state.currentKey) {
        btn.classList.add('is-correct');
      }
      if (state.feedback === 'wrong' && opt.key === state.lastSelection) {
        btn.classList.add('is-error');
      }
      if (state.feedback === 'gameover') {
        if (opt.key === state.currentKey) btn.classList.add('is-correct');
        if (opt.key === state.lastSelection && state.lastSelection !== state.currentKey) {
          btn.classList.add('is-error');
        }
      }

      if (state.viewMode === 'staff') {
        const staffWrap = document.createElement('div');
        staffWrap.className = 'combo-staff';
        staffWrap.appendChild(createStaffSvg(opt.events));
        btn.appendChild(staffWrap);
      } else {
        const set = document.createElement('div');
        set.className = 'combo-events';
        opt.events.forEach((event) => set.appendChild(buildEventDom(event)));
        btn.appendChild(set);
      }
      btn.addEventListener('click', () => handleAnswer(opt.key));
      frag.appendChild(btn);
    });
    ui.grid.innerHTML = '';
    ui.grid.appendChild(frag);
  }

  function updateHud() {
    if (ui.scoreEl) {
      ui.scoreEl.textContent = fmt('hud.points', { n: state.score }) || `Puntos: ${state.score}`;
    }
    if (ui.livesEl) {
      ui.livesEl.textContent = fmt('hud.lives', { n: state.lives }) || `Vidas: ${state.lives}`;
    }
  }

  function updateFeedback() {
    if (!ui.feedback) return;
    let key = state.feedback;
    if (!FEEDBACK_FALLBACK[key]) key = 'welcome';
    if (state.feedback === 'unlock' && state.lastUnlock) {
      const tKey = `melorhythm.unlock.${state.lastUnlock.kind}.${state.lastUnlock.value}`;
      const text = fmt(tKey) || `${FEEDBACK_FALLBACK.unlock} ${state.lastUnlock.value.toUpperCase()}`;
      ui.feedback.textContent = text;
      return;
    }
    const text = fmt(`melorhythm.feedback.${key}`) || FEEDBACK_FALLBACK[key] || '';
    ui.feedback.textContent = text;
  }

  function updateControls() {
    if (ui.repeatBtn) {
      ui.repeatBtn.disabled = !state.currentPattern || state.isPlayingAudio;
    }
    if (ui.optionsSel) {
      ui.optionsSel.value = String(state.optionsCount);
    }
    if (ui.speedSel) {
      ui.speedSel.value = state.speed;
    }
    if (ui.viewSel) {
      ui.viewSel.value = state.viewMode;
    }
    renderOptions();
  }

  async function playEvent(event, accent) {
    if (event.type === 'quarter') {
      await playPitch(event.pitches[0], 1, accent);
    } else if (event.type === 'eighthPair') {
      const beatDuration = beatMs();
      const pairSpacingMs = beatDuration * 0.6;
      await playPitch(event.pitches[0], 0.5, accent);
      const extraGap = Math.max(pairSpacingMs - beatDuration * 0.5, 40);
      await wait(extraGap);
      await playPitch(event.pitches[1], 0.5, false);
    } else if (event.type === 'quarterRest') {
      await wait(beatMs());
    } else if (event.type === 'half') {
      await playPitch(event.pitches[0], 2, accent);
    }
  }

  async function playPattern(pattern) {
    if (!pattern || !pattern.length || state.isPlayingAudio) return;
    state.isPlayingAudio = true;
    updateControls();
    let beatCursor = 0;
    for (let i = 0; i < pattern.length; i += 1) {
      const event = pattern[i];
      const accentNow = Math.floor(beatCursor) % 2 === 0;
      await playEvent(event, accentNow);
      beatCursor += event.beats || 0;
      if (i < pattern.length - 1) {
        await wait(Math.max(beatMs() * 0.25, 80));
      }
    }
    state.isPlayingAudio = false;
    updateControls();
  }

  function announceUnlock(kind, value) {
    state.lastUnlock = { kind, value: value.toLowerCase() };
    state.feedback = 'unlock';
    updateFeedback();
  }

  function ensureUnlocks() {
    if (!state.includeLa && state.score >= THRESHOLD_UNLOCKS.LA) {
      state.includeLa = true;
      loadSample('LA').catch(() => {});
      announceUnlock('note', 'LA');
    } else if (!state.includeDo && state.score >= THRESHOLD_UNLOCKS.DO) {
      state.includeDo = true;
      loadSample('DO').catch(() => {});
      announceUnlock('note', 'DO');
    } else if (!state.includeFa && state.score >= THRESHOLD_UNLOCKS.FA) {
      state.includeFa = true;
      loadSample('FA').catch(() => {});
      announceUnlock('note', 'FA');
    } else if (!state.includeRe && state.score >= THRESHOLD_UNLOCKS.RE) {
      state.includeRe = true;
      loadSample('RE').catch(() => {});
      announceUnlock('note', 'RE');
    } else if (!state.includeSi && state.score >= THRESHOLD_UNLOCKS.SI) {
      state.includeSi = true;
      loadSample('SI').catch(() => {});
      announceUnlock('note', 'SI');
    }

    if (!state.includeRest && state.score >= FIGURE_THRESHOLDS.quarterRest) {
      state.includeRest = true;
      announceUnlock('figure', 'rest');
    } else if (!state.includeHalf && state.score >= FIGURE_THRESHOLDS.half) {
      state.includeHalf = true;
      announceUnlock('figure', 'half');
    }
  }

  function prepareRound() {
    if (!state.running) return;
    state.locked = false;
    state.disabledOptions.clear();
    state.feedback = 'listen';
    updateFeedback();
    state.lastSelection = null;
    const chosen = generatePattern();
    if (!chosen.length) {
      console.warn('[melody-rhythm] Unable to generate pattern');
      return;
    }
    const key = patternKey(chosen);
    state.currentPattern = chosen;
    state.currentKey = key;
    const answers = [{ key, events: chosen }];
    const used = new Set([key]);
    let safety = 0;
    while (answers.length < state.optionsCount && safety < 120) {
      const alt = generatePattern();
      const altKey = patternKey(alt);
      if (alt.length && !used.has(altKey)) {
        answers.push({ key: altKey, events: alt });
        used.add(altKey);
      }
      safety += 1;
    }
    // Shuffle options
    for (let i = answers.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [answers[i], answers[j]] = [answers[j], answers[i]];
    }
    state.options = answers;
    updateHud();
    updateControls();
    const delay = Math.max(beatMs() * 0.4, 320);
    setTimeout(() => playPattern(state.currentPattern), delay);
  }

  function handleAnswer(key) {
    if (!state.running || state.locked || !state.currentPattern) return;
    if (state.disabledOptions.has(key)) return;
    state.lastSelection = key;
    if (key === state.currentKey) {
      state.score += 1;
      state.feedback = 'correct';
      state.locked = true;
      playSuccess();
      ensureUnlocks();
      updateHud();
      updateFeedback();
      updateControls();
      setTimeout(() => {
        state.locked = false;
        prepareRound();
      }, 900);
    } else {
      state.lives -= 1;
      state.feedback = 'wrong';
      state.disabledOptions.add(key);
      playError();
      updateHud();
      updateFeedback();
      updateControls();
      if (state.lives <= 0) {
        state.feedback = 'gameover';
        state.running = false;
        state.locked = true;
        updateFeedback();
        updateControls();
        showScoreboardPrompt(state.score);
      }
    }
  }

  function preloadInitialSamples() {
    loadSample('MI').catch(() => {});
    loadSample('SOL').catch(() => {});
  }

  function startGame() {
    ensureAudio();
    preloadInitialSamples();
    hideScoreboardPrompt();
    state.running = true;
    state.locked = false;
    state.score = 0;
    state.lives = 3;
    state.disabledOptions.clear();
    state.feedback = 'welcome';
    state.includeLa = false;
    state.includeDo = false;
    state.includeFa = false;
    state.includeRe = false;
    state.includeSi = false;
    state.includeRest = false;
    state.includeHalf = false;
    state.lastUnlock = null;
    if (ui.speedSel) {
      const choice = ui.speedSel.value;
      state.speed = ['slow', 'fast'].includes(choice) ? choice : 'normal';
    } else {
      state.speed = 'normal';
    }
    state.speedFactor = SPEED_FACTORS[state.speed] || 1;
    updateHud();
    updateFeedback();
    updateControls();
    prepareRound();
  }

  if (ui.startBtn) {
    ui.startBtn.addEventListener('click', () => {
      startGame();
    });
  }

  if (ui.repeatBtn) {
    ui.repeatBtn.addEventListener('click', () => {
      if (state.isPlayingAudio || !state.currentPattern) return;
      playPattern(state.currentPattern);
    });
  }

  if (ui.optionsSel) {
    state.optionsCount = parseInt(ui.optionsSel.value, 10) || 3;
    ui.optionsSel.addEventListener('change', () => {
      const next = parseInt(ui.optionsSel.value, 10);
      if (!Number.isFinite(next) || next < 2 || next > 4) return;
      state.optionsCount = next;
      if (state.running) prepareRound();
      else updateControls();
    });
  }

  if (ui.speedSel) {
    const initial = ui.speedSel.value;
    state.speed = ['slow', 'fast'].includes(initial) ? initial : 'normal';
    state.speedFactor = SPEED_FACTORS[state.speed] || 1;
    ui.speedSel.addEventListener('change', () => {
      const choice = ui.speedSel.value;
      state.speed = ['slow', 'fast'].includes(choice) ? choice : 'normal';
      state.speedFactor = SPEED_FACTORS[state.speed] || 1;
    });
  } else {
    state.speedFactor = SPEED_FACTORS[state.speed] || 1;
  }

  if (ui.viewSel) {
    state.viewMode = ui.viewSel.value === 'staff' ? 'staff' : 'names';
    ui.viewSel.addEventListener('change', () => {
      state.viewMode = ui.viewSel.value === 'staff' ? 'staff' : 'names';
      renderOptions();
    });
  }

  updateHud();
  updateFeedback();
  updateControls();
})();
