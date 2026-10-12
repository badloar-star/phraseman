# Task packet: клиентские правки чтений старта по аудиту 047c73abc (п.70) + гейт заглушек в pre-commit (п.71)

Governance-ID: TG-5D8190E8E367
Status: 4 → 85f55fe2c, 1 → d06b9a511, 2 → 16864ff26, п.71 → c7725e8f7; №3 ждёт журнал Сверки [MEM-TICK]
Owner: сессия «1 · Ядро». Решение координатора (реестр п.70, 83c71dec0): «ДА, всё только на клиенте, без выкладки
сервера, каждая правка отдельным коммитом с логом до/после (кэш/сеть) и тестом». Порядок: 4 → 1 → 2 → п.71 → 3.

## Outcome
4) `fetchPendingGlobalBroadcastModal`: немой `catch { return null }` пишет причину.
1) Входящие: метка «уже форсили» — в AsyncStorage по stableId; `force` только при настоящем входе в аккаунт, иначе
   TTL 6 ч, и в «Настройках» тоже (вместо 30 с). Экономия — до 240 чтений на запуск и на заход в «Настройки».
2) Один `users/{uid}` на старт: проверка бана берёт `banned` из документа восстановления, если он свежий; TTL кэша бана
   остаётся 30 мин (безопасность не ослабляем). Рассылка при `premiumAudience≠all` берёт доступ из PremiumContext.
п.71) Гейт стор-заглушек (`scripts/store_release_stubs_gate.mjs`) — в `.git/hooks/pre-commit`, только если в коммите
   есть `app/dev_*` или `store_release_stubs/*`; существующий pre-commit не ломать.
3) Строка аккаунта в «Настройках» из `providerData` — только после журнала Сверки [MEM-TICK]; сперва логи.

## Scope
In: `app/global_broadcast_modal.ts`, `app/app_messages.ts` (метка force), `app/_layout.tsx` (вызов входящих, бан),
`app/(tabs)/settings.tsx` (TTL входящих), `app/cloud_sync.ts` (публикация свежего документа восстановления — только
если без этого не обойтись), `.git/hooks/pre-commit`, тесты к каждой правке.
Out: сервер, правила, выкладка; `dialogue_v2_authorized_catalogue_projection.ts`, `dialogue_v2_session_outcome_store`
(Дизайн); зоны Codex.

## Architecture
1) `appMessagesForcedForStableIds` (память) → ключ AsyncStorage `app_messages_login_forced_v1:<stableId>`; «настоящий
   вход» = метки нет для этого stableId (новая установка/новый аккаунт). Дальше — `minIntervalMs` 6 ч
   (`APP_MESSAGES_FOREGROUND_MIN_INTERVAL_MS`), «Настройки» — та же константа.
2) Восстановление уже читает `users/{uid}`; поле `banned` и время чтения публикуются в памяти процесса, проверка бана
   при свежем (≤ окна) снимке берёт его вместо второго get; `banned_users/{uid}` читается как прежде.
Каждая правка — строки лога до/после (источник: cache / network / restore_doc) с единым префиксом.

## Security and privacy
Бан: TTL не меняется, список `banned_users` по-прежнему читается; снимок `banned` берётся только из документа того же
uid и только свежий. В логи — без uid, только «yes/no», числа и причины.

## Technical debt
Метка force в AsyncStorage переживает переустановку только вместе с данными приложения — при очистке данных первое
открытие снова читает входящие (это и есть «настоящий вход»). pre-commit живёт вне репозитория (.git/hooks) — у
других клонов его нет; гейт по-прежнему стоит в release:precheck.

## Verification
Точечные тесты на каждую правку (`tests/*` через светофор), срез типов по затронутым файлам, babel_check; бой —
журнал Сверки (строки [APP-MESSAGES-REFRESH], [BAN-CHECK], [OVERLAY-QUEUE]).

## Rollback
Каждая правка — отдельный коммит, `git revert <hash>`; pre-commit — убрать добавленный блок.
