#!/bin/sh
set -eu
umask 077
cd /opt/bodhi-cast
backup="/var/backups/bodhi-cast/postgres-$(date +%u).dump"
docker compose exec -T db pg_dump -U bodhi -d bodhi -Fc > "$backup.tmp"
mv "$backup.tmp" "$backup"
