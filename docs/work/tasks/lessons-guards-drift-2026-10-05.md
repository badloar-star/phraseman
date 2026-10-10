# Task packet: красные сторожа «Уроков» — дрейф после редизайна

Governance-ID: TG-ED08BE9BC98F
Governance-ID: TG-FF7DC14670E9
Governance-ID: TG-B994F544A488
Status: Done (2026-10-05)
Owner: сессия «2 · Дизайн» (поручение координатора)
Related epic/enabler: гейт паритета 2.0

## Outcome

По каждому из 7 красных сторожей решено: охраняет снятый вид — переписан под действующий смысл; про логику — список Ядру;
Learning V2 / factory_native — не трогаем (зона Codex).

## Scope

In scope (вид): dialogs_back_tabbar, lessons_full_bleed_safe_area, lesson_list_flat (тест плоского списка),
lessons_tab_locale_runtime (тексты экзамена и замка — без учёта стиля кавычек).
Out of scope (Ядру/Codex): learning_v2_remote_audio_pack (аудио V2, Codex), exam_best_pct_sync (восстановление при старте),
lesson_list_flat — тест прохождения урока в lesson1.tsx (XP/зачёт), personal_plan_sunset (модуль снят 30.09),
lessons_tab_locale_runtime — первый тест (русские названия английского курса для всех языков, решение 13.09).

## Architecture

Код приложения не меняется — только тесты.

## Security and privacy

Не затрагивает данные.

## Technical debt

- Contain: логические сторожа переданы Ядру списком с причинами.

## Verification

npm run test:one по четырём видовым сторожам.

## Rollback

git revert коммита.
