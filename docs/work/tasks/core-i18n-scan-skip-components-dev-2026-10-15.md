# Task packet: сторож «тексты вне переводов» пропускает каталог components/dev/

Governance-ID: TG-F65BC958331A
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: просьба сессии «Темы» через координатора 15.10; scripts/scan_i18n_design_zone.mjs (89c443d86)

## Outcome

`components/dev/FontWeightStrip.tsx` — dev-полоса образцов шрифта с кириллическим образцом. Переводить её нельзя: это образец начертания, к тому же она вырезается из стор-сборки. Сейчас сторож считает её текстом интерфейса и краснеет. После правки каталог `components/dev/` пропускается, как уже пропускаются `dev_`, `dev-` и `DevHub`.

## Scope

In scope: регулярное выражение `SKIP` в `scripts/scan_i18n_design_zone.mjs`; самопроверка сторожа.

Out of scope:
- остальные красные файлы храповика (зона Дизайна);
- база `config/i18n-design-zone-baseline.json`.

## Architecture

Нет изменения архитектуры. В `SKIP` добавляется шаблон `(^|\/)components\/dev\/`: только каталог dev-инструментов, без широкого «dev».

## Security and privacy

Не затрагивается: проверка исходников, данных и сети нет.

## Technical debt

Contain: если в `components/dev/` когда-нибудь появится текст для игрока, сторож его не увидит. Каталог по назначению только для dev и вырезается из стор-сборки (`app.config` / `store_release_surface`).

## Verification

- `node --test tests/i18n_design_zone_ratchet.test.mjs` — самопроверки 3/3.
- `node scripts/scan_i18n_design_zone.mjs` — FontWeightStrip больше нет в списке.

## Rollback

Убрать шаблон из `SKIP`.
