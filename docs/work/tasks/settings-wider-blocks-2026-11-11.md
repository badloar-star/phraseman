# Task packet: блоки Настроек шире по ширине экрана

Governance-ID: TG-B22250589446
Status: Done (code); emulator evidence deferred
Owner: Claude (side session, 2026-11-11)
Related epic/enabler: none

## Outcome

Владелец: «В РАЗДЕЛЕ НАСТРОЙКИ БЛОКИ СДЕЛАЙ ШИРЕ ПО ШИРИНЕ ЭКРАНА». Карточки вкладки «Настройки»
идут почти во всю ширину экрана с тем же боковым полем, что у Главной (`V2.homePad` = 12 dp
вместо прежних 20 dp). Успех: на снимке эмулятора блоки шире на 16 dp, ничего не обрезано.

## Scope

In scope: `app/(tabs)/settings.tsx` — только `contentContainerStyle` корневого ScrollView
(paddingLeft/paddingRight 20 → `V2.homePad`).

Out of scope: общий токен `V2.screenPad` и поля других экранов; внутренние отступы карточек;
подэкраны настроек (`settings_*.tsx`).

## Architecture

No architecture change: меняется одна числовая константа отступа, теперь берётся из общего
токена `V2.homePad` вместо литерала. Safe-area insets по-прежнему прибавляются.

## Security and privacy

Не затрагивает данные, авторизацию, секреты — только вёрстка.

## Technical debt

Pay now: литерал `20` заменён токеном. Иных долгов не создаётся.

## Verification

- `npm run test:one -- tests/settings_root_liquid_glass_source_contract.test.mjs` и
  `tests/layout_stability_contract.test.ts` через светофор.
- Снимки эмулятора до/после вкладки «Настройки» (если эмулятор доступен).

## Rollback

Вернуть `20 + insets.left/right` в `contentContainerStyle` — одна строка, данных не касается.

## Итог и отложенное (2026-11-12, ночное дежурство)

Governance-ID (продолжение): TG-18CF30B29DB7

- Коммит 65c03e839: поле экрана 20 → V2.homePad (12), блоки шире на 16 dp.
- Строки-сообщения (`settings-message-slot-*`): обёртка −16 гасит собственное поле карточки +16
  (`SETTINGS_GROUP_MARGIN`) — карточка встаёт по полю 12, за край экрана не выходит.
- Снимок до/после ОТЛОЖЕН (безопасный выбор без владельца): на ПК свободно 1,1 ГБ, 222 процесса
  node, очередь светофора 19; оба эмулятора заняты другими сессиями (на 5554 открыт чужой урок) —
  переключать их на Настройки значит сорвать чужую работу. Снять утром: вкладка «Настройки»,
  до = родитель 65c03e839, после = 65c03e839.
- Уже красное на HEAD, не связано: тест «switch metrics» в settings_root_liquid_glass_source_contract
  ищет accessibilityRole="switch" в SettingsGlassRows, а она живёт в GlassSwitch.tsx.
