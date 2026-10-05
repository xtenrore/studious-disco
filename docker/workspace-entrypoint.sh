#!/bin/bash
set -euo pipefail
# Railway volumes arrive owned by root. Initialize the real home without overwriting user files.
install -d -m 700 -o agy -g agy /home/agy /home/agy/.local /home/agy/.local/share /home/agy/.local/share/personal-agy /home/agy/.config /home/agy/memory
install -d -m 755 -o agy -g agy /home/agy/projects
if [ ! -f /home/agy/.bashrc ]; then
  cat > /home/agy/.bashrc <<'SHELL'
export PATH="$HOME/.local/bin:/usr/local/bin:$PATH"
export TERM=xterm-256color
export PS1='\[\e[38;5;151m\]agy\[\e[0m\]:\w\$ '
SHELL
  chown agy:agy /home/agy/.bashrc
fi
if [ ! -f /home/agy/.bash_profile ]; then
  printf '%s\n' '[ -f "$HOME/.bashrc" ] && . "$HOME/.bashrc"' > /home/agy/.bash_profile
  chown agy:agy /home/agy/.bash_profile
fi
# The daemon starts no agent, prompts no agent, and restores no running process.
exec gosu agy "$@"
