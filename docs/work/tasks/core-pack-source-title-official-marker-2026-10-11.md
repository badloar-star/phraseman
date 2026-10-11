# Task packet: наборы из видео — название без «.docx» у источника и признак официального набора

Governance-ID: TG-363B364D997B
Status: In progress
Owner: сессия «1 · Ядро» (координатор 14:10)
Related: OWNER_REQUESTS_LEDGER.md строки 4, 5; пакет показа `packs-author-title-row-height-2026-10-11.md` (сессия «Авторизация»)

## Outcome
1. Набор ролика (`community_packs/{videoPackId}`) собирается на сервере (`buildVideoPackDoc`, `functions/src/video_phrases.ts`)
   с названием из `sourceName`, а `sourceName` в админке = имя загруженного файла. Отсюда «Английский по-человечески — 500 фраз.docx».
   Сервер теперь чистит хвост файла (расширение, «(1)», «копия/copy») перед записью `title*`, `videoTitle`, `origin.sourceTitle`.
2. Уже записанные наборы чистятся при чтении в маппере каталога (`mapCommunityPackDocToMarket`) — ноль записей и ноль
   лишних чтений; при следующей публикации фраз ролика сервер перезапишет документ уже чистым.
3. Признак официального набора — из данных, не угадан: сервер пишет `authorStableId: "video:<videoId>"` ВМЕСТЕ с `videoId`,
   создавать документы `community_packs` может только сервер (`allow create, delete: if false`). Вынесено в
   `app/community_packs/official_pack_marker.ts`. Показ «Professor Lingman» подключает сессия «Авторизация» (их пакет).

## Scope
In: `functions/src/video_phrases.ts` (вызов чистки), новый `functions/src/pack_source_title.ts`, новый
`app/community_packs/pack_source_title.ts`, новый `app/community_packs/official_pack_marker.ts`, маппер
`app/community_packs/communityFirestore.ts` (только названия), тесты на обе чистки и на признак.
Out: показ автора и строк (`packAuthorNames.ts`, общий `PackRow`) — сессия «Авторизация»; деплой функций — владелец.

## Architecture
Чистка — одна чистая функция в двух пакетах (клиент и functions не делят код); тесты гоняют одинаковый набор случаев,
чтобы поведение не разъехалось. Сервер — источник истины для новых записей; маппер — страховка для старых документов,
не требующая миграции и записей в прод. Признак официального набора — строгий: префикс `video:` И совпадение хвоста
с полем `videoId` формата YouTube; пользовательский stableId такого вида получить не может (создание — только сервером).

## Security and privacy
Новых данных нет. Официальность по нику не определяется (ник может выбрать любой) — только по полю, которое пишет сервер.

## Technical debt
- Pay now: название из имени файла попадало в витрину; набор ролика показывался с подписью «Автор сообщества» и тратил
  чтение `public_profiles/video:*`, которого не бывает.
- Contain: в версии фраз (`video_phrase_sets/*/versions/*`) `sourceName` остаётся именем файла — это служебная пометка
  админки, людям не показывается.

## Verification
Юнит-тесты чистки (клиент и functions, одинаковые случаи), тест признака, проверка маппера; точечный typecheck.
Деплой `adminPublishVideoPhrases`/`adminRepublishVideoPacks` — шаг владельца (DEPLOY_NOW).

## Rollback
Отдельный коммит; `git revert`. Маппер без чистки показывает прежнее название — данные не меняются.
