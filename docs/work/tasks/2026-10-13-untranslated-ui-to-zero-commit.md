# Task packet: база сторожа переводов 91 → 0 — единая партия коммита (переводы, пометки, D168)

Governance-ID: TG-752BED1EFDC5
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: 2026-10-13-untranslated-ui-to-zero.md, D168, D169

## Outcome

Одним коммитом: правило пометки `i18n-ok: <причина>` в scan_untranslated_ui и исключения dev/неподключённых файлов; пометки на служебных строках; перевод проверки интро V2 на 9 языков; простой текст окна обновления на 9 языках (D168); база сторожа 0.

## Scope

In scope: scripts/scan_untranslated_ui.mjs, config/untranslated-ui-baseline.json, app/(tabs)/friends.tsx, app/(tabs)/lessons.tsx, app/flashcards/CardsHubAnimProbe.tsx, app/privacy_settings.tsx, app/settings_notifications.tsx, app/shop.tsx, app/learning_v2_session_intro_check.tsx, app/learning_v2_direct_session_player_v1.tsx (патч своих двух строк), components/EnergyContext.tsx, components/ForceUpdateGate.tsx, components/TapLatencyNavProbe.tsx, components/spire/SpireTower.tsx, components/survey/SurveySheetModal.tsx, components/LearningV2SessionOutcomeSheet.tsx.

Out of scope: логика экранов, чужие незакоммиченные хунки.

## Architecture

No architecture change: строки и комментарии; новое правило сторожа.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: D169 — удаление неподключённых файлов после R1.

## Verification

Сторож — 0; синтаксис каждого файла — разбор TypeScript по одному файлу; тесты сторожа node --test (13/13); numstat каждого файла сверен с моими правками.

## Rollback

Откат коммита; база сторожа вернётся вместе с ним.
