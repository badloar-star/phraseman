# Токены нетекстовых элементов: iconMuted и trackOff ≥ 3:1 во всех темах

Governance-ID: TG-816CF851E190
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (запрос координатора 10:00, находка Сверки: значки и дорожки выключенных переключателей на светлых градиентных темах ≈ 1,5:1)
Related epic/enabler: accent-text-light-cards-2026-10-12.md

## Outcome

Два новых токена темы — `iconMuted` (приглушённые/декоративные значки) и `trackOff` (дорожка выключенного переключателя, пустая часть слайдера) с контрастом ≥ 3:1 к `opaqueCard`, `card`, `opaqueSheet`, `opaqueControl` и `bg` во всех 23 темах × светлая/тёмная × calm/accent/max × 21 шаг. Тест контраста. Дизайн применяет токены в экранах.

## Scope

In scope: `constants/liquidGlassSurfaceRoles.ts` (производные от текста темы), тест `tests/theme_non_text_contrast.test.ts`, запись в INBOX. Out of scope: смена существующих токенов (`mutedText`, `line` и др.), правка экранов.

## Architecture

Токены считаются в `deriveLiquidGlassSurfaceRoles` из готовых полей темы: тон между `opaqueCard` и `text` растёт, пока контраст со всеми поверхностями не достигнет порога. Существующие токены не затрагиваются.

## Security and privacy

Не применимо.

## Technical debt

Разделители (`line`, `hairlineSoft`) остаются декоративными (< 3:1 сознательно); при необходимости отдельный токен введём по запросу Дизайна.

## Verification

Новый тест по слоту; соседние наборы тем (`theme_surface_roles`, `theme_palette_roles`, контраст).

## Rollback

`git revert` коммита.
