# Остаток обводок — только экраны R1 (стиль «Тень»)

Governance-ID: TG-B1DE3307CE18
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (поручение координатора)

## Outcome
В файлах экранов R1 (Диалоги, Карточки, Шпиль, Пейволы, Настройки, Главная, Сообщество) нет обводок контейнеров: рамки заменены разделителями-линиями (RowDivider) или тенью; кольца состояний (верно/неверно, валидность, выделение, вырез значка) помечены `shadow-ok` с причиной. База сторожа обводок снижена.

## Scope
Файлы: ExplainButton, PrimaryButton, SectionSheetHeader, DialogGoalsSheet, DialogueV2BriefingScreen, pack_opening, referral_code_sheet, ReportPackModal, SoftContextualUpsellCard, OfflineDataNotice, CoinRankCatalog, ActivityHeatmap365, promo_code_entry, PracticeKit, V2Kit, V2TabBar, PlayerProfileModal. Не трогаю: Онбординг (заморожен), DeleteAccountConfirmModal (Авторизация), settings_notifications (чужая незакоммиченная правка), «после R1».

## Architecture
RowDivider (линия-View) вместо borderTop/Bottom; удаление dead border* при borderWidth 0; boxShadow из ShadowSurface там, где рамка отделяла плашку.

## Security and privacy
Не применимо.

## Technical debt
Остаток вне R1 — в отчёте.

## Verification
Сторож shadow_style_no_container_borders, точечные тесты экранов, база вниз.

## Rollback
git revert коммита.
