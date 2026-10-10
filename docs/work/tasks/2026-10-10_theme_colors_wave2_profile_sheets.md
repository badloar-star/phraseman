# Task packet: цвета — шторки визитки из токенов темы, затемнения/тени/DEV помечены theme-exempt

Governance-ID: TG-088BB92615B7
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0» (контур: токены тем)
Related epic/enabler: координатор 10.10 20:14 — остаток цветов, приоритет основные потоки (Профиль), Learning V2 / онбординг

## Outcome

Шторки визитки профиля («Текст визитки», «Стиль») красились литералами (`#151518`, белый, rgba белого) и в светлой теме были тёмным пятном с белым текстом. Теперь лист, поле, текст, предупреждение, ручка и кнопки — токены выбранной темы (хук `useProfileSheetPaint`). Арт визитки (превью стиля, имя на превью, кнопки на арте, подписи) — иллюстрация, помечены theme-exempt. Затемнения под окнами, тени, DEV-подсказки и значения по умолчанию пропсов в Learning V2, сертификате, уроке 1 и др. помечены theme-exempt с причиной.

## Scope

In scope: `components/profile-card/{ProfileCardBioSheet,ProfileCardProSheet,ProfileCardParts,ProfileCardBody,ProfileCardFooter}.tsx`, новый `profile_card_sheet_paint.ts`; пометки в `LearningV2*` (затемнения/тени), `CertificateNameModal`, `settings_notifications`, `lesson1`, `AchievementArt`, `LevelSpinRewardArt`, `TopFadeMask`, `MintSparks`, `PaywallMotion`, `dev-account-v2-ios-proof`; база храповика (строки моих файлов).
Out of scope: Главная и `DailyPhraseCard`; `app/learning-v2/session/[id].tsx` (118) и `learning_v2_session_intro_check` (52) — переписывание экрана; файлы с чужими правками в рабочей папке.

## Architecture

`ProfileCardButton` получил необязательный `paint` (по умолчанию прежнее — белое на арте), `buttonInk` — необязательный 4-й аргумент. Шторки берут `paint` из темы; визитка на арте не меняется. Токены — те же `liquidGlassTokens` (контраст ≥ 4.5 проверен по всем 23 темам).

## Security and privacy

Не применимо.

## Technical debt

- Legacy-экраны сессии Learning V2 (170) — Contain: отдельная задача.
- Остаток по мелочам вне основных потоков: `flashcards_blitz_session`, `SpeakHoldButton`, `language_welcome`, `flashcards_my_packs`.

## Verification

`profile_card_v2_source_contract` 38/38, `motion_hybrid_contract` 8/8, `theme_palette_roles` 8/8, `layout_stability_contract` 15/15, `line_scale_contract` 5/5, `learning_v2_liquid_glass_source_contract` и храповик цветов (27 тестов) зелёные; d145_guard.

## Rollback

`git revert` — шторки вернутся к литералам.
