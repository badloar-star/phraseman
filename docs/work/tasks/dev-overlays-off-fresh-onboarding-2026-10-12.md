# Task packet: dev-ссылки — onboarding=done как у настоящего новичка, overlays=off, подсказка/плашка «Удалено», нерешённые «нет» Диалогов

Governance-ID: TG-B35DD854F10F
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: app/dev_state_fixtures.ts, app/fresh_install_gate.ts, app/_layout.tsx (рассылки/объявления), store_release_stubs/dev_state/*, scripts/dev_links_r1_generate.py, docs/phraseman-2.0/DEV_LINKS_R1.md, app/flashcards/CollectionGalleryView.tsx

## Outcome

1. `onboarding=done` в dev_state ставит и `onboarding_completed_at_ms_v1` = сейчас; сверка рассылки перезапускается после применения фикстуры — тестовый гость ведёт себя как настоящий новичок.
2. `overlays=off` (только память, только dev): рассылки, объявления и личные сообщения не показываются; добавлен во все ссылки DEV_LINKS, кроме кадров самих окон.
3. cards-006: проверить по коду, бывают ли подсказка «Зажми карточку…» и плашка «Удалено» одновременно; при совпадении — одна нижняя плашка за раз.
4. dialogs-003 / dialogs-005: вывести «нет» без сервера, если возможно.

## Scope

In scope: dev-фикстуры, заглушки стор-сборки, генератор ссылок, подсказка в сетке карточек.
Out of scope: серверные данные, реальные рассылки, поведение для людей (ворота остаются прежними).

## Architecture

No architecture change: ещё один параметр dev_state по уже принятой схеме (память + заглушка для стора); переиспользуются ворота fresh_install_gate.

## Security and privacy

Данных пользователя не касается; в облако ничего не пишется (флаг overlays живёт в памяти; отметка времени — локальный AsyncStorage); в стор-сборке вырезано заглушками.

## Technical debt

Pay now: тестовый гость без отметки сломал два кадра (cards-009, cards-010).

## Verification

Точечные проверки (контракт заглушек стора, фикстур, ссылок), сторож парности экспортов заглушек; тип-проверка не запускается.

## Rollback

Откат коммитов.
