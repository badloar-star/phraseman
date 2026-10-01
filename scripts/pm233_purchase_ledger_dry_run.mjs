// PM-233 «Ledger существующих покупок и прав» — сухой прогон ТОЛЬКО по коду.
// зачем: владелец пообещал компенсацию при переходе на 2.0 (R233 «естественно нужно будет
// сделать компенсацию»). Чтобы её посчитать, нужен полный список того, что люди реально
// покупали/получали, где это право лежит и что с ним будет в 2.0. «Одна покупка в тесте»
// не считается выборкой (PM-233-A2): объёмы в проде здесь всегда `unknown`, а скрипт даёт
// только ПЛАН агрегатных запросов (`.count()`, без документов и без PII), который владелец
// может запустить отдельной командой.
//
// Жёсткие границы (проверяет scripts/pm233_purchase_ledger_dry_run.test.mjs):
//  - нет firebase-admin / сети / записей на диск: только чтение исходников и вывод в stdout;
//  - каждый найденный в коде маркер права (товар магазина, коллекция покупок/кошелька,
//    локальный ключ владения, поле Plus, callable, двигающий ценность) обязан быть в LEDGER
//    или в IGNORED с причиной; маркер из LEDGER, которого в коде больше нет, — «протух».
//
// Запуск: node scripts/pm233_purchase_ledger_dry_run.mjs [--json | --check | --prod-count-plan]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Где ищем маркеры. Тесты/пробы/сгенерированное — не источник прав. */
export const SCAN_ROOTS = Object.freeze([
  'app', 'components', 'hooks', 'modules', 'functions/src', 'constants', 'firestore.rules', 'admin/v2/legacy.html',
]);
const SKIP_DIR = /(^|\/)(node_modules|lib|__tests__|__mocks__|generated|content|graphify-out|\.expo)(\/|$)/;
const SKIP_FILE = /\.(test|probe|spec)\.(ts|tsx|js|mjs)$|\.generated\.ts$|\.d\.ts$/;
const SCAN_EXT = /\.(ts|tsx|js|mjs|rules|html)$/;

const VALUE_KW = /(revenue|premium|purchase|shard|pearl|star_op|wallet|voice_minute|voice_call|promo|gift|spin|reward|refund|order|sale|entitle|lineage|denial|access_projection|dialog_access|quota|community_pack|coin|rune|arena_v2_(star|entitle)|seller|redemption|certificate|v2_gate)/;
const CALLABLE_KW = /(Grant|Buy|Purchase|Redeem|Spin|Claim|Webhook|Reconcile|Checkout|Refund|Sale|Wallet|Premium|Promo|Order|Gift|Coin|Rune|Stars|Voice|Reward)/;

/**
 * Правила поиска маркеров. kind — тип маркера; в LEDGER/IGNORED маркер пишется как `kind:value`.
 */
