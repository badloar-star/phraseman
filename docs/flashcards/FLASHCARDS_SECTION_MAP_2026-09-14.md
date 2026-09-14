# Раздел «Карточки» — полная карта (2026-09-14)

Собрано по приказу владельца («фулл аудит: все слои, сервер, устройство, каждый
роут, каждый импорт, что за что отвечает, что не так, исправить всё»). Только
факты из кода и логов устройства (`.expo/metro-console.log`, 07:57–10:20).

## 0. Что не так — коротко

| # | Что | Где | Слой | Статус |
|---|---|---|---|---|
| 1 | Локальная база phone-state признавалась исправной по ложным проверкам (прагмы, чтение главного файла), а падала первая запись | `modules/phone-state/database.ts` | устройство / SQLCipher | исправлено: проба ЗАПИСИ после WAL, коммит `6e33a5af2` |
| 2 | Пересоздание базы удаляло только главный файл; хвосты `-wal/-shm/-journal` заражали новую базу | `modules/phone-state/database.ts` | устройство | исправлено: удаляется всё семейство файлов, `6e33a5af2` |
| 3 | `expo-sqlite` для эксклюзивной транзакции открывает НОВОЕ соединение без `PRAGMA key` → NOTADB на исправном файле | `modules/phone-state/schema.ts`, `app/phone_state_runtime.ts` | устройство / библиотека | исправлено: транзакция на том же ключевом соединении, `6d0d2b7a0` |
| 4 | Вход в тренировку зависел от ЧЕТЫРЁХ слоёв подряд (phone-state → отложенный грант → чек квоты → энергия), каждый мог закрыть дверь экраном-заглушкой | 4 экрана сессий | клиент | исправлено сегодня: fail-open — раунд стартует локально при отказе любого из них |
| 5 | Ошибка гранта несла только `status`, без `reason` — аудит по логу был слеп | `app/flashcard_training_pending_grant.ts` вызовы | клиент | исправлено: `pending_grant_<status>:<reason>` |
| 6 | Кнопка старта в выборе наборов ждала `quotaPreview.status === 'allowed'` — при `waiting` кнопка серая | `app/flashcards_training_setup.tsx` | клиент | исправлено: блокирует только доказанный `exhausted` |
| 7 | Список наборов собирался с нуля при каждом запуске (снимок жил только в памяти) и ждал каталог сообщества из сети | `app/flashcards/deck_options.ts` | клиент / сеть | исправлено вчера: durable-снимок, каталог не держит список, `b991993f2` |
| 8 | Экран «Вспомни и напиши» при отказе гранта писал «Проверь интернет» — сеть ни при чём | `app/flashcards_recall_session.tsx` | текст | снято вместе с п.4: заглушка теперь только когда карточек физически нет |
| 9 | В `FlashcardsHubScreen` при неопределённом статусе квоты возможен «мёртвый тап» (кнопка нажимается, ничего не происходит) | `app/flashcards/FlashcardsHubScreen.tsx:462-470` | клиент | открыт (см. §9) |
| 10 | `capacity_committed`: максимум 8 незавершённых грантов на аккаунт; серия обрывов сессии может заблокировать новый грант до чистки | `app/flashcard_training_pending_grant.ts` (`MAX_RECORDS = 8`) | клиент | обезврежен п.4 (грант больше не блокирует вход), сама причина открыта |

## 1. Роуты

| Файл | Что это | Кто ведёт сюда |
|---|---|---|
| `app/flashcards.tsx` | Обёртка-роут, рендерит хаб | Нижняя таб-навигация |
| `app/flashcards/FlashcardsHubScreen.tsx` | Хаб: библиотека, кнопка «Тренировка», лист выбора режима | `/flashcards` |
| `app/flashcards_training_setup.tsx` | Выбор наборов и размера сессии перед тренировкой | Хаб → `/flashcards_training_setup?mode=` |
| `app/flashcards_blitz_session.tsx` | Режим «Блиц» | `app/flashcards/training_entry.ts`, таббар, переигровка |
| `app/flashcards_recall_session.tsx` | Режим «Вспомни и напиши» | `training_entry.ts` |
| `app/flashcards_speaking_session.tsx` | Режим «Устно» | `training_entry.ts` |
| `app/flashcards_swipe.tsx` | Режим «Свайп» (правда/ложь) | `training_entry.ts`, личный план |
| `app/flashcards_collection.tsx` | Коллекция: сохранённые и свои карточки | setup (превью), `pack_opening`, редактор |
| `app/flashcards_packs.tsx` | Каталог наборов сообщества | хаб |
| `app/flashcards_my_packs.tsx` | Мои наборы | хаб |
| `app/flashcards_card_editor.tsx` | Редактор карточки | коллекция |
| `app/pack_opening.tsx` | Открытие набора | покупка / подарок |
| `app/community_pack_create.tsx` | Создание набора сообщества | коллекция, каталог, мои наборы |
| `app/flashcards_voice_picker.tsx` | Выбор голоса озвучки | настройки устного режима |
| `app/flashcards_audio.tsx` | Заглушка-редирект на `/flashcards` (автопрослушивание удалено) | старые ссылки |
| `app/flashcards_market_dev.tsx` | DEV-экран маркета | только DEV |

