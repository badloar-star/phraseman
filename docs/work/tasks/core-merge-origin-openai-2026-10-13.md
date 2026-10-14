# Task packet: слияние origin/feature/referral-roulette (замена уходящих моделей OpenAI, 08–09.10) и push

Governance-ID: TG-4C01FEED9422
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: E22; слово владельца через координатора 13.10 «отправить весь скоп в GitHub»

## Outcome

В HEAD ветки `feature/referral-roulette` — merge-коммит с двумя родителями (наш HEAD + origin), сохраняющий замену уходящих
моделей OpenAI (fb1c86ff5, 526be32e8) и все наши правки после 09.10; ветка отправлена в GitHub (`git push origin
feature/referral-roulette`). Хэш и «pushed» — координатору.

## Scope

In scope: 24 файла origin (functions/src/openai_*, premium_dialog, support_inbox, admin_asset_studio, jarvis, tournament_* тесты,
scripts/generate-*, admin/v2/legacy.html); разрешение 4 конфликтов; обновление в рабочем дереве ТОЛЬКО путей, изменённых слиянием,
и только если в них нет чужих незакоммиченных правок. Out of scope: правка 14 ошибок типов в немецких файлах Codex
(modules/learning-v2/curriculum/de/task6c_*, scripts/capture_learning_v2_de_task6c_*) — не трогаем.

## Architecture

Без касания общего дерева во время слияния: `git merge-tree --write-tree` → временный индекс (GIT_INDEX_FILE) → разрешение
конфликтов блобами → `write-tree` → `commit-tree -p HEAD -p origin` → `update-ref` со сверкой старого значения, всё под
`C:/Temp/claude/git_commit.lock` (тот же замок, что у safe_commit).
Конфликты: `admin_asset_studio.ts` — таймаут PM-231 (наш) + модель из конфига задания (origin); `support_inbox.ts` — модель
(origin) + журналируемый catch (наш, без немого `.catch(() => undefined)`); `openai_runtime_cost_contract.test.ts` — без раздела
weekly_review (удалён в 2.0, D78), остальное из origin; `admin_tournament_tasks.test.ts` — удалён у нас (Арена, D83), удаление сохраняем.

## Security and privacy

Ключей и секретов не касается; модели OpenAI берутся из конфига заданий, как в origin.

## Technical debt

Accept temporarily: push может пойти с `--no-verify` только при условии, что pre-push краснеет исключительно на 14 немецких
ошибках Codex (слово владельца через координатора); перечень — в отчёте.

## Verification

Нет маркеров конфликтов в дереве слияния; тесты functions по затронутым файлам (openai_*, admin_asset_studio, support_inbox,
jarvis llm_enricher_cost, tournament_*) + `tests/openai_runtime_cost_contract.test.ts` через слот; проверка типов functions.

## Rollback

`git update-ref refs/heads/feature/referral-roulette <прежний HEAD>` до push; после push — revert merge-коммита (`-m 1`).
