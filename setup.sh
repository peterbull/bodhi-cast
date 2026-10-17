#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v docker >/dev/null 2>&1; then
  echo 'Docker with Compose is required.' >&2
  exit 1
fi
docker compose -f compose.yaml config --quiet
printf '%s\n' 'Configuration is valid. Start locally with:' 'docker compose -f compose.yaml -f compose.local.yaml up --build -d'
