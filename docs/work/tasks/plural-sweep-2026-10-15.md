# Task packet: склонение «<число> дней/фраз/монет/ступеней» вне окон моментов (список P19)

Governance-ID: TG-73911B0525E2
Status: In progress
Owner: сессия «Специалист по переводам» (координатор 15.10: «что не сделано — продолжай»)
Related epic/enabler: Ревизор P19, сборка 16.10

## Outcome

Человек с серией 1, 21 или 22 дня видит «Серия 1 день / 21 день / 22 дня», а не «1 дней»; «выучил 1 фразу», «ещё 1 монета», «1 ступень».
Места — из списка P19 (docs/work/tasks/coin-plural-moments-2026-10-15.md).

## Scope

In scope (только тексты, через общий `constants/plural.ts` / сокращения): `app/notifications.ts`, `components/ReviewPromptModal.tsx`,
`constants/i18n.ts:164`, `components/stories/story_strings.ts`, `app/session_attempts/session_attempts_copy.ts`,
`app/activity_365_analytics.ts`, `app/french_phrase_analytics.ts`, `components/spire/spire_game_strings.ts`.
Out of scope: `step_moment_strings.ts` (Дизайн), логика уведомлений и расписаний.

## Architecture

No architecture change: числа в шаблонах получают слово через `pluralWord`/`pluralWithCount` (или уже существующие помощники файла).

## Security and privacy

Не применимо.

## Technical debt

Сторож — предложить расширить `number_noun_pairs_guard` на найденные шаблоны.

## Verification

Тесты затронутых файлов + сторожа i18n через slot.sh; numstat при коммите — только свои строки.

## Rollback

`git revert` коммитов.
