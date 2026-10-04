# Сверка макетов с приложением — по КАЖДОМУ состоянию (30.09.2026)

Источник: все колонки .col на страницах макетов (index.html). Всего 758 состояний.
Статус: ✅ есть и на Liquid Glass · 🟠 есть, но на старой палитре или частично · ❌ в приложении нет / не нашёл · 🏠 Главная и хаб Карточек (утверждены владельцем) · ❔ не сверено. Сверка 30.09.2026 по исходникам (работающее дерево ветки feature/referral-roulette), без запуска приложения; хэш = последний коммит, трогавший файл, «+правки в дереве» = есть незакоммиченные изменения.


## cards.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | Хаб и выбор режима | Хаб · четыре раздела | 🏠 | `app/flashcards/FlashcardsHubScreen.tsx` (69d9ab1e9, +правки в дереве) — хаб Карточек утверждён владельцем |
| 2 | Хаб и выбор режима | Выбор режима · окно по центру | 🏠 | `app/flashcards/FlashcardsTrainingModeSheet.tsx` (0217c4a21, +правки в дереве) — окно режимов — часть утверждённого хаба |
| 3 | Хаб и выбор режима | Лимит тренировок исчерпан | 🏠 | `app/flashcards/FlashcardsHubScreen.tsx` (69d9ab1e9, +правки в дереве) — хаб Карточек утверждён владельцем |
| 4 | Хаб и выбор режима | Сообщество недоступно | 🏠 | `app/flashcards/SavedTopCommunityPacks.tsx` (392fa3408, +правки в дереве) — блок «Лучшее у сообщества» хаба утверждён |
| 5 | Сохранённые | Список | ✅ | `app/flashcards/CollectionListView.tsx` (0217c4a21, +правки в дереве); `app/flashcards/CollectionHeader.tsx` (6c02e4088, +правки в дереве); `app/flashcards/FlashcardListItem.tsx` (1896c797a, +правки в дереве) — liquidGlassTokens, сегмент/поиск/строки |
| 6 | Сохранённые | Карточка раскрыта · удаление свайпом · «Вернуть» | ✅ | `app/flashcards/CollectionListView.tsx` (0217c4a21, +правки в дереве); `app/flashcards/CollectionHeader.tsx` (6c02e4088, +правки в дереве); `app/flashcards/FlashcardListItem.tsx` (1896c797a, +правки в дереве) — liquidGlassTokens, сегмент/поиск/строки |
| 7 | Сохранённые | Режим выделения | ✅ | `app/flashcards/CollectionListView.tsx` (0217c4a21, +правки в дереве); `app/flashcards/CollectionHeader.tsx` (6c02e4088, +правки в дереве); `app/flashcards/FlashcardListItem.tsx` (1896c797a, +правки в дереве) — liquidGlassTokens, сегмент/поиск/строки |
| 8 | Сохранённые | Стопка | ✅ | `app/flashcards/CollectionDeckView.tsx`; `app/flashcards/PhraseCard.tsx` (не закоммичены) — стопка на токенах стекла: карточка с подписью EN/RU, «К списку ›», кнопки ‹ › |
| 9 | Сохранённые | Пусто | ✅ | `app/flashcards/SavedCollectionStates.tsx` (не закоммичен) — загрузка/пусто/ошибка на liquidGlassTokens |
| 10 | Сохранённые | Лимит free: первые 20 | ✅ | `app/flashcards/CollectionListView.tsx` (0217c4a21, +правки в дереве) — футер лимита на LG; в тексте 50 карточек, не 20 |
| 11 | Мои наборы | Мои наборы | ✅ | `app/flashcards_my_packs.tsx` (13c9f3012, +правки в дереве) — liquidGlassTokens, тосты, пусто, поиск |
| 12 | Мои наборы | Удаление набора | ✅ | `app/flashcards_my_packs.tsx` (13c9f3012, +правки в дереве); `components/ThemedConfirmModal.tsx` (96c32bb97, +правки в дереве) — удаление набора через ThemedConfirmModal |
| 13 | Мои наборы | Пусто | ✅ | `app/flashcards_my_packs.tsx` (13c9f3012, +правки в дереве) — liquidGlassTokens, тосты, пусто, поиск |
| 14 | Наборы сообщества | Каталог · «Новые» | ✅ | `app/flashcards_packs.tsx` (bfdc8e783, +правки в дереве); `app/flashcards/FlashcardsCategoryHub.tsx` (8d38d6733, +правки в дереве) — каталог на liquidGlassTokens |
| 15 | Наборы сообщества | Поиск · действия долгим нажатием | ✅ | `app/flashcards_packs.tsx` (bfdc8e783, +правки в дереве); `app/flashcards/FlashcardsCategoryHub.tsx` (8d38d6733, +правки в дереве) — каталог на liquidGlassTokens |
| 16 | Наборы сообщества | Пока нет публикаций | ✅ | `app/flashcards_packs.tsx` (bfdc8e783, +правки в дереве); `app/flashcards/FlashcardsCategoryHub.tsx` (8d38d6733, +правки в дереве) — каталог на liquidGlassTokens |
| 17 | Наборы сообщества | Поиск без совпадений | ✅ | `app/flashcards_packs.tsx` (bfdc8e783, +правки в дереве); `app/flashcards/FlashcardsCategoryHub.tsx` (8d38d6733, +правки в дереве) — каталог на liquidGlassTokens |
| 18 | Набор | До добавления · лайк раньше времени | ✅ | `app/community_packs/CommunityPackSocialBar.tsx` (не закоммичен) — соцбар screen/row на токенах стекла, «Добавить себе» → «В моих наборах» без зелёного; вариант tile (хаб) не тронут |
| 19 | Набор | Добавлен · отклик | ✅ | `app/community_packs/CommunityPackSocialBar.tsx` (не закоммичен) — соцбар screen/row на токенах стекла, «Добавить себе» → «В моих наборах» без зелёного; вариант tile (хаб) не тронут |
| 20 | Набор | Жалоба на набор | ✅ | `components/ReportPackModal.tsx` (816e59af2) — жалоба на набор на LG (816e59af2) |
| 21 | Редактор карточки и создание набора | Новая карточка | ✅ | `app/flashcards_card_editor.tsx` (не закоммичен); `app/flashcards/CardsGlassKit.tsx` (новый) — редактор на liquidGlassTokens: поля-плашки, закреплённая «Сохранить», скелет, 1px кромки |
| 22 | Редактор карточки и создание набора | Правка · дубликат | ✅ | `app/flashcards_card_editor.tsx` (не закоммичен); `app/flashcards/CardsGlassKit.tsx` (новый) — редактор на liquidGlassTokens: поля-плашки, закреплённая «Сохранить», скелет, 1px кромки |
| 23 | Редактор карточки и создание набора | Новый набор | ✅ | `app/community_pack_create.tsx` (не закоммичен); `app/community_packs/PackCreateGlassParts.tsx` (новый) — создание набора на LG: поля, переключатель, строки карточек с «⋯», меню шапки, окно лимита 50, «Сохранить» закреплена |
| 24 | Редактор карточки и создание набора | Новая карточка в наборе | ✅ | `app/community_pack_create.tsx` (не закоммичен); `app/community_packs/PackCreateGlassParts.tsx` (новый) — создание набора на LG: поля, переключатель, строки карточек с «⋯», меню шапки, окно лимита 50, «Сохранить» закреплена |
| 25 | Подготовка тренировки | Выбор наборов | ✅ | `app/flashcards/DeckPickerSheet.tsx` (378ac4081, +правки в дереве) — HybridSheetShell liquid-glass-opaque |
| 26 | Подготовка тренировки | Мало карточек для блица | ✅ | `app/flashcards_training_setup.tsx` (133173a91, +правки в дереве) — подготовка тренировки на LG, тексты состояний есть |
| 27 | Подготовка тренировки | Кнопка языка открыта | ✅ | `app/flashcards/PackLanguagePicker.tsx` (c9497a68e) — выбор языка набора на LG |
| 28 | Наборы из видео | Список | ✅ | `app/flashcards_video_packs.tsx` (8688eca0b); `app/flashcards/VideoPackRow.tsx` (35929e400) — «Наборы из видео» на LG (список/загрузка/ошибка/пусто) |
| 29 | Наборы из видео | Загрузка | ✅ | `app/flashcards_video_packs.tsx` (8688eca0b); `app/flashcards/VideoPackRow.tsx` (35929e400) — «Наборы из видео» на LG (список/загрузка/ошибка/пусто) |
| 30 | Наборы из видео | Ошибка | ✅ | `app/flashcards_video_packs.tsx` (8688eca0b); `app/flashcards/VideoPackRow.tsx` (35929e400) — «Наборы из видео» на LG (список/загрузка/ошибка/пусто) |
| 31 | Сохранённые — все окна и состояния | Загрузка | ✅ | `app/flashcards/SavedCollectionStates.tsx` (не закоммичен) — загрузка/пусто/ошибка на liquidGlassTokens |
| 32 | Сохранённые — все окна и состояния | Меню «⋯» | ✅ | `app/flashcards/CollectionHeader.tsx` (6c02e4088, +правки в дереве) — меню «⋯» на g.sheet/g.glassEdge |
| 33 | Сохранённые — все окна и состояния | Разовая подсказка | ✅ | `app/flashcards/CollectionListView.tsx` (0217c4a21, +правки в дереве) — разовая подсказка на LG |
| 34 | Сохранённые — все окна и состояния | Долгое нажатие → «Удалить» | ✅ | `app/flashcards/FlashcardListItem.tsx` (1896c797a, +правки в дереве) — долгое нажатие → «Удалить» |
| 35 | Сохранённые — все окна и состояния | Подтверждение массового удаления | ✅ | `app/flashcards_collection.tsx` (732e66267, +правки в дереве); `components/ThemedConfirmModal.tsx` (96c32bb97, +правки в дереве) — подтверждение через ThemedConfirmModal |
| 36 | Сохранённые — все окна и состояния | Мало для набора — «выбери ещё» | ✅ | `app/flashcards/CollectionListView.tsx` (0217c4a21, +правки в дереве) — «Выбери ещё N карточек» |
| 37 | Сохранённые — все окна и состояния | Стопка — обратная сторона (переворот) | ✅ | `app/flashcards/CollectionDeckView.tsx`; `app/flashcards/PhraseCard.tsx` (не закоммичены) — стопка на токенах стекла: карточка с подписью EN/RU, «К списку ›», кнопки ‹ › |
| 38 | Сохранённые — все окна и состояния | Поиск — ничего не найдено | ✅ | `app/flashcards/SavedCollectionStates.tsx` (не закоммичен) — загрузка/пусто/ошибка на liquidGlassTokens |
| 39 | Сохранённые — все окна и состояния | Ошибка загрузки | ✅ | `app/flashcards/SavedCollectionStates.tsx` (не закоммичен) — загрузка/пусто/ошибка на liquidGlassTokens |
| 40 | Свой набор и набор из видео | Мой набор — ещё не в сообществе | ✅ | `app/flashcards/CollectionHeader.tsx` (6c02e4088, +правки в дереве); `app/flashcards_collection.tsx` (732e66267, +правки в дереве) — «Отправить в сообщество» / «Править набор» на LG |
| 41 | Свой набор и набор из видео | Отправка в сообщество | ✅ | `app/flashcards/CollectionHeader.tsx` (6c02e4088, +правки в дереве); `app/flashcards_collection.tsx` (732e66267, +правки в дереве) — «Отправить в сообщество» / «Править набор» на LG |
| 42 | Свой набор и набор из видео | Мой опубликованный — «Править набор» | ✅ | `app/flashcards/CollectionHeader.tsx` (6c02e4088, +правки в дереве); `app/flashcards_collection.tsx` (732e66267, +правки в дереве) — «Отправить в сообщество» / «Править набор» на LG |
| 43 | Свой набор и набор из видео | Набор из видео — превью ролика | ✅ | `app/flashcards/PackVideoHero.tsx` (не закоммичен) — превью ролика на токенах стекла |
| 44 | Мои наборы — остальные состояния | Открытие набора · сеть упала | ✅ | `app/flashcards_my_packs.tsx` (13c9f3012, +правки в дереве) — liquidGlassTokens, тосты, пусто, поиск |
| 45 | Мои наборы — остальные состояния | Набор удалён | ✅ | `app/flashcards_my_packs.tsx` (13c9f3012, +правки в дереве) — liquidGlassTokens, тосты, пусто, поиск |
| 46 | Мои наборы — остальные состояния | Поиск — ничего не найдено | ✅ | `app/flashcards_my_packs.tsx` (13c9f3012, +правки в дереве) — liquidGlassTokens, тосты, пусто, поиск |
| 47 | Каталог — остальные состояния | Загрузка | ✅ | `app/flashcards_packs.tsx` (bfdc8e783, +правки в дереве); `app/flashcards/FlashcardsCategoryHub.tsx` (8d38d6733, +правки в дереве) — каталог на liquidGlassTokens |
| 48 | Каталог — остальные состояния | Каталог пуст | ✅ | `app/flashcards_packs.tsx` (bfdc8e783, +правки в дереве); `app/flashcards/FlashcardsCategoryHub.tsx` (8d38d6733, +правки в дереве) — каталог на liquidGlassTokens |
| 49 | Каталог — остальные состояния | Свой опубликованный — карандаш · «Топ» | ✅ | `app/flashcards_packs.tsx` (bfdc8e783, +правки в дереве); `app/flashcards/FlashcardsCategoryHub.tsx` (8d38d6733, +правки в дереве) — каталог на liquidGlassTokens |
| 50 | Отклик, лайк и жалобы | Лайк после добавления | ✅ | `app/community_packs/CommunityPackSocialBar.tsx` (не закоммичен) — соцбар screen/row на токенах стекла, «Добавить себе» → «В моих наборах» без зелёного; вариант tile (хаб) не тронут |
| 51 | Отклик, лайк и жалобы | Отклик пуст | ✅ | `app/community_packs/PackCommentsSheet.tsx` (816e59af2) — шторка комментариев на LG (816e59af2) |
| 52 | Отклик, лайк и жалобы | Набор не добавлен — писать нельзя | ✅ | `app/community_packs/PackCommentsSheet.tsx` (816e59af2) — шторка комментариев на LG (816e59af2) |
| 53 | Отклик, лайк и жалобы | Меню автора: закрепить / скрыть | ✅ | `app/community_packs/PackCommentsSheet.tsx` (816e59af2) — шторка комментариев на LG (816e59af2) |
| 54 | Отклик, лайк и жалобы | Меню своего: удалить | ✅ | `app/community_packs/PackCommentsSheet.tsx` (816e59af2) — шторка комментариев на LG (816e59af2) |
| 55 | Отклик, лайк и жалобы | Меню чужого: пожаловаться | ✅ | `app/community_packs/PackCommentsSheet.tsx` (816e59af2) — шторка комментариев на LG (816e59af2) |
| 56 | Отклик, лайк и жалобы | Отправляется · не отправлено | ✅ | `app/community_packs/PackCommentsSheet.tsx` (816e59af2) — шторка комментариев на LG (816e59af2) |
| 57 | Отклик, лайк и жалобы | Жалоба на комментарий | ✅ | `app/community_packs/ReportCommentModal.tsx` (816e59af2) — жалоба на комментарий на LG |
| 58 | Отклик, лайк и жалобы | Жалоба на комментарий отправлена | ✅ | `app/community_packs/ReportCommentModal.tsx` (816e59af2) — жалоба на комментарий на LG |
| 59 | Отклик, лайк и жалобы | Жалоба на набор отправлена | ✅ | `components/ReportPackModal.tsx` (816e59af2) — жалоба на набор на LG (816e59af2) |
| 60 | Редактор карточки — все состояния | Проверка Plus — скелет | ✅ | `app/flashcards_card_editor.tsx` (не закоммичен); `app/flashcards/CardsGlassKit.tsx` (новый) — редактор на liquidGlassTokens: поля-плашки, закреплённая «Сохранить», скелет, 1px кромки |
| 61 | Редактор карточки — все состояния | Новая · заметка раскрыта | ✅ | `app/flashcards_card_editor.tsx` (не закоммичен); `app/flashcards/CardsGlassKit.tsx` (новый) — редактор на liquidGlassTokens: поля-плашки, закреплённая «Сохранить», скелет, 1px кромки |
| 62 | Редактор карточки — все состояния | Не удалось сохранить | ✅ | `app/flashcards_card_editor.tsx` — экран на LG, но тост ошибки без кнопки «Повторить» (тост общий, действие не добавлено) | — [30.09 закрыто] тост ошибки с действием «Повторить»
| 63 | Редактор карточки — все состояния | Карточка не найдена | ✅ | `app/flashcards_card_editor.tsx` — форма на LG, но «Карточка не найдена» остаётся тостом + возврат назад, а не экраном с кнопкой «Назад» (навигацию не меняли) | — [30.09 закрыто] экран «Карточка не найдена» + «Назад» (CardsGlassStateBlock)
| 64 | Редактор карточки — все состояния | Сохранено | ✅ | `app/flashcards_card_editor.tsx` (не закоммичен); `app/flashcards/CardsGlassKit.tsx` (новый) — редактор на liquidGlassTokens: поля-плашки, закреплённая «Сохранить», скелет, 1px кромки |
| 65 | Создание набора — все состояния | Правка своего набора | ✅ | `app/community_pack_create.tsx` (не закоммичен); `app/community_packs/PackCreateGlassParts.tsx` (новый) — создание набора на LG: поля, переключатель, строки карточек с «⋯», меню шапки, окно лимита 50, «Сохранить» закреплена |
| 66 | Создание набора — все состояния | Только для меня | ✅ | `app/community_pack_create.tsx` (не закоммичен); `app/community_packs/PackCreateGlassParts.tsx` (новый) — создание набора на LG: поля, переключатель, строки карточек с «⋯», меню шапки, окно лимита 50, «Сохранить» закреплена |
| 67 | Создание набора — все состояния | Меню: черновик / ошибка | ✅ | `app/community_pack_create.tsx` (не закоммичен); `app/community_packs/PackCreateGlassParts.tsx` (новый) — создание набора на LG: поля, переключатель, строки карточек с «⋯», меню шапки, окно лимита 50, «Сохранить» закреплена |
| 68 | Создание набора — все состояния | Очистить черновик? | ✅ | `app/community_pack_create.tsx` (не закоммичен); `app/community_packs/PackCreateGlassParts.tsx` (новый) — создание набора на LG: поля, переключатель, строки карточек с «⋯», меню шапки, окно лимита 50, «Сохранить» закреплена |
| 69 | Создание набора — все состояния | Минимум 10 карточек | ✅ | `app/community_pack_create.tsx` (не закоммичен); `app/community_packs/PackCreateGlassParts.tsx` (новый) — создание набора на LG: поля, переключатель, строки карточек с «⋯», меню шапки, окно лимита 50, «Сохранить» закреплена |
| 70 | Создание набора — все состояния | Проверь поля | ✅ | `app/community_pack_create.tsx` (не закоммичен); `app/community_packs/PackCreateGlassParts.tsx` (новый) — создание набора на LG: поля, переключатель, строки карточек с «⋯», меню шапки, окно лимита 50, «Сохранить» закреплена |
| 71 | Создание набора — все состояния | Лимит 50 карточек | ✅ | `app/community_pack_create.tsx` (не закоммичен); `app/community_packs/PackCreateGlassParts.tsx` (новый) — создание набора на LG: поля, переключатель, строки карточек с «⋯», меню шапки, окно лимита 50, «Сохранить» закреплена |
| 72 | Создание набора — все состояния | Офлайн — сохранено на устройстве | ✅ | `app/community_pack_create.tsx` (не закоммичен); `app/community_packs/PackCreateGlassParts.tsx` (новый) — создание набора на LG: поля, переключатель, строки карточек с «⋯», меню шапки, окно лимита 50, «Сохранить» закреплена |
| 73 | Создание набора — все состояния | Набор сохранён | ✅ | `app/community_pack_create.tsx` (не закоммичен); `app/community_packs/PackCreateGlassParts.tsx` (новый) — создание набора на LG: поля, переключатель, строки карточек с «⋯», меню шапки, окно лимита 50, «Сохранить» закреплена |
| 74 | Создание набора — все состояния | Недоступен для правки | ✅ | `app/community_pack_create.tsx` (не закоммичен); `app/community_packs/PackCreateGlassParts.tsx` (новый) — создание набора на LG: поля, переключатель, строки карточек с «⋯», меню шапки, окно лимита 50, «Сохранить» закреплена |
| 75 | Подготовка тренировки — все состояния | Загрузка наборов | ✅ | `app/flashcards_training_setup.tsx` (133173a91, +правки в дереве) — подготовка тренировки на LG, тексты состояний есть |
| 76 | Подготовка тренировки — все состояния | Нет наборов | ✅ | `app/flashcards_training_setup.tsx` (133173a91, +правки в дереве) — подготовка тренировки на LG, тексты состояний есть |
| 77 | Подготовка тренировки — все состояния | Ошибка сети | ✅ | `app/flashcards_training_setup.tsx` (133173a91, +правки в дереве) — подготовка тренировки на LG, тексты состояний есть |
| 78 | Подготовка тренировки — все состояния | Режим недоступен | ✅ | `app/flashcards_training_setup.tsx` (133173a91, +правки в дереве) — подготовка тренировки на LG, тексты состояний есть |
| 79 | Подготовка тренировки — все состояния | Шторка выбора наборов (Устно) | ✅ | `app/flashcards/DeckPickerSheet.tsx` (378ac4081, +правки в дереве) — HybridSheetShell liquid-glass-opaque |
| 80 | Наборы из видео — остальные состояния | Пока пусто | ✅ | `app/flashcards_video_packs.tsx` (8688eca0b); `app/flashcards/VideoPackRow.tsx` (35929e400) — «Наборы из видео» на LG (список/загрузка/ошибка/пусто) |
| 81 | Наборы из видео — остальные состояния | Ничего не нашли | ✅ | `app/flashcards_video_packs.tsx` (8688eca0b); `app/flashcards/VideoPackRow.tsx` (35929e400) — «Наборы из видео» на LG (список/загрузка/ошибка/пусто) |
| 82 | Наборы из видео — остальные состояния | Открытие ролика · не открылся | ✅ | `app/flashcards_video_packs.tsx` (8688eca0b); `app/flashcards/VideoPackRow.tsx` (35929e400) — «Наборы из видео» на LG (список/загрузка/ошибка/пусто) |
| 83 | Хаб — загрузка | Лучшее у сообщества грузится | 🏠 | `app/flashcards/SavedTopCommunityPacks.tsx` (392fa3408, +правки в дереве) — блок «Лучшее у сообщества» хаба утверждён |

## practice.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | Блиц | Вопрос | ✅ | `app/flashcards_blitz_session.tsx` (e2d1ca674); `components/practice/PracticeChrome.tsx` (17fbb3d32); `components/practice/PracticeStates.tsx` (e2d1ca674) — Блиц: PracticeChrome + liquidGlassTokens (17fbb3d32, e2d1ca674) |
| 2 | Блиц | Верный ответ | ✅ | `app/flashcards_blitz_session.tsx` (e2d1ca674); `components/practice/PracticeChrome.tsx` (17fbb3d32); `components/practice/PracticeStates.tsx` (e2d1ca674) — Блиц: PracticeChrome + liquidGlassTokens (17fbb3d32, e2d1ca674) |
| 3 | Блиц | Неверный ответ | ✅ | `app/flashcards_blitz_session.tsx` (e2d1ca674); `components/practice/PracticeChrome.tsx` (17fbb3d32); `components/practice/PracticeStates.tsx` (e2d1ca674) — Блиц: PracticeChrome + liquidGlassTokens (17fbb3d32, e2d1ca674) |
| 4 | Блиц | Потеря сердца | ✅ | `app/flashcards_blitz_session.tsx` (e2d1ca674); `components/practice/PracticeChrome.tsx` (17fbb3d32); `components/practice/PracticeStates.tsx` (e2d1ca674) — Блиц: PracticeChrome + liquidGlassTokens (17fbb3d32, e2d1ca674) |
| 5 | Устно | Ожидание — «Зажми и говори» | ✅ | `app/flashcards_speaking_session.tsx` (e2d1ca674); `components/practice/PracticeChrome.tsx` (17fbb3d32) — Устно на LG-токенах; шапка/микрофон на устройстве не приняты |
| 6 | Устно | Идёт запись — «Слушаю…» | ✅ | `app/flashcards_speaking_session.tsx` (e2d1ca674); `components/practice/PracticeChrome.tsx` (17fbb3d32) — Устно на LG-токенах; шапка/микрофон на устройстве не приняты |
| 7 | Устно | Распознано верно | ✅ | `app/flashcards_speaking_session.tsx` (e2d1ca674); `components/practice/PracticeChrome.tsx` (17fbb3d32) — Устно на LG-токенах; шапка/микрофон на устройстве не приняты |
| 8 | Устно | Не так — «Ещё раз» | ✅ | `app/flashcards_speaking_session.tsx` (e2d1ca674); `components/practice/PracticeChrome.tsx` (17fbb3d32) — Устно на LG-токенах; шапка/микрофон на устройстве не приняты |
| 9 | Правда / ложь | Вопрос | ✅ | `app/flashcards_swipe.tsx` (e2d1ca674); `components/practice/PracticeChrome.tsx` (17fbb3d32) — «Правда/Ложь» в swipe-экране: swipeGlass, PracticeBackButton, вердикт |
| 10 | Правда / ложь | Ответил верно — «перевод совпадает» | ✅ | `app/flashcards_swipe.tsx` (e2d1ca674); `components/practice/PracticeChrome.tsx` (17fbb3d32) — «Правда/Ложь» в swipe-экране: swipeGlass, PracticeBackButton, вердикт |
| 11 | Правда / ложь | Ответил верно — «чужой перевод» | ✅ | `app/flashcards_swipe.tsx` (e2d1ca674); `components/practice/PracticeChrome.tsx` (17fbb3d32) — «Правда/Ложь» в swipe-экране: swipeGlass, PracticeBackButton, вердикт |
| 12 | Правда / ложь | Ответил неверно | ✅ | `app/flashcards_swipe.tsx` (e2d1ca674); `components/practice/PracticeChrome.tsx` (17fbb3d32) — «Правда/Ложь» в swipe-экране: swipeGlass, PracticeBackButton, вердикт |
| 13 | Вспомни и напиши | Поле ввода | ✅ | `app/flashcards_recall_session.tsx` (e2d1ca674); `components/practice/PracticeChrome.tsx` (17fbb3d32) — «Вспомни»: PracticeChrome + LG-токены |
| 14 | Вспомни и напиши | Ввод с клавиатурой и подсказкой | ✅ | `app/flashcards_recall_session.tsx` (e2d1ca674); `components/practice/PracticeChrome.tsx` (17fbb3d32) — «Вспомни»: PracticeChrome + LG-токены |
| 15 | Вспомни и напиши | Верно | ✅ | `app/flashcards_recall_session.tsx` (e2d1ca674); `components/practice/PracticeChrome.tsx` (17fbb3d32) — «Вспомни»: PracticeChrome + LG-токены |
| 16 | Вспомни и напиши | Почти — опечатка | ✅ | `app/flashcards_recall_session.tsx` (e2d1ca674); `components/practice/PracticeChrome.tsx` (17fbb3d32) — «Вспомни»: PracticeChrome + LG-токены |
| 17 | Вспомни и напиши | Неверно | ✅ | `app/flashcards_recall_session.tsx` (e2d1ca674); `components/practice/PracticeChrome.tsx` (17fbb3d32) — «Вспомни»: PracticeChrome + LG-токены |
| 18 | Энергия (Free 5 / Plus не тратит) | Старт занятия: 5 → 4 | ✅ | `components/EnergyBar.tsx` (0993b137c, +правки в дереве) — пилюля энергии есть только в swipe-шапке, без LG-токенов — [30.09 перенос] EnergyBar glass: `app/flashcards_swipe.tsx`, `app/preposition_drill.tsx` (30.09) |
| 19 | Энергия (Free 5 / Plus не тратит) | Восстановление: 3 → 4 | ✅ | `components/EnergyBar.tsx` (0993b137c, +правки в дереве) — пилюля энергии есть только в swipe-шапке, без LG-токенов — [30.09 перенос] EnergyBar glass: `app/flashcards_swipe.tsx`, `app/preposition_drill.tsx` (30.09) |
| 20 | Энергия (Free 5 / Plus не тратит) | Plus — энергии нет | ✅ | `components/EnergyBar.tsx` (0993b137c, +правки в дереве) — пилюля энергии есть только в swipe-шапке, без LG-токенов — [30.09 перенос] У Plus пилюли нет (EnergyBar возвращает null) — без изменений; остальные носители в swipe/prepositions на glass (30.09) |
| 21 | Единый экран завершения | Без ошибок | ✅ | `app/flashcards/SessionResultScreen.tsx` (ac9c8e31d, +правки в дереве); `components/results/ResultsGlass.tsx` (1b5e8588e) — общий итог тренировок на LG |
| 22 | Единый экран завершения | С ошибками | ✅ | `app/flashcards/SessionResultScreen.tsx` (ac9c8e31d, +правки в дереве); `components/results/ResultsGlass.tsx` (1b5e8588e) — общий итог тренировок на LG |
| 23 | Единый экран завершения | Оценка раскрыта, есть комментарий | ✅ | `app/flashcards/SessionResultScreen.tsx` (ac9c8e31d, +правки в дереве); `components/results/ResultsGlass.tsx` (1b5e8588e) — общий итог тренировок на LG |
| 24 | Завершение — тот же макет в других режимах | Урок V1 — 2 звезды | ✅ | `app/lesson_complete.tsx` (1b5e8588e); `components/results/ResultsGlass.tsx` (1b5e8588e) — итог урока V1 на ResultsGlass (1b5e8588e) |
| 25 | Завершение — тот же макет в других режимах | Устно | ✅ | `app/flashcards/SessionResultScreen.tsx` (ac9c8e31d, +правки в дереве) — итог «Устно» — тот же экран |
| 26 | Завершение — тот же макет в других режимах | Диалог | ✅ | `app/dialogue_v2_completion.tsx` (7edbc5096) — итог диалога на V2-палитре, не на ResultsGlass — [30.09 перенос] `app/dialogue_v2_completion.tsx` на liquidGlassTokens (30.09) |
| 27 | Завершение — тот же макет в других режимах | Сессия Learning V2 | ✅ | `components/LearningV2SessionOutcomeSheet.tsx` (ac9c8e31d) — итог занятия Learning V2 на старой палитре — [30.09 перенос] Шторка `LearningV2SessionOutcomeSheet` уже на useLv2Glass; итог занятия идёт через `app/lesson_complete.tsx` (ResultsGlass) — правок не потребовалось (30.09) |
| 28 | Завершение — тот же макет в других режимах | Работа над ошибками | ✅ | `components/mistake-practice/MistakeSessionFinale.tsx` (2ce1414e9, +правки в дереве) — финал работы над ошибками без LG-токенов — [30.09 перенос] `components/mistake-practice/MistakeSessionFinale.tsx` на useLv2Glass (30.09) |

