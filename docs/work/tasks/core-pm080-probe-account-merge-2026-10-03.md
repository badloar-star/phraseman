# Task packet: PM-080 сторож — перенос монет при слиянии (8T) не новый источник

Governance-ID: TG-C7A2CFD1A2F5
Status: Done
Owner: Ядро; поручение координатора 03.10 («законный сдвиг, // зачем: 8T»)

## Outcome
`tests/pm080_coin_sources_allowlist.probe.ts` красный: 8T (750728284) добавил в журнал причины `account_merge_in` (grant) и `account_merge_out` (spend). Это перенос баланса между аккаунтами одного человека (сумма по системе 0), а не новый источник монет. Вносим обе в списки пробы и строку в ECONOMY.md «Не источники».

## Scope
tests/pm080_coin_sources_allowlist.probe.ts, docs/phraseman-2.0/docs/ECONOMY.md.

## Architecture
Без изменения кода; список утверждённых причин пополняется по решению координатора.

## Security and privacy
Нет изменений.

## Technical debt
Нет.

## Verification
Проба зелёная.

## Rollback
git revert.
