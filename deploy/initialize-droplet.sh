#!/bin/sh
set -eu
cd /opt/bodhi-cast
umask 077
install -d -m 700 secrets
if [ ! -e .env ]; then
  printf 'BODHI_DB_PASSWORD=%s\nBODHI_DOMAIN=bodhicast.com\nBODHI_IMAGE=bodhi-cast:20261017-qa\n' "$(openssl rand -hex 32)" > .env
fi
if [ ! -e secrets/write-token ]; then
  openssl rand -hex 32 > secrets/write-token
fi
# The bind-mounted file must be readable by the app's unprivileged container user.
chmod 644 secrets/write-token
install -d -m 700 /var/backups/bodhi-cast
docker compose up -d --wait --wait-timeout 180