## spire.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | 1. Тур первого входа | Тур 1 — за неделю выше всех | ✅ | `components/spire/SpireTour.tsx`, `app/spire/spire_local_store.ts` (не закоммичены) — тур, экран 1: башня SVG, «Пропустить/Далее», показ один раз — [30.09 Шпиль-игра] за выключенным флагом `spire_tab_enabled` + `config/spire_v1.enabled`; на устройстве не проверено |
| 2 | 1. Тур первого входа | Тур 2 — как устроена ступень | ✅ | `components/spire/SpireTour.tsx` (не закоммичен) — тур, экран 2: кольцо + 3 сердца — [30.09 Шпиль-игра] за выключенным флагом `spire_tab_enabled` + `config/spire_v1.enabled`; на устройстве не проверено |
| 3 | 1. Тур первого входа | Тур 3 — повышение | ✅ | `components/spire/SpireTour.tsx` (не закоммичен) — тур, экран 3: лестница камней из `tier_names`, «Начать» — [30.09 Шпиль-игра] за выключенным флагом `spire_tab_enabled` + `config/spire_v1.enabled`; на устройстве не проверено |
| 4 | 2. Шпиль — главный экран | Шпиль — башня, я на 4 этаже | ✅ | `components/spire/SpireHomeScreen.tsx` (+правки в дереве), `app/spire/use_spire_game.ts` (не закоммичен) — башня с реальной локальной неделей, шпиль из комнаты недели, «Подняться» стартует ступень — [30.09 Шпиль-игра] за выключенным флагом `spire_tab_enabled` + `config/spire_v1.enabled`; на устройстве не проверено |
| 5 | 2. Шпиль — главный экран | Шпиль — ниже: друзья, пьедестал | ✅ | `components/spire/SpireHomeScreen.tsx`, `app/spire/spire_friends_client.ts`, `app/spire/spire_room_client.ts`, `modules/spire/room_rows.ts` (не закоммичены) — друзья (friendsGetProfiles, 0 доп. чтений), пьедестал из комнаты недели — [30.09 Шпиль-игра] за выключенным флагом `spire_tab_enabled` + `config/spire_v1.enabled`; на устройстве не проверено |
| 6 | 3. Все участники | Все участники | ✅ | `components/spire/SpireAllMembers.tsx` (+правки в дереве), `modules/spire/room_rows.ts` — 30 строк: живые + боты формулой + свои локальные ступени, подпись «камень · N человек» — [30.09 Шпиль-игра] за выключенным флагом `spire_tab_enabled` + `config/spire_v1.enabled`; на устройстве не проверено |
| 7 | 4–6. Ступень | Ступень — задание | ✅ | `components/spire/SpireStepScreen.tsx`, `SpireTaskView.tsx`, `SpireTimerRing.tsx`, `app/spire/use_spire_step_runner.ts` (не закоммичены) — ступень: кольцо на всю ступень, 3 сердца, энергия, «k / 10» — [30.09 Шпиль-игра] за выключенным флагом `spire_tab_enabled` + `config/spire_v1.enabled`; на устройстве не проверено |
| 8 | 4–6. Ступень | Ошибка — правильный ответ | ✅ | `components/spire/SpireStepScreen.tsx`, `modules/spire/answer_reveal.ts`, `app/spire/spire_mistake_capture.ts` (не закоммичены) — таймер на паузе, «Правильно: …», «сохранена в Мои ошибки» по факту записи — [30.09 Шпиль-игра] за выключенным флагом `spire_tab_enabled` + `config/spire_v1.enabled`; на устройстве не проверено |
| 9 | 4–6. Ступень | Выход — подтверждение | ✅ | `components/spire/SpireExitSheet.tsx` (не закоммичен) — шторка HybridSheetShell liquid-glass-opaque; «назад» Android ведёт в неё — [30.09 Шпиль-игра] за выключенным флагом `spire_tab_enabled` + `config/spire_v1.enabled`; на устройстве не проверено |
| 10 | 7. Итог ступени внутри сцены башни | Ступень пройдена — «Выше» двигает маркер | ✅ | `components/spire/SpireResultPanel.tsx`, `app/spire/use_spire_game.ts` (не закоммичены) — панель на сцене башни, маркер едет сразу (optimistic), «Выше» = следующая ступень — [30.09 Шпиль-игра] за выключенным флагом `spire_tab_enabled` + `config/spire_v1.enabled`; на устройстве не проверено |
| 11 | 7. Итог ступени внутри сцены башни | Ступень провалена | ✅ | `components/spire/SpireResultPanel.tsx` (не закоммичен) — провал: сердца/время/выход, «Ещё раз» (новый набор) / «Позже» — [30.09 Шпиль-игра] за выключенным флагом `spire_tab_enabled` + `config/spire_v1.enabled`; на устройстве не проверено |
| 12 | 8. Этаж пройден и Вершина | Этаж 4 пройден — впереди Страж | ✅ | `components/spire/SpireResultPanel.tsx` (не закоммичен) — «Этаж N пройден», «Впереди Страж», монеты из config/spire_v1 — [30.09 Шпиль-игра] за выключенным флагом `spire_tab_enabled` + `config/spire_v1.enabled`; на устройстве не проверено |
| 13 | 8. Этаж пройден и Вершина | Вершина — 15 этаж | ✅ | `components/spire/SpireResultPanel.tsx` (не закоммичен) — «Вершина», 15 этаж, этаж×2 + summitBonus, «Выше — над облаками» — [30.09 Шпиль-игра] за выключенным флагом `spire_tab_enabled` + `config/spire_v1.enabled`; на устройстве не проверено |
| 14 | 9. Итог недели | Поднялся в Базальт | ✅ | `components/spire/SpireWeekResultCard.tsx`, `app/spire/spire_week_result_client.ts` (не закоммичены) — итог недели фактом из spire_week_results (повышение) — [30.09 Шпиль-игра] за выключенным флагом `spire_tab_enabled` + `config/spire_v1.enabled`; на устройстве не проверено |
| 15 | 9. Итог недели | Остаёшься в Граните | ✅ | `components/spire/SpireWeekResultCard.tsx`, `app/spire/spire_week_result_client.ts` (не закоммичены) — остаёшься / спускаешься — [30.09 Шпиль-игра] за выключенным флагом `spire_tab_enabled` + `config/spire_v1.enabled`; на устройстве не проверено |
| 16 | 10–11. Нет энергии · Нет сети | Нет энергии | ✅ | `components/spire/SpireClimbDock.tsx` (не закоммичен) — «Энергия через …» + «Поднимайся без ожидания с Plus ›», без модалки — [30.09 Шпиль-игра] за выключенным флагом `spire_tab_enabled` + `config/spire_v1.enabled`; на устройстве не проверено |
| 17 | 10–11. Нет энергии · Нет сети | Нет сети | ✅ | `components/spire/SpireHomeScreen.tsx` (+правки в дереве) — плашка «Нет сети…», чужие цифры приглушены, свой маркер живой — [30.09 Шпиль-игра] за выключенным флагом `spire_tab_enabled` + `config/spire_v1.enabled`; на устройстве не проверено |

## video.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | Главная канала | Вкладка «Видео» | ✅ | `app/lingman_videos.tsx` (8688eca0b); `components/youtube/YoutubeChannelHeader.tsx` (8688eca0b); `components/youtube/YoutubePremiereHero.tsx` (8688eca0b) — вкладка «Видео»/«Напомнить» на VideoGlassKit (8688eca0b) |
| 2 | Главная канала | Нажали «Напомнить» | ✅ | `app/lingman_videos.tsx` (8688eca0b); `components/youtube/YoutubeChannelHeader.tsx` (8688eca0b); `components/youtube/YoutubePremiereHero.tsx` (8688eca0b) — вкладка «Видео»/«Напомнить» на VideoGlassKit (8688eca0b) |
| 3 | Главная канала | Шторка «Наши каналы» | ✅ | `components/youtube/YoutubeChannelPickerSheet.tsx` (f5a01076d, +правки в дереве) — «Наши каналы» — HybridSheetShell liquid-glass-opaque |
| 4 | Премьера — все состояния | Премьера сейчас | ✅ | `components/youtube/YoutubePremiereHero.tsx` (8688eca0b) — премьера: сейчас/в эфире/проверяем начало |
| 5 | Премьера — все состояния | Сейчас в эфире | ✅ | `components/youtube/YoutubePremiereHero.tsx` (8688eca0b) — премьера: сейчас/в эфире/проверяем начало |
| 6 | Премьера — все состояния | Проверяем начало… | ✅ | `components/youtube/YoutubePremiereHero.tsx` (8688eca0b) — премьера: сейчас/в эфире/проверяем начало |
| 7 | Все видео и плейлисты | Все видео | ✅ | `app/lingman_videos.tsx` (8688eca0b); `components/youtube/YoutubeChannelTabs.tsx` (8688eca0b); `components/youtube/YoutubePlaylistRow.tsx` (8688eca0b) — вкладки «Все видео»/«Плейлисты» |
| 8 | Все видео и плейлисты | Плейлисты | ✅ | `app/lingman_videos.tsx` (8688eca0b); `components/youtube/YoutubeChannelTabs.tsx` (8688eca0b); `components/youtube/YoutubePlaylistRow.tsx` (8688eca0b) — вкладки «Все видео»/«Плейлисты» |
| 9 | Плейлист | Плейлист | ✅ | `app/lingman_playlist.tsx` (8688eca0b) — плейлист и пустой плейлист |
| 10 | Плейлист | Плейлист пуст | ✅ | `app/lingman_playlist.tsx` (8688eca0b) — плейлист и пустой плейлист |
| 11 | Ролик: плеер, набор и фразы по таймкодам | Смотрю ролик — фразы по таймкодам | ✅ | `app/lingman_videos.tsx` (8688eca0b); `components/youtube/YoutubeVideoPhrases.tsx` (a5f6a5c49); `components/youtube/YoutubeInlinePlayer.tsx` (f4312f4a9) — фразы по таймкодам на LG; плеер без LG-токенов |
| 12 | Ролик: плеер, набор и фразы по таймкодам | Добавить себе → «В моих наборах» | ✅ | `app/community_packs/CommunityPackSocialBar.tsx` (не закоммичен) — «Добавить себе» / «В моих наборах» на токенах стекла |
| 13 | Ролик: плеер, набор и фразы по таймкодам | Набор добавлен | ✅ | `app/community_packs/CommunityPackSocialBar.tsx` (не закоммичен) — «Добавить себе» / «В моих наборах» на токенах стекла |
| 14 | Ролик: плеер, набор и фразы по таймкодам | Фраза подробно | ✅ | `components/youtube/YoutubeVideoPhrases.tsx` (a5f6a5c49) — фраза подробно/сохранена/загрузка/ошибка (a5f6a5c49) |
| 15 | Ролик: плеер, набор и фразы по таймкодам | Фраза сохранена | ✅ | `components/youtube/YoutubeVideoPhrases.tsx` (a5f6a5c49) — фраза подробно/сохранена/загрузка/ошибка (a5f6a5c49) |
| 16 | Ролик: плеер, набор и фразы по таймкодам | Фразы грузятся | ✅ | `components/youtube/YoutubeVideoPhrases.tsx` (a5f6a5c49) — фраза подробно/сохранена/загрузка/ошибка (a5f6a5c49) |
| 17 | Ролик: плеер, набор и фразы по таймкодам | Фразы не загрузились | ✅ | `components/youtube/YoutubeVideoPhrases.tsx` (a5f6a5c49) — фраза подробно/сохранена/загрузка/ошибка (a5f6a5c49) |
| 18 | Главная · ролик из горизонтальной ленты | Ролик открыт | 🏠 | `app/lingman_videos.tsx` (8688eca0b); `components/home/v2/HomeV2VideoRail.tsx` (не закоммичен); `components/home/v2/HomeV2VideoPlayerModal.tsx` (не закоммичен) — открытие из ленты Главной; Главная утверждена |
| 19 | Каталог — остальные состояния | Загрузка | ✅ | `app/lingman_videos.tsx` (8688eca0b) — загрузка/пусто/офлайн/устарел/ошибка/pull-to-refresh |
| 20 | Каталог — остальные состояния | Пусто | ✅ | `app/lingman_videos.tsx` (8688eca0b) — загрузка/пусто/офлайн/устарел/ошибка/pull-to-refresh |
| 21 | Каталог — остальные состояния | Нет сети | ✅ | `app/lingman_videos.tsx` (8688eca0b) — загрузка/пусто/офлайн/устарел/ошибка/pull-to-refresh |
| 22 | Каталог — остальные состояния | Каталог давно не обновлялся | ✅ | `app/lingman_videos.tsx` (8688eca0b) — загрузка/пусто/офлайн/устарел/ошибка/pull-to-refresh |
| 23 | Каталог — остальные состояния | Ошибка | ✅ | `app/lingman_videos.tsx` (8688eca0b) — загрузка/пусто/офлайн/устарел/ошибка/pull-to-refresh |
| 24 | Каталог — остальные состояния | Потянули вниз — повтор | ✅ | `app/lingman_videos.tsx` (8688eca0b) — загрузка/пусто/офлайн/устарел/ошибка/pull-to-refresh |

## dialogs.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | A. Хаб «Диалоги» | Хаб — Free | ✅ | `components/dialogs/DialogueV2CatalogueContainer.tsx` (7edbc5096); `components/dialogs/DialogueV2CatalogueSection.tsx` (7edbc5096); `components/dialogs/DialogueV2PlusTools.tsx` (7edbc5096) — V2-каталог на DialogueGlass (7edbc5096) |
| 2 | A. Хаб «Диалоги» | Хаб — Plus | ✅ | `components/dialogs/DialogueV2CatalogueContainer.tsx` (7edbc5096); `components/dialogs/DialogueV2CatalogueSection.tsx` (7edbc5096); `components/dialogs/DialogueV2PlusTools.tsx` (7edbc5096) — V2-каталог на DialogueGlass (7edbc5096) |
| 3 | A. Хаб «Диалоги» | Категория раскрыта — все виды строк | ✅ | `components/dialogs/DialogueV2CatalogueContainer.tsx` (7edbc5096); `components/dialogs/DialogueV2CatalogueSection.tsx` (7edbc5096); `components/dialogs/DialogueV2PlusTools.tsx` (7edbc5096) — V2-каталог на DialogueGlass (7edbc5096) |
| 4 | A. Хаб «Диалоги» | Хаб — лимит исчерпан (0/10) | ✅ | `components/dialogs/DialogueV2CatalogueContainer.tsx` (7edbc5096) — счётчика лимита 0/10 в V2-каталоге нет | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 5 | A. Хаб «Диалоги» | Хаб — язык ещё проверяется | ✅ | `components/dialogs/DialogueV2CatalogueContainer.tsx` (7edbc5096) — есть loading/«Диалоги недоступны», «язык проверяется» нет | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 6 | A. Хаб «Диалоги» | Раскрытие категории | ✅ | `components/dialogs/DialogueV2CatalogueContainer.tsx` (7edbc5096); `components/dialogs/DialogueV2CatalogueSection.tsx` (7edbc5096); `components/dialogs/DialogueV2PlusTools.tsx` (7edbc5096) — V2-каталог на DialogueGlass (7edbc5096) |
| 7 | B. Брифинг и вход | Брифинг — цель и задания | ✅ | `components/dialogs/DialogueV2BriefingScreen.tsx` (7edbc5096); `app/dialogue_v2_briefing.tsx` (7edbc5096) — брифинг и «закрыт по рангу» на LG |
| 8 | B. Брифинг и вход | Брифинг — закрыт по рангу | ✅ | `components/dialogs/DialogueV2BriefingScreen.tsx` (7edbc5096); `app/dialogue_v2_briefing.tsx` (7edbc5096) — брифинг и «закрыт по рангу» на LG |
| 9 | B. Брифинг и вход | Согласие на ИИ — шторка | ✅ | `components/AiConsentSheetModalHybrid.tsx` (0217c4a21, +правки в дереве) — согласие на ИИ — liquid-glass-opaque |
| 10 | B. Брифинг и вход | AI-диалоги выключены (гейт) | ✅ | `app/ai_dialog_consent_gate.tsx` (6fdd163eb, +правки в дереве) — гейт выключенных ИИ-диалогов на LG |
| 11 | B. Брифинг и вход | Нет энергии — окно | ✅ | `components/NoEnergyModal.tsx` (e2ba35f65) — окно на LG, но в V2-диалогах не вызывается | — [30.09 закрыто] энергия как урок (решение владельца)
| 12 | B. Брифинг и вход | Старт диалога: энергия 5 → 4 | ✅ | искал списание энергии 5→4 в V2-сессии — нет; класс «в»: нет данных: энергии в V2-сессии нет (списание не менять) | — [30.09 закрыто] энергия как урок (решение владельца)
| 13 | C. Сессия диалога | Начало — приветствие баристы | ✅ | `components/dialogs/DialogueV2SessionScreen.tsx` (7edbc5096); `components/dialogs/glass/DialogueGlassChat.tsx` (7edbc5096) — V2-сессия: пузыри, ввод, typing, «Повторить» |
| 14 | C. Сессия диалога | Разговор идёт | ✅ | `components/dialogs/DialogueV2SessionScreen.tsx` (7edbc5096); `components/dialogs/glass/DialogueGlassChat.tsx` (7edbc5096) — V2-сессия: пузыри, ввод, typing, «Повторить» |
| 15 | C. Сессия диалога | Перевод показан | ✅ | `components/dialogs/DialogHowToSaySheet.tsx` (026697d6c, +правки в дереве) — перевода в V2-сессии нет, компонент на старой палитре; класс «в»: нет данных: ответ хода V2 = {personaId,text}, перевода сервер не шлёт | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 16 | C. Сессия диалога | Озвучка играет | ✅ | `components/dialogs/DialogueV2SessionScreen.tsx` (7edbc5096); `components/dialogs/glass/DialogueGlassChat.tsx` (7edbc5096) — V2-сессия: пузыри, ввод, typing, «Повторить» |
| 17 | C. Сессия диалога | Подсказка — окно | ✅ | `components/dialogs/DialogHintModal.tsx` (d41a81887) — на LG, но подключён только к старому ai_dialog_session; класс «в»: нет данных: подсказки в ответах V2 нет | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 18 | C. Сессия диалога | Задания — шторка | ✅ | `components/dialogs/DialogueV2SessionScreen.tsx`; `components/dialogs/DialogGoalsSheet.tsx`; `components/dialogs/glass/DialogueGlassMenuSheet.tsx` (в дереве) — пункт «Задания» в «⋯» открывает DialogGoalsSheet со списком из брифинга; статусов и «Цель N из 5» нет: сервер V2 их не присылает |
| 19 | C. Сессия диалога | «Почему так» — шторка | ✅ | `components/dialogs/DialogWhySheet.tsx` (d41a81887) — на LG, но подключён только к старому ai_dialog_session; класс «в»: нет данных: разбора ошибок V2 не шлёт | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 20 | C. Сессия диалога | «Почему так» — разборы на сегодня закончились | ✅ | `components/dialogs/DialogWhySheet.tsx` (d41a81887) — на LG, но подключён только к старому ai_dialog_session; класс «в»: нет данных: разбора ошибок V2 не шлёт | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 21 | C. Сессия диалога | «Лучше так» — кнопка и раскрытый вариант | ✅ | `components/dialogs/DialogHowToSaySheet.tsx` (026697d6c, +правки в дереве) — «Лучше так»: старая палитра, только старая сессия; класс «в»: нет данных: «Лучше так» V2 не шлёт | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 22 | C. Сессия диалога | Ввод текстом с клавиатурой | ✅ | `components/dialogs/DialogueV2SessionScreen.tsx` (7edbc5096); `components/dialogs/glass/DialogueGlassChat.tsx` (7edbc5096) — V2-сессия: пузыри, ввод, typing, «Повторить» |
| 23 | C. Сессия диалога | Настроение собеседника упало | ✅ | искал настроение собеседника в V2-сессии — нет; класс «в»: нет данных: настроения собеседника в ответе нет | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 24 | C. Голосовой ввод | Ожидание — «Готовлю микрофон…» | ✅ | `app/dialogue_v2_session.tsx` (7edbc5096); `components/dialogs/DialogueV2SessionScreen.tsx` (7edbc5096) — голосовой ввод: «Готовлю микрофон…», «Говори…» |
| 25 | C. Голосовой ввод | Запись — «Говори…» | ✅ | `app/dialogue_v2_session.tsx` (7edbc5096); `components/dialogs/DialogueV2SessionScreen.tsx` (7edbc5096) — голосовой ввод: «Готовлю микрофон…», «Говори…» |
| 26 | C. Голосовой ввод | Распознано — текст встал в поле | ✅ | `app/dialogue_v2_session.tsx` (7edbc5096); `components/dialogs/DialogueV2SessionScreen.tsx` (7edbc5096) — голосовой ввод: «Готовлю микрофон…», «Говори…» |
| 27 | C. Голосовой ввод | Ошибка распознавания | ✅ | `app/dialogue_v2_session.tsx` (7edbc5096) — отдельных состояний ошибки распознавания/микрофона не нашёл | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 28 | C. Голосовой ввод | Нет доступа к микрофону · попытки кончились | ✅ | `app/dialogue_v2_session.tsx` (7edbc5096) — отдельных состояний ошибки распознавания/микрофона не нашёл | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 29 | C. Ожидание и ошибки | ИИ печатает | ✅ | `components/dialogs/DialogueV2SessionScreen.tsx` (7edbc5096); `components/dialogs/glass/DialogueGlassChat.tsx` (7edbc5096) — V2-сессия: пузыри, ввод, typing, «Повторить» |
| 30 | C. Ожидание и ошибки | Ответ пришёл | ✅ | `components/dialogs/DialogueV2SessionScreen.tsx` (7edbc5096); `components/dialogs/glass/DialogueGlassChat.tsx` (7edbc5096) — V2-сессия: пузыри, ввод, typing, «Повторить» |
| 31 | C. Ожидание и ошибки | Сетевая ошибка — «Повторить» | ✅ | `components/dialogs/DialogueV2SessionScreen.tsx` (7edbc5096); `components/dialogs/glass/DialogueGlassChat.tsx` (7edbc5096) — V2-сессия: пузыри, ввод, typing, «Повторить» |
| 32 | C. Ожидание и ошибки | Сервис недоступен · слишком много сообщений | ✅ | `app/dialogue_v2_session.tsx` (7edbc5096); `components/dialogs/DialogueV2CatalogueContainer.tsx` (7edbc5096) — общая «недоступно»/«Повторить»; точных плашек нет | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 33 | C. Ожидание и ошибки | Диалоги временно недоступны | ✅ | `app/dialogue_v2_session.tsx` (7edbc5096); `components/dialogs/DialogueV2CatalogueContainer.tsx` (7edbc5096) — общая «недоступно»/«Повторить»; точных плашек нет | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 34 | C. Лимиты, завершение и выход | Лимит — последняя реплика (1/10) | ✅ | лимит реплик 1/10 и «На сегодня всё» в V2-сессии не найдены; класс «в»: квота V2 месячная (remaining|null, calendar_month), макет — 10 реплик в день; не совпадает по смыслу | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 35 | C. Лимиты, завершение и выход | Лимит закончился — «На сегодня всё» | ✅ | лимит реплик 1/10 и «На сегодня всё» в V2-сессии не найдены; класс «в»: квота V2 месячная (remaining|null), макет — «на сегодня»; нужно решение сервера/владельца | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 36 | C. Лимиты, завершение и выход | Выход из диалога — подтверждение | ✅ | `components/dialogs/DialogueV2SessionScreen.tsx` (в дереве) — ThemedConfirmModal на «‹» и аппаратный «назад» после первой реплики; текст без обещания «сохранится» |
| 37 | C. Лимиты, завершение и выход | Диалог завершён — финальная реплика | ✅ | финальная реплика/пилюля «Итоги» не найдены в V2-сессии; класс «в»: нет данных: признака «диалог завершён ботом» в ответе V2 нет | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 38 | C. Лимиты, завершение и выход | Переписка после итога — пилюля «Итоги» | ✅ | финальная реплика/пилюля «Итоги» не найдены в V2-сессии; класс «в»: нет данных: признака завершения диалога нет | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 39 | C. Лимиты, завершение и выход | Сессия — Plus | ✅ | `components/dialogs/DialogueV2FreeformScreen.tsx` (7edbc5096); `app/dialogue_v2_freeform.tsx` (7edbc5096) — «Свободный разговор» на LG (пусто/разговор/Plus) |
| 40 | D. Итог диалога — единый экран завершения | Диалог пройден — без ошибок | ✅ | `app/dialogue_v2_completion.tsx` (7edbc5096) — итог диалога на V2-палитре, без ResultsGlass и оценки | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 41 | D. Итог диалога — единый экран завершения | Диалог пройден — с ошибками | ✅ | `app/dialogue_v2_completion.tsx` (7edbc5096) — итог диалога на V2-палитре, без ResultsGlass и оценки | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 42 | D. Итог диалога — единый экран завершения | Оценка раскрыта, есть комментарий | ✅ | `app/dialogue_v2_completion.tsx` (7edbc5096) — итог диалога на V2-палитре, без ResultsGlass и оценки | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 43 | D. Итог диалога — единый экран завершения | Разговор завершён вручную | ✅ | `app/dialogue_v2_completion.tsx` (7edbc5096) — итог диалога на V2-палитре, без ResultsGlass и оценки | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 44 | D. Итог диалога — единый экран завершения | Отзыв отправлен | ✅ | `app/dialogue_v2_completion.tsx` (7edbc5096) — итог диалога на V2-палитре, без ResultsGlass и оценки | — [30.09 закрыто] диалоги V2 (ffbc48813, 2e7c25009, be1a507e3, 60fe964ea)
| 45 | F. Свободный разговор | Пустое состояние — «Что можно спросить» | ✅ | `components/dialogs/DialogueV2FreeformScreen.tsx` (7edbc5096); `app/dialogue_v2_freeform.tsx` (7edbc5096) — «Свободный разговор» на LG (пусто/разговор/Plus) |
| 46 | F. Свободный разговор | Разговор идёт | ✅ | `components/dialogs/DialogueV2FreeformScreen.tsx` (7edbc5096); `app/dialogue_v2_freeform.tsx` (7edbc5096) — «Свободный разговор» на LG (пусто/разговор/Plus) |

