# Task packet: Шпиль — замок вкладки и главный экран (пакеты A и C)

Governance-ID: TG-B7F5AE4FF733
Governance-ID: TG-A90889E38080
Status: In progress
Owner: сессия «Шпиль, пакеты A и C»
Related epic/enabler: план C:\Temp\spire_plan.md, PM-278/PM-283 (Шпиль)

## Outcome

Третий раздел «Шпиль» в «Сообществе» (Друзья / Шпиль / Наборы), невидимый для игроков по умолчанию, и главный экран Шпиля по макету spire.html (башня 15 этажей, маркер, пьедестал, «Все участники», кнопка «Подняться») на реальных данных. Успех: раздел скрыт без remote-ключа и dev-переключателя; при config.enabled=false экран показывает «Шпиль откроется чуть позже» и не вызывает сервер.

## Scope

In scope: app/spire_tab_flag.ts, app/tab_page_model.ts (+'spire'), app/(tabs)/community.tsx (условный сегмент), components/spire/*, tests/spire_tab_gate_source_contract.test.mjs, tests/tab_page_model.test.ts.

Out of scope: вызов комнаты недели и загрузка пакета недели (пакет B), сама игра-ступень (пакет D), тур и празднования (пакет E), Главная и хаб «Карточки», settings.tsx, серверные флаги.

## Architecture

No architecture change: новый раздел подключается через существующий SUB_RUNTIME_OWNER_IDS и ленивый require, флаг читает уже кэшированный remote_config_cache_v1 (как friends_together/together_config.ts), второй замок — существующий loadSpireConfig с кэшем 6 часов. Новых чтений Firestore нет.

## Security and privacy

Новых данных не собираем и не отправляем: экран читает локальную неделю и кэш конфига. Имена/аватары участников комнаты пока не показываются (нет источника). Перед пакетом B (чтение комнаты) проверить Privacy Policy.

## Technical debt

Accept temporarily: пьедестал, «Все участники» и «Друзья на этой неделе» нарисованы как компоненты, но данных для них пока нет (пакет B); они показывают «—». Exit: пакет B.

## Verification

node --test tests/spire_tab_gate_source_contract.test.mjs; npx jest --runTestsByPath tests/tab_page_model.test.ts --runInBand --watchman=false. Нативно не проверялось.

## Rollback

Не выдавать remote-ключ spire_tab_enabled; удалить сегмент — вкладка возвращается к двум разделам без потери данных.
