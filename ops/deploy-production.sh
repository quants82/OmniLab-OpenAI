#!/usr/bin/env bash
set -Eeuo pipefail

APP_USER="ominilab"
APP_DIR="/var/www/ominilab.vatli365.vn/app"
BACKEND_DIR="${APP_DIR}/backend_Ominilab"
FRONTEND_DIR="${APP_DIR}/frontend_Ominilab"
VENV="/var/www/ominilab.vatli365.vn/venv"

exec 9>/run/lock/ominilab-deploy.lock
if ! flock -n 9; then
    echo "Another Ominilab deployment is already running."
    exit 1
fi

echo "[1/6] Updating source"
runuser -u "${APP_USER}" -- \
    env GIT_TERMINAL_PROMPT=0 \
    git -C "${APP_DIR}" pull --ff-only origin main

echo "[2/6] Updating backend dependencies"
runuser -u "${APP_USER}" -- \
    "${VENV}/bin/python" -m pip install \
    --disable-pip-version-check \
    -r "${BACKEND_DIR}/requirements.txt"

echo "[3/6] Checking backend syntax"
runuser -u "${APP_USER}" -- \
    "${VENV}/bin/python" -m compileall -q \
    "${BACKEND_DIR}/main.py" \
    "${BACKEND_DIR}/config.py" \
    "${BACKEND_DIR}/database.py" \
    "${BACKEND_DIR}/dependencies.py" \
    "${BACKEND_DIR}/security.py" \
    "${BACKEND_DIR}/routers"

echo "[4/6] Installing frontend dependencies"
runuser -u "${APP_USER}" -- \
    env HOME="/var/www/ominilab.vatli365.vn" \
    /usr/bin/npm --prefix "${FRONTEND_DIR}" ci

echo "[5/6] Building frontend"
runuser -u "${APP_USER}" -- \
    env \
    HOME="/var/www/ominilab.vatli365.vn" \
    PUBLIC_API_URL="https://ominilab.vatli365.vn" \
    PUBLIC_SITE_URL="https://ominilab.vatli365.vn" \
    /usr/bin/npm --prefix "${FRONTEND_DIR}" run build

echo "[6/6] Restarting backend"
systemctl restart ominilab.service

for attempt in {1..15}; do
    if curl --fail --silent --show-error \
        http://127.0.0.1:8010/api/lab/health
    then
        echo
        echo "Ominilab deployment completed successfully."
        exit 0
    fi
    sleep 1
done

echo "Backend health check failed." >&2
journalctl -u ominilab.service -n 30 --no-pager >&2
exit 1
