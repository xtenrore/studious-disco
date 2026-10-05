# Personal AGY

A private iPhone-ready PWA connected to one persistent Antigravity CLI workspace. Source: [xtenrore/studious-disco](https://github.com/xtenrore/studious-disco).

The app contains a real xterm.js terminal, a file explorer and syntax-highlighted editor, optional plain-text project memory, a Browserbase live view, and simple password authentication. All sections stay on `/`; logged-out users see `/login`.

**AGY is started only by the user.** Opening the terminal attaches to `agy-main` in tmux and creates a shell if needed. Type `agy` to start the official CLI. Disconnecting does not kill tmux. No agent watchdog, automatic prompts, retry messages, memory injection, automatic approvals, or provider switching exists.

## Run locally

Requirements: Node.js 22+, Python/make/C++ for node-pty, tmux, or Docker Compose.

```sh
npm ci
npm run password
# Copy .env.example to .env. Set the resulting Argon2id PASSWORD_HASH,
# and random 32+ character SESSION_SECRET and WORKSPACE_TOKEN values.
docker compose up --build
```

Open `http://localhost:3000`. Docker Compose binds the public gateway to localhost; the workspace has no published port. Development mode permits a non-Secure cookie on localhost only. Production refuses an HTTP app origin and always uses Secure, HttpOnly, SameSite=Strict cookies.

For source development, start the workspace and gateway with their documented environment variables, then run `npm run dev` and set APP_ORIGIN to the Vite origin. Production serves `npm run build` output directly from the gateway.

## Deploy to Railway

See [deployment](docs/deployment.md) for the two-service settings, variables, persistent volume, and first login. The production topology requires a Railway plan with capacity for two services and a volume.

- `web`: public domain, `docker/web.Dockerfile`.
- `workspace`: private network only, `docker/workspace.Dockerfile`, volume at `/home/agy`, sleeping disabled.
- Both sources follow `main` in this repository.

The workspace image includes the official Google Antigravity CLI, tmux, Git, GitHub CLI, Railway CLI, Node.js and Python. AGY's login and approval flow is untouched. Complete its login yourself in the terminal.

## MCP and browser

Set Browserbase credentials in Railway and run `configure-agy-mcp` yourself in the workspace terminal. This configures only Browserbase, GitHub (if GITHUB_TOKEN is set), and Railway. It starts no agent. See [MCP setup](docs/mcp.md).

Browserbase sessions created through MCP are discovered through the provider's API. The Browser tab shows active live views; Take control enables interaction. Coordinate pause/resume with AGY explicitly. The app sends no takeover or continuation prompts. Credentials stay on the server.

## Files and memory

Projects are normal repositories in `/home/agy/projects`. The file UI confines operations to this tree and rejects symbolic links. Uploads are limited to 20 MB; the editor handles text up to 5 MB and offers downloads for binary/large files. Filename search traverses up to 10,000 entries and returns up to 100 results, skipping `.git` and `node_modules` traversal.

Memory uses a project's `.private-memory` folder, created only when you choose a project. AGY reads it only if you ask. Review your project `.gitignore` if these notes should remain uncommitted.

The home volume preserves AGY state, authentication, projects, notes, shell configuration and server sessions. Browser disconnects preserve tmux. A workspace redeploy restarts processes; it preserves files but **does not resume or relaunch AGY**.

## Verification

```sh
npm test
npm run build
npm run test:browser
```

The integration suite runs real services and tmux, exercising authentication, WebSocket access, CSRF, Unicode files, uploads/downloads, reconnects, durable sessions and logout. Browser verification uses desktop Chromium and an iPhone-sized WebKit context. See [mobile acceptance checklist](docs/mobile-testing.md) for physical-device and live-provider checks that require an iPhone, AGY login and Browserbase credentials.
