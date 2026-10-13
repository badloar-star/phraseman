# Task packet: синтаксический сторож — pre-commit (staged) + скрипт «рабочее дерево» для Сверки/сторожа Metro

Governance-ID: TG-33BE872515DA
Status: In progress
Owner: Ядро (сессия 1)
Related: инцидент 13.10 ~15:4x — в SpireHomeScreen.tsx комментарий «// зачем…» встал в одну строку с кодом и съел «: null),»
→ SyntaxError, красный экран Шпиля, робот Сверки на паузе. Поручение координатора.

## Outcome

- scripts/syntax_check.mjs — быстрый СИНТАКСИЧЕСКИЙ разбор (@babel/parser, без tsc и без типов; <1–2 с, мало памяти):
  - `--staged` — только staged .ts/.tsx/.js/.jsx/.mjs/.cjs, содержимое берётся ИЗ ИНДЕКСА (`git cat-file --batch`), то есть ровно то,
    что уйдёт в коммит (работает и с временным индексом safe_commit через GIT_INDEX_FILE);
  - `--worktree` — изменённые и новые файлы рабочего дерева (для Сверки/сторожа Metro перед пачкой кадров);
  - `--files a b …` — заданные файлы.
  Ошибка → `[SYNTAX] файл:строка:столбец сообщение`, выход 1. Журнал: сколько файлов, сколько мс.
- pre-commit (scripts/install-git-hooks.mjs): шаг `node scripts/syntax_check.mjs --staged` сразу после сканера секретов;
  safe_commit запускает pre-commit явно с временным индексом — отказ до commit-tree.
- Тест: «комментарий съел хвост выражения» ловится с номером строки; валидный TS/TSX/JS проходит; .ts с `<T>x` не считается JSX.

## Scope

In scope: scripts/syntax_check.mjs, scripts/install-git-hooks.mjs (шаг), тест. Out of scope: проверка типов (tsc), lint.

## Architecture

No architecture change.

## Security and privacy

Локальный инструмент: читает файлы репозитория, ничего не отправляет.

## Technical debt

- Парсер Babel чуть мягче/строже TypeScript в редких конструкциях; при ложном срабатывании — поправить набор плагинов, а не
  выключать шаг.

## Verification

node --test тест; ручной прогон --staged на коммите; замер времени.

## Rollback

Откат коммита и `node scripts/install-git-hooks.mjs` (перезапишет pre-commit без шага).
