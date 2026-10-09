FROM lscr.io/linuxserver/webtop:ubuntu-xfce

USER root

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/antigravity \
 && curl -fsSL --retry 3 --max-time 300 \
    "https://storage.googleapis.com/antigravity-public/antigravity-hub/2.21.1-5614635819335680/linux-x64/Antigravity.tar.gz" \
    -o /tmp/Antigravity.tar.gz \
 && tar -xzf /tmp/Antigravity.tar.gz -C /opt/antigravity \
 && test -x /opt/antigravity/Antigravity-x64/antigravity \
 && rm -f /tmp/Antigravity.tar.gz

RUN if [ -f /opt/antigravity/Antigravity-x64/chrome-sandbox ]; then \
      chown root:root /opt/antigravity/Antigravity-x64/chrome-sandbox; \
      chmod 4755 /opt/antigravity/Antigravity-x64/chrome-sandbox; \
    fi \
 && mkdir -p /etc/xdg/autostart /usr/share/applications \
 && printf '%s\n' \
    '[Desktop Entry]' \
    'Type=Application' \
    'Name=Google Antigravity 2.0' \
    'Comment=Standalone agent manager' \
    'Exec=/opt/antigravity/Antigravity-x64/antigravity --ozone-platform=x11 --disable-gpu --disable-dev-shm-usage' \
    'Terminal=false' \
    'Categories=Development;' \
    'X-GNOME-Autostart-enabled=true' \
    > /etc/xdg/autostart/antigravity-poc.desktop \
 && cp /etc/xdg/autostart/antigravity-poc.desktop /usr/share/applications/antigravity-poc.desktop

EXPOSE 3000
VOLUME /config
