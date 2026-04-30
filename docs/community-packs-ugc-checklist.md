# Community packs (UGC) — чеклист

## Жёсткое продуктовое правило (не обсуждается)

- [x] **Никакого вывода в фиат.** Осколки — только **внутриигровая валюта** Phraseman: покупки, награды, баланс в приложении. Нет обмена на деньги, банковские переводы, крипто и т.п.
- [x] Все суммы при продаже наборов — **только перераспределение осколков** между игроками (и опционально «сжигание»/удержание части осколков в пользу баланса игры — тоже **внутри** экономики приложения).

Порядок: сначала **контракт данных и сервер** (без этого клиент бессмысленен), затем **покупка и осколки**, **модерация**, **клиентские потоки**, **уведомления продавцу**, **политики и релиз**.

Легенда: `[x]` уже есть в проекте / готово · `[ ]` не сделано · подпункты — конкретные шаги.

---

## 1. Продукт и границы MVP

- [x] Зафиксировано: **без** кнопки «сохранить аккаунт по почте» на первом этапе (отдельная фича позже).
- [x] MVP-валюта: **только осколки внутри приложения** (см. блок «Жёсткое продуктовое правило» выше).
- [x] Утвердить MVP: **названия и описания набора RU + UK** (оба заголовка обязательны в форме; описания опциональны) — `community_pack_create.tsx`, схема `CommunityPackSubmissionPayload`.
- [x] Утвердить **внутриигровое** распределение: в CF задано `PLATFORM_FEE_BPS = 1500` (15 % с цены остаются в экономике приложения как сжигание), автор получает остальное **в осколках** — см. `functions/src/community_packs.ts` (при необходимости вынести в Remote Config).

---

## 2. Модель данных Firestore + индексы

- [x] Спроектировать коллекции (имена в коде: `app/community_packs/schema.ts`, запись из CF: `functions/src/community_packs.ts`):
  - [ ] `community_pack_drafts` — зарезервировано в rules, **запись с клиента пока запрещена**; следующий шаг — черновик + синк клиента.
  - [x] `community_pack_submissions` — очередь на модерацию (`status`, `authorStableId`, `payload`, `submittedAt`).
  - [x] `community_packs` — опубликованные (`listingStatus: 'published'`, цена, карты, рейтинг-поля, продажи).
  - [x] `community_pack_purchases` — факт покупки, idempotent-ключ `buyerStableId__packId`.
  - [ ] `community_pack_ratings` — только в rules/indexes заготовка; логика позже.
  - [x] `users/{stableId}/community_seller_inbox` — события продажи (`seen`, суммы); **чтение с клиента запрещено** — callable `communityListSellerInbox`.
- [x] Composite indexes: `community_packs` (listingStatus + publishedAt), `community_pack_submissions` (status + submittedAt) — `firestore.indexes.json`.
- [x] Идентификатор автора/покупателя в приложении уже опирается на **`stableId`** (`getCanonicalUserId` / `stable_id.ts`) — использовать его везде в UGC.

---

## 3. Правила безопасности Firestore

- [ ] Заменить текущую широкую модель `users/{userId} allow write: if request.auth != null` на поэтапное сужение **где затронуто UGC** (минимум: клиент не может править чужие черновики и чужой баланс).
- [x] Правила для `community_*`: каталог **чтение** только с аутентификацией; **запись с клиента запрещена**; submissions **чтение только admin**; подколлекция `community_seller_inbox` — read/write `false` для клиента.
- [x] Прямые правки `salesCount` / покупок / рейтингов с клиента запрещены (только CF с Admin SDK).

---

## 4. Cloud Functions (обязательный слой)

