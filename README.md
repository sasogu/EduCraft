# EduCraft

EduCraft es una experiencia voxel educativa construida sobre `noa-engine` y Babylon.js. El proyecto combina exploración 3D, edición de bloques, guardado local, multijugador por WebSocket y minijuegos integrados orientados al aprendizaje musical.

## Estructura del proyecto

- `docs/test/`: frontend estático del juego, recursos, texturas, audio y minijuegos embebidos.
- `server/`: backend Node.js para presencia multijugador y sincronización por WebSocket.
- `src/`: base del motor y código heredado de `noa-engine`.
- `build-and-deploy.sh`: build manual del bundle del frontend.
- `scripts/deploy-vps.sh`: despliegue rápido al VPS.

## Funcionalidades principales

- Mundo voxel interactivo con colocación y eliminación de bloques.
- Inventario y hotbar.
- Guardado local de ajustes y progreso con IndexedDB.
- Múltiples mundos.
- Multijugador básico con sincronización de posición y nombre.
- Interfaz in-game personalizada.
- Soporte de teclado, ratón y detección de entorno móvil.
- Bloques y dinámicas musicales.
- Panel web integrado con minijuegos HTML externos.

## Controles por defecto

- `WASD`: mover
- `Ratón`: mirar
- `Clic izquierdo`: quitar bloque
- `Clic derecho`: colocar bloque
- `E`: abrir o cerrar inventario
- `1-9`: seleccionar slot de hotbar
- `Espacio`: saltar
- `Shift`: agacharse
- `O`: cambiar de mundo en la demo avanzada
- `Z`: abrir inspector Babylon.js cuando `debug` está activo

Algunos controles pueden variar según la demo o la configuración activa.

## Requisitos

- `node` y `npm`
- `rsync` para despliegues al VPS
- `ssh` para acceso al servidor
- `systemd` en el VPS para el backend
- `nginx` o equivalente si se sirve el frontend con proxy inverso a `/ws`

## Desarrollo local

Instala dependencias del frontend:

```sh
npm install
```

Instala dependencias del backend:

```sh
cd server
npm install
```

### Ejecutar frontend en local

```sh
npm test
```

Esto arranca el entorno de prueba con `webpack-dev-server` usando `docs/test/`.
En local se mantienen activas las ayudas visuales de depuración.

### Compilar frontend

```sh
npm run build:test
```

El bundle generado se escribe como `docs/test/bundle.js`.
Si necesitas recompilar también la demo `hello-world`, usa:

```sh
npm run build
```

### Compilar backend

```sh
cd server
npm run build
```

### Ejecutar comprobaciones rápidas

```sh
npm run check
```

Este comando recompila el frontend, verifica que los bundles esperados existen y ejecuta los tests mínimos del protocolo del backend.

### Ejecutar backend en desarrollo

```sh
cd server
npm run dev
```

Por defecto el backend escucha en el puerto `8080`.

## Arquitectura de despliegue

La forma recomendada de desplegar EduCraft en producción es:

- `docs/test/` servido como sitio estático.
- `server/` ejecutándose como servicio Node.js.
- `nginx` haciendo proxy WebSocket desde `/ws` al backend.

El cliente usa por defecto:

- `ws://TU_HOST/ws` si la página va por HTTP
- `wss://TU_HOST/ws` si la página va por HTTPS

Ese comportamiento está implementado en [docs/test/index.js](/home/sasogu/github/web/EduCraft/docs/test/index.js:98).

## Despliegue al VPS con un comando

El script [scripts/deploy-vps.sh](/home/sasogu/github/web/EduCraft/scripts/deploy-vps.sh:1) automatiza el flujo de despliegue.

Hace lo siguiente:

1. Compila el frontend.
2. Crea las rutas remotas si faltan.
3. Sincroniza `docs/test/` al directorio web del VPS con `rsync`.
4. Sincroniza `server/` al directorio backend del VPS con `rsync`.
5. Ejecuta en remoto `npm install`, `npm run build` y reinicia el servicio `systemd`.
6. Ejecuta un healthcheck remoto para confirmar que el backend responde.

### Configuración inicial

Copia la plantilla:

```sh
cp scripts/deploy.config.example scripts/deploy.config
```

Edita `scripts/deploy.config` con tus valores reales:

- `VPS_HOST`: IP o dominio del VPS
- `VPS_USER`: usuario SSH
- `VPS_PORT`: puerto SSH
- `SSH_IDENTITY_FILE`: ruta a una clave SSH concreta si no usas la predeterminada
- `REMOTE_BASE_DIR`: ruta base del proyecto
- `REMOTE_WEB_DIR`: carpeta donde se publican los archivos estáticos
- `REMOTE_SERVER_DIR`: carpeta del backend
- `REMOTE_SERVICE`: nombre del servicio `systemd`, por ejemplo `educraft-ws`
- `SYSTEMCTL_BIN`: ruta completa de `systemctl`, por ejemplo `/usr/bin/systemctl`
- `HEALTHCHECK_URL`: URL interna para validar el backend tras el reinicio

El archivo `scripts/deploy.config` está ignorado en Git.

En Debian suele ser buena idea dejar `SYSTEMCTL_BIN="/usr/bin/systemctl"` para que el despliegue use exactamente la misma ruta que se permite en `sudoers`.

### Ejecutar despliegue

```sh
./scripts/deploy-vps.sh
```

Si quieres usar un archivo de configuración distinto:

```sh
DEPLOY_CONFIG=./scripts/mi-config-vps.sh ./scripts/deploy-vps.sh
```

## Flujo recomendado de trabajo

1. Hacer cambios en local.
2. Probar frontend y backend localmente.
3. Confirmar cambios en Git.
4. Ejecutar `./scripts/deploy-vps.sh`.
5. Verificar en el VPS que el servicio sigue sano.

Comprobación útil del backend en el servidor:

```sh
curl http://127.0.0.1:8080/health
```

## Notas sobre producción

- El frontend necesita subir la carpeta completa `docs/test/`, no solo `bundle.js`.
- `docs/test/` incluye `index.html`, texturas, audio, fuentes, modelos y minijuegos embebidos.
- Si cambias dependencias del backend, el despliegue ya ejecuta `npm install` en remoto.
- Si más adelante quieres acelerar despliegues, puedes ajustar el script para omitir `npm install` cuando no cambien `server/package.json` o `server/package-lock.json`.
- Las trazas visuales del cliente pueden activarse en local o con `?debug=1`.

## Roadmap técnico

El plan de mejoras priorizado está documentado en [docs/ROADMAP.md](/home/sasogu/github/web/EduCraft/docs/ROADMAP.md:1) para continuar el trabajo más adelante.

## Origen técnico

EduCraft parte de una base de `noa-engine`, pero este repositorio ya está orientado a la aplicación final y a su despliegue. Para trabajo diario conviene tomar este `README` como referencia principal en lugar de la documentación original del motor.
