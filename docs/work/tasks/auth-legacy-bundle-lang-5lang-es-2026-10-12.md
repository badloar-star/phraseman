# Task packet: legacyRuUk / bundleLang — pt-BR/vi/id/tr/pl получают es вместо ru (как en)

Governance-ID: TG-05D9320BF5B7
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (решение координатора 12.10: «legacyRuUk/bundleLang для 5 языков → es, как сделано для en: ДА»)
Related epic/enabler: продолжение 5007ae652 (страховка triLang для 5 языков), I18N_FALLBACK_5LANG_R1.md

## Outcome

Помощники `legacyRuUk(lang)` и `bundleLang(lang)` (constants/i18n.ts) для pt-BR/vi/id/tr/pl возвращали `ru` — словари за ними только
ru/uk/es, en нет. Теперь для этих языков — `es` (латиница, как уже для en), при включённом испанском интерфейсе. Журнал
`[I18N-FALLBACK] legacyRuUk|bundleLang lang=…→es` раз на помощник и язык, только в dev. Затронуто 8 вызовов: колоды Карточек
(deck_selection 3), экзамен (2), ExamResultPreviewAdminModal, hint/lesson_theory_v2 (там сравнение с 'uk' — поведение не меняется).

## Scope

In scope: `constants/i18n.ts` (две функции), тест `tests/i18n_five_lang_fallback.test.ts` (дописать).
Out of scope: сами словари ru/uk/es (перевод на 5 языков — отдельно).

## Architecture

No architecture change: возвращаемое значение помощников для 5 языков. ru/uk/es/en — без изменений.

## Security and privacy

Тексты интерфейса; данные не затрагиваются.

## Technical debt

- Contain: словари за этими помощниками остаются ru/uk/es; переход на triLang с 9 ключами — по мере правки экранов.

## Verification

- jest `--runInBand` (maxWorkers=1): `tests/i18n_five_lang_fallback.test.ts`, `tests/i18n_helpers.test.ts`.

## Rollback

`git revert`; помощники снова отдают ru для 5 языков.
