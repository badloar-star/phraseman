# Task packet: стражи удалённых тем и названий тем под темы 2.0

Governance-ID: TG-36A79B03AD4A
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: docs/work/tasks/2026-10-04_theme_guards_2_0.md

## Outcome

Красные стражи по контуру тем (прогон Дизайна, bd05dd07e) снова проверяют действующее поведение:
- `removed_candy_blue_theme_contract` / `removed_onyx_theme_contract` — причина: ищут в ThemeContext явные строки `'candyBlue'`/`'minimalDark'`, а миграция стала общей (любой старый `app_theme` ≠ 'dark' → Графит; неизвестный id темы → graphite). Замена: та же гарантия проверкой поведения — `themeAccessTier` = unavailable, `resolveLiquidGlassTheme` → graphite, `isThemeUnlockedFor` = false при любом доступе, общая перезапись `app_theme` в коде провайдера; плюс отсутствие в обоих списках тем (тонированные и градиентные) и в словаре имён.
- `settings_locale_runtime` («названия тем») — причина: названия тем переехали из settings.tsx в общий словарь `app/theme_display_names.ts` (D-правило «копий названий быть не должно»). Замена: settings берёт имя из словаря; у каждой из 23 тем — явное имя на КАЖДОМ языке интерфейса (`INTERFACE_LANGS`), без подстановки; в settings нет признаков старых подстановок.
- Дни недели уведомлений — не мой контур (settings_notifications.tsx, Дизайн): выбор дней удалён с экрана (одно время напоминания) → проверку согласует Дизайн; я её не трогаю.

## Scope

In scope: `tests/removed_candy_blue_theme_contract.test.ts`, `tests/removed_onyx_theme_contract.test.ts`, тест-кейс «theme labels» в `tests/settings_locale_runtime.test.ts`.
Out of scope: кейс дней недели (Дизайн), код приложения.

## Architecture

Нет изменений — тесты.

## Security and privacy

Не применимо.

## Technical debt

Нет новой.

## Verification

Один прогон jest (`--runInBand`, слот): три файла — зелёные, кроме кейса дней недели (оставлен Дизайну).

## Rollback

`git revert`.
