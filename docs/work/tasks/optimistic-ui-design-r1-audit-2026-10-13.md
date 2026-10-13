# Task packet: аудит мгновенного отклика (правило №10) — зона Дизайна, R1, 13.10

Governance-ID: TG-1A795F0251B2
Governance-ID: TG-77FED0458FF9
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по команде координатора
Related epic/enabler: OPTIMISTIC_UI_AUDIT_R1.md, R1_CARDS_/R1_DIALOGS_/R1_HOME_LESSONS_OPTIMISTIC_UI.md (12.10), OPTIMISTIC_UI_CORE_/AUTH_R1_2026-10-13.md

## Outcome

Единая таблица docs/phraseman-2.0/OPTIMISTIC_UI_DESIGN_R1_2026-10-13.md по зоне Дизайна (Карточки, Диалоги — клиент, Видео, Главная): каждое действие по пяти критериям (а–д), доказательство в коде на HEAD, что исправлено с 12.10, что осознанно «ждём сервер» (деньги, удаление, публикация). Найденные дыры чинятся (лог + тест) в том же проходе; пункт бэклога «шкала f.label 14 vs D139» записан в R1_PERF_FIRST_FRAME.md.

## Scope

In scope: чтение кода зоны, перепроверка защит прошлых аудитов на HEAD, документ, бэклог f.label, правки только для найденных дыр.

Out of scope: зоны Ядра/Авторизации (ссылки), деньги и удаление (только б/в/г), правка ~65 мест `f.label` (после R1 по решению координатора).

## Architecture

No architecture change.

## Security and privacy

Не затрагивает данные и права.

## Technical debt

Contain: открытые пункты E1/E5/E9 из прошлых аудитов остаются осознанными исключениями (публикация, лайк без замка, итог диалога).

## Verification

Каждая строка таблицы — файл и защита (имя ref/функции), проверенные grep по HEAD; тесты на новые правки.

## Rollback

git revert коммита документа.
