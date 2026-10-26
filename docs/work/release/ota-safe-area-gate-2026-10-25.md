# Safe-area гейт OTA: фон под статус-баром (всё, что изменилось после 2.0.2)

Дата: 25–26.10, сессия 4 · ТЕМЫ, задача координатора. Правило владельца: «фон идёт под статус-баром на каждом экране, никакой
цветной полосы safe-area». База — снимок сборки 2.0.2 (144) `009c40c97`; те же 142 `.tsx`, что в контраст-гейте
(docs/work/release/ota-contrast-gate-2026-10-25.md), плюс новые экраны: окна М, «Восстановить аккаунт?», гейт и память Диалогов,
экзамен v2, Мастерская. Проверка — по коду; снимки эмулятора — за Сверкой.

## 1. SafeAreaView или отступ, красящий полосу чужим цветом — нарушений нет

17 мест с `SafeAreaView` в изменённых файлах. Во всех у самого `SafeAreaView` своего фона нет (или это фон экрана `p.bg`), а снаружи
лежит полноэкранный фон темы: `ScreenGradient`, `View`/`KeyboardAvoidingView` с `glass.bg`, `LinearGradient` `bgTop→bgBottom`.
32 файла с ручным `paddingTop: insets.top`: у корня фон — токен экрана (`g.bg`, `p.bg`, `c.bg` = `g.bg`); остальные строки — тосты
и кнопки «пропустить», отодвинутые ниже статус-бара. Новые экраны: экзамен v2 и глава-экзамен — корень `g.bg` + отступ внутри;
окна М — прозрачная шторка поверх прежнего экрана; Мастерская — внутри урока (`ScreenGradient`).

## 2. Белая/чёрная вспышка первого кадра — нарушений нет

Корневых белых/чёрных фонов в изменённых файлах нет. У стека навигации `contentStyle: { backgroundColor: tTheme.bgPrimary }`,
`bgPrimary = glass.bg` — экран, ещё не нарисовавший себя, показывает фон текущей темы.

## 3. Стиль статус-бара против яркости фона — нарушений нет

Все `<StatusBar>` берут `statusBarLight` (= тёмное оформление темы) или `P.isLight` (онбординг). Исключение по смыслу —
`language_welcome`: своя тёмная палитра (theme-exempt) и `light-content` на ней — согласовано. `expo-status-bar` не используется.

## 4. НАЙДЕНО: прозрачные модалки без `statusBarTranslucent` (Android)

Прозрачный `<Modal>` без `statusBarTranslucent` на Android не заводит своё затемнение под статус-бар — сверху остаётся светлая
полоса незатемнённого экрана. Исправлено (флаг; у всех отступ сверху уже считался от верха экрана — содержимое не съезжает):

| Файл | Что это | Примечание |
|---|---|---|
| components/modal_fx/HybridAlertShell.tsx | общая оболочка окон-предупреждений и шторок | только statusBarTranslucent: нижние шторки не отступают на навигацию |
| app/lesson_complete.tsx | шторка выхода из итога урока | + navigationBarTranslucent, низ уже на bottomInset |
| components/NoEnergyModal.tsx | «Нет энергии» | + navigationBarTranslucent, отступы insets уже есть |
| components/ThemedConfirmModal.tsx, components/ThemedChoiceModal.tsx | общие окна вопроса и выбора | |
| components/ReportErrorButton.tsx, components/ExplainReportButton.tsx | формы жалобы | |
| components/PackMoreMenu.tsx, app/flashcards/CollectionHeader.tsx | меню у кнопки в шапке | попутно: на Android меню вставало ниже кнопки на высоту статус-бара |
| components/youtube/YoutubeChannelPickerSheet.tsx | выбор канала | |
| app/(tabs)/settings.tsx | смена аккаунта | содержимое по центру |

Хозяева сами: `components/SpeakingPanel.tsx` (Learning V2) и `components/DeleteAccountConfirmModal.tsx` (5 · ВХОД) — флаг уже в их
рабочих правках, до их коммита храповик на чистом HEAD покажет эти файлы.

Сторож — tests/modal_status_bar_translucent_ratchet.test.mjs (разбор по дереву TypeScript): новые прозрачные модалки обязаны нести
флаг, список старых только сокращается, исправленные оболочки держат флаг.

## 5. Осталось (список храповика)

- Занято: `app/(tabs)/home.tsx` (Ядро, после выноса окон).
- С решения хозяина: `app/settings_notifications.tsx` — окно `TimeModal` держит байт-снимок `settings_notifications_liquid_glass`.
- Онбординг: `components/CleanOnboarding.tsx` (2) — до выбора темы, theme-exempt.
- Мёртвые: `components/home/HomeMistakesLockedSheet.tsx`, `components/learning-v2/horizons/LearningV2Horizons.tsx`.
- Разобрать по одному (прокрутка, клавиатура, шторка снизу): `AccountLogoutFlow`, `NicknameEditModal`, `CertificateNameModal`,
  `FirstPurchaseSealCelebration`, `ReportUserModal`, `ReviewPromptModal` (2), `components/ui/v2_sheet`.

## Чужие красные, замеченные попутно

`legal_document_liquid_glass_source_contract` и `privacy_settings_liquid_glass_source_contract` — изменён текст политики
конфиденциальности (`legal/privacy_policy_en.json`, строка про OpenAI); не правки этого гейта.