- [x] **Submit for review**: callable `communitySubmitPackForReview` — создаёт документ в `community_pack_submissions` со статусом `pending`.
- [x] **Approve / Reject**: callable `communityModerateSubmission` — `token.admin`, approve публикует в `community_packs` (id набора = id submission), reject с причиной.
- [x] **Purchase pack**: callable `communityPurchasePack` — транзакция: списание у покупателя, начисление автору (комиссия `PLATFORM_FEE_BPS`), покупка, inbox, `salesCount`. **Без фиата.**
- [ ] **Rate pack**: проверка «купил», одна оценка на покупателя, пересчёт агрегатов (`ratingAvg` / `ratingCount`).
- [x] **Inbox (read)**: callable `communityListSellerInbox` — список непрочитанных событий для автора.
- [x] **Inbox (mark seen)**: callable `communityMarkSellerInboxSeen` — после показа модалки.
- [ ] (Опционально позже) Антиспам: лимиты создания наборов в сутки с одного `stableId`.

---

## 5. Админка

- [x] Расширить **admin** (`admin/index.html` + claim):
  - [x] Вкладка **«Community наборы»**: список `community_pack_submissions` со статусом **pending** (Firestore query).
  - [x] Превью полного JSON заявки (раскрытие).
  - [x] Кнопка **«Копировать всё»** (JSON в буфер).
  - [x] Кнопки **Одобрить** / **Отклонить** → callable `communityModerateSubmission` (нужен Google-вход с `admin` claim).
- [x] Скрипт выдачи admin claim уже есть: `scripts/set_admin_claim.mjs`.
- [x] Hosting с обновлённой админкой: `firebase deploy --only hosting` (выполнено при выкладке вкладки Community).

---

## 6. Клиент: создание набора (мастер)

- [x] Новый маршрут/экран «Создать набор»: `app/community_pack_create.tsx`, `Stack.Screen` в `app/_layout.tsx`; CTA из хаба «Спільнота» и из пустого «Власні».
  - [ ] Онбординг-текст (свой набор, публикация, покупка за осколки, **осколки автору** — только внутри приложения).
  - [ ] Блок **«Правила»** (юмор + запреты) + чекбокс «прочитал» перед отправкой.
  - [x] Поля: **название RU+UK**, описание RU/UK (опц.), **цена**; валидация по `validateCommunityPackPayload` / лимиты в `community_packs/schema.ts`.
  - [x] Редактор карточек: старт **10** строк, до **50**, EN/RU (+ UK опц.); без удаления отдельной строки (можно дописать «очистить» позже).
  - [ ] Сохранение черновика в Firestore + локальный кэш при необходимости.
  - [x] Отправка на модерацию → callable `communitySubmitPackForReview` (регион `us-central1` в `functionsClient.ts`).
- [x] Пустой экран коллекции (`flashcards_collection.tsx`): кнопка **«+ Создать набор (UGC)»** / **«+ Створити набір (UGC)»** при `CLOUD_SYNC` и не Expo Go (рядом с «первая карточка»).

---

## 7. Клиент: хаб маркетплейса — вкладки «Мои» / «Сообщество»

- [x] UI сегмента **«Мої / Спільнота»** в `FlashcardsCategoryHub.tsx` (данные: `flashcards.tsx` — `loadPublishedCommunityMarketPacks`, `loadCommunityOwnedPackIds`, мета для купленных вне текущей выборки через `fetchCommunityPackMeta`). Включается при `CLOUD_SYNC` и не Expo Go.
  - [x] **Мої** — купленные официальные + купленные community; ниже секция **офіційний каталог** (некупленные бандлы). Черновики / «на проверке» для автора — **не в этом экране** (следующий шаг).
  - [x] **Спільнота** — сетка опубликованных наборов, paywall как у официальных; CTA «+ Создать набор». Рейтинг на плитке — когда будет §9.
- [x] Плитки категорий («Збережені», «Власні», …) без изменений; блок паков идёт ниже сегмента.

---

## 8. Клиент: покупка и открытие набора

