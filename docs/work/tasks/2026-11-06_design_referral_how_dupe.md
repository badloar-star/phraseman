# Task packet: «Награда за друга» — убрать дубль «?» и сверить текст условий с сервером (слово владельца 06.11)

Governance-ID: TG-91C1EEFF8F8E
Status: Planned
Owner: 2 · ДИЗАЙН
Related epic/enabler: app/referrals.tsx, components/referral_ladder_how_sheet.tsx, components/referral_ladder_strings.ts, functions/src/referral_ladder_plus.ts (только чтение)

## Outcome

В шапке экрана «Награда за друга» нет значка «?», дублирующего кнопку «Как это работает» (кнопка остаётся). Текст объяснения не врёт: перед правкой условия Plus сверены с серверным кодом; расхождение с просьбой владельца передано координатору, сервер не менялся.

## Scope

In scope: app/referrals.tsx (акцессуар шапки при показе лесенки), тест-сторож; чтение functions/src/referral_ladder_plus.ts, referral_ladder_server.ts, community_month_tally.ts.

Out of scope: изменение серверных условий засчитывания (решает координатор с Ядром), текст how3 до решения.

## Architecture

No architecture change: убирается дублирующий вход в тот же лист; кнопка «Как это работает» внутри карточки лесенки (onHow) сохраняется.

## Security and privacy

Данных не собираем, права и сервер не меняются.

## Technical debt

Contain: рулеточный «?» остаётся только в режиме без лесенки (там он единственный вход).

## Verification

Тест referral_ladder_2026_10_29 и новый сторож; проверка типов по app/referrals.tsx.

## Rollback

Откатить коммит.
