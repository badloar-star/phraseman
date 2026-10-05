# Task packet: два красных теста — no_energy_modal_locale_runtime и sage_porcelain_modal_chrome_contract

Governance-ID: TG-52CCE729EE15
Status: In progress
Owner: сессия 1 · ЯДРО (координатор 05.10)

## Outcome

(1) no_energy_modal_locale_runtime ждёт ENERGY_GATE_MESSAGES_BY_LANG / ENERGY_GATE_MESSAGES_PT_BR… в
components/NoEnergyModal.tsx. git log -S: убраны НАМЕРЕННО в 379a4486a (15.09, владелец: «модал говорит
экзамен требует 20 — исправь тексты под раздел»): случайная рулетка строк с «Экзамен требует N ⚡» заменена на
energyGateMessage(activity, lang, …) в app/energy_activity_titles.ts — 9 языков, название раздела по activity.
Регресса нет, тест устарел. Обновить тест под текущий источник: модал берёт текст из energyGateMessage,
legacy-веток нет, все 9 языков дают непустой текст с ценой и названием раздела.
(2) sage_porcelain_modal_chrome_contract не разбирает ESM-импорт в components/RewardModalBackdrop.tsx —
сначала лог (какой модуль/импорт), потом правка конфига jest, не кода приложения.

## Scope

tests/no_energy_modal_locale_runtime.test.ts; конфиг jest (package.json) — только если (2) это
transformIgnorePatterns. Код NoEnergyModal (3 варианта Дизайна, 645d571ab) не трогаем.

## Architecture

Без изменений приложения.

## Security and privacy

Не затрагивается.

## Technical debt

Сторожа текста по исходнику (toContain) ломаются при любом переносе текстов — новый тест проверяет поведение
energyGateMessage на всех языках, а исходник модала — только по источнику текста.

## Verification

Оба теста зелёные; соседние sage_porcelain_* и energy-тесты.

## Rollback

git revert.
