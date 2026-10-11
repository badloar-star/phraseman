# Task packet: немой catch в parseRestoreRecord (app/cloud_sync.ts) — причина в журнале

Governance-ID: TG-9B0529899F51
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10: «ДА, отдельным мелким коммитом»).

## Outcome
`parseRestoreRecord` глушил ошибку разбора JSON пустым `catch { return null; }` — испорченная запись восстановления
выглядела как «записи нет». Теперь лог `[RESTORE-MERGE] record:unparseable` с длиной строки и причиной (без содержимого).
Поведение прежнее: null.

## Scope
In: `app/cloud_sync.ts` (одна функция). Out: всё остальное.

## Architecture
Без изменений логики.

## Security and privacy
В лог — только длина и текст ошибки разбора, не содержимое (личные данные).

## Technical debt
В cloud_sync.ts могут оставаться другие пустые catch — разбирать по одному, отдельными мелкими коммитами.

## Verification
babel_check; сторож немых catch (если есть); срез типов.

## Rollback
`git revert`.
