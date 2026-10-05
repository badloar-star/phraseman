# Task packet: packs-simple-004 — набор сообщества открывается сразу по тапу (а)+(б)

Governance-ID: TG-E56F516E7D0C
Status: In progress (решено по рекомендации: владелец 11:10 «все решения — рекомендуемые», координатор: «(а)+(б) —
делай сразу, не жди цифр»; защита от двойного тапа обязательна)
Owner: сессия 1 · ЯДРО

## Outcome

(а) Чтение карточек набора (fetchCommunityPackCards) в staging получает потолок 8 с на попытку — повисший .get() больше
не держит открытие минутами (3 попытки × без потолка ≈ 138 с).
(б) Тап по набору сразу переходит на экран коллекции: подготовка карточек (с тихими повторами) запускается без
ожидания и регистрируется в реестре открытий (startCommunityPackOpen); повторный тап по той же строке получает тот же
промис — второго staging нет. Экран берёт мету строки (staged meta уже есть) и ждёт промис открытия: в просмотре —
скелет карточек; пусто после всех попыток → прежний тост «набор не загрузился» и назад.

## Scope

app/community_packs/staging.ts (потолок 8 с), app/community_packs/stage_with_retry.ts (реестр открытий),
app/flashcards/useCollectionData.ts (ожидание открытия, состояние pending/failed), app/flashcards_collection.tsx
(скелет/выход при отказе), app/flashcards/CommunityPackPreview.tsx (скелет карточек), места открытия просмотра (preview=1): FlashcardsHubScreen, FlashcardsCategoryHub.
flashcards_training_setup не тронут: его сторож фиксирует бизнес-логику хэшем — отдельная задача; свои наборы
(flashcards_my_packs, openOwnedPack) открываются из памяти и не менялись.

## Architecture

Реестр промисов открытия в памяти процесса (ключ набор+язык); экран коллекции — единственный потребитель.

## Security and privacy

Не затрагивает; доступ к набору проверяет тот же usePackDeeplinkGuard.

## Technical debt

Цифры Сверки ([PACK-OPEN], [FC-PACK-OPEN], [FC-PREVIEW]) подтвердят выигрыш после сборки.

## Verification

Синтаксис; тест реестра (двойной тап, отказ); сторожа коллекции/хаба/наборов; Сверка packs-simple-004.

## Rollback

git revert коммита.
