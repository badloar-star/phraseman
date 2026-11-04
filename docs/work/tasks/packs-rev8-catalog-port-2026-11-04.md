# Перенос экранов наборов rev8 (Codex) в основную ветку

Governance-ID: TG-2AAE5416AB58
Status: In progress · «3 · МАКЕТЫ», заказ координатора 04.11 (владелец утвердил «вот эти да»).

## Outcome
Три списка «Из видео», «Сообщество», «Мои наборы» и вкладка «Наборы» — компактные горизонтальные строки (название + количество), «+» в Сообществе и «Мои наборы».
## Scope
components/packs/PackRow.tsx, app/flashcards/{FlashcardsCategoryHub,MyPacksV2,VideoPackRow}.tsx, app/flashcards_{packs,video_packs}.tsx, 2 теста. Без ранговой блокировки и чужих правок патча.
## Architecture
Одна общая строка PackCatalogRow; данные — реальные поля наборов; логика открытия/добавления/жалоб не меняется.
## Security and privacy
Новых данных нет.
## Technical debt
Старые PackDeck-плитки остаются в PackRow.tsx для других экранов.
## Verification
Тесты pack_row_shared_contract и flashcards_rev8_catalog_contract, проверка типов, babel-разбор, кадр Сверки.
## Rollback
git revert коммита.
