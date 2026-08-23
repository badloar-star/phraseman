#!/usr/bin/env bash
# 🚦 Светофор параллельных сессий Phraseman.
# зачем: владелец держит 10+ сессий Claude/Codex на одном ПК; 23.08.2026 машина
# вылетала при 39 процессах node. Слотов 3 — больше тяжёлых задач машина не тянет.
# Захват атомарный через mkdir (единственная POSIX-операция, атомарная и на Windows/Git Bash).

set -u
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SLOTS=3
TTL=900   # 15 минут — после этого слот считается протухшим (сессия умерла)
# Стабильный ID сессии: $$ в Git Bash меняется на каждый вызов и ломал
# распознавание "мой слот", поэтому фолбэк — PPID (живёт вместе с сессией).
ME="${CLAUDE_SESSION_ID:-${CLAUDE_CODE_SESSION_ID:-ppid-$PPID}}"
ME="$(printf %s "$ME" | tr -c "A-Za-z0-9_-" "_")"

now(){ date +%s; }

# Убираем слоты мёртвых/зависших сессий.
reap(){
  local n=0
  for d in "$DIR"/slot.*.d; do
    [ -d "$d" ] || continue
    local born; born=$(cat "$d/born" 2>/dev/null || echo 0)
    if [ $(( $(now) - born )) -gt $TTL ]; then
      rm -rf "$d" && n=$((n+1))
    fi
  done
  [ $n -gt 0 ] && echo "reaped:$n"
  return 0
}

held(){ ls -d "$DIR"/slot.*.d 2>/dev/null | wc -l | tr -d ' '; }

acquire(){
  local why="${1:-работа}"
  reap >/dev/null
  # Уже держим слот? Не берём второй.
  if [ -d "$DIR/slot.$ME.d" ]; then
    echo "GO (слот уже был у этой сессии)"; return 0
  fi
  for i in $(seq 1 $SLOTS); do
    if [ "$(held)" -ge "$SLOTS" ]; then break; fi
    if mkdir "$DIR/slot.$ME.d" 2>/dev/null; then
      now > "$DIR/slot.$ME.d/born"
      printf '%s' "$why" > "$DIR/slot.$ME.d/why"
      echo "GO  слот $(held)/$SLOTS · $why"
      return 0
    fi
  done
  echo "WAIT  занято $(held)/$SLOTS · делай лёгкое или подожди"
  return 1
}

release(){
  if [ -d "$DIR/slot.$ME.d" ]; then
    rm -rf "$DIR/slot.$ME.d"
    echo "OK  слот отдан · занято $(held)/$SLOTS"
  else
    echo "OK  слота не было"
  fi
  return 0
}

status(){
  reap >/dev/null
  local h; h=$(held)
  local light="🟢 СВОБОДНО"
  [ "$h" -ge 1 ] && light="🟡 ЕСТЬ МЕСТО"
  [ "$h" -ge "$SLOTS" ] && light="🔴 ЗАНЯТО — не запускай тяжёлое"
  echo "$light  $h/$SLOTS"
  for d in "$DIR"/slot.*.d; do
    [ -d "$d" ] || continue
    local id; id=$(basename "$d" .d); id=${id#slot.}
    local born; born=$(cat "$d/born" 2>/dev/null || echo 0)
    local why; why=$(cat "$d/why" 2>/dev/null || echo "?")
    echo "   · сессия ${id:0:8} · $(( ($(now)-born)/60 ))м · $why"
  done
  # Реальная нагрузка на машину — сырой факт, а не догадка.
  local procs; procs=$(tasklist 2>/dev/null | grep -icE "node\.exe|claude" || echo "?")
  echo "   процессов node/claude на ПК: $procs"
  return 0
}

case "${1:-status}" in
  acquire) shift; acquire "${*:-работа}" ;;
  release) release ;;
  status)  status ;;
  reap)    reap; status ;;
  *) echo "usage: slot.sh {acquire \"зачем\"|release|status|reap}"; exit 2 ;;
esac
