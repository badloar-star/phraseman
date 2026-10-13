# Task packet: переводы pt-BR/vi/id/tr/pl для 47 строк зоны Дизайна + 3 строки Авторизации

Governance-ID: TG-E6CF8C9CF2A1
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: I18N_DESIGN_ZONE_R1_2026-10-13.md §2 (Дизайн 373ca44ac), I18N_GAPS_AUTH_R1_2026-10-13.md

## Outcome

Видимые строки (Память диалогов, ошибки карточек и откликов, редактор, «Видео не открывается», категории Диалогов,
«Свободный разговор») показываются на всех 9 языках интерфейса, а не английским запасным. Потолок храповика
`config/i18n-design-zone-baseline.json` опущен (incomplete 56 → 9).

## Scope

In scope: те же объекты переводов в 12 файлах зоны Дизайна; 3 строки Авторизации (плашка отмены удаления уведомления,
имя канала Android «Напоминания»). Out of scope: литералы (LITERAL), чужие зоны.

## Architecture

No architecture change: добавлены ключи 'pt-BR'/vi/id/tr/pl в существующие объекты triLang/actionToastTri.

## Security and privacy

Не касается.

## Technical debt

- Accept temporarily: переводы vi/id/tr/pl/pt-BR носителем не проверены; термины как в приложении (bộ thẻ, zestaw, pacote, paket).

## Verification

Сканер `scripts/scan_i18n_design_zone.mjs` (incomplete 9), `tests/i18n_design_zone_ratchet.test.mjs`, контракты экранов.

## Rollback

Откат коммита (интерфейс вернётся к английскому запасному для 5 языков).
