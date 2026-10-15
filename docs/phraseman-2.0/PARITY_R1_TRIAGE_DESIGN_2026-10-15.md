# PARITY-GATE r1: разбор нарушений зоны Дизайна (15.10, 233 строки)

Источник: `node scripts/visual_parity_gate.mjs --release=r1 --defer-triage --json` на HEAD 15.10 ~05:45 + реестр `docs/phraseman-2.0/registries/visual_parity.json`. Правило направления (координатор 15.10): где в коде у места есть «зачем … владелец» — правится ОБРАЗЕЦ (список Макетам); код правим только там, где решения владельца нет.

## Состав 233

| причина | строк | кто закрывает |
|---|---:|---|
| не снято (status_pending) | 126 | Сверка (кадры) |
| кадр старше кода (evidence_stale) | 52 | Сверка (пересъёмка) |
| расхождение (status_diff) | 49 | разбор ниже |
| нет времени кадра (shot_time_unknown) | 4 | Сверка |
| заблокировано (status_blocked) | 2 | разбор ниже |

## 51 строка diff/blocked — по файлам кода (крупные группы первыми)

### app/community_pack_create.tsx · app/community_packs/PackCreateGlassParts.tsx — 3
- `cards-065` (Создание набора — все состояния / Правка своего набора) — в коде не упомянуто
- `cards-066` (Создание набора — все состояния / Только для меня) — уже в коде
- `cards-071` (Создание набора — все состояния / Лимит 50 карточек) — уже в коде

### app/flashcards_collection.tsx · app/flashcards/PackHeaderV2.tsx · app/flashcards/CollectionHeaderV2.tsx · app/flashcards/CommunityPackPreview.tsx · app/community_packs/CommunityPackSocialBar.tsx — 3
- `cards-section-013` (Чужой — до добавления / Чужой — до добавления) — в коде не упомянуто
- `cards-section-014` (Чужой — добавлен, лайк / Чужой — добавлен, лайк) — уже в коде
- `cards-v2-016` (Набор открыт / Чужой — добавлен) — уже в коде

### app/flashcards_blitz_session.tsx — 3
- `cards-section-039` (Блиц / Блиц) — в коде не упомянуто
- `cards-v2-035` (Ответы / Блиц — верно) — в коде не упомянуто
- `cards-v2-036` (Ответы / Блиц — неверно) — в коде не упомянуто

### app/flashcards_recall_session.tsx — 3
- `cards-section-052` (Напиши — неверно / Напиши — неверно) — в коде не упомянуто
- `cards-v2-040` (Ответы / Напиши — неверно) — в коде не упомянуто
- `cards-v2-049` (Карточки · Вспомни и напиши / Вспомни и напиши — подсказка) — в коде не упомянуто

### app/community_packs/CommunityPackSocialBar.tsx — 2
- `cards-018` (Набор / До добавления · лайк раньше времени) — в коде не упомянуто
- `cards-019` (Набор / Добавлен · отклик) — в коде не упомянуто

### app/flashcards_card_editor.tsx · app/flashcards/CardsGlassKit.tsx — 2
- `cards-022` (Редактор карточки и создание набора / Правка · дубликат) — в коде не упомянуто
- `cards-064` (Редактор карточки — все состояния / Сохранено) — в коде не упомянуто

### app/community_packs/ReportCommentModal.tsx — 2
- `cards-057` (Отклик, лайк и жалобы / Жалоба на комментарий) — в коде не упомянуто
- `cards-058` (Отклик, лайк и жалобы / Жалоба на комментарий отправлена) — уже в коде

### app/manage_subscription.tsx — 2
- `profile-023` (Помощь и подписка / оверлей удержания · поддержка) — в коде не упомянуто
- `paywalls-025` (Управление действующим Plus / Поддержка или отмена) — в коде не упомянуто

### components/SoftContextualUpsellCard.tsx · app/lesson_complete.tsx — 2
- `paywalls-009` (Встроенные предложения Plus / Результат · первый урок) — уже в коде
- `paywalls-010` (Встроенные предложения Plus / Результат · три урока) — в коде не упомянуто

