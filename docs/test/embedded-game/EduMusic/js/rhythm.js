(() => {
  // Basic canvas + audio helpers
  const canvas = document.getElementById('rhythmCanvas');
  const ctx = canvas.getContext('2d');
  const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));

  const ui = {
    scoreEl: document.getElementById('score'),
    livesEl: document.getElementById('lives'),
    startBtn: document.getElementById('startBtn'),
    playBtn: document.getElementById('playBtn'),
    levelSel: document.getElementById('levelSelect'),
    ansTa: document.getElementById('ansTa'),
    ansSu: document.getElementById('ansSu'),
    ansTiti: document.getElementById('ansTiti'),
  };

  function playSuccess() {
    if (window.Sfx && typeof window.Sfx.success === 'function') {
      window.Sfx.success();
    }
  }

  function playError() {
    if (window.Sfx && typeof window.Sfx.error === 'function') {
      window.Sfx.error();
    }
  }

  const state = {
    running: false,
    score: 0,
    lives: 3,
    includeTiti: false, // unlocked automatically when score >= 10
    current: null, // ['TA'] | ['TA','SU'] | etc.
    stepIndex: 0, // progress within current pattern
    forcedBeats: null, // null | 1 | 2 | 4 (nivel elegido)
    lastFeedback: null, // 'ok' | 'error' | null
  };

  const SCOREBOARD_ID = 'rhythm';
  function showScoreboardPrompt() {
    if (window.GameOverOverlay && typeof window.GameOverOverlay.show === 'function') {
      window.GameOverOverlay.show({
        gameId: SCOREBOARD_ID,
        score: state.score,
        onRetry: () => startGame(),
      });
      return;
    }
    if (window.ScoreService) {
      window.ScoreService.showSave(SCOREBOARD_ID, state.score);
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

  // Layout
  function resize() {
    const maxW = Math.min(window.innerWidth - 32, 900);
    const maxH = Math.min(window.innerHeight - 120, 480);
    const cssW = Math.max(360, Math.floor(maxW));
    const cssH = Math.max(220, Math.floor(maxH));
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = cssW * DPR;
    canvas.height = cssH * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    draw();
  }
  window.addEventListener('resize', resize);

  // Audio
  const audio = { ctx: null };
  function ensureAudio() {
    if (!audio.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audio.ctx = new AC();
    }
  }
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
  function clickSound(gain = 0.15, freq = 880, dur = 0.08) {
    if (!audio.ctx) return;
    const now = audio.ctx.currentTime;
    const osc = audio.ctx.createOscillator();
    const g = audio.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain * currentGameVolume(), now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g).connect(audio.ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  // Rhythm playback: TA (1 beat), SU (rest), TITI (two sub-beats)
  const TEMPO_BPM = 100; // 1 beat = 600ms
  const BEAT_SEC = 60 / TEMPO_BPM;
  async function playToken(kind) {
    ensureAudio();
    if (!audio.ctx) return;
    const wait = (s) => new Promise(r => setTimeout(r, Math.round(s * 1000)));
    if (kind === 'TA') {
      clickSound(0.18, 960, 0.09);
      await wait(BEAT_SEC);
    } else if (kind === 'SU') {
      await wait(BEAT_SEC);
    } else if (kind === 'TITI') {
      // Repite el mismo sonido dos veces
      clickSound(0.16, 920, 0.07);
      await wait(BEAT_SEC / 2);
      clickSound(0.16, 920, 0.07);
      await wait(BEAT_SEC / 2);
    }
  }
  async function playPattern(seq) {
    const list = Array.isArray(seq) ? seq : (seq ? [seq] : []);
    for (let i = 0; i < list.length; i++) {
      await playToken(list[i]);
      if (i < list.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
  }

  function fmt(key, params) {
    return (window.i18n ? window.i18n.t(key, params) : null);
  }

  function updateHud() {
    if (ui.scoreEl) ui.scoreEl.textContent = fmt('hud.points', { n: state.score }) || `Puntos: ${state.score}`;
    if (ui.livesEl) ui.livesEl.textContent = fmt('hud.lives', { n: state.lives }) || `Vidas: ${state.lives}`;
    if (ui.ansTiti) ui.ansTiti.disabled = !state.includeTiti;
    if (ui.playBtn) ui.playBtn.disabled = !state.current;
  }

  function startGame() {
    hideScoreboardPrompt();
    state.running = true;
    state.score = 0;
    state.lives = 3;
    state.lastFeedback = null;
    state.includeTiti = false; // start without TITI; unlock at 10
    state.stepIndex = 0;
    // Set initial level from selector (1->1, 2->2, 3->4 beats)
    const lvl = ui.levelSel && ui.levelSel.value;
    state.forcedBeats = (lvl === '3') ? 4 : (lvl === '2' ? 2 : 1);
    updateHud();
    nextRound();
  }

  function choosePattern() {
    const choices = state.includeTiti ? ['TA','SU','TITI'] : ['TA','SU'];
    const beats = state.forcedBeats || (state.score >= 30 ? 4 : (state.score >= 20 ? 2 : 1));
    const seq = [];
    for (let i = 0; i < beats; i++) {
      seq.push(choices[(Math.random() * choices.length) | 0]);
    }
    return seq;
  }

  async function nextRound() {
    state.current = choosePattern();
    state.stepIndex = 0;
    state.lastFeedback = null;
    updateHud();
    draw();
    // auto play full pattern on new round
    await playPattern(state.current);
  }

  function answer(kind) {
    if (!state.running || !state.current) return;
    if (kind === 'TITI' && !state.includeTiti) return;
    const seq = state.current;
    const expect = seq[state.stepIndex];
    if (kind === expect) {
      state.stepIndex += 1;
      if (state.stepIndex >= seq.length) {
        state.score += 1;
        if (!state.includeTiti && state.score >= 10) {
          state.includeTiti = true;
        }
        state.lastFeedback = 'ok';
        playSuccess();
        updateHud();
        draw();
        setTimeout(nextRound, 450);
      } else {
        state.lastFeedback = null;
        updateHud();
        draw();
      }
    } else {
      state.lives -= 1;
      state.stepIndex = 0; // reinicia la secuencia a adivinar
      state.lastFeedback = 'error';
      playError();
      updateHud();
      draw();
      if (state.lives <= 0) {
        state.running = false;
        showScoreboardPrompt();
      }
    }
  }

  // Drawing simple rhythm glyphs
  function drawBeatBox(x, y, w, h) {
    ctx.save();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }
  function drawTA(cx, cy) {
    ctx.save();
    ctx.fillStyle = '#0f172a';
    // note head
    ctx.beginPath();
    ctx.ellipse(cx - 10, cy + 8, 12, 9, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // stem
    ctx.beginPath();
    ctx.moveTo(cx - 0, cy + 8);
    ctx.lineWidth = 3;
    ctx.lineTo(cx - 0, cy - 30);
    ctx.stroke();
    ctx.restore();
  }
  function drawSU(cx, cy) {
    ctx.save();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    // simple quarter rest-like zigzag
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 18);
    ctx.lineTo(cx, cy - 6);
    ctx.lineTo(cx - 10, cy + 6);
    ctx.lineTo(cx, cy + 18);
    ctx.stroke();
    ctx.restore();
  }
  function drawTITI(cx, cy) {
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#0f172a';
    // two note heads
    ctx.beginPath();
    ctx.ellipse(cx - 18, cy + 8, 10, 8, -0.4, 0, Math.PI * 2);
    ctx.ellipse(cx + 6, cy + 8, 10, 8, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // stems
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy + 8);
    ctx.lineTo(cx - 8, cy - 28);
    ctx.moveTo(cx + 16, cy + 8);
    ctx.lineTo(cx + 16, cy - 28);
    ctx.stroke();
    // beam
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 28);
    ctx.lineTo(cx + 16, cy - 28);
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.restore();
  }
  function drawFeedback(text, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = 'bold 22px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(text, canvas.clientWidth / 2, 12);
    ctx.restore();
  }

  function draw() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    const seq = Array.isArray(state.current) ? state.current : (state.current ? [state.current] : []);
    const beats = seq.length;
    const baseW = 360;
    const perExtra = 160; // ancho adicional por cada figura extra (se ajusta a pantalla)
    const desiredW = baseW + Math.max(0, beats - 1) * perExtra;
    const boxW = Math.min(desiredW, w - 24);
    const boxH = Math.min(140, h - 60);
    const x = (w - boxW) / 2;
    const y = (h - boxH) / 2;
    drawBeatBox(x, y, boxW, boxH);

    if (beats > 0) {
      const gap = Math.min(44, Math.max(24, Math.floor(boxW * 0.04)));
      const slotW = (boxW - gap * (beats - 1)) / beats;
      const cy = y + boxH / 2 - 6;

      // Resaltado del paso actual
      if (state.stepIndex >= 0 && state.stepIndex < beats) {
        ctx.save();
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 3;
        const left = x + state.stepIndex * (slotW + gap);
        ctx.strokeRect(left + 6, y + 6, Math.max(24, slotW - 12), boxH - 12);
        ctx.restore();
      }

      // Dibujar cada figura en su slot
      for (let i = 0; i < beats; i++) {
        const left = x + i * (slotW + gap);
        const cx = left + slotW / 2;
        const k = seq[i];
        if (k === 'TA') drawTA(cx, cy);
        else if (k === 'SU') drawSU(cx, cy);
        else if (k === 'TITI') drawTITI(cx, cy);
      }
    }

    if (state.lastFeedback === 'ok') {
      drawFeedback('✓', '#22c55e');
    } else if (state.lastFeedback === 'error') {
      drawFeedback('✗', '#ef4444');
    }
  }

  function bind() {
    ui.startBtn && ui.startBtn.addEventListener('click', () => startGame());
    ui.playBtn && ui.playBtn.addEventListener('click', () => { if (state.current) playPattern(state.current); });
    if (ui.playBtn) {
      ui.playBtn.title = fmt('rhythm.play_hint') || 'Vuelve a escuchar el patrón actual';
      ui.playBtn.disabled = true; // inactivo hasta que haya patrón
    }
    ui.ansTa && ui.ansTa.addEventListener('click', () => answer('TA'));
    ui.ansSu && ui.ansSu.addEventListener('click', () => answer('SU'));
    ui.ansTiti && ui.ansTiti.addEventListener('click', () => answer('TITI'));
  }

  // Init
  resize();
  bind();
  updateHud();
})();
