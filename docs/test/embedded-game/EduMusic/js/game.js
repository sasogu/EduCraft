(() => {
  const CONFIG_INPUT = window.GAME_CONFIG || {};
  const defaultPitches = ['mi', 'sol'];
  let configured = Array.isArray(CONFIG_INPUT.pitches)
    ? CONFIG_INPUT.pitches
    : (Array.isArray(CONFIG_INPUT.notes) ? CONFIG_INPUT.notes : defaultPitches);
  configured = configured.map(p => String(p).toLowerCase()).filter(Boolean);
  const seenPitches = new Set();
  configured = configured.filter(p => {
    if (seenPitches.has(p)) return false;
    seenPitches.add(p);
    return true;
  });
  if (!configured.length) configured = defaultPitches;

  const rawMonoThreshold = Number(CONFIG_INPUT.monoAtScore);
  const GAME_CONFIG = {
    id: CONFIG_INPUT.id || null,
    hintKey: CONFIG_INPUT.hintKey || null,
    hintFallback: CONFIG_INPUT.hintFallback || null,
    rankKey: CONFIG_INPUT.rankKey || null,
    pitches: configured,
    monoAtScore: Number.isFinite(rawMonoThreshold) ? Math.max(0, rawMonoThreshold) : 30,
    forceMono: CONFIG_INPUT.forceMono === true || CONFIG_INPUT.forceMono === 'true',
    level: CONFIG_INPUT.level || null,
  };
  if (!GAME_CONFIG.id) GAME_CONFIG.id = configured.join('_') || 'solmi';
  if (!GAME_CONFIG.rankKey) GAME_CONFIG.rankKey = GAME_CONFIG.id;
  if (!GAME_CONFIG.hintKey && configured.length === 2 && configured.includes('mi') && configured.includes('sol')) {
    GAME_CONFIG.hintKey = 'game.piano_hint.solmi';
  }
  const LEVEL_RULES = {
    color: {
      pointsPerHit: 1,
      lifeEveryPoints: 0,
      showNoteLabels: (score) => score < 10,
      showKeyLabels: (score) => score < 20,
    },
    mono: {
      pointsPerHit: 3,
      lifeEveryPoints: 0,
      showNoteLabels: (score) => score < 10,
      showKeyLabels: (score) => score < 20,
    },
    blind: {
      pointsPerHit: 5,
      lifeEveryPoints: 100,
      showNoteLabels: () => false,
      showKeyLabels: () => false,
    },
  };
  const ACTIVE_RULES = LEVEL_RULES[GAME_CONFIG.level] || LEVEL_RULES.color;
  const SCORE_PER_HIT = Number.isFinite(ACTIVE_RULES.pointsPerHit) ? ACTIVE_RULES.pointsPerHit : (GAME_CONFIG.forceMono ? 3 : 1);
  const LIFE_BONUS_INTERVAL = Number.isFinite(ACTIVE_RULES.lifeEveryPoints) && ACTIVE_RULES.lifeEveryPoints > 0 ? ACTIVE_RULES.lifeEveryPoints : 0;

  const NOTE_META = {
    mi: {
      labels: { es: 'MI', val: 'MI', en: 'E' },
      label: 'MI',
      offsetSteps: 0,
      pianoIndex: 2,
      key: 'm',
      color: '#c62828',
      highlight: '#fde4e4',
      activeHighlight: '#ffc9c9',
      freq: 329.63,
    },
    sol: {
      labels: { es: 'SOL', val: 'SOL', en: 'G' },
      label: 'SOL',
      offsetSteps: -2,
      pianoIndex: 4,
      key: 's',
      color: '#2e7d32',
      highlight: '#dcfce7',
      activeHighlight: '#bbf7d0',
      freq: 392.0,
    },
    la: {
      labels: { es: 'LA', val: 'LA', en: 'A' },
      label: 'LA',
      offsetSteps: -3,
      pianoIndex: 5,
      key: 'l',
      color: '#2563eb',
      highlight: '#dbeafe',
      activeHighlight: '#bfdbfe',
      freq: 440.0,
    },
    do: {
      labels: { es: 'DO', val: 'DO', en: 'C' },
      label: 'DO',
      offsetSteps: 2,
      pianoIndex: 0,
      key: 'd',
      color: '#b45309',
      highlight: '#fde68a',
      activeHighlight: '#facc15',
      freq: 261.63,
    },
    re: {
      labels: { es: 'RE', val: 'RE', en: 'D' },
      label: 'RE',
      offsetSteps: 1.2,
      pianoIndex: 1,
      key: 'r',
      color: '#9333ea',
      highlight: '#ede9fe',
      activeHighlight: '#ddd6fe',
      freq: 293.66,
    },
    fa: {
      labels: { es: 'FA', val: 'FA', en: 'F' },
      label: 'FA',
      offsetSteps: -1,
      pianoIndex: 3,
      key: 'f',
      color: '#0ea5e9',
      highlight: '#cff4ff',
      activeHighlight: '#bae6fd',
      freq: 349.23,
    },
    si: {
      labels: { es: 'SI', val: 'SI', en: 'B' },
      label: 'SI',
      offsetSteps: -4,
      pianoIndex: 6,
      key: 'b',
      color: '#f59e0b',
      highlight: '#fef3c7',
      activeHighlight: '#fde68a',
      freq: 493.88,
    },
    do_high: {
      labels: { es: "DO'", val: "DO'", en: "C'" },
      label: "DO'",
      offsetSteps: -5,
      pianoIndex: 0,
      key: 'd',
      color: '#b45309',
      highlight: '#fde68a',
      activeHighlight: '#facc15',
      freq: 523.25,
    },
    re_high: {
      labels: { es: "RE'", val: "RE'", en: "D'" },
      label: "RE'",
      offsetSteps: -6,
      pianoIndex: 1,
      key: 'r',
      color: '#9333ea',
      highlight: '#ede9fe',
      activeHighlight: '#ddd6fe',
      freq: 587.33,
    },
    mi_high: {
      labels: { es: "MI'", val: "MI'", en: "E'" },
      label: "MI'",
      offsetSteps: -7,
      pianoIndex: 2,
      key: 'm',
      color: '#c62828',
      highlight: '#fde4e4',
      activeHighlight: '#ffc9c9',
      freq: 659.25,
    },
    fa_high: {
      labels: { es: "FA'", val: "FA'", en: "F'" },
      label: "FA'",
      offsetSteps: -8,
      pianoIndex: 3,
      key: 'f',
      color: '#0ea5e9',
      highlight: '#cff4ff',
      activeHighlight: '#bae6fd',
      freq: 698.46,
    },
  };

  const PITCH_EQUIVALENCE = Object.freeze({
    do_high: 'do',
    re_high: 're',
    mi_high: 'mi',
    fa_high: 'fa',
  });

  function getPitchMeta(pitch) {
    return NOTE_META[pitch] || null;
  }
  function sanitizeKey(str) {
    return (str || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  function normalizePitch(pitch) {
    if (!pitch) return '';
    const key = pitch.toString().toLowerCase();
    return PITCH_EQUIVALENCE[key] || key;
  }

  function getCurrentLang() {
    if (window.i18n && typeof window.i18n.getLang === 'function') {
      return window.i18n.getLang();
    }
    return 'es';
  }

  function getMetaLabel(meta) {
    if (!meta) return '';
    const lang = getCurrentLang();
    if (meta.labels && meta.labels[lang]) return meta.labels[lang];
    if (meta.labels) {
      if (meta.labels.es) return meta.labels.es;
      if (meta.labels.val) return meta.labels.val;
      if (meta.labels.en) return meta.labels.en;
    }
    return meta.label || '';
  }

  function getPitchLabel(pitch) {
    const meta = getPitchMeta(pitch);
    const label = getMetaLabel(meta);
    return label || String(pitch || '').toUpperCase();
  }

  const DEFAULT_PIANO_WHITE_KEYS = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si'];
  const DEFAULT_BLACK_DEFS = Object.freeze([
    { over: 0, name: 'C#' }, // between DO(0) and RE(1)
    { over: 1, name: 'D#' }, // between RE(1) and MI(2)
    // no black between MI(2) and FA(3)
    { over: 3, name: 'F#' }, // between FA(3) and SOL(4)
    { over: 4, name: 'G#' }, // between SOL(4) and LA(5)
    { over: 5, name: 'A#' }, // between LA(5) and SI(6)
  ]);
  const BLACK_INDEX_LABEL = {
    0: 'C#',
    1: 'D#',
    3: 'F#',
    4: 'G#',
    5: 'A#',
  };

  function normalizeWhiteKeyConfig(value) {
    if (!Array.isArray(value) || value.length === 0) return [];
    const seen = new Set();
    const normalized = [];
    for (const raw of value) {
      const entry = (raw || '').toString().trim().toLowerCase();
      if (!entry || seen.has(entry)) continue;
      seen.add(entry);
      normalized.push(entry);
    }
    return normalized;
  }

  const configuredWhiteKeys = normalizeWhiteKeyConfig(CONFIG_INPUT.pianoWhiteKeys);
  const PIANO_WHITE_KEYS = configuredWhiteKeys.length > 0
    ? configuredWhiteKeys
    : DEFAULT_PIANO_WHITE_KEYS.slice();
  const WHITE_KEY_TO_PITCH = new Array(PIANO_WHITE_KEYS.length).fill(null);

  function buildBlackDefs(whiteCount) {
    if (whiteCount === DEFAULT_PIANO_WHITE_KEYS.length) {
      return DEFAULT_BLACK_DEFS;
    }
    const patternSet = new Set([0, 1, 3, 4, 5]);
    const defs = [];
    for (let i = 0; i < Math.max(0, whiteCount - 1); i++) {
      const mod = i % 7;
      if (!patternSet.has(mod)) continue;
      const label = BLACK_INDEX_LABEL[mod] || '♯';
      const octave = Math.floor(i / 7) + 1;
      defs.push({ over: i, name: `${label}${octave}` });
    }
    return defs;
  }

  function formatNoteList(labels) {
    const clean = labels.filter(Boolean);
    if (!clean.length) return '';
    const lang = getCurrentLang();
    const conjunction = lang === 'en' ? 'or' : 'o';
    if (clean.length === 1) return clean[0];
    if (clean.length === 2) return `${clean[0]} ${conjunction} ${clean[1]}`;
    return `${clean.slice(0, -1).join(', ')} ${conjunction} ${clean.slice(-1)}`;
  }

  function buildHintFallback(noteLabels) {
    const lang = getCurrentLang();
    const readable = formatNoteList(noteLabels);
    if (lang === 'en') {
      return readable ? `Play ${readable} on the keyboard` : 'Play the highlighted notes on the keyboard';
    }
    if (lang === 'val') {
      return readable ? `Prem ${readable} al teclat` : 'Prem les notes indicades al teclat';
    }
    return readable ? `Pulsa ${readable} en el piano` : 'Pulsa las notas indicadas en el piano';
  }

  const KEYBOARD_MAP = {};

  function shouldUseMonoPalette() {
    const threshold = Number.isFinite(GAME_CONFIG.monoAtScore) ? GAME_CONFIG.monoAtScore : 30;
    return Boolean(GAME_CONFIG.forceMono) || state.score >= threshold;
  }

  function shouldShowNoteLabels(score) {
    if (ACTIVE_RULES && typeof ACTIVE_RULES.showNoteLabels === 'function') {
      return ACTIVE_RULES.showNoteLabels(score);
    }
    return score < 10;
  }

  function shouldShowPianoLabels(score) {
    if (ACTIVE_RULES && typeof ACTIVE_RULES.showKeyLabels === 'function') {
      return ACTIVE_RULES.showKeyLabels(score);
    }
    return score < 20;
  }

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));

  const hud = {
    scoreEl: document.getElementById('score'),
    livesEl: document.getElementById('lives'),
    startBtn: document.getElementById('startBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    restartBtn: document.getElementById('restartBtn'),
    speedSel: document.getElementById('speedSelect'),
  };

  // Staff metrics (computed on resize)
  const staff = {
    marginTop: 60,
    spacing: 18,
    lineYs: [], // top->bottom (0..4)
    // Helpers to get musical lines referenced from bottom
    yBottomLine() { return this.lineYs[4]; }, // 1ª línea (Mi)
    ySecondLine() { return this.lineYs[3]; }, // 2ª línea (Sol)
    yForPitch(pitch) {
      const base = this.yBottomLine();
      if (typeof base !== 'number') return 0;
      const meta = getPitchMeta(pitch);
      const offset = meta ? meta.offsetSteps || 0 : 0;
      return base + offset * (this.spacing / 2);
    },
  };

  const state = {
    running: false,
    paused: false,
    over: false,
    score: 0,
    lives: 3,
    spawnEveryMs: 1100,
    lastSpawn: 0,
    speedBase: 120, // px/s horizontal
    speedIncrease: 0.02, // per second
    speedMode: 'normal', // 'slow' | 'normal' | 'fast'
    tPrev: 0,
    notes: [],
    fx: [], // visual effects
  };

  // Simple piano keyboard at bottom
  const piano = {
    top: 0,
    height: 120,
    whiteCount: PIANO_WHITE_KEYS.length, // DO RE MI FA SOL LA SI by default
    keyW: 0,
    pressedAt: {},
    blackDefs: buildBlackDefs(PIANO_WHITE_KEYS.length),
    blackRects: [], // computed on resize
    blackPressedAt: {},
  };

  for (const pitch of GAME_CONFIG.pitches) {
    const meta = getPitchMeta(pitch);
    if (piano.pressedAt[pitch] == null) piano.pressedAt[pitch] = 0;
    let assigned = false;
    for (let i = 0; i < WHITE_KEY_TO_PITCH.length; i++) {
      if (WHITE_KEY_TO_PITCH[i]) continue;
      if (PIANO_WHITE_KEYS[i] === pitch) {
        WHITE_KEY_TO_PITCH[i] = pitch;
        assigned = true;
        break;
      }
    }
    if (!assigned && meta && Number.isInteger(meta.pianoIndex)) {
      const fallbackIndex = meta.pianoIndex;
      if (fallbackIndex >= 0 && fallbackIndex < WHITE_KEY_TO_PITCH.length && !WHITE_KEY_TO_PITCH[fallbackIndex]) {
        WHITE_KEY_TO_PITCH[fallbackIndex] = pitch;
      }
    }
    if (meta && meta.key && KEYBOARD_MAP[meta.key] == null) {
      KEYBOARD_MAP[meta.key] = pitch;
    }
  }

  function resize() {
    const maxW = Math.min(window.innerWidth - 32, 900);
    const maxH = Math.min(window.innerHeight - 100, 720);
    const cssW = Math.max(360, Math.floor(maxW));
    // Hacer el lienzo más apaisado: altura acotada por el ancho
    const targetH = Math.floor(cssW * 0.65);
    const cssH = Math.max(340, Math.min(targetH, Math.floor(maxH)));
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = cssW * DPR;
    canvas.height = cssH * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // Piano geometry
    piano.height = Math.max(110, Math.floor(cssH * 0.26));
    piano.top = cssH - piano.height;
    piano.keyW = Math.floor(cssW / piano.whiteCount);
    // Compute black key rects
    const bw = Math.floor(piano.keyW * 0.6);
    const bh = Math.floor(piano.height * 0.62);
    piano.blackRects = piano.blackDefs.map(def => {
      const xLeftWhite = def.over * piano.keyW; // left of the white to the left
      const x = xLeftWhite + piano.keyW - Math.floor(bw / 2);
      const rect = { name: def.name, x, y: piano.top, w: bw, h: bh };
      if (piano.blackPressedAt[def.name] == null) piano.blackPressedAt[def.name] = 0;
      return rect;
    });

    // Staff lines y positions (top->bottom) within area above piano
    const topPad = 28;
    const available = Math.max(140, piano.top - topPad);
    // Espaciado para 5 líneas (~4*spacing de alto) con un poco más de aire entre espacios
    const spacingGuess = Math.floor(available / 5.5);
    staff.spacing = Math.max(28, Math.min(42, spacingGuess));
    // Centrar en el espacio disponible
    const staffBlockH = 4 * staff.spacing;
    const extra = available - staffBlockH;
    staff.marginTop = Math.max(24, Math.floor(topPad + extra / 2));
    staff.lineYs = [];
    for (let i = 0; i < 5; i++) {
      staff.lineYs.push(staff.marginTop + i * staff.spacing);
    }
  }

  function applySpeed(mode) {
    state.speedMode = mode;
    const baseSpawn = 1600; // más lento en modo normal
    const baseSpeed = 90;
    const baseIncrease = 0.012;

    if (mode === 'slow') {
      state.spawnEveryMs = Math.floor(baseSpawn * 1.25); // ~2000ms
      state.speedBase = baseSpeed * 0.85;
      state.speedIncrease = baseIncrease * 0.9;
    } else if (mode === 'fast') {
      state.spawnEveryMs = Math.floor(baseSpawn * 0.65); // ~1040ms
      state.speedBase = baseSpeed * 1.35;
      state.speedIncrease = baseIncrease * 1.2;
    } else {
      state.spawnEveryMs = baseSpawn;
      state.speedBase = baseSpeed;
      state.speedIncrease = baseIncrease;
    }
  }

  window.addEventListener('resize', resize);
  resize();

  function choice(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function spawnNote(now) {
    state.lastSpawn = now;
    const radius = Math.max(14, Math.floor(staff.spacing * 0.52));
    const pitch = choice(GAME_CONFIG.pitches);
    const y = staff.yForPitch(pitch);
    const note = {
      x: -radius - 10,
      y,
      r: radius,
      pitch,
      vx: state.speedBase + state.score * 4, // speed scales con puntaje
    };
    state.notes.push(note);
  }

  function resetGame() {
    hideScoreboardPrompt();
    state.running = false;
    state.paused = false;
    state.over = false;
    state.score = 0;
    state.lives = 3;
    // Preserve selected speed mode when resetting
    applySpeed(state.speedMode || 'normal');
    state.lastSpawn = 0;
    state.tPrev = performance.now();
    state.notes.length = 0;
    if (hud.scoreEl) hud.scoreEl.textContent = (window.i18n ? window.i18n.t('hud.points', { n: state.score }) : `Puntos: ${state.score}`);
    if (hud.livesEl) hud.livesEl.textContent = (window.i18n ? window.i18n.t('hud.lives', { n: state.lives }) : `Vidas: ${state.lives}`);
    draw();
  }

  function startGame() {
    if (state.running && !state.over) return;
    state.over = false;
    state.paused = false;
    state.running = true;
    // Ensure speed matches current selector before starting
    if (hud.speedSel) applySpeed(hud.speedSel.value || 'normal');
    state.tPrev = performance.now();
    requestAnimationFrame(loop);
  }

  function pauseGame() {
    if (!state.running || state.over) return;
    state.paused = !state.paused;
    if (!state.paused) {
      state.tPrev = performance.now();
      requestAnimationFrame(loop);
    } else {
      draw();
    }
  }

  function endGame() {
    state.over = true;
    state.running = false;
    draw();
    showScoreboardPrompt();
  }

  // ---------- Scoreboard integration ----------
  const rankKey = GAME_CONFIG.rankKey || GAME_CONFIG.id || 'default';
  function showScoreboardPrompt() {
    if (window.GameOverOverlay && typeof window.GameOverOverlay.show === 'function') {
      window.GameOverOverlay.show({
        gameId: rankKey,
        score: state.score,
        onRetry: () => resetGame(),
      });
      return;
    }
    if (window.ScoreService) {
      window.ScoreService.showSave(rankKey, state.score);
    }
  }
  function hideScoreboardPrompt() {
    if (window.GameOverOverlay && typeof window.GameOverOverlay.isOpen === 'function' && window.GameOverOverlay.isOpen()) {
      window.GameOverOverlay.hide();
    }
    if (window.ScoreService) {
      window.ScoreService.hideSave(rankKey);
    }
  }

  function update(dt) {
    // difficulty increase
    state.speedBase *= (1 + state.speedIncrease * dt);

    // spawn notes
    // Más puntuación = intervalos más cortos entre notas
    const spawnFactor = 1 + Math.min(1.6, state.score * 0.04);
    const effectiveSpawnMs = Math.max(350, state.spawnEveryMs / spawnFactor);
    const now = performance.now();
    if (now - state.lastSpawn > effectiveSpawnMs) spawnNote(now);

    // move notes horizontally
    for (const n of state.notes) {
      n.x += (n.vx * dt);
    }

    // misses when note leaves by the right
    const keep = [];
    for (const n of state.notes) {
      const nx = n.x;
      const ny = n.y;
      const r = n.r;

      // Note passed catch zone without decision
      if (nx - r > canvas.clientWidth) {
        // Missed
        addCross(nx, ny);
        playError();
        state.lives -= 1;
        if (hud.livesEl) hud.livesEl.textContent = (window.i18n ? window.i18n.t('hud.lives', { n: state.lives }) : `Vidas: ${state.lives}`);
        if (state.lives <= 0) { endGame(); return; }
        continue;
      }

      keep.push(n);
    }
    state.notes = keep;

    // update effects
    const fxKeep = [];
    for (const e of state.fx) {
      e.ttl -= dt;
      if (e.type === 'burst') {
        for (const p of e.particles) {
          p.vy += 300 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
      }
      if (e.ttl > 0) fxKeep.push(e);
    }
    state.fx = fxKeep;
  }

  function drawStaff() {
    const w = canvas.clientWidth;
    ctx.save();
    ctx.strokeStyle = '#141415ff';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = staff.lineYs[i];
      ctx.beginPath();
      ctx.moveTo(12, y);
      ctx.lineTo(w - 12, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLedgerLines(noteX, radius, offsetSteps) {
    if (offsetSteps == null) return;
    const halfStep = staff.spacing / 2;
    const bottom = staff.yBottomLine();
    const left = noteX - radius - 10;
    const right = noteX + radius + 10;
    const drawLineAt = (y) => {
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    };
    ctx.save();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    if (offsetSteps > 1) {
      for (let s = 2; s <= offsetSteps; s += 2) {
        const y = bottom + s * halfStep;
        drawLineAt(y);
      }
    }
    if (offsetSteps <= -10) {
      for (let s = -10; s >= offsetSteps; s -= 2) {
        const y = bottom + s * halfStep;
        drawLineAt(y);
      }
    }
    ctx.restore();
  }

  function drawPiano() {
    const w = canvas.clientWidth;
    const top = piano.top;
    const h = piano.height;
    const keyW = piano.keyW;
    const labels = [];
    for (let i = 0; i < piano.whiteCount; i++) {
      const layoutPitch = PIANO_WHITE_KEYS[i];
      labels.push(layoutPitch ? getPitchLabel(layoutPitch) : '');
    }
    const mono = shouldUseMonoPalette();
    ctx.save();
    // base
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, top, w, h);
    // keys
    for (let i = 0; i < piano.whiteCount; i++) {
      const x = i * keyW;
      const pitch = WHITE_KEY_TO_PITCH[i];
      const meta = pitch ? getPitchMeta(pitch) : null;
      const pressed = meta ? (performance.now() - (piano.pressedAt[pitch] || 0) < 130) : false;
      if (meta) {
        const baseColor = meta.highlight || '#e6f2ff';
        const activeColor = meta.activeHighlight || meta.highlight || '#e6f2ff';
        if (mono) {
          ctx.fillStyle = pressed ? '#f3f4f6' : '#ffffff';
        } else {
          ctx.fillStyle = pressed ? activeColor : baseColor;
        }
        ctx.fillRect(x + 1, top + 1, keyW - 2, h - 2);
      }
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(x+0.5, top+0.5, keyW-1, h-1);
      // label (oculto desde 100 puntos)
      if (shouldShowPianoLabels(state.score)) {
        ctx.fillStyle = meta ? '#0f172a' : '#475569';
        ctx.font = meta ? 'bold 14px system-ui, -apple-system, Segoe UI, Roboto, Arial' : '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(labels[i] || '', x + keyW/2, top + h - 8);
      }
    }
    // black keys overlay
    for (const r of piano.blackRects) {
      const pressed = performance.now() - (piano.blackPressedAt[r.name] || 0) < 130;
      ctx.fillStyle = pressed ? '#222' : '#111';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    }
    // title
    ctx.fillStyle = '#64748b';
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const hintKey = GAME_CONFIG.hintKey || 'game.piano_hint';
    let hint = null;
    if (window.i18n && typeof window.i18n.t === 'function') {
      hint = window.i18n.t(hintKey);
    }
    if (!hint || hint === hintKey) {
      hint = GAME_CONFIG.hintFallback;
    }
    if (!hint) {
      const noteLabels = GAME_CONFIG.pitches.map(getPitchLabel);
      hint = buildHintFallback(noteLabels);
    }
    ctx.fillText(hint, 10, top + 8);
    ctx.restore();
  }

  function drawNotes() {
    ctx.font = 'bold 12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const mono = shouldUseMonoPalette();
    function shouldStemDown(pitch) {
      const meta = getPitchMeta(pitch);
      return meta && typeof meta.offsetSteps === 'number' && meta.offsetSteps <= -5;
    }
    for (const n of state.notes) {
      // note head
      const meta = getPitchMeta(n.pitch);
      const noteColor = mono ? '#111' : ((meta && meta.color) ? meta.color : '#1d4ed8');
      drawLedgerLines(n.x, n.r, meta ? meta.offsetSteps : 0);
      ctx.beginPath();
      ctx.fillStyle = noteColor;
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
      // opcional: plica para parecer más notación (a la derecha)
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      const stemLength = Math.floor(staff.spacing * 2);
      ctx.beginPath();
      if (shouldStemDown(n.pitch)) {
        ctx.moveTo(n.x - n.r, n.y);
        ctx.lineTo(n.x - n.r, n.y + stemLength);
      } else {
        ctx.moveTo(n.x + n.r, n.y);
        ctx.lineTo(n.x + n.r, n.y - stemLength);
      }
      ctx.stroke();
      // Mostrar nombre solo hasta 10 puntos
      if (shouldShowNoteLabels(state.score)) {
        ctx.fillStyle = '#111';
        ctx.fillText(meta ? getMetaLabel(meta) : n.pitch.toUpperCase(), n.x, n.y - Math.floor(staff.spacing * 2.4));
      }
    }
  }

  function drawOverlay() {
    if (!state.paused && !state.over) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 28px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    const title = state.over ? (window.i18n ? window.i18n.t('game.overlay.over') : 'Juego terminado') : (window.i18n ? window.i18n.t('game.overlay.pause') : 'Pausa');
    ctx.fillText(title, w/2, h/2 - 10);
    ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    const msg = state.over ? (window.i18n ? window.i18n.t('game.overlay.over_sub') : 'Pulsa Reiniciar para jugar de nuevo') : (window.i18n ? window.i18n.t('game.overlay.pause_sub') : 'Pulsa Pausa para continuar');
    ctx.fillText(msg, w/2, h/2 + 22);
    ctx.restore();
  }

  function clear() {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  }

  function draw() {
    clear();
    drawStaff();
    drawNotes();
    drawPiano();
    drawFX();
    drawOverlay();
  }

  function loop(tNow) {
    if (!state.running || state.paused || state.over) { draw(); return; }
    const dt = Math.min(0.035, (tNow - state.tPrev) / 1000);
    state.tPrev = tNow;
    update(dt);
    draw();
    if (state.running && !state.paused && !state.over) requestAnimationFrame(loop);
  }

  function maybeGrantBonusLife(prevScore, newScore) {
    if (!LIFE_BONUS_INTERVAL) return;
    const prevMilestone = Math.floor(prevScore / LIFE_BONUS_INTERVAL);
    const newMilestone = Math.floor(newScore / LIFE_BONUS_INTERVAL);
    const gained = newMilestone - prevMilestone;
    if (gained > 0) {
      state.lives += gained;
      if (hud.livesEl) {
        hud.livesEl.textContent = (window.i18n ? window.i18n.t('hud.lives', { n: state.lives }) : `Vidas: ${state.lives}`);
      }
    }
  }

  function addScore(points) {
    const prev = state.score;
    state.score += points;
    if (hud.scoreEl) {
      hud.scoreEl.textContent = (window.i18n ? window.i18n.t('hud.points', { n: state.score }) : `Puntos: ${state.score}`);
    }
    maybeGrantBonusLife(prev, state.score);
  }

  function handleHit(pitch) {
    // Visual feedback first
    if (piano.pressedAt[pitch] != null) {
      piano.pressedAt[pitch] = performance.now();
    }

    // Choose the leading (most advanced to the right) note still on screen
    let leadIndex = -1;
    let maxX = -Infinity;
    for (let i = 0; i < state.notes.length; i++) {
      const n = state.notes[i];
      if (n.x - n.r > canvas.clientWidth) continue; // already past
      if (n.x > maxX) { maxX = n.x; leadIndex = i; }
    }
    if (leadIndex === -1) return; // no notes to evaluate

    const lead = state.notes[leadIndex];
    const normalizedHit = normalizePitch(pitch);
    const normalizedLead = normalizePitch(lead.pitch);
    if (normalizedLead === normalizedHit) {
      // Correct: remove leading note and add score
      addBurst(lead.x, lead.y, lead.pitch);
      playPitch(lead.pitch);
      state.notes.splice(leadIndex, 1);
      addScore(SCORE_PER_HIT);
    } else {
      // Wrong: lose a life
      addCross(lead.x, lead.y);
      playError();
      state.lives -= 1;
      if (hud.livesEl) hud.livesEl.textContent = (window.i18n ? window.i18n.t('hud.lives', { n: state.lives }) : `Vidas: ${state.lives}`);
      if (state.lives <= 0) { endGame(); return; }
    }
  }

  // ---------- Visual FX ----------
  function addBurst(x, y, pitch) {
    const count = 12;
    const particles = [];
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const sp = 120 + Math.random() * 160;
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
    }
    state.fx.push({ type: 'burst', ttl: 0.35, particles, pitch });
  }
  function addCross(x, y) {
    state.fx.push({ type: 'cross', ttl: 0.35, x, y });
  }
  function drawFX() {
    for (const e of state.fx) {
      const t = Math.max(0, Math.min(1, e.ttl / 0.35));
      if (e.type === 'burst') {
        const meta = getPitchMeta(e.pitch);
        const alpha = Math.max(0, Math.min(1, 0.8 * t));
        const mono = shouldUseMonoPalette();
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = mono ? '#111' : ((meta && meta.color) ? meta.color : '#22c55e');
        for (const p of e.particles) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (e.type === 'cross') {
        const alpha = 0.85 * t;
        ctx.strokeStyle = `rgba(198,40,40,${alpha})`; // red
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(e.x - 14, e.y - 14);
        ctx.lineTo(e.x + 14, e.y + 14);
        ctx.moveTo(e.x + 14, e.y - 14);
        ctx.lineTo(e.x - 14, e.y + 14);
        ctx.stroke();
      }
    }
  }

  // ---------- Audio ----------
  const clamp01 = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.min(1, Math.max(0, num));
  };
  function computeGameVolume() {
    if (window.Sfx) {
      if (typeof window.Sfx.getGameVolume === 'function') {
        const vol = window.Sfx.getGameVolume();
        if (Number.isFinite(vol)) return clamp01(vol);
      }
      if (typeof window.Sfx.getState === 'function') {
        const state = window.Sfx.getState();
        if (state) {
          if (state.muted) return 0;
          if (state.volumeGame != null) return clamp01(state.volumeGame);
          if (state.volumeSfx != null) return clamp01(state.volumeSfx);
        }
      }
    }
    return 1;
  }
  let gameVolume = computeGameVolume();
  function currentGameVolume() { return gameVolume; }
  function setGameVolume(vol) {
    if (Number.isFinite(vol)) gameVolume = clamp01(vol);
    else gameVolume = computeGameVolume();
  }
  (function bindGameVolumeWatcher(attempt = 0) {
    if (window.Sfx && typeof window.Sfx.onGameVolumeChange === 'function') {
      window.Sfx.onGameVolumeChange((vol) => setGameVolume(vol));
      return;
    }
    if (attempt < 5) {
      setTimeout(() => bindGameVolumeWatcher(attempt + 1), 500);
    }
  })();
  const audio = { ctx: null };
  function ensureAudio() {
    if (!audio.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audio.ctx = new AC();
    }
  }
  function tone(freq, durMs, type = 'sine', gain = 0.08) {
    if (!audio.ctx) return;
    const mix = currentGameVolume();
    if (mix <= 0) return;
    const now = audio.ctx.currentTime;
    const osc = audio.ctx.createOscillator();
    const g = audio.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0, now);
    const peak = Math.max(0, gain * mix);
    g.gain.linearRampToValueAtTime(peak, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durMs / 1000);
    osc.connect(g).connect(audio.ctx.destination);
    osc.start(now);
    osc.stop(now + durMs / 1000 + 0.02);
  }
  // Piano-like tone: additive partials + short noise attack + lowpass envelope
  function pianoTone(freq, durMs = 500, baseGain = 0.12) {
    if (!audio.ctx) return;
    const mix = currentGameVolume();
    if (mix <= 0) return;
    const ctx = audio.ctx;
    const now = ctx.currentTime;

    // Output chain: partials -> lowpass -> destination
    const out = ctx.createGain();
    out.gain.setValueAtTime(1, now);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    // Slightly brighter at onset, then mellow
    lp.frequency.setValueAtTime(2600, now);
    lp.Q.setValueAtTime(0.7, now);
    lp.frequency.exponentialRampToValueAtTime(1100, now + Math.min(0.5, durMs / 1000));

    out.connect(lp).connect(ctx.destination);

    // Add a very short noise burst to emulate hammer attack
    try {
      const noiseDur = 0.03;
      const len = Math.floor(ctx.sampleRate * noiseDur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        // Slightly decaying white noise
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 1.6);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(1800, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(baseGain * 0.14 * mix, now);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + noiseDur);
      noise.connect(hp).connect(ng).connect(lp);
      noise.start(now);
      noise.stop(now + noiseDur);
    } catch (_) { /* ignore if not supported */ }

    // Partials: higher ones decay faster, small detune for richness
    const partials = [
      { mult: 1.0, type: 'triangle', weight: 0.85, detuneCents: 0, decay: 0.65 },
      { mult: 1.0, type: 'sine',     weight: 0.18, detuneCents: +4, decay: 0.60 },
      { mult: 2.0, type: 'sine',     weight: 0.40, detuneCents: 0,  decay: 0.45 },
      { mult: 3.0, type: 'sine',     weight: 0.25, detuneCents: 0,  decay: 0.35 },
      { mult: 4.0, type: 'sine',     weight: 0.16, detuneCents: 0,  decay: 0.28 },
    ];

    const sec = durMs / 1000;
    for (const p of partials) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = p.type;
      osc.frequency.setValueAtTime(freq * p.mult, now);
      if (osc.detune && p.detuneCents) osc.detune.setValueAtTime(p.detuneCents, now);
      // Percussive envelope: very fast attack, exponential decay
      const peak = baseGain * p.weight * mix;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), now + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.08, sec * p.decay));
      osc.connect(g).connect(out);
      osc.start(now);
      osc.stop(now + sec + 0.05);
    }
  }
  function playPitch(pitch) {
    ensureAudio();
    const meta = getPitchMeta(pitch);
    const freq = meta && meta.freq ? meta.freq : 392.0;
    // Make the piano-like sound ring longer
    pianoTone(freq, 2400, 0.12);
  }
  function playError() {
    ensureAudio();
    // two short low beeps (más fuertes)
    tone(220, 140, 'square', 0.12);
    setTimeout(() => tone(180, 140, 'triangle', 0.12), 70);
  }

  // Keyboard: S = Sol, M = Mi, P = pausa
  window.addEventListener('keydown', (e) => {
    const target = e.target;
    const active = document.activeElement;
    const isTypingTarget = (el) => {
      if (!el) return false;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true;
      return Boolean(el.isContentEditable);
    };
    if (isTypingTarget(target) || isTypingTarget(active)) {
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'enter') {
      e.preventDefault();
      if (state.over) resetGame();
      startGame();
      return;
    }
    if (k === ' ' || k === 'spacebar') {
      e.preventDefault();
      pauseGame();
      return;
    }
    if (k === 'p') { e.preventDefault(); pauseGame(); return; }
    const mappedPitch = KEYBOARD_MAP[k];
    if (mappedPitch) {
      ensureAudio();
      handleHit(mappedPitch);
      e.preventDefault();
    }
  });

  // Pointer: tocar sobre el piano
  canvas.addEventListener('pointerdown', (e) => {
    ensureAudio();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (y >= piano.top) {
      // Prioridad a teclas negras (dibujadas encima)
      for (const r of piano.blackRects) {
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          piano.blackPressedAt[r.name] = performance.now();
          return; // negras no afectan al juego, solo visual
        }
      }
      // Si no tocó negra, evaluar blanca
      const i = Math.floor(x / piano.keyW);
      const pitch = WHITE_KEY_TO_PITCH[i];
      if (pitch) handleHit(pitch);
    }
  });

  // Buttons
  hud.startBtn.addEventListener('click', () => { if (state.over) resetGame(); startGame(); });
  hud.pauseBtn.addEventListener('click', pauseGame);
  hud.restartBtn.addEventListener('click', () => { resetGame(); startGame(); });

  // Speed selector
  if (hud.speedSel) {
    hud.speedSel.addEventListener('change', () => {
      applySpeed(hud.speedSel.value || 'normal');
    });
    // Initialize from UI default
    applySpeed(hud.speedSel.value || 'normal');
  }

  // Init
  resetGame();
  // Update texts when language changes
  if (window.i18n && typeof window.i18n.onChange === 'function') {
    window.i18n.onChange(() => {
      if (hud.scoreEl) hud.scoreEl.textContent = window.i18n.t('hud.points', { n: state.score });
      if (hud.livesEl) hud.livesEl.textContent = window.i18n.t('hud.lives', { n: state.lives });
      draw();
    });
  }
})();
