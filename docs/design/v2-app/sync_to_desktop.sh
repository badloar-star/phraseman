#!/usr/bin/env bash
# зачем: владелец 26.09 — «не хочу, чтобы макеты потерялись — положи на рабочий стол в папку PhraseMan 2.0».
# Копирует всю папку макетов на рабочий стол (OneDrive\Desktop). Запускать после каждого раздела.
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
DST="/c/Users/badlo/OneDrive/Desktop/PhraseMan 2.0"
mkdir -p "$DST"
cp -r "$SRC"/. "$DST"/
rm -f "$DST/sync_to_desktop.sh"
echo "скопировано в $DST: $(ls "$DST"/*.html | wc -l) страниц"
