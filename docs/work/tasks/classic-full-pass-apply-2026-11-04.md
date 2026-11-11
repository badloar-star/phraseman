# Task packet: применение результатов полного прохода классических курсов (ru/uk)

Governance-ID: TG-E5C71089737E
Status: In progress
Owner: 10 · ПЕРЕВОДЧИК
Related epic/enabler: полный проход всех фраз (координатор, 04.11)

## Outcome

Результаты полного прохода (docs/work/classic_audit_full_2026_11_04/results_*.json, поля ru/uk) применены в слой фиксов docs/work/classic_translation_fixes_2026_11_04.json по языкам, пятью коммитами до 00:30. Успех: счётчики скрипта сходятся, JSON читается, target/tiles/alternatives в слой не попадают.

## Scope

In scope: docs/work/classic_audit_apply_results.mjs (фильтр по языку), docs/work/classic_translation_fixes_2026_11_04.json (ru/uk записи).
Out of scope: target, tiles, alternatives (зона Теории), модули курса, код приложения.

## Architecture

No architecture change: данные-слой для конвертера, код приложения не меняется.

## Security and privacy

Не затрагивается: персональных данных нет, сеть не используется.

## Technical debt

Contain: записи фрагментов (меньше 3 слов) пропускаются скриптом и докидываются вручную по problem и контексту. Выход — ручная проверка до заморозки 01:00.

## Verification

`node docs/work/classic_audit_apply_results.mjs <lang>` печатает счётчики; JSON читается; коммит через safe_commit с --expect.

## Rollback

`git revert` коммитов по языкам; слой фиксов возвращается к версии до применения.
