#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
# push-all-to-origin.sh — отправить на origin ВСЁ, что есть только на маке.
#
# Ничего не форсит и ничего не перезаписывает на удалённой стороне.
# Разошедшаяся ветка уходит под новым именем, чтобы не потерять ни локальные,
# ни удалённые коммиты.
#
#   ./scripts/push-all-to-origin.sh --dry-run   # показать план, ничего не слать
#   ./scripts/push-all-to-origin.sh             # отправить
# ════════════════════════════════════════════════════════════════════════════
set -uo pipefail
cd "$(dirname "$0")/.."

DRY=0
[ "${1:-}" = "--dry-run" ] && DRY=1
run() { if [ "$DRY" = "1" ]; then echo "    [dry-run] $*"; else "$@"; fi; }

STAMP=$(date +%Y%m%d)
FAILED=()

echo "▸ обновляю представление об origin"
git fetch --all --tags --prune || { echo "  не удалось связаться с origin — проверь сеть и SSH-ключ"; exit 1; }

echo
echo "▸ ветки"
for b in $(git for-each-ref --format='%(refname:short)' refs/heads); do
  up=$(git rev-parse --abbrev-ref "$b@{u}" 2>/dev/null || true)

  if [ -z "$up" ]; then
    echo "  • $b — на origin нет, создаю"
    run git push -u origin "$b" || FAILED+=("$b")
    continue
  fi

  counts=$(git rev-list --left-right --count "$up...$b")
  behind=$(echo "$counts" | cut -f1)
  ahead=$(echo "$counts" | cut -f2)

  if [ "$ahead" = "0" ]; then
    echo "  • $b — нечего слать"
  elif [ "$behind" = "0" ]; then
    echo "  • $b — впереди на $ahead, обычный push"
    run git push origin "$b" || FAILED+=("$b")
  else
    # Ветка разошлась: на origin есть коммиты, которых нет локально.
    # Форсить нельзя — уйдём под другим именем, смёржим потом.
    alt="${b}-mac-${STAMP}"
    echo "  • $b — РАЗОШЛАСЬ (позади $behind, впереди $ahead)"
    echo "    отправляю как $alt, чтобы не потерять ни ту, ни другую сторону"
    run git push origin "refs/heads/${b}:refs/heads/${alt}" || FAILED+=("$b")
  fi
done

echo
echo "▸ теги"
run git push origin --tags || FAILED+=("tags")

echo
echo "▸ чищу мусор в .git (временные объекты от прерванных операций)"
run git gc --prune=now --quiet

echo
if [ ${#FAILED[@]} -eq 0 ]; then
  echo "✓ всё отправлено"
else
  echo "✗ не ушло: ${FAILED[*]}"
  exit 1
fi

echo
echo "На винде дальше:"
echo "  git fetch --all --tags --prune"
echo "  git checkout feature/referral-roulette"
echo "  git pull --ff-only"
