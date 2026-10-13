# Task packet: safe_commit.sh — брошенный index.lock снимается через 60 с, синхронизация ждёт до 180 с

Governance-ID: TG-D760785C64C0
Status: Done
Owner: Ядро (сессия 1)
Related: координатор 13.10 (опыт Дизайна 3956faba6: синхронизация ждала ~100 с и выходила с WARN, а замок снимался только после 120 с)

## Outcome

Пустой .git/index.lock старше 60 с снимается, только если нет ни одного процесса git.exe старше 60 с (так же работает сторож
координатора; проверка через powershell). Синхронизация общего индекса ждёт до 180 с. Каждое решение пишется строкой [SAFE-COMMIT].

## Scope

In scope: scripts/safe_commit.sh, tests/safe_commit_script_contract.test.ts. Out of scope: сторож координатора.

## Architecture

No architecture change.

## Security and privacy

Не касается данных. Непустой index.lock и замок при живом git старше 60 с не трогаются.

## Technical debt

- Проверка процессов работает только в Windows; без powershell считается, что живого git нет (пишется в журнал).

## Verification

Тест-сторож: брошенный пустой замок 90 с при отключённой проверке процессов снимается, общий индекс синхронизируется.

## Rollback

Откат коммита.
