FROM node:24-trixie-slim

ARG CLAUDE_VERSION=2.1.280
ARG NPM_VERSION=12.1.0
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends ca-certificates chromium fonts-dejavu fonts-liberation git gh curl ripgrep procps \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g npm@${NPM_VERSION} \
    && npm install -g @anthropic-ai/claude-code@${CLAUDE_VERSION} \
    && npm cache clean --force
WORKDIR /opt/docs-tools
COPY .devcontainer/tools/package.json .devcontainer/tools/package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund && npm cache clean --force
COPY .devcontainer/tools/pdf.cjs .devcontainer/tools/print.css .devcontainer/tools/check-isolation.cjs .devcontainer/tools/github-setup.sh ./
COPY .devcontainer/tools/test ./test
RUN chmod 755 pdf.cjs check-isolation.cjs github-setup.sh \
    && ln -s /opt/docs-tools/pdf.cjs /usr/local/bin/docs-pdf \
    && ln -s /opt/docs-tools/check-isolation.cjs /usr/local/bin/docs-check \
    && ln -s /opt/docs-tools/github-setup.sh /usr/local/bin/docs-github-setup \
    && ln -s /opt/docs-tools/node_modules/.bin/markdownlint-cli2 /usr/local/bin/docs-lint \
    && printf '#!/bin/sh\nexec node --test /opt/docs-tools/test/*.test.cjs\n' > /usr/local/bin/docs-test \
    && chmod 755 /usr/local/bin/docs-test
COPY .devcontainer/managed-settings.json /etc/claude-code/managed-settings.json
ENV NODE_PATH=/opt/docs-tools/node_modules \
    PATH=/opt/docs-tools/node_modules/.bin:$PATH \
    CHROMIUM_PATH=/usr/bin/chromium \
    CLAUDE_CONFIG_DIR=/home/node/.claude \
    DISABLE_AUTOUPDATER=1 \
    GH_NO_UPDATE_NOTIFIER=1 \
    DISABLE_TELEMETRY=1 \
    DISABLE_ERROR_REPORTING=1 \
    ENABLE_CLAUDEAI_MCP_SERVERS=false
RUN mkdir -p /home/node/.claude /home/node/.vscode-server \
    && chown -R node:node /home/node
USER node
WORKDIR /workspace
CMD ["tail", "-f", "/dev/null"]
