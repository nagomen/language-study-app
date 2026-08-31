#!/bin/zsh
set -e

APP_DIR="${0:A:h}"
PORT=8765

cd "$APP_DIR"
while lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/language-study-app.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT INT TERM

sleep 1
open "http://127.0.0.1:$PORT"
wait "$SERVER_PID"
