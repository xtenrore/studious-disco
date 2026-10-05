# Verification record

Verified on 2026-10-05:

- API integration: signed-session integrity, exact-origin checks, CSRF, private-daemon authentication, file traversal and symlink rejection, UTF-8 text round-trip, rename, binary upload/download, authenticated WebSockets, tmux persistence through disconnect, 200 KB+ Unicode/indented/multiline input round-trip, sessions/files through daemon restart, and logout revocation.
- Browser checks: desktop Chromium, iPhone 13-sized Chromium, and iPhone 13-sized WebKit. Login, terminal readiness, syntax-highlighted text opening, memory creation, all five tabs on `/`, persistent login after reload, landscape and horizontal overflow checks. No JavaScript errors observed.
- Vite production build passed. Application dependency audit reported zero vulnerabilities.
- Workspace Docker image built successfully with official AGY, Railway CLI and Browserbase MCP.
- Reference screenshots are in `docs/screenshots/`.

These checks use isolated local services and test credentials. WebKit emulation is not a physical iPhone. `mobile-testing.md` tracks physical-iOS and authenticated AGY/Browserbase acceptance checks that require the owner’s device and provider login.
