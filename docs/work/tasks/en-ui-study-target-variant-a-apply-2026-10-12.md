# Task packet: наложить вариант А — при английском интерфейсе английский не предлагается языком изучения (решение владельца, журнал п.81(4))

Governance-ID: TG-2524C6D7FB0A
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10)

## Outcome

Наложена заготовка docs/phraseman-2.0/handoff/en_ui_study_target_variant_A.patch (6 файлов); строка D в 03_DECISIONS.md;
тесты варианта А, переключения EN-интерфейса и онбординга зелёные.

## Scope

In scope: файлы патча (app/study_target.ts, components/CleanOnboarding.tsx, app/settings_language.tsx, app/(tabs)/_layout.tsx,
hooks/use_en_ui_study_target_migration.ts, tests/en_ui_study_target_variant_a.test.ts), строка в 03_DECISIONS.md.
Out of scope: вид онбординга (заморожен — не меняется), сервер, таблица готовности разделов.

## Architecture

См. handoff/en_ui_study_target_variant_A.md: фильтр списка языков по интерфейсу, обязательный экран языка при en, миграция пары en+en
через экран выбора (тихо язык не меняется).

## Security and privacy

Новых данных нет.

## Technical debt

- Contain: нет.

## Verification

tests/en_ui_study_target_variant_a.test.ts, tests/english_ui_switch_r1.test.ts, tests/clean_onboarding*; syncheck 6 файлов.

## Rollback

git revert коммита наложения.

## Result

Наложено, D164 в 03_DECISIONS.md. Тесты: en_ui_study_target_variant_a 3/3, english_ui_switch_r1 3/3, clean_onboarding_copy 7/7,
onboarding_study_target_choice_contract 7/7 (ожидание порядка экранов обновлено под D164), settings_language_liquid_glass 5/5 (в мок
expo-router добавлен useLocalSearchParams), study_language_picker/study_target_canonical 1/1, aa_auth_double_tap 29/29, navigation_back 24/24,
video_language_pill 15/15, profile_liquid_glass 15/15. gustav_surface_target_switch — 4 падения И ДО наложения (проверено снятием патча):
тест ждёт «только английский в проде», устарел — не трогал. Срез типов не прогнан (свободно < 4 ГБ).
