# Task packet: основной скрипт сборки EAS проходит с первой попытки (без git clone)

Governance-ID: TG-45F3B32ACB3D
Status: In progress
Owner: сессия выпуска (dddfe5c6), поручение координатора 12.11 00:3x
Related epic/enabler: none

## Outcome

`scripts/eas_build_from_head.sh` снова запускает production-сборки EAS из ровно одной ревизии и не падает на глобальном перехватчике git, запрещающем новые ветки. Повод: 11.11 23:58 и 12.11 00:17 сборки 2.1.2/152 дважды упали (`git clone` снимка → «creating a new branch is blocked»; затем eas-cli сам клонирует снимок → code 128). Прошёл только путь `scripts/eas_build_novcs.sh` (git archive + `EAS_NO_VCS=1`). Успех: следующая автоматическая сборка проходит этим скриптом с первой попытки.

## Scope

In scope: `scripts/eas_build_from_head.sh` (снимок через `git archive` вместо clone, `EAS_NO_VCS=1`), сторож `tests/release_version_consistency_2026_11_05.test.ts` (новое правило: в скрипте нет `git clone`/`git checkout`, есть `EAS_NO_VCS=1`).
Out of scope: `scripts/eas_build_novcs.sh` (рабочий, не трогаю), eas.json (`requireCommit` остаётся), запуск сборок, push.

## Architecture

Было: clone ревизии во временный git → eas-cli клонирует его ещё раз (requireCommit). Стало: `git archive <ревизия>` в пустую папку + `EAS_NO_VCS=1` — eas-cli не трогает git, ветки нигде не создаются. Интерфейс скрипта (ревизия, `--platform`, `--submit-ios`, `EAS_DRY`) и строки команд сборки (Android без сабмита, iOS с `--auto-submit` только по флагу) не меняются. В сборку попадает ровно закоммиченное, `.easignore` продолжает действовать.

## Security and privacy

Ключи не трогаются — EAS берёт их из своего хранилища. Новых данных нет.

## Technical debt

- Pay now: два скрипта делали одно и то же разными путями; основной приведён к проверенному пути.
- Accept temporarily: `scripts/eas_build_novcs.sh` дублирует логику. Владелец — координатор; свести в один скрипт после следующего выпуска.

## Verification

`node --check`-аналог для bash: `bash -n scripts/eas_build_from_head.sh`; сухой прогон `EAS_DRY=1 bash scripts/eas_build_from_head.sh HEAD` — снимок создаётся, веток не создаётся, сборки не запускаются; `npm run test:one -- tests/release_version_consistency_2026_11_05.test.ts` — зелёный.

## Rollback

`git revert` коммита — вернётся прежний скрипт; рабочий запасной путь `scripts/eas_build_novcs.sh` остаётся в любом случае.
