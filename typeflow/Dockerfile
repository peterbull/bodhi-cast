FROM node:22.13

# Install system dependencies including eccodes
RUN apt-get update && apt-get install -y \
    libeccodes0 \
    libeccodes-dev \
    netcat-traditional \
    libeccodes-tools \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code and config files
COPY . .

# Make entrypoint script executable
COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

# Build TypeScript
RUN pnpm build

RUN apt-get update && apt-get install -y cron vim \
    # RUN chmod 0644 /etc/cron.d/schedule-ingestion \
    #     && /usr/bin/crontab /etc/cron.d/schedule-ingestion \
    && touch /var/log/cron.log && chmod 0666 /var/log/cron.log 
#     && chmod 0755 /app/data_index/run-pipeline.sh


ENTRYPOINT ["entrypoint.sh"]
# CMD ["/bin/sh", "-c", "tail -f /dev/null"]

