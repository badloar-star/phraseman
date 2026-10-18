# Global Broadcast Privacy Rollout

Эта миграция намеренно разбита на этапы. Скрипт readiness проверяет текущие
локальные hashes и реальный aggregate verification receipt вместе с operation,
state и audit из Firestore; он **не выполняет деплой**.

## Почему нельзя выпускать одним шагом

Старые клиенты читают рассылку запросом только
`where('active', '==', true)`. Firestore list Rules не гарантируют фильтрацию
неизвестных полей даже при marker-условии, поэтому новый клиент читает только
bounded authenticated callable `globalBroadcastListActive`. После выпуска
ограничительных Rules любой browser read/list/write для коллекции запрещён, а
старые клиенты получат `permission-denied`. До внешней проверки минимального
поддерживаемого build/client floor Rules выпускать нельзя.

## Обязательный порядок

1. Deploy safe functions and admin hosting: отдельно выпустить восемь узких
   broadcast-callable (public projection и оба claim endpoint) и admin hosting командой
   `cd functions && npm run deploy:admin-global-broadcast-stage-functions`.
2. Owner dry-run and idempotent scrub to zero unsafe documents: в живой админке
   выполнить owner-only dry-run, затем scrub, затем server aggregate verification.
   Последняя операция обязана выдать complete receipt по всей коллекции: page-local
   ноль или последняя страница миграции доказательством не являются. Записать
   operation ID и audit ID этой проверки в структурированный readiness-конфиг.
3. Release the callable-only client reader: выпустить мобильный клиент,
   использующий `globalBroadcastListActive` и не читающий
   `global_broadcast_modals` через browser Firestore. Старый запрос сохраняется
   только в ранее выпущенных сборках; возвращать его в новый клиент нельзя.
   Release evidence обязан быть SHA-256-bound к текущему query artifact.
4. Verify the minimum supported app build/client floor externally: проверить
   фактический floor в каналах распространения и записать build, SHA-256
   доказательства и время проверки. Репозиторий не может вывести это из исходников.
5. Enable and deploy restrictive Firestore Rules: только после отдельного
   одобрения заполнить `config/global-broadcast-privacy-rollout.json` реальными
   доказательствами и запустить узкий rules-профиль.

По умолчанию все readiness-флаги равны `false`, а evidence-объекты равны `null`.
Guard fail-closed обращается к production Firestore только после заполнения всех
структурированных локальных evidence-полей. Offline, missing operation/state/audit,
неверный project/environment, несовпавший schema/allowlist/source hash, последняя
страница вместо aggregate receipt или нарушенная хронология блокируют Rules.
Любой deploy-профиль, способный
публиковать Firestore Rules, сначала запускает
`scripts/guard_global_broadcast_privacy_rules_rollout.mjs` и останавливается,
пока хотя бы одно доказательство отсутствует. Не подменять доказательства
предположением и не объединять этапы в broad/one-step профиль.

### Узкое разрешение владельца: Home Polls v2, 18.10.2026

Единственное исключение из глобальной готовности — явно запрошенный режим
`--mode=exact-home-poll-v2-overlay` для 13 уже проверенных строк Home Polls v2.
Он не меняет readiness-флаги и не принимает произвольный rules-файл: guard
сам повторно читает текущий production release через Rules API, требует точные
project/release/updateTime и SHA-256 живого исходника из
`config/home-poll-v2-rules-overlay.json`, строит только фиксированный блок и
проверяет SHA-256 результата, +13/-0 и обратимость до живого исходника.
Любой drift живых правил, overlay, проекта, release или hash останавливает deploy.

Разрешённая команда одна:
`node scripts/deploy_home_poll_v2_rules_overlay.mjs --apply --confirm=DEPLOY_EXACT_HOME_POLL_V2_RULES`.
Она вызывает обязательный guard с явным режимом непосредственно перед узким
`firestore:rules` deploy для фиксированного проекта, а после deploy заново читает
активный Rules API source и сверяет hash overlay. После успешного deploy режим
автоматически становится неповторяемым: live hash уже не равен исходному hash.

## Формат evidence (заполняется только реальными данными)

- `functionsStageEvidence`: `deployedAtMs`, SHA-256 внешнего deploy evidence,
  текущие `schemaAllowlistHash` и `functionArtifactHashes`.
- `verificationEvidence`: точные `operationId` и `auditId` из complete aggregate
  receipt, созданного `adminVerifyGlobalBroadcastPrivacyReadiness`.
- `clientReleaseEvidence`: `releasedAtMs`, SHA-256 release evidence, тот же
  verification operation и текущий `appQueryArtifact`.
- `clientFloorEvidence`: build, время, SHA-256 внешнего floor evidence, ссылка
  на SHA release evidence, verification operation и тот же query artifact.
- `rulesApprovalEvidence`: время и SHA-256 отдельного approval evidence,
  verification operation/audit, schema hash, function hashes, query artifact и
  SHA floor evidence.

Guard сам вычисляет hashes из текущего checkout, затем читает из Firestore
`admin_command_operations/{operationId}`, `admin_config/global_broadcast_privacy_state`
и `admin_log/{auditId}`. Локальный файл с «receipt» не принимается. Все времена
должны идти по порядку functions → aggregate verification → client release →
client floor → Rules approval; receipt должен оставаться последним для текущего
generation. Любая следующая publish/deactivate/scrub операция инвалидирует его.
