# Инструкция Сверке: восстановление/переустановка и dev-принуждение гейтов (поручение координатора 05.11 00:30)

Governance-ID: TG-31336FD14622
Status: Готово к передаче
Owner: «5 · ВХОД»

## Outcome

Готовая пошаговая инструкция E2E для сценариев ж/з (переустановка в тот же аккаунт, прогресс es/fr/de/it) и список параметров dev-принудительного включения гейтов.

## Scope

`docs/work/release/E2E_NEWBIE_RESTORE_STEPS_2026-11-05.md`. Код не меняется.

## Architecture

Опирается на `app/first_lesson_bonus.ts`, `app/rank_gates_new_user.ts`, `app/remote_flags.ts` (dev-принуждение), `app/cloud_sync.ts` (ключи прогресса), `functions/src/level_spin_star_grant.ts` (идемпотентность по operationId).

## Security and privacy

Тестовые аккаунты создаёт Сверка на эмуляторе; боевой Пульт не трогается.

## Technical debt

Прогресс es/fr/de/it после входа на новом устройстве проверяется только после серверной выкладки (02:00).

## Verification

Читается Сверкой при прогоне; ожидаемые значения сверены с кодом.

## Rollback

Удалить документ.
