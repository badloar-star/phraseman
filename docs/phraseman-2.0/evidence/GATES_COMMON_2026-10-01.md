# Общий evidence-пакет gates: BASELINE_SHA_APPROVED и DOMAIN_AUDIT_AND_IMPACT_ACCEPTED (2026-10-01)

Основание: решение координатора Q76 (INBOX_COORDINATOR_FROM_CORE.md, раздел §32, 2026-10-01): «ДА — один общий evidence-пакет для BASELINE_SHA_APPROVED и DOMAIN_AUDIT_AND_IMPACT_ACCEPTED, ссылка из каждой задачи». Порядок проверки задач — Q75: независимый агент-ревьюер по каждой задаче, пачками по 10.

Этим файлом ссылаются на gate_evidence ТОЛЬКО эти два gate. Остальные (OWNER_DECISION_RECORDED, PROPOSED_SCOPE_APPROVED, DESIGN_APPROVED_FOR_VISIBLE_CHANGES, IMPLEMENTATION_AND_MIGRATION_READY, MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE) пакет НЕ закрывает: у каждой задачи для них отдельное evidence либо задача остаётся в review с пометкой «ждёт owner-gate».

## Определения (registries/gates.json)

| Gate | Что означает |
|---|---|
| BASELINE_SHA_APPROVED | Точный HEAD/ветка/релиз сопоставлены; владелец согласовал рабочую базу. |
| DOMAIN_AUDIT_AND_IMPACT_ACCEPTED | Аудит затронутого контура и карточка влияния прочитаны владельцем. |

## BASELINE_SHA_APPROVED

Что подтверждено:
- Рабочая и релизная база — ветка `feature/referral-roulette` (решение D30, OWNER_FINAL 2026-09-24, раздел 1 PROGRESS.md; повторно подтверждено координатором в Q56, §24/§32: «выпуск из feature/referral-roulette (D30), codex/all-development-integration НЕ сливаем»).
- Сопоставление HEAD/веток/версии снято фактами git в [E01_E02_baseline_batch_2026-10-01.md](E01_E02_baseline_batch_2026-10-01.md) (раздел PM-001): HEAD `a15901ee47807bbdef9dde7d8c7ef63a80037474` на момент снимка, `origin/feature/referral-roulette` отстаёт, `master` не база, версия приложения `app.json` 1.6.24 / versionCode 130.
- Интеграционная ветка `codex/all-development-integration` (329 коммитов только в ней) разобрана в [PM-239_integration_branch_triage.md](PM-239_integration_branch_triage.md) и [PM-239_branch_inventory.md](PM-239_branch_inventory.md): всё нужное — точечный cherry-pick, остальное — архив; слияния нет.
- На момент подготовки этого пакета HEAD рабочей ветки: `b8cc51b31c53a620e3b3cceb7e177bab4e8f37ad`.

Чего пакет НЕ утверждает (честная граница):
- Какая сборка сейчас опубликована в Google Play / App Store и её SHA — не подтверждено (Q50: номера сборок даст владелец через координатора). Gate утверждает рабочую базу разработки, а не соответствие опубликованному релизу.

## DOMAIN_AUDIT_AND_IMPACT_ACCEPTED

Что принято: аудиты затронутого контура, на которых стоят задачи E01/E02 и смежные:
- реестры экранов/маршрутов, файлов, фоновых работ, ассетов — PM-004_route_registry.md, registries/file_inventory.json (PM-005), PM-210_background_jobs.md (PM-006), PM-009_asset_bundle_inventory.md;
- код против облака — PM-007_code_vs_cloud_functions.md; серверная карта доменов — PM-221_server_domain_map.md;
- разбор интеграционной ветки — PM-239_integration_branch_triage.md;
- карточки влияния/preflight конкретной задачи лежат в её собственных evidence-файлах (подпись конкретной задачи не заменяется этим пакетом).

## Кто и когда подтвердил

- Дата: 2026-10-01.
- Подтвердил: координатор («Fable») по поручению владельца, решения Q56 и Q76 (§32). Формулировка gate говорит «владелец»; здесь приёмка выполнена координатором по делегированию владельца. Владелец вправе её отозвать — тогда gate_evidence у задач, ссылающихся на этот файл, считается снятым.
- Независимая проверка задач, ссылающихся на пакет, — агентом-ревьюером (Q75); отчёт: [review_to_done_audit_2026-10-01.md](review_to_done_audit_2026-10-01.md), раздел «Пачка 1 — независимое ревью».
