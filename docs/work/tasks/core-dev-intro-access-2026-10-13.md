# Task packet: settings-gap-005 — dev-подмена «трёхдневный доступ активен» (только память)

Governance-ID: TG-C75684E553C3
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: settings-gap-005 (образец: «Plus за приглашения» + «Полный доступ на 3 дня»)

## Outcome

Ссылка `dev_state?introAccess=active` показывает на главной Настроек вторую плашку «Полный доступ на 3 дня · Действует до …»
без записи в хранилище и облако. В стор-сборке подмена мертва.

## Scope

In scope: `app/dev_paywall_state.ts` (+ стор-заглушка), `app/intro_full_access.ts` (чтение подмены под `__DEV__`),
`app/dev_state_fixtures.ts` (параметр `introAccess=active|off`), тест. Шаг ссылки — Авторизации.
Out of scope: настоящая выдача/окончание пробного доступа, деньги, уведомления.

## Architecture

No architecture change: `getIntroFullAccessState` в dev сначала смотрит подмену в памяти; PremiumContext перечитывает по
событию `intro_full_access_changed`. welcomeUnseen/expiredUnseen = false — окна приветствия/окончания не всплывают.

## Security and privacy

Не касается: dev-only, без записи.

## Technical debt

- Contain: подмена живёт до перезапуска процесса.

## Verification

Тест: подмена активна → состояние active с endsAt ≈ +3 дня, хранилище пусто; off → прежнее состояние; сторож стор-заглушек.

## Rollback

Откат коммита.
