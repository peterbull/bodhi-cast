#!/bin/sh
set -eu
cd /opt/bodhi-cast
umask 077
install -d -m 700 secrets
if [ ! -e .env ]; then
  printf 'BODHI_DB_PASSWORD=%s\nBODHI_DOMAIN=bodhicast.com\nBODHI_IMAGE=bodhi-cast:20261017-qa\n' "$(openssl rand -hex 32)" > .env
fi
if [ ! -s secrets/google-client.json ]; then
  printf '%s\n' 'Install the Google web client JSON at /opt/bodhi-cast/secrets/google-client.json before starting.' >&2
  exit 1
fi
# The private parent directory protects the bind mount readable by container uid 10001.
chmod 644 secrets/google-client.json
install -d -m 700 /var/backups/bodhi-cast
docker compose up -d --wait --wait-timeout 180
