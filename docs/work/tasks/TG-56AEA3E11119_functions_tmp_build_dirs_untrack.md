# Task packet: убрать из git две временные папки серверной сборки

Governance-ID: TG-56AEA3E11119
Status: In progress
Owner: сессия Claude «аудит мёртвого груза», по команде владельца «Да, удаляй» (11.11.2026)
Related epic/enabler: docs/reports/APP_DEAD_WEIGHT_AUDIT_2026-11-11.md, раздел 8

## Outcome

`functions/lib_preview_tmp` (1 321 файл, 11,7 МБ) и `functions/lib_audit_tmp` (790 файлов, 9,1 МБ) перестают храниться в git.
Это скомпилированный вывод сборки, попавший в репозиторий коммитом-«сохранением» f11d29db6; обе папки уже стоят в `.gitignore`.
Мера успеха: `git ls-files` по обеим папкам возвращает 0.

## Scope

In scope: снятие с учёта git (`git rm -r --cached`) двух папок. Копии на диске не трогаются — ими может пользоваться соседняя сессия.

Out of scope: `.gitignore`, `scripts/guard_mass_deletion.mjs`, любой исходный код, остальные остатки курса из раздела 8 отчёта.

## Architecture

No architecture change: исходники, сборка и деплой не меняются; папки не входят ни в `firebase.json`, ни в `package.json`, ни в tsconfig.

## Security and privacy

Не применимо: данные, авторизация, секреты, разрешения не затрагиваются. Privacy Policy править не нужно.

## Technical debt

- Pay now: 2 111 закоммиченных файлов временной сборки.
- Accept temporarily: копии на диске остаются (игнорируются git) — удаляются вручную, когда никому не нужны.

## Verification

- Поиск имён папок по закоммиченному коду: ссылки только в `.gitignore` и в списке игнорирования сторожа массового удаления.
- После коммита `git ls-files functions/lib_preview_tmp functions/lib_audit_tmp` — 0 строк.
- Сторожа pre-commit; сторож массового удаления проходится с разрешением владельца (`PHRASEMAN_ALLOW_MASS_DELETION=1`), сам сторож не меняется.

## Rollback

`git revert <коммит>` — файлы возвращаются в git; пользовательские данные не затрагиваются.
