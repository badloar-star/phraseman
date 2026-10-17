# Реестр паритета: строки шторки голоса через матрицу
Governance-ID: TG-8C42558DF725

## Outcome
Координатор 17.10: строки шторки голоса (1c2823b95) заведены через матрицу STATE_CHECKLIST_2026-09-30.md, чтобы полная пересборка visual_parity_build их не выкинула. Проверить остальные прямые строки, добавленные сегодня.
## Scope
Матрица: раздел voice-limit-session-start.html (2 строки). Реестр: voice-limit-007/008 переименованы в voice-limit-session-start-001/002.
## Architecture
id строки = страница-номер из матрицы; mockup_pinned и evidence переносятся пересборкой по id.
## Security and privacy
Нет данных.
## Technical debt
308 строк реестра не порождаются матрицей, а пересборка теряет поля release/emulator/triage — сообщено координатору, нужна правка сборщика (сохранять строки вне матрицы и все поля).
## Verification
Гейт visual_parity_gate 35/35; parseMatrix даёт оба id.
## Rollback
git revert коммита.
