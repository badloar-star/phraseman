# Статический проход по текстам вне переводов — зона Дизайна (13.10.2026)

Поручение координатора: найти видимые тексты, которые не идут через переводы, поставить сторож с храповиком, исправить то, что можно исправить сразу (только когда переводы есть на все 9 языков), остальное — список Ядру на тексты.

## Сторож

- Сканер: `scripts/scan_i18n_design_zone.mjs` (режимы: проверка / `--report` / `--update` / `--json`).
- База-потолок: `config/i18n-design-zone-baseline.json` — число находок по файлам; **растёт — тест падает**, падает — обновить базой (`--update`).
- Тест: `tests/i18n_design_zone_ratchet.test.mjs` (запуск: `node --test tests/i18n_design_zone_ratchet.test.mjs`).
- Охват храповика (уточнение координатора 13.10): **весь app/ и components/** — чужие зоны тоже не должны расти. Чинит каждая сессия ТОЛЬКО свою зону; зона Дизайна — 42 файла (Карточки, Диалоги-клиент, Видео, Главная, пейволы-вид). `--report` показывает зону Дизайна, `--report --all` — всё приложение с пометкой `[чужая зона]`. Пропуск: тесты, dev-файлы, системные кадры, учебный контент уроков (`lesson_data_*`, `lesson_intro_screens*`, `lesson_help_theory_data`, `error_traps`) и словарь `LangContext` — это тексты курса и сам словарь переводов, не строки интерфейса.
- Два класса: **INCOMPLETE** — языковой объект внутри переводного вызова, где нет части из 9 языков; **LITERAL** — русский/украинский литерал вне переводчика.
- Не считается находкой: языковые объекты с ≥2 языками, позиционные переводчики (`L/T/tri/triLang/pickTri*`), вызовы журнала, таблицы `*_RU/*_UK`, ветки `lang === 'ru'|'uk'`, функции-диспетчеры (≥8 из 9 проверок `lang === …`), соседство латинского текста.

Итог на 13.10: зона Дизайна — **LITERAL 106, INCOMPLETE 47**; всё приложение (потолок храповика) — **LITERAL 1321, INCOMPLETE 56** (чужие зоны: 1215 и 9; крупнее всего `diagnostic_test.tsx` 176, `celebration_share_messages.ts` 72, `home_feature_tips.ts` 56, `ai_dialog_briefing_copy.ts` 53 — файлы чужих сессий, здесь не правятся). Список находок «Авторизации» ведёт она в своём документе.

## 1. Исправить сейчас — таких нет

Все видимые пользователю тексты, у которых есть переводы на 9 языков, уже идут через переводчик. Те, где переводов нет (47 ниже), закрывает только Ядро на тексты: без pt-BR/vi/id/tr/pl код подставлять нечем (правило «исправления только при 9 переводах»).

Пока перевода нет — переводчик падает на **en** (а не на русский), поэтому в неродном интерфейсе человек видит английский, а не пустоту. Это не поломка, а недоделка.

## 2. Ядру на тексты — 47 строк, не хватает pt-BR, vi, id, tr, pl

Во всех строках есть ru/uk/en/es (проверено сканером), нет 5 языков. Ниже — русская формулировка (обрезана до 60 знаков, полный текст в коде по ссылке).

### Диалоги — «Память диалогов» (`app/dialogue_v2_memory.tsx`, 21 строка, один экран)

| Место | ru |
|---|---|
| `app/dialogue_v2_memory.tsx:108` | Память диалогов |
| `app/dialogue_v2_memory.tsx:109` | Назад |
| `app/dialogue_v2_memory.tsx:110` | Здесь хранится только краткая учебная сводка и место продолж |
| `app/dialogue_v2_memory.tsx:118` | Память диалогов доступна в Plus |
| `app/dialogue_v2_memory.tsx:119` | Посмотреть Plus |
| `app/dialogue_v2_memory.tsx:120` | Для этого языка пока ничего не сохранено. |
| `app/dialogue_v2_memory.tsx:121` | Учебная сводка |
| `app/dialogue_v2_memory.tsx:122` | Получается хорошо |
| `app/dialogue_v2_memory.tsx:123` | На чём сосредоточиться |
| `app/dialogue_v2_memory.tsx:124` | Выполнено задач |
| `app/dialogue_v2_memory.tsx:125` | Продолжение диалогов |
| `app/dialogue_v2_memory.tsx:126` | Следующая задача |
| `app/dialogue_v2_memory.tsx:127` | Сохранённая задача |
| `app/dialogue_v2_memory.tsx:128` | Диалог |
| `app/dialogue_v2_memory.tsx:129` | Очистить память этого языка |
| `app/dialogue_v2_memory.tsx:130` | Даже без Plus ты можешь удалить всю сохранённую память выбра |
| `app/dialogue_v2_memory.tsx:138` | Очищаем… |
| `app/dialogue_v2_memory.tsx:139` | Не удалось очистить память. Попробуй ещё раз. |
| `app/dialogue_v2_memory.tsx:140` | Очистить память? |
| `app/dialogue_v2_memory.tsx:141` | Удалятся учебная сводка и прогресс всех диалогов только для  |
| `app/dialogue_v2_memory.tsx:142` | Отмена |

### Остальное (26 строк)

| Место | ru |
|---|---|
| `app/community_pack_create.tsx:924` | Набор сохранён на устройстве. Публикация не завершена — нажм |
| `app/community_packs/PackCommentsSheet.tsx:582` | Не удалось сохранить реакцию. Попробуй ещё раз. |
| `app/community_packs/PackCommentsSheet.tsx:609` | Не удалось скрыть отклик. Попробуй ещё раз. |
| `app/community_packs/PackCommentsSheet.tsx:634` | Не удалось удалить отклик. Попробуй ещё раз. |
| `app/community_packs/PackCommentsSheet.tsx:657` | Не удалось изменить закрепление. Попробуй ещё раз. |
| `app/flashcards/FlashcardsHubScreen.tsx:297` | Количество ещё не известно |
| `app/flashcards/PackVideoHero.tsx:63` | Видео сейчас не открывается. Карточки набора доступны как об |
| `app/flashcards/VideoPackRow.tsx:146` | Видео сейчас не открывается. Карточки набора доступны как об |
| `app/flashcards/VideoSetView.tsx:90` | Видео сейчас не открывается. Карточки набора доступны как об |
| `app/flashcards/useCollectionData.ts:838` | Открыт купленный DEV-набор в карточках. |
| `app/flashcards/useCollectionData.ts:907` | Набор ещё не открыт. Его можно открыть за монеты в магазине  |
| `app/flashcards/useCollectionData.ts:1025` | Не удалось удалить карточку. |
| `app/flashcards/useCollectionData.ts:1087` | Не удалось удалить выбранные карточки. |
| `app/flashcards/useCollectionData.ts:1162` | Не удалось вернуть карточку. |
| `app/flashcards_card_editor.tsx:478` | Карточка сохранена, но в набор не добавилась. |
| `app/flashcards_card_editor.tsx:491` | (ключ ru пуст/динамика) |
| `app/flashcards_card_editor.tsx:511` | Достигнут лимит своих карточек. Удали ненужные, чтобы добави |
| `app/flashcards_card_editor.tsx:519` | Не удалось сохранить карточку. |
| `app/flashcards_collection.tsx:950` | Не удалось открыть редактор. Выбор сохранён, попробуй ещё ра |
| `components/dialogs/DialogueV2CatalogueContainer.tsx:56` | Общение |
| `components/dialogs/DialogueV2CatalogueContainer.tsx:59` | Дела |
| `components/dialogs/DialogueV2CatalogueContainer.tsx:62` | Поездки |
| `components/dialogs/DialogueV2CatalogueContainer.tsx:65` | Каждый день |
| `components/dialogs/DialogueV2PlusTools.tsx:34` | Свободный разговор |
| `components/dialogs/DialogueV2PlusTools.tsx:38` | Практика без сценария |
| `components/dialogs/DialogueV2PlusTools.tsx:58` | Доступно в Plus. Откроется экран Plus. |

Сообщения об ошибках («Не удалось …») видны только при сбое; названия категорий диалогов и «Свободный разговор» — постоянно.

## 3. LITERAL (106) — классификация, правки не нужны

| Что | Где | Почему не дефект |
|---|---|---|
| Окончания числительных ru/uk («раз/раза», «час/часа», «фраза/фрази») | `paywall_personalization.ts`, `PaywallProofCards.tsx` | строки внутри языковой таблицы по языкам, не отдельный текст |
| Названия роликов канала | `lingman_youtube.ts` | контент канала на русском, не интерфейс |
| Положения жестов/событий («щипок-крупнее», «ползунок», «поиск-конец») | `useCardsScale.ts`, `CollectionGalleryView.tsx`, `CommunityPackPreview.tsx` | значения для журнала, пользователь не видит |
| Причины для журнала/ошибок («сеть», «правила: …», «до открытия окна магазина») | `packCommentsFirestore.ts`, `paywall_purchase*.ts`, `youtube_seek_controller.ts`, `VideoThumb.tsx`, `useDialogInputLayoutTrace.ts`, `dialogue_v2_authorized_catalogue_projection.ts` | трассировка (правило «сперва логи»), не интерфейс |
| Строки с 9 позиционными языками через `LP(...)` / `row(...)` (Закрыть/Год/Полный, страны голосов, «Сохранённые») | `PaywallPlusCopy.ts`, `PaywallBenefitComparison.tsx`, `voice_display_name.ts`, `constants.ts` | сканер видит русский аргумент; остальные 8 языков рядом — ложное срабатывание |
| Шаблон с переводчиком внутри строки | `CollectionHeader.tsx`, `flashcards_collection.tsx:1802` | `triLang` внутри `${…}`, ложное срабатывание |
| Одиночные буквы «е/і» | `fuzzy_match.ts`, `selectors.ts` | нормализация поиска, не текст |
| Заглушки dev-режима «(dev)», примеры диалогов | `dialogue_v2_*_client.ts` | dev-только, в стор-сборке не показываются |
| **Мёртвый код**: `FLASHCARD_STATUS_A11Y_LABEL` | `app/flashcards/cardStatus.ts` | нигде не используется; русские подписи состояний — кандидат на удаление или перевод, когда понадобится скринридеру |
| **Мёртвый код**: `buildSubscriptionDisclosureRu` | `app/paywall_trial_info.ts` | вызывается только тестом, боевой путь — `paywall_subscription_disclosure.ts` |
| «Без языка» (запасной вариант) | `pack_languages.ts` | боевой путь — `noPackLanguageLabel(lang)` на 9 языков |

## Как работать дальше

1. Ядро присылает 5 переводов на каждую строку из §2 → строки добавляются в объекты → `node scripts/scan_i18n_design_zone.mjs --update` (база уменьшается).
2. Новый видимый текст без 9 языков → тест роняется; добавить переводы или (если это журнал/контент) обосновать исключение в сканере.
3. Общий сторож `scripts/scan_untranslated_ui.mjs` (91 строка в базе) остаётся как есть — этот работает по зоне Дизайна подробнее.
