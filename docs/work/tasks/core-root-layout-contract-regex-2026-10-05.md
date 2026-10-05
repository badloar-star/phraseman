# Task packet: сторож root_layout_startup_navigation_contract — шаблон потолка firstContentReady

Governance-ID: TG-9AE91A922AD6
Status: In progress (координатор 05.10: прогнать сторожей сплеша/bootstrap после 3420139f7)
Owner: сессия 1 · ЯДРО

## Outcome

Сторож проверяет, что у firstContentReady есть потолок: setTimeout(() => { … setFirstContentReady(true); },
FIRST_CONTENT_READY_FALLBACK_MS). Шаблон `[^}]*` не допускал фигурных скобок в теле, а 8515d3260 (01:29, диагностика
ворот сплеша) и 037ec1173 добавили туда bootMark с объектом и отметку firstContentReadySetAtRef — сторож покраснел, хотя
потолок на месте. Расширяем шаблон на нежадный `[\s\S]*?` в пределах того же setTimeout; смысл проверки прежний.

## Scope

tests/root_layout_startup_navigation_contract.test.ts, одна строка.

## Architecture

Не меняется.

## Security and privacy

Не затрагивает.

## Technical debt

Чужие красные этого прогона (не от сегодняшних правок) — отчётом координатору: auth_recovery_boot_integration (ждёт
resumePendingAccountDeleteLocalExit и однострочный in-flight return 08-31), bootstrap_locale_contract (с 13.09).

## Verification

test:one этого файла — 4/4.

## Rollback

git revert коммита.
