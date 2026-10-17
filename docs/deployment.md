# Deployment

Bodhi Cast runs as three containers: the Rust app, PostgreSQL/PostGIS, and Caddy for HTTPS. Kafka, Airflow, Redis, and a separate task scheduler are not required.

## DigitalOcean

`infra/digitalocean` provisions one Basic droplet, a dedicated SSH key, and a firewall. The default is NYC3 with 1 vCPU, 1 GB RAM, and 25 GB SSD at $6/month. The configuration also permits the 2 GB/$12 size and checks the live API price against the $20 budget. Paid backups, volumes, registries, and load balancers are not enabled.

Terraform reads `DIGITALOCEAN_TOKEN` from the environment. The ignored `deployment.auto.tfvars.json` contains `ssh_source_cidrs`; SSH is restricted to those administrator networks. Update that value when your public IP changes. The public key defaults to `secrets/deploy_ed25519.pub` relative to the repository root. Keep the private key, Terraform state, and variable files private and backed up. `prevent_destroy` protects the host from accidental replacement.

The cloud-init configuration installs Docker, enables log rotation, disables password SSH, and adds 1 GB swap. The production Compose file limits the app and PostGIS to 256 MB each and Caddy to 96 MB. The app filesystem is read-only. PostgreSQL has no published port; the app binds only to host loopback. Only ports 80/443 are public.

Build the image on a development machine, not on the small droplet:

```sh
docker build --platform linux/amd64 -t bodhi-cast:RELEASE .
docker save bodhi-cast:RELEASE | gzip > bodhi-cast-image.tar.gz
```

Transfer the archive over SSH, then load it with `docker load -i bodhi-cast-image.tar.gz`. Runtime files live in `/opt/bodhi-cast`: copy `deploy/compose.droplet.yaml` as `compose.yaml`, `deploy/Caddyfile.droplet` as `Caddyfile`, and the initialization and backup scripts alongside them.

Run `sh initialize-droplet.sh` for first setup. It generates a database password and write token only if missing, then starts Compose. For updates, load the new image, update `BODHI_IMAGE` in the host's `.env`, and run `docker compose up -d --wait`. Keep the previous image until the new version passes verification. The first deployment uses `bodhi-cast:20261017-qa`.

## DNS and HTTPS

`infra/cloudflare` manages only the existing apex and www A records for bodhicast.com. Both retain Cloudflare proxying. The two records were imported into Terraform before updating their origin IP. Other DNS records are outside this module.

The scoped token is in the ignored `secrets/cloudflare-api-token` file, mode 600. Supply it as `CLOUDFLARE_API_TOKEN` in the Terraform process environment. It has DNS Edit and Zone Read for bodhicast.com only and expires October 17, 2027. It cannot change TLS settings or other domains. Terraform state is local in each infrastructure directory; preserve it with the credentials.

Caddy obtains and renews public certificates for bodhicast.com and www.bodhicast.com. Use Cloudflare **Full (strict)** encryption so the origin certificate is verified. Caddy's certificate volumes persist across updates. Direct HTTP to the IP exposes only a readiness response and `/healthz`.

## Editing and secrets

The site is publicly readable. Following or adding spots requires **Unlock editing** with the server's write token. The browser keeps it in memory and forgets it on reload. This is a single-owner app; everyone with that token has the same editing rights.

The host stores `.env` with mode 600 and `secrets/` with mode 700. The token file inside that private directory is mode 644 so the unprivileged container user can read its bind mount. Do not add secrets to Terraform variables, state, Git, logs, or public messages. Retrieve the editing token over SSH when needed.

## Health and operations

From `/opt/bodhi-cast` on the host:

```sh
docker compose ps
curl --fail http://127.0.0.1:8000/healthz
docker compose logs --tail 100 app
docker stats --no-stream
free -m
```

`/healthz` checks database connectivity. `/api/status` reports the queue, latest forecast model, and recent failures. NOAA requests run serially with at least ten seconds between wave downloads. Forecasts appear progressively. Older coverage remains available while a new model loads.

Failed jobs stop retrying after eight attempts. Investigate the cause before using the UI's retry control or `docker compose exec app bodhi-cast jobs --retry-failed`. Use `docker compose restart app` to restart only the app. Never use `down -v` during normal updates: it removes the database.

## Backups

`deploy/backup.sh` writes seven rotating daily PostgreSQL custom-format archives to `/var/backups/bodhi-cast`. A root cron entry runs it daily. These copies are on the same host; download them separately for protection from host loss. Paid cloud backups are not enabled.

Restore an archive into a separate PostGIS database before relying on it. A destructive restore requires stopping the app and an explicit recovery decision. Back up the host credentials, editing token, Terraform state, and Caddy certificate volumes separately.

The Rust database client uses `NoTls` only within the private Docker network or local loopback. A database on another host needs TLS support or a private encrypted tunnel.

## Other Docker hosts

The root `compose.yaml` with `deploy/compose.public.yaml` remains available for a generic Docker deployment. Prepare `.env` with a random hex `BODHI_DB_PASSWORD` and your `BODHI_DOMAIN`, then create a random `secrets/write-token` of at least 24 bytes. Start with:

```sh
docker compose -f compose.yaml -f deploy/compose.public.yaml up --build -d
```

The generic configuration uses larger memory limits. The new database volume does not reuse legacy Airflow storage. Preserve old volumes until migration and rollback are verified. See [migration](migration.md).