### app/flashcards_collection.tsx · app/flashcards/CollectionHeaderV2.tsx · app/flashcards/CollectionListView.tsx · app/flashcards/CollectionGalleryView.tsx · app/flashcards/FlashcardListItem.tsx · app/flashcards/SavedCollectionStates.tsx — 2
- `cards-v2-006` (Сохранённые — масштаб как в «Фото» / 2 колонки) — уже в коде
- `cards-v2-010` (Сохранённые — масштаб как в «Фото» / Удалено — вернуть) — уже в коде

### app/flashcards/CardsSessionResultV2.tsx — 2
- `cards-v2-051` (Карточки · Итог тренировки / Итог — «Хороший результат» (12 из 20), плашка баланса монет) — уже в коде
- `cards-v2-052` (Карточки · Итог тренировки / Итог — «Есть куда расти» (6 из 20), плашка баланса монет) — в коде не упомянуто

### app/flashcards/FlashcardsFilterDropdown.tsx — 2
- `cards-gap-023` (Карточки / Фильтр — выбрано «Все») — уже в коде
- `cards-gap-024` (Карточки / Фильтр — выбран «Урок 3») — в коде не упомянуто

### app/flashcards_my_packs.tsx · app/flashcards/MyPacksV2.tsx — 1
- `cards-046` (Мои наборы — остальные состояния / Поиск — ничего не найдено) — в коде не упомянуто

### app/community_packs/PackCommentsSheet.tsx — 1
- `cards-053` (Отклик, лайк и жалобы / Меню автора: закрепить / скрыть) — в коде не упомянуто

### components/ReportPackModal.tsx — 1
- `cards-059` (Отклик, лайк и жалобы / Жалоба на набор отправлена) — уже в коде

### app/flashcards/DeckPickerSheet.tsx · app/flashcards/TrainingSetupV2.tsx — 1
- `cards-079` (Подготовка тренировки — все состояния / Шторка выбора наборов (Устно)) — в коде не упомянуто

### app/ai_dialog_consent_gate.tsx — 1
- `dialogs-010` (B. Брифинг и вход / AI-диалоги выключены (гейт)) — уже в коде

### app/dialogue_v2_session.tsx — 1
- `dialogs-028` (C. Голосовой ввод / Нет доступа к микрофону · попытки кончились) — уже в коде

### app/dialogue_v2_session.tsx · components/dialogs/DialogueV2CatalogueContainer.tsx — 1
- `dialogs-033` (C. Ожидание и ошибки / Диалоги временно недоступны) — уже в коде

### app/account_details.tsx — 1
- `profile-002` (Профиль и основные настройки / данные аккаунта) — уже в коде

### components/AiLimitUpsellCard.tsx · app/ai_kill_switch_copy.ts — 1
- `paywalls-008` (Встроенные предложения Plus / Разбор ошибки · лимит ИИ) — уже в коде

### app/promo_code_entry.tsx — 1
- `overlays-campaigns-014` (Промокод онбординга / Промокод · отключён) — в коде не упомянуто

### app/flashcards/ExpandedCardV2.tsx · app/flashcards/PhraseCard.tsx · app/flashcards/FlashcardDetailsBody.tsx — 1
- `cards-section-016` (Своя карточка / Своя карточка) — в коде не упомянуто

### app/community_pack_create.tsx · app/community_packs/PackCreateGlassParts.tsx · app/community_packs/PackEditorV2.tsx · app/flashcards_card_editor.tsx · app/flashcards/CardsGlassKit.tsx — 1
- `cards-section-021` (Изменить набор / Изменить набор) — в коде не упомянуто

### app/flashcards_packs.tsx · components/ui/new/OfflineDataNotice.tsx — 1
- `cards-section-029` (Сейчас недоступно / Сейчас недоступно) — уже в коде

### app/flashcards_training_setup.tsx · app/flashcards/TrainingSetupV2.tsx · app/flashcards/DeckPickerSheet.tsx — 1
- `cards-section-056` (Лимит исчерпан (Free) / Лимит исчерпан (Free)) — уже в коде

### components/EnergyContext.tsx · components/NoEnergyModal.tsx — 1
- `energy-modes-015` (Два режима энергии · Режим А / Режим А · старт: −1 энергия) — в коде не упомянуто

### app/flashcards_speaking_session.tsx — 1
- `cards-v2-032` (Сессии / Устно) — в коде не упомянуто