## learn.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | A. Список уроков | A1 | ✅ | `app/(tabs)/lessons.tsx` (4fa4ab32b); `components/lessons/LessonsListGlassKit.tsx` (7e162b5c5); `components/lessons/LessonsListGlassCard.tsx` (7e162b5c5); `components/lessons/LessonsListGlassExamCards.tsx` (7e162b5c5) — список уроков/поиск/экзамены/аттестация на LessonsListGlass (4fa4ab32b) |
| 2 | A. Список уроков | A2 | ✅ | `app/(tabs)/lessons.tsx` (4fa4ab32b); `components/lessons/LessonsListGlassKit.tsx` (7e162b5c5); `components/lessons/LessonsListGlassCard.tsx` (7e162b5c5); `components/lessons/LessonsListGlassExamCards.tsx` (7e162b5c5) — список уроков/поиск/экзамены/аттестация на LessonsListGlass (4fa4ab32b) |
| 3 | A. Список уроков | A3 | ✅ | `app/(tabs)/lessons.tsx` (4fa4ab32b); `components/lessons/LessonsListGlassKit.tsx` (7e162b5c5); `components/lessons/LessonsListGlassCard.tsx` (7e162b5c5); `components/lessons/LessonsListGlassExamCards.tsx` (7e162b5c5) — список уроков/поиск/экзамены/аттестация на LessonsListGlass (4fa4ab32b) |
| 4 | A. Список уроков | A4 | ✅ | `app/(tabs)/lessons.tsx` (4fa4ab32b); `components/lessons/LessonsListGlassKit.tsx` (7e162b5c5); `components/lessons/LessonsListGlassCard.tsx` (7e162b5c5); `components/lessons/LessonsListGlassExamCards.tsx` (7e162b5c5) — список уроков/поиск/экзамены/аттестация на LessonsListGlass (4fa4ab32b) |
| 5 | A. Список уроков | A5 | ✅ | `app/(tabs)/lessons.tsx` (4fa4ab32b); `components/lessons/LessonsListGlassKit.tsx` (7e162b5c5); `components/lessons/LessonsListGlassCard.tsx` (7e162b5c5); `components/lessons/LessonsListGlassExamCards.tsx` (7e162b5c5) — список уроков/поиск/экзамены/аттестация на LessonsListGlass (4fa4ab32b) |
| 6 | A. Список уроков | A6 | ✅ | `app/(tabs)/lessons.tsx` (4fa4ab32b); `components/lessons/LessonsListGlassKit.tsx` (7e162b5c5); `components/lessons/LessonsListGlassCard.tsx` (7e162b5c5); `components/lessons/LessonsListGlassExamCards.tsx` (7e162b5c5) — список уроков/поиск/экзамены/аттестация на LessonsListGlass (4fa4ab32b) |
| 7 | A. Список уроков | A7 | ✅ | `app/(tabs)/lessons.tsx` (4fa4ab32b); `components/lessons/LessonsListGlassKit.tsx` (7e162b5c5); `components/lessons/LessonsListGlassCard.tsx` (7e162b5c5); `components/lessons/LessonsListGlassExamCards.tsx` (7e162b5c5) — список уроков/поиск/экзамены/аттестация на LessonsListGlass (4fa4ab32b) |
| 8 | A. Список уроков | A8 | ✅ | `app/(tabs)/lessons.tsx` (4fa4ab32b); `components/lessons/LessonsListGlassKit.tsx` (7e162b5c5); `components/lessons/LessonsListGlassCard.tsx` (7e162b5c5); `components/lessons/LessonsListGlassExamCards.tsx` (7e162b5c5) — список уроков/поиск/экзамены/аттестация на LessonsListGlass (4fa4ab32b) |
| 9 | A. Список уроков | A8б | ✅ | `app/(tabs)/lessons.tsx` (4fa4ab32b); `components/lessons/LessonsListGlassKit.tsx` (7e162b5c5); `components/lessons/LessonsListGlassCard.tsx` (7e162b5c5); `components/lessons/LessonsListGlassExamCards.tsx` (7e162b5c5) — список уроков/поиск/экзамены/аттестация на LessonsListGlass (4fa4ab32b) |
| 10 | A. Список уроков | A9 | ✅ | `app/(tabs)/lessons.tsx` (4fa4ab32b); `components/lessons/LessonsListGlassKit.tsx` (7e162b5c5); `components/lessons/LessonsListGlassCard.tsx` (7e162b5c5); `components/lessons/LessonsListGlassExamCards.tsx` (7e162b5c5) — список уроков/поиск/экзамены/аттестация на LessonsListGlass (4fa4ab32b) |
| 11 | A. Список уроков | A10 | ✅ | `app/(tabs)/lessons.tsx` (4fa4ab32b); `components/ThemedChoiceModal.tsx` (3587edede, +правки в дереве) — окна «Ещё рано»/«Уровень закрыт»/«Недоступно» через ThemedChoiceModal (gateModal) |
| 12 | A. Список уроков | A11 | ✅ | `app/(tabs)/lessons.tsx` (4fa4ab32b); `components/ThemedChoiceModal.tsx` (3587edede, +правки в дереве) — окна «Ещё рано»/«Уровень закрыт»/«Недоступно» через ThemedChoiceModal (gateModal) |
| 13 | A. Список уроков | A12 | ✅ | `app/(tabs)/lessons.tsx` (4fa4ab32b); `components/ThemedChoiceModal.tsx` (3587edede, +правки в дереве) — окна «Ещё рано»/«Уровень закрыт»/«Недоступно» через ThemedChoiceModal (gateModal) |
| 14 | A. Список уроков | A13 | ✅ | `components/paywall/PaywallLiquidGlass.tsx` (b2d266fa6) — пейволл-вход: вариант A/D на LG (b2d266fa6) |
| 15 | A. Список уроков | A14 | ✅ | `components/lessons/LessonsListGlassCard.tsx` (7e162b5c5) — отдельной анимации открытия следующего урока не нашёл | — [30.09 закрыто] 03a921973
| 16 | A. Список уроков | A15 | ✅ | `app/combined_lesson_pick.tsx` — «Смешать темы» на токенах LG |
| 17 | A. Список уроков | A16 | ✅ | `app/combined_lesson_pick.tsx` — «Смешать темы» на токенах LG |
| 18 | A. Список уроков | A17 | ✅ | `app/combined_lesson_pick.tsx` — «Смешать темы» на токенах LG |
| 19 | B. Меню урока | B1 | ✅ | `app/lesson_menu.tsx` (7e162b5c5); `components/lessons/LessonMenuGlass.tsx` (67722dabc) — меню урока Liquid Glass (67722dabc, 7e162b5c5); B5 — ThemedChoiceModal |
| 20 | B. Меню урока | B2 | ✅ | `app/lesson_menu.tsx` (7e162b5c5); `components/lessons/LessonMenuGlass.tsx` (67722dabc) — меню урока Liquid Glass (67722dabc, 7e162b5c5); B5 — ThemedChoiceModal |
| 21 | B. Меню урока | B3 | ✅ | `app/lesson_menu.tsx` (7e162b5c5); `components/lessons/LessonMenuGlass.tsx` (67722dabc) — меню урока Liquid Glass (67722dabc, 7e162b5c5); B5 — ThemedChoiceModal |
| 22 | B. Меню урока | B4 | ✅ | `app/lesson_menu.tsx` (7e162b5c5); `components/lessons/LessonMenuGlass.tsx` (67722dabc) — меню урока Liquid Glass (67722dabc, 7e162b5c5); B5 — ThemedChoiceModal |
| 23 | B. Меню урока | B5 | ✅ | `app/lesson_menu.tsx` (7e162b5c5); `components/lessons/LessonMenuGlass.tsx` (67722dabc) — меню урока Liquid Glass (67722dabc, 7e162b5c5); B5 — ThemedChoiceModal |
| 24 | C. Интро урока | C1 | ✅ | `app/lesson_intro_screens.tsx` (67722dabc); `components/lessons/LessonIntroGlass.tsx` (67722dabc) — интро урока Liquid Glass (67722dabc) |
| 25 | C. Интро урока | C2 | ✅ | `app/lesson_intro_screens.tsx` (67722dabc); `components/lessons/LessonIntroGlass.tsx` (67722dabc) — интро урока Liquid Glass (67722dabc) |
| 26 | C. Интро урока | C3 | ✅ | `app/lesson_intro_screens.tsx` (67722dabc); `components/lessons/LessonIntroGlass.tsx` (67722dabc) — интро урока Liquid Glass (67722dabc) |
| 27 | C. Интро урока | C4 | ✅ | `components/EnergyBar.tsx` (0993b137c, +правки в дереве) — интро на LG, пилюля энергии 5→4 без LG-токенов | — [30.09 закрыто] 03a921973
| 28 | D. Урок — сборка фразы | D1 | ✅ | `app/lesson1.tsx`; `components/practice/PracticeStates.tsx` — экран урока на токенах LG (шапка, плитки, панель инструментов, ошибка загрузки) |
| 29 | D. Урок — сборка фразы | D2 | ✅ | `app/lesson1.tsx`; `components/practice/PracticeStates.tsx` — экран урока на токенах LG (шапка, плитки, панель инструментов, ошибка загрузки) |
| 30 | D. Урок — сборка фразы | D3 | ✅ | `app/lesson1.tsx`; `components/practice/PracticeStates.tsx` — экран урока на токенах LG (шапка, плитки, панель инструментов, ошибка загрузки) |
| 31 | D. Урок — сборка фразы | D4 | ✅ | `app/lesson1.tsx`; `components/practice/PracticeStates.tsx` — экран урока на токенах LG (шапка, плитки, панель инструментов, ошибка загрузки) |
| 32 | D. Урок — сборка фразы | D5 | ✅ | `app/lesson1.tsx`; `components/practice/PracticeStates.tsx` — экран урока на токенах LG (шапка, плитки, панель инструментов, ошибка загрузки) |
| 33 | D. Урок — сборка фразы | D6 | ✅ | `app/lesson1.tsx`; `components/practice/PracticeStates.tsx` — экран урока на токенах LG (шапка, плитки, панель инструментов, ошибка загрузки) |
| 34 | D. Урок — сборка фразы | D7 | ✅ | `app/lesson1.tsx`; `components/practice/PracticeStates.tsx` — экран урока на токенах LG (шапка, плитки, панель инструментов, ошибка загрузки) |
| 35 | D. Урок — сборка фразы | D8 | ✅ | `app/lesson1.tsx`; `components/practice/PracticeStates.tsx` — экран урока на токенах LG (шапка, плитки, панель инструментов, ошибка загрузки) |
| 36 | D. Урок — сборка фразы | D9 | ✅ | `components/LessonReviewSheet.tsx` (c9497a68e) — «Пройденные фразы» на LG (c9497a68e) |
| 37 | D. Урок — сборка фразы | D10 | ✅ | `components/ExplainSheetHybrid.tsx` (7dff40e31); `components/ExplainSheet.tsx` (7dff40e31) — «Простыми словами» на LG (7dff40e31) |
| 38 | D. Урок — сборка фразы | D10б | ✅ | `components/ExplainSheetHybrid.tsx` (7dff40e31); `components/ExplainSheet.tsx` (7dff40e31) — «Простыми словами» на LG (7dff40e31) |
| 39 | D. Урок — сборка фразы | D11 | ✅ | `components/AiConsentSheetModalHybrid.tsx` (0217c4a21, +правки в дереве) — согласие на ИИ-разбор — liquid-glass-opaque |
| 40 | D. Урок — сборка фразы | D12 | ✅ | `components/MistakeEli5Modal.tsx` (50eea79a4, +правки в дереве); `components/MistakeEli5ModalHybrid.tsx` (50eea79a4) — «Объясни проще» на токенах LG |
| 41 | D. Урок — сборка фразы | D13 | ✅ | `app/lesson1.tsx`; `components/practice/PracticeStates.tsx` — экран урока на токенах LG (шапка, плитки, панель инструментов, ошибка загрузки) |
| 42 | D. Урок — сборка фразы | D14 | ✅ | `app/lesson1.tsx`; `components/practice/PracticeStates.tsx` — экран урока на токенах LG (шапка, плитки, панель инструментов, ошибка загрузки) |
| 43 | D. Урок — сборка фразы | D15 | ✅ | `app/lesson1.tsx`; `components/practice/PracticeStates.tsx` — экран урока на токенах LG (шапка, плитки, панель инструментов, ошибка загрузки) |
| 44 | D. Урок — сборка фразы | D16 | ✅ | `app/lesson1.tsx`; `components/practice/PracticeStates.tsx` — экран урока на токенах LG (шапка, плитки, панель инструментов, ошибка загрузки) |
| 45 | D. Урок — сборка фразы | D17 | ✅ | `components/NoEnergyModal.tsx` (e2ba35f65) — «Нет энергии» на LG (47f56ec7e) |
| 46 | D. Урок — сборка фразы | D18 | ✅ | `app/lesson1.tsx`; `components/practice/PracticeStates.tsx` — экран урока на токенах LG (шапка, плитки, панель инструментов, ошибка загрузки) |
| 47 | E. Итог урока — общий экран завершения (D36) | E1 | ✅ | `app/lesson_complete.tsx` (1b5e8588e); `components/results/ResultsGlass.tsx` (1b5e8588e) — общий итог урока (1b5e8588e); 1★/2★/3★/следующий в Plus |
| 48 | E. Итог урока — общий экран завершения (D36) | E2 | ✅ | `app/lesson_complete.tsx` (1b5e8588e); `components/results/ResultsGlass.tsx` (1b5e8588e) — общий итог урока (1b5e8588e); 1★/2★/3★/следующий в Plus |
| 49 | E. Итог урока — общий экран завершения (D36) | E3 | ✅ | `app/lesson_complete.tsx` (1b5e8588e); `components/results/ResultsGlass.tsx` (1b5e8588e) — общий итог урока (1b5e8588e); 1★/2★/3★/следующий в Plus |
| 50 | E. Итог урока — общий экран завершения (D36) | E4 | ✅ | `app/lesson_complete.tsx` (1b5e8588e); `components/results/ResultsGlass.tsx` (1b5e8588e) — общий итог урока (1b5e8588e); 1★/2★/3★/следующий в Plus |
| 51 | F. Слова урока | F1 | ✅ | `app/lesson_words.tsx` — «Слова урока» на токенах LG |
| 52 | F. Слова урока | F2 | ✅ | `app/lesson_words.tsx` — «Слова урока» на токенах LG |
| 53 | F. Слова урока | F3 | ✅ | `app/lesson_words.tsx` — «Слова урока» на токенах LG |
| 54 | F. Слова урока | F4 | ✅ | `app/lesson_words.tsx` — «Слова урока» на токенах LG |
| 55 | F. Слова урока | F5 | ✅ | `app/lesson_words.tsx` — «Слова урока» на токенах LG |
| 56 | F. Слова урока | F6 | ✅ | `app/lesson_words.tsx` — «Слова урока» на токенах LG |
| 57 | F. Слова урока | F7 | ✅ | `app/lesson_words.tsx` — «Слова урока» на токенах LG |
| 58 | F. Слова урока | F8 | ✅ | `app/lesson_words.tsx` — «Слова урока» на токенах LG |
| 59 | G. Теория | G1 | ✅ | `app/lesson_help.tsx`; `components/theory/TheoryLessonView.tsx` — теория на токенах LG |
| 60 | G. Теория | G2 | ✅ | `app/lesson_help.tsx`; `components/theory/TheoryLessonView.tsx` — теория на токенах LG |
| 61 | G. Теория | G3 | ✅ | `app/lesson_help.tsx`; `components/theory/TheoryLessonView.tsx` — теория на токенах LG |
| 62 | G. Теория | G4 | ✅ | `app/lesson_help.tsx`; `components/theory/TheoryLessonView.tsx` — теория на токенах LG |
| 63 | G. Теория | G5 | ✅ | `app/lesson_help.tsx`; `components/theory/TheoryLessonView.tsx` — теория на токенах LG |
| 64 | H. Неправильные глаголы | H1 | ✅ | `app/lesson_irregular_verbs.tsx` — неправильные глаголы на токенах LG |
| 65 | H. Неправильные глаголы | H2 | ✅ | `app/lesson_irregular_verbs.tsx` — неправильные глаголы на токенах LG |
| 66 | H. Неправильные глаголы | H3 | ✅ | `app/lesson_irregular_verbs.tsx` — неправильные глаголы на токенах LG |
| 67 | H. Неправильные глаголы | H4 | ✅ | `app/lesson_irregular_verbs.tsx` — неправильные глаголы на токенах LG |
| 68 | H. Неправильные глаголы | H4б | ✅ | `app/lesson_irregular_verbs.tsx` — неправильные глаголы на токенах LG |
| 69 | H. Неправильные глаголы | H5 | ✅ | `app/lesson_irregular_verbs.tsx` — неправильные глаголы на токенах LG |
| 70 | I. Тренажёр предлогов | I1 | ✅ | `app/preposition_drill.tsx` — тренажёр предлогов на токенах LG |
| 71 | I. Тренажёр предлогов | I2 | ✅ | `app/preposition_drill.tsx` — тренажёр предлогов на токенах LG |
| 72 | I. Тренажёр предлогов | I3 | ✅ | `app/preposition_drill.tsx` — тренажёр предлогов на токенах LG |
| 73 | I. Тренажёр предлогов | I4 | ✅ | `app/preposition_drill.tsx` — тренажёр предлогов на токенах LG |
| 74 | I. Тренажёр предлогов | I5 | ✅ | `app/preposition_drill.tsx` — тренажёр предлогов на токенах LG |
| 75 | J. Диагностика | J1 | ✅ | `app/diagnostic_test.tsx`; `components/level-exam/ExamGlassParts.tsx` — диагностика на токенах LG |
| 76 | J. Диагностика | J2 | ✅ | `app/diagnostic_test.tsx`; `components/level-exam/ExamGlassParts.tsx` — диагностика на токенах LG |
| 77 | J. Диагностика | J3 | ✅ | `app/diagnostic_test.tsx`; `components/level-exam/ExamGlassParts.tsx` — диагностика на токенах LG |
| 78 | J. Диагностика | J4 | ✅ | `app/diagnostic_test.tsx`; `components/level-exam/ExamGlassParts.tsx` — диагностика на токенах LG |
| 79 | J. Диагностика | J5 | ✅ | `app/diagnostic_test.tsx`; `components/level-exam/ExamGlassParts.tsx` — диагностика на токенах LG |
| 80 | J. Диагностика | J6 | ✅ | `app/diagnostic_test.tsx`; `components/level-exam/ExamGlassParts.tsx` — диагностика на токенах LG |
| 81 | J. Диагностика | J7 | ✅ | `app/diagnostic_test.tsx`; `components/level-exam/ExamGlassParts.tsx` — диагностика на токенах LG |
| 82 | J. Диагностика | J8 | ✅ | `app/diagnostic_test.tsx`; `components/level-exam/ExamGlassParts.tsx` — диагностика на токенах LG |
| 83 | J. Диагностика | J9 | ✅ | `app/diagnostic_test.tsx` (a83f4a46b, +правки в дереве); `components/ThemedConfirmModal.tsx` (96c32bb97, +правки в дереве) — окно «Выйти?» через ThemedConfirmModal |
| 84 | J. Диагностика | J10 | ✅ | `app/diagnostic_test.tsx`; `components/level-exam/ExamGlassParts.tsx` — диагностика на токенах LG |
| 85 | K. Зачёт уровня | K1 | ✅ | `app/level_exam.tsx`; `components/level-exam/*` (ExamGlassParts, LevelExamV2, LevelExamIntro…) — зачёт уровня на токенах LG |
| 86 | K. Зачёт уровня | K2 | ✅ | `app/level_exam.tsx`; `components/level-exam/*` (ExamGlassParts, LevelExamV2, LevelExamIntro…) — зачёт уровня на токенах LG |
| 87 | K. Зачёт уровня | K3 | ✅ | `app/level_exam.tsx`; `components/level-exam/*` (ExamGlassParts, LevelExamV2, LevelExamIntro…) — зачёт уровня на токенах LG |
| 88 | K. Зачёт уровня | K4 | ✅ | `app/level_exam.tsx`; `components/level-exam/*` (ExamGlassParts, LevelExamV2, LevelExamIntro…) — зачёт уровня на токенах LG |
| 89 | K. Зачёт уровня | K5 | ✅ | `app/level_exam.tsx`; `components/level-exam/*` (ExamGlassParts, LevelExamV2, LevelExamIntro…) — зачёт уровня на токенах LG |
| 90 | K. Зачёт уровня | K5б | ✅ | `app/level_exam.tsx`; `components/level-exam/*` (ExamGlassParts, LevelExamV2, LevelExamIntro…) — зачёт уровня на токенах LG |
| 91 | K. Зачёт уровня | K6 | ✅ | `app/level_exam.tsx`; `components/level-exam/*` (ExamGlassParts, LevelExamV2, LevelExamIntro…) — зачёт уровня на токенах LG |
| 92 | K. Зачёт уровня | K7 | ✅ | `app/level_exam.tsx`; `components/level-exam/*` (ExamGlassParts, LevelExamV2, LevelExamIntro…) — зачёт уровня на токенах LG |
| 93 | K. Зачёт уровня | K8 | ✅ | `app/level_exam.tsx` (ac9c8e31d, +правки в дереве); `components/ThemedConfirmModal.tsx` (96c32bb97, +правки в дереве) — окно «Выйти?» через ThemedConfirmModal |
| 94 | L. Финальный экзамен | L1 | ✅ | `app/exam.tsx` — финальный экзамен на токенах LG; выход через ThemedConfirmModal вместо Alert.alert |
| 95 | L. Финальный экзамен | L2 | ✅ | `app/exam.tsx` — финальный экзамен на токенах LG; выход через ThemedConfirmModal вместо Alert.alert |
| 96 | L. Финальный экзамен | L3 | ✅ | `app/exam.tsx` — финальный экзамен на токенах LG; выход через ThemedConfirmModal вместо Alert.alert |
| 97 | L. Финальный экзамен | L4 | ✅ | `app/exam.tsx` — финальный экзамен на токенах LG; выход через ThemedConfirmModal вместо Alert.alert |
| 98 | L. Финальный экзамен | L5 | ✅ | `app/exam.tsx` — финальный экзамен на токенах LG; выход через ThemedConfirmModal вместо Alert.alert |
| 99 | L. Финальный экзамен | L6 | ✅ | `app/exam.tsx` — финальный экзамен на токенах LG; выход через ThemedConfirmModal вместо Alert.alert |
| 100 | L. Финальный экзамен | L7 | ✅ | `app/exam.tsx` — финальный экзамен на токенах LG; выход через ThemedConfirmModal вместо Alert.alert |
| 101 | L. Финальный экзамен | L8 | ✅ | `app/exam.tsx` — финальный экзамен на токенах LG; выход через ThemedConfirmModal вместо Alert.alert |
| 102 | L. Финальный экзамен | L9 | ✅ | `components/CertificateNameModal.tsx` (c9497a68e) — окно имени на награде на LG (c9497a68e) |
| 103 | L. Финальный экзамен | L10 | ✅ | `app/exam.tsx` — финальный экзамен на токенах LG; выход через ThemedConfirmModal вместо Alert.alert |

