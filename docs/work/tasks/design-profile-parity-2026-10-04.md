# Task packet: «Профиль / Настройки» по profile.html — сверка кода с CSS макета до съёмки сессией 6

Governance-ID: TG-B24D20763F00
Status: In progress
Owner: сессия «2 · Дизайн» (контур 2), поручение координатора 04.10
Related epic/enabler: гейт «приложение = макет»

## Outcome

Экраны настроек и аккаунта совпадают с profile.html по размерам, отступам, кеглям (D145), радиусам и цветам.

## Scope

In scope: `app/account_details.tsx` и другие экраны профиля по кадрам PRF-*.
Out of scope: темы (сессия 4), логика аккаунта/входа/удаления, состав экранов (функции владельца).

## Architecture

No architecture change: вид.

## Security and privacy

Не затрагивает данные.

## Technical debt

- Accept temporarily: состав «Настроек» шире макета (приглашение друга, размер шрифта) — функции владельца.

## Verification

Сторож `profile_liquid_glass_source_contract`, typecheck; склейка сессии 6.

## Rollback

`git revert` коммита.
