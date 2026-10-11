# Task packet: §126 п.7 — practice_runes: level_spin_star_operation_corrupt ×26 на 1.6.24 — сперва логи

Governance-ID: TG-94EA8E61CB15
Status: Logs first (no behaviour change)
Owner: Ядро

## Outcome
Шесть мест в app/level_spin_star_grants.ts, бросавших level_spin_star_operation_corrupt молча, пишут [RUNE-OP-CORRUPT] с участком (read_all / attempt_recovery / star_grant / practice_rune), причиной (json_parse / parse_failed / owner_mismatch / fingerprint_invalid), длиной записи и набором ключей/версией объекта. Ошибка и поведение те же.

## Scope
app/level_spin_star_grants.ts (только логи) + тест на причину.

## Architecture
Один модульный помощник runeOperationCorrupt(site, reason, value, raw): never.

## Security and privacy
Без uid и сумм: только имена ключей объекта, version/kind, длина строки.

## Technical debt
Восстановление (карантин битой операции вместо вечной ошибки) — после диагноза по логам.

## Verification
Тесты level_spin_star_grants / practice_runes, typecheck.

## Rollback
Откат коммита.
