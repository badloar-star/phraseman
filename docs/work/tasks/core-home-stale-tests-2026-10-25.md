# Ядро · две красные в HEAD на Главной: устаревшие сторожа (25.10)

Governance-ID: TG-7C89720C7019

## Outcome
Моменты нашли две красные в HEAD. Обе — сторожа, отставшие от намеренных правок кода:
1. tests/home_v2_video_rail_contract.test.cjs:133 ждёт `runesBalance` в accessibilityLabel монет. В de99afcd4 (Ядро, «одно число монет»)
   подпись и значение плашки стали `homeShownCoins` (кошелёк + ожидающие Пика), чтобы диктор и экран говорили одно число.
2. tests/home_survey_sheet_contract.test.ts:19 ждёт `{homeSurvey.launch ? (<Suspense fallback={null}>`. В a0a8607fe (диагностика
   [TEXT-OUTSIDE]) окно анкеты обёрнуто в HomeSheetTextGuard снаружи Suspense — намеренно (комментарий в коде). Ленивость и условие на месте.

## Scope
Только тесты: смысл проверок сохранён, ожидания приведены к нынешней разметке. Код не трогаем.

## Architecture
Без изменений.

## Security and privacy
Не касается.

## Technical debt
Новой нет.

## Verification
Оба теста + соседние сторожа Главной.

## Rollback
Revert коммита.
