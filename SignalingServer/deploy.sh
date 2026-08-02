#!/usr/bin/env bash
# Paper Cloud Games auto-deploy:
#   1. pull the latest image from GHCR
#   2. if unchanged -> done
#   3. if changed -> wait until the relay has NO active rooms, then recreate
#      the container (players are never cut off mid-session); if the relay
#      is unreachable it is already down, so redeploy right away
set -euo pipefail

IMG="ghcr.io/mooling0602/paper-cloud-games:latest"
STATS="http://127.0.0.1:8787/stats"

BEFORE=$(podman image inspect --format '{{index .RepoDigests 0}}' "$IMG" 2>/dev/null || true)
podman pull "$IMG" >/dev/null 2>&1
AFTER=$(podman image inspect --format '{{index .RepoDigests 0}}' "$IMG")

if [ "$BEFORE" = "$AFTER" ]; then
  echo "$(date +%H:%M) no update"
  exit 0
fi
echo "$(date +%H:%M) new image: $AFTER"

# wait for the relay to go idle: poll /stats every 10s, up to 10 minutes
down=0
rooms=""
for _ in $(seq 1 60); do
  rooms=$(curl -s --max-time 3 "$STATS" | grep -oE '[0-9]+' || true)
  if [ -z "$rooms" ]; then
    down=$((down + 1))
    [ "$down" -ge 2 ] && break # relay unreachable -> already down, redeploy
  elif [ "$rooms" = "0" ]; then
    sleep 5 # second confirm right before swapping
    rooms=$(curl -s --max-time 3 "$STATS" | grep -oE '[0-9]+' || true)
    [ "$rooms" = "0" ] && break
  fi
  sleep 10
done

if [ -n "$rooms" ] && [ "$rooms" != "0" ]; then
  echo "$(date +%H:%M) relay busy (rooms=$rooms), skipping this round"
  exit 0
fi

podman rm -f paper-cloud >/dev/null 2>&1 || true
podman run -d --name paper-cloud --restart=always -p 127.0.0.1:8787:8787 "$IMG" >/dev/null
echo "$(date +%H:%M) redeployed"
