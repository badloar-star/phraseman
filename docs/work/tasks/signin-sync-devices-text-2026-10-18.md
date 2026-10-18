# Task packet: окно входа — «Прогресс будет на всех твоих устройствах» вместо «синхронизируется» (координатор)

Governance-ID: TG-60889691FBD3
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: R07

## Outcome

В обычном окне входа (`components/RegistrationPromptModal.tsx`, контекст по умолчанию) строка «Быстрый вход. Прогресс синхронизируется между устройствами.» заменена на «Быстрый вход. Прогресс будет на всех твоих устройствах.» на 9 языках — без технического «синхронизируется».

## Scope

In scope: 9 строк текста в `RegistrationPromptModal.tsx`. В файле сейчас чужие незакоммиченные правки (окно входа по auth-states.html) — коммит только моих хунков через `--patch`.

Out of scope: логика и вёрстка окна входа.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Чужие правки в том же файле — Accept: коммит только моих хунков, чужие остаются в рабочем дереве у владельца.

## Verification

- патч строится от HEAD, `git apply --cached --check`; `git show --stat` после коммита.

## Rollback

`git revert <коммит>`.
