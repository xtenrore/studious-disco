#!/bin/bash
set -euo pipefail
# Explicit user-run configuration only; never invoked at service startup.
if [ -n "${BROWSERBASE_API_KEY:-}" ]; then
  if [ -z "${BROWSERBASE_PROJECT_ID:-}" ]; then
    export BROWSERBASE_PROJECT_ID="$(node /app/scripts/browserbase-project.js)"
  fi
  agy mcp add --env "BROWSERBASE_PROJECT_ID=${BROWSERBASE_PROJECT_ID}" browserbase /usr/local/bin/node /app/scripts/browserbase-mcp.js
else
  echo 'Browserbase skipped: set BROWSERBASE_API_KEY first.'
fi
if [ -n "${GITHUB_TOKEN:-}" ]; then
  agy mcp add --type http --header "Authorization: Bearer ${GITHUB_TOKEN}" github https://api.githubcopilot.com/mcp/
else
  echo 'GitHub skipped: set GITHUB_TOKEN first (or use gh auth login).'
fi
# Railway's MCP inherits Railway authentication/environment; sign in with railway login if needed.
agy mcp add railway /usr/local/bin/railway mcp
printf '%s\n' 'MCP configuration saved by AGY. Run agy mcp list to inspect it. Start AGY yourself when ready.'
