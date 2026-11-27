#!/bin/sh
# Push this checkout's code to the VPS (keeps the server's stories, builds and logs).
set -e
cd "$(dirname "$0")/.."
# the server address lives in deploy/host (gitignored), e.g. root@203.0.113.7
HOST=${HOST:-$(cat deploy/host 2>/dev/null)}
[ -n "$HOST" ] || { echo "put user@server in deploy/host or set HOST"; exit 1; }
rsync -azL --exclude node_modules --exclude .git --exclude 'stories/*/build' --exclude 'stories/*/out' \
  --exclude logs --exclude src/generated --exclude .claude --exclude .DS_Store --exclude .env \
  ./ "$HOST:/home/shorts/app/"
ssh "$HOST" 'chown -R shorts:shorts /home/shorts/app && cp /home/shorts/app/deploy/shorts-daily.* /etc/systemd/system/ && systemctl daemon-reload'
echo "synced"
