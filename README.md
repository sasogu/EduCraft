
# EduCraft

## ¿Qué puedes hacer con EduCraft?

EduCraft es una aplicación basada en el motor noa-engine, pensada para la experimentación, la educación y la creación de mundos voxel interactivos. Incluye demos y ejemplos avanzados.

### Funcionalidades principales

- **Motor voxel avanzado**: chunks, físicas, colisiones, raycasting y renderizado 3D con Babylon.js.
- **Inventario**: Abre/cierra el inventario, selecciona y mueve bloques.
- **Hotbar**: Barra rápida para seleccionar bloques y herramientas.
- **Edición de mundo**: Coloca y quita bloques en tiempo real.
- **Guardar y cargar**: Guarda ajustes y ediciones del mundo localmente usando IndexedDB (Dexie).
- **Ajustes**: Modifica y guarda configuraciones del usuario.
- **Mundos**: Soporta múltiples mundos, puedes guardar/cargar diferentes estados.
- **Multijugador**: Código para conexión y sincronización (requiere configuración de servidor).
- **Controles**: Soporte para teclado, ratón y gamepad.
- **Interfaz gráfica**: UI moderna con paneles, menús y notificaciones.
- **Físicas**: Motor de físicas para movimiento, gravedad y colisiones.
- **Renderizado**: Gráficos 3D con Babylon.js, soporte para texturas y materiales personalizados.
- **Chat**: Soporte para chat en la versión voxelsrv-master.
- **Soporte móvil**: Detección y adaptación para dispositivos móviles.
- **Soporte para skins**: Cambia la skin del jugador (en voxelsrv-master).

### Controles de usuario (por defecto)

- **WASD**: Moverse
- **Ratón**: Mirar/cambiar dirección
- **Clic izquierdo**: Quitar bloque
- **Clic derecho**: Colocar bloque
- **E**: Abrir/cerrar inventario
- **1-9**: Seleccionar slot en la hotbar
- **Espacio**: Saltar
- **Shift**: Agacharse
- **O**: Cambiar de mundo (en la demo avanzada)
- **Z**: Abrir inspector Babylon.js (si debug está activo)
- **F5**: Guardar mundo manualmente (si está implementado)

> Nota: Algunos controles pueden variar según la demo o configuración.

### Guía rápida: Guardar y cargar mundos/configuración

- **Guardar configuración**: Al cambiar opciones en el menú de ajustes, se guardan automáticamente usando IndexedDB. Puedes forzar guardado con F5 (si está implementado).
- **Guardar mundo**: Las ediciones del mundo se guardan automáticamente al salir o periódicamente. Puedes forzar guardado desde el menú o con F5.
- **Cargar mundo/configuración**: Al iniciar la aplicación, se cargan automáticamente los datos guardados. Puedes cambiar de mundo desde el menú o con la tecla O.

No necesitas hacer nada especial: todo se almacena localmente en tu navegador. Si borras los datos del navegador, perderás los mundos y configuraciones guardadas.







# noa-engine

An experimental voxel engine.

Examples:
 * [Minecraft Classic](https://classic.minecraft.net/) - a game from Mojang(!) built on this engine
 * [noa-testbed](https://andyhall.github.io/noa-testbed/) - An old demo, outdated but colorful
 * [test example](https://andyhall.github.io/noa/test/) - test world from this repo, implements most of the engine's features
 * [hello-world example](https://andyhall.github.io/noa/hello-world/) - bare minimum world, suitable for using as a base to build something out of


## Usage

Under active development, best way to try it is to clone and hack on the `develop` branch:

```sh
(clone this repo)
cd noa
npm install
git checkout develop   # newest version is in develop
npm test               # runs demo world in /docs/test
```

The `start` and `test` scripts run the minimal demo projects locally, via `webpack` and `webpack-dev-server` (which will be installed as dev dependencies). The `build` script rebuilds static bundles for both demos.

To build a new world, use `noa` as a dependency:

```sh
npm install --save noa-engine
```

```js
var engine = require('noa-engine')
var noa = engine({
    inverseY: true,
    // see source or /docs/ examples for more options and usage
})
```

----

## Status, contributing, etc.

This library attempts to be something you can build a voxel game on top of. 
It's not a fully-featured game engine; it just tries to manage the painful parts 
of using voxels (e.g. chunking, meshing), and certain things that are 
tightly coupled to voxel implementation (physics, raycasting, collisions..), 
but otherwise stay out of your way.

Contributions are welcome! But please open an issue before building any 
nontrivial new features. I'd like to keep this library lean, 
so if a given feature could be done as a separate module then that's probably what I'll suggest.

> Please note I do all dev work on the `develop` branch; please send any PRs against that branch!


## Docs

The source is pretty fully commented, mostly with JSDoc-style comments, 
but I don't currently have a good docgen tool, so for now it's best to 
consult the source.

----

## Recent changes:

 * 0.25.0
   * Adds `debug` option: populates `window` with useful references, binds `Z` to BJS inspector
   * Now current with Babylon.js 4.0
   * Updates many dependencies, many small bug fixes.
 * 0.24.0
   * Terrain materials can specify a renderMaterial (see `registry.registerMaterial()`)
   * Targeting and `noa.pick` can take a function for which block IDs to target - #36
   * `every` component is removed (client apps using this, please define it separately)
 * 0.23.0
   * Now uses octrees for scene selection for all meshes, even moving ones
   * Option `useOctreesForDynamicMeshes` (default `true`) to disable previous
   * `noa.rendering.addDynamicMesh` changed to `addMeshToScene(mesh, isStatic)`
   * Entities can now be cylindrical w.r.t. `collideEntities` component
   * Adds pairwise entity collision handler `noa.entities.onPairwiseEntityCollision`
 * 0.22.0
   * Large/complicated scenes should mesh and render much faster
   * Chunk terrain/object meshing now merges results. Block object meshes must be static!
   * Removed redundant `player` component - use `noa.playerEntity` property
   * Added `showFPS` option
   * Many internal changes that hopefully don't break compatibility
 * 0.21.0
   * Support unloading/reloading new world data.  
     Sample implementation in the `docs/test` app (hit "O" to swap world data)
   * changes `noa.world#setChunkData` params: `id, array, userData`
   * changes `noa.world#chunkBeingRemoved` event params: `id, array, userData`
 * 0.20.0
   * Near chunks get loaded and distant ones get unloaded faster and more sensibly
   * Greatly speeds up chunk init, meshing, and disposal (and fixes some new Chrome deopts)
 * 0.19.0
   * Revise per-block callbacks:
     * `onLoad` when a block is created as part of a newly-loaded chunk  
     * `onUnload` - when the block goes away because its chunk was unloaded
     * `onSet` - when a block gets set to that particular id
     * `onUnset` - when a block that had that id gets set to something else
     * `onCustomMeshCreate` - when that block's custom mesh is instantiated (either due to load or set)
 * 0.18.0
   * Simplifies block targeting. Instead of several accessor methods, now there's a persistent `noa.targetedBlock` with details on whatever block is currently targeted.
   * `noa` now emits `targetBlockChanged`
   * Built-in block highlighting can now be overridden or turned off with option `skipDefaultHighlighting`
 * 0.17.0
   * Adds per-block callbacks: `onCreate`, `onDestroy`, `onCustomMeshCreate`
 * 0.16.0
   * Simplifies block registration - now takes an options argument, and the same API is used for custom mesh blocks
   * Removes the idea of registration for meshes

----

## Credits

Made by [@fenomas](https://twitter.com/fenomas), license is MIT.


