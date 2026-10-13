# Task packet: база сторожа непереведённых строк 91 → 0 (владелец «перевести всё»)

Governance-ID: TG-C35E83C22A9F
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: scripts/scan_untranslated_ui.mjs, config/untranslated-ui-baseline.json, I18N_AUDIT_TODAY_R1_2026-10-13.md

## Outcome

Сторож scan_untranslated_ui показывает 0. Что видит пользователь — переведено на 9 языков (ru, uk, en, es, pt-BR, vi, id, tr, pl) естественно, длина сверена с кнопками (R1_LONG_TRANSLATIONS_2026-10-13.md). Служебное (логи, dev-экраны, неподключённый код) — исключение с причиной, не перевод. После каждой партии база понижается.

## Scope

In scope: scripts/scan_untranslated_ui.mjs (строчная пометка `i18n-ok: <причина>` — пропуск строки только с причиной от 10 символов; dev-файлы в список исключений с причиной), config/untranslated-ui-baseline.json (только вниз), файлы с находками: пометки на строках-логах и dev-подписях, переводы V2-экранов (learning_v2_session_intro_check.tsx, LearningV2SessionOutcomeSheet.tsx), app/(tabs)/lessons.tsx — после коммита Ядра.

Out of scope: смысл текстов, логика экранов; чужие незакоммиченные хунки.

## Architecture

Сторож: новое правило пропуска строки по пометке в исходной строке (не в маскированной), причина обязательна. Код экранов: только строковые литералы и комментарии-пометки; переводы — через triLang рядом с существующими.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: неподключённые ModeDemoPlayer.tsx и ExamResultPreviewAdminModal.tsx — исключены как мёртвый код, кандидаты на удаление (координатору). ForceUpdateGate: у ru отдельный простой текст, у остальных языков — текст маскота; расхождение тона — координатору.

## Verification

Сторож в режиме проверки — новое число; синтаксис тронутых файлов — разбор компилятором TypeScript по одному файлу (transpileModule, без проверки типов); точечный прогон тестов сторожа через node --test.

## Rollback

Откат коммитов партий; база сторожа возвращается коммитом.
