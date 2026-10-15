# Task packet: аудит «кнопки нигде не сливаются» — таблица контрастов по всем темам

Governance-ID: TG-E353B0699B5C
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: правило владельца 13.10 (№35 «никакие кнопки чтобы не сливались»); поручение координатора 15.10 — до 07:20, чинить красное в окне 07:00 только токенами темы

## Outcome

Таблица «тема × оформление × кнопка × поверхность → контраст» по всем 23 темам, светлому и тёмному оформлению и шагам ползунка: фон кнопки к самой светлой и самой тёмной поверхности под ней ≥ 3:1, подпись кнопки ≥ 4,5:1; красное — отдельным списком; затем исправление красного токенами темы (формы кнопок не трогаем).

## Scope

In scope: новый тест-аудит `tests/buttons_never_merge_audit.test.ts` (расчёт по токенам `liquidGlassTokens`, отчёт пишется в `docs/phraseman-2.0/evidence/buttons_contrast_audit_2026-10-15.md` при `BUTTON_AUDIT_WRITE=1`), затем токены в `constants/liquidGlassButtonTokens.ts` / `constants/liquidGlassThemePalette.ts` в окне 07:00.

Out of scope: формы и размеры кнопок, V2Button как компонент, эмулятор.

## Architecture

No architecture change: аудит читает уже существующие роли токенов (ctaFill/ctaInk, buttonFill, buttonFillDisabled/Ink, dangerFill/Ink, accent/accentInk, opaqueControl) и поверхности (bg, bgTop, bgBottom, opaqueCard, opaqueSheet).

## Security and privacy

Только расчёт цветов.

## Technical debt

Contain: красное, которое нельзя починить токеном без смены вида, выносится владельцу отдельным списком; ослаблять порог 3:1 без решения владельца нельзя.

## Verification

`npm run test:one -- tests/buttons_never_merge_audit.test.ts` по слоту; отчёт; после исправления токенов — `button_tokens_contrast`, `moments_contrast_all_themes`, `accent_fill_paywall_guard` «N passed».

## Rollback

git revert коммитов.
