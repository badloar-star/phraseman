# Task packet: блоки Настроек шире по ширине экрана

Governance-ID: TG-B22250589446
Status: In progress
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
