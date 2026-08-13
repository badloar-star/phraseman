#!/bin/zsh

set -u
cd "$(dirname "$0")"

PROJECT_DIR="$PWD"
STATE_DIR="$PROJECT_DIR/.codex-tmp/iphone-metro"
PID_FILE="$STATE_DIR/server.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "Постоянный Phraseman Metro уже выключен."
  echo "Нажмите Enter, чтобы закрыть окно."
  read -r
  exit 0
fi

server_pid="$(tr -dc '0-9' < "$PID_FILE")"
command_line="$(ps -p "$server_pid" -o command= 2>/dev/null)"

if [[ -z "$server_pid" || "$command_line" != *"$PROJECT_DIR/scripts/start-iphone-metro.mjs --lan"* ]]; then
  rm -f "$PID_FILE"
  echo "Сервер уже не работает; устаревшая запись очищена."
  echo "Нажмите Enter, чтобы закрыть окно."
  read -r
  exit 0
fi

echo "Останавливаю Phraseman Metro (PID $server_pid)…"
kill -TERM "$server_pid" 2>/dev/null || true

for _ in {1..40}; do
  kill -0 "$server_pid" 2>/dev/null || break
  sleep 0.25
done

if kill -0 "$server_pid" 2>/dev/null; then
  echo "Сервер не успел завершиться. Откройте этот файл ещё раз через несколько секунд."
  echo "Нажмите Enter, чтобы закрыть окно."
  read -r
  exit 1
fi

rm -f "$PID_FILE"
echo "✅ Phraseman Metro выключен."
sleep 2
