# Task packet: робот пакетной съёмки сверки (parity_batch_shoot)

Governance-ID: TG-9BF2E510C8C8
Status: Done
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10)
Related epic/enabler: docs/phraseman-2.0/DEV_LINKS_R1.md, scripts/parity_shot.mjs, docs/phraseman-2.0/registries/visual_parity.json

## Outcome

`scripts/parity_batch_shoot.mjs`: по списку id (или «все с готовой ссылкой и status pending») на эмуляторе — force-stop → запуск ссылки из DEV_LINKS_R1.md → ожидание маркера готовности `[DEV-STATE] route: replace вызван` в logcat (потолок 20 с; для ссылок с `vip=`/`plan=` второй force-stop и повторный запуск) → пауза 1,5 с → `screencap` в `docs/phraseman-2.0/evidence/parity/<id>.png` → строка в журнал прогона (id, время, ok|timeout|error).

## Scope

In scope: новый скрипт, режим `--dry-run` (печать команд без adb), тест на сухой прогон и разбор ссылок.
Out of scope: запись в реестр (evidence пишут Макеты/Сверка), запуск на эмуляторе (запускает Сверка), правка DEV_LINKS_R1.md, состояния «тапами» (по умолчанию пропускаются, `--with-taps` включает).

## Architecture

No architecture change: отдельный node-скрипт поверх adb; реестр открывается только на чтение.

## Security and privacy

Только локальный эмулятор и файлы в репозитории; ссылки берутся из нашего документа и проверяются на кавычки перед подстановкой в shell устройства; пароли не вводятся.

## Technical debt

Pay now: съёмка по одному кадру руками (devshot.sh) тратит ~1 минуту на кадр.

## Verification

Тест `tests/parity_batch_shoot_dry_run.test.ts` запускает `--dry-run` и проверяет команды, разбор строк документа, пропуски (нет ссылки / тапы), перезапуск при vip/plan.

## Rollback

Откат коммита.
