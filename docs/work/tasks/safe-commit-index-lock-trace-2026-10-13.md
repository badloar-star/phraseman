# Task packet: кто в цепочке git commit берёт общий .git/index.lock при временном индексе (safe_commit)

Governance-ID: TG-E856CCCDCCD2
Status: Done
Owner: Ядро (сессия 1)
Related: координатор 13.10 — у Сверки safe_commit падает на `git commit` rc=128 «Unable to create .git/index.lock: File exists»

## Outcome

Трассировка GIT_TRACE хуков pre-commit при GIT_INDEX_FILE=временный: найти процесс, который берёт ОБЩИЙ .git/index.lock.
В safe_commit: при rc=128 с «index.lock» ждать освобождения до 180 с (10×18 с), снимая брошенный пустой замок по правилу
60 с + нет git.exe старше 60 с.

## Scope

In scope: трасса в scratchpad, scripts/safe_commit.sh(.new), tests/safe_commit_script_contract.test.ts. Out of scope: правка
хуков без согласования (сторожа общие для всех сессий).

## Architecture

No architecture change.

## Security and privacy

Не касается данных; трасса содержит только команды git и пути.

## Technical debt

- Если виноват хук, исправление хука — отдельной правкой со сторожем.

## Verification

GIT_TRACE в файл; строка с index.lock и командой процесса. Сценарий сторожа на ожидание после rc=128.

## Rollback

Откат коммита.
