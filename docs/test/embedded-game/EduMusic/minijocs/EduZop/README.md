# EduZop

Juego de unir colores con iconografía musical, pensado para sesiones rápidas.

### Features

- Tablero 6x6 con fichas grandes y animaciones suaves
- Notas musicales por color (SVG embebido en canvas)
- Puntaje, tiempo y mejor marca guardada
- Pantalla inicial con modo Clasico y Relax
- UI moderna y limpia, lista para GitHub Pages

### Rutas

- `/` selector de modo
- `/play` modo Clásico (con tiempo y puntuación)
- `/relax` modo Relax (sin tiempo)
- `/game-over` pantalla de fin de partida (modo Clásico)

### Instalación

Requisitos: Node.js 18+ y npm.

Instalación reproducible (recomendado): usa `package-lock.json`.

```bash
rm -rf node_modules
npm ci
```

```bash
npm install
```

Nota: si borras `package-lock.json`, `npm ci` no funcionará y pierdes reproducibilidad.

### Desarrollo local

```bash
npm run dev
# http://localhost:3004/
```

Nota: en desarrollo, al entrar en un modo desde el selector (`/play` o `/relax`) la app fuerza una recarga automática para garantizar que el juego se inicialice limpio. En producción (GitHub Pages) no se recarga para evitar 404 en rutas SPA.

### Build estático (GitHub Pages)

```bash
npm run build
# outputs to ./docs
```

### Verificación rápida

```bash
npm ci
npm run build
```
