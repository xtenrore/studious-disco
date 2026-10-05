# Railway deployment

Create a private project with two services from `xtenrore/studious-disco`, branch `main`. Keep repository root `/` for both builds. Set the Dockerfile and deployment settings below directly in Railway. The equivalent project graph is versioned in `.railway/railway.ts`. Use one replica for each.

## Workspace

- Dockerfile: `docker/workspace.Dockerfile`.
- Private DNS endpoint: `workspace` (`workspace.railway.internal`).
- Port: `3001`; listens on IPv6 `::` for Railway private networking.
- Public networking: **no domains and no public TCP proxy**.
- Persistent volume: `/home/agy`, initialized for UID 1001.
- Sleeping/serverless: disabled. No cron schedule.
- Healthcheck: `/health`, checks daemon reachability only.
- Variables: WORKSPACE_TOKEN (32+ random characters), PORT=3001.
- Optional: BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, BROWSERBASE_CONTEXT_ID (optional persistent browser context), GITHUB_TOKEN, RAILWAY_API_TOKEN or supported Railway authentication.

## Web

- Dockerfile: `docker/web.Dockerfile`.
- Port: `3000`. Generate the project's only public domain for this service.
- Variables: NODE_ENV=production, PORT=3000, WORKSPACE_URL=http://workspace.railway.internal:3001, WORKSPACE_TOKEN (same as workspace), SESSION_SECRET (independent 32+ random characters), PASSWORD_HASH (Argon2id), APP_ORIGIN=https://the-exact-web-domain.
- APP_ORIGIN must have no trailing slash and must exactly match the browser origin.
- Hash a password with `npm run password`; keep only the resulting hash in Railway.
- No volume is needed on web; sessions are stored by the private workspace service.

Never commit secrets, print them in build logs, or pass application production secrets to the browser. Changing SESSION_SECRET invalidates existing cookies. Changing WORKSPACE_TOKEN requires updating both services. Changing PASSWORD_HASH does not revoke existing sessions: sign out or clear sessions deliberately if needed.

## First use

1. Open the web HTTPS domain, log in, then in iPhone Safari use Share → Add to Home Screen.
2. In AGY, type `agy`; use its normal authentication URL/device flow. The terminal's URLs open in an external tab and the same tmux session remains attached when you return.
3. Clone your repositories under `/home/agy/projects`. Do not develop this application's production source in the running container; push changes to GitHub.
4. Add MCP credentials in Railway, then type `configure-agy-mcp` when you want to configure these integrations. Configure Browserbase persistent contexts as described in `docs/mcp.md`.
5. Ask AGY to browse. Use Browser → Refresh to discover the active Browserbase session. Ask AGY to pause before manual takeover, then explicitly tell it to continue afterward.

## Redeploy and backup

A normal GitHub push deploys services matched by their watch patterns. The volume survives redeploys. Web redeploys temporarily disconnect the gateway but tmux continues in workspace. Workspace redeploys end running AGY and tmux processes; the application never restores or relaunches them. On your next terminal attach, a new shell is created.

Enable Railway volume backups appropriate for your files and back up irreplaceable work separately. Do not detach or delete the home volume when updating service configuration.

Deployments are considered successful only after both services report SUCCESS and the public domain passes authenticated smoke checks. Physical-iPhone suspension, clipboard, keyboard and live-provider tests remain required; see `mobile-testing.md`.

## CLI upload when GitHub integration is unavailable

Download and extract the public `main` ZIP, sign in with `railway login`, and upload the same repository root to each existing service:

```sh
railway up --project 8322787a-78be-4819-9837-353369b59d2a --environment b5248052-cf85-4538-a969-470eae1e7c2e --service workspace --detach -m "Deploy workspace from GitHub ZIP"
railway up --project 8322787a-78be-4819-9837-353369b59d2a --environment b5248052-cf85-4538-a969-470eae1e7c2e --service web --detach -m "Deploy web from GitHub ZIP"
```

Poll deployment status until both report SUCCESS. These uploads do not enable deploy-on-push. For subsequent releases, repeat the ZIP/CLI upload flow, or grant the Railway GitHub app repository access and connect the services to `main`. Existing secrets and the home volume remain attached.
