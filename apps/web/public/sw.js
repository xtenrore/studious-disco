// Network-only: private terminal output, files and sessions never enter a service-worker cache.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
