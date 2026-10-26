# Task packet: старые анонсы 1.6.x не должны всплыть окном в 2.0 (AppMessageAnnouncementModal)

Governance-ID: TG-5EEF2479EE74
Status: Разбор по коду готов; фильтр в клиенте — после R56 (порядок координатора 15.10 ~19:50)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Уверенность, что серверные анонсы времён 1.6.x не всплывут окном в 2.0. Прод не трогаем.

## Разбор по коду (15.10)

Путь: `_layout.tsx` ~1490–1514 — при возврате в приложение `refreshAppMessagesSnapshotOnce` (интервал/вход) →
`listPendingAppMessageModals(snapshot, hasPremiumAccess)` → `skipAnnouncementsForFreshInstall` (новичок < суток — без окон)
→ очередь окна `appMessageModalQueue` → `AppMessageAnnouncementModal` (рисует ReleaseNotesModal).

Фильтры, через которые проходит сообщение (app/app_messages.ts):
1. снимок: `isAppMessageVisible` — active, `expiresAtMs > now` (по умолчанию createdAt + 30 дней, APP_MESSAGE_TTL_MS;
   админка может задать свой expiresAt), createdAt не в будущем; скрытые человеком отброшены (~1282);
2. `deliverySurface === 'inbox'`; аудитория (premium/free/all; vip_survey только Free);
3. версия: `isAppMessageAllowedForVersion` — ТОЛЬКО если у сообщения задан `targetAppVersions`; пустой список = всем версиям;
4. текст на языке интерфейса (`hasAppMessageCopyForLang`);
5. для окна: kind message|poll, `showOnNextLoginModal`, не подтверждено этим человеком (`appMessageModalAcknowledgedAtMs`).

Вывод: защиты по версии у «всем»-анонсов нет. Анонс 1.6.x, ещё активный и не истёкший (свой длинный expiresAt или
создан < 30 дней назад), без targetAppVersions, не подтверждённый этим человеком (новая установка 2.0 старше суток или
человек не открывал 1.6.x после рассылки) — всплывёт окном в 2.0. Подтверждение хранится на сервере по человеку, поэтому
видевшие его в 1.6.x повторно не получат.

## План (клиент, без прода)

Нижняя граница по устройству: при первом запуске сборки 2.0 сохранить отметку `app_messages_modal_floor_v2` (время).
Окном показываются только анонсы с createdAtMs ≥ этой отметки; старые остаются во входящих (счётчик/список), но не всплывают.
Лог [APP-MESSAGE-MODAL] skip reason=created_before_2_0_floor {id, createdAtMs, floorMs}. Тест на фильтр.

## Scope

In scope: новый модуль `app/announcement_version_floor.ts` (readOrInitAnnouncementFloor, skipAnnouncementsBeforeFloor),
`app/_layout.tsx` — фильтр очереди окна объявлений после выборки (только свои строки, в файле есть чужие), тест
`tests/announcement_version_floor.test.ts`. Out of scope: сервер/админка, прод-данные, «Входящие» (старые анонсы остаются там).

## Architecture

Клиентская нижняя граница по устройству: ключ `app_messages_modal_floor_v2` ставится при первом обращении сборки 2.0
(«сейчас»); окно получает только объявления с createdAtMs ≥ границы. Явно нацеленные на версию (targetAppVersions непуст и
уже прошли фильтр версии) идут без границы. Сбой чтения → граница «сейчас» (fail-closed: старое не всплывёт). Часы из будущего
→ новая граница. Ключ вне перечня ключей аккаунта — проверку «чистого гостя» не задевает.

## Technical debt

- Анонс «всем», созданный до обновления на 2.0, окном не всплывёт и у тех, кому он был бы уместен — Accept: для релизных
  анонсов админ задаёт targetAppVersions; владелец — 5 · АВТОРИЗАЦИЯ, пересмотр при доработке админки анонсов.

## Security and privacy

Данных не добавляется; локальная метка времени без PII.

## Verification

Тест фильтра; журнал на устройстве.

## Rollback

Обратный собственный патч.

Governance-ID: TG-5EEF2479EE74
Реализация 19:55: app/announcement_version_floor.ts (readOrInitAnnouncementFloor + skipAnnouncementsBeforeFloor), _layout — фильтр очереди окна после fresh_install. Исключение: сообщение, ЯВНО нацеленное на текущую версию (targetAppVersions содержит её), проходит без границы — так релизный анонс 2.0 дойдёт до обновившихся позже. Ключ вне перечня ключей аккаунта → проверку чистого гостя не задевает.

## Доводка под правила координатора (~20:20)

Governance-ID: TG-A3E5FCC26871
1) без даты создания в данных сервера — не показываем (createdAtKnown=false: normalizeAppMessage подставлял «сейчас» и такой анонс проходил); 2) лог на каждое сообщение [APP-MESSAGE] {id, createdAt, firstLaunch2At, decision}; 3) исключение для targetAppVersions снято — правило координатора «только созданные позже отметки» (релизный анонс админ создаёт после выхода 2.0; созданный раньше остаётся во «Входящих»).

## Решение координатора ~20:50: обход для targetAppVersions ВЕРНУТЬ

Governance-ID: TG-366AEDCBA011
Порядок решения: без даты → skip_no_created_at; targetAppVersions непуст (фильтр версии уже пропустил текущую) → show_targeted (релизный анонс 2.0 доходит окном до всех, даже созданный раньше первого запуска 2.0); иначе — только созданные позже первого запуска 2.0. Тест: старый без цели → нет; старый с целью 2.0 → да; без даты → нет; новый → да.

## Итог 20:46

✅ 6fef1ac94 — обход для targetAppVersions возвращён (решение координатора ~20:50), без даты → нет, тест 4/4. Предыдущее: 391fffe30, 89a812d7e, 6a8c3a911. Хэш координатору не ушёл — пересылка на паузе.
