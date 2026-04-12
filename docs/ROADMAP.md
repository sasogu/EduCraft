# Roadmap Tecnico

## Estado actual

Este documento recoge el plan de mejora acordado para EduCraft y sirve como punto de continuidad para siguientes sesiones de trabajo.

## Fase Rapida

- Unificar el build oficial del frontend y el build real de despliegue.
- Separar mejor los modos de desarrollo y produccion.
- Verificar automaticamente el backend despues del despliegue.
- Endurecer el servidor WebSocket con limites basicos y control de salud.
- Mejorar la higiene del repositorio para evitar artefactos accidentales.

## Trabajo ya realizado

- `package.json` ya expone scripts mas claros para `build`, `build:test`, `build:dev`, `check` y `deploy`.
- `docs/test/webpack.config.js` ya distingue entre modo `development` y `production`.
- `docs/test/index.js` ya limita el debug visual a entorno local o `?debug=1`.
- `scripts/deploy-vps.sh` ya ejecuta un healthcheck remoto tras el reinicio.
- `server/src/index.ts` ya aplica `maxPayload`, heartbeat, timeout de cliente, rate limit y cierre por mensajes invalidos repetidos.
- `.gitignore` ya cubre artefactos comunes generados por este repo.
- `server/test/protocol.test.mjs` ya cubre validaciones basicas del protocolo con `node:test`.
- `npm run check` ya incluye smoke check del build y tests minimos del backend.

## Siguiente bloque recomendado

1. Extraer `multiplayer`, `ui`, `worlds` y `classroom` de `docs/test/index.js`.
2. Introducir configuracion centralizada para flags de runtime del cliente y del servidor.
3. Revisar la persistencia de mundos para evolucionar de blob completo a guardado incremental.
4. Ampliar los tests del backend para cubrir rate limiting, heartbeat y control de origen.
5. Implementar diferencias funcionales reales entre modos `Survival` y `Creativo` (activar vuelo en creativo, ajustar gravedad y comportamiento sobre agua segun modo).

## Fase Media

- Dividir el cliente principal en modulos mantenibles.
- Mejorar observabilidad del backend con logs y metricas basicas.
- Preparar pruebas automatizadas para build, protocolo y almacenamiento local.
- Reducir acoplamiento entre UI, mundo, audio y aula musical.

## Fase Ambiciosa

- Migrar el frontend a tooling mas moderno.
- Redisenar la capa de estado del cliente.
- Evolucionar el multijugador hacia snapshots mas compactos y validacion de movimiento mas rica.
- Versionar el esquema de persistencia local y preparar migraciones.
- Montar CI con build, tests y verificacion de despliegue.
