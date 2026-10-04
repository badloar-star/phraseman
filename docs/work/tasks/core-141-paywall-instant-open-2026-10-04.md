# Task packet: §141 — окно Plus открывается сразу по последнему известному доступу

Governance-ID: TG-CC55A80B9290
Status: Done
Owner: Ядро (аудит «мгновенное открытие», INBOX §141; правило владельца b7b843867)

## Outcome
`premium_modal` ждал `accessResolved` и до этого показывал пустой градиент. Теперь, пока доступ уточняется, решение берётся из последнего известного статуса (синхронный снимок профиля `getAppSnapshot().profile`): точно бесплатный — окно показывается сразу; Plus/VIP или статус неизвестен — прежнее ожидание (платному окно покупки не мелькает). Когда живой статус придёт и окажется Plus — окно закрывается тем же штатным путём (`dismiss`).

## Scope
- app/paywall_entry_contract.ts: `resolvePremiumModalEntry` принимает `cachedEntitlement: 'free' | 'premium' | 'unknown'` (необязательно; по умолчанию 'unknown' = прежнее поведение).
- app/premium_modal.tsx: считает `cachedEntitlement` из снимка; лог [PAYWALL] при показе по кэшу.
- tests/paywall_entry_contract.test.ts: кэш «free» → show до accessResolved; «premium»/«unknown» → wait.

## Architecture
Снимок профиля уже засевает `isPremium` в PremiumContext (B1), источник тот же. Мигание «Free → Plus» возможно только при устаревшем снимке (человек купил Plus на другом устройстве) — тогда окно закроется по живому статусу; это реже и безопаснее, чем пустой экран у всех.

## Security and privacy
Доступ к платным функциям не меняется — только показ окна покупки. Данные не собираются.

## Technical debt
Цены окна по-прежнему догружаются с диска после показа (hydratePaywallPriceCache) — прогрев на старте отдельной задачей.

## Verification
Тест контракта входа; сторожа пейвола; проверка типов по файлам.

## Rollback
Откат коммита.
