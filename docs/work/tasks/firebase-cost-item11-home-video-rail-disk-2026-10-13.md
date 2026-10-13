# Task packet: смета Firebase п.11 (часть 2) — лента видео es/fr/de/it на Главной кэшируется на диске

Governance-ID: TG-827D90584604
Status: In progress
Owner: Ядро (сессия 1)
Related: docs/phraseman-2.0/FIREBASE_COST_R1_2026-10-13.md п.11; backlog п.7

## Outcome

app/home_video_rail_source.ts: результат ленты (манифест + корень + канал + ≤8 роликов, до 11 чтений) держался 6 ч только в
памяти — каждый холодный старт читал Firestore заново. Теперь тот же результат пишется на диск (`home_video_rail_cache_v1`, по
языку), на старте свежий (< 6 ч) берётся с диска без сети; журнал [LANG-SURFACE] home_rail:disk_hit / disk_write / disk_*_failed.
Ключ — в реестре данных телефона (device_only).

## Scope

In scope: один модуль + реестр + тест. Out of scope: английская RSS-лента (lingman_youtube.ts), экран Главной.

## Architecture

No architecture change.

## Security and privacy

На диске — публичные данные каталога YouTube (id, заголовки, превью). Персональных данных нет.

## Technical debt

- Первый кадр Главной по-прежнему смотрит в память (peek); дисковый снимок поднимается при первой загрузке — мгновенный первый
  кадр из диска — отдельная задача Главной.

## Verification

Тест: запись после сети, чтение с диска без сети, протухший кэш → сеть; сторож реестра.

## Rollback

Откат коммита.
