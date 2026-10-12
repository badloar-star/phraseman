# Task packet: dev-подмены для съёмки зоны Авторизации — robot_no_cloud, restore=offer|restored, testID переключателей

Governance-ID: TG-B0DD4F95B1EF
Governance-ID: TG-758322BD3CF9
Status: Done (подмены, testID, шаги; тесты и гейт заглушек зелёные)
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10 вечер: «testID — ДА; restore=offer|restored — ДА, только dev; записи в облако с робота — НЕТ → robot_no_cloud=1»)
Related epic/enabler: съёмка R1 (DEV_LINKS_R1), строки settings-gap-010/027/017 (012 — ручной шаг Сверки), auth-gap-006/007

## Outcome

1. `dev_state?robot_no_cloud=1` — флаг в памяти процесса (вырезан из стор-сборки заглушкой). При нём тумблеры экранов
   «Уведомления» и «Приватность» меняют ТОЛЬКО состояние экрана (и «Сохранено»), ничего не сохраняют на устройство и в облако
   (recordToCloud, pushPrefs, push-токен, отметка «не доставлено», разрешение ОС не вызываются) — лог `[ROBOT-NO-CLOUD] skip <что>`.
2. `dev_state?restore=offer|restored` — вход отдаёт `account_delete_pending` до сети; окно «Восстановить аккаунт?» с
   подставным статусом (13 дней); `restored` — после «Восстановить» итог «Аккаунт восстановлен» без вызова сервера.
3. testID на переключателях: `notif-master-switch`, `notif-switch-<категория>`, `notif-daily-switch`, `<row>-switch` в Приватности.
4. Шаги робота в scripts/dev_links_r1_steps_auth.py; settings-gap-001 и 012 — ручные (001 — вход, утренний лист владельцу).
5. (TG-758322BD3CF9, Ядро 12.10) поправки шагов по коду: auth-gap-012 (plustransfer в окне смены), auth-gap-013/017 (кнопка «Сменить без сохранения» по тексту — у ThemedConfirmModal нет testID), auth-gap-018 (wait:46000), onboarding-006 (auth=none + #onboarding-existing-account).

## Scope

In scope: app/dev_robot_no_cloud.ts (+ заглушка store_release_stubs/dev_state + список в metro.config.js),
app/dev_account_state.ts (+ заглушка), app/dev_state_fixtures.ts, app/account_delete_restore_prompt.ts,
app/privacy_settings.tsx, app/settings_notifications.tsx, шаги робота, тесты.
Out of scope: продуктовое поведение (без флагов всё как было), облачные функции, правила.

## Architecture

Как существующие dev-подмены (dev_animations_off, dev_account_state): модуль-флаг в памяти, `__DEV__ && !IS_STORE_RELEASE`,
в стор-сборке metro подменяет модуль заглушкой (store_release_stubs_gate сверяет экспорты). Хуки стоят ДО побочных эффектов.

## Security and privacy

Подмены только снижают побочные эффекты: при robot_no_cloud ничего не пишется; при restore=* реальное восстановление
(restoreDeletedAccount) и вход недостижимы, выход/стирание при флаге отказывают (общая защёлка dev_account_state).
Политика конфиденциальности не затронута: новых данных нет.

## Technical debt

- Contain: флаги живут до перезапуска процесса; после R1 подмены остаются dev-инструментом.

## Verification

Точечные тесты (слот светофора): store_release_dev_state_stubs, новые тесты флага и restore; гейт заглушек
(node scripts/store_release_stubs_gate.mjs); синтаксис затронутых файлов; генератор DEV_LINKS_R1.

## Rollback

Откат коммита; без флагов в ссылке поведение не меняется.
