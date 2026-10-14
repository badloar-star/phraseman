# Task packet: два контракта пейвола под D187 и Profiler экрана (координатор 14.10)

Governance-ID: TG-431AC5C3B5E8
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

После df0c03d50 (D187) и 5400d7316 (Profiler `screen:premium_modal`) покраснели два сторожа.

1. `tests/paywall_navigation_smooth_contract.test.ts` ждёт буквальное `return <PaywallPlusScreen entry={entryResolution.entry} />;`.
   - Сейчас экран собирается в `const screen = …` и отдаётся как есть, а под флагом TAP-LAT — внутри Profiler.
   - Смысл (диспетчер рисует настоящий пейвол сразу, без пустого экрана-перенаправления; manage остаётся на подложке) сохраняется — проверки переписываются на новую форму, не ослабляются.
2. `tests/paywall_double_tap_contract.test.ts` ждёт лог «exit-оффер: чтение «уже видели» упало». Оффера больше нет (D187).
   - Смысл «закрытие не глотает ошибки молча» переносится на нынешнее закрытие:
     - в хуке нет немого catch;
     - нет слова «exit-оффер»;
     - handleClose пишет `[PAYWALL-CLOSE] via=` до `doClose`.

## Scope

In scope: только два тест-файла.

## Architecture

Нет изменений кода.

## Security and privacy

Не касается.

## Technical debt

Нет новых. Profiler — временная трассировка; когда его снимут, проверку `const screen` упростить обратно.

## Verification

Оба сторожа зелёные; соседи пейвола.

## Rollback

`git revert`.
