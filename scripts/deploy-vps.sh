#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_FILE="${DEPLOY_CONFIG:-${SCRIPT_DIR}/deploy.config}"
RSYNC_EXCLUDES_FILE="${SCRIPT_DIR}/rsync-excludes.txt"

if [[ ! -f "${CONFIG_FILE}" ]]; then
  echo "Falta el archivo de configuracion: ${CONFIG_FILE}"
  echo "Copia scripts/deploy.config.example a scripts/deploy.config y ajusta los valores."
  exit 1
fi

# shellcheck disable=SC1090
source "${CONFIG_FILE}"

required_vars=(
  VPS_HOST
  VPS_USER
  REMOTE_BASE_DIR
  REMOTE_SERVICE
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "La variable ${var_name} es obligatoria en ${CONFIG_FILE}"
    exit 1
  fi
done

VPS_PORT="${VPS_PORT:-22}"
REMOTE_WEB_DIR="${REMOTE_WEB_DIR:-${REMOTE_BASE_DIR}/www}"
REMOTE_SERVER_DIR="${REMOTE_SERVER_DIR:-${REMOTE_BASE_DIR}/server}"
REMOTE_SSH_TARGET="${VPS_USER}@${VPS_HOST}"
SYSTEMCTL_BIN="${SYSTEMCTL_BIN:-/usr/bin/systemctl}"
FRONTEND_BUILD_CMD="${FRONTEND_BUILD_CMD:-npm run build:test}"
REMOTE_PREPARE_CMD="${REMOTE_PREPARE_CMD:-mkdir -p '${REMOTE_WEB_DIR}' '${REMOTE_SERVER_DIR}'}"
REMOTE_DEPLOY_CMD="${REMOTE_DEPLOY_CMD:-cd '${REMOTE_SERVER_DIR}' && npm install && npm run build && sudo '${SYSTEMCTL_BIN}' restart '${REMOTE_SERVICE}' && sudo '${SYSTEMCTL_BIN}' status '${REMOTE_SERVICE}' --no-pager}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1:8080/health}"
REMOTE_HEALTHCHECK_CMD="${REMOTE_HEALTHCHECK_CMD:-curl --fail --silent '${HEALTHCHECK_URL}'}"

SSH_ARGS=(-p "${VPS_PORT}")
if [[ -n "${SSH_IDENTITY_FILE:-}" ]]; then
  SSH_ARGS+=(-i "${SSH_IDENTITY_FILE}")
fi
DRY_RUN="${DRY_RUN:-0}"
RSYNC_FLAGS=(-az --delete)
if [[ "${DRY_RUN}" == "1" ]]; then
  RSYNC_FLAGS+=(-n -v)
fi

run_step() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "[dry-run] $*"
    return 0
  fi
  "$@"
}

run_remote() {
  if [[ "${DRY_RUN}" == "1" ]]; then
    echo "[dry-run] ssh ${SSH_ARGS[*]} ${REMOTE_SSH_TARGET} $1"
    return 0
  fi
  ssh "${SSH_ARGS[@]}" "${REMOTE_SSH_TARGET}" "$1"
}

echo "[1/5] Compilando frontend..."
(cd "${REPO_ROOT}" && bash -lc "${FRONTEND_BUILD_CMD}")

echo "[2/5] Preparando rutas remotas..."
run_remote "${REMOTE_PREPARE_CMD}"

echo "[3/5] Sincronizando frontend a ${REMOTE_WEB_DIR}..."
run_step rsync "${RSYNC_FLAGS[@]}" \
  --exclude-from="${RSYNC_EXCLUDES_FILE}" \
  -e "ssh ${SSH_ARGS[*]}" \
  "${REPO_ROOT}/docs/test/" \
  "${REMOTE_SSH_TARGET}:${REMOTE_WEB_DIR}/"

echo "[4/5] Sincronizando backend a ${REMOTE_SERVER_DIR}..."
run_step rsync "${RSYNC_FLAGS[@]}" \
  --exclude-from="${RSYNC_EXCLUDES_FILE}" \
  -e "ssh ${SSH_ARGS[*]}" \
  "${REPO_ROOT}/server/" \
  "${REMOTE_SSH_TARGET}:${REMOTE_SERVER_DIR}/"

echo "[5/6] Instalando, compilando y reiniciando servicio remoto..."
run_remote "${REMOTE_DEPLOY_CMD}"

echo "[6/6] Verificando healthcheck remoto..."
run_remote "${REMOTE_HEALTHCHECK_CMD}"

echo "Despliegue completado."