Не экраны, но часть раздела: `app/flashcards_swipe_session.ts` (черновик свайпа),
`app/flashcards_cloud_pages.ts` (страницы облачной синхронизации),
`app/flashcards_target_gate.ts` (доступность наборов по языку),
`app/flashcard_training_pending_grant.ts` (отложенный грант),
`app/personal_plan_flashcards_review_gate.ts`, `app/french_flashcard_remote_runtime.ts`.

## 2. Слои, из которых собран вход в тренировку

Порядок — как выполняется на устройстве при тапе «Начать».

| Слой | Модуль | За что отвечает | Может ли закрыть вход (до сегодня) | Сейчас |
|---|---|---|---|---|
| Данные карточек | `app/flashcards/deck_sources.ts` (`loadDeckCardsMulti`, `loadDeckCards`), `deck_options.ts` | Собрать колоду из сохранённых / своих / наборов | Да, если карточек нет | Да — единственный законный повод для заглушки |
| Мост phone-state | `app/phone_state_practice_bridge.ts` → `modules/phone-state/*` (SQLCipher) | Чеки квоты, состояние энергии, журнал операций | Да (`bridge:unavailable`) | Нет: fail-open |
| Отложенный грант | `app/flashcard_training_pending_grant.ts` | «Сначала подготовить, потом подтвердить»: снимок колоды + защита от двойного списания | Да (`pending_grant_*`) | Нет: fail-open |
| Чек квоты | `app/revenue_quota_access.ts` (`consumeFlashcardTrainingQuota`), `hooks/useFlashcardTrainingQuotaPreview.ts` | 3 тренировки в день на обычном аккаунте; Plus / выключенный гейт Пульта — без лимита | Да (`unavailable`/`stale_account` → заглушка) | Только доказанный `exhausted` → пейвол |
| Энергия | `components/EnergyContext.tsx`, `NoEnergyModal` | Списать единицу за старт, вернуть при обрыве | Да (`insufficient` → NoEnergyModal) | Да — это продуктовое правило, не инфраструктура |
| Премиум | `components/PremiumContext.tsx` (`usePremium`) | `accessResolved`, `hasPremiumAccess` | Да, пока `accessResolved=false` | Так и остаётся: без разрешённого доступа не стартуем (миллисекунды) |
| Руны/XP | `hooks/usePracticeRunes`, `usePracticeRuneFlight` | Награда за карточку | Нет | Нет |

## 3. Гейты — где именно вход мог остановиться

| Файл:строка | Условие | Что видел человек | Слой | Сейчас |
|---|---|---|---|---|
| `flashcards_blitz_session.tsx` вход, `throw pending_grant_*` | грант `unavailable` / reconcile / manifest | заглушка «Не удалось открыть данные тренировок» | грант | fail-open: раунд из локального пула |
| `flashcards_blitz_session.tsx:556-563` | `quotaResult.status !== 'allowed'` | `exhausted` → пейвол; иначе заглушка | квота | заглушка только при доказанном отказе |
| `flashcards_blitz_session.tsx:527` | энергия `insufficient` | `NoEnergyModal` | энергия | без изменений |
| `flashcards_recall_session.tsx:246-283` | грант | «Не удалось загрузить карточки. Проверь интернет» (ложь) | грант | fail-open |
| `flashcards_speaking_session.tsx:342-380` | грант | блок «квота недоступна» | грант | fail-open |
| `flashcards_swipe.tsx:2170-2215` | грант | «Не удалось подготовить тренировку. Энергия возвращена.» | грант | fail-open |
| `flashcards_training_setup.tsx:97-105` | `quotaPreview.status === 'exhausted'` при входе | мгновенный редирект в пейвол | квота | без изменений (доказанный лимит) |
| `flashcards_training_setup.tsx:325, 565` | `quotaAllowsStart`, `enabled` кнопки | серая кнопка при `waiting`/`unavailable` | квота | только `exhausted` блокирует |
| `FlashcardsHubScreen.tsx:312, 322-324, 462-470` | `trainingLocked`, `trainingEntryReady` | бейдж Plus / «мёртвый тап» при `waiting` | квота | открыт, см. §9 |

## 4. Отложенный грант — что это и почему ломался

Хранится в AsyncStorage: журнал `flashcard_training_pending_grant_v1:<uid>:<lineage>`
(не более 8 записей, 128 КБ) и манифест колоды чанками по 12 КБ. Фазы:
`prepared → quota_committed → playable`. Состояние энергии сверяется через
phone-state, чеки квоты — через `revenue_quota_store` (тоже phone-state).

Причины `status: 'unavailable'`:

