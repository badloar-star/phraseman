# Токены: контраст статусов и неактивных значков до порога (решение координатора, п.63)

Governance-ID: TG-45D5F5FB9C0B
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: dev-shadows-off-switch-2026-10-14.md

## Outcome
Светлое: good/bad/warn/info ≥ 4,5 на bgTop; iconMuted/trackOff ≥ 3 на bgTop. Тёмное: iconMuted/trackOff ≥ 3 на raisedFillFrom. Сдвиг ровно до порога, оттенок не меняется.

## Scope
constants/liquidGlassPaletteRoles.ts (bgTop в список поверхностей статусов), constants/liquidGlassSurfaceRoles.ts (доп. поверхности для nonTextTone, порядок вычисления). Эталоны в тестах — осознанно.

## Architecture
Тот же приём, что для mutedText: подбор до порога по списку поверхностей; значения, уже проходящие, не меняются.

## Security and privacy
Не применимо.

## Technical debt
Если эталоны в тестах закреплены байт-в-байт — переписываются с таблицей «было → стало».

## Verification
Срез токенов до/после по 23 темам × 2 оформления × 5 интенсивностей, точечные тесты темы.

## Rollback
git revert коммита.
