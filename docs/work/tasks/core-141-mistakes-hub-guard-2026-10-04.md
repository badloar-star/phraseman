# Task packet: §141 — сторож mistakes_hub_contract «daily limit and free short sessions» по смыслу

Governance-ID: TG-CC55A80B9290
Status: Done
Owner: Ядро (аудит «мгновенное открытие», INBOX §141)

## Outcome
Сторож падал: ждал строку `mistake_practice: 'gate_mistake_practice_premium'` в app/feature_gates.ts. В снимке 30.09 (efe19ae9d) премиум-доступ стал локальным контрактом (`PREMIUM_GATED`), а не флагом удалённого конфига; «Мои ошибки» в этом наборе остались — смысл «вне дневного лимита нужен Plus» сохранён, устарела только проверка текста. Теперь сторож проверяет поведение: `isFeaturePremiumGated('mistake_practice') === true` и `shouldGateFeature('mistake_practice', false) === true`, а Plus снимает замок.

## Scope
Только tests/mistakes_hub_contract.test.ts (одна проверка).

## Architecture
Код не меняется. Остальные проверки теста (дневной лимит 1, квота, энергия за короткую сессию, функция советов) без изменений.

## Security and privacy
Меняется только тест; данные пользователей и доступ не затрагиваются.

## Technical debt
Флаг `gate_mistake_practice_premium` в remote_flags.ts больше не управляет доступом (контракт локальный) — кандидат на уборку отдельной задачей.

## Verification
npm run test:one -- tests/mistakes_hub_contract.test.ts

## Rollback
Откат коммита.