export const MARKER_RULES = Object.freeze([
  { kind: 'store_product', re: /\bphraseman_(?:premium|shards|voice_minutes|max)_[a-z0-9_]*[a-z0-9]/g },
  {
    kind: 'collection',
    re: /(?:collection(?:Group)?\(\s*|[A-Z_]*(?:COLLECTION|LEDGER|PURCHASES|SALES|REDEMPTIONS|INBOX|ORDERS|CLAIMS|GRANTS|ENTITLEMENTS|WALLETS|CREDITS|RESULTS|SPINS|RECEIPTS)[A-Z_]*\s*=\s*)['"]([a-z][a-z0-9_]+)['"]/g,
    keep: (v) => VALUE_KW.test(v),
  },
  { kind: 'local_key', re: /['"`]((?:[a-z0-9]+_)*(?:owned|paid|purchased|unlocked)(?:_[a-z0-9]+)*_v\d+)/g },
  {
    kind: 'plus_field',
    re: /['"`](?:progress\.)?((?:vip|premium_rc|intro_access|loyalty_gift)_[a-z_]+)['"`]/g,
    keep: (v) => /_(ms|at|until|from|plan|active|override|by|expiry|id|type|store|environment|lineage|needed)$/.test(v),
  },
  { kind: 'callable', re: /export const ([a-zA-Z0-9]+)\s*=\s*(?:onCall|onRequest)\b/g, keep: (v) => CALLABLE_KW.test(v) },
]);

const U = 'unknown';
/** Агрегат без документов: только `.count()`; значения полей Plus хранятся строками. */
const cnt = (target, where = null, note = '') => Object.freeze({ aggregate: 'count', target, where, note });

/**
 * LEDGER — продукт/право → источник транзакции → хранение → писатели/читатели → судьба в 2.0 → риск.
 * status: keep | convert_decided | retire_decided | needs_decision.
 * Ссылки file:line сняты с HEAD dad5070501f1 (2026-10-01); живые места печатает --json.
 */
export const LEDGER = Object.freeze([
  {
    id: 'plus_store_subscription',
    product: 'Plus — подписка в сторе (месяц / год)',
    money: 'real',
    source: 'RevenueCat: покупка в приложении (Purchases.purchasePackage) → вебхук INITIAL_PURCHASE/RENEWAL/CANCELLATION/EXPIRATION/TRANSFER; ручная сверка revenueCatPremiumReconcileMine',
    storage: 'RevenueCat (источник правды); users/{uid}.premium, premiumExpiry; users/{uid}.progress.premium_rc_*; users/{uid}/access_projection/current; revenuecat_premium_events; revenuecat_premium_lineages; revenuecat_reconcile_reservations',
    writers: ['app/paywall_purchase.ts:661', 'app/manage_subscription_purchase.ts:76', 'functions/src/revenuecat_shards.ts:697', 'functions/src/revenuecat_shards.ts:1295', 'functions/src/revenuecat_reconcile.ts:389', 'functions/src/access_projection.ts:79', 'functions/src/premium_expiry_cron.ts:296'],
    readers: ['app/revenuecat_premium_access.ts:37', 'components/PremiumContext.tsx:573', 'functions/src/premium_status.ts:233', 'app/revenuecat_projection_sync.ts:58'],
    fate: 'Сохраняется. Единственный пейвол — «Честный пробный период» (D115/D116/D117). В Account V2 не копируется — derive из RevenueCat/access_projection (inventory p.plus, r.plus, s.plus).',
    decisions: ['D115', 'D116', 'D117'],
    status: 'keep',
    question: null,
    risk: 'high',
    riskNote: 'Реальные деньги. Потеря возможна при смене аккаунта/слиянии (lineage на другом владельце), а не от 2.0 как такового.',
    markers: [
      'store_product:phraseman_premium_monthly', 'store_product:phraseman_premium_yearly', 'store_product:phraseman_premium_yearly_2399', 'store_product:phraseman_premium_yearly_2999',
      'collection:revenuecat_premium_events', 'collection:revenuecat_premium_lineages', 'collection:revenuecat_reconcile_reservations', 'collection:access_projection',
      'plus_field:premium_rc_active_lineage', 'plus_field:premium_rc_cancelled_at', 'plus_field:premium_rc_environment', 'plus_field:premium_rc_event_type',
      'plus_field:premium_rc_expiry_ms', 'plus_field:premium_rc_period_type', 'plus_field:premium_rc_product_id', 'plus_field:premium_rc_purchased_at_ms',
      'plus_field:premium_rc_reconcile_needed', 'plus_field:premium_rc_store', 'plus_field:premium_rc_updated_at', 'plus_field:premium_rc_last_seen_at',
      'callable:revenueCatShardsWebhook', 'callable:revenueCatPremiumReconcileMine',
    ],
    countPlan: [
      cnt('collection revenuecat_premium_lineages', null, 'всего линий покупки Plus'),
      cnt('collection users', ['premium', '==', true], 'Plus активен по корневому полю (не равно оплаченным: туда входят VIP/промо)'),
      cnt('collectionGroup access_projection', null, 'проекции доступа'),
    ],
  },
  {
    id: 'plus_store_lifetime',
    product: 'Plus — пожизненный (разовая покупка в сторе)',
    money: 'real',
    source: 'RevenueCat NON_RENEWING_PURCHASE phraseman_premium_lifetime_v1 → тот же вебхук',
    storage: 'как у подписки + premium_rc_product_id = phraseman_premium_lifetime_v1 (lineage kind lifetime)',
    writers: ['functions/src/revenuecat_shards.ts:229', 'functions/src/revenuecat_premium_lineage.ts:113'],
    readers: ['app/revenuecat_init.ts:43', 'app/revenuecat_premium_access.ts:15'],
    fate: 'Сохраняется (вечный Pro). Для владельцев вечного Pro призы рулетки — монеты (D100/D105).',
    decisions: ['D100', 'D105'],
    status: 'keep',
    question: null,
    risk: 'high',
    riskNote: 'Не продлевается — если право потеряно при слиянии, само не вернётся.',
    markers: ['store_product:phraseman_premium_lifetime_v1'],
    countPlan: [cnt('collection revenuecat_premium_lineages', ['kind', '==', 'lifetime'], 'имя поля kind проверить по revenuecat_premium_lineage.ts перед запуском')],
  },
  {
    id: 'plus_revenuecat_denials',
    product: 'Оплаченные чеки Plus, которые НЕ дали доступ (denials)',
    money: 'real',
    source: 'Тот же вебхук: отказ owner_lineage_limit / transfer_lineage_limit / удалённый аккаунт / неизвестная среда',
    storage: 'revenuecat_premium_denials/{receiptId или transfer_*}',
    writers: ['functions/src/revenuecat_shards.ts:500', 'functions/src/revenuecat_shards.ts:655', 'functions/src/revenuecat_shards.ts:1125'],
    readers: ['functions/src/jarvis/all_departments_callables.ts:173'],
    fate: 'Решения 2.0 нет. Это люди, которые заплатили, но Plus не получили.',
    decisions: [],
    status: 'needs_decision',
    question: 'Q-233-1: Что делать с оплаченными, но отклонёнными чеками Plus (denials) — разбирать вручную, выдать Plus днями (D86), или оставить как есть?',
    risk: 'high',
    riskNote: 'Деньги взяты, право не выдано; при чистке D90 их нельзя удалять как «мусор».',
    markers: ['collection:revenuecat_premium_denials'],
    countPlan: [
      cnt('collection revenuecat_premium_denials', null, 'всего отказов'),
      cnt('collection revenuecat_premium_denials', ['reason', '==', 'owner_lineage_limit'], 'по каждой причине отдельным запуском'),
    ],
  },
  {
    id: 'plus_web_checkout',
    product: 'Plus с сайта (Stripe / PayPal, воронка knowlyapps.com/start/)',
    money: 'real',
    source: 'webCheckoutCreate → stripeWebhook; paypalOrderCreate → paypalOrderCapture; выдача ВРУЧНУЮ через промокод (promoCodeRedeem / админка)',
    storage: 'web_premium_orders/{id} (status paid_pending_manual_activation и далее); после активации users/{uid}.progress.vip_* (vip_plan promo/promo_lifetime); Stripe-подписка у провайдера',
    writers: ['functions/src/web_checkout.ts:2957', 'functions/src/web_checkout.ts:3113', 'functions/src/web_checkout.ts:3311', 'functions/src/promo_codes.ts:262'],
    readers: ['functions/src/web_checkout.ts:3437', 'functions/src/web_activation_reminders.ts:26', 'functions/src/email_delivery_watchdog.ts:39'],
    fate: 'Решениями 2.0 не затронуто — продолжает работать.',
    decisions: [],
    status: 'keep',
    question: 'Q-233-2: Подтвердить, что веб-оплата и ручная активация остаются в 2.0 без изменений (заказы в статусе ожидания активации — уже оплачены).',
    risk: 'high',
    riskNote: 'Заказ, оплаченный и не активированный вручную, — деньги без права.',
    markers: ['collection:web_premium_orders', 'callable:webCheckoutCreate', 'callable:stripeWebhook', 'callable:paypalOrderCreate', 'callable:paypalOrderCapture', 'callable:webOrderStatus'],
    countPlan: [
      cnt('collection web_premium_orders', null, 'всего заказов'),
      cnt('collection web_premium_orders', ['status', '==', 'paid_pending_manual_activation'], 'оплачено, но не выдано'),
    ],
  },
  {
    id: 'plus_telegram_stars',
    product: 'Plus за Telegram Stars (бот)',
    money: 'real',
    source: 'telegramPremiumWebhook (successful_payment, валюта XTR) → заявка; ручная выдача adminActivateTelegramPremiumOrder',
    storage: 'telegram_premium_orders, telegram_premium_dead_letter; после активации users/{uid}.progress.vip_*',
    writers: ['functions/src/telegram_premium_bot.ts:670', 'functions/src/telegram_premium_bot.ts:1036', 'functions/src/telegram_premium_admin.ts:256'],
    readers: ['functions/src/telegram_premium_bot.ts:546', 'functions/src/admin_alert_sources_revenue.ts:183'],
    fate: 'Решениями 2.0 не затронуто.',
    decisions: [],
    status: 'keep',
    question: null,
    risk: 'medium',
    riskNote: 'Оплаченная, но не активированная заявка (как у веба).',
    markers: ['collection:telegram_premium_orders', 'collection:telegram_premium_dead_letter', 'callable:telegramPremiumWebhook', 'callable:adminActivateTelegramPremiumOrder', 'callable:adminInspectTelegramPromoCode'],
    countPlan: [cnt('collection telegram_premium_orders', null, 'всего заявок; по статусу — отдельным where')],
  },
  {
    id: 'plus_promo_and_certificates',
    product: 'Промокоды и подарочные сертификаты на Plus',
    money: 'mixed',
    source: 'promoCodeRedeem (код из админки, веб-заказа, сертификата, Telegram); партии сертификатов adminCreateGiftCertificateBatch',
    storage: 'promo_codes/{code}; users/{uid}/promo_redemptions/{code}; gift_certificate_deliveries; gift_certificate_archive; admin_gift_certificate_batch_operations; результат — progress.vip_* (vip_plan promo)',
    writers: ['functions/src/promo_codes.ts:182', 'functions/src/promo_codes.ts:423', 'functions/src/web_checkout.ts:2180', 'app/promo_code_client.ts'],
    readers: ['functions/src/promo_codes.ts:614', 'functions/src/admin_daily_digest.ts:785'],
    fate: 'Решениями 2.0 не затронуто; погашенный код = выданный VIP, хранится в progress.vip_* (derive).',
    decisions: [],
    status: 'keep',
    question: null,
    risk: 'medium',
    riskNote: 'Непогашенный сертификат, купленный за деньги на сайте, — право в будущем.',
    markers: [
      'collection:promo_codes', 'collection:promo_redemptions', 'collection:gift_certificate_deliveries', 'collection:gift_certificate_archive', 'collection:admin_gift_certificate_batch_operations',
      'callable:promoCodeRedeem', 'callable:adminListPromoCodes', 'callable:adminCreateGiftCertificateBatch', 'callable:adminGetGiftCertificateBatchOperation',
      'callable:adminCancelGiftCertificateBatchOperation', 'callable:adminListGiftCertificates', 'callable:adminDeleteGiftCertificate', 'callable:adminGetGiftCertificateDownload',
      'callable:adminUpdateGiftCertificateRecipient', 'callable:adminUpdateGiftCertificatePersonalization', 'callable:adminReplaceSyntheticGiftCertificate', 'callable:adminSendPreparedGiftCertificate',
    ],
    countPlan: [
      cnt('collection promo_codes', null, 'выпущено кодов'),
      cnt('collectionGroup promo_redemptions', null, 'погашено'),
    ],
  },
  {
    id: 'plus_vip_admin_referral',
    product: 'Plus-дни без стора: VIP из админки, реферальный VIP, квесты, рулетка',
    money: 'granted',
    source: 'adminGrantAccess (D86 «дни Plus»), adminMigrateLegacyAdminPremium, referralClaimVipReward, adminRepairPendingReferralPurchase, приз рулетки (дни)',
    storage: 'users/{uid}.progress.vip_active / vip_plan / vip_from / vip_until / vip_admin_override / vip_admin_grant_at / vip_granted_by / vip_revoked_at; progress.admin_premium_override; локально premium_vip_storage',
    writers: ['functions/src/admin_access_controls.ts:158', 'functions/src/referral.ts:415', 'functions/src/referral.ts:999', 'functions/src/admin_referral_purchase_repair.ts:313', 'functions/src/telegram_premium_admin.ts:212'],
    readers: ['app/cloud_sync.ts:450', 'app/premium_vip_storage.ts:113', 'functions/src/premium_status.ts:233'],
    fate: 'Сохраняется: ручные выдачи — монеты и дни Plus (D86); рулетка — дни Plus (D100). В Account V2 — derive (inventory p.plus).',
    decisions: ['D86', 'D99', 'D100'],
    status: 'keep',
    question: null,
    risk: 'medium',
    riskNote: 'Срок лежит строкой в progress; потеря при неверном слиянии аккаунтов.',
    markers: [
      'plus_field:vip_active', 'plus_field:vip_plan', 'plus_field:vip_from', 'plus_field:vip_until', 'plus_field:vip_admin_override', 'plus_field:vip_admin_grant_at',
      'plus_field:vip_granted_by', 'plus_field:vip_revoked_at', 'plus_field:vip_expiry', 'plus_field:vip_grant_at', 'plus_field:vip_migrated_from_admin_grant_at',
      'callable:adminGrantAccess', 'callable:adminMigrateLegacyAdminPremium', 'callable:referralClaimVipReward',
      'callable:adminRepairPendingReferralPurchase', 'callable:adminResumePendingReferralPurchaseRepair',
    ],
    countPlan: [
      cnt('collection users', ['progress.vip_active', '==', 'true'], 'активный VIP (строка)'),
      cnt('collection users', ['progress.vip_plan', '==', 'referral'], 'по каждому vip_plan отдельно: referral, promo, promo_lifetime, admin'),
    ],
  },
  {
    id: 'plus_intro_loyalty',
    product: 'Вводный полный доступ (онбординг) и подарок лояльности',
    money: 'granted',
    source: 'introFullAccessClaim (сервер, разово); подарок лояльности',
    storage: 'users/{uid}.progress.intro_access_until_ms / intro_access_granted_at_ms / loyalty_gift_until_ms / loyalty_gift_granted_at_ms; локально intro_full_access_*',
    writers: ['functions/src/gift_access.ts:67', 'functions/src/gift_access.ts:108', 'app/gift_access_cloud.ts:77'],
    readers: ['app/gift_access_cloud.ts:32', 'app/intro_full_access.ts:53', 'app/cloud_sync.ts:1141'],
    fate: 'Сохраняется: онбординг не трогаем (D115, D126). В Account V2 — derive из progress (PLUS_PROGRESS_NOTE).',
    decisions: ['D115', 'D126'],
    status: 'keep',
    question: null,
    risk: 'low',
    riskNote: 'Временный доступ, денег нет.',
    markers: [
      'plus_field:intro_access_until_ms', 'plus_field:intro_access_granted_at_ms', 'plus_field:loyalty_gift_until_ms', 'plus_field:loyalty_gift_granted_at_ms',
      'callable:introFullAccessClaim',
    ],
    countPlan: [cnt('collection users', ['progress.intro_access_until_ms', '!=', null], 'когда-либо получали вводный доступ')],
  },
  {
    id: 'plus_paid_achievement_markers',
    product: 'Метки «платил за Plus/Pro» для достижений',
    money: 'record',
    source: 'Вебхук RevenueCat при подтверждённой оплате',
    storage: 'users/{uid}.progress.achievement_access_plus_paid_v1 / achievement_access_pro_paid_v1',
    writers: ['functions/src/revenuecat_shards.ts:708'],
    readers: ['app/achievement_progress_v2.ts:12'],
    fate: 'Запись-история; в Account V2 derive (inventory p.plus). Достижения остаются (OD8).',
    decisions: ['OD8'],
    status: 'keep',
    question: null,
    risk: 'low',
    riskNote: 'Не право доступа.',
    markers: ['local_key:achievement_access_plus_paid_v1', 'local_key:achievement_access_pro_paid_v1'],
    countPlan: [cnt('collection users', ['progress.achievement_access_plus_paid_v1', '==', 'true'], '')],
  },
  {
    id: 'pearls_store_packs',
    product: 'Жемчуг за реальные деньги (пакеты 30/80/180/420)',
    money: 'real',
    source: 'RevenueCat consumable → вебхук; сейчас продукт помечен снятым (лог [D103] revenuecat_shard_product_retired)',
    storage: 'revenuecat_shard_transactions; revenuecat_shard_refunds; баланс users/{uid}.shards (+shard_log); локально shards_store_purchased_total_v1, незавершённые покупки app/shards_pending_grants.ts',
    writers: ['functions/src/revenuecat_shards.ts:895', 'app/shards_pending_grants.ts'],
    readers: ['functions/src/admin_shard_refunds.ts:86', 'functions/src/admin_analytics.ts:177', 'functions/src/auth_merge.ts:903'],
    fate: 'Сгорает без компенсации (D103, D70); пакеты в сторах снимает владелец. Остатки обнуляет только клиент (D84).',
    decisions: ['D70', 'D84', 'D103'],
    status: 'retire_decided',
    question: 'Q-233-3: Пакеты жемчуга уже сняты с продажи в App Store и Google Play? Покупка, прошедшая после снятия на сервере, теперь не начисляется ничего — нужен ли ручной возврат таким людям?',
    risk: 'high',
    riskNote: 'Реальные деньги без компенсации — риск жалоб/возвратов и ревью стора; решение владельца принято осознанно.',
    markers: [
      'store_product:phraseman_shards_30', 'store_product:phraseman_shards_80', 'store_product:phraseman_shards_180', 'store_product:phraseman_shards_420',
      'collection:revenuecat_shard_transactions', 'collection:revenuecat_shard_refunds', 'local_key:shards_store_purchased_total_v1', 'callable:adminListShardRefunds',
    ],
    countPlan: [
      cnt('collection revenuecat_shard_transactions', null, 'всего покупок жемчуга'),
      cnt('collection revenuecat_shard_refunds', null, 'возвраты'),
    ],
  },
  {
    id: 'pearls_balance',
    product: 'Жемчуг (shards) — заработанный/потраченный баланс и его журналы',
    money: 'in_app',
    source: 'Награды (уроки, репорты, рассылки, квесты, рулетка), траты (темы, ауры, заморозка, уроки, наборы, турниры)',
    storage: 'users/{uid}.shards (+shards_updated_*); users/{uid}/shard_log; локальные журналы shards_earn_op_ledger_v1 / shard_spend_op_ledger_v1 / client_shard_semantic_paid_v1; users/{uid}/external_economy_events',
    writers: ['app/shards_system.ts:626', 'app/shards_system.ts:806', 'app/pearl_retire_d70.ts', 'functions/src/external_economy_events.ts:52'],
    readers: ['app/economy/external_shard_event_sync.ts:199', 'functions/src/admin_user_profile.ts:382'],
    fate: 'Удаляется без компенсации; клиент один раз обнуляет (pearl_retire_d70, D84). Серверные данные — чистка после релиза (D90).',
    decisions: ['D70', 'D84', 'D90', 'D103'],
    status: 'retire_decided',
    question: null,
    risk: 'medium',
    riskNote: 'Открытые жемчугом уроки сохраняются отдельно (см. lessons_pearl_unlock).',
    markers: ['collection:shard_log', 'collection:shards_earn_op_ledger_v1', 'collection:shard_spend_op_ledger_v1', 'local_key:client_shard_semantic_paid_v1'],
    countPlan: [cnt('collection users', ['shards', '>', 0], 'аккаунты с ненулевым серверным остатком')],
  },
  {
    id: 'coins_wallet',
    product: 'Монеты (бывшие руны) — кошелёк',
    money: 'in_app',
    source: 'Начисления: practiceRuneGrant, videoWatchRunesClaim, levelSpinStarGrant, Шпиль (spire_coins), продажа набора автору, adminGrantReward (coins), рулетка (вечный Pro), квесты, gifts_to_coins; траты: ранг, визитка Про, наборы, диалоги/подсказки/реплики',
    storage: 'users/{uid}.stars (баланс), users/{uid}/star_operations/{opId}; users/{uid}.coinWalletLimitsV1, coinReconcileV1; локально журнал app/level_spin_star_grants.ts',
    writers: ['app/level_spin_star_grants.ts:1409', 'app/level_spin_star_grants.ts:2110', 'functions/src/stars_ledger.ts:574', 'functions/src/practice_rune_grant.ts:302', 'functions/src/video_watch_runes.ts:188', 'functions/src/level_spin_star_grant.ts:314', 'functions/src/admin_grant.ts:181', 'functions/src/coin_reconcile_v1.ts:313'],
    readers: ['app/runes_system.ts:79', 'app/level_spin_star_grants.ts:2642', 'functions/src/quests.ts:158'],
    fate: 'Остаётся на месте, руны → монеты 1:1 = переименование (D03, OD10; inventory r.runes_balance keep_in_place).',
    decisions: ['D03', 'D34', 'OD10'],
    status: 'keep',
    question: null,
    risk: 'high',
    riskNote: 'Главный кошелёк 2.0; два писателя (телефон и сервер) — сверка coinReconcileV1.',
    markers: ['collection:star_operations', 'callable:practiceRuneGrant', 'callable:videoWatchRunesClaim', 'callable:levelSpinStarGrant', 'callable:coinReconcileV1', 'callable:adminGrantReward'],
    countPlan: [
      cnt('collection users', ['stars.balance', '>', 0], 'аккаунты с монетами (путь поля проверить по stars_ledger.ts)'),
      cnt('collectionGroup star_operations', null, 'операций журнала'),
    ],
  },
  {
    id: 'learning_v2_wallet',
    product: 'Кошелёк курса Learning V2 (звёзды доступа / «руны курса»)',
    money: 'in_app',
    source: 'Награды за сессии курса, +1 за исправленную ошибку (grantMistakeCorrectionReward), бывшая биржа жемчуг→звёзды, settlement',
    storage: 'локально learning_v2_owner_repository:v1:<scope> (WalletStateV1, access_star); users/{uid}.v2_access_stars; v2_wallet_reward_receipts',
    writers: ['functions/src/learning_v2_wallet_reward_callable.ts:138', 'functions/src/mistake_practice_wallet_reward.ts:183', 'functions/src/coin_exchange_wallet_reward.ts:8'],
    readers: ['app/learning_v2_wallet_balance_store.ts:98', 'modules/learning-v2/contracts/wallet.ts:76'],
    fate: 'Не переносится (OD10, inventory r.stars_balance drop).',
    decisions: ['OD10'],
    status: 'retire_decided',
    question: null,
    risk: 'medium',
    riskNote: 'Видимый баланс исчезает; потратить его нельзя было нигде (PM-069).',
    markers: ['collection:v2_wallet_reward_receipts', 'callable:resolveLearningV2WalletRewardReceipt', 'callable:grantMistakeCorrectionReward'],
    countPlan: [cnt('collection users', ['v2_access_stars', '>', 0], 'серверная копия; локальный баланс посчитать нельзя')],
  },
  {
    id: 'learning_v2_access_gates',
    product: 'Открытые за звёзды «ворота» Learning V2',
    money: 'in_app',
    source: 'finalizeLearningV2AccessPurchase',
    storage: 'users/{uid}/v2_gate_receipts/{seasonId}__{gateId}',
    writers: ['functions/src/learning_v2_access_production_callable.ts:16'],
    readers: ['functions/src/learning_v2_access_production_callable.ts:23'],
    fate: 'Решения нет: Learning V2 включён в 2.0 (D96), а кошелёк звёзд не переносится (OD10).',
    decisions: ['D96', 'OD10'],
    status: 'needs_decision',
    question: 'Q-233-4: Открытые за звёзды ворота Learning V2 остаются открытыми в 2.0 (как уроки, открытые жемчугом)?',
    risk: 'medium',
    riskNote: 'Если ворота привязаны к звёздам, отказ от звёзд может закрыть купленное.',
    markers: ['callable:finalizeLearningV2AccessPurchase', 'literal:v2_gate_receipts'],
    countPlan: [cnt('collectionGroup v2_gate_receipts', null, 'открытые ворота')],
  },
  {
    id: 'coin_rank',
    product: 'Ранг монеты (покупка повышения за монеты)',
    money: 'in_app',
    source: 'upgradeCoinRank → prepareRuneSpend (локально)',
    storage: 'локально coin_rank_v1:<owner> (+ синхронизация префиксом в cloud_sync)',
    writers: ['app/coin_rank_upgrade_v1.ts:66'],
    readers: ['app/coin_rank_state_v1.ts:21', 'hooks/use_my_coin_rank.ts:17'],
    fate: 'Новый продукт 2.0, сохраняется (D34/D60).',
    decisions: ['D34', 'D60', 'D93'],
    status: 'keep',
    question: null,
    risk: 'medium',
    riskNote: 'Право живёт в локальном ключе + синхронизации, серверной копии нет.',
    markers: [],
    countPlan: [],
  },
  {
    id: 'profile_card_pro',
    product: 'Визитка «Про» (10 000 монет)',
    money: 'in_app',
    source: 'purchaseProfileCardPro (локально, списание монет)',
    storage: 'локально profile_card_pro_v1:<owner>; публичная проекция public_profiles',
    writers: ['app/profile_card_pro_v1.ts:65'],
    readers: ['app/profile_card_pro_state_v1.ts:14'],
    fate: 'Сохраняется (D73, D93, D114).',
    decisions: ['D73', 'D93', 'D114'],
    status: 'keep',
    question: null,
    risk: 'medium',
    riskNote: 'Только локальный ключ + синхронизация.',
    markers: [],
    countPlan: [],
  },
  {
    id: 'cosmetics_avatars_auras',
    product: 'Косметика: образы аватара и ауры (за жемчуг и руны, плюс подарки)',
    money: 'in_app',
    source: 'Старые экраны кастомизации (удалены), подарки',
    storage: 'progress/локально custom_avatar_owned_v1, custom_avatar_gift_owned_v1, avatar_aura_owned_v1, avatar_aura_gift_owned_v1, user_avatar_aura',
    writers: ['app/cloud_sync.ts:391', 'app/cloud_sync.ts:2533'],
    readers: ['app/cloud_sync.ts:1608', 'constants/customization_storage_keys.ts:4'],
    fate: 'Удаляется целиком, включая купленное (D102, D108); неиспользованные подарки — монетами по таблице gifts_to_coins (D53, D57).',
    decisions: ['D57', 'D61', 'D102', 'D108'],
    status: 'needs_decision',
    question: 'Q-233-5: Купленные за РУНЫ (теперь монеты) образы/ауры удаляются без возврата монет? MIGRATIONS требует «индивидуальную политику ledger», D108 говорит только «удаляются».',
    risk: 'medium',
    riskNote: 'Руны — те же монеты 2.0: человек видит, что потраченное исчезло.',
    markers: ['local_key:custom_avatar_owned_v1', 'local_key:custom_avatar_gift_owned_v1', 'local_key:avatar_aura_owned_v1', 'local_key:avatar_aura_gift_owned_v1'],
    countPlan: [cnt('collection users', ['progress.avatar_aura_owned_v1', '!=', null], 'и отдельно custom_avatar_owned_v1')],
  },
  {
    id: 'themes',
    product: 'Темы оформления (раньше за жемчуг)',
    money: 'in_app',
    source: 'Покупка темы за жемчуг (удалена), «дедушкины» темы',
    storage: 'owned_theme_modes_v1, grandfathered_theme_modes_v1 (локально + progress)',
    writers: ['app/theme_ownership_store.ts:87', 'app/theme_ownership_merge.ts:48'],
    readers: ['app/cloud_sync.ts:379'],
    fate: 'Все темы бесплатны (D119) — купленное право стало шире, потери нет.',
    decisions: ['D38', 'D119'],
    status: 'keep',
    question: null,
    risk: 'low',
    riskNote: 'Потраченный жемчуг не возвращается (D70).',
    markers: ['local_key:owned_theme_modes_v1'],
    countPlan: [],
  },
  {
    id: 'streak_freeze',
    product: 'Заморозка серии (купленная за жемчуг) и бесплатная заморозка Plus',
    money: 'in_app',
    source: 'Покупка заморозки (удалена); ежемесячная бесплатная для Plus',
    storage: 'локально/progress streak_freeze, chain_shield, premium_free_freeze_used',
    writers: ['app/premium_freeze_allowance.ts:62'],
    readers: ['app/(tabs)/home.tsx:2449', 'app/premium_freeze_allowance.ts:48'],
    fate: 'Купленные заморозки не переносятся; у Plus бесплатная остаётся (D101, D107, OD7).',
    decisions: ['D101', 'D107', 'OD7'],
    status: 'retire_decided',
    question: null,
    risk: 'low',
    riskNote: '',
    markers: [],
    countPlan: [],
  },
  {
    id: 'boosts_season_pass',
    product: 'Бусты (клубный, лиги, XP), Season Pass, щит цепочки',
    money: 'in_app',
    source: 'Покупка за жемчуг (Season Pass 350), подарки',
    storage: 'club_gift_free_boost_v1, gift_xp_multiplier, chain_shield (progress/root); локально season_pass_gift_inventory_v2:, season_pass_claim_composite_v1:',
    writers: ['app/cloud_sync.ts:666'],
    readers: ['app/gifts_to_coins_inventory_v1.ts:55'],
    fate: 'Удаляются вместе с XP и лигой (D58, D09); незабранные награды Season Pass — монеты по таблице (D53); потраченный жемчуг не компенсируется (D70/D103, PM-180).',
    decisions: ['D09', 'D53', 'D58', 'D70', 'D103'],
    status: 'retire_decided',
    question: null,
    risk: 'low',
    riskNote: '',
    markers: [],
    countPlan: [],
  },
  {
    id: 'energy',
    product: 'Энергия (запас, бонусная энергия из подарков, пропуск дневной квоты)',
    money: 'in_app',
    source: 'Восстановление по времени, подарки (бонус), пропуск квоты за жемчуг (удалён, но прочитанные пропуска действуют)',
    storage: 'локально energy_state (+progress.energy_state), bonus energy (bonus_energy_store), revenue_quota_pass:v1:*',
    writers: ['app/energy_session_operation_ledger.ts:892', 'app/energy_system.ts:152', 'app/bonus_energy_store.ts:39'],
    readers: ['app/energy_system.ts:74', 'app/revenue_quota_store.ts:53'],
    fate: 'Запас 5, сверх — обрезается до 5 (D06, D98); энергия из подарков в компенсации = 0 монет (gifts_to_coins_table ENERGY_ITEM_COINS).',
    decisions: ['D06', 'D72', 'D87', 'D98'],
    status: 'retire_decided',
    question: null,
    risk: 'low',
    riskNote: 'MIGRATIONS упоминает «согласованное разовое заполнение» — D98 закрыло это обрезкой.',
    markers: [],
    countPlan: [],
  },
  {
    id: 'dialog_rune_unlocks',
    product: 'Диалоги, купленные за руны',
    money: 'in_app',
    source: 'buyDialogAccessLocally (сейчас выключено: rank_access_only) → aiDialogSyncPurchase',
    storage: 'локально ai_dialog_owned_ids_v1:<stableId>, ai_dialog_owned_outbox_v1:<stableId>; users/{uid}/dialog_access/owned',
    writers: ['app/ai_dialog_ownership.ts:138', 'functions/src/ai_dialog_sync_purchase.ts:96'],
    readers: ['app/ai_dialog_ownership.ts:62'],
    fate: 'Старые покупки диалогов за руны не учитываются; доступ — только ранг монеты (D124, D05). aiDialogSyncPurchase в index.ts не экспортируется.',
    decisions: ['D05', 'D124'],
    status: 'needs_decision',
    question: 'Q-233-6: За диалоги, купленные рунами, вернуть монеты (сумма из журнала покупок) или «не учитываются» без возврата? D124 говорит только о доступе. Подколлекция users/{uid}/dialog_access нет в инвентаре Account V2 → перенос встанет в HOLD unknown_field.',
    risk: 'medium',
    riskNote: 'Потраченные монеты без права.',
    markers: ['local_key:ai_dialog_owned_ids_v1', 'local_key:ai_dialog_owned_outbox_v1', 'collection:dialog_access', 'callable:aiDialogSyncPurchase'],
    countPlan: [cnt('collectionGroup dialog_access', null, 'аккаунты с серверной записью владения')],
  },
  {
    id: 'dialog_extra_replies',
    product: '+10 ответов в Диалогах за 300 монет',
    money: 'in_app',
    source: 'buyDialogExtraRepliesLocally → aiDialogBuyExtraReplies',
    storage: 'premium_dialog_quotas/{quota} поле extraCapThisMonth; users/{uid}/reward_claims/dialog_extra_replies_*; локально ai_dialog_extra_replies_*',
    writers: ['app/ai_dialog_extra_replies_client.ts:216', 'functions/src/ai_dialog_extra_replies.ts:172'],
    readers: ['functions/src/premium_dialog.ts:284', 'functions/src/dialog_quota_contract.ts:45'],
    fate: 'Квота Free — 30 ответов в месяц (D111); судьба покупки «+10» в 2.0 не записана.',
    decisions: ['D111'],
    status: 'needs_decision',
    question: 'Q-233-7: Покупка «+10 ответов за 300 монет» остаётся в 2.0? Купленные и неиспользованные в этом месяце — сохраняются в месячном счётчике?',
    risk: 'low',
    riskNote: 'Расходуется в пределах месяца.',
    markers: ['collection:premium_dialog_quotas', 'collection:reward_claims', 'callable:aiDialogBuyExtraReplies'],
    countPlan: [cnt('collectionGroup reward_claims', null, 'включает и другие награды — фильтровать по префиксу id нельзя агрегатом; нужен отдельный тип поля')],
  },
  {
    id: 'dialog_quota_and_billing',
    product: 'Квота ответов Диалогов и подсказки за монеты',
    money: 'in_app',
    source: 'Сервер считает ответы; подсказка — buyDialogHintLocally (разовая трата)',
    storage: 'premium_dialog_quotas, premium_dialog_billing; локально счётчик подсказок',
    writers: ['functions/src/premium_dialog.ts:68', 'functions/src/premium_dialog.ts:1416', 'app/ai_dialog_hint_economy.ts:123'],
    readers: ['functions/src/dialog_quota_contract.ts:33'],
    fate: 'Free 30/месяц, Plus — тихий потолок 300/сутки (D111, D123).',
    decisions: ['D111', 'D123'],
    status: 'keep',
    question: null,
    risk: 'low',
    riskNote: '',
    markers: ['collection:premium_dialog_billing'],
    countPlan: [],
  },
  {
    id: 'community_pack_purchase',
    product: 'Покупка набора сообщества (за руны/монеты; раньше — за жемчуг)',
    money: 'in_app',
    source: 'buyCommunityPackLocally (локально, монеты); старые покупки за жемчуг — community_pack_purchases',
    storage: 'локально community_pack_paid_ids_v1:<stableId>, community_owned_pack_ids_v1, community_owned_pack_titles_v1; community_pack_purchases (legacy)',
    writers: ['app/community_packs/packPurchase.ts:79', 'app/community_packs/schema.ts:34'],
    readers: ['app/target_storage_keys.ts:559', 'functions/src/account_delete.ts:187'],
    fate: 'Наборы сообщества остаются, цена в монетах (D85); членство переносится в Account V2 (inventory p.community_packs carry). Возврат покупки админом удалён (D110).',
    decisions: ['D68', 'D85', 'D110'],
    status: 'keep',
    question: null,
    risk: 'medium',
    riskNote: 'Список владения — локальный ключ + синхронизация.',
    markers: ['local_key:community_pack_paid_ids_v1', 'local_key:community_owned_pack_ids_v1', 'local_key:community_owned_pack_titles_v1', 'collection:community_pack_purchases'],
    countPlan: [cnt('collection community_pack_purchases', null, 'старые покупки за жемчуг')],
  },
  {
    id: 'community_pack_author_payout',
    product: 'Выплата автору набора за продажу',
    money: 'in_app',
    source: 'communitySyncPackRuneSale (сервер: монеты автору, opId pack_sale:{pack}:{buyer})',
    storage: 'community_pack_rune_sales; users/{author}/community_seller_inbox; users/{author}/star_operations',
    writers: ['functions/src/community_pack_rune_sale.ts:140', 'functions/src/community_pack_rune_sale.ts:253'],
    readers: ['app/community_packs/schema.ts:40'],
    fate: 'Выплата монетами (D85).',
    decisions: ['D85'],
    status: 'keep',
    question: null,
    risk: 'low',
    riskNote: '',
    markers: ['collection:community_pack_rune_sales', 'collection:community_seller_inbox', 'collection:seller_inbox', 'callable:communitySyncPackRuneSale'],
    countPlan: [cnt('collection community_pack_rune_sales', null, 'продаж')],
  },
  {
    id: 'pack_gifts',
    product: 'Подарочные наборы карточек (ваучеры, гранты из рассылок)',
    money: 'granted',
    source: 'communityRedeemPackGiftVoucher, flashcardPackGiftRedeem, flashcardPackGiftSyncState, flashcardPackGiftGrantGlobalBroadcast',
    storage: 'flashcard_pack_gift_claims, flashcard_pack_gift_entitlements, flashcard_pack_gift_grants; локально flashcard_pack_gift_inventory_v2',
    writers: ['functions/src/community_packs.ts:1137', 'functions/src/community_packs.ts:1280', 'functions/src/global_broadcast_claim.ts:181'],
    readers: ['app/flashcards/pack_trial_gift.ts:38'],
    fate: 'Подарки убираются (D09); официальные наборы удалены (D68). Callable всё ещё экспортированы в functions/src/index.ts:602–605.',
    decisions: ['D09', 'D68'],
    status: 'needs_decision',
    question: 'Q-233-8: Непогашенные подарочные ваучеры на наборы СООБЩЕСТВА — погасить автоматически в библиотеку, перевести в монеты по таблице или аннулировать? И снимать ли эти 4 callable (D78)?',
    risk: 'low',
    riskNote: '',
    markers: [
      'collection:flashcard_pack_gift_claims', 'collection:flashcard_pack_gift_entitlements', 'collection:flashcard_pack_gift_grants',
      'callable:communityRedeemPackGiftVoucher', 'callable:flashcardPackGiftRedeem', 'callable:flashcardPackGiftSyncState', 'callable:flashcardPackGiftGrantGlobalBroadcast',
    ],
    countPlan: [cnt('collection flashcard_pack_gift_entitlements', null, 'выданные права на подарочные наборы')],
  },
  {
    id: 'official_packs',
    product: 'Официальные наборы карточек (купленные за жемчуг)',
    money: 'in_app',
    source: 'Магазин наборов (удалён)',
    storage: 'flashcards_owned_packs_v1, flashcards_market_dev_owned_v1 (локально + progress)',
    writers: ['app/cloud_sync.ts:491'],
    readers: ['app/target_storage_keys.ts:576'],
    fate: 'Удаляются вместе с разделом жемчуга без компенсации (D68; inventory p.official_packs drop).',
    decisions: ['D68'],
    status: 'retire_decided',
    question: null,
    risk: 'low',
    riskNote: '',
    markers: ['local_key:flashcards_owned_packs_v1', 'local_key:flashcards_market_dev_owned_v1'],
    countPlan: [],
  },
  {
    id: 'lessons_pearl_unlock',
    product: 'Уроки V1, открытые за жемчуг',
    money: 'in_app',
    source: 'buyLessonWithPearls (покупка удалена)',
    storage: 'локально lessons_pearl_unlocked_v1 (+семантический журнал жемчуга)',
    writers: ['app/economy/client_shard_semantic_reducer.ts:112'],
    readers: ['app/lessons_pearl_unlock_storage.ts:17', 'app/lesson_lock_system.ts:161'],
    fate: 'Открытые уроки остаются открытыми (PM-148-A2, D121, D122).',
    decisions: ['D121', 'D122'],
    status: 'keep',
    question: null,
    risk: 'medium',
    riskNote: 'Ключ локальный: потеря при переустановке без синхронизации.',
    markers: ['local_key:lessons_pearl_unlocked_v1'],
    countPlan: [],
  },
  {
    id: 'arena_stars_and_shop',
    product: 'Звёзды Арены и купленные за них украшения',
    money: 'in_app',
    source: 'Матчи Арены, магазин звёзд (клиент удалён D83)',
    storage: 'arena_v2_star_ledger, arena_v2_entitlements; progress arena_*',
    writers: ['functions/src/arena_expansion_core.ts:26'],
    readers: ['functions/src/account_delete.ts:318'],
    fate: 'Магазин удалён, купленные украшения «в данных не трогаем» (D79); при этом данные Арены чистятся после релиза (D90).',
    decisions: ['D79', 'D83', 'D90'],
    status: 'needs_decision',
    question: 'Q-233-9: D79 «купленные украшения не трогаем» и D90 «данные Арены чистятся» противоречат для arena_v2_entitlements. Чистка D90 исключает эти права или нет? Остаток звёзд Арены — без компенсации?',
    risk: 'low',
    riskNote: '',
    markers: ['literal:arena_v2_star_ledger', 'literal:arena_v2_entitlements'],
    countPlan: [cnt('collection arena_v2_entitlements', null, '')],
  },
  {
    id: 'tournaments_bank',
    product: 'Турниры: взнос/банк в жемчуге',
    money: 'in_app',
    source: 'tournamentClaimReward (не экспортирован), еженедельная выплата',
    storage: 'коллекции турниров; жемчуг',
    writers: ['functions/src/tournaments.ts:4516'],
    readers: [],
    fate: 'Турниры выключены, жемчуг удалён без компенсации (D70).',
    decisions: ['D70', 'D74'],
    status: 'retire_decided',
    question: null,
    risk: 'low',
    riskNote: '0 вызовов за 60 дней (functions/src/index.ts:969).',
    markers: ['callable:tournamentClaimReward'],
    countPlan: [],
  },
  {
    id: 'max_subscription',
    product: 'Подписка MAX (phraseman_max_monthly_v1)',
    money: 'real',
    source: 'RevenueCat; клиент чек больше не признаёт, сверка отвечает retired_max_product',
    storage: 'RevenueCat / стор',
    writers: [],
    readers: ['app/revenuecat_premium_access.ts:7', 'functions/src/revenuecat_reconcile.ts:355'],
    fate: 'MAX законсервирован (D11, пломба 2026-09-04).',
    decisions: ['D11'],
    status: 'needs_decision',
    question: 'Q-233-10: Есть ли ещё активные подписки MAX в сторе? Если да — стор продолжает списывать деньги без доступа: отменить и вернуть деньги (делает владелец в консолях сторов)?',
    risk: 'high',
    riskNote: 'Возможное списание без права.',
    markers: ['store_product:phraseman_max_monthly_v1'],
    countPlan: [],
  },
  {
    id: 'max_voice_minutes',
    product: 'Минуты голосового звонка MAX (30/120/300) и пробные минуты',
    money: 'real',
    source: 'RevenueCat consumable → вебхук (ветка voice_minutes всё ещё начисляет); adminGrantVoiceMinutes; voiceMinuteWalletMine',
    storage: 'voice_minute_wallets, voice_minute_events, voice_minute_denials; voice_call_quotas (пробник/резервы), voice_call_billing',
    writers: ['functions/src/revenuecat_shards.ts:1342', 'functions/src/voice_minutes.ts:447', 'functions/src/admin_voice_minutes.ts:92', 'functions/src/max_voice_quota.ts:461'],
    readers: ['functions/src/voice_minutes_api.ts:46', 'modules/voice_minutes/catalog.ts:6'],
    fate: 'Законсервировано (D11); код и данные не удаляются.',
    decisions: ['D11', 'D81'],
    status: 'needs_decision',
    question: 'Q-233-11: Остатки купленных минут — заморозить до возврата MAX или вернуть деньги? Сняты ли пакеты минут с продажи (вебхук всё ещё зачисляет минуты), и оставлять ли кнопку выдачи минут в админке?',
    risk: 'high',
    riskNote: 'Оплаченный баланс, которым нельзя воспользоваться, пока раздел закрыт.',
    markers: [
      'store_product:phraseman_voice_minutes_30', 'store_product:phraseman_voice_minutes_120', 'store_product:phraseman_voice_minutes_300',
      'collection:voice_minute_wallets', 'collection:voice_minute_events', 'collection:voice_minute_denials', 'collection:voice_call_quotas', 'collection:voice_call_billing',
      'callable:adminGrantVoiceMinutes', 'callable:voiceMinuteWalletMine', 'callable:voiceMinuteDevGrant',
    ],
    countPlan: [
      cnt('collection voice_minute_wallets', null, 'кошельков минут'),
      cnt('collection voice_minute_events', ['kind', '==', 'purchase'], 'покупок (имя поля проверить по voice_minutes.ts)'),
    ],
  },
  {
    id: 'referral_roulette',
    product: 'Реферальная рулетка: спины и призы',
    money: 'granted',
    source: 'referralClaimSpin (за приглашённого) → referralSpin; призы — дни Plus или монеты для вечного Pro',
    storage: 'users/{uid}/referral_spin_credit_ledger, users/{uid}/referral_spins; progress referral_spin*',
    writers: ['functions/src/referral_claim_spin.ts:69', 'functions/src/referral_spin.ts:138', 'functions/src/referral_spin.ts:430'],
    readers: ['app/roulette_spin_client.ts:244', 'functions/src/admin_referrals.ts:1021'],
    fate: 'Остаётся (D80, D99, D100, D105, D106).',
    decisions: ['D80', 'D99', 'D100', 'D105', 'D106'],
    status: 'keep',
    question: null,
    risk: 'low',
    riskNote: 'Старые призы жемчугом (prizeKind pearls) — история.',
    markers: ['collection:referral_spin_credit_ledger', 'collection:referral_spins', 'collection:referral_spin_credits_v1', 'callable:referralSpin', 'callable:referralClaimSpin', 'callable:adminSpinStats', 'callable:adminSpinLogs', 'callable:adminSetSpinWeights'],
    countPlan: [cnt('collectionGroup referral_spin_credit_ledger', null, 'кредиты спинов, в т.ч. неиспользованные')],
  },
  {
    id: 'gifts_level_spins',
    product: 'Подарки, спины уровня (бесплатные и платные), дневной путь',
    money: 'in_app',
    source: 'Уровни/подарки (удалены); платный спин за руны',
    storage: 'users/{uid}/level_spin_credits, level_spin_results; level_gift_reservations; локально paid_level_spin_envelope_v1 / paid_level_spin_outbox_v1; gifts_to_coins_migrations/{uid}',
    writers: ['app/gifts_to_coins_migration_v1.ts:516', 'functions/src/gifts_to_coins_report.ts:98', 'functions/src/level_spin_star_grant.ts:314'],
    readers: ['functions/src/coin_reconcile_v1.ts:227', 'app/gifts_to_coins_table_v1.ts:24'],
    fate: 'Неиспользованное — в монеты при первом запуске 2.0, молча; таблица «Средне» medium.v2 (платный спин ≥ цены, потолок 20 бесплатных, жемчуг 0) (D51, D53, D70).',
    decisions: ['D09', 'D51', 'D53', 'D65', 'D70'],
    status: 'convert_decided',
    question: null,
    risk: 'medium',
    riskNote: 'Компенсация считается только на телефоне; сервер видит одну строку-итог.',
    markers: ['collection:level_spin_results', 'literal:level_spin_credits', 'collection:gifts_to_coins_migrations', 'collection:level_gift_effect_receipts_v1', 'collection:level_reward_spin_materialized_results_v1', 'local_key:paid_level_spin_envelope_v1', 'local_key:paid_level_spin_outbox_v1', 'callable:giftsToCoinsMigrationReport'],
    countPlan: [cnt('collection gifts_to_coins_migrations', null, 'аккаунтов, прошедших компенсацию (после релиза)')],
  },
  {
    id: 'friend_gifts',
    product: 'Подарки друзьям',
    money: 'in_app',
    source: 'Подарок другу (удалён)',
    storage: 'friend_gifts_sent / friend_gifts_received / friend_gift_history / friend_gift_daily_limits',
    writers: [],
    readers: ['functions/src/account_delete.ts:274'],
    fate: 'Подарки убраны (D09).',
    decisions: ['D09'],
    status: 'retire_decided',
    question: null,
    risk: 'low',
    riskNote: '',
    markers: ['collection:friend_gift_history', 'collection:friend_gift_daily_limits'],
    countPlan: [],
  },
  {
    id: 'broadcast_report_rewards',
    product: 'Награды рассылок, за репорты и админ-награды во «входящих»',
    money: 'granted',
    source: 'globalBroadcastClaim, claimReportReward (ответ на репорт), adminGrantReward',
    storage: 'users/{uid}/shard_rewards, users/{uid}/reward_claims',
    writers: ['functions/src/admin_grant.ts:190', 'functions/src/global_broadcast_claim.ts:102', 'functions/src/report_replies.ts:525', 'functions/src/referral.ts:1164'],
    readers: ['app/global_broadcast_modal.ts:413', 'functions/src/admin_user_profile.ts:504'],
    fate: 'Жемчуг в наградах заменён монетами; репорт — 300/600/1000 монет (D104, D109).',
    decisions: ['D104', 'D109'],
    status: 'convert_decided',
    question: null,
    risk: 'low',
    riskNote: 'Незабранные старые награды жемчугом — сгорают (D70).',
    markers: ['collection:shard_rewards', 'callable:globalBroadcastClaim', 'callable:claimReportReward'],
    countPlan: [cnt('collectionGroup shard_rewards', null, 'строки наград во входящих')],
  },
  {
    id: 'quests',
    product: 'Квесты: дни Plus и жемчуг за выполнение',
    money: 'granted',
    source: 'questClaimReward',
    storage: 'reward_claims + external_economy_events; дни Plus в premium/vip',
    writers: ['functions/src/quests.ts:351', 'functions/src/quests.ts:405'],
    readers: [],
    fate: 'Решения в 2.0 нет (блок «Сегодня» D49 — новая механика).',
    decisions: ['D49'],
    status: 'needs_decision',
    question: 'Q-233-12: Квесты (questClaimReward, награда — дни Plus и жемчуг) остаются в 2.0 или удаляются? Если остаются — жемчужную часть заменить монетами?',
    risk: 'low',
    riskNote: '',
    markers: ['callable:questClaimReward'],
    countPlan: [],
  },
  {
    id: 'collectibles',
    product: 'Коллекционные предметы (сеты, бонус жемчуга за сет)',
    money: 'granted',
    source: 'collectiblesClaimDrop (выключенная совместимая заглушка)',
    storage: 'collectibles_owned_v1, collectibles_state_v1 (server-owned в progress + локально)',
    writers: ['functions/src/collectibles_retired.ts:28', 'app/collectibles/storage.ts:195'],
    readers: ['app/collectibles/storage.ts:101'],
    fate: 'В inventory Account V2 — hold no_owner_decision (p.collectibles).',
    decisions: [],
    status: 'needs_decision',
    question: 'Q-233-13: Коллекции удаляются в 2.0? Если да — компенсация не нужна (наград за сет жемчугом больше нет)?',
    risk: 'low',
    riskNote: '',
    markers: ['local_key:collectibles_owned_v1', 'callable:collectiblesClaimDrop'],
    countPlan: [cnt('collection users', ['progress.collectibles_owned_v1', '!=', null], '')],
  },
]);

/**
 * Найденное в коде, что НЕ является правом/покупкой. Причина обязательна.
 */
export const IGNORED = Object.freeze({
  'store_product:phraseman_premium_write_paths': 'имя набора путей записи в cloud_sync, не товар',
  'collection:community_pack_drafts': 'черновики наборов — контент, не покупка',
  'collection:community_pack_ratings': 'оценки наборов',
  'collection:community_pack_submissions': 'модерация наборов',
  'collection:community_packs': 'каталог наборов; покупка — community_pack_purchase',
  'collection:content_factory_learning_v2_session_shard_receipts': 'нарезка контента V2 («shard» = кусок), не жемчуг',
  'collection:feedback_submission_quotas': 'антиспам отзывов',
  'collection:stats_insights_quotas': 'лимит ИИ-статистики, не покупка',
  'collection:weekly_review_quotas': 'лимит ИИ-обзора недели, не покупка',
  'collection:premium_dialog_rate_limits': 'антиспам диалогов',
  'collection:premium_dialog_translations': 'кэш переводов',
  'collection:telegram_premium_bot': 'конфиг бота',
  'collection:telegram_premium_bot_sessions': 'сессии диалога с ботом',
  'collection:shard_survey_rate_limits': 'лимит опросов (награда 0)',
  'collection:voice_call_reviews': 'отзывы о звонке MAX',
  'local_key:dev_unlocked_drafts_v1': 'дев-режим черновиков уроков',
  'callable:accountClaimMine': 'присвоение аккаунта (вход), не ценность',
  'callable:adminGetMaxVoiceOpsDashboard': 'дашборд MAX (чтение)',
  'callable:adminListMaxVoiceFeedback': 'отзывы MAX (чтение)',
  'callable:submitMaxVoiceFeedback': 'отзыв о звонке',
  'callable:maxVoiceClearMemory': 'память репетитора MAX',
  'callable:maxVoiceDeleteMemoryItem': 'память репетитора MAX',
  'callable:maxVoiceGetMemory': 'память репетитора MAX',
  'callable:maxVoiceUpdateMemory': 'память репетитора MAX',
  'callable:maxVoiceConfigAdmin': 'конфиг MAX',
  'callable:maxVoiceSafetyReport': 'безопасность звонка',
  'callable:maxVoiceMint': 'расходует минуты MAX — учтено в max_voice_minutes через voice_call_quotas',
  'callable:maxVoicePreflight': 'проверка перед звонком MAX',
  'callable:maxVoiceHeartbeat': 'пульс звонка MAX',
  'callable:maxVoiceSessionEnd': 'итог звонка (списание минут) — учтено в max_voice_minutes',
  'callable:maxVoiceFinalize': 'итог звонка — учтено в max_voice_minutes',
  'callable:adminIssueV2EpisodeVoiceReceipt': 'квитанция озвучки контента V2',
  'callable:dialogueV2FreeformPreparedBotVoiceResolve': 'озвучка реплики бота',
  'callable:jarvisTelegramApprovalWebhook': 'согласования Джарвиса в Telegram',
  'callable:friendsTogetherClaimLevel': 'выключенная заглушка (всегда отказ), наград не выдаёт',
});

// ─── сканер (только чтение) ────────────────────────────────────────────────

function* walk(abs) {
  let st;
  try {
    st = statSync(abs);
  } catch (error) {
    // зачем: корень может отсутствовать в урезанной копии — не роняем прогон, но говорим об этом.
    console.error(`[PM233-LEDGER] skip missing root ${relative(REPO, abs)}: ${error.code ?? error.message}`);
    return;
  }
  if (st.isFile()) { yield abs; return; }
  for (const name of readdirSync(abs)) {
    const child = join(abs, name);
    const rel = relative(REPO, child).split(sep).join('/');
    const childStat = statSync(child);
    if (childStat.isDirectory()) {
      if (!SKIP_DIR.test(rel)) yield* walk(child);
    } else if (SCAN_EXT.test(name) && !SKIP_FILE.test(name) && childStat.size < 6_000_000) {
      yield child;
    }
  }
}

/**
 * `literal:<name>` — имя, которое не ловится общими правилами (объектный литерал,
 * путь в шаблонной строке). Не участвует в поиске новых маркеров, только в проверке
 * «не протух ли» (имя ещё встречается в коде в кавычках или как сегмент пути).
 */
function literalRules() {
  const names = new Set(LEDGER.flatMap((row) => row.markers).filter((m) => m.startsWith('literal:')).map((m) => m.slice(8)));
  return [...names].map((name) => ({ kind: 'literal', re: new RegExp(`['"\`/](${name})['"\`/]`, 'g') }));
}

/** Возвращает Map `kind:value` → ['file:line', ...]. */
export function scanMarkers(repo = REPO) {
  const found = new Map();
  const rules = [...MARKER_RULES, ...literalRules()];
  for (const root of SCAN_ROOTS) {
    for (const file of walk(join(repo, root))) {
      const text = readFileSync(file, 'utf8');
      const rel = relative(repo, file).split(sep).join('/');
      for (const rule of rules) {
        rule.re.lastIndex = 0;
        let match;
        while ((match = rule.re.exec(text)) !== null) {
          const value = match[1] ?? match[0];
          if (rule.keep && !rule.keep(value)) continue;
          const key = `${rule.kind}:${value}`;
          const line = text.slice(0, match.index).split('\n').length;
          if (!found.has(key)) found.set(key, []);
          found.get(key).push(`${rel}:${line}`);
        }
      }
    }
  }
  return found;
}

export function buildReport(found = scanMarkers()) {
  const ledgerMarkers = new Map();
  for (const row of LEDGER) for (const marker of row.markers) ledgerMarkers.set(marker, row.id);
  const uncovered = [...found.keys()].filter((key) => !ledgerMarkers.has(key) && !(key in IGNORED)).sort();
  const stale = [...ledgerMarkers.keys()].filter((key) => !found.has(key)).sort();
  const staleIgnored = Object.keys(IGNORED).filter((key) => !found.has(key)).sort();
  const rows = LEDGER.map((row) => ({
    ...row,
    prodVolume: U, // PM-233-A2: прод не читался — объём неизвестен, а не 0.
    liveLocations: Object.fromEntries(row.markers.map((m) => [m, (found.get(m) ?? []).slice(0, 5)])),
  }));
  return {
    baseline: 'code-only dry run; prod/emulator not read',
    products: LEDGER.length,
    needsDecision: LEDGER.filter((r) => r.status === 'needs_decision').map((r) => r.id),
    markersFound: found.size,
    uncovered,
    stale,
    staleIgnored,
    rows,
  };
}

/** План агрегатов для владельца. НЕ исполняется этим скриптом. */
export function prodCountPlan() {
  return {
    executes: false,
    howToRun: 'Только по команде владельца: отдельный read-only запуск firebase-admin, ТОЛЬКО .count()/агрегаты, без выгрузки документов и uid. Результат записать в evidence как число + дата + SHA.',
    queries: LEDGER.flatMap((row) => row.countPlan.map((q) => ({ product: row.id, ...q, result: U }))),
    notCountableByAggregate: LEDGER.filter((row) => row.countPlan.length === 0).map((row) => row.id),
  };
}

function printTable(report) {
  console.log(`PM-233 ledger: products=${report.products} markers=${report.markersFound} uncovered=${report.uncovered.length} stale=${report.stale.length}`);
  for (const row of report.rows) {
    console.log(`- ${row.id} [${row.status}] risk=${row.risk} prod=${row.prodVolume} :: ${row.product}`);
  }
  if (report.uncovered.length) console.log(`UNCOVERED: ${report.uncovered.join(', ')}`);
  if (report.stale.length) console.log(`STALE: ${report.stale.join(', ')}`);
}

function main(argv) {
  if (argv.includes('--prod') || argv.includes('--execute')) {
    console.error('[PM233-LEDGER] refused: prod access is not implemented here. Use --prod-count-plan and run aggregates only on owner command.');
    return 2;
  }
  if (argv.includes('--prod-count-plan')) {
    console.log(JSON.stringify(prodCountPlan(), null, 2));
    return 0;
  }
  const report = buildReport();
  if (argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printTable(report);
  }
  if (argv.includes('--check') && (report.uncovered.length || report.stale.length || report.staleIgnored.length)) {
    console.error(`[PM233-LEDGER] check failed uncovered=${report.uncovered.length} stale=${report.stale.length} staleIgnored=${report.staleIgnored.length}`);
    return 1;
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
