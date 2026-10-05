# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim
ENV NODE_ENV=production HOME=/home/agy AGY_HOME=/home/agy PATH=/home/agy/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
RUN apt-get update && apt-get install -y --no-install-recommends bash tmux git gh openssh-client curl ca-certificates python3 python3-venv python3-pip make g++ gosu unzip jq procps && rm -rf /var/lib/apt/lists/*
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 PUPPETEER_SKIP_DOWNLOAD=true
RUN --mount=type=secret,id=build_ca if [ -f /run/secrets/build_ca ]; then export CURL_CA_BUNDLE=/run/secrets/build_ca; export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; npm install -g @browserbasehq/mcp-server-browserbase@2.4.3
RUN --mount=type=secret,id=build_ca if [ -f /run/secrets/build_ca ]; then export CURL_CA_BUNDLE=/run/secrets/build_ca; export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; curl --fail --location https://github.com/railwayapp/cli/releases/download/v5.63.1/railway-v5.63.1-x86_64-unknown-linux-musl.tar.gz -o /tmp/railway.tar.gz && tar -xzf /tmp/railway.tar.gz -C /usr/local/bin && chmod 755 /usr/local/bin/railway && rm /tmp/railway.tar.gz
# Official Google installer verifies the release checksum; binaries live outside the mounted home.
RUN --mount=type=secret,id=build_ca if [ -f /run/secrets/build_ca ]; then export CURL_CA_BUNDLE=/run/secrets/build_ca; export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; curl --fail --location --compressed https://antigravity.google/cli/install.sh -o /tmp/agy-install.sh && bash /tmp/agy-install.sh --dir /usr/local/bin && chmod 755 /usr/local/bin/agy && test -x /usr/local/bin/agy && rm /tmp/agy-install.sh
RUN useradd --uid 1001 --create-home --shell /bin/bash agy
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=build_ca if [ -f /run/secrets/build_ca ]; then export CURL_CA_BUNDLE=/run/secrets/build_ca; export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; npm ci --omit=dev
COPY apps/workspace ./apps/workspace
COPY apps/shared ./apps/shared
COPY scripts/browserbase-project.js ./scripts/browserbase-project.js
COPY scripts/configure-mcp.sh /usr/local/bin/configure-agy-mcp
COPY docker/workspace-entrypoint.sh /usr/local/bin/workspace-entrypoint
RUN chmod 755 /usr/local/bin/configure-agy-mcp /usr/local/bin/workspace-entrypoint
EXPOSE 3001
ENTRYPOINT ["workspace-entrypoint"]
CMD ["node", "apps/workspace/server.js"]
