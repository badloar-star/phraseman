# Task packet: D186 этап 1 — «Бонус на старт» (72 ч полного доступа) выключен полностью до сборки 16.10

Governance-ID: TG-DFA2AA04CBAD
Status: In progress (после повтора Сверки WINBACK и гостя №3)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Владелец 14.10: «ТАКОГО НЕ ДОЛЖНО БЫТЬ ВООБЩЕ, УДАЛИТЬ» (D186). Координатор утвердил два этапа: этап 1 — до сборки 16.10, этап 2 — после R1.

Факты:
- выдача в проде выключена 11.10 11:11 (`remote_config/app.bools.intro_full_access_enabled=false`);
- последний выданный бонус истёк 14.10 ~11:11 — внутри окна 72 ч сейчас никого нет.

**Этап 1 — одна точка истины** `app/intro_full_access.ts`:
- `getIntroFullAccessState` всегда отвечает «неактивно» (`active` / `expiredUnseen` / `welcomeUnseen` = false), включая dev-подмену;
- `startIntroFullAccessAfterOnboarding` ничего не выдаёт и не зовёт сервер;
- лог `[INTRO-REMOVED]`.

Следствия без правок в других файлах:
- окна «Бонус на старт» и «Три дня завершились» не показываются: _layout смотрит `welcomeUnseen` / `expiredUnseen`;
- строки «Действует до…» в Настройках нет (`isIntroFullAccess=false`);
- доступа по бонусу нет (PremiumContext, premium_guard, use_mistake_explain читают `active=false`);
- winback не ждёт intro (`introPending=false`).

## Scope

In scope:
- `app/intro_full_access.ts` — `INTRO_FULL_ACCESS_REMOVED = true` (D186) и ранние выходы с логом;
- тесты: `intro_full_access.test.ts`, `dev_intro_full_access.test.ts`, `unit/premium_guard.test.ts` и др. — под «выключено»;
- новый сторож `tests/d186_intro_full_access_removed.test.ts`.

Out of scope (этап 2, задача после R1): физическое удаление модулей, модалки, текстов, контекста пейвола intro_ended, ключей хранилища и cloud_sync, dev-подмен; серверный `introFullAccessClaim` 17.10 НЕ удалять (координатор).

## Architecture

Флаг-константа в источнике, а не удаление потребителей. За 2 дня до сборки не трогаем PremiumContext, cloud_sync и сервер (деньги и доступ). Потребители получают «неактивно», что равно поведению пользователя без бонуса. Таким сейчас и так является каждый пользователь.

## Security and privacy

Данных не собираем и не передаём. Перестаём звать `introFullAccessClaim` (одной записью в Firestore меньше на новичка).

## Technical debt

- Мёртвый код механизма до этапа 2 (PM-задача). Кадр паритета settings-gap-005 («пробный доступ активен», dev-подмена) больше недостижим — строку снимаем с паритета, сообщить Макетам и Сверке.

## Verification

- Тесты механизма и сторож D186.
- Сверка: новичок после онбординга — без окна «Бонус на старт»; в Настройках нет строки о 72 ч; журнал `[INTRO-REMOVED]`.

## Rollback

`git revert` коммита (поставить `INTRO_FULL_ACCESS_REMOVED = false`).
