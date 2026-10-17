#!/usr/bin/env bash
# 🚦 Светофор параллельных сессий Phraseman.
# зачем: владелец держит 10+ сессий Claude/Codex на одном ПК; 23.08.2026 машина
# вылетала при 39 процессах node. Слотов мало — больше тяжёлых задач машина не тянет.
# Захват атомарный через mkdir (единственная POSIX-операция, атомарная и на Windows/Git Bash).
#
# Команды:
#   acquire [--wait[=СЕК]] "зачем"  GO (код 0) или WAIT (код 1). С --wait ждёт до GO (по умолчанию 600 с), потом WAIT и код 1.
#   run [--wait[=СЕК]] "зачем" -- команда…  берёт слот (ждёт), держит его живым, выполняет команду, отдаёт слот, возвращает КОД КОМАНДЫ.
#                                   Слот не дали — команда НЕ запускается, код 1.
#   renew                           продлить свой слот (сбросить TTL) — для длинных прогонов, которые запущены через acquire.
#   release | status | reap
#
# зачем (координатор 15.10, третья сессия за ночь пошла дальше при WAIT): код выхода при WAIT всегда 1 (цепочки `acquire && jest`
# останавливаются сами), а `run` и `--wait` убирают причину ошибок — ручную связку «взял слот → забыл про TTL 15 минут → прогон 36 минут».

set -u
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# зачем: 04.10 ПК падал до 12 МБ — один jest-воркер берёт 3–4 ГБ, а CapCut держит ~8 ГБ. Один слот на ПК.
SLOTS=${PM_SLOTS:-1}
TTL=900   # 15 минут — после этого слот считается протухшим (сессия умерла); живой длинный прогон продлевает слот (renew / run)
RENEW_EVERY=${PM_SLOT_RENEW_EVERY:-60}
# Стабильный ID сессии: $$ в Git Bash меняется на каждый вызов и ломал
# распознавание "мой слот", поэтому фолбэк — PPID (живёт вместе с сессией).
# зачем (координатор 15.10): у Claude Code ID сессии стабилен (CLAUDE_CODE_SESSION_ID), а у сессий без такой переменной (Codex и др.) PPID меняется
# между вызовами инструмента — «мой слот» не узнаётся, слот течёт до TTL, свой же acquire даёт ложный WAIT. Такая сессия задаёт PM_SESSION_ID один раз
# (например export PM_SESSION_ID=codex-<имя>) — он главнее остальных.
ME="${PM_SESSION_ID:-${CLAUDE_SESSION_ID:-${CLAUDE_CODE_SESSION_ID:-ppid-$PPID}}}"
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

# Одна попытка взять слот. 0 = GO (строка напечатана), 1 = занято (ничего не печатает).
try_acquire(){
  local why="$1"
  reap >/dev/null
  # Уже держим слот? Не берём второй, но продлеваем TTL.
  if [ -d "$DIR/slot.$ME.d" ]; then
    now > "$DIR/slot.$ME.d/born"
    echo "GO (слот уже был у этой сессии)"; return 0
  fi
  if [ "$(held)" -ge "$SLOTS" ]; then return 1; fi
  if mkdir "$DIR/slot.$ME.d" 2>/dev/null; then
    # зачем (координатор 18.10 00:01): две сессии могли одновременно пройти проверку held() и обе создать слоты —
    # повторная проверка после mkdir; лишний захват откатываем и ждём дальше.
    if [ "$(held)" -gt "$SLOTS" ]; then
      rm -rf "$DIR/slot.$ME.d"
      return 1
    fi
    now > "$DIR/slot.$ME.d/born"
    printf '%s' "$why" > "$DIR/slot.$ME.d/why"
    echo "GO  слот $(held)/$SLOTS · $why"
    return 0
  fi
  return 1
}

