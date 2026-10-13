# Task packet: pre-push гейт «[release-gate] FAILED: TypeScript» — разбор и починка (координатор 13.10 ~18:55, срочно до 19:30)

Governance-ID: TG-35F6722749C4
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

`git push origin feature/referral-roulette` отклонён хуком pre-push: `scripts/update_release_gate.mjs --hook=pre-push`, шаг TypeScript = `npx tsc --noEmit` без поднятого лимита памяти. В выводе стек v8.

Шаг 1 — факт: тот же tsc с лимитом 12288 МБ (как `npm run typecheck`). Если чисто — причина в нехватке памяти. Если есть ошибки — список: наши чиним, чужие (Codex/LV2) — координатору.

Шаг 2:
- нехватка памяти — гейт запускает TypeScript с `--max-old-space-size=12288`, как `npm run typecheck`;
- реальные ошибки — по факту.

Цель — push без `--no-verify`.

## Scope

In scope:
- `scripts/update_release_gate.mjs` — запуск шага TypeScript с поднятым лимитом;
- наши ошибки типов, если найдутся.

Out of scope: чужие ошибки типов (список координатору), lint-шаг, сам push.

## Architecture

В `run()` — необязательный `env` для spawnSync. Шагу TypeScript передаётся `NODE_OPTIONS` с `--max-old-space-size=12288`; уже заданный пользователем `NODE_OPTIONS` сохраняется. Лог `[release-gate] TypeScript NODE_OPTIONS=…`.

## Security and privacy

Только локальный скрипт проверки; данных нет.

## Technical debt

- 12 ГБ на tsc — следствие размера репозитория (тот же лимит в `typecheck`, `test:one`). Если репозиторий вырастет, лимит придётся поднимать снова.
- Лимит задан в двух местах (package.json и гейт). Вынести в одно место — после R1.

## Verification

- tsc с лимитом: код возврата и число ошибок.
- `node scripts/update_release_gate.mjs --dry-run` — команда видна.
- Push координатор выполняет сам.

## Rollback

`git revert` коммита.
