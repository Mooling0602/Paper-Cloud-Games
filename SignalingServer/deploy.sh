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

# auth token for /stats (same mount as paper-cloud.container Volume)
TOKEN=""
CFG="${RELAY_CONFIG:-$HOME/paper-cloud/config.json}"
if [ -r "$CFG" ]; then
  TOKEN=$(sed -n 's/.*"authToken"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$CFG" | head -1) || true
fi
if [ -n "$TOKEN" ]; then HDR=(-H "X-Auth-Token: $TOKEN"); else HDR=(); fi

# fetch /stats, return HTTP code; stdout is body
poll_stats() {
  curl -s --max-time 3 -w '\n%{http_code}' "${HDR[@]}" "$STATS"
}

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
  resp=$(poll_stats)
  code=$(echo "$resp" | tail -1)
  if [ "$code" = "401" ] || [ "$code" = "403" ]; then
    echo "$(date +%H:%M) auth error (HTTP $code) — check $CFG authToken; stopping" >&2
    exit 0
  fi
  if [ -z "$code" ]; then
    # connection failed — relay may be down
    down=$((down + 1))
    rooms=""
    [ "$down" -ge 2 ] && break # relay unreachable -> already down, redeploy
  else
    rooms=$(echo "$resp" | sed '$d' | grep -oE '[0-9]+' || true)
    if [ "$rooms" = "0" ]; then
      sleep 5 # second confirm right before swapping
      resp2=$(poll_stats)
      code2=$(echo "$resp2" | tail -1)
      if [ "$code2" = "401" ] || [ "$code2" = "403" ]; then
        echo "$(date +%H:%M) auth error (HTTP $code2) — check $CFG authToken; stopping" >&2
        exit 0
      fi
      if [ -n "$code2" ]; then
        rooms2=$(echo "$resp2" | sed '$d' | grep -oE '[0-9]+' || true)
        [ "$rooms2" = "0" ] && break
      fi
    fi
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
