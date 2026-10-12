# Task packet: заготовка «вырезать Learning V2 из R1» (патч + описание, НЕ накладывать)

Governance-ID: TG-1F78F1AF5E9F
Status: Done (заготовка; наложение — только по решению владельца)
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10)
Related epic/enabler: выпуск R1 в сторы 17.10; docs/phraseman-2.0/RELEASE_PRECHECK_STATUS_2026-10-12.md

## Outcome

`docs/phraseman-2.0/handoff/r1_cut_learning_v2.patch` + `.md`: (1) где Learning V2 доступен пользователю в R1 и как
скрыть; (2) как законно исключить два V2-гейта precheck флагом выпуска (доказательный пропуск в стор-режиме), а не
отключением проверки, и что проверяется вместо них; (3) `git apply --check` — ОК. Рабочее дерево не меняется.

## Scope

In scope: патч-файл и описание в handoff/, проверка на выгрузке HEAD во временной папке.
Out of scope: наложение патча; файлы Codex (Learning V2: modules/learning-v2/**, content/learning-v2-course/**, плеер).

## Architecture

Механизм уже есть в коде (store_release_surface.mjs → learningV2StoreSkipDecision, announceLearningV2StoreSkip);
патч возвращает вырез маршрутов V2 в стор-ветку router.ctx.js и закрывает вход на «Уроках» флагом IS_STORE_RELEASE.

## Security and privacy

Не затрагивает данные. Вырезание экранов уменьшает поверхность стор-сборки.

## Technical debt

- Contain: фоновые задачи V2 в app/_layout.tsx в патч не входят (описаны как опция).

## Verification

Выгрузка HEAD + патч: пропуск V2-гейтов в стор-режиме = `learning_v2_excluded_from_store`, вне стор-режима — строго;
сторож переходов — 0 дыр; node-тесты: те же 19/2, что у выгрузки без патча (2 падения — неполная копия, в репозитории 16/0);
регулярки jest-тестов сверены с пропатченными файлами скриптом.

## Rollback

Документы; патч не наложен.
