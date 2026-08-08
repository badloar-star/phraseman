# Admin Content Factory — Release 7 evidence (2026-07-13)

## Результат

R7 добавляет операционную защиту старого и нового генератора: совместимость форматов, полный lifecycle до rollback, матрицу прав и аудита, воспроизводимый fake-provider smoke, настоящий Browser E2E Admin v2, rollout-метрики и canary runbook.

Deployment не выполнялся. Firebase project/alias не выбирался и не предполагался.

## Основные изменённые пути

- Lifecycle: `functions/src/content_factory/release_sealing.ts`, `r7_compatibility.test.ts`, `fixtures/r7/*.json`.
- Permissions/audit: `functions/src/admin_content_factory.ts`, `admin_content_stages.ts`, `content_factory/r7_permission_audit_contract.test.ts`, `tests/admin_v2_r7_permission_contract.test.ts`.
- Smoke: `functions/src/content_factory/r7_fake_provider_harness.ts`, его тест, `scripts/run-r7-fake-provider-smoke.cjs`, `tests/r7_fake_provider_firewall_contract.test.ts`.
- Metrics: `functions/src/content_factory/rollout_metrics.ts`, `functions/src/admin_content_factory_read.ts`, `functions/src/content_stage_worker.ts`, связанные тесты и export в `functions/src/index.ts`.
- Admin: `admin/v2/scripts/admin-router.js`, `admin-core.js`, `admin-firebase.js`, `pages/content-generator.js`.
- Browser E2E: `playwright.r7.config.ts`, `scripts/serve-admin-e2e.cjs`, `tests/e2e/r7/admin_content_factory.spec.ts`, seam contract и pinned `@playwright/test@1.61.1`.
- Rollout: `docs/runbooks/admin-content-factory-canary-rollout.md`, `docs/reports/admin-content-factory-release7-readiness-template.json`.

## Совместимость и lifecycle

Committed fixtures подтверждают одновременное чтение legacy job/release и v3 stage. Проверен путь preview → approve без публикации → immutable seal → CAS activation → rollback на прежний release. Seal, activation и rollback не меняют accepted drafts и ledgers. Миграция не потребовалась: реальные fixtures прошли существующие read adapters.

Исправлен production defect: sealed release и вложенные artifact receipts теперь действительно immutable и не разделяют изменяемые ссылки со входом.

## Permissions и audit

| Операция | Минимальная роль | Permission | Audit |
|---|---|---|---|
| job/stage create, generate/retry, pause/resume/cancel | `content_editor` | `content.draft.write` | actor, role, entity, operationId, reason, before/after |
| approve/reject, review, seal | `admin` | `content.publish` | тот же обязательный контракт |
| activate/rollback | `admin` | `content.publish` | полный CAS before/after и rollback target |

Для строк матрицы проверены отсутствие auth, `admin:false`, недостаточная роль, минимальная разрешённая роль, App Check и отсутствие второго audit при недопустимом replay.

После первого финального Advisor gate закрыт обнаруженный пробел: оба worker-пути теперь пишут отдельный `stage.generate` / `stage.retry` и `unit.generate` / `unit.retry` audit атомарно с терминальным `needs_review` / `succeeded` / `failed`. Детерминированный operation ID связан с collection, entity, attempt и lease. Replay, busy, blocked и superseded late result не создают audit. Browser E2E подтверждает generate, failed generate, retry и отсутствие audit у отброшенного позднего результата.

## Fake-provider smoke

Путь: `.codex-tmp/admin-content-factory-r7-fake-smoke/`.

Manifest SHA-256: `df9d494e263ba1ce81c124fb41095a2ce383bd07f159d60c6be51463768292fd`.

Все member hashes и sidecar перепроверены независимо. Сценарии:

- `R7-SINGLE-01`;
- `R7-RANGE` — уроки 1, 8/9, 16/17, 24/25, 32;
- `R7-PARTIAL` — реально сохранены 2 успешных unit из 3;
- `R7-RATE` — нормализация rate limit, cap 3 и backoff 100/200;
- `R7-SCHEMA` — malformed artifact и успешный repair через production runner;
- `R7-PAUSE` — pause/resume без повторной работы;
- `R7-CANCEL` — поздний результат отброшен;
- `R7-REPLAY` — provider повторно не вызван;
- `R7-LEASE` — expired lease заменена, старая не может commit;
- `R7-ROLLBACK` — production request contracts и drafts unchanged.

Поддерживаемые production targets берутся из одного read-only списка `en/fr`; отдельные hashes и отсутствие cross-language leakage подтверждены. Harness получает provider/clock/storage/persistence только через dependency injection и не импортирует OpenAI provider, ключи, `fetch` или HTTP.

