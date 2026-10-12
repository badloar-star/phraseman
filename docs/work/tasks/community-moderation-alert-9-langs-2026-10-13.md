# Task packet: окно решения модерации набора — все 9 языков интерфейса

Governance-ID: TG-34825B487BC8
Governance-ID: TG-1896A6E3BE24
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по команде координатора (дефект перевода из аудита Авторизации a62d6bb0d)
Related epic/enabler: app/notification_lang.ts (resolveNotificationLang), правило владельца «сперва логи»

## Outcome

Окно «Твой набор одобрен / отклонён / нужна доработка / снят с продажи» показывается на языке интерфейса человека: ru, uk, en, es, pt-BR, vi, id, tr, pl. Раньше выбирались только ru/uk/es, остальные шесть видели русский. Чтение языка не глотает ошибку молча: причина в журнале, запасной язык — по устройству (как у пушей).

## Scope

In scope: app/community_packs/communityModerationAlerts.ts (язык через resolveNotificationLang, журнал в catch, тексты берутся из нового модуля), новый чистый модуль app/community_packs/community_moderation_copy.ts (заголовки, кнопка, тело окна на 9 языков), тест «все 9 языков дают свой текст».

Out of scope: сервер (текст окна строится на клиенте), заголовки наборов в событии (titleRu/titleUk/titleEs остаются), формулировки модератора (message — как написал модератор).

## Architecture

Тексты вынесены в чистый модуль без побочных импортов, чтобы тест проверял их без Firebase/AsyncStorage. Язык — `resolveNotificationLang(stored, 'community_moderation_alert')`. Порядок выбора заголовка набора не меняется.

## Security and privacy

Данные не меняются; в журнал идёт только причина ошибки чтения языка.

## Technical debt

Pay now: убран немой catch и узкий разбор языка. Тексты на 6 новых языков написаны Дизайном — если у Ядра есть утверждённые строки модерации, заменить в одном месте (новый модуль).

## Verification

jest-тест на 9 языков (свой текст, не русский для не-ru/uk, все 5 результатов, кнопка, тело с комментарием и без); синтаксис файлов; существующий тест gustav_community_pack_target_gate (строка fetchCommunityPackMeta сохранена).

## Rollback

git revert коммита.
