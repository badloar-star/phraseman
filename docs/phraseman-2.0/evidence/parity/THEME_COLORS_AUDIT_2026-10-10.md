# Цвета экранов 2.0 — аудит захардкоженных значений (10.10)

Замечание владельца 10.10: цвета берутся ТОЛЬКО из токенов выбранной темы; макет «Авроры» — эталон формы и состава, а не источник HEX.
Сканер: `tests/helpers/hardcoded_colors_scan.mjs` (тот же, что в сторожe-храповике `tests/theme_hardcoded_colors_ratchet.test.mjs`). Строки с `// theme-exempt: причина` не считаются.
Не сканируются: файлы токенов тем и палитр, Главная, Learning V2 / factory_native, dev-экраны, онбординг, админка.

**Осталось:** 1527 цветов в 173 файлах.

## По классам

| Класс | Шт. |
|---|---|
| Иллюстрация/бренд | 690 |
| Другое | 229 |
| Семантика | 169 |
| Скрим/подложка | 139 |
| Белый с альфой | 88 |
| Серый | 57 |
| Тень | 55 |
| Белый | 54 |
| Скрим | 30 |
| Тёмная база | 14 |
| Медиа | 2 |

## По областям

| Область | Шт. |
|---|---|
| Прочее | 943 |
| Профиль/Настройки | 177 |
| Результаты | 147 |
| Карточки | 71 |
| Сообщество | 69 |
| Монеты | 68 |
| Видео | 35 |
| Диалоги | 16 |
| Ошибки | 1 |

## Таблица: файл → строка → цвет → класс → токен темы

(иллюстрации и брендовые палитры сведены в одну строку на файл)

