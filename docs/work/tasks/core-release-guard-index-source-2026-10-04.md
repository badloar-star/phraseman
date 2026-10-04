# Task packet: сторож выпуска сессий Learning V2 читает индекс/HEAD, а не рабочую копию

Governance-ID: TG-2D2D4C7E51F4
Status: Done
Owner: сессия 1 · ЯДРО (срочно, координатор 04.10)
Related epic/enabler: инфраструктура pre-commit (scripts/guard_learning_v2_session_release.mjs)

## Outcome

Чужая незаконченная правка в рабочей копии больше не блокирует коммиты всех сессий: в pre-commit
сторож проверяет то, что реально уходит в коммит (индекс), а если файла в коммите нет — версию из HEAD.
Коммиты, которые действительно меняют охраняемый файл, проверяются полностью, как раньше.

## Scope

In scope: scripts/guard_learning_v2_session_release.mjs (источник содержимого), тест на оба случая.
Out of scope: сама охраняемая логика Learning V2 (зона Codex), правила проверки.

## Architecture

Источник содержимого: pre-commit → `git show :<path>` если путь в `git diff --cached --name-only`,
иначе `git show HEAD:<path>`; вне pre-commit (ручной запуск) — диск, как раньше. Лог на каждое решение
`[RELEASE-GUARD] source=index|head|disk path=… result=…`.

## Security and privacy

Нет данных. Сторож не ослабляется для изменяющих коммитов.

## Technical debt

Нет нового долга.

## Verification

node --test / jest для нового теста; ручной запуск сторожа в обоих режимах.

## Rollback

git revert — сторож снова читает рабочую копию.
