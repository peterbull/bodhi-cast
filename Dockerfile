FROM node:24-bookworm-slim AS web
WORKDIR /src
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json web/package.json
RUN pnpm install --frozen-lockfile
COPY web web
RUN pnpm build

FROM rust:1.98-bookworm AS rust
WORKDIR /src
COPY Cargo.toml Cargo.lock ./
COPY server server
RUN cargo build --release --locked

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/* && useradd --system --uid 10001 --create-home bodhi
WORKDIR /app
COPY --from=rust /src/target/release/bodhi-cast /usr/local/bin/bodhi-cast
COPY --from=web /src/web/dist /app/web/dist
USER bodhi
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD curl --fail --silent http://127.0.0.1:8000/healthz || exit 1
ENTRYPOINT ["bodhi-cast"]
CMD ["serve", "--listen", "0.0.0.0:8000"]