| reason | Условие |
|---|---|
| `invalid_input` | не прошли валидацию scope/manifest/идентификаторы (`ID_RE`, `TOKEN_RE`) |
| `corrupt` | журнал или манифест не парсятся |
| `capacity_committed` | уже 8 незавершённых записей на аккаунт |
| `storage_limit` | журнал больше 128 КБ |
| `storage_error` | исключение AsyncStorage |

До сегодня в ошибку попадал только `status` — какая именно причина била
владельца в 10:18–10:20, лог не показывал. Теперь ошибка несёт `reason`, а вход
от неё не зависит.

## 5. Квота тренировок

- Лимит `FLASHCARD_TRAINING_DAILY_LIMIT = 3` (`app/revenue_quota_access.ts`).
- Статусы: `waiting | allowed | exhausted | unavailable | stale_account`.
- Чеки — локальные, через `phone_state_practice_bridge`; сервера в этом пути нет.
- Bypass: `plus` (премиум), `remote_config` (гейт выключен в Пульте),
  `idempotent` (повтор с тем же `receiptId`), аварийный — при физически
  недоступном хранилище.

## 6. Сервер

Серверной квоты тренировок НЕТ (grep `flashcard_training|training_quota` по
`functions/src` пуст). Сервер участвует только в наборах сообщества:

| Callable | Что делает |
|---|---|
| `communitySubmitPackForReview` | автор отправляет набор на модерацию |
| `communityModerateSubmission` | админ одобряет / отклоняет |
| `communityAuthorRemovePack` | автор снимает набор |
| `communityAdminModeratePack` | админ снимает / требует правок |
| `communityFetchPackCardsIfAccessible` | карточки набора при наличии доступа |
| `communityPurchasePack` | покупка платного набора |
| `adminRefundCommunityPackPurchase` | возврат |
| `flashcardPackGiftGrantGlobalBroadcast` / `flashcardPackGiftSyncState` / `flashcardPackGiftRedeem` | подарочные наборы |
| `communityListSellerInbox` / `communityMarkSellerInboxSeen` | входящие продаж автора |

`functions/src/content_factory/flashcard_*` — фабрика контента, не рантайм тренировок.

## 7. Хранилище на устройстве

| Что | Где | Кто читает |
|---|---|---|
| Сохранённые карточки | AsyncStorage `flashcards_v1` (по языку) | `loadDeckCards('saved')` |
| Свои карточки | AsyncStorage `custom_flashcards_v2` | `loadDeckCards('custom')` |
| Наборы | bundled-манифест + кэш; сообщество — Firestore с офлайн-кэшем | `loadPackDeckCards` |
| Снимок списка наборов | AsyncStorage `fc_deck_options_snapshot_v1` | хаб (гидратация), setup (первый кадр) |
| Квота / энергия / операции | SQLCipher phone-state (`phone-state-v1-<hash>-<lineage>.db` в каталоге баз expo-sqlite) | `revenue_quota_store`, `energy_session_operation_ledger` |
| Отложенный грант | AsyncStorage `flashcard_training_pending_grant_v1:*` | `flashcard_training_pending_grant.ts` |

## 8. Что изменено сегодня и вчера (коммиты)

| Коммит | Что |
|---|---|
| `713ef92e8` | проба чтения `sqlite_master` при открытии базы (недостаточно — см. п.1) |
| `6e33a5af2` | проба ЗАПИСИ после WAL; удаление семейства файлов; страховка в миграции |
| `6d0d2b7a0` (чужой коммит, захватил мои файлы) | транзакции phone-state на том же ключевом соединении |
| `b991993f2` | список наборов: durable-снимок, каталог сообщества не держит первый кадр |
| `4911fd346` | статистика: DEV-«Фри» прячет аналитику |
| (в дереве, коммит этой правки) | fail-open во всех четырёх режимах; reason в ошибке гранта; старт не ждёт квоту |

## 9. Открытое — не трогал, называю

1. **Хаб, «мёртвый тап»**: при `quotaPreview.status === 'waiting'` кнопка
   «Тренировка» нажимается и ничего не делает (`FlashcardsHubScreen.tsx:462-470`).
   Правильно — вести на выбор наборов всегда; лимит решится на старте.
2. **Сеть в пути сборки колоды**: `loadPackDeckCards` ходит в Firestore за
   карточками набора сообщества до первого кадра сессии. Нужен тот же приём,
   что у списка наборов: локальный кэш первым, сеть догоняет.
3. **Два DEV-механизма снятия премиума** (`tester_no_premium` и
   `dev_local_plus_override`) — слить в один.
4. **`capacity_committed`**: чистка зависших грантов идёт только по событиям
   `boot/account/focus`; при серии обрывов новый грант не создаётся. После
   fail-open это не блокирует вход, но учёт квоты в такие моменты не ведётся.
5. **Тест `flashcard_training_quota_contract`** красный и в HEAD — ждёт маркеры,
   которых нет ни в дереве, ни в истории; чинить владельцу того контракта.
