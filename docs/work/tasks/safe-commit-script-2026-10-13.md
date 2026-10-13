# Task packet: общий безопасный скрипт коммита scripts/safe_commit.sh

Governance-ID: TG-E77336B09B2B
Status: Done
Owner: Ядро (сессия 1)
Related: координатор 13.10 (п. 2 задания); память feedback_shared_file_numstat_must_be_explained_2026-10-12

## Outcome

scripts/safe_commit.sh: общий замок git_commit.lock, временный индекс от HEAD внутри замка, только перечисленные пути и/или
хунки из patch-файлов, сверка numstat с --expect В МОМЕНТ КОММИТА (отказ при расхождении), окно кода :00–:05/:30–:35,
повтор при падении git, синхронизация общего индекса по своим путям с повторами, строка [SAFE-COMMIT] на каждой ветке.

## Scope

In scope: scripts/safe_commit.sh, tests/safe_commit_script_contract.test.ts. Out of scope: перевод сессий на скрипт (раздаёт координатор).

## Architecture

No architecture change.

## Security and privacy

Не касается данных; скрипт не снимает чужие непустые index.lock и не делает stash/worktree/ветки.

## Technical debt

- Переименования не поддержаны (numstat --no-renames: удаление + добавление, оба пути нужно ожидать).

## Verification

tests/safe_commit_script_contract.test.ts — 6 живых сценариев во временном репозитории (6/6 PASS 13.10).

## Rollback

Откат коммита; сессии возвращаются к своим commit-скриптам.
