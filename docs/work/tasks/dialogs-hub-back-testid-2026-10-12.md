# Task packet: хаб «Диалоги» — стрелка назад: testID для робота (решение координатора п.72)

Governance-ID: TG-1AA57148B694
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: app/ai_dialog_home.tsx

## Outcome

Стрелка «‹» в шапке хаба «Диалоги» остаётся (хаб открыт с Главной), с хаптиком (уже есть) и testID `ai-dialog-home-back` для робота съёмки.

## Scope

In scope: один testID. Out of scope: вёрстка шапки, шкала D145 (не дробим), плейсхолдер (укорачиваем только если обрезан на новом кадре).

## Architecture

No architecture change.

## Security and privacy

Данных не касается.

## Technical debt

Pay now: робот не мог нажать «назад» в хабе по testID.

## Verification

Проверка тестов хаба; срез типов по файлу.

## Rollback

Откат коммита.
