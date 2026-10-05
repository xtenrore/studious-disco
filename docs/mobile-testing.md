# Mobile acceptance

Automated WebKit emulation is useful, but it cannot certify Safari/iOS suspension or Home Screen behavior on a physical iPhone. Record device, iOS version, build commit and results. Do not mark live-provider checks passed without real credentials and a real session.

- [ ] Cold Safari launch redirects to /login; correct password logs in.
- [ ] Home Screen installation uses standalone display and `/` start URL.
- [ ] Login persists through close/reopen; expiry redirects to /login.
- [ ] All five sections change within `/` without navigation.
- [ ] Safe areas avoid Dynamic Island and home indicator in portrait/landscape.
- [ ] Keyboard repeatedly opens/closes without hiding terminal input or toolbar.
- [ ] Run `agy`, complete official login through a tappable link, return to the same tmux session.
- [ ] Scrollback, ANSI colors, Unicode, code and large output render faithfully.
- [ ] Short, 200 KB+, multiline, indented and Unicode pastes preserve content and do not submit partway.
- [ ] Native paste and toolbar fallback textarea both work; selection copy works.
- [ ] Google, GitHub, Railway and generic HTTPS links open externally.
- [ ] Lock/unlock, app switching, backgrounding for 30+ minutes, Wi-Fi/cellular changes reconnect to the same shell/agent process.
- [ ] Files: create/edit/save/rename/search/upload/download/delete confirmation, including binary downloads.
- [ ] Memory notes remain plain files; no app request sends them to AGY.
- [ ] AGY starts a real Browserbase session; live view appears, navigation and screenshots work.
- [ ] Ask AGY to pause, take over, login/2FA/CAPTCHA manually, return to watching and explicitly ask AGY to resume.
- [ ] Browserbase persistent context retains supported login state.
- [ ] Web redeploy preserves tmux process and files, reconnects terminal, and retains login.
- [ ] Workspace redeploy preserves files/native AGY state/login but ends terminal processes; app does not restart AGY.
- [ ] Usage limit, exit and crash remain visible and cause no restart, generated prompt or fallback.
