# Task packet: ворота Learning V2 пропускаются в стор-сборке — патч для Codex и сторож

Governance-ID: TG-39F53AAD631A
Status: In progress
Owner: 1 · ЯДРО
Related epic/enabler: релизный пол Learning V2 (store_release_surface.mjs, 160a1edda), координатор 00:12

## Outcome

Сборка EAS не падает на воротах Learning V2, которых в стор-сборке нет: ворота `learning_v2_release_parity_gate`
(Codex, файл не отслеживается git) получают тот же пропуск в стор-режиме, что и ворота озвучки V2. Сам файл Codex
не правлю — готовый патч `docs/work/tasks/learning-v2-gate-store-skip.patch` + инструкция в INBOX. Сторож в
`tests/store_release_gate_levers.test.mjs`: каждый шаг `eas-build-post-install` и `release:precheck`, связанный с
Learning V2, обязан пропускаться в стор-режиме через `announceLearningV2StoreSkip` — иначе тест красный.

## Scope

In scope: патч-файл, сторож в моём тесте рычагов, INBOX; проверка «в остальных 9 языках — «ты»» (отдельно, отчёт).
Out of scope: правка `scripts/learning_v2_release_parity_gate.mjs` и `package.json` строк Codex.

## Architecture

No architecture change: тот же помощник `scripts/store_release_surface.mjs` (пропуск только при доказанном вырезании
маршрутов LV2 регуляркой `router.ctx.js`).

## Security and privacy

Нет влияния.

## Technical debt

Contain: пока Codex не применил патч, сторож красный на рабочей копии (там ворота уже в post-install) — это
намеренный сигнал; на HEAD зелёный.

## Verification

`git apply --check` патча на текущий файл (без применения); прогон ворот с патчем во временной копии в стор-режиме
— код 0 и строка пропуска; `node --test tests/store_release_gate_levers.test.mjs`.

## Rollback

`git revert` сторожа; патч — просто файл.
