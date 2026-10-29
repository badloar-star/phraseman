# Ядро · коммит B: подключение подсчёта, снимка и автоначисления Plus в код конкурса (владелец 29.10)

Governance-ID: TG-4C9258D358DD
Status: In progress
Owner: 1 · ЯДРО

## Outcome
B0: 4 серверных файла конкурса (`functions/src/community_month_contest.ts`, `community_contest_identity.ts`,
`community_month_reward.ts`, `shared/community_month_contest.ts`) добавлены в git как есть — по содержимому равны ветке
релиза da0a435e3 (бой); решение владельца 29.10 «Сначала коммит как есть». B: поверх — снимок рейтинга, подсчёт по
правилам владельца, финализация с автоначислением Plus 3/2/1 и историей победителю, поле contestLastWin в проекции.

## Scope
In scope: эти 4 файла; свои хунки в `firestore.rules`, `firestore.indexes.json`, `functions/src/index.ts`,
`functions/src/access_projection.ts` (через --patch, чужие хунки остаются незакоммиченными); записка Codex.
Out of scope: клиент (Моменты/Codex), выкладка (по кнопке владельца после Ревизора).

## Architecture
См. docs/work/handover/community-contest-fixes-2026-10-29.md (разделы 1–6а).

## Security and privacy
Новых данных нет; журнал plus_grant_ledger (uid) — только сервер, стирание при удалении аккаунта.

## Technical debt
Не создаёт: старый путь «забрать приз» остаётся для 147/148 с ответом «нечего забирать» для новых месяцев.

## Verification
functions jest (tally, plus_grant, финализация на моках), проверка типов functions, эмулятор правил — по возможности.

## Rollback
`git revert` B; B0 — это бой, откат не нужен.
