# Task packet: «ручка шторки ⇒ свайп вниз закрывает» — инвентарь и правка (14.10)

Governance-ID: TG-4E8700A43CDF
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по поручению координатора (расследование «закрыл шторку — всё зависло»)
Related epic/enabler: none

## Outcome

Правило владельца через координатора: если у шторки видна «ручка», свайп вниз закрывает её тем же путём, что крестик/фон. Исключения — моменты оплаты и необратимые действия: там ручку прячем. Шторка пейвола — зона Авторизации, не трогаем.
Результат: журнал-инвентарь `[SHEET-SWIPE]` (шторка → ручка → чем закрывается) координатору; общий помощник свайпа; правка шторок с ручкой без свайпа; сторож «ручка ⇒ свайп».

## Scope

In scope: `components/modal_fx/HybridSheetShell.tsx` (ручка прячется при `dismissDisabled`), новый общий помощник свайпа, шторки с ручкой без свайпа (список в инвентаре ниже), сторож `tests/sheet_handle_implies_swipe_contract.test.ts`.

Out of scope: пейвол Plus (`PaywallPlusScreen`, `PaywallPlus`, `paywallShared`, `PAYWALL_SHEET_STACK_OPTIONS`) — Авторизация; нативные route-шторки раздела (они уже с `gestureEnabled: true`).

## Architecture

Один источник поведения: помощник `SheetSwipeClose` (Gesture.Pan, порог и скорость как у `HybridSheetShell`: 88 px / 900), закрывающий через тот же обработчик, что крестик/фон шторки. Шторки на `HybridSheetShell`/`KitSheetModal` свайп уже имеют; помощник нужен только собственным `Modal`-шторкам. Правило сторожа: файл с ручкой (`grab`/`grabber`/`handle`) обязан использовать `HybridSheetShell`, `KitSheetModal`, `SheetSwipeClose` или собственный `Gesture.Pan`/`PanResponder`, либо быть в явном списке исключений с причиной.

## Security and privacy

Данных не касается. Свайп не должен закрывать необратимые действия: такие шторки получают `dismissDisabled` и ручка у них скрыта.

## Technical debt

Pay now: расхождение «ручка есть, свайпа нет». Contain: сторож на будущее. Accept temporarily: нативные route-шторки на Android рисуются полноэкранным модалом без ручки (свайп назад — системный).

## Verification

`npm run test:one` по новому сторожу и по затронутым шторкам; кадры и свайп на эмуляторе — Сверка/Эмулятор.

## Rollback

git revert коммитов.

## Инвентарь `[SHEET-SWIPE]`

Формат: шторка → ручка → свайп → чем закрывается.

### Route-шторки (native-stack)
- settings_edu, settings_notifications, settings_themes, settings_language, privacy_settings, support_report, manage_subscription, account_details, referrals, promo_code_entry, privacy_screen, terms_screen → нативный pageSheet (iOS) → `gestureEnabled: true` → свайп/назад/крестик. Android: полноэкранный modal без ручки. ОК.
- premium_modal → ручка есть, `gestureEnabled: false` → Авторизация (не трогаю).
- pack_opening → ручки нет, `gestureEnabled` по умолчанию false → необратимая церемония, ОК.

### Общие оболочки
- `HybridSheetShell` → ручка всегда → свайп по всей шторке (88 px / 900) → тот же `onClose`; `dismissDisabled` блокирует свайп, но ручка оставалась видна — ПРАВЛЮ (ручка прячется). Пользователи: PackCommentsSheet, ReportCommentModal, DeckPickerSheet, AiConsentSheetModalHybrid, EntitlementExpiredHost, ExplainSheetHybrid, FeatureIntroModal, MistakeEli5ModalHybrid, ReleaseNotesModal, ReleaseNotesV2Modal, ReportPackModal, ReviewPromptModal, VipSurveyReviewPromptModal, DialogGoalsSheet, DialogWhySheet, DialogueGlassExitSheet, DialogueGlassMenuSheet, DevBotsSheet, FriendTogetherSheet, referral_sheet_shell, SpireExitSheet, SurveySheetModal, YoutubeChannelPickerSheet, YoutubeVideoPhrases, community_pack_create (PaywallPlusScreen — Авторизация).
- `KitSheetModal` → ручка → свайп по ручке и шапке → `onRequestClose`. Пользователи: LessonReviewSheet, NotificationCenterButton. ОК.

### Собственные Modal со своим свайпом (ОК)
AiConsentSheetModal (свайп = отказ), DialogHowToSaySheet, ExplainSheet, MistakeEli5Modal, RegistrationPromptModal (свайп = «позже»), referral_sheet_shell, DevHubSheet.

### НАРУШЕНИЯ: ручка есть, свайпа нет (чиню)
1. FlashcardsTrainingModeSheet (шторка «Режим») — фон/назад
2. FriendsAddSheetShell — фон/назад
3. ThemedChoiceModal — фон/назад (выбор языка обучения и др.)
4. ReportErrorButton — фон/назад
5. ExplainReportButton — фон/назад
6. DailyPhraseCard (детали) — фон/назад
7. AppMessagesInbox (MotionModal) — фон/назад
8. shop.tsx — `closeSheet`
9. PanelSheet (панель ошибок) — крестик
10. ProfileCardBioSheet — ручка-кнопка (`handleHit`) закрывает тапом
11. ProfileCardProSheet — ручка-кнопка закрывает тапом
12. PackEditorV2 — фон/крестик
13. YoutubeChannelPickerSheet и VipSurveyReviewPromptModal — своя ручка в собственном `Modal` с `animationType="slide"`, без свайпа
