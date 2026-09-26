#!/usr/bin/env bash
# зачем: владелец 26.09 — «не хочу, чтобы макеты потерялись — положи на рабочий стол в папку PhraseMan 2.0».
# Копирует всю папку макетов на рабочий стол (OneDrive\Desktop). Запускать после каждого раздела.
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
for DST in "/c/Users/badlo/OneDrive/Desktop/PhraseMan 2.0" "/c/Users/badlo/Desktop/PhraseMan 2.0"; do
  mkdir -p "$DST"; cp -r "$SRC"/. "$DST"/; rm -f "$DST/sync_to_desktop.sh" "$DST/nul"
  echo "скопировано в $DST: $(ls "$DST"/*.html | wc -l) страниц"
done