### app/flashcards_card_editor.tsx — 1
- `cards-v2-046` (Карточки · Новая карточка / Лимит — свои карточки 50/50) — уже в коде

### components/spire/SpireWeekResultCard.tsx — 1
- `spire-gap-016` (Шпиль · Итог недели / Итог недели — остаёшься) — уже в коде

### components/spire/SpireHomeScreen.tsx — 1
- `spire-gap-022` (Шпиль · Главный / Главный — пилюля «бета») — в коде не упомянуто

### app/flashcards_voice_picker.tsx — 1
- `cards-gap-038` (Карточки / Голос озвучки — список пуст) — в коде не упомянуто

### app/paywall_purchase.ts — 1
- `paywall-gap-012` (Пейвол Plus / Тост — покупки восстановлены) — в коде не упомянуто

### app/(tabs)/settings.tsx · components/settings/SettingsMessageSlotCard.tsx — 1
- `settings-gap-007` (Настройки / Очистить кеш — чистим… + опрос до голосования) — уже в коде

### app/settings_notifications.tsx — 1
- `settings-gap-012` (Настройки / Уведомления — телефон не разрешает) — уже в коде

## Итог разбора 51 строки

1. **Уже исправлено в коде, нужна только пересъёмка (Сверка): 22** — в коде есть правка или dev-состояние с id строки: cards-058, cards-059, cards-066, cards-071, cards-gap-023, cards-section-014, cards-section-029, cards-section-056, cards-v2-006, cards-v2-010, cards-v2-016, cards-v2-046, cards-v2-051, dialogs-010, dialogs-028, dialogs-033, paywalls-008, paywalls-009, profile-002, settings-gap-007, settings-gap-012, spire-gap-016.
2. **Образец под решение владельца (Макетам): 6**
   - `spire-gap-016` — приказ владельца 01.10 + решение координатора 13.10 (components/EnergyBar.tsx:43): энергия в шапке Шпиля — образец привести к коду
   - `paywalls-009` — приказ владельца 11.10 (app/lesson_complete.tsx:760): карточка Plus на итоге; условие показа в коде, кадр снимать через dev_state?upsell=first_lesson|three_lessons
   - `paywalls-010` — то же, что paywalls-009 (три урока)
   - `dialogs-028` — владелец 12.10, п.81 (app/dev_dialog_state.ts:37): бейдж PLUS на микрофоне после исчерпания попыток
   - `cards-section-056` — D174 (координатор 13.10): пилюля «30/30» — код уже исправлен (35b049b62), образец верен
   - `cards-066` — №35 владельца (PackEditorV2.tsx:64): выбранный сегмент = заливка главной кнопки темы
3. **Кандидаты на правку кода (решения владельца нет, нужна проверка глазами на эмуляторе): 8**
   - `cards-gap-023` — меню фильтра в коде прописано top: 56 (FlashcardsFilterDropdown.tsx), в образце оно под шапкой справа от заголовка; перекрывает «поиск / + / ⋮»
   - `cards-gap-024` — то же меню в раскрытом состоянии; в образце три колонки карточек
   - `spire-gap-022` — Шпиль, главный: нет плашки энергии рядом с «i» и блока «Друзья на этой неделе» — сверить с решением владельца 01.10 об энергии в шапке
   - `cards-022` — редактор карточки: нет живого превью карточки над полями (образец №24)
   - `cards-section-029` — «Нет сети» в Карточках: нет чипа языка «EN ⌄» в шапке; лишняя строка «Продолжить создание набора» (dev none её уже гасит)
   - `cards-v2-051` — итог тренировки: монета медная, в образце серебристая (ранг монеты фикстуры)
   - `cards-v2-052` — то же, что cards-v2-051
   - `cards-section-013` — режим просмотра: 1 колонка вместо 2 (ползунок по умолчанию) — проверить значение по умолчанию
4. **Остальные (~21)** — не код: состояние, язык, клавиатура, скелет или прокрутка на кадре (Сверка); либо нужна dev-ссылка или подмена данных (Ядро): cards-053/057/058/059 (чужой набор + отклики, жалобы), cards-065/071, cards-079, paywall-gap-012, paywalls-008, overlays-campaigns-014.
