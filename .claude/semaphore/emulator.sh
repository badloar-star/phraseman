#!/usr/bin/env bash
# 📱 Очередь на Android-эмулятор: владеет ОДНА сессия за раз.
# зачем: владелец 2026-09-30 — «запускать эмулятор разрешено, но сессии должны
# проверять свои области по очереди и не мешать друг другу». Эмулятор один,
# параллельные прогоны сбивают друг другу приложение/аккаунт/Metro.
# Захват атомарный через mkdir (как в slot.sh). Имя сессии передаётся явно,
# потому что $PPID в Git Bash не всегда стабилен между вызовами.
#
#   bash .claude/semaphore/emulator.sh acquire "<имя сессии>" "что проверяю"
#   bash .claude/semaphore/emulator.sh renew   "<имя сессии>"   # продлить, если проверка длинная
#   bash .claude/semaphore/emulator.sh release "<имя сессии>"
#   bash .claude/semaphore/emulator.sh status

set -u
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCK="$DIR/emulator.lock.d"
TTL=2700   # 45 минут без renew — владелец считается умершим, эмулятор освобождается

now(){ date +%s; }
owner(){ cat "$LOCK/who" 2>/dev/null || echo "?"; }
age(){ echo $(( $(now) - $(cat "$LOCK/born" 2>/dev/null || echo 0) )); }

reap(){
  if [ -d "$LOCK" ] && [ "$(age)" -gt $TTL ]; then
    echo "reaped: $(owner) держал $(( $(age)/60 ))м без renew"
    rm -rf "$LOCK"
  fi
  return 0
}

acquire(){
  local who="${1:?укажи имя сессии}"; local why="${2:-проверка}"
  reap >/dev/null
  if [ -d "$LOCK" ] && [ "$(owner)" = "$who" ]; then
    now > "$LOCK/born"; echo "GO (эмулятор уже у тебя, продлено)"; return 0
  fi
  if mkdir "$LOCK" 2>/dev/null; then
    printf '%s' "$who" > "$LOCK/who"; printf '%s' "$why" > "$LOCK/why"; now > "$LOCK/born"
    echo "GO  эмулятор твой · $why · отдай release сразу по окончании"
    return 0
  fi
  echo "WAIT  эмулятор занят: $(owner) · $(cat "$LOCK/why" 2>/dev/null) · $(( $(age)/60 ))м — делай код/тесты, проверь позже"
  return 1
}

renew(){
  local who="${1:?укажи имя сессии}"
  if [ -d "$LOCK" ] && [ "$(owner)" = "$who" ]; then now > "$LOCK/born"; echo "OK продлено"; return 0; fi
  echo "FAIL эмулятор не твой (владелец: $(owner))"; return 1
}

release(){
  local who="${1:?укажи имя сессии}"
  if [ -d "$LOCK" ] && [ "$(owner)" = "$who" ]; then rm -rf "$LOCK"; echo "OK эмулятор свободен"; return 0; fi
  echo "OK эмулятор был не у тебя (владелец: $(owner))"; return 0
}

status(){
  reap
  if [ -d "$LOCK" ]; then echo "🔴 ЗАНЯТ: $(owner) · $(cat "$LOCK/why" 2>/dev/null) · $(( $(age)/60 ))м"
  else echo "🟢 СВОБОДЕН"; fi
  return 0
}

case "${1:-status}" in
  acquire) shift; acquire "$@" ;;
  renew)   shift; renew "$@" ;;
  release) shift; release "$@" ;;
  status)  status ;;
  *) echo "usage: emulator.sh {acquire <сессия> \"что\"|renew <сессия>|release <сессия>|status}"; exit 2 ;;
esac
