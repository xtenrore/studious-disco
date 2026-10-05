# Verification record

Verified on 2026-10-05:

- API integration: signed-session integrity, exact-origin checks, CSRF, private-daemon authentication, file traversal and symlink rejection, UTF-8 text round-trip, rename, binary upload/download, authenticated WebSockets, tmux persistence through disconnect, 200 KB+ Unicode/indented/multiline input round-trip, sessions/files through daemon restart, and logout revocation.
- Browser checks: desktop Chromium, iPhone 13-sized Chromium, and iPhone 13-sized WebKit. Login, terminal readiness, syntax-highlighted text opening, memory creation, all five tabs on `/`, persistent login after reload, landscape and horizontal overflow checks. No JavaScript errors observed.
- Vite production build passed. Application dependency audit reported zero vulnerabilities.
- Workspace Docker image built and deployed successfully with official AGY, Railway CLI and direct Playwright MCP for Browserbase.
- Reference screenshots are in `docs/screenshots/`.

Local integration checks use isolated services and test credentials. WebKit emulation is not a physical iPhone. `mobile-testing.md` tracks physical-iOS and authenticated AGY/Browserbase acceptance checks that require the owner’s device and provider login.

Production deployment verified on 2026-10-05 at https://web-production-66e90.up.railway.app:

- Both Railway services reached SUCCESS via authenticated Railway CLI uploads of GitHub source ZIPs.
- HTTPS health, chosen-password login, Secure/HttpOnly/SameSite cookie, private API, authenticated terminal output, logout revocation and installed AGY checks passed.
- Workspace home is `/home/agy` on the persistent volume; the workspace has no public domain.
- The shared Browserbase API key resolves its project and the Browser API responds successfully.
- Browserbase MCP uses direct Playwright operations over managed-browser CDP with no additional model credentials. A real managed session initialized MCP, navigated to example.com, and returned the page snapshot; the test session was then released.
- The live HTTPS app passed iPhone-sized Chromium and WebKit login, authenticated terminal, tab navigation, persistent login after reload, overflow, JavaScript-error and logout checks.

Verification did not launch AGY. Provider authentication and physical iPhone acceptance remain owner-run checks.
