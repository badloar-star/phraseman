# Красные сторожа зоны макетов (R115) — 17.10
Governance-ID: TG-2405FA45403C

## Outcome
Из списка Дизайна (red-tests-head-2026-10-17.md, 2217fb8f3) починить сторожей, устаревших после намеренных правок кода, не ослабляя их смысла; настоящие поломки кода — передать владельцам участков с диагнозом.
## Scope
tests/home_last_lesson_notepad_asset_contract.test.mjs, tests/home_v2_feature_tiles_text_integrity_source_contract.test.mjs, tests/home_v2_video_rail_contract.test.cjs. Код приложения не трогаем.
## Architecture
Сторож проверяет тот же смысл на текущей разметке: арт через ThemedArtLayers (по умолчанию contain), заглушка render_cause_probe в песочнице шапки.
## Security and privacy
Правятся только тесты: персональных данных, сервисов и разрешений не касается.
## Technical debt
Остальные 6: glass_coin (home.tsx), palette (Темы), font_cap и preview_guard (Моменты, поломки кода), mockup readiness/quality (архив пайплайна курса, участок V2) — переданы.
## Verification
node --test по каждому файлу.
## Rollback
git revert.
