# Architecture

```
iPhone PWA → HTTPS web gateway → Railway private network → workspace daemon
                   │                                     │
              password login                        node-pty → tmux → shell
              session + CSRF                              │
              WebSocket proxy                     user explicitly runs agy
                                                          │
                                                    official MCP tools
                                                          │
                                                managed Browserbase browser
```

Web never starts AGY or modifies its output. Input consists solely of user keystrokes, paste, and toolbar control keys. Terminal resize and connection-control frames are transport metadata, not prompts. A closed PTY client detaches from tmux. Creating or restarting the daemon never starts AGY. Infrastructure restart policy applies to the daemon only.

The daemon runs as the `agy` Linux user. All mutable home state is under `/home/agy`; application code and installed system binaries are outside the volume. A root entrypoint initializes directory ownership, then drops privileges. It never recursively rewrites project ownership or overwrites existing shell files.

Web sessions use random opaque IDs authenticated by an HMAC. Only a hash of each session ID is stored in the private volume, with CSRF token and absolute expiration. Cookie and expiration remain usable across web and workspace redeploys. Logout revokes the session and closes its WebSockets. The password is an Argon2id hash in web-only environment variables. Login accepts only same-origin JSON, with per-IP and aggregate throttling and serialized verification.

Every workspace operation requires a separate random shared bearer token. Production WebSockets require both a valid persistent session and exact same-origin header. Mutations require exact same-origin plus CSRF. Public APIs allow only explicit file/status/browser operations; internal session-storage routes cannot be reached through the gateway. Private responses are never cached by the PWA service worker.

The terminal keeps 50,000 scrollback lines in xterm and tmux. Reattachment redraws the current pane; the app also restores available tmux history. Output is sent unchanged. Pasted text is queued in small Unicode-safe chunks with browser transport backpressure. Interrupted input is discarded rather than replayed or automatically submitted. Copy uses the current terminal selection; Paste falls back to a native textarea when iOS clipboard permission is unavailable.

Browserbase API keys stay in the daemon. The PWA receives only session IDs, creation times and the live-view URL needed to display a session. Treat live-view URLs as sensitive. Watch mode places an input shield over the live view; Take control removes it. These buttons do not pause or resume AGY: the user must explicitly coordinate that in the terminal.
