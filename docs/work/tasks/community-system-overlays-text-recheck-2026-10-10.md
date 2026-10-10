# Task packet: привязки реестра (coins/results), сверка текстов Сообщество/Каталог и system/overlays, сводка «не вёрстка»

Governance-ID: TG-08E7D8CA61F8
Status: In progress
Owner: сессия «2 · Дизайн» (поручение координатора 10.10 05:15)
Related epic/enabler: profile-coins-results-recheck-2026-10-10.md; text-diff-results-coins-profile-overlays-2026-10-10.md

## Outcome

1. Реестр визуального паритета: coins-001/002 → `app/runes_wallet.tsx`; results-001…006 → код ошибок (mistake_detail / mistakes-panel), `mapping=outdated_mockup`; статусы не трогать.
2. OWNER_MOCKUP_CORRECTIONS: раздел A — «Итоги месяца» и «Скидки и предложения» (в макете строк нет), темы profile-008 устарели; «События Шпиля» — «после релиза».
3. Сверка текстов Сообщества/Каталога и system/overlays тем же методом; вёрстку чинить, решения помечать.
4. Единая сводка «что осталось не вёрстка» одним файлом.

## Scope

In scope: `visual_parity.json` (только привязки code/mockup.mapping), документы, view-слой Сообщества/окон. Out of scope: статусы строк реестра, логика, сервер, Learning V2, Шпиль, файлы Codex.

## Architecture

Привязки правятся скриптом по id; метод сверки — `scan_texts.mjs` + `textdiff.js` + ручная проверка (с поправкой на «ты/вы»).

## Security and privacy

Не затрагивает данные.

## Technical debt

Contain: нерешённое фиксируется в сводке «не вёрстка».

## Verification

JSON валиден; тест-сторож реестра `tests/visual_parity_gate.test.mjs` (если есть) зелёный; синтаксис правок кода.

## Rollback

Отдельные коммиты, `git revert`.
