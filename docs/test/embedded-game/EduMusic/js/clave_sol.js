(() => {
  const canvas = document.getElementById('clefCanvas');
  const ctx = canvas.getContext('2d');
  const resultEl = document.getElementById('clefResult');
  const resetBtn = document.getElementById('resetBtn');
  const evalBtn = document.getElementById('evaluateBtn');
  const showGuides = document.getElementById('showGuides');

  // Responsive sizing
  function resizeCanvas() {
    const maxW = Math.min(window.innerWidth - 32, 900);
    const ratio = 700/500; // base ratio
    const width = Math.max(320, maxW);
    const height = Math.round(width / ratio);
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  // Staff metrics
  function getStaff() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const marginX = Math.round(w * 0.12);
    const marginY = Math.round(h * 0.12);
    const staffTop = marginY + Math.round(h * 0.12);
    const lineGap = Math.round(h * 0.045);
    const staffHeight = lineGap * 4;
    return { w, h, marginX, marginY, staffTop, lineGap, staffHeight };
  }

  // Guide checkpoints: start on the G line (2nd from bottom),
  // make a small spiral (caracol) around it, then go up like an
  // "efe" and finish down with the lower loop and tail.
  function buildGuidePoints() {
    const s = getStaff();
    const left = s.marginX;
    const right = s.w - s.marginX;
    const centerX = left + (right - left) * 0.35; // eje de la clave
    const top = s.staffTop - s.lineGap * 2.6;
    const bottom = s.staffTop + s.staffHeight + s.lineGap * 2.6;
    // 2ª línea contando DESDE ABAJO: índice 3 (0=arriba,4=abajo)
    const gLineY = s.staffTop + s.lineGap * 3;
    const firstLineY = s.staffTop + s.lineGap * 4; // 1ª línea (abajo del todo)

    const g = s.lineGap;
    const pts = [
      // 1) Inicio: 2ª línea desde abajo (SOL)
      { x: centerX,      y: gLineY },                 // 1
      // 2-6) Caracol ajustado según indicaciones
      { x: centerX + 1.1*g, y: gLineY - 0.9*g },      // 2 (arriba-dcha)
      { x: centerX + 2.6*g, y: gLineY },      // 3 a la derecha
      { x: centerX + 0.6*g, y: firstLineY },          // 4 tocando 1ª línea (abajo)
      { x: centerX - 1.2*g, y: gLineY },              // 5 en 2ª línea (posición del antiguo 3)
      { x: centerX - 0.8*g, y: gLineY - 1.1*g },      // 6 más arriba
      // 7-10) Subida tipo "efe"
      { x: centerX + 0.6*g, y: s.staffTop - 0.1*g },  // 7
      { x: centerX - 1.3*g, y: s.staffTop - 1.2*g },  // 8 cabeza izda
      { x: centerX + 1.6*g, y: s.staffTop - 1.9*g },  // 9 extremo alto
      { x: centerX - 0.2*g, y: s.staffTop + 0.7*g },  // 10 baja al eje
      // 11-15) Gran bucle inferior, panza a la izquierda
      { x: centerX + 1.9*g, y: s.staffTop + 2.2*g },  // 11 derecha media
      { x: centerX + 2.3*g, y: s.staffTop + 3.4*g },  // 12 derecha baja
      { x: centerX - 2.6*g, y: s.staffTop + 4.6*g },  // 13 izquierda baja
      { x: centerX + 1.6*g, y: s.staffTop + 5.6*g },  // 14 vuelve derecha
      { x: centerX - 0.6*g, y: s.staffTop + 6.2*g },  // 15 cruza eje
      // 16-17) Cola final
      { x: centerX - 1.9*g, y: bottom - 0.9*g },      // 16 burbuja izda inferior
      { x: centerX + 0.2*g, y: bottom },              // 17 extremo cola
    ];
    return pts;
  }

  let guides = [];
  let hits = []; // booleans per guide index
  function resetHits() { hits = new Array(guides.length).fill(false); }

  // Drawing state
  let drawing = false;
  let path = [];// {x,y}

  function clearCanvas() {
    const s = getStaff();
    ctx.clearRect(0, 0, s.w, s.h);
  }

  function drawStaff() {
    const s = getStaff();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) {
      const y = s.staffTop + i * s.lineGap;
      ctx.beginPath();
      ctx.moveTo(s.marginX, y);
      ctx.lineTo(s.w - s.marginX, y);
      ctx.stroke();
    }
    // Emphasize G line: 2ª desde ABAJO (índice 3)
    const gY = s.staffTop + s.lineGap * 3;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(s.marginX, gY);
    ctx.lineTo(s.w - s.marginX, gY);
    ctx.stroke();
  }

  function drawGuides() {
    if (!showGuides.checked) return;
    ctx.save();
    ctx.fillStyle = 'rgba(14,165,233,0.22)';
    ctx.strokeStyle = 'rgba(14,165,233,0.7)';
    for (let i = 0; i < guides.length; i++) {
      const p = guides[i];
      const r = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // index label
      ctx.fillStyle = '#0ea5e9';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i+1), p.x, p.y);
      ctx.fillStyle = 'rgba(14,165,233,0.22)';
    }
    // draw connecting polyline for better shape hint
    ctx.strokeStyle = 'rgba(14,165,233,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < guides.length; i++) {
      const p = guides[i];
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawPath() {
    if (path.length < 2) return;
    ctx.save();
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    clearCanvas();
    drawStaff();
    drawGuides();
    drawPath();
  }

  function dist2(a, b) {
    const dx = a.x - b.x; const dy = a.y - b.y; return Math.sqrt(dx*dx + dy*dy);
  }

  function updateHits(pt) {
    // hit next unchecked guide if within radius
    const radius = 18; // pixels, un poco más tolerante
    for (let i = 0; i < guides.length; i++) {
      if (hits[i]) continue;
      const d = dist2(pt, guides[i]);
      if (d <= radius) { hits[i] = true; break; }
      // keep order roughly enforced: only allow hitting i if i-1 is done
      if (i > 0 && !hits[i-1]) break;
    }
  }

  function pathLength() {
    let len = 0;
    for (let i = 1; i < path.length; i++) {
      const a = path[i-1], b = path[i];
      len += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return len;
  }

  function evaluate() {
    const s = getStaff();
    const total = guides.length;
    const hitCount = hits.filter(Boolean).length;
    const len = pathLength();
    // Require a minimum length across most of the staff height
    const minLen = (s.w * 0.5 + s.staffHeight * 3);
    const ratio = hitCount / total;
    let msg;
    let ok = ratio >= 0.7 && len >= minLen * 0.7; // flexible threshold
    if (ok) {
      msg = (window.i18n && window.i18n.t('clef.result.good')) || '¡Muy bien! Buena forma de clave de sol.';
    } else if (ratio >= 0.45) {
      msg = (window.i18n && window.i18n.t('clef.result.near')) || 'Casi. Recorre mejor los puntos guía.';
    } else {
      msg = (window.i18n && window.i18n.t('clef.result.try')) || 'Intenta de nuevo siguiendo la guía.';
    }
    resultEl.textContent = msg + ` (${Math.round(ratio*100)}%)`;
  }

  function startDraw(x, y) {
    drawing = true;
    path = [{ x, y }];
    resetHits();
    updateHits(path[0]);
    resultEl.textContent = '';
    draw();
  }
  function continueDraw(x, y) {
    if (!drawing) return;
    const last = path[path.length - 1];
    if (Math.hypot(x - last.x, y - last.y) < 2) return; // thin sampling
    const p = { x, y };
    path.push(p);
    updateHits(p);
    draw();
  }
  function endDraw() { drawing = false; }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // Init
  function initGuides() {
    guides = buildGuidePoints();
    resetHits();
  }

  function resetAll() {
    path = [];
    resetHits();
    resultEl.textContent = '';
    draw();
  }

  // Events
  canvas.addEventListener('mousedown', (e) => { const p = getPos(e); startDraw(p.x, p.y); });
  window.addEventListener('mousemove', (e) => { if (!drawing) return; const p = getPos(e); continueDraw(p.x, p.y); });
  window.addEventListener('mouseup', endDraw);
  canvas.addEventListener('touchstart', (e) => { const p = getPos(e); startDraw(p.x, p.y); e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { const p = getPos(e); continueDraw(p.x, p.y); e.preventDefault(); }, { passive: false });
  canvas.addEventListener('touchend', (e) => { endDraw(); e.preventDefault(); }, { passive: false });

  resetBtn.addEventListener('click', resetAll);
  evalBtn.addEventListener('click', evaluate);
  showGuides.addEventListener('change', draw);

  // Handle resize
  window.addEventListener('resize', () => {
    resizeCanvas();
    initGuides();
    draw();
  });

  // Boot
  function boot() {
    resizeCanvas();
    initGuides();
    draw();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
