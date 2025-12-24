#!/bin/bash
# build-and-deploy.sh
# Script para compilar el bundle en local y dejarlo listo para subir al servidor

set -e

# 1. Limpiar el bundle anterior
rm -f ./docs/test/bundle.js

echo "[1/3] Bundle anterior eliminado."

# 2. Compilar el nuevo bundle con Webpack
NODE_OPTIONS=--openssl-legacy-provider npx webpack --config docs/test/webpack.config.js

echo "[2/3] Bundle generado correctamente."

# 3. Verificar que el bundle contiene dexie.js y no dexie.mjs
if grep -q 'dexie.mjs' ./docs/test/bundle.js; then
  echo "[ERROR] El bundle contiene dexie.mjs. Revisa los alias en webpack.config.js."
  exit 1
fi
if grep -q 'require("dexie")' ./docs/test/bundle.js; then
  echo "[OK] El bundle usa dexie.js correctamente."
else
  echo "[ADVERTENCIA] No se detectó require(\"dexie\"). Verifica manualmente si Dexie está incluido."
fi

echo "[3/3] Bundle listo para subir al servidor. Sube ./docs/test/bundle.js al VPS."
