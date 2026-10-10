# Task packet: скрипт базы храповика цветов по HEAD

Governance-ID: TG-59D6BD78E738
Status: In progress
Owner: сессия «2 · Дизайн» (поручение координатора 10.10 20:22)
Related epic/enabler: theme-colors-audit-2026-10-10.md

## Outcome

Скрипт пересчёта базы храповика цветов каждый раз берёт свежий снимок HEAD в пустую временную папку и не пишет базу в рабочую копию без явного флага.

## Scope

In scope: scripts/theme_colors_baseline_head.mjs (новый), переходник C:/Temp/claude/colors/headbase.mjs.
Out of scope: сам храповик, продуктовый код.

## Architecture

git archive HEAD (app, components, modules, constants) → mkdtemp → scanHardcodedColors → печать итога; запись базы только с --write.

## Security and privacy

Не затрагивает данные.

## Technical debt

Pay down: убирает залипший снимок headtree, дававший неверную базу.

## Verification

Запуск без флага не меняет файл; запуск с --write даёт число, равное счёту по чистому HEAD.

## Rollback

Удалить скрипт, git revert.