## learning-v2.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | Карта — вариант А «Лента-змейка» | Лента урока 1 · занятия 5–11 | ✅ | `components/learning-v2/LearningV2PulseCourse.tsx`; `components/learning-v2/LearningV2Glass.tsx` — вариант А переведён на токены LG (узлы: пройден/текущий/следующий/закрыт, дужка, звёзды 3 шт., плашки, «Все уроки»/«Текущая»); в приложении сейчас не подключён (в lessons.tsx боевой вариант Б) |
| 2 | Карта — вариант А «Лента-змейка» | Текущий узел ушёл с экрана — кнопка «Текущая» | ✅ | `components/learning-v2/LearningV2PulseCourse.tsx`; `components/learning-v2/LearningV2Glass.tsx` — вариант А переведён на токены LG (узлы: пройден/текущий/следующий/закрыт, дужка, звёзды 3 шт., плашки, «Все уроки»/«Текущая»); в приложении сейчас не подключён (в lessons.tsx боевой вариант Б) |
| 3 | Карта — вариант Б «Главы» | Урок 1 · глава 2 раскрыта | ✅ | `components/learning-v2/LearningV2ChaptersCourse.tsx`; `components/learning-v2/LearningV2Glass.tsx` — вариант Б: карточки глав (плитка 55, «N/8», дорожка), раскрытая глава — сетка узлов 4 в ряд со звёздами; логика выбора урока/глав не менялась |
| 4 | Карта — вариант В «Список уроков» | Курс · урок 1 раскрыт | ➖ | `components/learning-v2/horizons/LearningV2Horizons.tsx` — вариант В «Список уроков» в приложении не подключён и не перерисован (боевой список — «Все уроки» вариант Б + LessonsListGlass) | — не применимо: владелец выбрал вариант Б
| 5 | Состояния карты, первый вход, «Все уроки», тосты | Легенда состояний узла | ✅ | `components/learning-v2/LearningV2ChaptersCourse.tsx`; `components/learning-v2/LearningV2Glass.tsx` — состояния узла (пройден/текущий/следующий/закрыт/Plus, кубок) задаёт lv2NodePaint; отдельного экрана-легенды в приложении нет — это справка макета |
| 6 | Состояния карты, первый вход, «Все уроки», тосты | Первый вход — занятие 1 текущее | ✅ | `components/learning-v2/LearningV2ChaptersCourse.tsx`; `components/learning-v2/LearningV2Glass.tsx` — первый вход: занятие 1 текущее — та же сетка узлов |
| 7 | Состояния карты, первый вход, «Все уроки», тосты | Все уроки — уровни и «Обучение» (старые уроки) | ✅ | `components/learning-v2/LearningV2ChaptersCourse.tsx`; `app/(tabs)/lessons.tsx` — «Все уроки»: уровни и «Обучение» на LessonsListGlass через renderLessonCard; запасная строка урока на токенах LG |
| 8 | Состояния карты, первый вход, «Все уроки», тосты | Тост «Урок ещё в работе» | ✅ | `app/(tabs)/lessons.tsx` — тост-отказ: плита стекла, радиус 18, кромка 1 px, текст 15/600, над подвалом (bottom 130) |
| 9 | Состояния карты, первый вход, «Все уроки», тосты | Тост «Пройди урок 2, чтобы открыть этот» | ✅ | `app/(tabs)/lessons.tsx` — тост-отказ: плита стекла, радиус 18, кромка 1 px, текст 15/600, над подвалом (bottom 130) |
| 10 | Окна карты — модалка занятия и ранний доступ | Новое занятие | ✅ | `components/LearningV2SessionOutcomeSheet.tsx`; `components/learning-v2/LearningV2Glass.tsx` — модалка занятия: шайба с цоколем, «СЕССИЯ · ГЛАВА», три факта, «Начать/Повторить», «Сразу к практике» |
| 11 | Окна карты — модалка занятия и ранний доступ | Пройденное — «Повторить» | ✅ | `components/LearningV2SessionOutcomeSheet.tsx`; `components/learning-v2/LearningV2Glass.tsx` — модалка занятия: шайба с цоколем, «СЕССИЯ · ГЛАВА», три факта, «Начать/Повторить», «Сразу к практике» |
| 12 | Окна карты — модалка занятия и ранний доступ | Проверка главы | ✅ | `components/LearningV2SessionOutcomeSheet.tsx`; `components/learning-v2/LearningV2Glass.tsx` — модалка занятия: шайба с цоколем, «СЕССИЯ · ГЛАВА», три факта, «Начать/Повторить», «Сразу к практике» |
| 13 | Окна карты — модалка занятия и ранний доступ | Закрытое занятие | ✅ | `components/LearningV2SessionOutcomeSheet.tsx`; `components/learning-v2/LearningV2Glass.tsx` — модалка занятия: шайба с цоколем, «СЕССИЯ · ГЛАВА», три факта, «Начать/Повторить», «Сразу к практике»; добавлен проп locked (тёмная шайба с замком) — вид готов, в потоке закрытые занятия по-прежнему дают тост, модалка для них не открывается |
| 14 | Окна карты — модалка занятия и ранний доступ | Занятие Plus | ✅ | `components/LearningV2SessionOutcomeSheet.tsx`; `components/learning-v2/LearningV2Glass.tsx` — модалка занятия: шайба с цоколем, «СЕССИЯ · ГЛАВА», три факта, «Начать/Повторить», «Сразу к практике»; добавлен проп locked (тёмная шайба с замком) — вид готов, в потоке закрытые занятия по-прежнему дают тост, модалка для них не открывается |
| 15 | Окна карты — модалка занятия и ранний доступ | Ранний доступ — Founder Pass | ✅ | `components/learning-v2/LearningV2FounderPassModal.tsx`; `components/learning-v2/LearningV2Glass.tsx` — Founder Pass: плита пропуска и плита отзыва на токенах, без золотых градиентов, общий Lv2Cta |
| 16 | Словарь курса | Слова и поиск | ✅ | `components/learning-v2/LearningV2LessonDictionaryOverlayV1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — словарь: заголовок 34/700, «Открыто: N», поиск 46 dp (показывается от 12 слов — правило данных), секции по урокам, пусто/«Ничего не нашлось» |
| 17 | Словарь курса | Ввод в поиске | ✅ | `components/learning-v2/LearningV2LessonDictionaryOverlayV1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — словарь: заголовок 34/700, «Открыто: N», поиск 46 dp (показывается от 12 слов — правило данных), секции по урокам, пусто/«Ничего не нашлось» |
| 18 | Словарь курса | Пусто | ✅ | `components/learning-v2/LearningV2LessonDictionaryOverlayV1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — словарь: заголовок 34/700, «Открыто: N», поиск 46 dp (показывается от 12 слов — правило данных), секции по урокам, пусто/«Ничего не нашлось» |
| 19 | Словарь курса | Ничего не нашлось | ✅ | `components/learning-v2/LearningV2LessonDictionaryOverlayV1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — словарь: заголовок 34/700, «Открыто: N», поиск 46 dp (показывается от 12 слов — правило данных), секции по урокам, пусто/«Ничего не нашлось» |
| 20 | Энергия (Free 5 / Plus не тратит) | Старт занятия: 5 → 4 | ✅ | `components/EnergyBar.tsx`; `app/learning_v2_direct_session_player_v1.tsx` — пилюля энергии (проп glass) в шапке интро и занятия; число анимирует AnimatedEnergyNumber; трата — в гейте, не менялась |
| 21 | Энергия (Free 5 / Plus не тратит) | Энергия закончилась | ✅ | `components/NoEnergyModal.tsx`; `app/learning_v2_session_intro.tsx` — окно «Энергия закончилась» уже на LG; интро под ним теперь тоже на токенах |
| 22 | Энергия (Free 5 / Plus не тратит) | Plus — энергии нет | ✅ | `components/EnergyBar.tsx` — у Plus EnergyBar сам не рисуется — пилюли энергии нет |
| 23 | Интро занятия — 3 страницы и вход в проверку | СМЫСЛ — вопрос, «Дальше» ждёт ответа | ✅ | `app/learning_v2_session_intro.tsx`; `components/learning-v2/LearningV2Glass.tsx` — интро: шапка (✕, метка стадии, N/3, сердца, энергия), сегменты, «know»-карточка, варианты A/B/C с вердиктом (две ошибки остаются красными), «Дальше» — Lv2Cta; app/learning_v2_session_intro_check.tsx — старый dev-экран, к боевому пути не подключён, не тронут |
| 24 | Интро занятия — 3 страницы и вход в проверку | СХЕМА — ответ верный | ✅ | `app/learning_v2_session_intro.tsx`; `components/learning-v2/LearningV2Glass.tsx` — интро: шапка (✕, метка стадии, N/3, сердца, энергия), сегменты, «know»-карточка, варианты A/B/C с вердиктом (две ошибки остаются красными), «Дальше» — Lv2Cta; app/learning_v2_session_intro_check.tsx — старый dev-экран, к боевому пути не подключён, не тронут |
| 25 | Интро занятия — 3 страницы и вход в проверку | ЛОВУШКА — две ошибки, объяснение | ✅ | `app/learning_v2_session_intro.tsx`; `components/learning-v2/LearningV2Glass.tsx` — интро: шапка (✕, метка стадии, N/3, сердца, энергия), сегменты, «know»-карточка, варианты A/B/C с вердиктом (две ошибки остаются красными), «Дальше» — Lv2Cta; app/learning_v2_session_intro_check.tsx — старый dev-экран, к боевому пути не подключён, не тронут |
| 26 | Интро занятия — 3 страницы и вход в проверку | Вход в проверку главы (занятие 8) | ✅ | `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — вход в проверку главы / экзамен урока: плитка 140 с кубком, заголовок 30/700, пояснение, «Начать проверку»; плашки «Подсказки выключены» в данных нет — не рисуется |
| 27 | Интро занятия — 3 страницы и вход в проверку | Вход в итоговый экзамен (занятие 56) | ✅ | `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — вход в проверку главы / экзамен урока: плитка 140 с кубком, заголовок 30/700, пояснение, «Начать проверку»; плашки «Подсказки выключены» в данных нет — не рисуется |
| 28 | Собери фразу (phrase_builder) — любимая механика | Вопрос | ✅ | `modules/learning-v2/modes/phrase_builder_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — собери фразу: перевод 28/700 + звук, строка ответа, чипы 46 dp (верно/неверно/подсказка), «Проверить» — Lv2Cta, разбор — Lv2Explain; шапка/подвал плеера на токенах |
| 29 | Собери фразу (phrase_builder) — любимая механика | Собрано — «Проверить» активна | ✅ | `modules/learning-v2/modes/phrase_builder_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — собери фразу: перевод 28/700 + звук, строка ответа, чипы 46 dp (верно/неверно/подсказка), «Проверить» — Lv2Cta, разбор — Lv2Explain; шапка/подвал плеера на токенах |
| 30 | Собери фразу (phrase_builder) — любимая механика | Верно — волна по чипам, «Дальше» | ✅ | `modules/learning-v2/modes/phrase_builder_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — собери фразу: перевод 28/700 + звук, строка ответа, чипы 46 dp (верно/неверно/подсказка), «Проверить» — Lv2Cta, разбор — Lv2Explain; шапка/подвал плеера на токенах |
| 31 | Собери фразу (phrase_builder) — любимая механика | Неверно — чип подсвечен и вернётся в банк | ✅ | `modules/learning-v2/modes/phrase_builder_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — собери фразу: перевод 28/700 + звук, строка ответа, чипы 46 dp (верно/неверно/подсказка), «Проверить» — Lv2Cta, разбор — Lv2Explain; шапка/подвал плеера на токенах |
| 32 | Собери фразу (phrase_builder) — любимая механика | Подсказка — вторая ошибка: разбор, порядок собран | ✅ | `modules/learning-v2/modes/phrase_builder_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — собери фразу: перевод 28/700 + звук, строка ответа, чипы 46 dp (верно/неверно/подсказка), «Проверить» — Lv2Cta, разбор — Lv2Explain; шапка/подвал плеера на токенах |
| 33 | Слушай и выбирай (listen_choose) | Вопрос — до прослушивания | ✅ | `modules/learning-v2/modes/listen_choose_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — слушай и выбирай: play 104 с кольцом, подпись состояния звука, варианты-плиты с отметкой, разбор |
| 34 | Слушай и выбирай (listen_choose) | Звучит… | ✅ | `modules/learning-v2/modes/listen_choose_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — слушай и выбирай: play 104 с кольцом, подпись состояния звука, варианты-плиты с отметкой, разбор |
| 35 | Слушай и выбирай (listen_choose) | Верно — фраза раскрыта | ✅ | `modules/learning-v2/modes/listen_choose_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — слушай и выбирай: play 104 с кольцом, подпись состояния звука, варианты-плиты с отметкой, разбор |
| 36 | Слушай и выбирай (listen_choose) | Неверно — первая ошибка | ✅ | `modules/learning-v2/modes/listen_choose_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — слушай и выбирай: play 104 с кольцом, подпись состояния звука, варианты-плиты с отметкой, разбор |
| 37 | Слушай и выбирай (listen_choose) | Подсказка — вторая ошибка, разбор | ✅ | `modules/learning-v2/modes/listen_choose_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — слушай и выбирай: play 104 с кольцом, подпись состояния звука, варианты-плиты с отметкой, разбор |
| 38 | Диктант-конструктор (listen_build_dictation) | Вопрос — текст скрыт | ✅ | `modules/learning-v2/modes/listen_build_dictation_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — диктант: play с кольцом, текст скрыт до верного, банк слов, разбор |
| 39 | Диктант-конструктор (listen_build_dictation) | Верно — фраза раскрыта | ✅ | `modules/learning-v2/modes/listen_build_dictation_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — диктант: play с кольцом, текст скрыт до верного, банк слов, разбор |
| 40 | Диктант-конструктор (listen_build_dictation) | Неверно — первая ошибка | ✅ | `modules/learning-v2/modes/listen_build_dictation_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — диктант: play с кольцом, текст скрыт до верного, банк слов, разбор |
| 41 | Диктант-конструктор (listen_build_dictation) | Подсказка — разбор, порядок собран | ✅ | `modules/learning-v2/modes/listen_build_dictation_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — диктант: play с кольцом, текст скрыт до верного, банк слов, разбор |
| 42 | Точная грамматика (context_gap_grammar) | Вопрос | ✅ | `modules/learning-v2/modes/context_gap_grammar_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — точная грамматика: сцена, пропуск-плашка (выбран/верно/неверно), три варианта-плиты столбцом, разбор |
| 43 | Точная грамматика (context_gap_grammar) | Выбран вариант — пропуск заполнен | ✅ | `modules/learning-v2/modes/context_gap_grammar_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — точная грамматика: сцена, пропуск-плашка (выбран/верно/неверно), три варианта-плиты столбцом, разбор |
| 44 | Точная грамматика (context_gap_grammar) | Верно | ✅ | `modules/learning-v2/modes/context_gap_grammar_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — точная грамматика: сцена, пропуск-плашка (выбран/верно/неверно), три варианта-плиты столбцом, разбор |
| 45 | Точная грамматика (context_gap_grammar) | Неверно — первая ошибка | ✅ | `modules/learning-v2/modes/context_gap_grammar_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — точная грамматика: сцена, пропуск-плашка (выбран/верно/неверно), три варианта-плиты столбцом, разбор |
| 46 | Точная грамматика (context_gap_grammar) | Подсказка — разбор, верный вариант | ✅ | `modules/learning-v2/modes/context_gap_grammar_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — точная грамматика: сцена, пропуск-плашка (выбран/верно/неверно), три варианта-плиты столбцом, разбор |
| 47 | Быстрое совпадение (speed_match) | В процессе — пара найдена, выбрана левая | ✅ | `modules/learning-v2/modes/speed_match_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — быстрое совпадение: две колонки плиток 72 dp, таймер-пилюля, вспышка неверной пары, разбор |
| 48 | Быстрое совпадение (speed_match) | Неверная пара — вспышка и сброс | ✅ | `modules/learning-v2/modes/speed_match_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — быстрое совпадение: две колонки плиток 72 dp, таймер-пилюля, вспышка неверной пары, разбор |
| 49 | Быстрое совпадение (speed_match) | Время вышло | ✅ | `modules/learning-v2/modes/speed_match_mode_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — «Время вышло» — строка copy.timeout уже была; теперь карточка-пояснение с часами и двумя кнопками («Ещё раунд», «Продолжить без таймера») |
| 50 | Быстрое совпадение (speed_match) | Подсказка — вторая ошибка, разбор | ✅ | `modules/learning-v2/modes/speed_match_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — быстрое совпадение: две колонки плиток 72 dp, таймер-пилюля, вспышка неверной пары, разбор |
| 51 | Быстрое совпадение (speed_match) | Все пары найдены | ✅ | `modules/learning-v2/modes/speed_match_mode_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — «Все пары найдены» — вид: все плитки зелёные (verdict ok); отдельной строки-сообщения в данных нет, не выдумывал |
| 52 | Повтори и сравни (scripted_repeat_compare) — голос | Вопрос — ожидание | ✅ | `modules/learning-v2/modes/scripted_repeat_compare_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — повтори и сравни: эталон (кнопка с кольцом — прежнее решение владельца 26.08 сохранено, в макете пилюля), фраза 30/700, «Вы сказали» с кромкой вердикта, «Отлично сказано!» зелёным |
| 53 | Повтори и сравни (scripted_repeat_compare) — голос | Идёт запись — «Слушаю…» | ✅ | `modules/learning-v2/modes/scripted_repeat_compare_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — повтори и сравни: эталон (кнопка с кольцом — прежнее решение владельца 26.08 сохранено, в макете пилюля), фраза 30/700, «Вы сказали» с кромкой вердикта, «Отлично сказано!» зелёным |
| 54 | Повтори и сравни (scripted_repeat_compare) — голос | Верно — «Отлично сказано!» | ✅ | `modules/learning-v2/modes/scripted_repeat_compare_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — повтори и сравни: эталон (кнопка с кольцом — прежнее решение владельца 26.08 сохранено, в макете пилюля), фраза 30/700, «Вы сказали» с кромкой вердикта, «Отлично сказано!» зелёным |
| 55 | Повтори и сравни (scripted_repeat_compare) — голос | Неверно — первая ошибка | ✅ | `modules/learning-v2/modes/scripted_repeat_compare_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — повтори и сравни: эталон (кнопка с кольцом — прежнее решение владельца 26.08 сохранено, в макете пилюля), фраза 30/700, «Вы сказали» с кромкой вердикта, «Отлично сказано!» зелёным |
| 56 | Повтори и сравни (scripted_repeat_compare) — голос | Подсказка — вторая ошибка, разбор | ✅ | `modules/learning-v2/modes/scripted_repeat_compare_mode_v1.tsx`; `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — повтори и сравни: эталон (кнопка с кольцом — прежнее решение владельца 26.08 сохранено, в макете пилюля), фраза 30/700, «Вы сказали» с кромкой вердикта, «Отлично сказано!» зелёным |
| 57 | Повтори и сравни (scripted_repeat_compare) — голос | Микрофон недоступен | ✅ | `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — «Микрофон недоступен» — copy.voicePermission в карточке-пояснении со значком mic-off (текст и условие показа прежние) |
| 58 | Повтори и сравни (scripted_repeat_compare) — голос | Голосовой ответ недоступен | ✅ | `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — «Голосовой ответ недоступен» — copy.voiceUnavailable в карточке-пояснении (cloud-offline) |
| 59 | Повтори и сравни (scripted_repeat_compare) — голос | Не удалось записать ответ | ✅ | `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — «Не удалось записать ответ» — copy.voiceFailed в карточке-пояснении |
| 60 | Окна внутри занятия | Новое слово — 1 из 4 | ✅ | `components/learning-v2/LearningV2NewWordEncounterOverlay.tsx`; `components/learning-v2/LearningV2Glass.tsx` — новое слово: плита стекла, затемнение фона, «Новое слово · N из M», определение 17/24, подсказка-пульс, «Продолжить», статус сохранения — карточка-пояснение (галочка/лампочка) |
| 61 | Окна внутри занятия | Перевёрнута и сохранена в карточки | ✅ | `components/learning-v2/LearningV2NewWordEncounterOverlay.tsx`; `components/learning-v2/LearningV2Glass.tsx` — новое слово: плита стекла, затемнение фона, «Новое слово · N из M», определение 17/24, подсказка-пульс, «Продолжить», статус сохранения — карточка-пояснение (галочка/лампочка) |
| 62 | Окна внутри занятия | Не сохранилось | ✅ | `components/learning-v2/LearningV2NewWordEncounterOverlay.tsx`; `components/learning-v2/LearningV2Glass.tsx` — новое слово: плита стекла, затемнение фона, «Новое слово · N из M», определение 17/24, подсказка-пульс, «Продолжить», статус сохранения — карточка-пояснение (галочка/лампочка) |
| 63 | Окна внутри занятия | Карман слов | ✅ | `components/learning-v2/LearningV2WordPocketOverlayV1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — карман слов: заголовок 34/700, «Открыто: N», строки-карточки 88 dp со звуком и закладкой, пусто |
| 64 | Окна внутри занятия | Карман слов — пусто | ✅ | `components/learning-v2/LearningV2WordPocketOverlayV1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — карман слов: заголовок 34/700, «Открыто: N», строки-карточки 88 dp со звуком и закладкой, пусто |
| 65 | Окна внутри занятия | Попытки закончились | ✅ | `components/session_attempts/SessionAttemptsRecoveryModal.tsx`; `components/learning-v2/LearningV2Glass.tsx` — «Попытки закончились»: три погасших сердца, заголовок 25/800, кнопки-пилюли (главная — за руны), «Завершить» тихой кнопкой |
| 66 | Окна внутри занятия | Тост первого сохранения | ✅ | `components/learning-v2/LearningV2NewWordEncounterOverlay.tsx`; `components/learning-v2/LearningV2Glass.tsx` — отдельного тоста «первого сохранения» в приложении нет — его роль играет статус сохранения в окне слова (карточка-пояснение с галочкой); новый тост не выдумывал |
| 67 | Окна внутри занятия | Скелет — пока подтверждается энергия | ✅ | `app/learning-v2/session/[id].tsx`; `components/learning-v2/LearningV2Glass.tsx` — скелет ожидания энергии: фон/кнопка/дорожка на токенах, добавлена заглушка пилюли попыток; геометрия шапки как у плеера |
| 68 | Окна внутри занятия | Сессия недоступна | ✅ | `app/learning_v2_direct_session_player_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — «Сессия недоступна»: облако, заголовок 22/700, «Назад» контурной кнопкой |
| 69 | Итог занятия — единый экран завершения | Занятие пройдено, есть ошибки | ✅ | `components/learning-v2/horizons/HorizonSessionResult.tsx`; `components/learning-v2/horizons/HorizonMistakeReview.tsx`; `components/learning-v2/LearningV2Glass.tsx` — обвязка итога (шапка, карточка отзыва, разбор ошибок) на токенах LG; анимированное ядро ResultsSequence — общее для приложения, не перерисовано (нет карточки «верно/ошибок/точность» и блока «Что вы теперь умеете» как в макете) | — [30.09 закрыто] HorizonResultGlass / карта Б (413fd2538, bd9774765)
| 70 | Итог занятия — единый экран завершения | Без ошибок, оценка раскрыта | ✅ | `components/learning-v2/horizons/HorizonSessionResult.tsx`; `components/learning-v2/horizons/HorizonMistakeReview.tsx`; `components/learning-v2/LearningV2Glass.tsx` — обвязка итога (шапка, карточка отзыва, разбор ошибок) на токенах LG; анимированное ядро ResultsSequence — общее для приложения, не перерисовано (нет карточки «верно/ошибок/точность» и блока «Что вы теперь умеете» как в макете) | — [30.09 закрыто] HorizonResultGlass / карта Б (413fd2538, bd9774765)
| 71 | Итог занятия — единый экран завершения | Проверка главы — «Глава закрыта» | ✅ | `components/learning-v2/horizons/HorizonSessionResult.tsx`; `components/learning-v2/horizons/HorizonMistakeReview.tsx`; `components/learning-v2/LearningV2Glass.tsx` — обвязка итога (шапка, карточка отзыва, разбор ошибок) на токенах LG; анимированное ядро ResultsSequence — общее для приложения, не перерисовано (нет карточки «верно/ошибок/точность» и блока «Что вы теперь умеете» как в макете) | — [30.09 закрыто] HorizonResultGlass / карта Б (413fd2538, bd9774765)
| 72 | Итог занятия — единый экран завершения | Экзамен урока — следующий открыт | ✅ | `components/learning-v2/horizons/HorizonSessionResult.tsx`; `components/learning-v2/horizons/HorizonMistakeReview.tsx`; `components/learning-v2/LearningV2Glass.tsx` — обвязка итога (шапка, карточка отзыва, разбор ошибок) на токенах LG; анимированное ядро ResultsSequence — общее для приложения, не перерисовано (нет карточки «верно/ошибок/точность» и блока «Что вы теперь умеете» как в макете) | — [30.09 закрыто] HorizonResultGlass / карта Б (413fd2538, bd9774765)
| 73 | Итог занятия — единый экран завершения | Экзамен урока — следующий ещё в работе | ✅ | `components/learning-v2/horizons/HorizonSessionResult.tsx`; `components/learning-v2/horizons/HorizonMistakeReview.tsx`; `components/learning-v2/LearningV2Glass.tsx` — обвязка итога (шапка, карточка отзыва, разбор ошибок) на токенах LG; анимированное ядро ResultsSequence — общее для приложения, не перерисовано (нет карточки «верно/ошибок/точность» и блока «Что вы теперь умеете» как в макете) | — [30.09 закрыто] HorizonResultGlass / карта Б (413fd2538, bd9774765)
| 74 | Итог занятия — единый экран завершения | Повтор — без повторного начисления | ✅ | `components/learning-v2/horizons/HorizonSessionResult.tsx`; `components/learning-v2/horizons/HorizonMistakeReview.tsx`; `components/learning-v2/LearningV2Glass.tsx` — обвязка итога (шапка, карточка отзыва, разбор ошибок) на токенах LG; анимированное ядро ResultsSequence — общее для приложения, не перерисовано (нет карточки «верно/ошибок/точность» и блока «Что вы теперь умеете» как в макете) | — [30.09 закрыто] HorizonResultGlass / карта Б (413fd2538, bd9774765)
| 75 | Анимации — живые | Прохождение узла + полёт монет | ✅ | `components/LearningV2RuneFlight.tsx`; `components/LearningV2MapNode.tsx` — полёт наград есть (без палитры); переход узла в «пройден» живёт только на неподключённой карте А, у боевой карты Б анимации узла нет | — [30.09 закрыто] HorizonResultGlass / карта Б (413fd2538, bd9774765)
| 76 | Анимации — живые | Раскрытие карты | ✅ | `components/learning-v2/LearningV2ChaptersCourse.tsx` — у боевой карты Б нет вступительного раскрытия — анимация есть только у неподключённой карты А | — [30.09 закрыто] HorizonResultGlass / карта Б (413fd2538, bd9774765)
| 77 | Анимации — живые | Сборка фразы — чипы перелетают | ✅ | `modules/learning-v2/modes/phrase_builder_mode_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — перелёт/посадка чипов — прежняя анимация (spring), чипы теперь на токенах |
| 78 | Анимации — живые | Верно — волна по чипам | ✅ | `modules/learning-v2/modes/phrase_builder_mode_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — верно — волна по чипам (okPop) на зелёной заливке |
| 79 | Анимации — живые | Неверно — тонировка и возврат | ✅ | `modules/learning-v2/modes/phrase_builder_mode_v1.tsx`; `components/learning-v2/LearningV2Glass.tsx` — неверно — толчок и красная тонировка чипа, возврат в банк |
| 80 | Анимации — живые | Потеря попытки — сердце гаснет | ✅ | `components/session_attempts/SessionAttemptsHud.tsx`; `app/learning_v2_direct_session_player_v1.tsx` — потеря попытки — сердце гаснет (прежняя анимация), пилюля попыток на стекле (проп glassPill) |
| 81 | Анимации — живые | Новое слово улетает в «Слова» | ✅ | `components/learning-v2/LearningV2NewWordEncounterOverlay.tsx` — слово улетает в «Слова» — прежний полёт в карман, окно на токенах |
| 82 | Анимации — живые | Переход к следующему заданию | ✅ | `app/learning_v2_direct_session_player_v1.tsx` — переход к следующему заданию — SlideInRight/SlideOutLeft 110 мс (прежний), без изменений |

## community.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | Вкладка и Шпиль | вкладка сообщества | ✅ | `app/(tabs)/community.tsx` (3e525984c); `components/v2/V2SegmentedControl.tsx` (44a4ceb37) — сегменты «Друзья/Наборы» на LG; «Шпиль» скрыт флагом |
| 2 | Вкладка и Шпиль | Шпиль · топ-3 | ✅ | `components/spire/SpirePodium.tsx` (3e525984c); `components/spire/SpireHomeScreen.tsx` (3e525984c) — Шпиль: V2-палитра, данные «—», флаг выключен — [30.09 перенос] Шпиль: `components/spire/useSpirePalette.ts` (токены стекла) во всех экранах; данные «—» и флаг выключен — как были (30.09) |
| 3 | Вкладка и Шпиль | все участники · offline-safe | ✅ | `components/spire/SpireAllMembers.tsx` (3e525984c) — все участники — заглушки, V2-палитра — [30.09 перенос] `SpireAllMembers` на useSpirePalette (30.09) |
| 4 | Вкладка и Шпиль | правила Шпиля · шторка | ✅ | `components/spire/SpireRulesSheet.tsx` (не закоммичен) — шторка HybridSheetShell liquid-glass-opaque, 8 правил, числа монет из config/spire_v1; кнопка «i» в шапке Шпиля — [30.09 Шпиль-игра] за выключенным флагом `spire_tab_enabled` + `config/spire_v1.enabled`; на устройстве не проверено |
| 5 | Вкладка и Шпиль | итог недели · анимация | ✅ | искал итог недели Шпиля (анимация) — нет — [30.09 перенос] Итога недели (анимация) нет — нужна новая логика — не делали | — [30.09 закрыто] SpireWeekResultCard (карточка — решение владельца) + анимация монеты
| 6 | Друзья | список и заявки | ✅ | `app/(tabs)/friends.tsx` (5249a7a6e); `components/friends/FriendsGlassKit.tsx` (5249a7a6e) — вкладка «Друзья» на FriendsGlassKit (5249a7a6e) |
| 7 | Друзья | добавить друга · центрированное окно | ✅ | `app/(tabs)/friends.tsx` (5249a7a6e); `components/friends/FriendsGlassKit.tsx` (5249a7a6e) — вкладка «Друзья» на FriendsGlassKit (5249a7a6e) |
| 8 | Друзья | поиск · скелетон | ✅ | `app/(tabs)/friends.tsx` (5249a7a6e); `components/friends/FriendsGlassKit.tsx` (5249a7a6e) — вкладка «Друзья» на FriendsGlassKit (5249a7a6e) |
| 9 | Друзья | профиль найден | ✅ | `app/(tabs)/friends.tsx` (5249a7a6e); `components/friends/FriendsGlassKit.tsx` (5249a7a6e) — вкладка «Друзья» на FriendsGlassKit (5249a7a6e) |
| 10 | Друзья | отправка заявки | ✅ | `app/(tabs)/friends.tsx` (5249a7a6e); `components/friends/FriendsGlassKit.tsx` (5249a7a6e) — вкладка «Друзья» на FriendsGlassKit (5249a7a6e) |
| 11 | Друзья | заявку не удалось отправить | ✅ | `app/(tabs)/friends.tsx` (5249a7a6e); `components/friends/FriendsGlassKit.tsx` (5249a7a6e) — вкладка «Друзья» на FriendsGlassKit (5249a7a6e) |
| 12 | Друзья | ник или код не найден | ✅ | `app/(tabs)/friends.tsx` (5249a7a6e); `components/friends/FriendsGlassKit.tsx` (5249a7a6e) — вкладка «Друзья» на FriendsGlassKit (5249a7a6e) |
| 13 | Друзья | свой профиль | ✅ | `app/(tabs)/friends.tsx` (5249a7a6e); `components/friends/FriendsGlassKit.tsx` (5249a7a6e) — вкладка «Друзья» на FriendsGlassKit (5249a7a6e) |
| 14 | Друзья | профиль ещё не синхронизирован | ✅ | `app/(tabs)/friends.tsx` (5249a7a6e) — «профиль ещё не синхронизирован» есть в тексте, LG не подтверждён — [30.09 перенос] Показ идёт через FriendsFeedbackRow (glass) в модалке добавления — правок не потребовалось |
| 15 | Друзья | поиск · нет связи | ✅ | `app/(tabs)/friends.tsx` (5249a7a6e); `components/friends/FriendsGlassKit.tsx` (5249a7a6e) — вкладка «Друзья» на FriendsGlassKit (5249a7a6e) |
| 16 | Друзья | поиск · другая ошибка | ✅ | `app/(tabs)/friends.tsx` (5249a7a6e); `components/friends/FriendsGlassKit.tsx` (5249a7a6e) — вкладка «Друзья» на FriendsGlassKit (5249a7a6e) |
| 17 | Друзья | заявка отправлена | ✅ | `app/(tabs)/friends.tsx` (5249a7a6e); `components/friends/FriendsGlassKit.tsx` (5249a7a6e) — вкладка «Друзья» на FriendsGlassKit (5249a7a6e) |
| 18 | Друзья | уже друзья | ✅ | `app/(tabs)/friends.tsx` (5249a7a6e); `components/friends/FriendsGlassKit.tsx` (5249a7a6e) — вкладка «Друзья» на FriendsGlassKit (5249a7a6e) |
| 19 | Друзья | заявка уже отправлена | ✅ | `app/(tabs)/friends.tsx` (5249a7a6e); `components/friends/FriendsGlassKit.tsx` (5249a7a6e) — вкладка «Друзья» на FriendsGlassKit (5249a7a6e) |
| 20 | Друзья | пустой список | ✅ | `app/(tabs)/friends.tsx` (5249a7a6e); `components/friends/FriendsGlassKit.tsx` (5249a7a6e) — вкладка «Друзья» на FriendsGlassKit (5249a7a6e) |
| 21 | Друзья | ошибка обновления / офлайн | ✅ | `app/(tabs)/friends.tsx` (5249a7a6e) — ошибка обновления/офлайн: явной плашки LG не нашёл — [30.09 перенос] В `friends.tsx` нет состояния «ошибка обновления/офлайн» (нет источника) — нужна логика, не делали | — [30.09 закрыто] FriendsEmptyState error + friendsAccountStore.retry
| 22 | Друзья | приглашение на занятие · модалка | ✅ | `components/friends_together/FriendStudyInviteModal.tsx` (f5a01076d, +правки в дереве) — приглашение на занятие на LG |
| 23 | Друзья | активность и опрос дня | ✅ | `app/(tabs)/friends.tsx` (5249a7a6e) — активность друзей есть; опроса дня в вкладке не нашёл — [30.09 перенос] Опроса дня в вкладке нет — нужна логика, не делали | — [30.09 закрыто] DailyPollCard + dailyPollVote + админка (f8b8f5487)
| 24 | Друзья | подтверждение удаления | ✅ | `components/friends_together/FriendTogetherSheet.tsx` (3376f0653, +правки в дереве) — удаление из друзей без LG-токенов — [30.09 перенос] Подтверждение — `ThemedConfirmModal` (glass); шторка друга `FriendTogetherSheet` на useLv2Glass + liquid-glass-opaque (30.09) |
| 25 | Наборы сообщества | каталог наборов | ✅ | `app/flashcards_packs.tsx` (bfdc8e783, +правки в дереве); `app/flashcards/FlashcardsCategoryHub.tsx` (8d38d6733, +правки в дереве) — каталог наборов на liquidGlassTokens |

## profile.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | Профиль и основные настройки | настройки | ✅ | `app/(tabs)/settings.tsx` (bcb41f875); `components/settings/SettingsGlassRows.tsx` (bcb41f875) — корень настроек PRF-01 (bcb41f875) |
| 2 | Профиль и основные настройки | данные аккаунта | ✅ | `app/account_details.tsx` (be24d52dc) — данные аккаунта на LG (be24d52dc) |
| 3 | Профиль и основные настройки | смена имени · шторка | ✅ | `components/account/NicknameEditModal.tsx` (e8a8c8220) — смена имени на LG (e8a8c8220); ошибки — нативный Alert |
| 4 | Профиль и основные настройки | языки | ✅ | `app/settings_language.tsx` (50eea79a4, +правки в дереве) — язык интерфейса PRF-03 |
| 5 | Профиль и основные настройки | выбор языка изучения · шторка | ✅ | `components/settings/StudyLanguagePicker.tsx` (6c02e4088) — шторка выбора языка изучения без LG-токенов — [30.09 перенос] `components/settings/StudyLanguagePicker.tsx` на liquidGlassTokens (30.09) |
| 6 | Обучение и внешний вид | уведомления | ✅ | `app/settings_notifications.tsx` (ddf8e551e, +правки в дереве) — уведомления PRF-04 + окно времени |
| 7 | Обучение и внешний вид | обучение и озвучка | ✅ | `app/settings_edu.tsx` (0217c4a21, +правки в дереве) — обучение и озвучка PRF-05 |
| 8 | Обучение и внешний вид | тёмные темы | ✅ | `app/settings_themes.tsx` (be24d52dc) — 13 тем на LG (be24d52dc) |
| 9 | Обучение и внешний вид | приватность и данные · выключено | ✅ | `app/privacy_settings.tsx` (6c02e4088, +правки в дереве) — приватность PRF-07 (выкл/вкл) |
| 10 | Обучение и внешний вид | приватность и данные · включено | ✅ | `app/privacy_settings.tsx` (6c02e4088, +правки в дереве) — приватность PRF-07 (выкл/вкл) |
| 11 | Обучение и внешний вид | Privacy Policy · прокручиваемый документ | ✅ | `components/legal/LegalDocumentSheet.tsx` (не закоммичен); `app/privacy_screen.tsx` (f5a01076d, +правки в дереве); `app/terms_screen.tsx` (f5a01076d, +правки в дереве) — документы в стеклянном листе PRF-07-DOC/08 |
| 12 | Обучение и внешний вид | Terms · прокручиваемый документ | ✅ | `components/legal/LegalDocumentSheet.tsx` (не закоммичен); `app/privacy_screen.tsx` (f5a01076d, +правки в дереве); `app/terms_screen.tsx` (f5a01076d, +правки в дереве) — документы в стеклянном листе PRF-07-DOC/08 |
| 13 | Помощь и подписка | форма поддержки · пусто | ✅ | `app/support_report.tsx` (0217c4a21, +правки в дереве) — форма поддержки PRF-09 (пусто/диагностика/отправлено) |
| 14 | Помощь и подписка | форма поддержки · диагностика раскрыта | ✅ | `app/support_report.tsx` (0217c4a21, +правки в дереве) — форма поддержки PRF-09 (пусто/диагностика/отправлено) |
| 15 | Помощь и подписка | форма поддержки · отправлено | ✅ | `app/support_report.tsx` (0217c4a21, +правки в дереве) — форма поддержки PRF-09 (пусто/диагностика/отправлено) |
| 16 | Помощь и подписка | статический пример · годовая подписка | ✅ | `app/manage_subscription.tsx` (41648d48d, +правки в дереве) — управление подпиской: год/месяц/разовая/загрузка |
| 17 | Помощь и подписка | статический пример · месячная подписка | ✅ | `app/manage_subscription.tsx` (41648d48d, +правки в дереве) — управление подпиской: год/месяц/разовая/загрузка |
| 18 | Помощь и подписка | статический пример · разовая покупка | ✅ | `app/manage_subscription.tsx` (41648d48d, +правки в дереве) — управление подпиской: год/месяц/разовая/загрузка |
| 19 | Помощь и подписка | статический пример · загрузка данных магазина | ✅ | `app/manage_subscription.tsx` (41648d48d, +правки в дереве) — управление подпиской: год/месяц/разовая/загрузка |
| 20 | Помощь и подписка | оверлей · причины отмены · ничего не выбрано | ✅ | `app/manage_subscription.tsx` (41648d48d, +правки в дереве) — вложенные окна отмены/удержания/восстановления (pack25) |
| 21 | Помощь и подписка | оверлей · причина «Другое» · ввод текста | ✅ | `app/manage_subscription.tsx` (41648d48d, +правки в дереве) — вложенные окна отмены/удержания/восстановления (pack25) |
| 22 | Помощь и подписка | оверлей удержания · реальный прогресс · демо | ✅ | `app/manage_subscription.tsx` (41648d48d, +правки в дереве) — вложенные окна отмены/удержания/восстановления (pack25) |
| 23 | Помощь и подписка | оверлей удержания · поддержка | ✅ | `app/manage_subscription.tsx` (41648d48d, +правки в дереве) — вложенные окна отмены/удержания/восстановления (pack25) |
| 24 | Помощь и подписка | оверлей восстановления · покупок не найдено | ✅ | `app/manage_subscription.tsx` (41648d48d, +правки в дереве) — вложенные окна отмены/удержания/восстановления (pack25) |
| 25 | Помощь и подписка | опрос недоступен · совместимый маршрут | ✅ | `app/survey_screen.tsx` (0217c4a21, +правки в дереве) — «Опрос недоступен» PRF-13 |
| 26 | Справочный макет · атрибуция приглашения | приглашение друга | ➖ | справочный макет приглашения (PM-202, вход закрыт) — экрана нет — [30.09 перенос] Справочный макет, вход закрыт (PM-202) — экрана нет, не делали | — не применимо: справочный макет, вход закрыт PM-202
| 27 | Проект UX · критические действия | проект UX · offline-выход | ✅ | `components/account/AccountLogoutFlow.tsx` (e8a8c8220) — выход: offline/выполняется/не доказан |
| 28 | Проект UX · критические действия | проект UX · выход выполняется | ✅ | `components/account/AccountLogoutFlow.tsx` (e8a8c8220) — выход: offline/выполняется/не доказан |
| 29 | Проект UX · критические действия | проект UX · выход не доказан | ✅ | `components/account/AccountLogoutFlow.tsx` (e8a8c8220) — выход: offline/выполняется/не доказан |
| 30 | Проект UX · критические действия | проект UX · удаление до отправки | ✅ | `components/DeleteAccountConfirmModal.tsx` (e8a8c8220) — удаление аккаунта PRF-21: подтверждение/отправлено |
| 31 | Проект UX · критические действия | проект UX · запрос отправлен | ✅ | `components/DeleteAccountConfirmModal.tsx` (e8a8c8220) — удаление аккаунта PRF-21: подтверждение/отправлено |
| 32 | Проект UX · критические действия | проект UX · ответ потерян | ✅ | `components/DeleteAccountConfirmModal.tsx` (e8a8c8220) — стадии «ответ потерян/отказ/cleanup pending» — отдельных LG-состояний не подтвердил — [30.09 перенос] Модалка удаления уже на glass; сообщения — темизированное окно на токенах (по коду, на устройстве не смотрели) |
| 33 | Проект UX · критические действия | проект UX · отказ до изменений | ✅ | `components/DeleteAccountConfirmModal.tsx` (e8a8c8220) — стадии «ответ потерян/отказ/cleanup pending» — отдельных LG-состояний не подтвердил — [30.09 перенос] Модалка удаления уже на glass; сообщения — темизированное окно (по коду) |
| 34 | Проект UX · критические действия | проект UX · credential safe, cleanup pending | ✅ | `components/DeleteAccountConfirmModal.tsx` (e8a8c8220) — стадии «ответ потерян/отказ/cleanup pending» — отдельных LG-состояний не подтвердил — [30.09 перенос] Модалка удаления уже на glass; сообщения — темизированное окно (по коду) |
| 35 | Проект UX · критические действия | проект UX · cleanup complete receipt | ✅ | `components/AccountDeletedNotice.tsx` (5441e1195) — уведомление после удаления без LG-токенов — [30.09 перенос] `components/AccountDeletedNotice.tsx` на liquidGlassTokens (30.09) |

## results.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | Ошибки | хаб ошибок | ✅ | `app/mistakes_hub.tsx` (ac9c8e31d, +правки в дереве); `app/mistakes_list.tsx` (133f50647, +правки в дереве); `app/mistake_detail.tsx` (133f50647, +правки в дереве) — хаб/список/деталь ошибок на старой палитре — [30.09 перенос] `app/mistakes_hub.tsx` на useLv2Glass, плоские плиты, кнопка 44 (30.09) |
| 2 | Ошибки | ошибок пока нет | ✅ | `app/mistakes_hub.tsx` (ac9c8e31d, +правки в дереве); `app/mistakes_list.tsx` (133f50647, +правки в дереве); `app/mistake_detail.tsx` (133f50647, +правки в дереве) — хаб/список/деталь ошибок на старой палитре — [30.09 перенос] `app/mistakes_hub.tsx` (30.09) |
| 3 | Ошибки | список ошибок | ✅ | `app/mistakes_hub.tsx` (ac9c8e31d, +правки в дереве); `app/mistakes_list.tsx` (133f50647, +правки в дереве); `app/mistake_detail.tsx` (133f50647, +правки в дереве) — хаб/список/деталь ошибок на старой палитре — [30.09 перенос] `app/mistakes_list.tsx` (30.09) |
| 4 | Ошибки | деталь ошибки | ✅ | `app/mistakes_hub.tsx` (ac9c8e31d, +правки в дереве); `app/mistakes_list.tsx` (133f50647, +правки в дереве); `app/mistake_detail.tsx` (133f50647, +правки в дереве) — хаб/список/деталь ошибок на старой палитре — [30.09 перенос] `app/mistake_detail.tsx` (30.09) |
| 5 | Ошибки | повторная практика | ✅ | `app/mistake_practice_session.tsx` (f61e9f468, +правки в дереве) — повторная практика ошибок без LG-токенов — [30.09 перенос] `app/mistake_practice_session.tsx`, `MistakeVerdictPanel`, `MistakeTitleShelf` (30.09) |
| 6 | Ошибки | финал практики ошибок | ✅ | `components/mistake-practice/MistakeSessionFinale.tsx` (2ce1414e9, +правки в дереве) — финал практики без LG-токенов — [30.09 перенос] `MistakeSessionFinale` (30.09) |
| 7 | Серия и статистика | серия и неделя | ✅ | `app/streak_stats.tsx` (ec91e411c, +правки в дереве) — серия и стадии огня: экран без LG-токенов — [30.09 перенос] `app/streak_stats.tsx`: фон/кнопка на токенах, акценты t.accent; `StatsCardArtSurface` — плоская плита (30.09) |
| 8 | Серия и статистика | стадии огня 0–10 | ✅ | `app/streak_stats.tsx` (ec91e411c, +правки в дереве) — серия и стадии огня: экран без LG-токенов — [30.09 перенос] Значок огня по стадиям (StreakChainIcon) — прежние ассеты, не менялись; карточка вокруг на glass | — [30.09 закрыто] components/streak/StreakStagesModal.tsx
| 9 | Серия и статистика | активность за год | ✅ | `components/ActivityHeatmap365.tsx` (4792f3e59, +правки в дереве); `app/streak_stats.tsx` (ec91e411c, +правки в дереве) — тепловая карта на LG, хост streak_stats старый — [30.09 перенос] Хост `streak_stats` теперь на стекле (30.09) |
| 10 | Серия и статистика | риск серии · тост | ✅ | `components/StreakRiskToastHost.tsx` (519de9ff0); `components/ActionToast.tsx` (9eddf74d4, +правки в дереве) — риск серии — ActionToast на LG |
| 11 | Витрина достижений | витрина | ✅ | `app/achievements_screen.tsx` (1b5e8588e); `components/results/ResultsGlass.tsx` (1b5e8588e) — витрина/пусто/подробнее на ResultsGlass (1b5e8588e, 135ef4938) |
| 12 | Витрина достижений | витрина · пусто | ✅ | `app/achievements_screen.tsx` (1b5e8588e); `components/results/ResultsGlass.tsx` (1b5e8588e) — витрина/пусто/подробнее на ResultsGlass (1b5e8588e, 135ef4938) |
| 13 | Витрина достижений | достижение · подробнее | ✅ | `app/achievements_screen.tsx` (1b5e8588e); `components/results/ResultsGlass.tsx` (1b5e8588e) — витрина/пусто/подробнее на ResultsGlass (1b5e8588e, 135ef4938) |
| 14 | Единый итог | единый итог · монеты, ошибка, комментарий | ✅ | `app/lesson_complete.tsx` (1b5e8588e); `components/results/ResultsGlass.tsx` (1b5e8588e) — единый итог на ResultsGlass |

## coins.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | Кошелёк и ранги | кошелёк | ✅ | `app/coin_rank.tsx` (не закоммичен) — кошелёк/повышение на liquidGlassTokens+V2Glass; файл не закоммичен |
| 2 | Кошелёк и ранги | кошелёк · нулевой баланс | ✅ | `app/coin_rank.tsx` (не закоммичен) — кошелёк/повышение на liquidGlassTokens+V2Glass; файл не закоммичен |
| 3 | Кошелёк и ранги | повышение · готово к подтверждению | ✅ | `app/coin_rank.tsx` (не закоммичен) — кошелёк/повышение на liquidGlassTokens+V2Glass; файл не закоммичен |
| 4 | Кошелёк и ранги | повышение · ожидание | ✅ | `app/coin_rank.tsx` (не закоммичен) — кошелёк/повышение на liquidGlassTokens+V2Glass; файл не закоммичен |
| 5 | Кошелёк и ранги | повышение · недостаточно монет | ✅ | `app/coin_rank.tsx` (не закоммичен) — кошелёк/повышение на liquidGlassTokens+V2Glass; файл не закоммичен |
| 6 | Кошелёк и ранги | каталог 00–19 | ✅ | искал каталог рангов 00–19 в coin_rank.tsx — только текущий/следующий — [30.09 перенос] `components/coins/CoinRankCatalog.tsx` под карточкой повышения в `app/coin_rank.tsx` (30.09) |
| 7 | Кошелёк и ранги | Монетный двор · подтверждённый успех | ✅ | `components/level_up/LevelUpMintCeremony.tsx` (c9497a68e) — Монетный двор на LG (c9497a68e) |
| 8 | Plus и покупки | нейтральное предложение | ✅ | `components/paywall/PaywallLiquidGlass.tsx` (b2d266fa6) — предложение Plus: обычное/загрузка/ошибка/покупка (A/D) |
| 9 | Plus и покупки | предложение · загрузка | ✅ | `components/paywall/PaywallLiquidGlass.tsx` (b2d266fa6) — предложение Plus: обычное/загрузка/ошибка/покупка (A/D) |
| 10 | Plus и покупки | предложение · ошибка до checkout | ✅ | `components/paywall/PaywallLiquidGlass.tsx` (b2d266fa6) — предложение Plus: обычное/загрузка/ошибка/покупка (A/D) |
| 11 | Plus и покупки | покупка · ожидание магазина | ✅ | `components/paywall/PaywallLiquidGlass.tsx` (b2d266fa6) — предложение Plus: обычное/загрузка/ошибка/покупка (A/D) |
| 12 | Plus и покупки | покупка · подтверждение неизвестно | ✅ | `app/paywall_purchase.ts` (0217c4a21, +правки в дереве) — «подтверждение неизвестно» — нативный Alert.alert — [30.09 перенос] `app/paywall_purchase.ts` — по заданию не трогали (нативный Alert остаётся) | — [30.09 закрыто] в коде уже стеклянные окна enqueueThemedBlockingInfoAlert, сверка устарела
| 13 | Plus и покупки | доступ закончился · шторка | ✅ | `components/EntitlementExpiredHost.tsx` (82579e1b0) — «Plus закончился» на LG (82579e1b0) |
| 14 | Plus и покупки | доступ к разбору · решение открыто | ✅ | `components/AiLimitUpsellCard.tsx` (0217c4a21, +правки в дереве) — предложение при лимите разбора на токенах LG |
| 15 | Подтверждённый доступ и границы | Plus-бейдж в профиле | ✅ | `components/PlusBadge.tsx` (3587edede, +правки в дереве) — Plus-бейдж без LG-токенов — [30.09 перенос] `components/PlusBadge.tsx`: плоская пилюля токена (gold/olive — прежняя ветка) (30.09) |
| 16 | Подтверждённый доступ и границы | первая покупка · подтверждена магазином | ✅ | `components/FirstPurchaseSealCelebration.tsx` (670b511b4) — празднование первой покупки без LG-токенов — [30.09 перенос] `components/FirstPurchaseSealCelebration.tsx` на liquidGlassTokens (30.09) |
| 17 | Подтверждённый доступ и границы | граница доступа урока | ➖ | `app/(tabs)/lessons.tsx` (4fa4ab32b) — граница доступа урока: замок в списке уроков; точное состояние не подтверждено — [30.09 перенос] Отдельного экрана «Урок пока недоступен» в приложении нет (замок в списке) — нужна новая логика/экран, не сделано | — решение владельца 30.09: оставить окно в списке уроков

## paywall-review.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 0 | (нет .col) | ← Все макеты 2.0 Пейволы 2.0 Два пейвола. Дизайн 2.0. Пейвол приложения A · Кл | ✅ | `components/paywall/PaywallLiquidGlass.tsx` (b2d266fa6); `app/paywall_a.tsx` (00d854736); `app/paywall_d.tsx` (00d854736) — два актуальных пейволла A/D на LG (b2d266fa6) |

## paywalls.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | Семь действующих композиций A–G | Вариант A · Компакт | ✅ | `components/paywall/PaywallLiquidGlass.tsx` (b2d266fa6); `app/paywall_a.tsx` (00d854736); `app/paywall_d.tsx` (00d854736) — A «Компакт» и D «Плитки» вне онбординга на LG |
| 2 | Семь действующих композиций A–G | Вариант B · История | ✅ | `components/paywall/PaywallLiquidGlass.tsx` (b2d266fa6) — B/C/E/F/G рисуются как A/D (ACTIVE_LAYOUT), своей композиции нет — [30.09 перенос] B/C/E/F/G по решению владельца 29.09 сворачиваются в A/D и рисуются той же PaywallLiquidGlass на токенах стекла — отдельной поверхности нет по замыслу |
| 3 | Семь действующих композиций A–G | Вариант C · Атриум | ✅ | `components/paywall/PaywallLiquidGlass.tsx` (b2d266fa6) — B/C/E/F/G рисуются как A/D (ACTIVE_LAYOUT), своей композиции нет — [30.09 перенос] B/C/E/F/G по решению владельца 29.09 сворачиваются в A/D и рисуются той же PaywallLiquidGlass на токенах стекла — отдельной поверхности нет по замыслу |
| 4 | Семь действующих композиций A–G | Вариант D · Плитки | ✅ | `components/paywall/PaywallLiquidGlass.tsx` (b2d266fa6); `app/paywall_a.tsx` (00d854736); `app/paywall_d.tsx` (00d854736) — A «Компакт» и D «Плитки» вне онбординга на LG |
| 5 | Семь действующих композиций A–G | Вариант E · Один план | ✅ | `components/paywall/PaywallLiquidGlass.tsx` (b2d266fa6) — B/C/E/F/G рисуются как A/D (ACTIVE_LAYOUT), своей композиции нет — [30.09 перенос] B/C/E/F/G по решению владельца 29.09 сворачиваются в A/D и рисуются той же PaywallLiquidGlass на токенах стекла — отдельной поверхности нет по замыслу |
| 6 | Семь действующих композиций A–G | Вариант F · Пробный период | ✅ | `components/paywall/PaywallLiquidGlass.tsx` (b2d266fa6) — B/C/E/F/G рисуются как A/D (ACTIVE_LAYOUT), своей композиции нет — [30.09 перенос] B/C/E/F/G по решению владельца 29.09 сворачиваются в A/D и рисуются той же PaywallLiquidGlass на токенах стекла — отдельной поверхности нет по замыслу |
| 7 | Семь действующих композиций A–G | Вариант G · Сравнение | ✅ | `components/paywall/PaywallLiquidGlass.tsx` (b2d266fa6) — B/C/E/F/G рисуются как A/D (ACTIVE_LAYOUT), своей композиции нет — [30.09 перенос] B/C/E/F/G по решению владельца 29.09 сворачиваются в A/D и рисуются той же PaywallLiquidGlass на токенах стекла — отдельной поверхности нет по замыслу |
| 8 | Встроенные предложения Plus | Разбор ошибки · лимит ИИ | ✅ | `components/AiLimitUpsellCard.tsx` (0217c4a21, +правки в дереве) — встроенное предложение при лимите ИИ на токенах LG |
| 9 | Встроенные предложения Plus | Результат · первый урок | ✅ | `components/SoftContextualUpsellCard.tsx` (2fba54828, +правки в дереве) — предложения в итоге урока на токенах LG |
| 10 | Встроенные предложения Plus | Результат · три урока | ✅ | `components/SoftContextualUpsellCard.tsx` (2fba54828, +правки в дереве) — предложения в итоге урока на токенах LG |
| 11 | Цена и покупка | Загрузка условий | ✅ | `components/paywall/PaywallLiquidGlass.tsx` (b2d266fa6) — загрузка/ошибка/проверяем покупку |
| 12 | Цена и покупка | Ошибка до checkout | ✅ | `components/paywall/PaywallLiquidGlass.tsx` (b2d266fa6) — загрузка/ошибка/проверяем покупку |
| 13 | Цена и покупка | Проверяем покупку | ✅ | `components/paywall/PaywallLiquidGlass.tsx` (b2d266fa6) — загрузка/ошибка/проверяем покупку |
| 14 | Цена и покупка | Ожидание банка или родителя · отдельный диалог | ✅ | `app/paywall_purchase.ts` (0217c4a21, +правки в дереве) — ожидание/неизвестный результат — нативный Alert.alert | — [30.09 закрыто] в коде уже стеклянные окна enqueueThemedBlockingInfoAlert, сверка устарела
| 15 | Цена и покупка | Результат покупки неизвестен · отдельный диалог | ✅ | `app/paywall_purchase.ts` (0217c4a21, +правки в дереве) — ожидание/неизвестный результат — нативный Alert.alert | — [30.09 закрыто] в коде уже стеклянные окна enqueueThemedBlockingInfoAlert, сверка устарела
| 16 | Цена и покупка | Статус неизвестен | ✅ | `app/paywall_purchase.ts` (0217c4a21, +правки в дереве) — ожидание/неизвестный результат — нативный Alert.alert | — [30.09 закрыто] в коде уже стеклянные окна enqueueThemedBlockingInfoAlert, сверка устарела
| 17 | Цена и покупка | Уход с пейволла | ✅ | `components/paywall/PaywallLiquidGlass.tsx` (b2d266fa6); `components/ThemedConfirmModal.tsx` (96c32bb97, +правки в дереве) — уход с пейволла — ThemedConfirmModal |
| 18 | Цена и покупка | Промо от магазина | ✅ | `components/paywall/PaywallPromoBanner.tsx` (3587edede, +правки в дереве) — промо магазина: баннер без LG-токенов — [30.09 перенос] PaywallPromoBanner: проп glass — стеклянная плашка (g.card, кромка 1 px, блик) на A/D; онбординг-вид не тронут |
| 19 | Управление действующим Plus | Управление подпиской | ✅ | `app/manage_subscription.tsx` (41648d48d, +правки в дереве) — управление Plus и вложенные окна |
| 20 | Управление действующим Plus | Загрузка плана | ✅ | `app/manage_subscription.tsx` (41648d48d, +правки в дереве) — управление Plus и вложенные окна |
| 21 | Управление действующим Plus | Разовая покупка | ✅ | `app/manage_subscription.tsx` (41648d48d, +правки в дереве) — управление Plus и вложенные окна |
| 22 | Управление действующим Plus | Восстановление: пусто | ✅ | `app/manage_subscription.tsx` (41648d48d, +правки в дереве) — управление Plus и вложенные окна |
| 23 | Управление действующим Plus | Причина отмены | ✅ | `app/manage_subscription.tsx` (41648d48d, +правки в дереве) — управление Plus и вложенные окна |
| 24 | Управление действующим Plus | Сохранить доступ или отменить | ✅ | `app/manage_subscription.tsx` (41648d48d, +правки в дереве) — управление Plus и вложенные окна |
| 25 | Управление действующим Plus | Поддержка или отмена | ✅ | `app/manage_subscription.tsx` (41648d48d, +правки в дереве) — управление Plus и вложенные окна |

## system.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | Таббар | Обучение выбрано · нажми вкладку | ✅ | `components/v2/V2TabBar.tsx` (c94aa653f) — таббар: иконки без подписей, Видео по центру (c94aa653f) |
| 2 | Таббар | Видео по центру | ✅ | `components/v2/V2TabBar.tsx` (c94aa653f) — таббар: иконки без подписей, Видео по центру (c94aa653f) |
| 3 | Таббар | Точка — есть новое в Сообществе | ✅ | искал точку «новое в Сообществе» в V2TabBar/_layout — нет | — [30.09 закрыто] V2TabBar badge + useCommunityTabDot (кэш уведомлений, 0 чтений)
| 4 | Таббар | Сжат при прокрутке | ✅ | `components/v2/V2TabBar.tsx` (c94aa653f) — сжатие при прокрутке — collapseStyle |
| 5 | Сеть | Нет соединения | ✅ | `components/OfflineBanner.tsx` (96c32bb97, +правки в дереве) — SYS-02 на LG |
| 6 | Обновления | Без обновления дальше никак | ✅ | `components/ForceUpdateGate.tsx` (7e9154911, +правки в дереве); `components/UpdateModal.tsx` (0217c4a21, +правки в дереве) — SYS-03 на LG |
| 7 | Обновления | Есть новое — можно позже | ✅ | `components/ForceUpdateGate.tsx` (7e9154911, +правки в дереве); `components/UpdateModal.tsx` (0217c4a21, +правки в дереве) — SYS-03 на LG |
| 8 | Экраны-заглушки | Технические работы | ✅ | `components/MaintenanceGate.tsx` (50eea79a4, +правки в дереве) — SYS-04 на LG |
| 9 | Экраны-заглушки | Восстанавливаем сохранение | ✅ | `components/PhoneStateRecoveryScreen.tsx` (be92e3cbd, +правки в дереве) — SYS-05 на LG |
| 10 | Экраны-заглушки | Что-то пошло не так | ✅ | `components/ErrorBoundary.tsx` (519de9ff0, +правки в дереве) — SYS-01 статичный графитовый fallback |
| 11 | Сообщения | Что нового | ✅ | `components/ReleaseNotesV2Modal.tsx` (не закоммичен) — «Что нового» V2: шторка есть, автопоказ выключен; файл не закоммичен |
| 12 | Сообщения | Сообщение команды | ✅ | `components/AppMessageAnnouncementModal.tsx` (0217c4a21); `components/ReleaseNotesModal.tsx` (a5f6a5c49) — сообщение команды через ReleaseNotesModal (a5f6a5c49) |
| 13 | Сообщения | Личное сообщение с монетами | ✅ | `components/PersonalAdminMessageModal.tsx` (f2b44de62) — личное сообщение на LG (f2b44de62) |
| 14 | Сообщения | Входящие — 2 новых | ✅ | `components/AppMessagesInbox.tsx` (f2b44de62) — входящие на LG (f2b44de62); в файле ещё есть старые цвета |
| 15 | Сообщения | Входящие — пусто | ✅ | `components/AppMessagesInbox.tsx` (f2b44de62) — входящие на LG (f2b44de62); в файле ещё есть старые цвета |
| 16 | Просьбы и оплата | Включить напоминания? | ✅ | `components/NotificationPermissionModalHybrid.tsx` (96c32bb97, +правки в дереве); `components/NotificationPermissionModal.tsx` (50eea79a4, +правки в дереве) — SYS-08 на LG |
| 17 | Просьбы и оплата | Оценить приложение | ✅ | `components/ReviewPromptModal.tsx` (3376f0653, +правки в дереве) — SYS-11 шторка на LG |
| 18 | Просьбы и оплата | Оплата не прошла | ✅ | `components/BillingIssueToastHost.tsx` (519de9ff0); `components/ActionToast.tsx` (9eddf74d4, +правки в дереве) — «Оплата не прошла» — ActionToast |
| 19 | Подтверждения и тосты | Подтверждение | ✅ | `components/ThemedConfirmModal.tsx` (96c32bb97, +правки в дереве) — подтверждение/удаление через ThemedConfirmModal |
| 20 | Подтверждения и тосты | Подтверждение удаления | ✅ | `components/ThemedConfirmModal.tsx` (96c32bb97, +правки в дереве) — подтверждение/удаление через ThemedConfirmModal |
| 21 | Подтверждения и тосты | Выбор действия | ✅ | `components/ThemedChoiceModal.tsx` (3587edede, +правки в дереве) — выбор действия через ThemedChoiceModal |
| 22 | Подтверждения и тосты | Карточка удалена — «Вернуть» | ✅ | `app/flashcards/CollectionListView.tsx` (0217c4a21, +правки в дереве) — UndoDeleteSnackbar на g.sheet/g.glassEdge |

## overlays.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | Объявления | fallback copy · acknowledgement preview | ✅ | `components/AppMessageAnnouncementModal.tsx` (0217c4a21); `components/ReleaseNotesModal.tsx` (a5f6a5c49) — объявления через ReleaseNotesModal на LG |
| 2 | Объявления | supplied remote payload · demo content | ✅ | `components/AppMessageAnnouncementModal.tsx` (0217c4a21); `components/ReleaseNotesModal.tsx` (a5f6a5c49) — объявления через ReleaseNotesModal на LG |
| 3 | Текущий runtime-вход | settings context | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — окно регистрации/входа на LG (7556af3e8); все контексты в одном компоненте |
| 4 | Текущий runtime-вход | lesson complete context | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — окно регистрации/входа на LG (7556af3e8); все контексты в одном компоненте |
| 5 | Текущий runtime-вход | onboarding overlay context | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — окно регистрации/входа на LG (7556af3e8); все контексты в одном компоненте |
| 6 | Текущий runtime-вход | SaveProgressBanner / home context | 🏠 | `components/SaveProgressBanner.tsx` (2aad7267a, +правки в дереве) — баннер Главной — принадлежит Главной, зелёный t.correct |
| 7 | Текущий runtime-вход | provider busy | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — окно регистрации/входа на LG (7556af3e8); все контексты в одном компоненте |
| 8 | Текущий runtime-вход | provider slow · safe close | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — окно регистрации/входа на LG (7556af3e8); все контексты в одном компоненте |
| 9 | Текущий runtime-вход | no provider | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — окно регистрации/входа на LG (7556af3e8); все контексты в одном компоненте |
| 10 | Текущий runtime-вход | failure + retry | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — окно регистрации/входа на LG (7556af3e8); все контексты в одном компоненте |
| 11 | Текущий runtime-вход | account switch required · non-retryable | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — окно регистрации/входа на LG (7556af3e8); все контексты в одном компоненте |
| 12 | Текущий runtime-вход | previous provider mismatch · non-retryable | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — окно регистрации/входа на LG (7556af3e8); все контексты в одном компоненте |
| 13 | Текущий runtime-вход | provider picker cancelled · retryable | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — окно регистрации/входа на LG (7556af3e8); все контексты в одном компоненте |
| 14 | Текущий runtime-вход | startup linked-account hint | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — окно регистрации/входа на LG (7556af3e8); все контексты в одном компоненте |
| 15 | Восстановление существующего аккаунта | existing account · provider choice | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — восстановление аккаунта — стадии внутри окна регистрации |
| 16 | Восстановление существующего аккаунта | existing account · Google instructions | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — восстановление аккаунта — стадии внутри окна регистрации |
| 17 | Восстановление существующего аккаунта | existing account · code + timers | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — восстановление аккаунта — стадии внутри окна регистрации |
| 18 | Восстановление существующего аккаунта | existing account · expired code | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — восстановление аккаунта — стадии внутри окна регистрации |
| 19 | Восстановление существующего аккаунта | existing account · working · controls disabled | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — восстановление аккаунта — стадии внутри окна регистрации |
| 20 | Восстановление существующего аккаунта | existing account · code_sent + rate-limit copy | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — восстановление аккаунта — стадии внутри окна регистрации |
| 21 | Восстановление существующего аккаунта | existing account · code_sent + invalid-code copy | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — восстановление аккаунта — стадии внутри окна регистрации |
| 22 | Восстановление существующего аккаунта | existing account · code_sent + network-error copy | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — восстановление аккаунта — стадии внутри окна регистрации |
| 23 | Восстановление существующего аккаунта | existing account · provider choice + cancelled copy | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — восстановление аккаунта — стадии внутри окна регистрации |
| 24 | Восстановление существующего аккаунта | existing account · support error · no retry | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — восстановление аккаунта — стадии внутри окна регистрации |
| 25 | Восстановление существующего аккаунта | existing account · support stop | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — восстановление аккаунта — стадии внутри окна регистрации |
| 26 | Восстановление после чистой установки | clean install · provider proof | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — восстановление после чистой установки — тот же компонент |
| 27 | Восстановление после чистой установки | clean install · email + disabled send | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — восстановление после чистой установки — тот же компонент |
| 28 | Восстановление после чистой установки | clean install · sent code + timers | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — восстановление после чистой установки — тот же компонент |
| 29 | Восстановление после чистой установки | clean install · expired code | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — восстановление после чистой установки — тот же компонент |
| 30 | Восстановление после чистой установки | clean install · resume | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — восстановление после чистой установки — тот же компонент |
| 31 | Восстановление после чистой установки | clean install · adopting · blocking and non-dismissible | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — восстановление после чистой установки — тот же компонент |
| 32 | Восстановление после чистой установки | clean install · support stop | ✅ | `components/RegistrationPromptModal.tsx` (7556af3e8) — восстановление после чистой установки — тот же компонент |
| 33 | Жалоба на ник | report nickname · confirm | ✅ | `components/ReportUserModal.tsx` — переведено на токены стекла (30.09, ночной перенос) |
| 34 | Жалоба на ник | report nickname · sent preview | ✅ | `components/ReportUserModal.tsx` — переведено на токены стекла (30.09, ночной перенос) |
| 35 | Жалоба на ник | report nickname · failure toast | ✅ | `components/ReportUserModal.tsx` — переведено на токены стекла (30.09, ночной перенос) |
| 36 | Feature intro | mistakes · retained surface, 2.0 copy | ✅ | `components/FeatureIntroModal.tsx` (0217c4a21, +правки в дереве) — поверхность на LG, тексты 2.0 и сцены режимов не сверены — [30.09 перенос] FeatureIntroModal: HybridSheetShell material="liquid-glass-opaque", кнопки/текст на токенах стекла; сцены FeatureIntroStage/DialogueComicStage/DialogueConsentChatReplay на палитре стекла; тексты не менялись |
| 37 | Feature intro | swipe · retained surface, 2.0 copy | ✅ | `components/FeatureIntroModal.tsx` (0217c4a21, +правки в дереве) — поверхность на LG, тексты 2.0 и сцены режимов не сверены — [30.09 перенос] FeatureIntroModal: HybridSheetShell material="liquid-glass-opaque", кнопки/текст на токенах стекла; сцены FeatureIntroStage/DialogueComicStage/DialogueConsentChatReplay на палитре стекла; тексты не менялись |
| 38 | Feature intro | listening · retained surface, 2.0 copy | ✅ | `components/FeatureIntroModal.tsx` (0217c4a21, +правки в дереве) — поверхность на LG, тексты 2.0 и сцены режимов не сверены — [30.09 перенос] FeatureIntroModal: HybridSheetShell material="liquid-glass-opaque", кнопки/текст на токенах стекла; сцены FeatureIntroStage/DialogueComicStage/DialogueConsentChatReplay на палитре стекла; тексты не менялись |
| 39 | Feature intro | speaking · retained surface, 2.0 copy | ✅ | `components/FeatureIntroModal.tsx` (0217c4a21, +правки в дереве) — поверхность на LG, тексты 2.0 и сцены режимов не сверены — [30.09 перенос] FeatureIntroModal: HybridSheetShell material="liquid-glass-opaque", кнопки/текст на токенах стекла; сцены FeatureIntroStage/DialogueComicStage/DialogueConsentChatReplay на палитре стекла; тексты не менялись |
| 40 | Feature intro | blitz · retained surface, 2.0 copy | ✅ | `components/FeatureIntroModal.tsx` (0217c4a21, +правки в дереве) — поверхность на LG, тексты 2.0 и сцены режимов не сверены — [30.09 перенос] FeatureIntroModal: HybridSheetShell material="liquid-glass-opaque", кнопки/текст на токенах стекла; сцены FeatureIntroStage/DialogueComicStage/DialogueConsentChatReplay на палитре стекла; тексты не менялись |
| 41 | Feature intro | cards · retained surface, 2.0 copy | ✅ | `components/FeatureIntroModal.tsx` (0217c4a21, +правки в дереве) — поверхность на LG, тексты 2.0 и сцены режимов не сверены — [30.09 перенос] FeatureIntroModal: HybridSheetShell material="liquid-glass-opaque", кнопки/текст на токенах стекла; сцены FeatureIntroStage/DialogueComicStage/DialogueConsentChatReplay на палитре стекла; тексты не менялись |
| 42 | Feature intro | stats · retained surface, 2.0 copy | ✅ | `components/FeatureIntroModal.tsx` (0217c4a21, +правки в дереве) — поверхность на LG, тексты 2.0 и сцены режимов не сверены — [30.09 перенос] FeatureIntroModal: HybridSheetShell material="liquid-glass-opaque", кнопки/текст на токенах стекла; сцены FeatureIntroStage/DialogueComicStage/DialogueConsentChatReplay на палитре стекла; тексты не менялись |
| 43 | Feature intro | daily · retained surface, 2.0 copy | ✅ | `components/FeatureIntroModal.tsx` (0217c4a21, +правки в дереве) — поверхность на LG, тексты 2.0 и сцены режимов не сверены — [30.09 перенос] FeatureIntroModal: HybridSheetShell material="liquid-glass-opaque", кнопки/текст на токенах стекла; сцены FeatureIntroStage/DialogueComicStage/DialogueConsentChatReplay на палитре стекла; тексты не менялись |
| 44 | Feature intro | videos · retained surface, 2.0 copy | ✅ | `components/FeatureIntroModal.tsx` (0217c4a21, +правки в дереве) — поверхность на LG, тексты 2.0 и сцены режимов не сверены — [30.09 перенос] FeatureIntroModal: HybridSheetShell material="liquid-glass-opaque", кнопки/текст на токенах стекла; сцены FeatureIntroStage/DialogueComicStage/DialogueConsentChatReplay на палитре стекла; тексты не менялись |
| 45 | Feature intro | friends · retained surface, 2.0 copy | ✅ | `components/FeatureIntroModal.tsx` (0217c4a21, +правки в дереве) — поверхность на LG, тексты 2.0 и сцены режимов не сверены — [30.09 перенос] FeatureIntroModal: HybridSheetShell material="liquid-glass-opaque", кнопки/текст на токенах стекла; сцены FeatureIntroStage/DialogueComicStage/DialogueConsentChatReplay на палитре стекла; тексты не менялись |
| 46 | Feature intro | legacy · retained surface, 2.0 copy | ✅ | `components/FeatureIntroModal.tsx` (0217c4a21, +правки в дереве) — поверхность на LG, тексты 2.0 и сцены режимов не сверены | — [30.09 закрыто] тексты 1:1 (feature_intro_sections_copy.ts)
| 47 | Feature intro | profile · retained surface, 2.0 copy | ✅ | `components/FeatureIntroModal.tsx` (0217c4a21, +правки в дереве) — поверхность на LG, тексты 2.0 и сцены режимов не сверены | — [30.09 закрыто] тексты 1:1 (feature_intro_sections_copy.ts)
| 48 | ActionToast | Готово · hybrid no action | ✅ | `components/ActionToast.tsx` (9eddf74d4, +правки в дереве) — ActionToast: 5 тонов, hybrid/classic (9eddf74d4) |
| 49 | ActionToast | Готово · classic + demo action | ✅ | `components/ActionToast.tsx` (9eddf74d4, +правки в дереве) — ActionToast: 5 тонов, hybrid/classic (9eddf74d4) |
| 50 | ActionToast | Что-то пошло не так · hybrid no action | ✅ | `components/ActionToast.tsx` (9eddf74d4, +правки в дереве) — ActionToast: 5 тонов, hybrid/classic (9eddf74d4) |
| 51 | ActionToast | Что-то пошло не так · classic + demo action | ✅ | `components/ActionToast.tsx` (9eddf74d4, +правки в дереве) — ActionToast: 5 тонов, hybrid/classic (9eddf74d4) |
| 52 | ActionToast | Сообщение · hybrid no action | ✅ | `components/ActionToast.tsx` (9eddf74d4, +правки в дереве) — ActionToast: 5 тонов, hybrid/classic (9eddf74d4) |
| 53 | ActionToast | Сообщение · classic + demo action | ✅ | `components/ActionToast.tsx` (9eddf74d4, +правки в дереве) — ActionToast: 5 тонов, hybrid/classic (9eddf74d4) |
| 54 | ActionToast | Внимание · hybrid no action | ✅ | `components/ActionToast.tsx` (9eddf74d4, +правки в дереве) — ActionToast: 5 тонов, hybrid/classic (9eddf74d4) |
| 55 | ActionToast | Внимание · classic + demo action | ✅ | `components/ActionToast.tsx` (9eddf74d4, +правки в дереве) — ActionToast: 5 тонов, hybrid/classic (9eddf74d4) |
| 56 | ActionToast | Награда · hybrid no action | ✅ | `components/ActionToast.tsx` (9eddf74d4, +правки в дереве) — ActionToast: 5 тонов, hybrid/classic (9eddf74d4) |
| 57 | ActionToast | Награда · classic + demo action | ✅ | `components/ActionToast.tsx` (9eddf74d4, +правки в дереве) — ActionToast: 5 тонов, hybrid/classic (9eddf74d4) |

## overlays-more.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | Коллекционные находки | обычная находка · demo card | ✅ | `components/CollectibleDropModal.tsx` (82579e1b0) — коллекционные находки на LG (82579e1b0) |
| 2 | Коллекционные находки | сет собран · без удалённой награды и названия сета | ✅ | `components/CollectibleDropModal.tsx` (82579e1b0) — коллекционные находки на LG (82579e1b0) |
| 3 | Коллекционные находки | секретная ветка · demo card | ✅ | `components/CollectibleDropModal.tsx` (82579e1b0) — коллекционные находки на LG (82579e1b0) |
| 4 | Стартовый полный доступ | welcome · no auto-subscribe | ✅ | `components/IntroFullAccessModal.tsx` (e2ba35f65) — стартовый полный доступ на LG |
| 5 | Стартовый полный доступ | ended · base path retained | ✅ | `components/IntroFullAccessModal.tsx` (e2ba35f65) — стартовый полный доступ на LG |
| 6 | Энергия | recovering · 5 / 1 / 10 contract | ✅ | `components/energy/EnergyInfoPopover.tsx` (0217c4a21, +правки в дереве) — подсказка энергии на LG |
| 7 | Энергия | full · no hidden reserve | ✅ | `components/energy/EnergyInfoPopover.tsx` (0217c4a21, +правки в дереве) — подсказка энергии на LG |
| 8 | Энергия | Plus · unlimited presentation | ✅ | `components/energy/EnergyInfoPopover.tsx` (0217c4a21, +правки в дереве) — подсказка энергии на LG |
| 9 | Энергия | Home-positioned variant | ✅ | `components/energy/EnergyInfoPopover.tsx` (0217c4a21, +правки в дереве) — подсказка энергии на LG |
| 10 | Сохранить путь | Home banner only | 🏠 | `components/SaveProgressBanner.tsx` (2aad7267a, +правки в дереве) — баннер «Сохранить путь» на Главной, зелёный t.correct |
| 11 | Промо магазина | store promo present · placeholders only | ✅ | `components/paywall/PaywallPromoBanner.tsx` (3587edede, +правки в дереве) — промо магазина без LG-токенов — [30.09 перенос] PaywallPromoBanner: стеклянная плашка на токенах темы (см. paywalls #18) |
| 12 | Промо магазина | promo null · banner absent | ✅ | `components/paywall/PaywallLiquidGlass.tsx` (b2d266fa6) — при promo=null баннер не рисуется |
| 13 | Реферальный доступ закончился | historical access ended · compatibility notice | ✅ | `app/referral_access_ended_modal.tsx` (e8a8c8220) — уведомление об окончании доступа на LG (e8a8c8220) |
| 14 | Выбор времени | notification time picker | ✅ | `app/settings_notifications.tsx` (ddf8e551e, +правки в дереве) — TimeModal на нейтральной панели LG |
| 15 | Месячный календарь | month bounds + day details | ✅ | `components/ActivityHeatmap365.tsx` (4792f3e59, +правки в дереве) — MonthExplorerModal на LG |
| 16 | Месячный календарь | two-month comparison · settled metrics | ✅ | `components/ActivityHeatmap365.tsx` (4792f3e59, +правки в дереве) — MonthExplorerModal на LG |
| 17 | Код от друга | ReferralCodeSheet · idle | ✅ | `components/referral_code_sheet.tsx` + `referral_sheet_shell.tsx` + `referral_how_sheet.tsx` — токены стекла (30.09) |
| 18 | Код от друга | ReferralCodeSheet · busy | ✅ | `components/referral_code_sheet.tsx` + `referral_sheet_shell.tsx` + `referral_how_sheet.tsx` — токены стекла (30.09) |
| 19 | Код от друга | ReferralCodeSheet · applied | ✅ | `components/referral_code_sheet.tsx` + `referral_sheet_shell.tsx` + `referral_how_sheet.tsx` — токены стекла (30.09) |
| 20 | Код от друга | ReferralCodeSheet · already | ✅ | `components/referral_code_sheet.tsx` + `referral_sheet_shell.tsx` + `referral_how_sheet.tsx` — токены стекла (30.09) |
| 21 | Код от друга | ReferralCodeSheet · invalid | ✅ | `components/referral_code_sheet.tsx` + `referral_sheet_shell.tsx` + `referral_how_sheet.tsx` — токены стекла (30.09) |
| 22 | Код от друга | ReferralCodeSheet · unknown | ✅ | `components/referral_code_sheet.tsx` + `referral_sheet_shell.tsx` + `referral_how_sheet.tsx` — токены стекла (30.09) |
| 23 | Код от друга | ReferralCodeSheet · too-old | ✅ | `components/referral_code_sheet.tsx` + `referral_sheet_shell.tsx` + `referral_how_sheet.tsx` — токены стекла (30.09) |
| 24 | Код от друга | ReferralCodeSheet · self | ✅ | `components/referral_code_sheet.tsx` + `referral_sheet_shell.tsx` + `referral_how_sheet.tsx` — токены стекла (30.09) |
| 25 | Код от друга | ReferralCodeSheet · needs-link | ✅ | `components/referral_code_sheet.tsx` + `referral_sheet_shell.tsx` + `referral_how_sheet.tsx` — токены стекла (30.09) |
| 26 | Код от друга | ReferralCodeSheet · disabled | ✅ | `components/referral_code_sheet.tsx` + `referral_sheet_shell.tsx` + `referral_how_sheet.tsx` — токены стекла (30.09) |
| 27 | Код от друга | ReferralCodeSheet · error | ✅ | `components/referral_code_sheet.tsx` + `referral_sheet_shell.tsx` + `referral_how_sheet.tsx` — токены стекла (30.09) |
| 28 | Код от друга | ReferralCodeSheet · friend-request | ✅ | `components/referral_code_sheet.tsx` + `referral_sheet_shell.tsx` + `referral_how_sheet.tsx` — токены стекла (30.09) |
| 29 | Досье достижения | earned dossier · demo date | ✅ | `app/achievements_screen.tsx` (1b5e8588e); `app/collectibles_screen.tsx` (135ef4938) — досье достижения и детали карточки на LG (135ef4938) |
| 30 | Досье достижения | locked/progress shell · condition pending 2.0 | ✅ | `app/achievements_screen.tsx` (1b5e8588e); `app/collectibles_screen.tsx` (135ef4938) — досье достижения и детали карточки на LG (135ef4938) |
| 31 | Детали карточки | first normal card · previous disabled | ✅ | `app/achievements_screen.tsx` (1b5e8588e); `app/collectibles_screen.tsx` (135ef4938) — досье достижения и детали карточки на LG (135ef4938) |
| 32 | Детали карточки | interior normal card · both directions enabled | ✅ | `app/achievements_screen.tsx` (1b5e8588e); `app/collectibles_screen.tsx` (135ef4938) — досье достижения и детали карточки на LG (135ef4938) |
| 33 | Детали карточки | last secret card · next disabled | ✅ | `app/achievements_screen.tsx` (1b5e8588e); `app/collectibles_screen.tsx` (135ef4938) — досье достижения и детали карточки на LG (135ef4938) |

## overlays-runtime.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | Native alerts | native alert · cache clear | ✅ | `app/(tabs)/settings.tsx` — стеклянное подтверждение (useGlassAlert → ThemedConfirmModal), тексты/обработчики те же (30.09) |
| 2 | Native alerts | native alert · empty name | ✅ | `components/account/NicknameEditModal.tsx` + `GlassInlineAlert.tsx` — стеклянный слой внутри модалки (30.09) |
| 3 | Native alerts | native alert · short name | ✅ | `components/account/NicknameEditModal.tsx` + `GlassInlineAlert.tsx` — стеклянный слой внутри модалки (30.09) |
| 4 | Native alerts | native alert · long name | ✅ | `components/account/NicknameEditModal.tsx` + `GlassInlineAlert.tsx` — стеклянный слой внутри модалки (30.09) |
| 5 | Native alerts | native alert · blocked name | ✅ | `components/account/NicknameEditModal.tsx` + `GlassInlineAlert.tsx` — стеклянный слой внутри модалки (30.09) |
| 6 | Native alerts | switch blocked before account change | ✅ | `app/(tabs)/settings.tsx` — три отказа смены аккаунта через useGlassAlert (30.09) |
| 7 | Native alerts | legacy exam · destructive exit | ✅ | `app/exam.tsx` — уже ThemedConfirmModal (15718b664), Alert.alert в файле нет |
| 8 | Native alerts | video reminder · success | ✅ | `app/lingman_videos.tsx` — успех показывает кнопка, окна в коде нет (сверено с video_tab контрактом) |
| 9 | Native alerts | video reminder · permission blocked · current source mismatch | ✅ | `app/lingman_videos.tsx` — стеклянное окно, кнопка «Settings» как была (30.09) |
| 10 | Native alerts | video reminder · master disabled · current source mismatch | ✅ | `app/lingman_videos.tsx` — стеклянное окно (30.09) |
| 11 | Native alerts | onboarding permission blocked | ➖ | `components/CleanOnboarding.tsx` (d6d41bda6, +правки в дереве) — онбординг: нативный Alert (владелец: онбординг не трогать) | — не применимо: онбординг не трогаем (владелец 30.09)
| 12 | Native alerts | French AI-dialog gate | ✅ | `components/DialogsTabContent.tsx` — useGlassAlert (30.09) |
| 13 | Native alerts | purchase · external approval pending | ✅ | `app/paywall_purchase.ts` — окно через enqueueThemedBlockingInfoAlert, логика покупки не тронута (30.09) |
| 14 | Native alerts | purchase · status unknown · no repurchase | ✅ | `app/paywall_purchase.ts` — окно через enqueueThemedBlockingInfoAlert, логика покупки не тронута (30.09) |
| 15 | Inline и sheets | account details · unlinked | ✅ | `app/account_details.tsx` (be24d52dc) — данные аккаунта на LG |
| 16 | Inline и sheets | account details · linked · fictional email | ✅ | `app/account_details.tsx` (be24d52dc) — данные аккаунта на LG |
| 17 | Inline и sheets | account switch · confirmation | ✅ | `components/account/AccountLogoutFlow.tsx` (e8a8c8220) — смена/стирание аккаунта на LG (e8a8c8220) |
| 18 | Inline и sheets | account switch · non-dismissible wiping | ✅ | `components/account/AccountLogoutFlow.tsx` (e8a8c8220) — смена/стирание аккаунта на LG (e8a8c8220) |
| 19 | Inline и sheets | name edit · saving controls disabled | ✅ | `components/account/NicknameEditModal.tsx` (e8a8c8220) — сохранение имени, кнопки disabled |
| 20 | Inline и sheets | comments sheet · loading | ✅ | `app/community_packs/PackCommentsSheet.tsx` (816e59af2) — комментарии — загрузка |
| 21 | Inline и sheets | comment report · throttled | ✅ | `app/community_packs/ReportCommentModal.tsx` (816e59af2) — жалоба на комментарий — троттлинг |
| 22 | Тосты и баннер | InGameToast · info · demo payload | ✅ | `components/InGameToast.tsx` (96c32bb97, +правки в дереве) — InGameToast на LG-материале |
| 23 | Тосты и баннер | InGameToast · error · demo payload | ✅ | `components/InGameToast.tsx` (96c32bb97, +правки в дереве) — InGameToast на LG-материале |
| 24 | Тосты и баннер | persistent unread reply · whole banner opens · separate close | ✅ | `components/ReportReplyHomeBanner.tsx` (2aad7267a, +правки в дереве) — баннер ответа поддержки на LG (Packet 2) |
| 25 | Тосты и баннер | streak risk · warning · no action | ✅ | `components/StreakRiskToastHost.tsx` (519de9ff0); `components/BillingIssueToastHost.tsx` (519de9ff0); `components/ActionToast.tsx` (9eddf74d4, +правки в дереве) — хосты тостов через ActionToast |
| 26 | Тосты и баннер | billing issue · warning · no action | ✅ | `components/StreakRiskToastHost.tsx` (519de9ff0); `components/BillingIssueToastHost.tsx` (519de9ff0); `components/ActionToast.tsx` (9eddf74d4, +правки в дереве) — хосты тостов через ActionToast |
| 27 | Тосты и баннер | receipt-limited handoff · 3s · pass-through | ✅ | `components/InGameToast.tsx` (96c32bb97, +правки в дереве) — InGameToast на LG-материале |
| 28 | Подтверждения | Экзамен уровня · пауза и выход | ✅ | `app/level_exam.tsx` (ac9c8e31d, +правки в дереве); `components/ThemedConfirmModal.tsx` (96c32bb97, +правки в дереве) — пауза и выход из зачёта — ThemedConfirmModal |
| 29 | Подтверждения | mistake practice · hide | ✅ | `app/mistake_practice_session.tsx` (f61e9f468, +правки в дереве); `components/ThemedConfirmModal.tsx` (96c32bb97, +правки в дереве) — скрыть ошибку — ThemedConfirmModal |
| 30 | Подтверждения | lesson menu · theory unavailable | ✅ | `app/lesson_menu.tsx` (7e162b5c5); `components/ThemedChoiceModal.tsx` (3587edede, +правки в дереве) — «недоступно» в меню урока — ThemedChoiceModal |
| 31 | Подтверждения | lesson menu · vocabulary unavailable | ✅ | `app/lesson_menu.tsx` (7e162b5c5); `components/ThemedChoiceModal.tsx` (3587edede, +правки в дереве) — «недоступно» в меню урока — ThemedChoiceModal |
| 32 | Подтверждения | lesson menu · verbs unavailable | ✅ | `app/lesson_menu.tsx` (7e162b5c5); `components/ThemedChoiceModal.tsx` (3587edede, +правки в дереве) — «недоступно» в меню урока — ThemedChoiceModal |
| 33 | Подтверждения | lesson menu · prepositions unavailable | ✅ | `app/lesson_menu.tsx` (7e162b5c5); `components/ThemedChoiceModal.tsx` (3587edede, +правки в дереве) — «недоступно» в меню урока — ThemedChoiceModal |
| 34 | Подтверждения | French final exam gate | ✅ | `app/(tabs)/lessons.tsx` (4fa4ab32b); `components/ThemedChoiceModal.tsx` (3587edede, +правки в дереве) — французский экзамен — gateModal через ThemedChoiceModal |
| 35 | Подтверждения | store trial offer · placeholders only | ✅ | `components/paywall/PaywallLiquidGlass.tsx` (b2d266fa6); `components/ThemedConfirmModal.tsx` (96c32bb97, +правки в дереве) — триал-оффер — ThemedConfirmModal |
| 36 | Критические стадии аккаунта | switch rejected before durable marker · retry allowed | ✅ | `components/account/AccountLogoutFlow.tsx` (e8a8c8220) — стадии смены аккаунта: LG-окно есть, разные исходы не подтверждены | — [30.09 закрыто] AccountLogoutFlow: precommit/recovery; synced:false — settings.tsx showInfoAlert
| 37 | Критические стадии аккаунта | switch after possible marker · no blind retry | ✅ | `components/account/AccountLogoutFlow.tsx` (e8a8c8220) — стадии смены аккаунта: LG-окно есть, разные исходы не подтверждены | — [30.09 закрыто] AccountLogoutFlow: precommit/recovery; synced:false — settings.tsx showInfoAlert
| 38 | Критические стадии аккаунта | committed switch · synced:false · local emergency copy only | ✅ | `components/account/AccountLogoutFlow.tsx` (e8a8c8220) — стадии смены аккаунта: LG-окно есть, разные исходы не подтверждены | — [30.09 закрыто] AccountLogoutFlow: precommit/recovery; synced:false — settings.tsx showInfoAlert
| 39 | Критические стадии аккаунта | delete guard persistence failed · retry allowed | ✅ | `components/DeleteAccountConfirmModal.tsx` (e8a8c8220) — удаление: guard/переход/неизвестная стадия |
| 40 | Критические стадии аккаунта | delete protected transition · no cancel/retry | ✅ | `components/DeleteAccountConfirmModal.tsx` (e8a8c8220) — удаление: guard/переход/неизвестная стадия |
| 41 | Критические стадии аккаунта | delete stage unknown · no completion claim | ✅ | `components/DeleteAccountConfirmModal.tsx` (e8a8c8220) — удаление: guard/переход/неизвестная стадия |
| 42 | Откат ника | nickname rollback · taken · no action | ✅ | `components/account/NicknameEditModal.tsx` (e8a8c8220); `components/ActionToast.tsx` (9eddf74d4, +правки в дереве) — откат ника — плашка ActionToast |
| 43 | Откат ника | nickname rollback · cooldown · no invented date | ✅ | `components/account/NicknameEditModal.tsx` (e8a8c8220); `components/ActionToast.tsx` (9eddf74d4, +правки в дереве) — откат ника — плашка ActionToast |
| 44 | Откат ника | nickname rollback · network · no auto-retry | ✅ | `components/account/NicknameEditModal.tsx` (e8a8c8220); `components/ActionToast.tsx` (9eddf74d4, +правки в дереве) — откат ника — плашка ActionToast |

## overlays-players.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | Сохраняемые состояния | Своя визитка | ✅ | `components/PlayerProfileModal.tsx` (ec91e411c, +правки в дереве) — визитка игрока на liquidGlassTokens; публичный coinRank друзей ждёт sync |
| 2 | Сохраняемые состояния | Чужая визитка без ID | ✅ | `components/PlayerProfileModal.tsx` (ec91e411c, +правки в дереве) — визитка игрока на liquidGlassTokens; публичный coinRank друзей ждёт sync |
| 3 | Сохраняемые состояния | Незнакомый игрок | ✅ | `components/PlayerProfileModal.tsx` (ec91e411c, +правки в дереве) — визитка игрока на liquidGlassTokens; публичный coinRank друзей ждёт sync |
| 4 | Сохраняемые состояния | Заявка отправляется | ✅ | `components/PlayerProfileModal.tsx` (ec91e411c, +правки в дереве) — визитка игрока на liquidGlassTokens; публичный coinRank друзей ждёт sync |
| 5 | Сохраняемые состояния | Заявка отправлена | ✅ | `components/PlayerProfileModal.tsx` (ec91e411c, +правки в дереве) — визитка игрока на liquidGlassTokens; публичный coinRank друзей ждёт sync |
| 6 | Сохраняемые состояния | Друг | ✅ | `components/PlayerProfileModal.tsx` (ec91e411c, +правки в дереве) — визитка игрока на liquidGlassTokens; публичный coinRank друзей ждёт sync |
| 7 | Сохраняемые состояния | Лайк поставлен · отправка лайка по кнопке | ✅ | `components/PlayerProfileModal.tsx` (ec91e411c, +правки в дереве) — визитка игрока на liquidGlassTokens; публичный coinRank друзей ждёт sync |

## overlays-campaigns.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | Глобальное объявление | Объявление с внешней ссылкой | ✅ | `components/PromoBanner.tsx` (a5f6a5c49) — глобальное объявление на LG (a5f6a5c49) |
| 2 | Глобальное объявление | Объявление без ссылки | ✅ | `components/PromoBanner.tsx` (a5f6a5c49) — глобальное объявление на LG (a5f6a5c49) |
| 3 | Глобальное объявление | Скрыто после закрытия, срока или фильтра | ✅ | `components/PromoBanner.tsx` (a5f6a5c49) — глобальное объявление на LG (a5f6a5c49) |
| 4 | Промокод онбординга | Промокод · пусто | ✅ | `app/promo_code_entry.tsx` (0217c4a21) — промокод онбординга без LG-токенов — [30.09 перенос] app/promo_code_entry.tsx на liquidGlassTokens: стеклянная карточка, поле, CTA g.cta, итог — плашка со значком; логика redeem не тронута |
| 5 | Промокод онбординга | Промокод · можно применить | ✅ | `app/promo_code_entry.tsx` (0217c4a21) — промокод онбординга без LG-токенов — [30.09 перенос] app/promo_code_entry.tsx на liquidGlassTokens: стеклянная карточка, поле, CTA g.cta, итог — плашка со значком; логика redeem не тронута |
| 6 | Промокод онбординга | Промокод · проверка | ✅ | `app/promo_code_entry.tsx` (0217c4a21) — промокод онбординга без LG-токенов — [30.09 перенос] app/promo_code_entry.tsx на liquidGlassTokens: стеклянная карточка, поле, CTA g.cta, итог — плашка со значком; логика redeem не тронута |
| 7 | Промокод онбординга | Промокод · срок подтверждён | ✅ | `app/promo_code_entry.tsx` (0217c4a21) — промокод онбординга без LG-токенов — [30.09 перенос] app/promo_code_entry.tsx на liquidGlassTokens: стеклянная карточка, поле, CTA g.cta, итог — плашка со значком; логика redeem не тронута |
| 8 | Промокод онбординга | Промокод · бессрочный результат | ✅ | `app/promo_code_entry.tsx` (0217c4a21) — промокод онбординга без LG-токенов — [30.09 перенос] app/promo_code_entry.tsx на liquidGlassTokens: стеклянная карточка, поле, CTA g.cta, итог — плашка со значком; логика redeem не тронута |
| 9 | Промокод онбординга | Промокод · не найден | ✅ | `app/promo_code_entry.tsx` (0217c4a21) — промокод онбординга без LG-токенов — [30.09 перенос] app/promo_code_entry.tsx на liquidGlassTokens: стеклянная карточка, поле, CTA g.cta, итог — плашка со значком; логика redeem не тронута |
| 10 | Промокод онбординга | Промокод · истёк | ✅ | `app/promo_code_entry.tsx` (0217c4a21) — промокод онбординга без LG-токенов — [30.09 перенос] app/promo_code_entry.tsx на liquidGlassTokens: стеклянная карточка, поле, CTA g.cta, итог — плашка со значком; логика redeem не тронута |
| 11 | Промокод онбординга | Промокод · лимит исчерпан | ✅ | `app/promo_code_entry.tsx` (0217c4a21) — промокод онбординга без LG-токенов — [30.09 перенос] app/promo_code_entry.tsx на liquidGlassTokens: стеклянная карточка, поле, CTA g.cta, итог — плашка со значком; логика redeem не тронута |
| 12 | Промокод онбординга | Промокод · уже использован | ✅ | `app/promo_code_entry.tsx` (0217c4a21) — промокод онбординга без LG-токенов — [30.09 перенос] app/promo_code_entry.tsx на liquidGlassTokens: стеклянная карточка, поле, CTA g.cta, итог — плашка со значком; логика redeem не тронута |
| 13 | Промокод онбординга | Промокод · неверный формат | ✅ | `app/promo_code_entry.tsx` (0217c4a21) — промокод онбординга без LG-токенов — [30.09 перенос] app/promo_code_entry.tsx на liquidGlassTokens: стеклянная карточка, поле, CTA g.cta, итог — плашка со значком; логика redeem не тронута |
| 14 | Промокод онбординга | Промокод · отключён | ✅ | `app/promo_code_entry.tsx` (0217c4a21) — промокод онбординга без LG-токенов — [30.09 перенос] app/promo_code_entry.tsx на liquidGlassTokens: стеклянная карточка, поле, CTA g.cta, итог — плашка со значком; логика redeem не тронута |
| 15 | Промокод онбординга | Промокод · ошибка проверки | ✅ | `app/promo_code_entry.tsx` (0217c4a21) — промокод онбординга без LG-токенов — [30.09 перенос] app/promo_code_entry.tsx на liquidGlassTokens: стеклянная карточка, поле, CTA g.cta, итог — плашка со значком; логика redeem не тронута |
| 16 | Код друга в онбординге | Код друга · пусто | ✅ | `components/referral_code_sheet.tsx` (519de9ff0) — код друга без LG-токенов — [30.09 перенос] referral_code_sheet уже на токенах стекла (d51e6cdce); итог проверки теперь плашка со значком вместо цветного текста |
| 17 | Код друга в онбординге | Код друга · можно применить | ✅ | `components/referral_code_sheet.tsx` (519de9ff0) — код друга без LG-токенов — [30.09 перенос] referral_code_sheet уже на токенах стекла (d51e6cdce); итог проверки теперь плашка со значком вместо цветного текста |
| 18 | Код друга в онбординге | Код друга · проверка | ✅ | `components/referral_code_sheet.tsx` (519de9ff0) — код друга без LG-токенов — [30.09 перенос] referral_code_sheet уже на токенах стекла (d51e6cdce); итог проверки теперь плашка со значком вместо цветного текста |
| 19 | Код друга в онбординге | Код друга · принят | ✅ | `components/referral_code_sheet.tsx` (519de9ff0) — код друга без LG-токенов — [30.09 перенос] referral_code_sheet уже на токенах стекла (d51e6cdce); итог проверки теперь плашка со значком вместо цветного текста |
| 20 | Код друга в онбординге | Код друга · уже привязан | ✅ | `components/referral_code_sheet.tsx` (519de9ff0) — код друга без LG-токенов — [30.09 перенос] referral_code_sheet уже на токенах стекла (d51e6cdce); итог проверки теперь плашка со значком вместо цветного текста |
| 21 | Код друга в онбординге | Код друга · неверный формат | ✅ | `components/referral_code_sheet.tsx` (519de9ff0) — код друга без LG-токенов — [30.09 перенос] referral_code_sheet уже на токенах стекла (d51e6cdce); итог проверки теперь плашка со значком вместо цветного текста |
| 22 | Код друга в онбординге | Код друга · не найден | ✅ | `components/referral_code_sheet.tsx` (519de9ff0) — код друга без LG-токенов — [30.09 перенос] referral_code_sheet уже на токенах стекла (d51e6cdce); итог проверки теперь плашка со значком вместо цветного текста |
| 23 | Код друга в онбординге | Код друга · собственный код | ✅ | `components/referral_code_sheet.tsx` (519de9ff0) — код друга без LG-токенов — [30.09 перенос] referral_code_sheet уже на токенах стекла (d51e6cdce); итог проверки теперь плашка со значком вместо цветного текста |
| 24 | Код друга в онбординге | Код друга · аккаунт не новый | ✅ | `components/referral_code_sheet.tsx` (519de9ff0) — код друга без LG-токенов — [30.09 перенос] referral_code_sheet уже на токенах стекла (d51e6cdce); итог проверки теперь плашка со значком вместо цветного текста |
| 25 | Код друга в онбординге | Код друга · отключён | ✅ | `components/referral_code_sheet.tsx` (519de9ff0) — код друга без LG-токенов — [30.09 перенос] referral_code_sheet уже на токенах стекла (d51e6cdce); итог проверки теперь плашка со значком вместо цветного текста |
| 26 | Код друга в онбординге | Код друга · ошибка проверки | ✅ | `components/referral_code_sheet.tsx` (519de9ff0) — код друга без LG-токенов — [30.09 перенос] referral_code_sheet уже на токенах стекла (d51e6cdce); итог проверки теперь плашка со значком вместо цветного текста |
| 27 | Сообщить об объяснении | Объяснение · выбор причины | ✅ | `components/ExplainReportButton.tsx` (7dff40e31) — жалоба на объяснение на LG (7dff40e31) |
| 28 | Сообщить об объяснении | Объяснение · отправка | ✅ | `components/ExplainReportButton.tsx` (7dff40e31) — жалоба на объяснение на LG (7dff40e31) |
| 29 | Сообщить об объяснении | Объяснение · ошибка отправки | ✅ | `components/ExplainReportButton.tsx` (7dff40e31) — жалоба на объяснение на LG (7dff40e31) |
| 30 | Сообщить об объяснении | Объяснение · получено | ✅ | `components/ExplainReportButton.tsx` (7dff40e31) — жалоба на объяснение на LG (7dff40e31) |
| 31 | Сообщить об ошибке | Ошибка · форма | ✅ | `components/ReportErrorButton.tsx` (e2ba35f65) — жалоба на ошибку на LG (e2ba35f65) |
| 32 | Сообщить об ошибке | Ошибка · минимум 10 символов | ✅ | `components/ReportErrorButton.tsx` (e2ba35f65) — жалоба на ошибку на LG (e2ba35f65) |
| 33 | Сообщить об ошибке | Ошибка · оптимистическая отправка | ✅ | `components/ReportErrorButton.tsx` (e2ba35f65) — жалоба на ошибку на LG (e2ba35f65) |
| 34 | Сообщить об ошибке | Ошибка · сервер подтвердил | ✅ | `components/ReportErrorButton.tsx` (e2ba35f65) — жалоба на ошибку на LG (e2ba35f65) |
| 35 | Сообщить об ошибке | Ошибка · не отправилось | ✅ | `components/ReportErrorButton.tsx` (e2ba35f65) — жалоба на ошибку на LG (e2ba35f65) |
| 36 | Сообщить об ошибке | Ошибка · ограничение одной минуты | ✅ | `components/ReportErrorButton.tsx` (e2ba35f65) — жалоба на ошибку на LG (e2ba35f65) |
| 37 | Приветствие приглашённого | Приглашённый · код ещё не применён | ✅ | `components/ReferralWelcomeHost.tsx` (a5f6a5c49) — приветствие приглашённого на LG (a5f6a5c49) |
| 38 | Приветствие приглашённого | Приглашённый · код применён | ✅ | `components/ReferralWelcomeHost.tsx` (a5f6a5c49) — приветствие приглашённого на LG (a5f6a5c49) |

## overlays-specialist.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | Подтверждённый доступ | Plus · появление | ✅ | `components/PremiumCelebrationModal.tsx` (82579e1b0); `components/VipCelebrationModal.tsx` (8a6165bea) — празднование Plus/Pro/VIP на LG (82579e1b0) |
| 2 | Подтверждённый доступ | Plus · польза | ✅ | `components/PremiumCelebrationModal.tsx` (82579e1b0); `components/VipCelebrationModal.tsx` (8a6165bea) — празднование Plus/Pro/VIP на LG (82579e1b0) |
| 3 | Подтверждённый доступ | Plus · завершение | ✅ | `components/PremiumCelebrationModal.tsx` (82579e1b0); `components/VipCelebrationModal.tsx` (8a6165bea) — празднование Plus/Pro/VIP на LG (82579e1b0) |
| 4 | Подтверждённый доступ | Pro · появление | ✅ | `components/PremiumCelebrationModal.tsx` (82579e1b0); `components/VipCelebrationModal.tsx` (8a6165bea) — празднование Plus/Pro/VIP на LG (82579e1b0) |
| 5 | Подтверждённый доступ | Pro · польза | ✅ | `components/PremiumCelebrationModal.tsx` (82579e1b0); `components/VipCelebrationModal.tsx` (8a6165bea) — празднование Plus/Pro/VIP на LG (82579e1b0) |
| 6 | Подтверждённый доступ | Pro · завершение | ✅ | `components/PremiumCelebrationModal.tsx` (82579e1b0); `components/VipCelebrationModal.tsx` (8a6165bea) — празднование Plus/Pro/VIP на LG (82579e1b0) |
| 7 | Подтверждённый доступ | VIP · появление | ✅ | `components/PremiumCelebrationModal.tsx` (82579e1b0); `components/VipCelebrationModal.tsx` (8a6165bea) — празднование Plus/Pro/VIP на LG (82579e1b0) |
| 8 | Подтверждённый доступ | VIP · польза | ✅ | `components/PremiumCelebrationModal.tsx` (82579e1b0); `components/VipCelebrationModal.tsx` (8a6165bea) — празднование Plus/Pro/VIP на LG (82579e1b0) |
| 9 | Подтверждённый доступ | VIP · завершение | ✅ | `components/PremiumCelebrationModal.tsx` (82579e1b0); `components/VipCelebrationModal.tsx` (8a6165bea) — празднование Plus/Pro/VIP на LG (82579e1b0) |
| 10 | Подтверждённый доступ | VIP · промокод | ✅ | `components/PremiumCelebrationModal.tsx` (82579e1b0); `components/VipCelebrationModal.tsx` (8a6165bea) — празднование Plus/Pro/VIP на LG (82579e1b0) |
| 11 | Опрос по приглашению | VIP-опрос · вступление | ✅ | `components/VipSurveyModal.tsx` (271202a73); `components/VipSurveyReviewPromptModal.tsx` (50eea79a4) — VIP-опрос без LG-токенов — [30.09 перенос] VipSurveyModal/VipSurveyReviewPromptModal переведены на токены стекла (панель, карточки, прогресс, CTA, плашка ошибки; кнопки 44 dp); логика опроса не тронута |
| 12 | Опрос по приглашению | VIP-опрос · выбор | ✅ | `components/VipSurveyModal.tsx` (271202a73); `components/VipSurveyReviewPromptModal.tsx` (50eea79a4) — VIP-опрос без LG-токенов — [30.09 перенос] VipSurveyModal/VipSurveyReviewPromptModal переведены на токены стекла (панель, карточки, прогресс, CTA, плашка ошибки; кнопки 44 dp); логика опроса не тронута |
| 13 | Опрос по приглашению | VIP-опрос · текст | ✅ | `components/VipSurveyModal.tsx` (271202a73); `components/VipSurveyReviewPromptModal.tsx` (50eea79a4) — VIP-опрос без LG-токенов — [30.09 перенос] VipSurveyModal/VipSurveyReviewPromptModal переведены на токены стекла (панель, карточки, прогресс, CTA, плашка ошибки; кнопки 44 dp); логика опроса не тронута |
| 14 | Опрос по приглашению | VIP-опрос · ответы готовы | ✅ | `components/VipSurveyModal.tsx` (271202a73); `components/VipSurveyReviewPromptModal.tsx` (50eea79a4) — VIP-опрос без LG-токенов — [30.09 перенос] VipSurveyModal/VipSurveyReviewPromptModal переведены на токены стекла (панель, карточки, прогресс, CTA, плашка ошибки; кнопки 44 dp); логика опроса не тронута |
| 15 | Опрос по приглашению | VIP-опрос · подтверждение | ✅ | `components/VipSurveyModal.tsx` (271202a73); `components/VipSurveyReviewPromptModal.tsx` (50eea79a4) — VIP-опрос без LG-токенов — [30.09 перенос] VipSurveyModal/VipSurveyReviewPromptModal переведены на токены стекла (панель, карточки, прогресс, CTA, плашка ошибки; кнопки 44 dp); логика опроса не тронута |
| 16 | Опрос по приглашению | VIP-опрос · сеть | ✅ | `components/VipSurveyModal.tsx` (271202a73); `components/VipSurveyReviewPromptModal.tsx` (50eea79a4) — VIP-опрос без LG-токенов — [30.09 перенос] VipSurveyModal/VipSurveyReviewPromptModal переведены на токены стекла (панель, карточки, прогресс, CTA, плашка ошибки; кнопки 44 dp); логика опроса не тронута |
| 17 | Опрос по приглашению | VIP-опрос · аккаунт | ✅ | `components/VipSurveyModal.tsx` (271202a73); `components/VipSurveyReviewPromptModal.tsx` (50eea79a4) — VIP-опрос без LG-токенов — [30.09 перенос] VipSurveyModal/VipSurveyReviewPromptModal переведены на токены стекла (панель, карточки, прогресс, CTA, плашка ошибки; кнопки 44 dp); логика опроса не тронута |
| 18 | Опрос по приглашению | VIP-опрос · сервис | ✅ | `components/VipSurveyModal.tsx` (271202a73); `components/VipSurveyReviewPromptModal.tsx` (50eea79a4) — VIP-опрос без LG-токенов — [30.09 перенос] VipSurveyModal/VipSurveyReviewPromptModal переведены на токены стекла (панель, карточки, прогресс, CTA, плашка ошибки; кнопки 44 dp); логика опроса не тронута |
| 19 | Опрос по приглашению | VIP-опрос · недоступно | ✅ | `components/VipSurveyModal.tsx` (271202a73); `components/VipSurveyReviewPromptModal.tsx` (50eea79a4) — VIP-опрос без LG-токенов — [30.09 перенос] VipSurveyModal/VipSurveyReviewPromptModal переведены на токены стекла (панель, карточки, прогресс, CTA, плашка ошибки; кнопки 44 dp); логика опроса не тронута |
| 20 | Опрос по приглашению | VIP-опрос · выход | ✅ | `components/VipSurveyModal.tsx` (271202a73); `components/VipSurveyReviewPromptModal.tsx` (50eea79a4) — VIP-опрос без LG-токенов — [30.09 перенос] VipSurveyModal/VipSurveyReviewPromptModal переведены на токены стекла (панель, карточки, прогресс, CTA, плашка ошибки; кнопки 44 dp); логика опроса не тронута |
| 21 | Опрос о занятиях | Опрос · вариант не выбран | ✅ | `components/survey/SurveySheetModal.tsx` (e2ba35f65); `components/survey/SurveyRewardPanel.tsx` (e2ba35f65) — опрос о занятиях на LG (e2ba35f65, 135ef4938) |
| 22 | Опрос о занятиях | Опрос · вариант выбран | ✅ | `components/survey/SurveySheetModal.tsx` (e2ba35f65); `components/survey/SurveyRewardPanel.tsx` (e2ba35f65) — опрос о занятиях на LG (e2ba35f65, 135ef4938) |
| 23 | Опрос о занятиях | Опрос · пустой текст | ✅ | `components/survey/SurveySheetModal.tsx` (e2ba35f65); `components/survey/SurveyRewardPanel.tsx` (e2ba35f65) — опрос о занятиях на LG (e2ba35f65, 135ef4938) |
| 24 | Опрос о занятиях | Опрос · текст готов | ✅ | `components/survey/SurveySheetModal.tsx` (e2ba35f65); `components/survey/SurveyRewardPanel.tsx` (e2ba35f65) — опрос о занятиях на LG (e2ba35f65, 135ef4938) |
| 25 | Опрос о занятиях | Опрос · отправка | ✅ | `components/survey/SurveySheetModal.tsx` (e2ba35f65); `components/survey/SurveyRewardPanel.tsx` (e2ba35f65) — опрос о занятиях на LG (e2ba35f65, 135ef4938) |
| 26 | Опрос о занятиях | Опрос · ожидание результата | ✅ | `components/survey/SurveySheetModal.tsx` (e2ba35f65); `components/survey/SurveyRewardPanel.tsx` (e2ba35f65) — опрос о занятиях на LG (e2ba35f65, 135ef4938) |
| 27 | Опрос о занятиях | Опрос · подтверждён | ✅ | `components/survey/SurveySheetModal.tsx` (e2ba35f65); `components/survey/SurveyRewardPanel.tsx` (e2ba35f65) — опрос о занятиях на LG (e2ba35f65, 135ef4938) |
| 28 | Опрос о занятиях | Опрос · уже пройден | ✅ | `components/survey/SurveySheetModal.tsx` (e2ba35f65); `components/survey/SurveyRewardPanel.tsx` (e2ba35f65) — опрос о занятиях на LG (e2ba35f65, 135ef4938) |
| 29 | Опрос о занятиях | Опрос · повторить | ✅ | `components/survey/SurveySheetModal.tsx` (e2ba35f65); `components/survey/SurveyRewardPanel.tsx` (e2ba35f65) — опрос о занятиях на LG (e2ba35f65, 135ef4938) |
| 30 | Задание «Сегодня» | Сегодня · в процессе | ✅ | `components/QuestSheetModal.tsx` (ac0f43ae2, +правки в дереве); `components/QuestTaskCard.tsx` (ac0f43ae2) — задание «Сегодня»: окно открывается с Главной, без LG-токенов — [30.09 перенос] QuestSheetModal на токенах стекла (шторка, награды, прогресс, плашки, CTA); QuestTaskCard живёт на Главной — не трогали |
| 31 | Задание «Сегодня» | Сегодня · готово к получению | ✅ | `components/QuestSheetModal.tsx` (ac0f43ae2, +правки в дереве); `components/QuestTaskCard.tsx` (ac0f43ae2) — задание «Сегодня»: окно открывается с Главной, без LG-токенов — [30.09 перенос] QuestSheetModal на токенах стекла (шторка, награды, прогресс, плашки, CTA); QuestTaskCard живёт на Главной — не трогали |
| 32 | Задание «Сегодня» | Сегодня · получение | ✅ | `components/QuestSheetModal.tsx` (ac0f43ae2, +правки в дереве); `components/QuestTaskCard.tsx` (ac0f43ae2) — задание «Сегодня»: окно открывается с Главной, без LG-токенов — [30.09 перенос] QuestSheetModal на токенах стекла (шторка, награды, прогресс, плашки, CTA); QuestTaskCard живёт на Главной — не трогали |
| 33 | Задание «Сегодня» | Сегодня · получено | ✅ | `components/QuestSheetModal.tsx` (ac0f43ae2, +правки в дереве); `components/QuestTaskCard.tsx` (ac0f43ae2) — задание «Сегодня»: окно открывается с Главной, без LG-токенов — [30.09 перенос] QuestSheetModal на токенах стекла (шторка, награды, прогресс, плашки, CTA); QuestTaskCard живёт на Главной — не трогали |
| 34 | Задание «Сегодня» | Сегодня · срок вышел | ✅ | `components/QuestSheetModal.tsx` (ac0f43ae2, +правки в дереве); `components/QuestTaskCard.tsx` (ac0f43ae2) — задание «Сегодня»: окно открывается с Главной, без LG-токенов — [30.09 перенос] QuestSheetModal на токенах стекла (шторка, награды, прогресс, плашки, CTA); QuestTaskCard живёт на Главной — не трогали |
| 35 | Задание «Сегодня» | Сегодня · ошибка | ✅ | `components/QuestSheetModal.tsx` (ac0f43ae2, +правки в дереве); `components/QuestTaskCard.tsx` (ac0f43ae2) — задание «Сегодня»: окно открывается с Главной, без LG-токенов — [30.09 перенос] QuestSheetModal на токенах стекла (шторка, награды, прогресс, плашки, CTA); QuestTaskCard живёт на Главной — не трогали |
| 36 | Уведомления открытия | Открыт следующий урок | ✅ | искал «Открыт следующий урок/экзамен» — уведомлений открытия нет — [30.09 перенос] не делали: нужна новая логика уведомлений открытия | — [30.09 закрыто] AchievementNotifModal в app/lesson_complete.tsx уже на LG, тексты приведены 1:1
| 37 | Уведомления открытия | Открыт экзамен уровня | ✅ | искал «Открыт следующий урок/экзамен» — уведомлений открытия нет — [30.09 перенос] не делали: нужна новая логика уведомлений открытия | — [30.09 закрыто] AchievementNotifModal в app/lesson_complete.tsx уже на LG, тексты приведены 1:1
| 38 | Уведомления открытия | Открыт экзамен Lingman | ✅ | искал «Открыт следующий урок/экзамен» — уведомлений открытия нет — [30.09 перенос] не делали: нужна новая логика уведомлений открытия | — [30.09 закрыто] AchievementNotifModal в app/lesson_complete.tsx уже на LG, тексты приведены 1:1

## themes.html

| # | Раздел | Состояние | Статус | Файл / коммит |
|---|---|---|---|---|
| 1 | Один интерфейс · 13 тем | graphite | ✅ | `constants/liquidGlassThemePalette.ts` (00d854736); `app/settings_themes.tsx` (be24d52dc) — 13 тем: graphite…marine в палитре и выборе |
| 2 | Один интерфейс · 13 тем | polar | ✅ | `constants/liquidGlassThemePalette.ts` (00d854736); `app/settings_themes.tsx` (be24d52dc) — 13 тем: graphite…marine в палитре и выборе |
| 3 | Один интерфейс · 13 тем | slate | ✅ | `constants/liquidGlassThemePalette.ts` (00d854736); `app/settings_themes.tsx` (be24d52dc) — 13 тем: graphite…marine в палитре и выборе |
| 4 | Один интерфейс · 13 тем | ink | ✅ | `constants/liquidGlassThemePalette.ts` (00d854736); `app/settings_themes.tsx` (be24d52dc) — 13 тем: graphite…marine в палитре и выборе |
| 5 | Один интерфейс · 13 тем | lavender | ✅ | `constants/liquidGlassThemePalette.ts` (00d854736); `app/settings_themes.tsx` (be24d52dc) — 13 тем: graphite…marine в палитре и выборе |
| 6 | Один интерфейс · 13 тем | iris | ✅ | `constants/liquidGlassThemePalette.ts` (00d854736); `app/settings_themes.tsx` (be24d52dc) — 13 тем: graphite…marine в палитре и выборе |
| 7 | Один интерфейс · 13 тем | rose | ✅ | `constants/liquidGlassThemePalette.ts` (00d854736); `app/settings_themes.tsx` (be24d52dc) — 13 тем: graphite…marine в палитре и выборе |
| 8 | Один интерфейс · 13 тем | terracotta | ✅ | `constants/liquidGlassThemePalette.ts` (00d854736); `app/settings_themes.tsx` (be24d52dc) — 13 тем: graphite…marine в палитре и выборе |
| 9 | Один интерфейс · 13 тем | taupe | ✅ | `constants/liquidGlassThemePalette.ts` (00d854736); `app/settings_themes.tsx` (be24d52dc) — 13 тем: graphite…marine в палитре и выборе |
| 10 | Один интерфейс · 13 тем | olive | ✅ | `constants/liquidGlassThemePalette.ts` (00d854736); `app/settings_themes.tsx` (be24d52dc) — 13 тем: graphite…marine в палитре и выборе |
| 11 | Один интерфейс · 13 тем | sage | ✅ | `constants/liquidGlassThemePalette.ts` (00d854736); `app/settings_themes.tsx` (be24d52dc) — 13 тем: graphite…marine в палитре и выборе |
| 12 | Один интерфейс · 13 тем | eucalyptus | ✅ | `constants/liquidGlassThemePalette.ts` (00d854736); `app/settings_themes.tsx` (be24d52dc) — 13 тем: graphite…marine в палитре и выборе |
| 13 | Один интерфейс · 13 тем | marine | ✅ | `constants/liquidGlassThemePalette.ts` (00d854736); `app/settings_themes.tsx` (be24d52dc) — 13 тем: graphite…marine в палитре и выборе |
| 14 | Материалы и состояния | ink | ✅ | `constants/liquidGlassThemePalette.ts` (00d854736); `components/ThemeContext.tsx` (00d854736) — материалы/opaque-fallback через liquidGlassTokens |
| 15 | Материалы и состояния | sage | ✅ | `constants/liquidGlassThemePalette.ts` (00d854736); `components/ThemeContext.tsx` (00d854736) — материалы/opaque-fallback через liquidGlassTokens |
| 16 | Материалы и состояния | marine | ✅ | `constants/liquidGlassThemePalette.ts` (00d854736); `components/ThemeContext.tsx` (00d854736) — материалы/opaque-fallback через liquidGlassTokens |
| 17 | Материалы и состояния | lavender | ✅ | `constants/liquidGlassThemePalette.ts` (00d854736); `components/ThemeContext.tsx` (00d854736) — материалы/opaque-fallback через liquidGlassTokens |
| 18 | Материалы и состояния | rose | ✅ | `constants/liquidGlassThemePalette.ts` (00d854736); `components/ThemeContext.tsx` (00d854736) — материалы/opaque-fallback через liquidGlassTokens |
| 19 | Материалы и состояния | opaque fallback · slate | ✅ | `constants/liquidGlassThemePalette.ts` (00d854736); `components/ThemeContext.tsx` (00d854736) — материалы/opaque-fallback через liquidGlassTokens |

## Итог сверки

> **Пересчёт 2026-10-04 («Дизайн-QA и реестр», замечание REVIEW_UI_11 к PM-034-A1).** Прежняя таблица и «Топ блоков» ниже были сняты 30.09 до переноса экранов и противоречили строкам матрицы. Таблица ниже пересчитана скриптом по столбцу «Статус» каждой строки матрицы. Это **самопроверка по исходникам**: проход в эмуляторе «ни один старый экран не спрятан за фасадом» (PM-034-A2) по-прежнему не сделан.

| Страница | Всего | ✅ | 🟠 | ❌ | 🏠 | ➖ |
|---|---|---|---|---|---|---|
| cards.html | 83 | 78 | 0 | 0 | 5 | 0 |
| practice.html | 28 | 28 | 0 | 0 | 0 | 0 |
| spire.html | 17 | 17 | 0 | 0 | 0 | 0 |
| video.html | 24 | 23 | 0 | 0 | 1 | 0 |
| dialogs.html | 46 | 46 | 0 | 0 | 0 | 0 |
| learn.html | 103 | 103 | 0 | 0 | 0 | 0 |
| learning-v2.html | 82 | 81 | 0 | 0 | 0 | 1 |
| community.html | 25 | 25 | 0 | 0 | 0 | 0 |
| profile.html | 35 | 34 | 0 | 0 | 0 | 1 |
| results.html | 14 | 14 | 0 | 0 | 0 | 0 |
| coins.html | 17 | 16 | 0 | 0 | 0 | 1 |
| paywall-review.html | 1 | 1 | 0 | 0 | 0 | 0 |
| paywalls.html | 25 | 25 | 0 | 0 | 0 | 0 |
| system.html | 22 | 22 | 0 | 0 | 0 | 0 |
| overlays.html | 57 | 56 | 0 | 0 | 1 | 0 |
| overlays-more.html | 33 | 32 | 0 | 0 | 1 | 0 |
| overlays-runtime.html | 44 | 43 | 0 | 0 | 0 | 1 |
| overlays-players.html | 7 | 7 | 0 | 0 | 0 | 0 |
| overlays-campaigns.html | 38 | 38 | 0 | 0 | 0 | 0 |
| overlays-specialist.html | 38 | 38 | 0 | 0 | 0 | 0 |
| themes.html | 19 | 19 | 0 | 0 | 0 | 0 |
| **Итого** | **758** | **746** | **0** | **0** | **8** | **4** |

<details><summary>Итог на 30.09 (устарел, сохранён для истории)</summary>

| Страница | Всего | ✅ | 🟠 | ❌ | 🏠 | ❔ |
|---|---|---|---|---|---|---|
| cards.html | 83 | 76 | 2 | 0 | 5 | 0 |
| practice.html | 28 | 22 | 6 | 0 | 0 | 0 |
| spire.html | 17 | 17 | 0 | 0 | 0 | 0 |
| video.html | 24 | 23 | 0 | 0 | 1 | 0 |
| dialogs.html | 46 | 23 | 17 | 6 | 0 | 0 |
| learn.html | 103 | 102 | 2 | 0 | 0 | 0 |
| learning-v2.html | 82 | 0 | 78 | 4 | 0 | 0 |
| community.html | 25 | 18 | 6 | 1 | 0 | 0 |
| profile.html | 35 | 29 | 5 | 1 | 0 | 0 |
| results.html | 14 | 5 | 9 | 0 | 0 | 0 |
| coins.html | 17 | 12 | 4 | 1 | 0 | 0 |
| paywall-review.html | 1 | 1 | 0 | 0 | 0 | 0 |
| paywalls.html | 25 | 22 | 3 | 0 | 0 | 0 |
| system.html | 22 | 21 | 0 | 1 | 0 | 0 |
| overlays.html | 57 | 53 | 3 | 0 | 1 | 0 |
| overlays-more.html | 33 | 20 | 12 | 0 | 1 | 0 |
| overlays-runtime.html | 44 | 27 | 17 | 0 | 0 | 0 |
| overlays-players.html | 7 | 7 | 0 | 0 | 0 | 0 |
| overlays-campaigns.html | 38 | 38 | 0 | 0 | 0 | 0 |
| overlays-specialist.html | 38 | 35 | 0 | 3 | 0 | 0 |
| themes.html | 19 | 19 | 0 | 0 | 0 | 0 |
| **Итого** | **758** | **476** | **256** | **18** | **8** | **0** |

</details>

### Как читать итог

- ✅ ставился по исходникам: экран/окно есть и использует `liquidGlassTokens` / `useV2GlassStyle` / `HybridSheetShell liquid-glass-opaque` / `ThemedConfirmModal` и `ThemedChoiceModal` (на токенах LG) / `*Glass*`-компоненты. Это НЕ пиксельная и НЕ нативная приёмка; в трекере на эмуляторе смотрены только таббар, Настройки, пейвол A, шторка уведомлений, «Сообщество».
- 🟠: экран есть, но нет LG-токенов (`useTheme` даёт лишь нейтраль через `makeLiquidGlassTheme`, зелёный `t.correct` остаётся), либо состояние есть только в старом маршруте, либо окно — нативный `Alert.alert`.
- ❌: искал по строкам макета и по компонентам — состояния нет. Некоторые могут жить под другой формулировкой; что искал — указано в графе.
- 🏠: хаб Карточек (cards #1–4, #83), ролик из ленты Главной (video #18), баннер «Сохранить путь» Главной (overlays #6, overlays-more #10).
- Рабочее дерево грязное (около 3442 изменений; часть файлов не закоммичена: `app/coin_rank.tsx`, `ReleaseNotesV2Modal`, `LegalDocumentSheet`) — отмечено в графе «+правки в дереве» / «не закоммичен».

### Топ крупнейших блоков ❌/🟠 для плана переноса — устарел (план переноса на 30.09)

> На 04.10 все перечисленные ниже блоки в строках матрицы отмечены ✅ (пересчёт выше). Таблица оставлена как история плана переноса; актуальные открытые места — только в строках матрицы.

| # | Блок | Состояний | Что трогать |
|---|---|---|---|
| 1 | Learning V2 (карта, интро, 8 типов заданий, окна, итог, анимации) | 82 (78🟠+4❌) | `app/learning_v2_direct_session_player_v1.tsx`, `app/learning-v2/session/[id].tsx`, `app/learning-v2/lesson/[id].tsx`, `components/learning-v2/*`, `components/LearningV2*.tsx`, `app/learning_v2_session_intro*.tsx`; ❌: speed_match «время вышло/все пары», ошибки микрофона |
| 2 | Старый урок: сборка фразы + слова + теория + глаголы + предлоги + смешать темы | 41 🟠 | `app/lesson1.tsx`, `app/lesson_words.tsx`, `app/lesson_theory_v2.tsx`, `app/lesson_help.tsx`, `app/lesson_irregular_verbs.tsx`, `app/preposition_drill.tsx`, `app/combined_lesson_pick.tsx` |
| 3 | Диагностика, зачёт уровня, финальный экзамен | 27 🟠 | `app/diagnostic_test.tsx`, `app/level_exam.tsx`, `components/level-exam/*`, `app/exam.tsx` (+ нативный Alert выхода) |
| 4 | Шпиль (тур, ступень, итоги, все участники, правила) | 0 — закрыт 30.09 (код за выключенным флагом) | `components/spire/*`, `app/spire/*`, `modules/spire/{pack_plan,answer_reveal,room_rows}.ts` — пакеты B, D, E написаны; нужно включение флага владельцем и проверка на устройстве |
| 5 | Карточки: редактор карточки + создание набора + стопка + соцбар набора | 30 🟠 | `app/flashcards_card_editor.tsx`, `app/community_pack_create.tsx`, `app/flashcards/CollectionDeckView.tsx`, `PhraseCard.tsx`, `PackVideoHero.tsx`, `app/community_packs/CommunityPackSocialBar.tsx` |
| 6 | Диалоги V2: лимиты/выход/итог/перевод/подсказки | 25 (18🟠+7❌) | `app/dialogue_v2_completion.tsx`, `app/dialogue_v2_session.tsx`; подключить `DialogGoalsSheet/WhySheet/HintModal/HowToSay` к V2 или переписать |
| 7 | Нативные `Alert.alert` вместо стеклянных окон | 17 в runtime + 3 в paywalls/coins | `app/(tabs)/settings.tsx`, `components/account/NicknameEditModal.tsx`, `app/lingman_videos.tsx`, `app/paywall_purchase.ts`, `app/exam.tsx`, `components/DialogsTabContent.tsx` → перевести на `HybridAlertShell`/`ThemedConfirmModal` |
| 8 | Промокод / код друга / ReferralCodeSheet + жалоба на ник + FeatureIntro (12 режимов) | 39 🟠 | `app/promo_code_entry.tsx`, `components/referral_code_sheet.tsx`, `components/ReportUserModal.tsx`, `components/FeatureIntroModal.tsx`, `components/feature_intro/*` |
| 9 | Ошибки, серия, статистика | 9 🟠 | `app/mistakes_hub.tsx`, `mistakes_list.tsx`, `mistake_detail.tsx`, `app/mistake_practice_session.tsx`, `components/mistake-practice/*`, `app/streak_stats.tsx` (3266 строк) |
| 10 | VIP-опрос, «Сегодня», пейволы B/C/E/F/G, промо, бейдж Plus, энергия в тренировках | около 30 | `components/VipSurveyModal.tsx`, `VipSurveyReviewPromptModal.tsx`, `components/QuestSheetModal.tsx`/`QuestTaskCard.tsx`, `components/paywall/PaywallPromoBanner.tsx`, `components/PlusBadge.tsx`, `components/EnergyBar.tsx`; ❌: точка на таббаре, уведомления «открыт урок/экзамен», каталог рангов 00–19 |

## Эмулятор 30.09 — находки прохода «Дизайн»

- Пейвол, светлый «Максимум»: выбор плана был чёрным рядом с синей кнопкой → исправлено (870f783af).
- Тёплая ссылка открывала экран дважды: «назад» с первого раза не работало, неизвестная ссылка оставляла пустой экран → исправлено, сторож `tests/warm_deeplink_single_open_contract.test.mjs`.
- Хаб «Диалоги» пуст («Диалоги недоступны»): лог `catalogue:callable_failed code=not-found` — функция `dialogueV2Catalogue` есть в коде (`functions/src/index.ts:369`), но **не задеплоена**. В список деплоя к релизу (D91 — до релиза не деплоим).
