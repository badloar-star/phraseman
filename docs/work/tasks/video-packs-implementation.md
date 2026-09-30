# Task packet: реализация «Наборы из видео» — сквозная цепочка

Governance-ID: TG-AA5B729CBE33
Status: In progress
Owner: сессия Claude (владелец: badloar@gmail.com)
Related epic/enabler: реализация макетов из `video-packs-list-row-v2.md`

## Outcome

Макеты приняты. Владелец: «ВСЕ ПОДКЛЮЧАЙ УЖЕ НЕМЕДЛЕННО, ЗАТЕМ АУДИТ И ПРОВЕРКА
ЧТОБЫ ВСЕ РАБОТАЛО, ВСЕ ДОБАВЛЯЛОСЬ И НЕ БЫЛО БЛОКЕРОВ, СТОППЕРОВ И ТОГО ЧТО
ПРЕПЯТСТВУЕТ ЧТО-ЛИБО, ТРЕНИРОВКИ И ТД».

Наблюдаемый результат: человек открывает «Карточки» → видит строку «Из видео» →
открывает список → открывает набор → видит видео сверху → может тренироваться
БЕЗ добавления → может добавить себе → может лайкнуть → набор поднимается в топ.

Успех = сквозной путь работает без блокеров.

## Scope

**Решения владельца (получены вопросами, не угаданы):**
1. Набор из видео = ОБЫЧНЫЙ `community_packs` + поле `videoId`. Тогда лайки,
   добавление, тренировка, витрина и топ работают СРАЗУ — они уже написаны.
2. Набор создаётся АВТОМАТИЧЕСКИ при публикации фраз ролика.
3. Объяснение — шеврон внизу карточки, механизм уже есть у наборов за жемчуг
   (`cardHasDetails` → `FlashcardDetailsBody`).
4. Рубашка набора — СЛУЧАЙНАЯ из доступных в приложении (`UGC_CARD_BACK_IDS`).
5. Порядок: сначала вся цепочка до работающей, потом полировка и аудит.

In scope:
- `shared/video_phrases_contract.ts` / `app/flashcards/marketplace.ts` — поля
  `videoId`, `videoTitle`, `videoDurationSec`;
- `functions/src/video_phrases.ts` — создание набора при публикации;
- `app/flashcards/FlashcardsHubScreen.tsx` — четвёртая строка «Из видео»;
- новый экран списка `app/flashcards_video_packs.tsx`;
- `app/flashcards_collection.tsx` — блок видео сверху у набора с `videoId`;
- `firestore.rules` — доступ к новому полю;
- `firestore.indexes.json` — индекс `videoId + likesCount`.

Out of scope: Арена, Learning V2, MAX, App Check, админка вне вкладки «Видео».

## Architecture

**Текущая граница (прочитано, не по памяти):**
- `shared/video_phrases_contract.ts` — `VideoPhrase {id, ordinal, phrase,
  translation, explanation}`, `VideoPhraseVersion {status: draft|published|archived}`;
- `app/video_phrases_client.ts` — `fetchPublishedVideoPhrases(videoId)` читает
  `video_phrase_sets/{videoId}` → `versions/{activeVersion}`, `status === 'published'`;
- `app/flashcards/marketplace.ts` — `FlashcardMarketPack` (id, titleRu…, cardCount,
  likesCount, addedCount, isCommunityUgc, packLanguage, ugcCardBackKey, updatedAt);
- `app/community_packs/packSocial.ts` — `toggleLikeOptimistic`, `mergeServerCounts`
  (с защитой от гонок), `comparePacksBySocial`, `topLikedPackIds`;
- `app/flashcards_collection.tsx:223,867` — `?preview=1` открывает набор БЕЗ добавления;
- `app/flashcards/types.ts:119` — `cardHasDetails(card)` даёт шеврон подробностей;
- `app/flashcards/cardBackCatalog.ts:21` — `UGC_CARD_BACK_IDS`, 12+ рубашек,
  `normalizeUgcCardBackKey`.

**Намеченная граница:** набор из видео — тот же документ `community_packs` плюс
три поля. Ни одной копии механизма лайков/добавления/тренировки не создаётся.

**Ключевой риск, из-за которого выбран такой путь:** вторая копия социального
слоя повторила бы класс бага `project_pack_runes_go_to_author_2026-09-21`
(механизм написан, но только для одной валюты) и
`project_own_pack_missing_in_deck_picker_2026-09-22` (источников три, список
собирался из двух). Поэтому источник наборов остаётся ОДИН.

## Security and privacy

- Превью и плеер обращаются к `i.ytimg.com` / YouTube — **IP пользователя уходит
  к Google**. Это новая передача данных третьей стороне → **политику приватности
  надо обновить ДО релиза** (раздел о встроенном видео и YouTube как обработчике).
  Отмечено в 🔴-итоге.
- Лайк пишет `userId` в `pack_likes` — механизм существует, правила есть.
- Экран не показывает uid: у набора виден только автор/канал.
- Детских данных, микрофона, камеры, геолокации не добавляется.
- Правила Firestore: новые поля read-only для клиента, запись только из функции
  с `admin` claim.

## Technical debt

- **Pay now**: переиспользуются существующие `packSocial`, `?preview=1`,
  `cardHasDetails`, `cardBackCatalog` — ни одной второй копии.
- **Contain**: индекс `videoId + likesCount` обязан быть задеплоен ДО выката
  клиента. Exit condition: деплой индекса подтверждён. Иначе повторится
  `project_arena_index_not_deployed_2026-09-20` (полдня простоя на `INTERNAL`).
- **Accept temporarily**: озвучки у карточек из видео нет — TTS работает как у
  обычных UGC-наборов. Владелец: эта сессия. Пересмотр: после первого ролика.

## Verification

Тяжёлые проверки ЗАПРЕЩЕНЫ владельцем на этом ПК (прямое указание: «без джестов
и тяжёлых проверок вообще… все должно быть сделано быстро»). Ни тестовых
прогонов, ни полной проверки типов, ни сборок. Слот светофора не берётся.

Проверка — чтением кода и трассировкой пути:
1. Цепочка «фразы опубликованы → набор создан» прослежена по коду функции.
2. Набор из видео попадает в тот же список, что и обычные (один источник).
3. `?preview=1` открывает набор без добавления — путь не сломан.
4. Кнопка «Добавить» меняет вид мгновенно (оптимистично), с откатом.
5. Лайк доступен после добавления, счётчик мгновенный.
6. Каждый ранний `return` и `catch` в новом коде ЛОГИРУЕТ причину (правило
   владельца «сперва логи»): префикс `[VIDEO-PACK]`.
7. Проверка на блокеры: ни один новый `await` без таймаута, ни одного немого
   `catch {}`, ни одного экрана без выхода.

## Rollback

Клиентская часть гасится флагом: набор без `videoId` ведёт себя как обычный,
строка «Из видео» скрывается при пустом списке. Уже созданные наборы остаются
рабочими наборами карточек — даже при откате человек не теряет добавленное и
прогресс тренировок. Удаление поля `videoId` превращает набор в обычный без
потери карточек.
