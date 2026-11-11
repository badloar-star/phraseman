# Task packet: код Jarvis удалён, общие части сохранены (N01)

Governance-ID: TG-B5E6B6EE3E0E
Status: Implemented, verification pending in heavy-task queue
Owner: владелец; сессия «N01/N02» (Claude)
Related epic/enabler: N01

## Outcome

В проекте больше нет кода Jarvis (департаменты, кроны, панельные функции, знание,
сторож контракта данных). Общие функции приложения, которые брали части из его папки,
работают как раньше: приём и разбор обращений поддержки, одобрение ответов кнопками
Telegram, статистика уроков, устав продукта, бюджет ИИ. Мера успеха: типы двух серверных
сборок и точечные тесты этих функций зелёные.

## Scope

In scope:
- `functions/src/jarvis/` удалена (194 файла);
- 18 модулей и 15 их тестов перенесены в `functions/src/shared_ops/` без смены имён;
- `shared_ops/approval_webhook.ts`: убраны ветки планов, действий и самопроверки Jarvis;
- импорты в `support_inbox`, `progress_events`, `admin_product_charter`,
  `support_telegram_review`, `index.ts`, `functions-admin/index.ts`;
- сторожа и скрипты, читавшие файлы Jarvis по путям;
- `AGENTS.md`, `CLAUDE.md`.

Out of scope:
- данные в проде, имена коллекций `jarvis_*`, секрет `JARVIS_TELEGRAM_CONFIG`,
  значение `draftOrigin: 'jarvis'`, правила и индексы Firestore — без изменений;
- `admin/v2/legacy.html` — редактируется в другой сессии;
- деплой и удаление функций из облака;
- отслеживаемый мусор `functions/lib_audit_tmp/`, `_to_delete/`.

## Architecture

Было: живые функции импортировали общие части из папки отключённой подсистемы.
Стало: общие части лежат в нейтральной папке той же глубины, поэтому внутренние
относительные импорты не менялись. Экспорт `jarvisTelegramApprovalWebhook` сохранён под
прежним именем — это единственная точка входа кнопок поддержки из Telegram. Инвариант:
не-поддержечный токен по-прежнему гасится и попадает в журнал одобрений, но больше не
запускает планы и действия.

## Security and privacy

Сбор и передача данных не менялись. Вебхук по-прежнему монтирует только
`JARVIS_TELEGRAM_CONFIG` и `ADMIN_ALERT_BOT_TOKEN` (сторож
`support_automation_schedule_contract.test.ts`). Список прямых отправителей в Telegram
сузился (`telegram_pii_guard.test.ts`). Ветка самопроверки кнопок удалена — на одну дверь
в публичной функции меньше. Правила Firestore для `jarvis_*` остаются закрытыми.

## Technical debt

- Contain: имена `jarvisTelegramApprovalWebhook`, `sendJarvisDigest`, `JARVIS_*` в
  `shared_ops` оставлены, чтобы не менять данные и настройку бота. Выход — отдельное
  решение владельца о переименовании.
- Accept temporarily: упоминания Jarvis в `admin/v2/legacy.html`; владелец — сессия,
  которая правит файл; убрать, когда файл освободится.
- Accept temporarily: `functions/lib_audit_tmp/` и `_to_delete/functions_smoketmp/`
  содержат старые скомпилированные копии; удаление — отдельная уборка.

## Verification

Через светофор (`slot.sh run --wait`), один прогон:
- `tsc --noEmit` для `functions` и `functions-admin`;
- тесты `functions/src/shared_ops`, `support_inbox_triage`, `support_telegram_review`,
  `support_card_expiry`, `telegram_pii_guard`, `support_automation_schedule_contract`,
  `support_links_alive`, `account_authority/s3_delete_rules_ttl`, `progress_events`,
  `admin_product_charter`;
- корневые сторожа: `max_removed_contract`, `admin_d2_review_followup_contract`,
  `admin_user_briefs_contract`, `admin_v2_gift_certificates_contract`,
  `admin_web_subscription_cancel_contract`, `support_diagnostics_privacy_contract`,
  `admin_trustworthy_analytics_runtime_contract`.

Не покрыто: `tests/session_attempts_economy_gate.ts` (скрипт, запускается отдельно).

## Rollback

`git revert` коммита возвращает папку и все ссылки. Данные не затрагивались, деплоя не было.
