# Task packet: Главная — лента видео после en → es → en не остаётся скелетонами

Governance-ID: TG-34825B487BC8
Governance-ID: TG-1896A6E3BE24
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по находке Ядра (аудит языка Авторизации, проверено Ядром по коду)
Related epic/enabler: D130 (сброс ленты при смене языка), правило «каждый раздел открывается мгновенно из кэша»

## Outcome

В одном запуске цель обучения en → es → en: полоса видео Главной на возврате в en сразу показывает снимок из памяти, а не скелетоны до перезапуска приложения. В журнале каждая ветка сброса: `[LANG-SURFACE] home_rail:reset {target, catalog, source: catalog|memo|none, videos}`.

## Scope

In scope: app/(tabs)/home.tsx — только эффект сброса ленты при смене studyTarget (для не-каталожной цели брать homeVideoSnapshotMemo), журнал, контракт-тест.

Out of scope: эффект ленты en (кэш/сеть), каталожные цели (es/fr/de/it), состав видео.

## Architecture

No architecture change: сброс берёт тот же источник (снимок в памяти процесса), что и первый рендер Главной; пустой снимок не в счёт.

## Security and privacy

Данные не затрагиваются; в журнал — язык и счётчик видео.

## Technical debt

Pay now: ветка сброса перестаёт молча оставлять ленту пустой.

## Verification

Контракт-тест на строки эффекта; проверка по ссылкам lang-switch-037…039 (DEV_LINKS_LANG_SWITCH.md, Авторизация): журнал `home_rail:reset source=memo` на возврате в en.

## Rollback

git revert коммита.
