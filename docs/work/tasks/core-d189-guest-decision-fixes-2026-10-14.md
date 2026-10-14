# Task packet: D189 — три правки решения «гость — удалить сразу» (разбор Авторизации)

Governance-ID: TG-6399FD685E39
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: D189 (владелец 14.10 «ДА, СРАЗУ»), разбор Авторизации, координатор 14.10; выкладка — пакет 17.10

## Outcome

decideAccountDeleteGuestImmediate:
а) нет профиля стабильного аккаунта, а stableUid ≠ authUid (связь есть, профиля нет) → reason=profile_missing → 14 дней;
   stableUid = authUid, анонимный Auth без провайдеров и профиля нет — чистый гость, удаляем сразу;
б) оба catch (auth_lookup_failed, profile_read_failed) пишут код и текст ошибки в лог решения;
в) прямая проверка auth_links/{id} по всему identityClosure: provider задан и ≠ anonymous → auth_link_linked → 14 дней
   (случай «Google-пользователь в Auth уже удалён, а связь осталась»).
Каждый выход решения — строка [D189-GUEST] с причиной.

## Scope

In scope: `functions/src/account_delete.ts` (решение, передача stableUid), тест `functions/src/account_delete_guest_immediate.test.ts`.
Out of scope: перепроверка в воркере (account_delete_job.ts) — без изменений; клиент; выкладка.

## Architecture

Профили и связки — ОДНИМ getAll (users/{id} + auth_links/{id} для всего closure): +|closure| чтений на запрос удаления —
удаление редкое, координатор принял. Строгость прежняя: сомнение или ошибка → 14 дней.

## Security and privacy

Ошибка в сторону «привязанный стёрт сразу» — потеря данных человека; все новые ветки только добавляют поводы для 14 дней,
кроме явного случая а) «чистый гость без профиля». В лог — коды и причины, без uid и почты.

## Technical debt

Contain: воркер перепроверяет только профили; при желании добавить туда auth_links — отдельно.

## Verification

Тесты: профиль стабильного аккаунта отсутствует при stableUid ≠ authUid → profile_missing; stableUid = authUid, профиля нет →
сразу; auth_links с provider google → auth_link_linked; anonymous / без provider → не мешает; ошибки чтения → коды в логе;
прежние тесты D189 зелёные. Типы функций.

## Rollback

Вернуть прежнюю проверку профилей (profilesLinked) — поведение как до правки.