# acquire [--wait[=СЕК]] "зачем"
acquire(){
  local wait_s=0 why=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --wait) wait_s=${PM_SLOT_WAIT:-600}; shift ;;
      --wait=*) wait_s="${1#--wait=}"; shift ;;
      *) why="${why:+$why }$1"; shift ;;
    esac
  done
  why="${why:-работа}"
  case "$wait_s" in ''|*[!0-9]*) echo "WAIT  неверное значение --wait (нужны секунды) · НЕ запускай тяжёлое"; return 1 ;; esac
  local deadline=$(( $(now) + wait_s ))
  while :; do
    if try_acquire "$why"; then return 0; fi
    if [ "$(now)" -ge "$deadline" ]; then break; fi
    sleep 3
  done
  # зачем: одна строка, начинается с WAIT (вызывающие читают `grep -q '^GO'` и `tail -1`); код выхода 1 — НЕ запускай тяжёлое.
  echo "WAIT  занято $(held)/$SLOTS · НЕ запускай тяжёлое (код выхода 1): делай лёгкое, или slot.sh acquire --wait \"зачем\", или slot.sh run \"зачем\" -- команда"
  return 1
}

renew(){
  if [ -d "$DIR/slot.$ME.d" ]; then
    now > "$DIR/slot.$ME.d/born"
    echo "OK  слот продлён · ещё ${TTL} с"
    return 0
  fi
  echo "WAIT  слота у этой сессии нет — сначала acquire (код выхода 1)"
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

# run [--wait[=СЕК]] "зачем" -- команда…
run(){
  local wopt="--wait" why=""
  while [ $# -gt 0 ] && [ "$1" != "--" ]; do
    case "$1" in
      --wait|--wait=*) wopt="$1" ;;
      *) why="${why:+$why }$1" ;;
    esac
    shift
  done
  [ "${1:-}" = "--" ] || { echo "usage: slot.sh run [--wait[=СЕК]] \"зачем\" -- команда…"; return 2; }
  shift
  [ $# -gt 0 ] || { echo "usage: slot.sh run [--wait[=СЕК]] \"зачем\" -- команда…"; return 2; }
  # зачем (координатор 18.10 00:01): два `run` одной сессии подряд оба получали «GO (слот уже был у этой сессии)»
  # и шли параллельно — два tsc по 4,6 ГБ, на ПК оставалось 94 МБ. Прогоны `run` одной сессии — строго по одному.
  local run_wait_s=${PM_SLOT_WAIT:-600}
  case "$wopt" in --wait=*) run_wait_s="${wopt#--wait=}" ;; esac
  case "$run_wait_s" in ''|*[!0-9]*) run_wait_s=600 ;; esac
  local run_deadline=$(( $(now) + run_wait_s ))
  local run_lock="$DIR/run.$ME.d"
  # протухший замок прогона (сессия умерла посреди run) снимаем по тому же TTL
  if [ -d "$run_lock" ]; then
    local rborn; rborn=$(cat "$run_lock/born" 2>/dev/null || echo 0)
    [ $(( $(now) - rborn )) -gt $TTL ] && rm -rf "$run_lock"
  fi
  until mkdir "$run_lock" 2>/dev/null; do
    if [ "$(now)" -ge "$run_deadline" ]; then
      echo "WAIT  у этой сессии уже идёт другой run · НЕ запускай тяжёлое (код выхода 1)"
      echo "run: слот не получен — команда НЕ запущена"
      return 1
    fi
    sleep 3
  done
  now > "$run_lock/born"
  local out; out="$(acquire "$wopt" "${why:-работа}")" || { rm -rf "$run_lock"; echo "$out"; echo "run: слот не получен — команда НЕ запущена"; return 1; }
  echo "$out"
  local had_slot=0
  # слот был у сессии до run — после команды его не отдаём (его держит вызвавший)
  case "$out" in "GO (слот уже был"*) had_slot=1 ;; esac
  # продление в фоне: слот живёт ровно пока жива команда
  ( while sleep "$RENEW_EVERY"; do now > "$DIR/slot.$ME.d/born" 2>/dev/null || exit 0; now > "$run_lock/born" 2>/dev/null; done ) &
  local renewer=$!
  "$@"
  local rc=$?
  kill "$renewer" 2>/dev/null
  wait "$renewer" 2>/dev/null
  [ "$had_slot" -eq 1 ] || release >/dev/null
  rm -rf "$run_lock"
  echo "run: команда завершилась с кодом $rc"
  return $rc
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
  acquire) shift; acquire "$@" ;;
  run)     shift; run "$@" ;;
  renew)   renew ;;
  release) release ;;
  status)  status ;;
  reap)    reap; status ;;
  *) echo "usage: slot.sh {acquire [--wait[=СЕК]] \"зачем\"|run [--wait[=СЕК]] \"зачем\" -- команда…|renew|release|status|reap}"; exit 2 ;;
esac
