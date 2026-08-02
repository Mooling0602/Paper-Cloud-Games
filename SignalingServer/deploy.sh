#!/usr/bin/env bash
# Paper Cloud Games auto-deploy:
#   1. pull the latest image (NJU GHCR mirror first, upstream fallback)
#   2. if the manifest digest is unchanged -> done
#   3. if changed -> wait until the relay has NO active rooms, then recreate
#      the container (players are never cut off mid-session); if the relay
#      is unreachable it is already down, so redeploy right away
set -euo pipefail

CANDIDATES="ghcr.nju.edu.cn/mooling0602/paper-cloud-games:latest ghcr.io/mooling0602/paper-cloud-games:latest"
STATS="http://127.0.0.1:8787/stats"

digest_of() {
  podman image inspect --format '{{.Digest}}' "$1" 2>/dev/null || true
}

# digest of whatever we already have (from either registry — same manifest)
BEFORE=""
for c in $CANDIDATES; do
  BEFORE=$(digest_of "$c")
  [ -n "$BEFORE" ] && break
done

IMG=""
for pass in 1 2 3; do
  for c in $CANDIDATES; do
    if out=$(podman pull --retry 3 --retry-delay 10s "$c" 2>&1); then
      IMG="$c"
      break 2
    fi
    echo "$(date +%H:%M) pull failed: $c — $(echo "$out" | tail -1)"
  done
  [ "$pass" = 3 ] || { echo "$(date +%H:%M) pass $pass failed, retrying in 20s"; sleep 20; }
done
if [ -z "$IMG" ]; then
  echo "$(date +%H:%M) all pulls failed, skipping this round"
  exit 0
fi

AFTER=$(digest_of "$IMG")
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

# restart the quadlet-managed container with the freshly pulled image
systemctl --user restart paper-cloud.service
echo "$(date +%H:%M) redeployed"
