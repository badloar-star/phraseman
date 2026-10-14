# Task packet: dev-подмена «Обучение» для кадра settings-gap-034 — Автопроверка вкл, скорость 1,0x (координатор 14.10)

Governance-ID: TG-70AE05C0DBEF
Status: Модуль готов; подключение — после WINBACK-репро и коммитов Ядра/Дизайна в app/dev_state_fixtures.ts (окно 18:30)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Кадр settings-gap-034 («Обучение — выбранный голос озвучки») расходится с образцом по данным эмулятора: «Автопроверка» выключена (в образце включена), скорость 0,9x (в образце 1,0x).

Нужна dev-ссылка `dev_state?edu=parity`: в памяти процесса «Автопроверка» = вкл и скорость = 1,0 для показа. В хранилище не пишется, облака нет; в стор-сборке подмена отклоняется.

## Scope

In scope:
- новый `app/dev_edu_settings.ts`;
- одна вставка в `getUserSettingsSnapshot` (`app/user_settings_store.ts`) — подмешать подмену только в dev;
- одна строка параметра `edu` в `app/dev_state_fixtures.ts` (после коммитов Ядра и Дизайна);
- строка DEV_LINKS settings-gap-034.

Out of scope: сохранение настроек, облако, сам экран.

## Architecture

Модуль хранит `{ active }` в памяти. `devEduSettingsOverlay(settings)` возвращает копию с `autoCheck: true, speechRate: 1` при `__DEV__ && !IS_STORE_RELEASE && active`. `getUserSettingsSnapshot` прогоняет `memory` через неё. Изменение пользователем в dev-сеансе сохраняется в хранилище как обычно, но показ остаётся подменённым до перезапуска; это dev-ограничение, оно записано в лог.

## Security and privacy

Только dev, только память.

## Technical debt

- Подмена перекрывает и ручное изменение в том же dev-сеансе. Перезапуск сбрасывает.

## Verification

- Ссылка `…&edu=parity&next=/settings_edu` — Автопроверка вкл, 1,0x.
- Без параметра — как раньше.
- Тесты user_settings_store зелёные.

## Rollback

`git revert` коммита.
