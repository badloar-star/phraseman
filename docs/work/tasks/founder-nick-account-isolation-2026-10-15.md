# Task packet: «Пропуск основателя» показывает ник прошлого аккаунта (изоляция аккаунтов)

Governance-ID: TG-366AEDCBA011
Status: Сделано 3fc0a00f3 (15.10 21:30) — на ревью Ревизору
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

После смены аккаунта окно «Пропуск основателя» (LearningV2FounderPassModal, «＠{nickname}») не показывает ник прошлого гостя
или аккаунта. Виденное «＠Delta 94030» вместо имени текущего аккаунта больше не возможно.

## Разбор по коду (app/(tabs)/lessons.tsx)

- ~2503: ник из снимка profile.name (useAppSnapshotSelector);
- ~2653: useState без владельца; эффект ~2665 ставит ник только при непустом имени — пустое имя НЕ сбрасывает прежний
  (липкое состояние через смену аккаунта);
- ~2696: запасной путь — AsyncStorage `user_name`. Ключ на уровне хранилища аккаунтный: входит в SYNC_KEYS
  (cloud_sync.ts:501) → getRuntimeSyncKeys → accountLocalDataKeysForToday → стирается при выходе/смене (сценарный тест
  aa_account_switch_roundtrip_scenario проверяет user_name A→B); в NON_AUTHORITATIVE_BOOT_KEYS (не считается прогрессом в
  проверке чистого гостя); в инвентаре phone-state уже есть (external/none/sensitive). Чтение идёт под проверкой поколения.

## Scope

Новый чистый модуль `app/founder_nickname_scope.ts` (состояние ника {scope, value}; показ только своей области; смена области
при пустом имени — сброс); `app/(tabs)/lessons.tsx` — состояние ника через модуль + текущая область аккаунта по
subscribeAccountGeneration; лог [FOUNDER-NICK] {source, scope (8 знаков хэша), present} без самого ника; тест.
Out of scope: само окно, сервер, хранилище user_name (уже аккаунтное).

## Architecture

Ник хранится вместе с accountScopeHash (deriveLocalOfflineProgressAccountScopeHash(stableId)). Показ = ник, только если его
область совпадает с текущей областью аккаунта (подписка на смену поколения). Запасной путь user_name — только внутри текущего
поколения (проверка до записи состояния).

## Security and privacy

Устраняет показ чужого ника (персональные данные) новому человеку на том же устройстве. В лог ник не пишется.

## Technical debt

Нет новых.

## Verification

Тест: A с ником → смена на B без ника → ник A не виден; область B с ником → виден; лог без ника. Затем Ревизор.

## Rollback

Обратный собственный патч.
