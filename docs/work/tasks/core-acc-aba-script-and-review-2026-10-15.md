# Task packet: скрипт прогона A→B→A для эмулятора + замечания ревью Авторизации к 414bb1713

Governance-ID: TG-5F67829BA11F
Governance-ID: TG-81A16BB851F4
Governance-ID: TG-48949051C5B9
Governance-ID: TG-26DD819CAD1F
Governance-ID: TG-57C2DDA1D560
Governance-ID: TG-DAFBCE9B1E7A
Governance-ID: TG-65A3570C9605
Governance-ID: TG-04BB7CB99709
Status: In progress (скрипт — сейчас; правки кода — после 08:20, когда кончится №7)
Owner: Ядро (сессия 1)
Related: 414bb1713 (утечка между аккаунтами), docs/work/tasks/core-account-switch-leak-fix-2026-10-15.md

## Outcome

1. Координатор получает готовый скрипт `C:/Temp/claude/sv/acc_aba.sh` (+ помощник `aba_ui.py`). Скрипт делает живую проверку полного цикла: холодный старт → вход №2 → выход → вход №3 → выход → снова №2. Метки `[ACC-SWITCH-WIPE]`, `[ACC-SWITCH-RESTORE]` и `[ACC-MUT]` пишутся по шагам в `docs/phraseman-2.0/evidence/acc_aba_r1/`.
2. По ревью Авторизации, после 08:20:
   - (А) сброс кэшей в памяти на переходе null→X, если X ≠ последнего владельца;
   - (Б) снятие push-токена A, недошедшее в офлайне, повторяется на следующем онлайн-старте.

## Scope

In scope:
- скрипт и помощник вне репозитория;
- `app/account_owner_change.ts` (А);
- место снятия push при выходе (Б, после разбора);
- тесты.

Out of scope:
- серверная часть (снятие токена у других владельцев при регистрации — предложение на 17.10);
- аккаунт №1;
- пароли;
- покупки.

## Architecture

- **Скрипт.**
  - Ходит только по testID приложения и строке выбора аккаунта Google.
  - Перед каждым тапом проверяет экран: поле пароля, чужой пакет или неоднозначная строка → стоп с причиной в `STOP.txt`.
- **(А)** Хранить `lastNonNullOwner` и сбрасывать кэши при null→X, X ≠ lastNonNullOwner. Холодный старт не затрагивается: там lastNonNullOwner = null.

## Security and privacy

- Почты аккаунтов в отчёт не пишутся (маскируются).
- Аккаунт №1 скрипт не выбирает: нужна ровно одна строка с подстрокой цели, строка с запретной подстрокой ведёт к стопу.
- Пароли не вводятся.

## Technical debt

Нет нового. Скрипт вне репозитория.

## Verification

- `bash -n` скрипта, `py_compile` помощника.
- Запуск — координатор после №7.
- (А)/(Б): тесты `tests/account_switch_leak_fix.test.ts` + каскад.

## Rollback

- Скрипт — удалить файл.
- (А)/(Б) — откат коммита.

## Дополнение 07:55 (команды координатора)

Порядок:
1. 🔴 Уборка аварийных копий: новый `app/account_switch_backup_gc.ts`, запуск из `app/(tabs)/home.tsx` через `runAfterHomeFirstFrame`.
   - одна полка на владельца;
   - страницы без корня старше 10 мин — долой;
   - чужие полки по сроку — через прежний `pruneShelvedAccountSwitchBackups`;
   - всё под замком смены аккаунта, раз за процесс и раз в 6 ч;
   - лог `[ACC-SWITCH-BACKUP] owners= roots= pages= pruned=`.
2. (А) `app/account_owner_change.ts` — сброс на null→X.
3. (Б) `app/push_token_registration.ts` + `app/auth_provider.ts`: токен не снят → метка `push_token_rotate_pending_v1`. Устройство гасит токен (`unregisterForNotificationsAsync`) первым шагом регистрации; лог `push_cleanup_retry`.
   Сервер (пункт 5 выкладки 17.10, на «да» владельца): `functions/src/push_token_dedupe.ts` в `usersWriteRouter`.
4. Группировка `survivors.other` по виду ключа.
5. Старые красные:
   - сканеры языков — исключение с причиной для таблицы падежей лиг;
   - аналитика — поле `retired` для 6 событий D187;
   - DEV Hub «Проверка рун» — строка `preposition_drill`;
   - голос Kimi — мёртвый код лаборатории (никто не импортирует), только доклад.

Проверка: тесты на каждый пункт (`account_switch_backup_gc`, `push_token_rotate_pending`, `account_switch_leak_fix`, `push_token_dedupe`) + каскад + типы.
Откат — по коммитам.
