# Task packet: PM-221 — обновить карту серверных доменов (A1: каждая функция привязана к возможности)

Governance-ID: TG-94EA8E61CB15
Status: Done (A1 — остаются 2 функции на решение владельца)
Owner: Ядро; поручение координатора 04.10

## Outcome
Карта (docs/phraseman-2.0/evidence/PM-221_server_domain_map.md, генератор scripts/pm221_server_domain_map.mjs) пересобрана на текущем коде: 482 точки (было 495 — из кода ушли 16 надгробий Арены, появились 3 функции Account Authority 2.0). Новые `accountAuthority*` генератор не знал (домен `other`, «не классифицировано») — добавлено правило: домен auth (Account Authority 2.0, в работе AA; экспорта в index.ts пока нет). На решение владельца остаются 2: `statsInsightsGenerate`, `weeklyReviewGenerate` — кода экспорта нет, вызова из клиента нет, решения в 03_DECISIONS нет (удалить код или подключить).

## Scope
scripts/pm221_server_domain_map.mjs (одно правило), docs/phraseman-2.0/evidence/PM-221_server_domain_map.md (пересборка генератором).

## Architecture
Только документация/генератор; код функций и деплой не трогаются.

## Security and privacy
Карта перечисляет имена функций и коллекций, без данных пользователей.

## Technical debt
Сверка «в облаке, но нет в коде» в генераторе статическая (по PM-007); живой список развёрнутых функций генератор не читает — отдельно в отчёте.

## Verification
node scripts/pm221_server_domain_map.mjs; сторож карты (если есть) — тесты по имени pm221.

## Rollback
Откат коммита.
