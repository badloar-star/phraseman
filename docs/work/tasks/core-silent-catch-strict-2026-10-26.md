# Ядро · строгий сторож немых catch в pre-commit (Q63, с 26.10)

Governance-ID: TG-FCBDCF807E6E
Status: In progress
Owner: 1 · ЯДРО (NIGHT_BACKLOG v2 стр. 176/191; решение владельца Q63 «строгий сторож немых catch — с 26.10»,
OWNER_DECISIONS_2026-10-21 стр. 1514)

## Outcome
С 26.10 коммит, в ДОБАВЛЕННЫХ строках которого есть немой catch (без лога с причиной и без throw), отклоняется pre-commit.
Раньше сторож только предупреждал. Старый код не трогается: сторож смотрит только staged-дифф.

## Scope
In scope:
- `scripts/install-git-hooks.mjs` — вызов `guard_silent_catch.mjs --strict` с проверкой кода возврата;
- сторож `tests/silent_catch_strict_precommit_contract.test.mjs`.

Out of scope: переустановка `.git/hooks/pre-commit`. Хук общий для всех сессий, переустановку делает координатор командой
`node scripts/install-git-hooks.mjs`, когда сочтёт момент безопасным.

## Architecture
Блок сторожа в хуке — как у соседних: `node … --strict; status=$?; if [ "$status" -ne 0 ]; then exit "$status"; fi`.

## Security and privacy
Данных не касается.

## Technical debt
Нет нового. Закрывает долг Q63 («предупреждение до слова владельца»).

## Verification
`node --test tests/silent_catch_strict_precommit_contract.test.mjs tests/guard_silent_catch.test.mjs`.

## Rollback
Убрать `--strict` и проверку кода в установщике и переустановить хук.
