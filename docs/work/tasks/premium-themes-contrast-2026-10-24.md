# Премиум-темы grad_full_* (пакет Codex): контраст через общий расчёт ролей

Governance-ID: TG-4A36EAEEA422
Governance-ID: TG-5E32B2E0BE9D
Governance-ID: TG-909C28F6991C
Governance-ID: TG-FD9C1FD40A3A
Governance-ID: TG-596A368670EF
Governance-ID: TG-487971F1B1ED

## Outcome
Слово владельца 24.10 через координатора: «Пусть чинит 4 · Темы». 6 премиум-тем Codex (olive, titanium, horizon, ref_signal_lime, ref_storm_violet, ref_gravity_blue) ломали 5 сторожей контраста (кнопка пейвола 1,01–1,15 к листу, подпись на ней 1,04–1,14, «верно» 3,87–4,29, текст сцены Диалогов < 4,5), сторож литералов (+15), «верно/неверно» и замок смены темы. Задумку Codex (пигменты, градиенты, анимации, каталог) не менять — только провести темы через общий расчёт читаемых ролей.

## Scope
In scope: `constants/liquidGlassThemePalette.ts` (последний слой премиум-переопределений закрепляет только пигменты поверхностей, производные роли считаются legibleOn/deriveButtonRoles от этих пигментов), литералы в `PremiumThemeMotion.tsx` / `premium_theme_motion_sources.ts` (только если они не сгенерированные шейдеры), `ThemeContext.tsx` (вернуть снятие dev-оверрайда, если оно потеряно), сторож `tests/premium_themes_contrast.test.ts`, строка в `docs/work/OWNER_LOCKS.md`.
Out of scope: состав каталога, тексты, анимации, видео-доступ, выдача премиум-тем.

## Architecture
`premiumThemeTokenOverrides` по-прежнему кладётся в `built` до вывода ролей. Последний слой спреда ограничивается ключами-пигментами (bg*, opaque*, card, sheet, plate*/raised*/sheetPlate*, deepBase*, premiumDock, premiumDockInk, premiumEdge, text) — производные (secondary, mutedText, accent*, cta*) остаются как рассчитано общими функциями.

## Security and privacy
Данных не касается.

## Technical debt
Если Codex захочет закрепить акцент буквально — нужен отдельный ключ «графика», а не перекрытие текстовых ролей.

## Verification
5 сторожей контраста, theme_semantic_follows_current_theme, theme_switch_clears_dev_override, dialogs_scene_contract, v2_screens_color_literals_ratchet, тесты Codex premium_theme_*; новый сторож: кнопка пейвола видима (≥3 к листу, подпись ≥4,5) во всех 6 темах × 2 оформления.

## Rollback
Снимок пакета до правки: `docs/work/codex_premium_themes_snapshot_2026-10-24.patch` + `_new/`.
