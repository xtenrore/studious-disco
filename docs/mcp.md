# MCP setup

The image installs the small toolset. No MCP registration or agent launch occurs at startup. Run `configure-agy-mcp` explicitly in your terminal after setting credentials in Railway.

The script uses AGY's supported `agy mcp add` command, which writes native AGY configuration under its persistent home. Browserbase and Railway inherit server-side environment variables. GitHub's official hosted MCP uses the configured GitHub token in an Authorization header stored in AGY's private native configuration. Inspect with `agy mcp list`.

## Browserbase

The installed package is Microsoft's `@playwright/mcp@0.0.83`. The Browserbase launcher creates a managed cloud browser and connects Playwright MCP over CDP. Navigation, clicks, typing, snapshots and screenshots are direct browser operations. Only BROWSERBASE_API_KEY is required; no Gemini key or second AI agent is used. Local browser binaries are not installed.

Set BROWSERBASE_API_KEY on workspace. If the key has exactly one project, the app and explicit setup script discover its ID automatically. Otherwise set BROWSERBASE_PROJECT_ID to select a project. For persistent browser login state, create a context in Browserbase, set BROWSERBASE_CONTEXT_ID in Railway, and run `configure-agy-mcp` again. The launcher uses that context with persistence enabled.

A remote session is created when AGY starts the registered MCP process and released when that process exits. Browserbase's own timeout applies if the process is interrupted abruptly. This never launches or restarts AGY.

Browserbase API lists active sessions for your project; the app exposes these in Browser. Logging in manually, 2FA and CAPTCHA are performed directly in the provider's live view. Do not assume watch/takeover controls communicate with AGY. Tell it when you want it to pause or resume.

Provider session lifetimes are independent of Railway volume lifetime. A persisted Browserbase context preserves supported browser state, not a forever-running browser session.

## GitHub

The official endpoint is `https://api.githubcopilot.com/mcp/`. Set GITHUB_TOKEN with the repository permissions you need. Git and `gh` also work normally; `gh auth login` can store authentication in the home volume. Do not pass the deployment environment's GitHub credentials into source control.

## Railway

`railway mcp` runs the official Railway CLI MCP. Complete `railway login` in the terminal or set the appropriate Railway token server-side. GitHub/Railway MCP authentication is separate from AGY authentication and separate from the app login.

## Sources

- Official AGY CLI: https://antigravity.google/product/antigravity-cli/
- Official installer: https://antigravity.google/cli/install.sh
- Playwright MCP: https://github.com/microsoft/playwright-mcp
- Browserbase sessions: https://docs.browserbase.com/reference/api/create-a-session
- Browserbase contexts: https://docs.browserbase.com/features/contexts
- GitHub MCP: https://github.com/github/github-mcp-server
- Railway MCP: https://docs.railway.com/reference/mcp-server
