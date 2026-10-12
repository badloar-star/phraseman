# Task packet: робот — режим --stitch-only, проверка Metro, красные экраны

Governance-ID: TG-775E8A01F94A
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: scripts/parity_batch_shoot.mjs, scripts/parity_shot.mjs, docs/phraseman-2.0/evidence/parity/

## Outcome

1. `--stitch-only <ids>` / `--stitch-only-recent=<минуты>`: уже лежащие голые кадры 1080×2400 в evidence переносятся в `_runs` как bare, а на их место кладётся склейка «образец | приложение» через parity_shot (без эмулятора, параллельно съёмке). Запуск по 16 id от Сверки (cards-006/007/008/010/012/013/014/015/016/017/034/035/037/045/046/048).
2. Перед каждым id проверка Metro (`/status` = running, ожидание до 120 с); после кадра распознавание красного экрана по `uiautomator dump`: «Unable to load script» → metro_down, «Render Error» и др. → redbox, зависшее «DEV-STATE…» → fixture_hang; такие кадры только в `_runs`, id повторяется в конце прогона.

## Scope

In scope: `scripts/parity_batch_shoot.mjs`, новый модуль проверок `scripts/parity_health.mjs`, тесты на подставных adb/Metro/PNG.
Out of scope: правка приложения и реестра; пересъёмка cards-007 на эмуляторе (делает Сверка).

## Architecture

No architecture change: те же скрипты, дополнительные проверки; реестр не пишется.

## Security and privacy

Только локальные адреса (127.0.0.1) и файлы репозитория.

## Technical debt

Pay now: голые кадры и кадры красных экранов съедают круги сверки.

## Verification

Тесты: stitch-only на подставных PNG (голый → склейка, уже склейка пропускается, склейка не удалась → голый остаётся), Metro выключен → metro_down, красный экран → redbox + повтор в конце.

## Rollback

Откат коммита.
