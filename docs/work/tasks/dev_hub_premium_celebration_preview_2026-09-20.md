# Task packet: кнопка празднования Plus/Pro в самом верху DEV-хаба

Governance-ID: TG-A57B9532C6D5
Status: Planned
Owner: Claude session (владелец: badloar@gmail.com)
Related epic/enabler: none

## Outcome

Владелец открывает DEV-хаб и в САМОМ ВЕРХУ списка видит секцию «Празднование
покупки» с двумя кнопками — «Plus» и «Pro». Тап поднимает НАСТОЯЩУЮ модалку
`PremiumCelebrationModal` (хореография v6 «Золотая палата») с боевой анимацией и
звуком. Успех: анимацию видно без прохождения покупки, без захода в
«Движение · все поверхности» (где она была спрятана на два уровня вглубь) и без
начисления/списания чего-либо.

## Scope

In scope:
- `components/dev/devToolRegistry.ts` — новая секция `purchase-celebration`
  (`order: -2`, выше `dev-runes-grant`), два инструмента + два новых
  `DevToolAction`.
- `components/dev/DevHubSheet.tsx` — вариант `PreviewState` `'celebration'`,
  обработчик, монтирование `PremiumCelebrationModal`.
- `tests/dev_hub_contract.test.ts` — сторож списка секций обязан знать новую
  секцию (иначе падает).

Out of scope: сама модалка и её хореография; витрина движения
(`motion_showcase/sections/purchase_celebration.tsx`) остаётся как есть; варианты
`vip`, `max`, промокод — владелец назвал только Plus и Pro.

## Architecture

Границы не меняются. Используется тот же контракт превью, что у
`welcome-gift`/`league`: DEV-хаб закрывает свой native Modal (`requestClose(true)`),
затем монтирует целевую модалку, которая рисует свой Modal сама. Вложенных
Modal нет — на iOS вложенный презент ломает стек показа.

Инвариант: превью НЕ трогает `premium_celebration_state.ts` — ни
`markCelebrationPending`, ни `consumeCelebration`. Реальная очередь празднования
живёт на Главной и остаётся нетронутой.

## Security and privacy

Не применимо: изменение видно только в DEV-сборке (DEV-хаб закрыт
`DevHubSheetGate`), новых данных не собирается, сеть не вызывается, PII не
затрагивается, entitlements (`isPremium`/`isPro`) не изменяются — модалка
читает только палитру и текст.

## Technical debt

- Pay now: сторож `tests/dev_hub_contract.test.ts` обновляется в том же
  коммите — список секций в нём задан точным `toEqual`, расхождение = красная
  сборка.
- Accept temporarily: анимация продолжает существовать в двух точках входа
  (DEV-хаб и витрина движения). Дубля кода нет — оба монтируют один и тот же
  компонент, поэтому расхождение невозможно; удаление входа из витрины не
  просили.

## Verification

- `npx jest tests/dev_hub_contract.test.ts --runInBand --watchman=false` — зелёный.
- Проверка типов точечно по двум затронутым файлам.
- Ручной путь: Главная → колба (DEV) → первая секция «Празднование покупки» →
  «Plus» → анимация проигрывается целиком → закрытие возвращает DEV-хаб →
  «Pro» → синяя палитра.
- Проверка невмешательства: после показа превью реальное празднование на
  Главной не появляется (pending-флаг не выставлялся).

## Rollback

Удалить секцию из `DEV_TOOL_SECTIONS`, вариант `'celebration'` из
`PreviewState` и соответствующую строку из сторожа. Данных пользователя
изменение не касается — откат безопасен в любой момент.
