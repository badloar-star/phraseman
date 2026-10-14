# Task packet: D188 — все 5 языков изучения видны и открыты в шторке «Язык изучения»

Governance-ID: TG-22024E94F568
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: D188 (владелец 14.10 через координатора), отмена «варианта А» и решения О1 (11.10)

## Outcome

Владелец: «ТУТ ДОЛЖЕН БЫТЬ ЕЩЁ АНГЛИЙСКИЙ! И ОНИ ВСЕ ДОЛЖНЫ БЫТЬ ОТКРЫТЫ И ДОСТУПНЫ!». Шторка «Язык изучения» при любом
языке интерфейса (включая English) показывает en, es, fr, de, it; ни у одного нет замка; у неначатых — без подписи
(координатор: правило «минимум элементов»), у начатых — «Учу»/«Учу · выбран» как сейчас. Тап по неначатому языку
мгновенно ведёт на /language_welcome. Лог `[LEARN-LANG] select lang=… started=… route=…`.

## Scope

In scope: `app/study_target.ts` (список без исключения en), `components/settings/StudyLanguageSheet.tsx` (без замка,
без серого флага и подписи у неначатых, тап → общий select), удаление `hooks/use_en_ui_study_target_migration.ts` и его
вызова в `app/(tabs)/_layout.tsx` (при D188 пара en+en разрешена — хук мёртв), стражи
`tests/en_ui_study_target_variant_a.test.ts` (→ D188), `tests/video_language_pill_study_target.test.ts` (блок шторки),
запись D188 в `docs/phraseman-2.0/03_DECISIONS.md`.
Out of scope: таблица видимости разделов D129 (`learning_language_surface_readiness.ts`) — не меняется; макет PRF-23
правят Макеты; dev-параметр `enStudyPrompt` (app/dev_ui_lang.ts, dev_state_fixtures.ts — чужие незакоммиченные правки)
остаётся инертным; ветки `isStudyTargetAllowedForUi` в онбординге и settings_language не трогаю — они становятся
всегда «разрешено» и ведут себя как для ru/uk.

## Architecture

Источник списка один — `studyTargetsForSourceLocale` (теперь все цели при любом интерфейсе). Шторка пользуется
общим хуком `useStudyLanguageSelection` (ветки resolver / switch / welcome уже есть и покрыты тестами).

## Security and privacy

Данных не добавляется; выбор языка — локальная запись `study_target_v1`, как раньше.

## Technical debt

Contain: dev-параметр `enStudyPrompt` больше ни на что не влияет — убрать при следующей правке dev_state (чужая зона
сейчас); подписи `isStudyTargetAllowedForUi` в онбординге упростить отдельной задачей. Риски продукта (русские разборы
старых уроков при EN-интерфейсе; у es/fr/de/it нет курса уроков) координатор доносит владельцу.

## Verification

Точечные тесты: en_ui_study_target_variant_a (переписан под D188), video_language_pill_study_target,
study_target_canonical_contour, study_language_picker_canonical_contour, onboarding_study_target_choice_contract;
проверка типов затронутых файлов; syncheck .tsx.

## Rollback

Вернуть `STUDY_TARGETS_WITHOUT_EN` в `studyTargetsForSourceLocale`, флаг шторки и хук из git (один коммит).