- [x] Покупка за осколки через callable **`communityPurchasePack`**: ветка `pack.isCommunityUgc` в `cardPackShardPurchase.ts` → `purchaseCommunityPackWithShards` (`community_packs/purchaseCommunityPack.ts`), регион в `functionsClient.ts`.
- [x] После покупки: отдельный ключ **`community_owned_pack_ids_v1`** (`communityOwnedStorage.ts`), баланс `replaceShardsBalanceLocal`; в `flashcards_collection.tsx` `loadAll` мержит каталог + карты UGC и пишет built-cache с составным ключом официальные+community id.
- [x] Открытие: **`stageCommunityPackCardsForNavigation`** + `consumeStagedCommunityPackMarketCards` (`community_packs/staging.ts`); для бандлов по-прежнему `stageOwnedPackCardsForNavigation`.

---

## 9. Рейтинг 1–5

- [ ] UI звёзд только если `purchase` существует.
- [ ] Запись оценки → Function или защищённая запись с проверкой правил.
- [ ] Отображение среднего и числа оценок в каталоге и на карточке набора.

---

## 10. Уведомления автору (осколки + кто купил)

- [ ] При начислении: если приложение активно — **тост** (`action_toast`) и/или `shards_earned` с `reasonText` (после вызова `communityPurchasePack` клиент должен подтянуть баланс и эмитить события).
- [ ] При старте / возврате в foreground: вызывать **`communityListSellerInbox`**, модалка, затем **`communityMarkSellerInboxSeen`**.
- [x] Инфраструктура событий: `emitAppEvent`, `ShardsEarnedModal`, `GlobalShardsEarnedHost` — переиспользовать.
- [x] Бэкенд для списка/сброса «просмотрено»: callables `communityListSellerInbox`, `communityMarkSellerInboxSeen`.

---

## 11. Типы и манифест маркетплейса

- [x] В `FlashcardMarketPack` уже есть поля под рейтинг и автора (`marketplace.ts`) — **расширить** при необходимости под UGC (`authorStableId`, `status`, `packKind: 'official' | 'community'`).
- [x] Загрузка каталога community с Firestore + мерж в каталог коллекции и хаба: `communityFirestore.ts` (`loadPublishedCommunityMarketPacks`), мерж в `flashcards_collection` / `flashcards.tsx` (официальный манифест не заменяется).

---

## 12. Локализация и копирайт

- [ ] Все новые строки: **RU + UK** (как в остальном приложении).
- [ ] Тексты правил набора (юмор + юридически нейтральные формулировки).

---

## 13. Terms of Use и Privacy Policy

- [x] **Єдине джерело правди (EN):** `legal/terms_of_use_en.json` та `legal/privacy_policy_en.json` — їх імпортують `app/terms_screen.tsx` і `app/privacy_screen.tsx`. Публічні HTML у корені репо: **`npm run legal:sync`** → `terms.html` + `privacy.html` (той самий текст, що в застосунку).
- [ ] Юридична перевірка Knowly / локалізація повних RU+UK версій (зараз у застосунку — EN; RU/UK у `terms.html` лише короткі виклади).
- [ ] При суттєвих змінах — in-app повідомлення (за потреби).

---

## 14. Тестирование и релиз

- [ ] Unit / integration на критичные клиентские валидаторы (10–50 карт, цена).
- [ ] E2E smoke: создать черновик → submit (staging) → approve в админке → купить вторым пользователем → рейтинг.
- [ ] Feature flag / `CLOUD_SYNC` / internal tester gate для поэтапного включения.

---

## Уже в коде (опора, не закрывает UGC)

- [x] Осколки: локально + облако, лог, причина `card_pack` — `shards_system.ts`.
- [x] Стабильный id пользователя — `stable_id.ts`, `user_id_policy.ts`.
- [x] Синк прогресса и анонимный Firebase для правил — `cloud_sync.ts`.
- [x] Хаб плиток маркетплейса и paywall официальных паков — `FlashcardsCategoryHub`, `CardPackShardPaywallModal`, `cardPackShardPurchase.ts`.
- [x] Пустое состояние «Нет карточек» — `flashcards_collection.tsx` + строки в `flashcards/constants.ts`.

---

*Обновляй этот файл по мере работы: меняй `[ ]` на `[x]` в выполненных пунктах.*
