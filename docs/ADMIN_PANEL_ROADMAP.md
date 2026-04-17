# Admin Panel Roadmap

Este documento recoge el roadmap del panel de administracion de EduCraft y deja por escrito el alcance del MVP ya implementado para poder retomarlo facilmente en futuras sesiones.

## Objetivo

El panel de admin debe responder cuatro preguntas con rapidez:

- que esta pasando ahora mismo en el servidor
- que ha pasado hoy o en los ultimos dias
- que mundos se usan mas
- si el backend esta sano o empieza a degradarse

## Principios

- No introducir acciones peligrosas mientras no haya autenticacion.
- Priorizar observabilidad y continuidad sobre complejidad.
- Mantener la API admin separada del HTML para poder evolucionar la UI sin rehacer el backend.
- Persistir metricas y eventos para no perder todo al reiniciar.

## Fase 1

Objetivo: observabilidad util con coste bajo.

- Resumen en vivo: jugadores activos, mundos activos, mundos conocidos desde arranque.
- Salud basica: uptime, memoria RSS, heap usada, tick rate.
- Timeline reciente: entradas, salidas, cambios de mundo, errores de protocolo, rate limit y timeouts.
- Historial de concurrencia: series temporales con snapshots del servidor.
- Ranking basico de mundos: actividad actual y pico reciente.

## Fase 2

Objetivo: persistencia e historico util.

- Guardar eventos y snapshots en almacenamiento persistente.
- Consultar picos de concurrencia por ventana temporal.
- Identificar mundos mas visitados y con mas actividad.
- Preparar agregados por hora y por dia.
- Registrar duracion de sesiones de jugador.

## Fase 3

Objetivo: visibilidad operativa.

- Alertas visuales por memoria alta, demasiados errores o demasiados rate limits.
- Heatmap o resumen espacial de zonas mas modificadas por mundo.
- Grupos de eventos por tipo para detectar anomalias rapidamente.
- Graficas mas ricas para concurrencia, bloques editados y sesiones.
- Exportacion de metricas y eventos para analisis externo.

## Fase 4

Objetivo: preparar la futura moderacion.

- Modelo interno de acciones admin y auditoria.
- Estado de mundos: observado, congelado, solo lectura.
- API preparada para permisos y autenticacion futura.
- Registro de acciones administrativas.
- Permisos por rol cuando se active autenticacion.

## MVP Implementado

El MVP actual ya deja lista una base practica de admin v2 sin introducir acciones peligrosas.

### Backend

- `GET /admin`: panel HTML con auto refresco.
- `GET /admin/stats`: estado actual del servidor y metricas clave.
- `GET /admin/events`: timeline reciente con filtros por tipo, mundo, jugador y limite.
- `GET /admin/history`: serie temporal de concurrencia y mundos activos.
- `GET /admin/worlds`: resumen actual y pico reciente por mundo.
- `GET /admin/health`: salud tecnica del proceso Node.

### Persistencia

- Se guarda un fichero JSON con snapshots y eventos recientes.
- La ruta por defecto es `server/admin-data/admin-store.json` cuando el proceso se lanza desde la carpeta `server/`.
- La ruta puede cambiarse con la variable `ADMIN_DATA_FILE`.

### Eventos guardados

- `player_join`
- `player_leave`
- `world_change`
- `invalid_message`
- `rate_limit`
- `client_timeout`
- `block_update`

### Snapshots guardados

- jugadores activos
- mundos activos
- mundos conocidos desde arranque
- RSS y heap usada
- uptime del proceso
- resumen por mundo

## Siguiente Iteracion Recomendada

1. Persistir sesiones de jugador con `connected_at`, `disconnected_at` y duracion.
2. Añadir agregados por hora y por dia para no depender solo de snapshots crudos.
3. Separar la UI de `/admin` en modulos o assets propios si sigue creciendo.
4. Añadir indicadores visuales de alerta en el panel.
5. Valorar migracion de almacenamiento JSON a SQLite cuando el historico crezca.
