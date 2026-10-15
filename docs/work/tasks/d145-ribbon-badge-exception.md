# Task packet: лента рубежей серии — цифры-бейджи 11 sp остаются по эталону v3, исключение в храповике D145

Governance-ID: TG-5002E6065176
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: поправка координатора 15.10 к пакету TG-390485C87D1A («одобрение эталона v3 владельцем 14.10 новее и конкретнее D145»)

## Outcome

Отметка ленты рубежей остаётся кругом 26 pt с цифрой 11 sp, как в одобренном эталоне v3 (форма не меняется, «таблетки» нет); `StreakMilestoneRibbon.tsx` внесён в исключение «цифра-бейдж» храповика `typography_two_sizes` (тот же класс, что бейджи с 11 sp). «Пропустить» 15 → 16 остаётся.

## Scope

In scope: `components/streak/moments/StreakMilestoneRibbon.tsx` (возврат к кругу 26 pt и 11 sp + пометка `d145-micro:` у размера), `tests/typography_two_sizes_ratchet.test.mjs` (файл в `MICRO_FILES`), `components/streak/moments/StreakMilestoneScreen.tsx` (skipText 16, уже подготовлено), `tests/streak_moments_v3_contract.test.tsx`.

Out of scope: форма отметки, чужие файлы храповика (`mode_feedback_v1.tsx`).

## Architecture

No architecture change: исключение подчиняется уже существующему механизму `MICRO_FILES` + `d145-micro: <причина>` в строке.

## Security and privacy

Только вёрстка и тест.

## Technical debt

Contain: исключение ограничено одним файлом и строкой с причиной; числа 365/1000 при 13 sp не помещаются в круг 26 pt.

## Verification

`node --test tests/typography_two_sizes_ratchet.test.mjs` — файл ленты не назван; `tests/streak_moments_v3_contract.test.tsx` «N passed»; в `git diff` ленты нет изменения формы отметки.

## Rollback

git revert коммита.
