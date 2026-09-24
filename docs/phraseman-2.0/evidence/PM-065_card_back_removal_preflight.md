# PM-065 — Удалить рубашки и цвета наборов: preflight (2026-09-24)

Модель: Sonnet 5. Статус: **АУДИТ БЕЗ ПРАВОК** — риск/масштаб не укладывается в
экономный режим этой сессии (без субагентов, без typecheck, ≤10 прогонов тестов).

## Что уже сделано раньше (не дублировать)

Ничего. PM-099 «Удалить выбор оформления при создании» — тот же скоуп по факту
(«убрать выбор рубашек и цвета при создании»), статус в `tasks.json` — `planned`,
в `worklog.jsonl` записи о выполнении НЕТ. Задача НЕ закрыта предыдущей сессией.

## Где живёт реальный выбор оформления при создании

`app/community_pack_create.tsx` (1692 строки) — экран создания/редактирования
пользовательского набора карточек (Community Packs). Содержит ДВА живых пикера:
- **рубашка** (`UGC_CARD_BACK_IDS`, 30 вариантов, `cardBackIdx`/`cardBackKey`,
  рендер `cardBackPickerPanel`/`cardBackThumbRow`, строки ~1408–1490);
- **тема оформления карточек** (`UGC_CARD_THEME_IDS`, `themeIdx`/`themeKey`,
  `ugcCardChrome`, строки ~1330–1410).

Оба поля (`cardBackKey`, `cardThemeKey`) уходят в payload публикации
(`CommunityPackSubmissionPayload`, `community_packs/schema.ts`) и в Firestore.

## Почему не тронуто в этой сессии

`git grep` по `cardBackImageForPack|cardBackFanImageForPack|ugcCardBackKey|
cardThemeKey|ugcCardChrome` даёт 18 файлов, включая **серверный**
`functions/src/community_packs.ts` (и его skaffold-копии в `functions/lib_*_tmp/`):

```
app/community_pack_create.tsx
app/community_packs/communityFirestore.ts
app/community_packs/communityOwnedStorage.ts
app/community_packs/communityPackActions.ts
app/community_packs/localAuthorPacks.ts
app/community_packs/publishLocalPack.ts
app/community_packs/purchaseCommunityPack.ts
app/community_packs/schema.ts
app/community_packs/ugcCardThemePresets.ts
app/flashcards/FlashcardsCategoryHub.tsx
app/flashcards/cardBackCatalog.ts
app/flashcards/cardPackPaywallTheme.ts
app/flashcards/deck_options.ts
app/flashcards/marketplace.ts
app/flashcards/packMarketplaceIcons.ts
app/flashcards/useCollectionData.ts
app/flashcards_my_packs.tsx
functions/src/community_packs.ts
```

Это не «убрать contols в одном экране» — это поле Firestore-схемы, читаемое
маркетплейсом/каталогом/покупкой набора на клиенте И на сервере. Безопасное
удаление требует:
1. решить, что показывать ВМЕСТО рубашки/темы на уже опубликованных наборах
   (единый полупрозрачный цвет — воля владельца, но нужна миграция значения
   по умолчанию, а не просто скрытие контрола — иначе старые паки могут
   отрисоваться пусто);
2. проверить `functions/src/community_packs.ts` — не валидирует/не требует ли
   он `cardBackKey`/`cardThemeKey` как обязательные поля схемы (если да — снятие
   контрола в клиенте сломает публикацию новых паков без синхронной серверной
   правки — ровно тот класс бага, который CLAUDE.md требует ловить каскадом
   рисков);
3. `PM-099-A2` прямо требует «старый набор редактируется без ошибки схемы» —
   то есть нужна проверка обратной совместимости, а не только вырезание UI.

Это S1/L1-профиль работы по табличке моделей программы (функциональный срез,
несколько связей, PM-065 сама размечена как `gpt-6-luna high`/L1), но фактический
охват (Firestore-схема + сервер + 18 файлов) ближе к S1-с-эскалацией. В
экономном режиме без typecheck и без права на субагентов брать это в работу
неосторожно — конкретно риск «не заметить серверную валидацию» совпадает с
классом инцидентов из CLAUDE.md («удалил модуль — потребители остались
незакоммиченными», «tsc падал по памяти — выглядело как ноль ошибок»).

## Рекомендация

Оставить PM-065/PM-099 как есть до отдельной сессии с бюджетом на:
typecheck по `functions/` и `app/`, чтение `functions/src/community_packs.ts`
целиком, решение по дефолтному значению для уже опубликованных паков, и,
возможно, серверную миграцию поля. Открытые gates (`DESIGN_APPROVED_FOR_
VISIBLE_CHANGES`, `MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE`)
не закрывались — решение по ним не моё.
