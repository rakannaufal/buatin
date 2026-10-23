#!/bin/sh
set -eu
umask 077

# Startup requires current signatures; update failure never disables scanning.
env -i PATH=/usr/bin:/bin HOME=/home/node timeout 300 freshclam --stdout
env -i PATH=/usr/bin:/bin HOME=/home/node freshclam --daemon --foreground --stdout &
scanner_pid=$!
node --import tsx scripts/hosted.ts worker &
worker_pid=$!
stop() {
  kill -TERM "$worker_pid" "$scanner_pid" 2>/dev/null || true
}
trap stop TERM INT
set +e
wait "$worker_pid"
result=$?
stop
wait "$scanner_pid" 2>/dev/null
exit "$result"
