# Task packet: убрать лишнюю зависимость PM-272 → PM-271

Governance-ID: TG-38C55BA3DEA5

## Outcome
PM-272 (сборка недельного пакета) зависит от PM-271 (черновик контракта данных). PM-271 никогда не перейдёт в review/done сама по себе — это была «дизайн»-задача, чьё содержание реализовано дочерними задачами (PM-272/273/275/277/283), а сама она осталась в planned после решения D56. Формальная зависимость блокирует граф навсегда. Убрать зависимость PM-272 → PM-271, оставить только PM-272 → PM-285.

## Scope
In scope: registries/tasks.json, поле depends_on задачи PM-272.
Out of scope: сам код PM-272 (не пишу в этом ходу).

## Architecture
Без изменений — только граф зависимостей документации.

## Security and privacy
Нет.

## Technical debt
Нет нового — устраняет существующий.

## Verification
python tools/validate.py PASS после правки.

## Rollback
Вернуть зависимость обратно в registries/tasks.json.
