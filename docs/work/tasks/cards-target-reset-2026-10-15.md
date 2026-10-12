# Карточки: сброс списков при смене изучаемого языка (§AUTH-0110), useCollectionData

Governance-ID: TG-91604D462E5D
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора; файл Дизайна, хук useCollectionData)

## Outcome
После смены изучаемого языка без перезапуска хук не отдаёт сохранённые, свои и рыночные карточки, каталог наборов и списки купленных id старой цели: состояние возвращается к началу новой цели (кэш модуля уже сбрасывается по области), «готово» снимается до конца loadAll; лог [CARDS-TARGET] пишет было/стало.

## Scope
app/flashcards/useCollectionData.ts (один эффект по studyTarget). Остальное в хуке, loadAll и кэши не трогаю. Дизайн уведомлён в отчёте.

## Architecture
Эффект по studyTarget (кроме первого монтирования) сбрасывает savedCards, customCards, marketCards, marketPackCatalog (в зерно новой цели), ownedPackIdList, communityOwnedIdList и collectionDataReady=false (если нет ?pack=, остаётся логика хука). loadAll перезапускается существующим фокус-эффектом.

## Security and privacy
Данные чужой цели не остаются на экране.

## Technical debt
Пока loadAll не завершился, экран цели показывает скелетон/пустое состояние (collectionDataReady=false); моментального показа кэша новой цели в этом хуке нет — кэш модуля сбрасывается по области, и первый показ идёт после чтения хранилища цели.

## Verification
Тест источника, тесты Карточек, срез типов.

## Rollback
git revert коммита.
