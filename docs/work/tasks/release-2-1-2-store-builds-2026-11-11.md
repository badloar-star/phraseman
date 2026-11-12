# Task packet: сборки 2.1.2 (152) в сторы из среза 23:50

Governance-ID: TG-6D246946B747
Status: In progress
Owner: сессия выпуска (dddfe5c6), контроль — координатор «Проверка сессий и коммитов»
Related epic/enabler: none

## Outcome

Android production AAB и iOS production с автоотправкой в App Store Connect, версия 2.1.2 (152), собраны из ревизии ace80f603 (срез 23:50 по слову владельца). Успех: обе сборки в EAS в статусе FINISHED, отправка iOS прошла.

## Scope

In scope: временный скрипт запуска во временной папке сессии (снимок ревизии без создания веток), запуск сборок EAS.
Out of scope: отправка Android в Google Play (нужно слово владельца), выкладка сервера (ведёт координатор), правка scripts/eas_build_from_head.sh в репозитории.

## Architecture

No architecture change: код приложения не меняется. Снимок делается через init + fetch одной ревизии + detached checkout, потому что глобальный перехватчик git запрещает создание refs/heads, а clone их создаёт.

## Security and privacy

Ключей и секретов не трогаем; EAS берёт их из своего хранилища. Новых данных не собирается.

## Technical debt

- Contain: scripts/eas_build_from_head.sh падает на перехватчике веток (git clone создаёт ветку). Владелец — координатор; исправить скрипт на detached-снимок после выпуска, до следующей сборки.

## Verification

Строки [EAS-DET] в журнале запуска: HEAD снимка = ace80f603, веток 0, app.json 2.1.2/2.1.2/152/152, грязных путей 0; ссылки EAS на обе сборки; список сборок EAS показывает 2.1.2/152.

## Rollback

До загрузки в EAS ничего не выкладывается. После: сборку не выпускать в магазине (iOS остаётся в App Store Connect без отправки на проверку, Android не отправляется в Google Play).
