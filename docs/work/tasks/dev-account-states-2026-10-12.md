# Task packet: dev-состояния зоны аккаунта для съёмки — auth=none, switch=, logout=, delete=fail, restore=retired, plustransfer=on

Governance-ID: TG-DD79D1531059
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по поручению координатора (12.10; docs/phraseman-2.0/R1_SHOT_LIST_ACCOUNT_SETTINGS.md часть А «Нет пути»)
Related epic/enabler: R1 робот-съёмка; app/dev_state_fixtures.ts; approach «memory_only» из коммита eb716d9a0

## Outcome

Робот снимает отказы и окна аккаунта, которые штатно не воспроизвести: «Вход недоступен» (onboarding-006), «Не удалось выйти» (profile-029), отказы смены аккаунта (auth-gap-004/005/013/014/015/017/018), `identity_retired` (auth-gap-008), «Удаление не завершилось» (auth-gap-011), строка про Plus в окне «Сменить аккаунт» (auth-gap-012). Результат: одна ссылка `dev_state?…` выставляет состояние; ни одна ветка не стирает реальные данные, не вызывает удаление, не пишет в хранилище и синхронизируемые ключи. Мера успеха: все перечисленные строки имеют параметр; в стор-сборке параметры ничего не делают (тест).

## Scope

In scope: новый модуль флагов в памяти `app/dev_account_state.ts`; разбор параметров `auth=none|ok`, `switch=…`, `logout=fail|precommit|ok`, `delete=fail|ok`, `restore=retired|ok`, `plustransfer=on|off` в `app/dev_state_fixtures.ts`; точечные dev-хуки в листовых функциях: `app/auth_provider.ts` (`signOutAndWipeForAccountSwitch`, `signInWithProvider`, `beginAccountDeletion`, `isGoogleSignInAvailableSync`/`isAppleSignInAvailable`/`peekAppleSignInAvailability`), `app/account_switch_unsaved_cards.ts`, `app/plus_transfer_hold.ts`; тест; обновление «нет пути».

Out of scope: `greet=` — переменная `greetName` живёт в `components/CleanOnboarding.tsx`, файле в работе у Авторизации (согласуется через координатора); экраны `account_details.tsx`, `onboarding_account_switch_confirm.ts`, `CleanOnboarding.tsx` НЕ трогаются; настоящие вызовы выхода/удаления/входа.

## Architecture

No architecture change: флаги в памяти, геттеры «выключено» вне `__DEV__ && !IS_STORE_RELEASE`. Хуки стоят В НАЧАЛЕ функций и возвращают результат до любого побочного эффекта (замки, запись, сеть). Любое `switch=`/`logout=`: и обычная, и форсированная («Сменить без сохранения») попытки выхода при включённом флаге возвращают отказ — реальное стирание данных недостижимо.

## Security and privacy

Снижает риск ошибочного стирания: dev-ветки только возвращают отказ. Новых данных, разрешений, сторонних сервисов и записей в синхронизируемые ключи нет; журнал пишет только названия состояний.

## Technical debt

Contain: тест «стор-сборка не затронута» + проверка, что хуки стоят до побочных эффектов. Accept temporarily: хуки остаются в auth_provider до конца R1 (владелец — координатор Сверки), затем удалить вместе со списком «нет пути»; `greet=` остаётся «нет пути» до решения Авторизации.

## Verification

`tests/dev_account_state.test.ts` (разбор, применение, стор-сборка, подключение хуков); срез типов по затронутым файлам; соседние тесты auth/switch/delete; прогон Сверки.

## Rollback

Откат коммита: флаги в памяти, данные пользователя не затрагиваются.
