# Task packet: включить истории всем игрокам скриптом (флаг `stories_v1`)

Governance-ID: TG-6F5C847BC5C7
Status: In progress
Owner: сессия Claude «аудит всплывающих окон», 2026-11-11
Related epic/enabler: `stories-instead-of-modals-step2d-welcome-first-dialog-2026-11-11.md`

## Outcome

Владелец 11.11 (кнопкой, затем словами): «Включить всем сейчас» → «Включи скриптом». Флаг
`remote_config/app.bools.stories_v1` становится `true`: у игроков появляется кольцо историй у монеты.

Владелец предупреждён до команды: в сборках у игроков кадров «вместо окон» ещё нет и просмотр историй там старый
(починки зависания и паузы — только в рабочей ветке).

## Scope

In scope:
- `scripts/stories_enable_prod.mjs` — новый скрипт: dry-run по умолчанию, `--apply` пишет, `--disable --apply` откатывает.

Out of scope:
- выключатель в админке (`admin/v2/legacy.html`) — владелец выбрал скрипт;
- любые другие ключи удалённой настройки — скрипт меняет ровно один булев ключ.

## Architecture

Образец — `scripts/spire_enable_prod.mjs`, шаг публикации флага вкладки. Тот же код слияния и проверки, что у
серверной функции публикации настройки (импорт из `functions/src/admin_remote_config.ts`), без копирования логики:
ревизия +1, запись в `remote_config_history`, `admin_log`, операция идемпотентности. Проверка ожидаемой ревизии внутри
транзакции — чужая параллельная публикация не затирается.

## Security and privacy

Ключей в коде нет: вход через ADC владельца. Пользовательских данных скрипт не читает и не пишет.

## Technical debt

- Accept temporarily: выключателя в админке для `stories_v1` нет — флаг меняется скриптом.

## Verification

Dry-run (чтение и план) → `--apply` → чтение обратно: `stories_v1 === true`, ревизия выросла на 1.

## Rollback

`npx tsx scripts/stories_enable_prod.mjs --disable --apply` — флаг снова `false`, новая ревизия, запись в журнале.
