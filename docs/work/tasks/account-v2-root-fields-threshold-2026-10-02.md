# Task packet: Account V2 — порог переписи корневых полей 65 → 63 (законное удаление писателей)

Governance-ID: TG-0EE942625EE8
Status: Done
Owner: Claude session (Account V2); поручение координатора §72

## Outcome
`functions/src/accounts_v2_migration/root_fields_dry_run.test.ts` красный: ждёт ≥65 корневых полей, перепись даёт 63. Сравнение переписи на 282423672 (8A, 67 полей) и сейчас (63): ушли `videoWatchRuneCarryMsV1`, `videoWatchRuneSessionV1`, `videoWatchRunesDaily` (functions/src/video_watch_runes.ts — удалён 0e01d2b76, Q109, D78/PM-080) и `name`, `shards` (писались только тестовыми сидами tournament_*.emulator.test.ts — Арена/турниры удалены, D54/D74/D83; жемчуг удалён D70/D78). Добавилось `progressReseedAt` (8I). Удаления законные → порог = факт (63) + `// зачем:` со списком.

## Scope
Только порог и комментарий в root_fields_dry_run.test.ts.

## Architecture
Без изменений.

## Security and privacy
Без изменений.

## Technical debt
Нет.

## Verification
`root_fields_dry_run.test.ts` зелёный; сторож переписи 8A зелёный.

## Rollback
git revert.