| Область | Файл:строка | Цвет | Класс | Токен темы вместо |
|---|---|---|---|---|
| Видео | components/share_cards/LingmanCertificateSvg.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Диалоги | app/ai_dialog_session.tsx:2161 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Диалоги | app/ai_dialog_session.tsx:2190 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Диалоги | components/centered_dialog_shell.tsx:159 | `rgba(0,0,0,0.6)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Диалоги | components/dialogs/DialogHintModal.tsx:39 | `#000000` | Тень | g.dropShadow |
| Диалоги | components/dialogs/DialogHowToSaySheet.tsx:432 | `rgba(0,0,0,0.55)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Диалоги | components/dialogs/DialogueV2BriefingScreen.tsx:102 | `#1C1C1E` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Диалоги | components/dialogs/DialogueV2BriefingScreen.tsx:102 | `#161618` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Диалоги | components/dialogs/DialogueV2CatalogueSection.tsx:126 | `#161618` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Диалоги | components/dialogs/DialogueV2CatalogueSection.tsx:126 | `#1D1D1F` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Диалоги | components/dialogs/DialogueV2CatalogueSection.tsx:126 | `#28282A` | Серый | g.opaqueControl |
| Диалоги | components/dialogs/glass/DialogueGlassSessionParts.tsx:97 | `#242426` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Диалоги | components/dialogs/glass/DialogueGlassSessionParts.tsx:97 | `#161618` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Диалоги | components/DialogVictoryCelebrationHybrid.tsx:369 | `rgba(255,206,120,0.0)` | Семантика | LV2_BAD (g.bad) |
| Диалоги | components/lessons/LessonsGateDialog.tsx:35 | `#000000` | Тень | g.dropShadow |
| Диалоги | components/v2/GlassAlertDialog.tsx:112 | `rgba(0,0,0,0.62)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Диалоги | components/v2/GlassAlertDialog.tsx:113 | `#000000` | Тень | g.dropShadow |
| Карточки | app/community_packs/CommunityPackSocialBar.tsx:489 | `rgba(255,255,255,0.07)` | Белый с альфой | g.glassEdge |
| Карточки | app/community_packs/PackCommentsSheet.tsx:863 | `rgba(0,0,0,0.58)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Карточки | app/community_packs/PackCreateGlassParts.tsx:117 | `rgba(0,0,0,0.45)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Карточки | app/flashcards_blitz_session.tsx:108 | `#FF8A3D` | Семантика | LV2_BAD (g.bad) |
| Карточки | app/flashcards_blitz_session.tsx:109 | `#40C080` | Семантика | LV2_GOOD (g.good) |
| Карточки | app/flashcards_blitz_session.tsx:110 | `#E05050` | Семантика | LV2_BAD (g.bad) |
| Карточки | app/flashcards_blitz_session.tsx:117 | `rgba(111,208,140,0.14)` | Семантика | LV2_GOOD (g.good) |
| Карточки | app/flashcards_blitz_session.tsx:118 | `rgba(224,80,80,0.14)` | Семантика | LV2_BAD (g.bad) |
| Карточки | app/flashcards_blitz_session.tsx:121 | `#6FD08C` | Семантика | LV2_GOOD (g.good) |
| Карточки | app/flashcards_blitz_session.tsx:1475 | `#2C2C2E` | Серый | g.opaqueControl |
| Карточки | app/flashcards_my_packs.tsx:826 | `#D9565D` | Семантика | LV2_BAD (g.bad) |
| Карточки | app/flashcards_my_packs.tsx:827 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Карточки | app/flashcards_my_packs.tsx:827 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Карточки | app/flashcards_packs.tsx:111 | `rgba(255,250,252,0.98)` | Белый с альфой | g.mediaInk + альфа |
| Карточки | app/flashcards_packs.tsx:792 | `rgba(255,255,255,0.08)` | Белый с альфой | g.glassEdge |
| Карточки | app/flashcards_recall_session.tsx:86 | `#185C3A` | Семантика | LV2_GOOD (g.good) |
| Карточки | app/flashcards_recall_session.tsx:87 | `#702B35` | Семантика | LV2_BAD (g.bad) |
| Карточки | app/flashcards_recall_session.tsx:88 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Карточки | app/flashcards_speaking_session.tsx:131 | `#22B8A8` | Семантика | LV2_GOOD (g.good) |
| Карточки | app/flashcards_speaking_session.tsx:133 | `#E9E9EB` | Серый | g.secondary |
| Карточки | app/flashcards_swipe.tsx:256 | `#7CDAFF` | Другое | запросить токен у сессии «Темы» |
| Карточки | app/flashcards_swipe.tsx:257 | `#FFB84D` | Семантика | LV2_BAD (g.bad) |
| Карточки | app/flashcards_swipe.tsx:258 | `#7CFF92` | Семантика | LV2_GOOD (g.good) |
| Карточки | app/flashcards_swipe.tsx:259 | `#D6A4FF` | Другое | запросить токен у сессии «Темы» |
| Карточки | app/flashcards_swipe.tsx:4844 | `#000` | Тень | g.dropShadow |
| Карточки | app/flashcards/CardPackShardPaywallModal.tsx:1052 | `rgba(0,0,0,0)` | Тёмная база | g.deepBase / g.deepBaseAlt / g.opaqueSheet |
| Карточки | app/flashcards/CardPackShardPaywallModal.tsx:1094 | `rgba(0,0,0,0)` | Тёмная база | g.deepBase / g.deepBaseAlt / g.opaqueSheet |
| Карточки | app/flashcards/CardPackShardPaywallModal.tsx:1151 | `rgba(0,0,0,0)` | Тёмная база | g.deepBase / g.deepBaseAlt / g.opaqueSheet |
| Карточки | app/flashcards/CardsGlassKit.tsx:25 | `#FF8C82` | Семантика | LV2_BAD (g.bad) |
| Карточки | app/flashcards/CollectionDeckView.tsx:414 | `#000` | Тень | g.dropShadow |
| Карточки | app/flashcards/CollectionGalleryView.tsx:181 | `rgba(255,255,255,0.07)` | Белый с альфой | g.glassEdge |
| Карточки | app/flashcards/CollectionGalleryView.tsx:199 | `#1B1B1D` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Карточки | app/flashcards/CollectionGalleryView.tsx:240 | `rgba(255,255,255,0.06)` | Белый с альфой | g.hairlineSoft |
| Карточки | app/flashcards/CollectionHeader.tsx:423 | `#000` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Карточки | app/flashcards/FlashcardListItem.tsx:1217 | `rgba(0,0,0,0.55)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Карточки | app/flashcards/FlashcardListItem.tsx:1231 | `#D32F2F` | Семантика | LV2_BAD (g.bad) |
| Карточки | app/flashcards/FlashcardListItem.tsx:1233 | `#fff` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Карточки | app/flashcards/FlashcardListItem.tsx:1234 | `#fff` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Карточки | app/flashcards/FlashcardsFilterDropdown.tsx:57 | `#000` | Тень | g.dropShadow |
| Карточки | app/flashcards/SpeakHoldButton.tsx:201 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Карточки | app/flashcards/TrainingSetupV2.tsx:183 | `rgba(255,255,255,0.07)` | Белый с альфой | g.glassEdge |
| Карточки | app/flashcards/TrainingSetupV2.tsx:188 | `rgba(255,255,255,0.05)` | Белый с альфой | g.hairlineSoft |
| Карточки | app/pack_opening.tsx:55 | `#FFD700` | Другое | запросить токен у сессии «Темы» |
| Карточки | app/pack_opening.tsx:55 | `#34C759` | Семантика | LV2_GOOD (g.good) |
| Карточки | app/pack_opening.tsx:55 | `#007AFF` | Другое | запросить токен у сессии «Темы» |
| Карточки | app/pack_opening.tsx:55 | `#FF3B30` | Семантика | LV2_BAD (g.bad) |
| Карточки | app/pack_opening.tsx:55 | `#AF52DE` | Другое | запросить токен у сессии «Темы» |
| Карточки | app/pack_opening.tsx:55 | `#FF9500` | Семантика | LV2_BAD (g.bad) |
| Карточки | app/pack_opening.tsx:538 | `#5CC8FF` | Другое | запросить токен у сессии «Темы» |
| Карточки | app/pack_opening.tsx:604 | `#fff` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Карточки | app/pack_opening.tsx:742 | `#fff` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Карточки | app/pack_opening.tsx:762 | `#fff` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Карточки | components/cards-grid/CardsGallery.tsx:101 | `#0A0A0E` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Карточки | components/cards-grid/CardsGallery.tsx:101 | `#08080C` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Карточки | components/cards-grid/CardsGallery.tsx:101 | `#08080C` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Карточки | components/cards-grid/CardsGallery.tsx:114 | `rgba(0,0,0,0.8)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Карточки | components/cards-grid/CardsGallery.tsx:118 | `rgba(255,255,255,0.16)` | Белый с альфой | g.bevelHi |
| Карточки | components/cards-grid/CardsGallery.tsx:118 | `rgba(255,255,255,0.04)` | Белый с альфой | g.hairlineSoft |
| Карточки | components/cards-grid/CardsGallery.tsx:118 | `rgba(255,255,255,0)` | Белый с альфой | g.hairlineSoft |
| Карточки | components/cards-grid/CardsGallery.tsx:118 | `rgba(255,255,255,0.05)` | Белый с альфой | g.hairlineSoft |
| Карточки | components/cards-grid/CardsGallery.tsx:140 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Карточки | components/cards-grid/CardsGallery.tsx:145 | `rgba(255,255,255,0.22)` | Белый с альфой | g.bevelHi |
| Карточки | components/cards-grid/CardsGallery.tsx:148 | `rgba(255,255,255,0.28)` | Белый с альфой | g.bevelHi |
| Карточки | components/cards-grid/CardsGallery.tsx:151 | `#04261D` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Карточки | components/cards-grid/CardsGallery.tsx:206 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Карточки | components/cards-grid/CardsGallery.tsx:208 | `rgba(255,255,255,0.62)` | Белый с альфой | g.mediaInk + альфа |
| Карточки | components/cards-grid/CardsGallery.tsx:209 | `rgba(255,255,255,0.12)` | Белый с альфой | g.glassEdge |
| Карточки | components/cards-grid/CardsGallery.tsx:213 | `rgba(255,255,255,0.14)` | Белый с альфой | g.glassEdge |
| Карточки | components/flashcards/FlashcardsShelves.tsx:104 | `rgba(255,255,255,0.92)` | Белый с альфой | g.mediaInk + альфа |
| Карточки | components/flashcards/FlashcardsShelves.tsx:108 | `rgba(6,7,10,0.72)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Карточки | components/flashcards/FlashcardsShelves.tsx:157 | `rgba(255,255,255,0.9)` | Белый с альфой | g.mediaInk + альфа |
| Монеты | app/shop.tsx:150 | `#7C5CE0` | Другое | запросить токен у сессии «Темы» |
| Монеты | app/shop.tsx:150 | `#3A2678` | Другое | запросить токен у сессии «Темы» |
| Монеты | app/shop.tsx:150 | `#DCD0FF` | Другое | запросить токен у сессии «Темы» |
| Монеты | app/shop.tsx:151 | `#b0562b` | Семантика | LV2_BAD (g.bad) |
| Монеты | app/shop.tsx:151 | `#4d2413` | Семантика | LV2_BAD (g.bad) |
| Монеты | app/shop.tsx:151 | `#FFC7A6` | Семантика | LV2_BAD (g.bad) |
| Монеты | app/shop.tsx:152 | `#2f5fb0` | Другое | запросить токен у сессии «Темы» |
| Монеты | app/shop.tsx:152 | `#16294f` | Другое | запросить токен у сессии «Темы» |
| Монеты | app/shop.tsx:152 | `#B7D0FF` | Другое | запросить токен у сессии «Темы» |
| Монеты | app/shop.tsx:153 | `#C9A84C` | Другое | запросить токен у сессии «Темы» |
| Монеты | app/shop.tsx:153 | `#6B551F` | Другое | запросить токен у сессии «Темы» |
| Монеты | app/shop.tsx:153 | `#23190A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Монеты | app/shop.tsx:154 | `#a8397e` | Семантика | LV2_BAD (g.bad) |
| Монеты | app/shop.tsx:154 | `#4a1637` | Другое | запросить токен у сессии «Темы» |
| Монеты | app/shop.tsx:154 | `#FFB6DF` | Семантика | LV2_BAD (g.bad) |
| Монеты | app/shop.tsx:186 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Монеты | app/shop.tsx:358 | `#6B551F` | Другое | запросить токен у сессии «Темы» |
| Монеты | app/shop.tsx:359 | `#E3CC88` | Другое | запросить токен у сессии «Темы» |
| Монеты | app/shop.tsx:617 | `#000000` | Скрим | theme-exempt: тёмное затемнение под окном |
| Монеты | app/shop.tsx:630 | `#000000` | Тень | g.dropShadow |
| Монеты | app/shop.tsx:634 | `rgba(6,8,18,0.68)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Монеты | components/level_up/CoinFaceArt.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Монеты | components/profile-card/ProfileCardCoin.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Монеты | components/profile-card/ProfileCardRankUp.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Монеты | components/RankChangeBanner.tsx:308 | `#10381e` | Семантика | LV2_GOOD (g.good) |
| Монеты | components/RankChangeBanner.tsx:308 | `#3a2a14` | Другое | запросить токен у сессии «Темы» |
| Монеты | components/RankChangeBanner.tsx:309 | `#34d399` | Семантика | LV2_GOOD (g.good) |
| Монеты | components/RankChangeBanner.tsx:309 | `#f59e0b` | Семантика | LV2_BAD (g.bad) |
| Монеты | components/RankChangeBanner.tsx:310 | `#34d399` | Семантика | LV2_GOOD (g.good) |
| Монеты | components/RankChangeBanner.tsx:310 | `#fbbf24` | Семантика | LV2_BAD (g.bad) |
| Монеты | components/RankChangeBanner.tsx:311 | `#D8FBE8` | Семантика | LV2_GOOD (g.good) |
| Монеты | components/RankChangeBanner.tsx:311 | `#FFE9B5` | Другое | запросить токен у сессии «Темы» |
| Монеты | components/RankChangeBanner.tsx:312 | `rgba(255,255,255,0.68)` | Белый с альфой | g.mediaInk + альфа |
| Ошибки | components/MistakeEli5Modal.tsx:310 | `rgba(0,0,0,0.58)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Профиль/Настройки | app/(tabs)/settings.tsx:1495 | `rgba(0,0,0,0.7)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Профиль/Настройки | app/(tabs)/settings.tsx:1585 | `rgba(0,0,0,0.75)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Профиль/Настройки | app/(tabs)/settings.tsx:1607 | `rgba(0,0,0,0.7)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Профиль/Настройки | app/(tabs)/settings.tsx:1997 | `rgba(0,0,0,0.7)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Профиль/Настройки | app/dev-account-v2-ios-proof.tsx:84 | `#101114` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Профиль/Настройки | app/dev-account-v2-ios-proof.tsx:85 | `#F2F3F5` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Профиль/Настройки | app/dev-account-v2-ios-proof.tsx:86 | `#23252B` | Серый | g.opaqueControl |
| Профиль/Настройки | app/dev-account-v2-ios-proof.tsx:87 | `#2F3340` | Серый | g.opaqueControl |
| Профиль/Настройки | app/dev-account-v2-ios-proof.tsx:88 | `#F2F3F5` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Профиль/Настройки | app/dev-account-v2-ios-proof.tsx:89 | `#18191D` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Профиль/Настройки | app/dev-account-v2-ios-proof.tsx:91 | `#C9CCD3` | Серый | g.secondary |
| Профиль/Настройки | app/settings_notifications.tsx:119 | `rgba(0,0,0,0.55)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Профиль/Настройки | app/settings_themes.tsx:79 | `rgba(255,255,255,0.12)` | Белый с альфой | g.glassEdge |
| Профиль/Настройки | app/settings_themes.tsx:79 | `rgba(255,255,255,0.14)` | Белый с альфой | g.glassEdge |
| Профиль/Настройки | components/account/AccountLogoutFlow.tsx:216 | `rgba(0,0,0,0.6)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Профиль/Настройки | components/account/GlassInlineAlert.tsx:37 | `rgba(0,0,0,0.62)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Профиль/Настройки | components/account/NicknameEditModal.tsx:557 | `#000000` | Тень | g.dropShadow |
| Профиль/Настройки | components/account/NicknameEditModal.tsx:558 | `rgba(0,0,0,0.7)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Профиль/Настройки | components/account/NicknameEditModal.tsx:570 | `rgba(0,0,0,0.7)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Профиль/Настройки | components/DeleteAccountConfirmModal.tsx:532 | `#000000` | Тень | g.dropShadow |
| Профиль/Настройки | components/DeleteAccountConfirmModal.tsx:576 | `rgba(0,0,0,0.7)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Профиль/Настройки | components/PlayerProfileModal.tsx:278 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Профиль/Настройки | components/PlayerProfileModal.tsx:352 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Профиль/Настройки | components/PlayerProfileModal.tsx:603 | `rgba(0,0,0,0.58)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Профиль/Настройки | components/PlayerProfileModal.tsx:610 | `#000` | Тень | g.dropShadow |
| Профиль/Настройки | components/PlayerProfileModal.tsx:625 | `rgba(0,0,0,0.34)` | Медиа | g.mediaScrim или theme-exempt (медиа-слой) |
| Профиль/Настройки | components/PlayerProfileModal.tsx:626 | `rgba(255,255,255,0.14)` | Белый с альфой | g.glassEdge |
| Профиль/Настройки | components/PlayerProfileModal.tsx:631 | `rgba(255,255,255,0.95)` | Белый с альфой | g.mediaInk + альфа |
| Профиль/Настройки | components/PlayerProfileModal.tsx:632 | `#000` | Тень | g.dropShadow |
| Профиль/Настройки | components/PlayerProfileModal.tsx:634 | `#111111` | Медиа | g.mediaScrim или theme-exempt (медиа-слой) |
| Профиль/Настройки | components/PlayerProfileModal.tsx:635 | `rgba(0,0,0,0.5)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Профиль/Настройки | components/profile-card/ProfileCardBackdrop.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Профиль/Настройки | components/profile-card/ProfileCardBioSheet.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Профиль/Настройки | components/profile-card/ProfileCardBody.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Профиль/Настройки | components/profile-card/ProfileCardFooter.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Профиль/Настройки | components/profile-card/ProfileCardParts.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Профиль/Настройки | components/profile-card/ProfileCardProSheet.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:36 | `#5E8FD0` | Другое | запросить токен у сессии «Темы» |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:36 | `#43689F` | Другое | запросить токен у сессии «Темы» |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:37 | `#5FA981` | Семантика | LV2_GOOD (g.good) |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:37 | `#41815F` | Семантика | LV2_GOOD (g.good) |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:38 | `#D99A57` | Семантика | LV2_BAD (g.bad) |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:38 | `#B57634` | Семантика | LV2_BAD (g.bad) |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:39 | `#CF7A6E` | Семантика | LV2_BAD (g.bad) |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:39 | `#A85A50` | Семантика | LV2_BAD (g.bad) |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:40 | `#9A87CB` | Другое | запросить токен у сессии «Темы» |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:40 | `#75629F` | Другое | запросить токен у сессии «Темы» |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:41 | `#5FA8AF` | Другое | запросить токен у сессии «Темы» |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:41 | `#42828A` | Другое | запросить токен у сессии «Темы» |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:42 | `#C77E9B` | Семантика | LV2_BAD (g.bad) |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:42 | `#9E5C79` | Семантика | LV2_BAD (g.bad) |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:43 | `#7B82C4` | Другое | запросить токен у сессии «Темы» |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:43 | `#5A6099` | Другое | запросить токен у сессии «Темы» |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:44 | `#8E959E` | Серый | g.mutedText |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:44 | `#6B727B` | Серый | g.mutedText |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:45 | `#CBA65A` | Другое | запросить токен у сессии «Темы» |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:45 | `#A88238` | Другое | запросить токен у сессии «Темы» |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:52 | `Color = 'red` | Другое | запросить токен у сессии «Темы» |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:98 | `#2A301D` | Другое | запросить токен у сессии «Темы» |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:98 | `#14180F` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:127 | `rgba(255,255,255,0.10)` | Белый с альфой | g.glassEdge |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:127 | `rgba(255,255,255,0)` | Белый с альфой | g.hairlineSoft |
| Профиль/Настройки | components/settings/SettingsGroup.tsx:132 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Профиль/Настройки | components/settings/ThemeIntensitySlider.tsx:193 | `#FFFFFF` | Тень | g.dropShadow |
| Профиль/Настройки | components/settings/ThemeIntensitySlider.tsx:193 | `#000000` | Тень | g.dropShadow |
| Профиль/Настройки | components/settings/ThemeSwatch.tsx:24 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | app/(tabs)/lessons.tsx:329 | `#D4CCBC` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:330 | `#C5BBA8` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:331 | `#B4AA9A` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:332 | `#A19D95` | Серый | g.secondary |
| Прочее | app/(tabs)/lessons.tsx:336 | `#B8D6B8` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/(tabs)/lessons.tsx:337 | `#A7CFB0` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/(tabs)/lessons.tsx:338 | `#C6D79B` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:339 | `#96BEA0` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/(tabs)/lessons.tsx:342 | `#F2DFA5` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:343 | `#E6C878` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:344 | `#D0A95B` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:345 | `#B88A45` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/(tabs)/lessons.tsx:348 | `#D9C98C` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:349 | `#C9A84C` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:350 | `#9E9D69` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:351 | `#77815B` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:359 | `#8FA0FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:360 | `#B79CFF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:361 | `#FFD27A` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/(tabs)/lessons.tsx:362 | `#A95BFF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:365 | `#FFA245` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/(tabs)/lessons.tsx:366 | `#FFC894` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/(tabs)/lessons.tsx:367 | `#5FE8A8` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/(tabs)/lessons.tsx:368 | `#FF3D6E` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/(tabs)/lessons.tsx:371 | `#3DE8A6` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/(tabs)/lessons.tsx:372 | `#9FF2D4` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/(tabs)/lessons.tsx:373 | `#F2D27A` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:374 | `#2E9DFF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:377 | `#D6FF3D` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/(tabs)/lessons.tsx:378 | `#EAFF8C` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:379 | `#4FE8AC` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/(tabs)/lessons.tsx:380 | `#2EE08C` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/(tabs)/lessons.tsx:390 | `#3F3D39` | Серый | g.opaqueControl |
| Прочее | app/(tabs)/lessons.tsx:390 | `#F3F0E8` | Серый | g.secondary |
| Прочее | app/(tabs)/lessons.tsx:391 | `#353638` | Серый | g.opaqueControl |
| Прочее | app/(tabs)/lessons.tsx:391 | `#ECEFF3` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | app/(tabs)/lessons.tsx:392 | `#2C3035` | Серый | g.opaqueControl |
| Прочее | app/(tabs)/lessons.tsx:392 | `#E5E9EF` | Серый | g.secondary |
| Прочее | app/(tabs)/lessons.tsx:393 | `#242932` | Серый | g.opaqueControl |
| Прочее | app/(tabs)/lessons.tsx:393 | `#EEF2F8` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | app/(tabs)/lessons.tsx:397 | `#202417` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/(tabs)/lessons.tsx:397 | `#F4ECD8` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:398 | `#1B2013` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/(tabs)/lessons.tsx:398 | `#E3CC88` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:399 | `#161B11` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/(tabs)/lessons.tsx:399 | `#C9A84C` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:400 | `#11150D` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/(tabs)/lessons.tsx:400 | `#B9BF96` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:403 | `#344637` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:403 | `#E2F4E3` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:404 | `#304333` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:404 | `#DDF2E1` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:405 | `#41472D` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:405 | `#F0F7D7` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:406 | `#2F3F34` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:406 | `#D9EFDF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:411 | `#1B1F36` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:411 | `#C9D2FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:412 | `#232948` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:412 | `#D8CCFF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:413 | `#2A2B3F` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:413 | `#FFE3B0` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:414 | `#26203F` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:414 | `#D9B5FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:417 | `#281B10` | Серый | g.opaqueControl |
| Прочее | app/(tabs)/lessons.tsx:417 | `#FFD9A8` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:418 | `#332215` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:418 | `#FFE6C9` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:419 | `#1F2A1C` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:419 | `#BFF5DA` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/(tabs)/lessons.tsx:420 | `#33161F` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:420 | `#FFB5C4` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/(tabs)/lessons.tsx:423 | `#15241C` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/(tabs)/lessons.tsx:423 | `#9FF2CF` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/(tabs)/lessons.tsx:424 | `#1C2F24` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:424 | `#C7F7E5` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/(tabs)/lessons.tsx:425 | `#2A2A1C` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:425 | `#F7E6B0` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:426 | `#162636` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:426 | `#A8D8FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:429 | `#20250E` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/(tabs)/lessons.tsx:429 | `#EFFF9E` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:430 | `#2A3013` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:430 | `#F4FFC4` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:431 | `#16251C` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/(tabs)/lessons.tsx:431 | `#B5F5D8` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/(tabs)/lessons.tsx:432 | `#1A2A1E` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:432 | `#A8F0C8` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/(tabs)/lessons.tsx:566 | `rgba(0,0,0,0.50)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/(tabs)/lessons.tsx:571 | `rgba(0,0,0,0.46)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/(tabs)/lessons.tsx:575 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/(tabs)/lessons.tsx:667 | `#fff` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | app/(tabs)/lessons.tsx:874 | `#000` | Тень | g.dropShadow |
| Прочее | app/(tabs)/lessons.tsx:1068 | `rgba(0,0,0,0)` | Тёмная база | g.deepBase / g.deepBaseAlt / g.opaqueSheet |
| Прочее | app/(tabs)/lessons.tsx:1133 | `rgba(255,255,255,0.45)` | Белый с альфой | g.mediaInk + альфа |
| Прочее | app/(tabs)/lessons.tsx:1134 | `rgba(255,255,255,0.3)` | Белый с альфой | g.bevelHi |
| Прочее | app/(tabs)/lessons.tsx:1190 | `rgba(7,17,10,0.2)` | Тёмная база | g.deepBase / g.deepBaseAlt / g.opaqueSheet |
| Прочее | app/(tabs)/lessons.tsx:1190 | `rgba(255,255,255,0.24)` | Белый с альфой | g.bevelHi |
| Прочее | app/(tabs)/lessons.tsx:1263 | `rgba(255,255,255,0.55)` | Белый с альфой | g.mediaInk + альфа |
| Прочее | app/(tabs)/lessons.tsx:4634 | `#B5BABD` | Серый | g.secondary |
| Прочее | app/(tabs)/lessons.tsx:4634 | `#555960` | Серый | g.opaqueControl |
| Прочее | app/(tabs)/lessons.tsx:4679 | `rgba(247,241,228,0.44)` | Серый | g.hairlineSoft / g.line |
| Прочее | app/(tabs)/lessons.tsx:4682 | `rgba(255,255,255,0.42)` | Белый с альфой | g.mediaInk + альфа |
| Прочее | app/(tabs)/lessons.tsx:4683 | `rgba(255,255,255,0.35)` | Белый с альфой | g.mediaInk + альфа |
| Прочее | app/(tabs)/lessons.tsx:4684 | `rgba(255,255,255,0.97)` | Белый с альфой | g.mediaInk + альфа |
| Прочее | app/(tabs)/lessons.tsx:4690 | `rgba(184,173,146,0.36)` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/(tabs)/lessons.tsx:4693 | `rgba(255,255,255,0.30)` | Белый с альфой | g.bevelHi |
| Прочее | app/(tabs)/lessons.tsx:4694 | `rgba(255,255,255,0.30)` | Белый с альфой | g.bevelHi |
| Прочее | app/(tabs)/lessons.tsx:4699 | `rgba(255,255,255,0.97)` | Белый с альфой | g.mediaInk + альфа |
| Прочее | app/ai_companion_session.tsx:138 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/ai_companion_session.tsx:371 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/ai_companion_session.tsx:695 | `#fff` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | app/combined_lesson_pick.tsx:232 | `#202022` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/combined_lesson_pick.tsx:232 | `#151517` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/language_welcome.tsx:255 | `#E3ECFF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:255 | `#C6D3FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:258 | `#07111F` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/language_welcome.tsx:277 | `#293044` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:277 | `#293044` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:277 | `#E3ECFF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:277 | `#7B8CFF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:277 | `#C95CFF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:282 | `#07111F` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/language_welcome.tsx:303 | `#DCE4FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:320 | `#C6D3FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:433 | `#C6D3FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:436 | `#07111F` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/language_welcome.tsx:458 | `#E3ECFF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:458 | `#7B8CFF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:458 | `#C95CFF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:473 | `#07111F` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/language_welcome.tsx:483 | `rgba(198,211,255,0.25)` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:484 | `#8AB9FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:491 | `rgba(255,255,255,0.08)` | Белый с альфой | g.glassEdge |
| Прочее | app/language_welcome.tsx:498 | `#F7FAFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | app/language_welcome.tsx:499 | `#C6D3FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:500 | `#F7FAFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | app/language_welcome.tsx:506 | `rgba(255,255,255,0.06)` | Белый с альфой | g.hairlineSoft |
| Прочее | app/language_welcome.tsx:509 | `rgba(198,211,255,0.18)` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:513 | `#7B8CFF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:513 | `rgba(123,140,255,0.16)` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:514 | `#EAF0FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:520 | `rgba(198,211,255,0.4)` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:524 | `#8AB9FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:524 | `#8AB9FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:528 | `#07111F` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/language_welcome.tsx:540 | `rgba(123,140,255,0.22)` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:546 | `rgba(255,255,255,0.08)` | Белый с альфой | g.glassEdge |
| Прочее | app/language_welcome.tsx:548 | `rgba(198,211,255,0.22)` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:561 | `#8AB9FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:563 | `#07111F` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/language_welcome.tsx:568 | `#8AB9FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/language_welcome.tsx:569 | `#F7FAFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | app/language_welcome.tsx:570 | `#C6D3FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning_v2_session_intro_check.tsx:155 | `#10151D` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning_v2_session_intro_check.tsx:155 | `#151B26` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning_v2_session_intro_check.tsx:155 | `#0E1219` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning_v2_session_intro_check.tsx:165 | `#EAF0F6` | Серый | g.secondary |
| Прочее | app/learning_v2_session_intro_check.tsx:176 | `#FFD75A` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning_v2_session_intro_check.tsx:194 | `#F8C84E` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning_v2_session_intro_check.tsx:233 | `#8EE65A` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/learning_v2_session_intro_check.tsx:257 | `#FFD75A` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning_v2_session_intro_check.tsx:257 | `#596273` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning_v2_session_intro_check.tsx:289 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning_v2_session_intro_check.tsx:297 | `#10151D` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning_v2_session_intro_check.tsx:299 | `#202936` | Серый | g.opaqueControl |
| Прочее | app/learning_v2_session_intro_check.tsx:300 | `#27313F` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning_v2_session_intro_check.tsx:301 | `#F8C84E` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning_v2_session_intro_check.tsx:302 | `#202936` | Серый | g.opaqueControl |
| Прочее | app/learning_v2_session_intro_check.tsx:303 | `#E9EEF4` | Серый | g.secondary |
| Прочее | app/learning_v2_session_intro_check.tsx:304 | `#2D2819` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning_v2_session_intro_check.tsx:304 | `#66562A` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning_v2_session_intro_check.tsx:305 | `#FFF1B8` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning_v2_session_intro_check.tsx:315 | `#F8C84E1F` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning_v2_session_intro_check.tsx:315 | `#F8C84E55` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning_v2_session_intro_check.tsx:317 | `#F8C84E` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning_v2_session_intro_check.tsx:318 | `#7F8B99` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning_v2_session_intro_check.tsx:319 | `#1B2430` | Серый | g.opaqueControl |
| Прочее | app/learning_v2_session_intro_check.tsx:319 | `#39485A` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning_v2_session_intro_check.tsx:319 | `#000` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning_v2_session_intro_check.tsx:322 | `#758395` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning_v2_session_intro_check.tsx:323 | `#F8FAFC` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | app/learning_v2_session_intro_check.tsx:327 | `#1A222D` | Серый | g.opaqueControl |
| Прочее | app/learning_v2_session_intro_check.tsx:327 | `#344151` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning_v2_session_intro_check.tsx:328 | `#203A25` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/learning_v2_session_intro_check.tsx:328 | `#8EE65A` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/learning_v2_session_intro_check.tsx:329 | `#3A2327` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning_v2_session_intro_check.tsx:329 | `#FB7185` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning_v2_session_intro_check.tsx:330 | `#2A3543` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning_v2_session_intro_check.tsx:330 | `#BFC9D4` | Серый | g.secondary |
| Прочее | app/learning_v2_session_intro_check.tsx:331 | `#8EE65A` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/learning_v2_session_intro_check.tsx:331 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning_v2_session_intro_check.tsx:332 | `#FB7185` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning_v2_session_intro_check.tsx:332 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning_v2_session_intro_check.tsx:333 | `#EDF2F7` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | app/learning_v2_session_intro_check.tsx:334 | `#121821F2` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning_v2_session_intro_check.tsx:334 | `#273341` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning_v2_session_intro_check.tsx:335 | `#FF9B9B` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning_v2_session_intro_check.tsx:336 | `#6B5726` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning_v2_session_intro_check.tsx:336 | `#2B2619` | Серый | g.opaqueControl |
| Прочее | app/learning_v2_session_intro_check.tsx:339 | `#FFF2B5` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning_v2_session_intro_check.tsx:340 | `#C7B777` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning_v2_session_intro_check.tsx:342 | `#7F8B99` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning_v2_session_intro_check.tsx:344 | `#AEB9C5` | Серый | g.secondary |
| Прочее | app/learning_v2_session_intro_check.tsx:345 | `#8EE65A` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/learning_v2_session_intro_check.tsx:347 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning-v2/session/[id].tsx:133 | `#6FD6FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:137 | `#A78BFA` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:141 | `#F8C65C` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning-v2/session/[id].tsx:145 | `#8EE65A` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/learning-v2/session/[id].tsx:149 | `#5EEAD4` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/learning-v2/session/[id].tsx:153 | `#FB7185` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning-v2/session/[id].tsx:157 | `#F472B6` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning-v2/session/[id].tsx:1414 | `#10151D` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning-v2/session/[id].tsx:1414 | `#151B26` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning-v2/session/[id].tsx:1414 | `#0E1219` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning-v2/session/[id].tsx:1428 | `#EAF0F6` | Серый | g.secondary |
| Прочее | app/learning-v2/session/[id].tsx:1444 | `#F8C84E` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning-v2/session/[id].tsx:1521 | `#5872FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:1527 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning-v2/session/[id].tsx:1624 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning-v2/session/[id].tsx:1704 | `#DDE5EE` | Серый | g.secondary |
| Прочее | app/learning-v2/session/[id].tsx:1745 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning-v2/session/[id].tsx:1745 | `#DDE5EE` | Серый | g.secondary |
| Прочее | app/learning-v2/session/[id].tsx:1796 | `#FFD75A` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:1796 | `#596273` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:1822 | `#ABB7C5` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:1883 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning-v2/session/[id].tsx:1894 | `#FFF1A8` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:1900 | `#F8C84E` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning-v2/session/[id].tsx:1903 | `#FFD75A` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:1939 | `#FFF0A8` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:1949 | `#F8C84E` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning-v2/session/[id].tsx:1959 | `#FFF4BD` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:1961 | `#FFD75A` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:1988 | `#FFD75A` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:1998 | `#FFD75A` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2010 | `#FFD75A` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2022 | `#7B8492` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2062 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning-v2/session/[id].tsx:2235 | `#10151D` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning-v2/session/[id].tsx:2284 | `#F7F9FB` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | app/learning-v2/session/[id].tsx:2295 | `#202936` | Серый | g.opaqueControl |
| Прочее | app/learning-v2/session/[id].tsx:2303 | `#27313F` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2310 | `#8EE65A` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/learning-v2/session/[id].tsx:2317 | `#202936` | Серый | g.opaqueControl |
| Прочее | app/learning-v2/session/[id].tsx:2321 | `#E9EEF4` | Серый | g.secondary |
| Прочее | app/learning-v2/session/[id].tsx:2326 | `#2D2819` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2328 | `#66562A` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2335 | `#FFF1B8` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2337 | `#9D8F5A` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2357 | `#F5F7FA` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | app/learning-v2/session/[id].tsx:2359 | `#7F8B99` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2366 | `#1B2430` | Серый | g.opaqueControl |
| Прочее | app/learning-v2/session/[id].tsx:2368 | `#2C3949` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2373 | `#000` | Тень | g.dropShadow |
| Прочее | app/learning-v2/session/[id].tsx:2384 | `#6FD6FF` | Тень | g.dropShadow |
| Прочее | app/learning-v2/session/[id].tsx:2396 | `#F8FAFC` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | app/learning-v2/session/[id].tsx:2404 | `#9BA8B8` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2413 | `#F8C65C` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning-v2/session/[id].tsx:2421 | `#F7F9FB` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | app/learning-v2/session/[id].tsx:2426 | `#9EABB9` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2428 | `#728091` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2439 | `#1A222D` | Серый | g.opaqueControl |
| Прочее | app/learning-v2/session/[id].tsx:2441 | `#344151` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2447 | `#203A25` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/learning-v2/session/[id].tsx:2447 | `#8EE65A` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/learning-v2/session/[id].tsx:2452 | `#2A3543` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2453 | `#BFC9D4` | Серый | g.secondary |
| Прочее | app/learning-v2/session/[id].tsx:2461 | `#EDF2F7` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | app/learning-v2/session/[id].tsx:2471 | `#3A4859` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2472 | `#121821` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning-v2/session/[id].tsx:2479 | `#6F7B89` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2481 | `#31402D` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2482 | `#6FAE50` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/learning-v2/session/[id].tsx:2488 | `#E9F7E2` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2499 | `#222C39` | Серый | g.opaqueControl |
| Прочее | app/learning-v2/session/[id].tsx:2501 | `#3D4A5B` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2505 | `#F3F6F9` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | app/learning-v2/session/[id].tsx:2506 | `#83909E` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2511 | `#F472B6` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning-v2/session/[id].tsx:2517 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning-v2/session/[id].tsx:2529 | `#354252` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2530 | `#111821E8` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning-v2/session/[id].tsx:2538 | `#202A36` | Серый | g.opaqueControl |
| Прочее | app/learning-v2/session/[id].tsx:2540 | `#8EE65A` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/learning-v2/session/[id].tsx:2549 | `#121821F2` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning-v2/session/[id].tsx:2551 | `#273341` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2553 | `#FF9B9B` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning-v2/session/[id].tsx:2555 | `#B8C4D1` | Серый | g.secondary |
| Прочее | app/learning-v2/session/[id].tsx:2561 | `#FFF2B5` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2566 | `#6B5726` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2567 | `#2B2619` | Серый | g.opaqueControl |
| Прочее | app/learning-v2/session/[id].tsx:2578 | `#C7B777` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2597 | `#ABB7C5` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2599 | `#AEB9C5` | Серый | g.secondary |
| Прочее | app/learning-v2/session/[id].tsx:2600 | `#AEB9C5` | Серый | g.secondary |
| Прочее | app/learning-v2/session/[id].tsx:2604 | `#8EE65A` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/learning-v2/session/[id].tsx:2611 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning-v2/session/[id].tsx:2628 | `#F8C84E33` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning-v2/session/[id].tsx:2629 | `#FFD75A` | Тень | g.dropShadow |
| Прочее | app/learning-v2/session/[id].tsx:2650 | `#FFF6D1` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2653 | `#5A4100` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2659 | `#090D13F2` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning-v2/session/[id].tsx:2669 | `#1B2430` | Серый | g.opaqueControl |
| Прочее | app/learning-v2/session/[id].tsx:2671 | `#3C4655` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2672 | `#000` | Тень | g.dropShadow |
| Прочее | app/learning-v2/session/[id].tsx:2686 | `#9BA8B8` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2699 | `#F8C84E18` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning-v2/session/[id].tsx:2701 | `#F8C84E55` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/learning-v2/session/[id].tsx:2702 | `#FFD75A` | Тень | g.dropShadow |
| Прочее | app/learning-v2/session/[id].tsx:2711 | `#FFF6D1` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2719 | `#B9A96A` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2730 | `#303746` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2737 | `#FFD75A` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2751 | `#141B24` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/learning-v2/session/[id].tsx:2753 | `#303B49` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2766 | `#FFF0A8` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2772 | `#95A2B1` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2779 | `#D9E1E9` | Серый | g.secondary |
| Прочее | app/learning-v2/session/[id].tsx:2787 | `#9EABB9` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2795 | `#7F8B99` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/learning-v2/session/[id].tsx:2806 | `#8EE65A` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/learning-v2/session/[id].tsx:2814 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/lesson_irregular_verbs.tsx:90 | `#4CAF50` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/lesson_irregular_verbs.tsx:90 | `rgba(76,175,80,0.14)` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/lesson_irregular_verbs.tsx:91 | `#4A9EFF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/lesson_irregular_verbs.tsx:91 | `rgba(74,158,255,0.14)` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/lesson_irregular_verbs.tsx:92 | `#C084FC` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/lesson_irregular_verbs.tsx:92 | `rgba(192,132,252,0.14)` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/lesson_words.tsx:2729 | `rgba(111,208,140,0.12)` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/lesson_words.tsx:2730 | `rgba(224,80,80,0.12)` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/lesson_words.tsx:2731 | `#6FD08C` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/lesson_words.tsx:2732 | `#E05050` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/lesson_words.tsx:3220 | `#4A9EFF` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/lesson_words.tsx:3221 | `rgba(74,158,255,0.14)` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/lesson1.tsx:348 | `rgba(255,255,255,0.08)` | Белый с альфой | g.glassEdge |
| Прочее | app/lesson1.tsx:1130 | `#F5A623` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/lesson1.tsx:1130 | `rgba(245,166,35,0.08)` | Семантика | LV2_BAD (g.bad) |
| Прочее | app/lesson1.tsx:1769 | `rgba(40,40,40,0.85)` | Серый | g.hairlineSoft / g.line |
| Прочее | app/lesson1.tsx:1774 | `#fff` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | app/level_exam.tsx:518 | `#121212` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/level_exam.tsx:519 | `#1C1D22` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/level_exam.tsx:520 | `rgba(232, 199, 111, 0.22)` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/level_exam.tsx:521 | `#E8C76F` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/level_exam.tsx:522 | `rgba(232, 199, 111, 0.14)` | Другое | запросить токен у сессии «Темы» |
| Прочее | app/level_exam.tsx:523 | `#141109` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/manage_subscription.tsx:1092 | `rgba(0,0,0,0.68)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Прочее | app/premium_modal_v2.tsx:30 | `#34d399` | Семантика | LV2_GOOD (g.good) |
| Прочее | app/premium_modal_v2.tsx:40 | `#090d11` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | app/referral_access_ended_modal.tsx:157 | `rgba(0,0,0,0.7)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/ActivityHeatmap365.tsx:175 | `#211D17` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/ActivityHeatmap365.tsx:175 | `#15120E` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/ActivityHeatmap365.tsx:178 | `#29241D` | Серый | g.opaqueControl |
| Прочее | components/ActivityHeatmap365.tsx:178 | `#1C1812` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/AiConsentSheetModal.tsx:260 | `rgba(0,0,0,0.58)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/AiTypingBubble.tsx:210 | `#000000` | Тень | g.dropShadow |
| Прочее | components/AppArtBackdrop.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Прочее | components/AppMessagesInbox.tsx:1428 | `shadowColor: 'black` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/AppMessagesInbox.tsx:1454 | `rgba(255,255,255,0.55)` | Белый с альфой | g.mediaInk + альфа |
| Прочее | components/AppMessagesInbox.tsx:1476 | `rgba(0,0,0,0.56)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/AppMessagesInbox.tsx:1539 | `rgba(255,255,255,0.09)` | Белый с альфой | g.glassEdge |
| Прочее | components/AuthProviderButtons.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Прочее | components/AuthProviderIcons.tsx:26 | `#4285F4` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/AuthProviderIcons.tsx:30 | `#34A853` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/AuthProviderIcons.tsx:34 | `#FBBC05` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/AuthProviderIcons.tsx:38 | `#EA4335` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/AuthProviderIcons.tsx:48 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | components/AuthProviderIcons.tsx:62 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | components/AvatarView.tsx:51 | `#273449` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/AvatarView.tsx:92 | `#273449` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/celebration/ReferralFriendRewardHybrid.tsx:50 | `#000000` | Тень | g.dropShadow |
| Прочее | components/celebration/ReferralFriendRewardHybrid.tsx:93 | `rgba(0,0,0,0.68)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Прочее | components/CertificateNameModal.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Прочее | components/CustomSwitch.tsx:56 | `#34C759` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/CustomSwitch.tsx:103 | `#000` | Тень | g.dropShadow |
| Прочее | components/DailyPhraseCard.tsx:1233 | `rgba(0,0,0,0.58)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/DailyPhraseCard.tsx:1282 | `#22C55E` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/energy/EnergyInfoPopover.tsx:315 | `#000` | Тень | g.dropShadow |
| Прочее | components/EnergyBar.tsx:51 | `#0D1123` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/EnergyBar.tsx:52 | `#9187FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/EnergyBar.tsx:53 | `#FF786F` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/EnergyBar.tsx:54 | `#F5C451` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/EnergyBar.tsx:55 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | components/EnergyIcon.tsx:160 | `#000` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/EnergyIcon.tsx:172 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | components/EnergyIcon.tsx:208 | `#FFD37A` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/EntitlementExpiredHost.tsx:318 | `rgba(0,0,0,0.5)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/ExplainReportButton.tsx:344 | `rgba(0,0,0,0.55)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/ExplainSheet.tsx:373 | `rgba(0,0,0,0.58)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/FeatureIntroModal.tsx:307 | `rgba(255,255,255,0.2)` | Белый с альфой | g.bevelHi |
| Прочее | components/feedback/ConfettiBurst.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Прочее | components/feedback/FeedbackPlashka.tsx:80 | `#000` | Тень | g.dropShadow |
| Прочее | components/feedback/VictoryBurst.tsx:115 | `#000` | Скрим | theme-exempt: тёмное затемнение под окном |
| Прочее | components/ForceUpdateGate.tsx:470 | `rgba(0,0,0,0.68)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/ForceUpdateGate.tsx:610 | `#000000` | Тень | g.dropShadow |
| Прочее | components/ForceUpdateGate.tsx:652 | `#000000` | Тень | g.dropShadow |
| Прочее | components/GlobalBroadcastModal.tsx:79 | `rgba(0,0,0,0.62)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Прочее | components/GoldBevel.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Прочее | components/GradientProgressBar.tsx:62 | `rgba(255,255,255,0.08)` | Белый с альфой | g.glassEdge |
| Прочее | components/IntroFullAccessModal.tsx:171 | `rgba(0,0,0,0.5)` | Тень | g.dropShadow |
| Прочее | components/IntroFullAccessModal.tsx:172 | `rgba(0,0,0,0.58)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Прочее | components/IntroFullAccessModal.tsx:219 | `rgba(0,0,0,0.58)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/learning-v2/horizons/LearningV2Horizons.tsx:614 | `#0009` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/learning-v2/LearningV2FounderPassModal.tsx:265 | `rgba(0,0,0,0.68)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Прочее | components/learning-v2/LearningV2FounderPassModal.tsx:274 | `#000` | Тень | g.dropShadow |
| Прочее | components/learning-v2/LearningV2Glass.tsx:28 | `#6FD08C` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/learning-v2/LearningV2Glass.tsx:29 | `#F2766B` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/learning-v2/LearningV2Glass.tsx:68 | `rgba(0,0,0,0.34)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/learning-v2/LearningV2NewWordEncounterOverlay.tsx:502 | `#000` | Тень | g.dropShadow |
| Прочее | components/learning-v2/LearningV2NewWordEncounterOverlay.tsx:577 | `rgba(0,0,0,0.6)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Прочее | components/learning-v2/LearningV2PulseMapSessionRow.tsx:226 | `#000000` | Тень | g.dropShadow |
| Прочее | components/LearningV2MapNode.tsx:388 | `rgba(0,0,0,0.32)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/LearningV2SessionOutcomeSheet.tsx:292 | `rgba(0,0,0,0.68)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Прочее | components/LearningV2SessionOutcomeSheet.tsx:303 | `rgba(0,0,0,0.32)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/lesson_help_theory_data.tsx:43 | `rgba(0,0,0,0.04)` | Тёмная база | g.deepBase / g.deepBaseAlt / g.opaqueSheet |
| Прочее | components/lesson_help_theory_data.tsx:43 | `rgba(255,255,255,0.05)` | Белый с альфой | g.hairlineSoft |
| Прочее | components/lesson_help_theory_ui.tsx:57 | `#FFFFFFB8` | Белый с альфой | g.mediaInk + альфа |
| Прочее | components/lesson_help_theory_ui.tsx:57 | `rgba(255,255,255,0.045)` | Белый с альфой | g.hairlineSoft |
| Прочее | components/lesson_help_theory_ui.tsx:59 | `#6D28D9` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/lesson_help_theory_ui.tsx:59 | `#C4B5FD` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/lesson_help_theory_ui.tsx:60 | `#FBBF24` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/lesson_help_theory_ui.tsx:61 | `rgba(251,191,36,0.14)` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/lesson_help_theory_ui.tsx:61 | `rgba(251,191,36,0.10)` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/lesson_help_theory_ui.tsx:62 | `#40C080` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/lesson_help_theory_ui.tsx:63 | `rgba(64,192,128,0.12)` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/lesson_help_theory_ui.tsx:63 | `rgba(64,192,128,0.10)` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/lesson_help_theory_ui.tsx:64 | `#FB7185` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/lesson_help_theory_ui.tsx:65 | `rgba(251,113,133,0.12)` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/lesson_help_theory_ui.tsx:65 | `rgba(251,113,133,0.10)` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/lesson_help_theory_ui.tsx:73 | `#6D28D9` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/lesson_help_theory_ui.tsx:73 | `#C4B5FD` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/lesson_help_theory_ui.tsx:74 | `rgba(109,40,217,0.12)` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/lesson_help_theory_ui.tsx:74 | `rgba(196,181,253,0.12)` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/lesson_help_theory_ui.tsx:75 | `#B45309` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/lesson_help_theory_ui.tsx:75 | `#FBBF24` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/lesson_help_theory_ui.tsx:76 | `rgba(180,83,9,0.14)` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/lesson_help_theory_ui.tsx:76 | `rgba(251,191,36,0.13)` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/lesson_help_theory_ui.tsx:77 | `#0F766E` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/lesson_help_theory_ui.tsx:77 | `#40C080` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/lesson_help_theory_ui.tsx:78 | `rgba(15,118,110,0.14)` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/lesson_help_theory_ui.tsx:78 | `rgba(64,192,128,0.13)` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/lesson_intro_rich.tsx:255 | `#6D28D9` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/lesson_intro_rich.tsx:255 | `#C4B5FD` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/lesson_intro_rich.tsx:256 | `#0369A1` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/lesson_intro_rich.tsx:256 | `#7DD3FC` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/lesson_intro_rich.tsx:327 | `#FFFFFFD9` | Белый с альфой | g.mediaInk + альфа |
| Прочее | components/lesson_intro_rich.tsx:327 | `rgba(0,0,0,0.20)` | Тёмная база | g.deepBase / g.deepBaseAlt / g.opaqueSheet |
| Прочее | components/lesson_intro_rich.tsx:597 | `#15803D` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/lesson_intro_rich.tsx:597 | `#4CAF72` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/lesson_intro_rich.tsx:598 | `#0369A1` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/lesson_intro_rich.tsx:598 | `#40B4E8` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/lesson_intro_rich.tsx:599 | `#92400E` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/lesson_intro_rich.tsx:599 | `#D4A017` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/lesson_intro_rich.tsx:600 | `#9A3412` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/lesson_intro_rich.tsx:600 | `#DC6428` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/lessons/LessonsListGlassCard.tsx:259 | `#D0D0D2` | Серый | g.secondary |
| Прочее | components/LevelAvatarMaterialOverlay.tsx:24 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | components/LevelAvatarMaterialOverlay.tsx:25 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/LevelAvatarMaterialOverlay.tsx:220 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | components/LevelBadge.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Прочее | components/LevelSpinRewardArt.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Прочее | components/modal_fx/HybridAlertShell.tsx:67 | `rgba(0,0,0,0.5)` | Тень | g.dropShadow |
| Прочее | components/modal_fx/HybridAlertShell.tsx:69 | `rgba(0,0,0,0.60)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Прочее | components/modal_fx/HybridSheetShell.tsx:397 | `rgba(0,0,0,0.58)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/MotionModal.tsx:70 | `rgba(0,0,0,0.42)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Прочее | components/NoEnergyModal.tsx:630 | `#000000` | Тень | g.dropShadow |
| Прочее | components/NoEnergyModal.tsx:631 | `rgba(0,0,0,0.6)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Прочее | components/NoEnergyModal.tsx:651 | `rgba(0,0,0,0.68)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/NoEnergyModal.tsx:651 | `rgba(0,0,0,0.6)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/NoEnergyModal.tsx:763 | `#000000` | Тень | g.dropShadow |
| Прочее | components/NotificationCenterButton.tsx:151 | `#FF2D55` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/NotificationCenterButton.tsx:152 | `#34C759` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/NotificationCenterButton.tsx:153 | `#2E9E63` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/NotificationCenterButton.tsx:475 | `rgba(99,217,143,0.35)` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/NotificationCenterButton.tsx:478 | `#2E9E63` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/NotificationCenterButton.tsx:487 | `#F6C453` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/NotificationCenterButton.tsx:487 | `#63D98F` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/NotificationCenterButton.tsx:499 | `#F6C453` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/NotificationCenterButton.tsx:519 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/NotificationCenterButton.tsx:852 | `#000` | Тень | g.dropShadow |
| Прочее | components/NotificationCenterButton.tsx:923 | `rgba(99,217,143,0.08)` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/NotificationCenterButton.tsx:941 | `rgba(99,217,143,0.14)` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/NotificationCenterButton.tsx:953 | `#63D98F` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/NotificationCenterButton.tsx:961 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/NotificationPermissionModal.tsx:154 | `rgba(0,0,0,0.72)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Прочее | components/NotificationPermissionModalHybrid.tsx:179 | `rgba(0,0,0,0.62)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Прочее | components/NotificationPermissionModalHybrid.tsx:232 | `#000000` | Тень | g.dropShadow |
| Прочее | components/OfflineBanner.tsx:163 | `#F2F1F6` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | components/OfflineBanner.tsx:164 | `#0B0C0E` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/paywall/PaywallMotion.tsx:92 | `rgba(255,255,255,0.22)` | Белый с альфой | g.bevelHi |
| Прочее | components/paywall/PaywallMotion.tsx:222 | `rgba(255, 252, 235, 0.5)` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/paywall/PaywallMotion.tsx:222 | `rgba(255, 255, 255, 0.72)` | Белый с альфой | g.mediaInk + альфа |
| Прочее | components/paywall/PaywallMotion.tsx:222 | `rgba(255, 252, 235, 0.5)` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/paywall/paywallShared.tsx:60 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | components/paywall/paywallShared.tsx:61 | `rgba(255,255,255,0.62)` | Белый с альфой | g.mediaInk + альфа |
| Прочее | components/paywall/paywallShared.tsx:62 | `rgba(23,32,29,0.08)` | Тёмная база | g.deepBase / g.deepBaseAlt / g.opaqueSheet |
| Прочее | components/paywall/paywallShared.tsx:62 | `rgba(255,255,255,0.06)` | Белый с альфой | g.hairlineSoft |
| Прочее | components/paywall/paywallShared.tsx:65 | `rgba(255,255,255,0.08)` | Белый с альфой | g.glassEdge |
| Прочее | components/paywall/paywallShared.tsx:66 | `rgba(255,255,255,0.22)` | Белый с альфой | g.bevelHi |
| Прочее | components/paywall/paywallShared.tsx:82 | `#111318` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/paywall/paywallShared.tsx:97 | `rgba(23,32,29,0.08)` | Тёмная база | g.deepBase / g.deepBaseAlt / g.opaqueSheet |
| Прочее | components/paywall/paywallShared.tsx:202 | `#010102` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/paywall/paywallShared.tsx:202 | `#050713` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/paywall/paywallShared.tsx:202 | `#0A1025` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/paywall/paywallShared.tsx:211 | `#010102` | Скрим | theme-exempt: тёмное затемнение под окном |
| Прочее | components/paywall/paywallShared.tsx:427 | `rgba(22,20,15,0.94)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/paywall/paywallShared.tsx:440 | `#D7E0FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/paywall/paywallShared.tsx:440 | `#8FA0FF` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/paywall/paywallShared.tsx:440 | `#A95BFF` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/paywall/paywallShared.tsx:512 | `rgba(91,124,255,0.26)` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/paywall/paywallShared.tsx:523 | `rgba(169,91,255,0.24)` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/paywall/paywallShared.tsx:584 | `#000` | Тень | g.dropShadow |
| Прочее | components/PopUpActionButton.tsx:31 | `#22C55E` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/PopUpActionButton.tsx:32 | `#15803D` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/PopUpActionButton.tsx:54 | `#07110A` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/PremiumGoldUserName.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Прочее | components/referral_sheet_shell.tsx:193 | `rgba(0,0,0,0.55)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/ReferralWelcomeHost.tsx:227 | `rgba(0,0,0,0.6)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Прочее | components/RegistrationPromptModal.tsx:2147 | `rgba(0,0,0,0.6)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/ReleaseNotesModal.tsx:373 | `rgba(0, 0, 0, 0.6)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/ReleaseNotesModal.tsx:385 | `#000` | Тень | g.dropShadow |
| Прочее | components/ReleaseNotesModal.tsx:437 | `rgba(255,255,255,0.2)` | Белый с альфой | g.bevelHi |
| Прочее | components/ReportErrorButton.tsx:587 | `rgba(0,0,0,0.55)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Прочее | components/ReviewPromptModal.tsx:243 | `rgba(0,0,0,0.62)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/ReviewPromptModal.tsx:259 | `#000000` | Тень | g.dropShadow |
| Прочее | components/ReviewPromptModal.tsx:274 | `rgba(0,0,0,0.62)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/RewardModalBackdrop.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Прочее | components/roulette_win_modal.tsx:164 | `#000000` | Тень | g.dropShadow |
| Прочее | components/roulette_win_modal.tsx:165 | `#000000` | Тень | g.dropShadow |
| Прочее | components/roulette_win_modal.tsx:246 | `#000000` | Тень | g.dropShadow |
| Прочее | components/roulette_win_modal.tsx:324 | `rgba(0,0,0,0.72)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/SavedCardsFlight.tsx:155 | `#000` | Тень | g.dropShadow |
| Прочее | components/ScreenGradient.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Прочее | components/SectionSheetHeader.tsx:146 | `#000` | Тень | g.dropShadow |
| Прочее | components/SkeletonShimmer.tsx:55 | `rgba(255,255,255,0.08)` | Белый с альфой | g.glassEdge |
| Прочее | components/SkeletonShimmer.tsx:56 | `rgba(255,255,255,0.20)` | Белый с альфой | g.bevelHi |
| Прочее | components/SoundWavePulse.tsx:55 | `#FFC800` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/SoundWavePulse.tsx:56 | `#47C870` | Семантика | LV2_GOOD (g.good) |
| Прочее | components/SpeakingPanel.tsx:201 | `#E6A23C` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/SpeakingPanel.tsx:202 | `#F2C94C` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/SpeakingPanel.tsx:203 | `#F2994A` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/SpeakingPanel.tsx:2795 | `rgba(0,0,0,0.55)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/SpeakingPanel.tsx:2849 | `#fff` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | components/survey/SurveyRewardPanel.tsx:23 | `#B98CFF` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/survey/SurveyRewardPanel.tsx:24 | `#6D28D9` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/survey/SurveyRewardPanel.tsx:26 | `#17162B` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/survey/SurveyRewardPanel.tsx:27 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | components/survey/SurveyRewardPanel.tsx:28 | `rgba(139, 92, 246, 0.16)` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/ThemedChoiceModal.tsx:99 | `#3A1E1C` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/ThemedChoiceModal.tsx:100 | `#FF8C82` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/ThemedChoiceModal.tsx:149 | `#000000` | Тень | g.dropShadow |
| Прочее | components/ThemedChoiceModal.tsx:209 | `rgba(0,0,0,0.68)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/ThemedConfirmModal.tsx:85 | `#3A1E1C` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/ThemedConfirmModal.tsx:90 | `#FF8C82` | Семантика | LV2_BAD (g.bad) |
| Прочее | components/ThemedConfirmModal.tsx:252 | `#000000` | Тень | g.dropShadow |
| Прочее | components/ThemedConfirmModal.tsx:322 | `rgba(0,0,0,0.68)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/theory/BinaryRecognition.tsx:92 | `rgba(255,255,255,0.10)` | Белый с альфой | g.glassEdge |
| Прочее | components/TonalSurface.tsx:78 | `rgba(0,0,0,0)` | Тёмная база | g.deepBase / g.deepBaseAlt / g.opaqueSheet |
| Прочее | components/TonalSurface.tsx:88 | `rgba(255,255,255,0.13)` | Белый с альфой | g.glassEdge |
| Прочее | components/TonalSurface.tsx:89 | `rgba(255,255,255,0.035)` | Белый с альфой | g.hairlineSoft |
| Прочее | components/TonalSurface.tsx:90 | `rgba(255,255,255,0)` | Белый с альфой | g.hairlineSoft |
| Прочее | components/TopFadeMask.tsx:85 | `rgba(0,0,0,1)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/TopFadeMask.tsx:85 | `rgba(0,0,0,1)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/TopFadeMask.tsx:85 | `rgba(0,0,0,0)` | Тёмная база | g.deepBase / g.deepBaseAlt / g.opaqueSheet |
| Прочее | components/ui/new/UndoSnackbar.tsx:151 | `rgba(255,255,255,0.10)` | Белый с альфой | g.glassEdge |
| Прочее | components/ui/v2_sheet.tsx:125 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | components/ui/v2_sheet.tsx:212 | `#000` | Тень | g.dropShadow |
| Прочее | components/ui/v2_sheet.tsx:240 | `rgba(0,0,0,0.6)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/ui/v2_ui.tsx:145 | `rgba(227,204,136,0.14)` | Другое | запросить токен у сессии «Темы» |
| Прочее | components/ui/v2_ui.tsx:145 | `rgba(255,255,255,0.22)` | Белый с альфой | g.bevelHi |
| Прочее | components/ui/v2_ui.tsx:483 | `#000` | Тень | g.dropShadow |
| Прочее | components/ui/V2Backdrop.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Прочее | components/UpdateModal.tsx:225 | `rgba(255,255,255,0.28)` | Белый с альфой | g.bevelHi |
| Прочее | components/UpdateModal.tsx:225 | `rgba(255,255,255,0)` | Белый с альфой | g.hairlineSoft |
| Прочее | components/UpdateModal.tsx:293 | `rgba(0,0,0,0.68)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Прочее | components/UpdateModal.tsx:303 | `#000000` | Тень | g.dropShadow |
| Прочее | components/UpdateModal.tsx:337 | `#000000` | Тень | g.dropShadow |
| Прочее | components/v2/KitLiquidGlass.tsx:21 | `rgba(255,255,255,0.10)` | Белый с альфой | g.glassEdge |
| Прочее | components/v2/KitLiquidGlass.tsx:22 | `rgba(255,255,255,0.035)` | Белый с альфой | g.hairlineSoft |
| Прочее | components/v2/KitLiquidGlass.tsx:23 | `rgba(255,255,255,0)` | Белый с альфой | g.hairlineSoft |
| Прочее | components/v2/KitLiquidGlass.tsx:24 | `rgba(255,255,255,0.02)` | Белый с альфой | g.hairlineSoft |
| Прочее | components/v2/KitLiquidGlass.tsx:25 | `rgba(255,255,255,0.055)` | Белый с альфой | g.hairlineSoft |
| Прочее | components/v2/KitLiquidGlass.tsx:30 | `rgba(255,255,255,0.22)` | Белый с альфой | g.bevelHi |
| Прочее | components/v2/KitLiquidGlass.tsx:31 | `rgba(0,0,0,0.45)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/v2/KitLiquidGlass.tsx:32 | `rgba(255,255,255,0.055)` | Белый с альфой | g.hairlineSoft |
| Прочее | components/v2/KitLiquidGlass.tsx:37 | `rgba(0,0,0,0.7)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/v2/KitLiquidGlass.tsx:41 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | components/v2/KitLiquidGlass.tsx:41 | `#F2F1F6` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | components/v2/KitLiquidGlass.tsx:41 | `#E3E2E8` | Серый | g.secondary |
| Прочее | components/v2/KitLiquidGlass.tsx:44 | `rgba(255,255,255,1)` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | components/v2/KitLiquidGlass.tsx:45 | `rgba(0,0,0,0.10)` | Тёмная база | g.deepBase / g.deepBaseAlt / g.opaqueSheet |
| Прочее | components/v2/KitLiquidGlass.tsx:46 | `rgba(0,0,0,0.75)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/v2/KitSpinner.tsx:19 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | components/v2/KitSpinner.tsx:19 | `rgba(255,255,255,0.18)` | Белый с альфой | g.bevelHi |
| Прочее | components/v2/V2TabBar.tsx:72 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | components/v2/V2TabBar.tsx:73 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | components/v2/V2TabBar.tsx:89 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | components/v2/V2TabBar.tsx:366 | `#000` | Тень | g.dropShadow |
| Прочее | components/v2/V2TabBar.tsx:381 | `rgba(255,255,255,0.045)` | Белый с альфой | g.hairlineSoft |
| Прочее | components/v2/V2TabBar.tsx:389 | `#000000` | Тень | g.dropShadow |
| Прочее | components/v2/V2TabBar.tsx:394 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Прочее | components/VipGreenUserName.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Прочее | components/VipSurveyModal.tsx:587 | `rgba(0,0,0,0.58)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/VipSurveyReviewPromptModal.tsx:199 | `rgba(0,0,0,0.56)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Прочее | components/YearWheel.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Прочее | modules/learning-v2/modes/listen_choose_mode_v1.tsx:147 | `#E9E9EB` | Серый | g.secondary |
| Результаты | app/achievements_screen.tsx:143 | `#FF6B35` | Семантика | LV2_BAD (g.bad) |
| Результаты | app/achievements_screen.tsx:144 | `#3B82F6` | Другое | запросить токен у сессии «Темы» |
| Результаты | app/achievements_screen.tsx:145 | `#EC4899` | Семантика | LV2_BAD (g.bad) |
| Результаты | app/achievements_screen.tsx:146 | `#10B981` | Семантика | LV2_GOOD (g.good) |
| Результаты | app/achievements_screen.tsx:147 | `#E11D48` | Семантика | LV2_BAD (g.bad) |
| Результаты | app/achievements_screen.tsx:150 | `#888` | Серый | g.mutedText |
| Результаты | app/achievements_screen.tsx:515 | `#383838` | Серый | g.opaqueControl |
| Результаты | app/achievements_screen.tsx:515 | `#B0B0C0` | Другое | запросить токен у сессии «Темы» |
| Результаты | app/achievements_screen.tsx:516 | `#383838` | Серый | g.opaqueControl |
| Результаты | app/achievements_screen.tsx:516 | `#FFFFFF` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Результаты | app/achievements_screen.tsx:518 | `#fff` | Белый | g.text (на поверхностях темы) / g.mediaInk (на медиа и акцентных заливках) |
| Результаты | app/achievements_screen.tsx:620 | `rgba(0,0,0,0.5)` | Тень | g.dropShadow |
| Результаты | app/achievements_screen.tsx:621 | `rgba(2,3,6,0.72)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Результаты | app/lesson_complete.tsx:188 | `rgba(0,0,0,0.5)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Результаты | app/lesson_complete.tsx:401 | `rgba(2,3,6,0.72)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Результаты | app/lesson_complete.tsx:1395 | `#3A3A3A` | Серый | g.opaqueControl |
| Результаты | app/lesson_complete.tsx:1396 | `#555` | Серый | g.opaqueControl |
| Результаты | app/streak_stats.tsx:402 | `#35D07F` | Семантика | LV2_GOOD (g.good) |
| Результаты | app/streak_stats.tsx:402 | `#FFB020` | Семантика | LV2_BAD (g.bad) |
| Результаты | app/streak_stats.tsx:402 | `#FF6B6B` | Семантика | LV2_BAD (g.bad) |
| Результаты | app/streak_stats.tsx:490 | `#4F8FF7` | Другое | запросить токен у сессии «Темы» |
| Результаты | app/streak_stats.tsx:1282 | `#35D07F` | Семантика | LV2_GOOD (g.good) |
| Результаты | app/streak_stats.tsx:1283 | `#35D07F` | Семантика | LV2_GOOD (g.good) |
| Результаты | app/streak_stats.tsx:1445 | `rgba(255,255,255,0.08)` | Белый с альфой | g.glassEdge |
| Результаты | app/streak_stats.tsx:1806 | `#9B59F5` | Другое | запросить токен у сессии «Темы» |
| Результаты | app/streak_stats.tsx:1806 | `#6B21D4` | Другое | запросить токен у сессии «Темы» |
| Результаты | app/streak_stats.tsx:2515 | `rgba(23,32,29,0.45)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Результаты | app/streak_stats.tsx:2515 | `rgba(255,255,255,0.45)` | Белый с альфой | g.mediaInk + альфа |
| Результаты | app/streak_stats.tsx:2653 | `rgba(255, 180, 60, 0.14)` | Семантика | LV2_BAD (g.bad) |
| Результаты | app/streak_stats.tsx:2655 | `rgba(255, 160, 40, 0.45)` | Семантика | LV2_BAD (g.bad) |
| Результаты | components/AchievementArt.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Результаты | components/achievements/AchievementCategoryDock.tsx:278 | `#000000` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Результаты | components/level_up/LevelUpMintCeremony.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Результаты | components/level_up/MintSceneArt.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Результаты | components/level_up/MintSparks.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Результаты | components/MedalToast.tsx:28 | `#D08C4A` | Семантика | LV2_BAD (g.bad) |
| Результаты | components/MedalToast.tsx:29 | `rgba(208,140,74,0.45)` | Семантика | LV2_BAD (g.bad) |
| Результаты | components/MedalToast.tsx:32 | `#72D8FF` | Другое | запросить токен у сессии «Темы» |
| Результаты | components/MedalToast.tsx:33 | `rgba(114,216,255,0.45)` | Другое | запросить токен у сессии «Темы» |
| Результаты | components/MedalToast.tsx:36 | `#F2C44A` | Семантика | LV2_BAD (g.bad) |
| Результаты | components/MedalToast.tsx:37 | `rgba(242,196,74,0.55)` | Семантика | LV2_BAD (g.bad) |
| Результаты | components/MedalToast.tsx:473 | `#000` | Тень | g.dropShadow |
| Результаты | components/StatsCardArtSurface.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Результаты | components/StatsPremiumBlur.tsx:90 | `rgba(255,255,255,0.00)` | Белый с альфой | g.hairlineSoft |
| Результаты | components/StatsPremiumBlur.tsx:90 | `rgba(255,255,255,0.10)` | Белый с альфой | g.glassEdge |
| Результаты | components/StatsPremiumBlur.tsx:90 | `rgba(255,255,255,0.00)` | Белый с альфой | g.hairlineSoft |
| Результаты | components/StatsPremiumBlur.tsx:97 | `rgba(255,255,255,0.00)` | Белый с альфой | g.hairlineSoft |
| Результаты | components/StatsPremiumBlur.tsx:97 | `rgba(255,255,255,0.12)` | Белый с альфой | g.glassEdge |
| Результаты | components/StatsPremiumBlur.tsx:97 | `rgba(255,255,255,0.00)` | Белый с альфой | g.hairlineSoft |
| Результаты | components/StatsPremiumBlur.tsx:104 | `rgba(255,255,255,0.00)` | Белый с альфой | g.hairlineSoft |
| Результаты | components/StatsPremiumBlur.tsx:104 | `rgba(255,255,255,0.07)` | Белый с альфой | g.glassEdge |
| Результаты | components/StatsPremiumBlur.tsx:104 | `rgba(255,255,255,0.00)` | Белый с альфой | g.hairlineSoft |
| Результаты | components/StatsPremiumBlur.tsx:221 | `rgba(255,255,255,0.35)` | Белый с альфой | g.mediaInk + альфа |
| Результаты | components/StatsPremiumBlur.tsx:221 | `rgba(0,0,0,0.26)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Результаты | components/StatsPremiumBlur.tsx:275 | `rgba(8,8,10,0.72)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Результаты | components/StatsPremiumBlur.tsx:281 | `rgba(0,0,0,0.26)` | Тёмная база | g.deepBase / g.deepBaseAlt / g.opaqueSheet |
| Результаты | components/StatsPremiumBlur.tsx:313 | `rgba(0,0,0,0.00)` | Тёмная база | g.deepBase / g.deepBaseAlt / g.opaqueSheet |
| Результаты | components/StatsPremiumBlur.tsx:331 | `rgba(255,255,255,0.10)` | Белый с альфой | g.glassEdge |
| Результаты | components/StatsPremiumBlur.tsx:352 | `rgba(255,255,255,0.16)` | Белый с альфой | g.bevelHi |
| Сообщество | components/friends_together/FriendEventMarker.tsx:13 | `#EEE7DB` | Серый | g.secondary |
| Сообщество | components/friends_together/FriendEventMarker.tsx:14 | `#2D3842` | Серый | g.opaqueControl |
| Сообщество | components/friends_together/FriendEventMarker.tsx:15 | `#5E8C90` | Другое | запросить токен у сессии «Темы» |
| Сообщество | components/friends_together/FriendEventMarker.tsx:16 | `#DF824B` | Семантика | LV2_BAD (g.bad) |
| Сообщество | components/friends/FriendsAddSheetShell.tsx:190 | `rgba(0,0,0,0.6)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Сообщество | components/ReportPackModal.tsx:136 | `rgba(0,0,0,0.58)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Сообщество | components/ReportPackModal.tsx:402 | `#000000` | Тень | g.dropShadow |
| Сообщество | components/ReportUserModal.tsx:288 | `#000000` | Тень | g.dropShadow |
| Сообщество | components/ReportUserModal.tsx:289 | `rgba(0,0,0,0.53)` | Скрим | theme-exempt: тёмное затемнение под окном |
| Сообщество | components/ReportUserModal.tsx:318 | `rgba(0,0,0,0.53)` | Скрим/подложка | g.deepBase / g.opaqueSheet (подложка) или theme-exempt (скрим) |
| Сообщество | components/spire/SpireFriendsRow.tsx:44 | `rgba(255,255,255,0.12)` | Белый с альфой | g.glassEdge |
| Сообщество | components/spire/SpireTower.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |
| Сообщество | components/spire/SpireTowerSvg.tsx | (палитра иллюстрации) | Иллюстрация/бренд | вне темы по замыслу (арт и брендовые палитры) |

