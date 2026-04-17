export function buildAdminHtml(): string {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>EduCraft Admin</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #281f17;
      --muted: #6f604e;
      --panel: rgba(255, 251, 245, 0.92);
      --line: rgba(56, 44, 29, 0.14);
      --accent: #1f7a63;
      --accent-soft: rgba(31, 122, 99, 0.14);
      --warn: #b76d24;
      --bg-a: #f2e7d6;
      --bg-b: #eef4ea;
      --shadow: 0 18px 50px rgba(57, 39, 17, 0.12);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      color: var(--ink);
      font-family: "Trebuchet MS", "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top left, rgba(255,255,255,0.55), transparent 32%),
        radial-gradient(circle at 85% 20%, rgba(255,225,180,0.35), transparent 24%),
        linear-gradient(135deg, var(--bg-a), #faf6ef 45%, var(--bg-b));
    }

    main {
      width: min(1200px, calc(100% - 28px));
      margin: 0 auto;
      padding: 28px 0 48px;
    }

    .hero {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: end;
      margin-bottom: 18px;
    }

    h1 {
      margin: 0;
      font-size: clamp(2rem, 3vw, 3.1rem);
    }

    .subtitle {
      margin-top: 8px;
      color: var(--muted);
      max-width: 62ch;
      line-height: 1.45;
    }

    .status {
      min-width: 240px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--panel);
      box-shadow: var(--shadow);
      padding: 12px 14px;
      color: var(--muted);
    }

    .summary, .layout {
      display: grid;
      gap: 14px;
    }

    .summary {
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      margin-bottom: 16px;
    }

    .layout {
      grid-template-columns: 1.3fr 0.9fr;
      align-items: start;
    }

    .panel {
      border: 1px solid var(--line);
      border-radius: 22px;
      background: var(--panel);
      box-shadow: var(--shadow);
      padding: 18px;
      backdrop-filter: blur(10px);
    }

    .metric-label, .panel-kicker {
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.78rem;
      color: var(--muted);
    }

    .metric-value {
      margin-top: 8px;
      font-size: clamp(1.8rem, 4vw, 2.6rem);
      font-weight: 700;
    }

    .metric-note {
      margin-top: 8px;
      font-size: 0.95rem;
      color: var(--muted);
      line-height: 1.4;
    }

    .panel-head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: end;
      margin-bottom: 12px;
    }

    .panel-title {
      margin-top: 4px;
      font-size: 1.25rem;
      font-weight: 700;
    }

    .controls {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .controls select, .controls input {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 10px 12px;
      background: rgba(255,255,255,0.72);
      color: var(--ink);
      min-width: 0;
    }

    .chart {
      width: 100%;
      height: 220px;
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(31, 122, 99, 0.08), rgba(31, 122, 99, 0.02));
      border: 1px solid rgba(31, 122, 99, 0.08);
    }

    .legend {
      margin-top: 10px;
      color: var(--muted);
      font-size: 0.92rem;
    }

    .events, .worlds {
      display: grid;
      gap: 10px;
    }

    .event, .world-card {
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 12px 14px;
      background: rgba(255,255,255,0.52);
    }

    .event-top, .world-top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: center;
      margin-bottom: 6px;
    }

    .tag {
      display: inline-flex;
      align-items: center;
      padding: 6px 10px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 0.85rem;
      font-weight: 700;
    }

    .event-meta, .world-meta, .empty, .footnote {
      color: var(--muted);
      font-size: 0.94rem;
      line-height: 1.4;
    }

    .footnote {
      margin-top: 12px;
    }

    @media (max-width: 920px) {
      .layout {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .hero, .panel-head, .event-top, .world-top {
        flex-direction: column;
        align-items: stretch;
      }

      .status {
        min-width: 0;
      }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div>
        <h1>Panel Admin</h1>
        <div class="subtitle">Supervision en vivo del backend multijugador, con historial reciente, salud tecnica y timeline de eventos para entender que esta pasando sin tocar acciones peligrosas.</div>
      </div>
      <div class="status" id="status">Cargando metricas...</div>
    </section>

    <section class="summary" id="summary"></section>

    <section class="layout">
      <div class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-kicker">Historia</div>
            <div class="panel-title">Concurrencia reciente</div>
          </div>
          <div class="controls">
            <select id="history-range">
              <option value="1h">1 hora</option>
              <option value="24h" selected>24 horas</option>
              <option value="7d">7 dias</option>
            </select>
            <select id="history-step">
              <option value="300000">5 min</option>
              <option value="900000" selected>15 min</option>
              <option value="3600000">1 h</option>
            </select>
          </div>
        </div>
        <svg class="chart" id="history-chart" viewBox="0 0 800 220" preserveAspectRatio="none"></svg>
        <div class="legend" id="history-legend">Sin datos historicos todavia.</div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-kicker">Salud</div>
            <div class="panel-title">Proceso Node</div>
          </div>
        </div>
        <div class="events" id="health"></div>
        <div class="footnote">Los snapshots persistidos permiten mantener historial tras reinicios, pero la metrica de mundos conocidos desde arranque sigue siendo por proceso.</div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-kicker">Timeline</div>
            <div class="panel-title">Eventos recientes</div>
          </div>
          <div class="controls">
            <select id="events-type">
              <option value="">Todos</option>
              <option value="player_join">Entradas</option>
              <option value="player_leave">Salidas</option>
              <option value="world_change">Cambios de mundo</option>
              <option value="invalid_message">Mensajes invalidos</option>
              <option value="rate_limit">Rate limit</option>
              <option value="client_timeout">Timeouts</option>
              <option value="block_update">Bloques</option>
            </select>
            <input id="events-world" placeholder="Mundo">
          </div>
        </div>
        <div class="events" id="events"></div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <div>
            <div class="panel-kicker">Mundos</div>
            <div class="panel-title">Actividad actual y pico reciente</div>
          </div>
        </div>
        <div class="worlds" id="worlds"></div>
      </div>
    </section>
  </main>

  <script>
    var rangeInput = document.getElementById('history-range');
    var stepInput = document.getElementById('history-step');
    var eventsTypeInput = document.getElementById('events-type');
    var eventsWorldInput = document.getElementById('events-world');

    function formatNumber(value) {
      return new Intl.NumberFormat('es-ES').format(Number(value || 0));
    }

    function formatDate(value) {
      try {
        return new Date(value).toLocaleString('es-ES');
      } catch {
        return value;
      }
    }

    function formatAgo(value) {
      var diff = Math.max(0, Date.now() - Date.parse(value));
      var seconds = Math.round(diff / 1000);
      if (seconds < 60) return 'hace ' + seconds + 's';
      var minutes = Math.round(seconds / 60);
      if (minutes < 60) return 'hace ' + minutes + ' min';
      var hours = Math.round(minutes / 60);
      if (hours < 48) return 'hace ' + hours + ' h';
      var days = Math.round(hours / 24);
      return 'hace ' + days + ' d';
    }

    function metricCard(label, value, note) {
      return '<article class="panel"><div class="metric-label">' + label + '</div><div class="metric-value">' + value + '</div><div class="metric-note">' + note + '</div></article>';
    }

    function escapeHtml(value) {
      return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function buildPolyline(points, accessor, width, height, padding) {
      if (!points.length) return '';
      var maxValue = Math.max(1, ...points.map(accessor));
      return points.map(function(point, index) {
        var x = padding + (index * (width - padding * 2)) / Math.max(1, points.length - 1);
        var y = height - padding - ((accessor(point) / maxValue) * (height - padding * 2));
        return x.toFixed(1) + ',' + y.toFixed(1);
      }).join(' ');
    }

    function renderHistory(history) {
      var svg = document.getElementById('history-chart');
      var legend = document.getElementById('history-legend');
      if (!history.length) {
        svg.innerHTML = '';
        legend.textContent = 'Aun no hay snapshots suficientes para dibujar la serie.';
        return;
      }
      var width = 800;
      var height = 220;
      var padding = 18;
      var playersLine = buildPolyline(history, function(point) { return point.activePlayers; }, width, height, padding);
      var worldsLine = buildPolyline(history, function(point) { return point.activeWorlds; }, width, height, padding);
      var maxPlayers = Math.max.apply(null, history.map(function(point) { return point.activePlayers; }));
      var maxWorlds = Math.max.apply(null, history.map(function(point) { return point.activeWorlds; }));
      svg.innerHTML = [
        '<polyline fill="none" stroke="rgba(31,122,99,0.18)" stroke-width="14" points="' + playersLine + '"></polyline>',
        '<polyline fill="none" stroke="#1f7a63" stroke-width="3" points="' + playersLine + '"></polyline>',
        '<polyline fill="none" stroke="#b76d24" stroke-width="2" stroke-dasharray="6 5" points="' + worldsLine + '"></polyline>'
      ].join('');
      legend.textContent = 'Pico de jugadores: ' + maxPlayers + ' · Pico de mundos activos: ' + maxWorlds + ' · Ultimo punto: ' + formatDate(history[history.length - 1].ts);
    }

    function renderEvents(events) {
      var container = document.getElementById('events');
      if (!events.length) {
        container.innerHTML = '<div class="empty">No hay eventos para ese filtro.</div>';
        return;
      }
      container.innerHTML = events.map(function(event) {
        var meta = event.meta ? Object.entries(event.meta).map(function(entry) {
          return '<span><strong>' + escapeHtml(entry[0]) + '</strong>: ' + escapeHtml(entry[1]) + '</span>';
        }).join(' · ') : 'Sin metadatos';
        return '<article class="event">' +
          '<div class="event-top"><span class="tag">' + escapeHtml(event.type) + '</span><span class="event-meta">' + formatAgo(event.ts) + '</span></div>' +
          '<div><strong>' + escapeHtml(event.playerName || event.clientId || 'Servidor') + '</strong>' + (event.worldName ? ' en <strong>' + escapeHtml(event.worldName) + '</strong>' : '') + '</div>' +
          '<div class="event-meta">' + meta + '</div>' +
        '</article>';
      }).join('');
    }

    function renderWorlds(worlds) {
      var container = document.getElementById('worlds');
      if (!worlds.length) {
        container.innerHTML = '<div class="empty">No hay mundos activos ni historico reciente.</div>';
        return;
      }
      container.innerHTML = worlds.map(function(world) {
        return '<article class="world-card">' +
          '<div class="world-top"><strong>' + escapeHtml(world.name) + '</strong><span class="tag">' + formatNumber(world.activePlayers) + ' ahora</span></div>' +
          '<div class="world-meta">Pico 24h: ' + formatNumber(world.peakPlayers24h) + ' · Bloques editados: ' + formatNumber(world.blockEdits) + '</div>' +
          '<div class="world-meta">Ultima aparicion en snapshots: ' + (world.lastSeenAt ? formatAgo(world.lastSeenAt) : 'sin historico') + '</div>' +
        '</article>';
      }).join('');
    }

    function renderHealth(health) {
      var container = document.getElementById('health');
      container.innerHTML = [
        '<div class="event"><div class="event-top"><strong>Uptime</strong><span class="tag">' + formatNumber(health.uptimeSeconds) + ' s</span></div><div class="event-meta">Proceso vivo desde hace ' + formatNumber(health.uptimeSeconds) + ' segundos.</div></div>',
        '<div class="event"><div class="event-top"><strong>Memoria RSS</strong><span class="tag">' + formatNumber(health.memoryRssMb) + ' MB</span></div><div class="event-meta">Incluye heap, buffers y memoria residente total.</div></div>',
        '<div class="event"><div class="event-top"><strong>Heap usada</strong><span class="tag">' + formatNumber(health.memoryHeapUsedMb) + ' MB</span></div><div class="event-meta">Memoria JS usada por el proceso.</div></div>',
        '<div class="event"><div class="event-top"><strong>Tick rate</strong><span class="tag">' + formatNumber(health.tickRate) + ' Hz</span></div><div class="event-meta">Frecuencia configurada del loop del servidor.</div></div>'
      ].join('');
    }

    async function refreshStats() {
      var response = await fetch('/admin/stats', { cache: 'no-store' });
      if (!response.ok) throw new Error('stats ' + response.status);
      var data = await response.json();
      document.getElementById('status').textContent = 'Actualizado: ' + formatDate(data.generatedAt);
      document.getElementById('summary').innerHTML =
        metricCard('Jugadores activos', formatNumber(data.totals.activePlayers), 'Conexiones WebSocket vivas ahora mismo.') +
        metricCard('Mundos activos', formatNumber(data.totals.activeWorlds), 'Salas con al menos un jugador conectado.') +
        metricCard('Mundos conocidos', formatNumber(data.totals.knownWorldsSinceBoot), 'Contador por proceso desde el ultimo arranque.') +
        metricCard('Pico 24h', formatNumber(data.totals.peakPlayers24h), 'Maximo de concurrencia observado en snapshots persistidos.') +
        metricCard('Eventos 24h', formatNumber(data.totals.events24h), 'Eventos recientes guardados para timeline y diagnostico.');
      renderHealth(data.health);
    }

    async function refreshHistory() {
      var params = new URLSearchParams({ range: rangeInput.value, step: stepInput.value });
      var response = await fetch('/admin/history?' + params.toString(), { cache: 'no-store' });
      if (!response.ok) throw new Error('history ' + response.status);
      var data = await response.json();
      renderHistory(data.points || []);
    }

    async function refreshEvents() {
      var params = new URLSearchParams({ limit: '40' });
      if (eventsTypeInput.value) params.set('type', eventsTypeInput.value);
      if (eventsWorldInput.value) params.set('world', eventsWorldInput.value.trim());
      var response = await fetch('/admin/events?' + params.toString(), { cache: 'no-store' });
      if (!response.ok) throw new Error('events ' + response.status);
      var data = await response.json();
      renderEvents(data.events || []);
    }

    async function refreshWorlds() {
      var response = await fetch('/admin/worlds', { cache: 'no-store' });
      if (!response.ok) throw new Error('worlds ' + response.status);
      var data = await response.json();
      renderWorlds(data.worlds || []);
    }

    async function refreshAll() {
      try {
        await Promise.all([refreshStats(), refreshHistory(), refreshEvents(), refreshWorlds()]);
      } catch (error) {
        document.getElementById('status').textContent = 'Error cargando panel';
      }
    }

    rangeInput.addEventListener('change', refreshHistory);
    stepInput.addEventListener('change', refreshHistory);
    eventsTypeInput.addEventListener('change', refreshEvents);
    eventsWorldInput.addEventListener('change', refreshEvents);
    eventsWorldInput.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') refreshEvents();
    });

    refreshAll();
    setInterval(refreshAll, 5000);
  </script>
</body>
</html>`;
}
