# Task packet (продолжение, политика и сервер): D189 — гостей удаляем с сервера сразу (без 14 дней); политика; записи D189–D192; оценка D190/D191

Governance-ID: TG-B4EF8E8478E3
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: D189 (владелец 14.10 ~19:05 «ДА, СРАЗУ»), D190/D191/D192 (владелец 14.10 ~19:15), выкладка сервера 17.10

## Outcome

Задача удаления ГОСТЯ (строгий признак: анонимный вход, в token.firebase.identities нет google.com/apple.com/password,
providerData у пользователя Auth пуст, по всему identityClosure и users/{stableId}.linkedAuth ничего привязанного) ставится
с nextAttemptAtMs = сейчас, воркер берёт её сразу. Любое сомнение или ошибка чтения → обычные 14 дней + лог причины.
Признак перепроверяется при обработке задачи. Аккаунты Google/Apple — без изменений (14 дней).
Политика (legal/*.json → legal:sync → app/legal, сайт, data-deletion) говорит то же самое. D189–D192 записаны в 03_DECISIONS,
D192 — задача в registries/tasks.json (после R1). Оценка D190/D191 — координатору до начала.

## Scope

In scope: functions/src/account_delete.ts (признак гостя при enqueue), account_delete_job.ts (поле в задаче, перепроверка
при захвате), тесты functions; legal/privacy_policy_en(.json|_ios.json), scripts/sync-legal-html.mjs (data-deletion), app/legal
(через legal:sync); docs/phraseman-2.0/03_DECISIONS.md; docs/phraseman-2.0/registries/tasks.json; DEPLOY-план 17.10.
Out of scope: клиент (восстановления у гостя нет и так); выкладка (владелец 17.10).

## Architecture

Решение «гость» принимает только сервер по своим источникам (токен + Auth + Firestore), клиенту не верим. Задача хранит
guestImmediate и причину; воркер при захвате повторяет проверку по identityClosure/linkedAuth и при расхождении
переводит задачу обратно в grace (nextAttemptAtMs = createdAtMs + 14 дн), не удаляя.

## Security and privacy

Ошибка в сторону «привязанный стёрт сразу» = потеря данных человека → сомнение трактуется как «не гость». Политика
обновляется ДО выкладки сервера; публикует владелец вместе с сервером 17.10.

## Technical debt

Contain: уже стоящие задачи гостей (в т.ч. №3) после выкладки обработаются по новому правилу — строка в DEPLOY-плане 17.10.

## Verification

Тесты functions: гость → сразу; гость+Google → 14 дн; неизвестный провайдер → 14 дн; anon-токен при привязанном Google → 14 дн;
ошибка чтения Auth → 14 дн; перепроверка при обработке; типы functions; legal:sync без расхождений.

## Rollback

Вернуть ветку grace для всех (одна правка в enqueue) и прежний текст политики из git.