## Что исправлено 10.10 (замена литералов токенами темы)

| Волна | Коммит | Область | Файлы |
|---|---|---|---|
| 1 | e6f65dbbf | Карточки | CardsHubV2 (хаб, плитки, стопка), CardsKit, FlashcardsTrainingModeSheet (подложка шторки #101014 → opaqueSheet), ExpandedCardV2, VideoSetView, PackHeaderV2, CollectionHeaderV2, MyPacksV2, PackEditorV2, CollectionListView, TrainingSetupV2, panelPaint |
| 2 | 09275b804 | Ошибки | PracticeKit, PanelKit, GlassRim, PanelSheet, mistake_detail, mistakes_hub, mistake_practice_session, mistakes_list |
| 3 | eddde55bd | Видео и Сообщество | видео-оверлеи (theme-exempt), flashcards_video_packs, community_pack_create, PackLanguagePicker, UgcPackEditorCardPreview, flashcards_packs |

Использованные токены (liquidGlassTokens, добавлены сессией «Темы» в b80167e8d): deepBase, deepBaseAlt, mediaScrim, mediaInk, mediaInkSoft, bevelHi, bevelLo, dropShadow, hairlineSoft; существующие: opaqueSheet, opaqueControl, glassEdge, line, text, secondary, mutedText, accent, accentInk. Красный «Удалить» — семантический LV2_BAD.

## Нужны токены — список для сессии 4 «Темы» (свой HEX не вводили)

1. **Семантика** (169 вхождений): `good` / `bad` / `warn` / `info` в GlassTokens (сейчас good/bad живут только в Lv2Glass как константы LV2_GOOD / LV2_BAD). Нужны: RankChangeBanner, streak_stats (оценка 35D07F / FFB020 / FF6B6B), achievements_screen, лимит-плашки.
2. **Тёмный скрим** (≈170): `scrim` — затемнение под шторками и окнами, тёмное в любой теме (`rgba(0,0,0,0.6)` и др.); сейчас помечается theme-exempt.
3. **Палитры уровней A1–B2 по темам** в `app/(tabs)/lessons.tsx` (строки ≈ 329–432): таблица цветов карточек уроков по каждой теме — её место в файлах тем, не в экране.
4. **Категории достижений** (`achievements_screen.tsx` 143–147) и **медали** (`MedalToast.tsx`): токены категорий.
5. **Плитки настроек** (`components/settings/SettingsGroup.tsx` 36–45): 10 цветов плиток — темизировать (по теме или по акценту).
6. **Кит**: `components/v2/KitLiquidGlass.tsx` (15), `V2TabBar.tsx` (7) — токены кита.
7. **Деньги и энергия — только вид**: `shop.tsx` (21), `paywall/paywallShared.tsx` (19), `EnergyBar`, `NoEnergyModal` — цвета не трогал (запрет на платёжные пути), нужен договор с Ядром.
8. **Белое поверх акцентной заливки** (`'#fff'` на кнопках `accent`): в экранах брать `g.accentInk`; в pack_opening, ai_dialog_session (`#07110A`) не заменял — другая сессия правит.
9. **Бренд/иллюстрации** (≈690, вне темы по замыслу): FriendEventMarker, ProfileCard*, StatsCardArtSurface, SpireTowerSvg (Codex), LingmanCertificateSvg, MintSceneArt, CoinFaceArt, RewardModalBackdrop, AppArtBackdrop.
10. **Learning V2** (`app/learning-v2/session/[id].tsx` 118, `learning_v2_session_intro_check.tsx` 52): зона Codex, не трогал.
