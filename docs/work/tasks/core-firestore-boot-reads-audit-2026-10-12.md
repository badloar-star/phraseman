# Task packet: аудит чтений Firestore на холодном старте (R1) — таблица и 3 дешёвые правки

Governance-ID: TG-9FF0E519E35A
Status: Done (документ; код не меняется)
Owner: сессия «1 · Ядро» (координатор 12.10: «аудит по коду без эмулятора… таблица + 3 самые дешёвые правки, без выкладки»).

## Outcome
Документ `docs/phraseman-2.0/FIRESTORE_BOOT_READS_R1.md`: каждое чтение Firestore/функций от запуска до первого
кадра Главной и сразу после него — коллекция, метод, кэш и срок жизни, повтор при возврате на экран. Три самые
дешёвые правки — только предложение, код не трогается.

## Scope
In: чтение кода `app/_layout.tsx`, `app/cloud_sync.ts`, `app/app_messages.ts`, `app/global_broadcast_modal.ts`,
`app/auth_provider.ts`, `components/PremiumContext.tsx`, `app/remote_account_deletion_monitor.ts`,
`app/(tabs)/settings.tsx`, `components/NotificationCenterButton.tsx`, `app/user_notifications.ts`,
`app/remote_config_client.ts`; факты из архивных журналов сборщика ([MEM-TICK] 11–12.10).
Out: любые правки кода; эмулятор; выкладка.

## Architecture
Только документ. Предложения опираются на уже существующие механизмы (TTL-ключи в AsyncStorage, снимок
Настроек, константа `APP_MESSAGES_FOREGROUND_MIN_INTERVAL_MS`).

## Security and privacy
Без uid и данных пользователей; в документе — пути коллекций и имена функций.

## Technical debt
Таблица — по коду; точные числа на устройстве даст журнал Сверки ([MEM-TICK] firestoreReadsByCaller, bd3e11bd3).
Обслуживание ожидающих начислений карточек (4 с после первого кадра) не разобрано до уровня запросов.

## Verification
Каждая строка таблицы сверена с кодом (файл:строка в документе). Подтверждение на устройстве — журнал Сверки.

## Rollback
`git revert` коммита документа.
