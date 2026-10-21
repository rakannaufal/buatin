#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

if [ "$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)" != "24" ]; then
  for candidate in /opt/homebrew/opt/node@24/bin /usr/local/opt/node@24/bin; do
    if [ -x "$candidate/node" ] && [ "$("$candidate/node" -p 'process.versions.node.split(".")[0]')" = "24" ]; then
      PATH="$candidate:$PATH"
      break
    fi
  done
fi

if [ "$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)" != "24" ]; then
  echo "Node.js 24 diperlukan. Aktifkan Node.js 24 pada PATH lalu ulangi npm run dev." >&2
  exit 1
fi

if ! command -v pg_ctl >/dev/null 2>&1; then
  for candidate in /opt/homebrew/opt/postgresql@17/bin /usr/local/opt/postgresql@17/bin; do
    if [ -x "$candidate/pg_ctl" ]; then
      PATH="$candidate:$PATH"
      break
    fi
  done
fi

export PATH
exec node --import tsx scripts/dev.ts