## Языковая проверка

R7 не меняет одобренные языковые артефакты R3–R6. Он повторно использует exact versioned prompt/schema/context hashes и финальные обезличенные language runs из release evidence 3–6. Quiz/Challenge, Flashcards и Arena ранее прошли отдельные Advisor review; Arena run4 имеет две последовательные оценки `DECISION: APPROVED`. В R7 сетевых/model вызовов не было.

## Browser E2E

Playwright открывает настоящий `admin/v2/index.html` и реальные Admin modules. Fake auth/actions seam доступен только на `127.0.0.1`, `localhost` или `::1`; Firebase загружается динамически только вне seam. Любой неожиданный network/Firebase/OpenAI request завершает тест ошибкой.

6/6 tests passed:

- независимые stage, error details/retry, pause/resume, cancel и late-result discard;
- реальная форма диапазона 1–32 и контроль всех boundary IDs;
- visible preview, approve, seal (ещё inactive), activate и rollback;
- accepted drafts unchanged;
- readiness metrics загружаются видимой кнопкой;
- keyboard focus, names/tooltips, live status/alert, no overflow/overlap на 375/768/1024/1440.

Артефакты (ignored):

| Файл | SHA-256 |
|---|---|
| `admin-375.png` | `f5299cb8a94a61da5fa8ca6543731c9b9d40901077108d1292ceb5e783d43ead` |
| `admin-768.png` | `8db9f4eff841b6b6e1d557d5f330eaa4151573d7322fc11a5e0a3d27194c4ff0` |
| `admin-1024.png` | `1b8ebbfcfd35db5cff01191a15e00c80707ffbf88101d0d33bb84a27e1c41d95` |
| `admin-1440.png` | `fa23931ff0a8fc27e2923d07b5746a52e004f059d3df82a5bdd1b6d0fc17d16c` |
| `results.json` | `9c82f54a0efb423dedead67e77648233b6811df956183ba709e30c1bdd58809e` |

## Метрики и stop/rollback

Authoritative callable читает максимум 100 новых stages, 100 legacy `content_factory_job_units` и 100 jobs, защищён `content.read` и App Check. Он нормализует обе производственные популяции в общий read model и отдельно показывает staged/legacy counts. Legacy failed → retry → succeeded влияет на failure category, attempts/accepted artifact и latency; top-level jobs не считаются попытками второй раз. Также показаны QA, operator corrections, p50/p95 latency и использование фактического дневного `content_factory` generation cap.

Budget panel показывает число quota reservations, а не микротокены, деньги или billed provider cost. Cap читается через существующий `resolveJobConfig`; usage — из существующего daily budget counter.

Admin явно показывает `Deployment не выполнялся`, loading/empty/error states и ссылку на stop/rollback. Canary runbook требует явный project ID и authority, описывает waves 0–3, observation windows, stop conditions и rollback только catalog pointer без удаления drafts/releases.

## Финальные проверки

- Functions: 25 suites, 187 tests passed; TypeScript build passed.
- Root Admin/firewall: 8 suites, 31 tests passed.
- Playwright: 6 passed.
- Admin/runner JS syntax: passed.
- Tooltip audit: 142/142, missing 0.
- Admin language audit: 19 files, hard findings 0.
- R7 fake smoke: 10/10; manifest and sidecar valid.
- `git diff --check`: passed.

`text-integrity:audit` сообщил baseline drift вне области этой задачи: 14 added sites находятся только в `app/streak_stats.tsx`, `app/arena_results.tsx`, `components/NotificationCenterButton.tsx` и `components/ActivityHeatmap365.tsx`; R7 Admin/Functions файлов среди findings нет. Baseline не обновлялся, потому что тесты и аудит не должны переписывать пользовательские исходники или baseline.

## Ограничения

- Latency и QA собираются только там, где документ содержит соответствующие фактические поля.
- Quota reservation не равна стоимости провайдера.
- Реальный canary требует отдельного явного разрешения, подтверждённого Firebase project ID и заполненного readiness packet.
- `<details>` legacy factory сворачивается после rerender; E2E повторно открывает её как пользователь. Это не блокирует генерацию, но сохранение раскрытого состояния можно улучшить отдельно.

## Advisor gate

После первого `CHANGES_REQUIRED` добавлены реальные generate/retry audit для обоих worker-путей и legacy job units в общий rollout read model. Повторный аудит фактического состояния R7 и всей цели R0–R7: `DECISION: APPROVED`.
