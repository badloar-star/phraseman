import fs from 'node:fs';
import path from 'node:path';

/**
 * СТОРОЖ КОНТРАКТА ДАННЫХ ДЖАРВИСА.
 *
 * зачем (владелец, 2026-08-02): впереди много рефакторингов. Джарвис читает
 * чужие коллекции и чужие поля, но НЕ участвует в их изменении. Если кто-то
 * переименует поле или коллекцию, департамент не упадёт — он просто начнёт
 * возвращать нули, то есть будет БОДРО ВРАТЬ, что всё хорошо. Молчаливая ложь
 * опаснее явной поломки: её никто не заметит, пока не потеряются деньги или
 * ребёнок не останется без разбора жалобы.
 *
 * Поэтому связь «департамент → поле-источник» закреплена здесь. Тест ломается,
 * когда поле пропало из места записи ИЛИ из читателя Джарвиса. Сломался —
 * значит нужно осознанно решить: обновить Джарвиса под новую схему или вернуть
 * поле. Молча разойтись контракты больше не могут.
 *
 * Как чинить: если поле переименовано — обнови ОБА места (запись и читатель
 * Джарвиса) и строку в таблице ниже. Не удаляй проверку, чтобы «стало зелёно».
 */

const root = path.resolve(__dirname, '../../..');
const functionsSrc = path.join(root, 'functions', 'src');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(functionsSrc, relativePath), 'utf8');
}

interface FieldContract {
  /** Департамент, который сломается молча. */
  readonly department: string;
  /** Файл, где поле ПИШЕТСЯ (источник истины). */
  readonly writtenIn: string;
  /** Файл Джарвиса, который это поле ЧИТАЕТ. */
  readonly readIn: string;
  /** Имя поля, обязанное совпадать по обе стороны. */
  readonly field: string;
  /** Что именно сломается, если поле исчезнет. */
  readonly breaks: string;
}

/**
 * Таблица зависимостей. Каждая строка — обещание: «пока это поле пишется,
 * департамент видит правду».
 */
const FIELD_CONTRACTS: readonly FieldContract[] = [
  // зачем добавлены money/payments/quality (аудит 2026-08-15): три
  // департамента — включая оба денежных — были вне стража. Переименуют поле,
  // читатель вернёт пустоту, и Джарвис бодро отчитается, что всё в порядке.
  // Именно этот сценарий описан в CLAUDE.md как «молчаливая ложь».
  {
    department: 'payments',
    writtenIn: 'telegram_premium_bot.ts',
    readIn: 'jarvis/payments_firestore_fetcher.ts',
    field: 'hasSuccessfulPayment',
    breaks: 'оплативший без доступа перестал бы отличаться от неоплатившего',
  },
  {
    department: 'quality',
    writtenIn: 'quality_daily_aggregate.ts',
    readIn: 'jarvis/quality_firestore_fetcher.ts',
    field: 'affectedUserCount',
    breaks: 'массовая ошибка выглядела бы как единичная жалоба',
  },
  {
    department: 'safety',
    writtenIn: 'ai_safety.ts',
    readIn: 'jarvis/safety_firestore_fetcher.ts',
    field: 'handled',
    breaks: 'необработанные жалобы стали бы считаться разобранными',
  },
  {
    department: 'safety',
    writtenIn: 'ai_safety.ts',
    readIn: 'jarvis/safety_firestore_fetcher.ts',
    field: 'ageEvidence',
    breaks: 'неподтверждённый возраст стал бы выглядеть как доказанный взрослый возраст',
  },
  {
    department: 'support',
    writtenIn: 'support_inbox.ts',
    readIn: 'jarvis/support_firestore_fetcher.ts',
    field: 'receivedAtMs',
    breaks: 'время ожидания ответа стало бы неизмеримым',
  },
  {
    department: 'support',
    writtenIn: 'support_inbox.ts',
    readIn: 'jarvis/support_firestore_fetcher.ts',
    field: 'status',
    breaks: 'автоматически отвеченные письма продолжили бы выглядеть ожидающими ответа',
  },
  {
    department: 'support',
    writtenIn: 'support_inbox.ts',
    readIn: 'jarvis/support_firestore_fetcher.ts',
    field: 'repliedAt',
    breaks: 'скорость ответа перестала бы считаться',
  },
  {
    department: 'support',
    writtenIn: 'support_inbox.ts',
    readIn: 'jarvis/support_firestore_fetcher.ts',
    field: 'mailCategory',
    breaks: 'письма роботов попали бы в очередь ожидающих ответа людей',
  },
  {
    department: 'support',
    writtenIn: 'support_inbox.ts',
    readIn: 'jarvis/support_firestore_fetcher.ts',
    field: 'triageState',
    breaks: 'неразмеченный legacy-спам снова стал бы выглядеть как доказанный живой SLA',
  },
  {
    department: 'support',
    writtenIn: 'support_inbox.ts',
    readIn: 'jarvis/support_firestore_fetcher.ts',
    field: 'imapSyncedAt',
    breaks: 'устаревший IMAP-снимок выглядел бы как пустая живая очередь',
  },
  {
    department: 'content + factory',
    writtenIn: 'jarvis/content_lesson_stats.ts',
    readIn: 'jarvis/content_firestore_fetcher.ts',
    field: 'sampleCount',
    breaks: 'обрыв пути ученика перестал бы находиться',
  },
  {
    department: 'content',
    writtenIn: 'jarvis/content_lesson_stats.ts',
    readIn: 'jarvis/content_firestore_fetcher.ts',
    field: 'averageScore',
    breaks: 'сломанные уроки перестали бы находиться',
  },
  {
    department: 'retention + app tier',
    writtenIn: 'revenuecat_shards.ts',
    readIn: 'jarvis/retention_firestore_fetcher.ts',
    field: 'last_active_at',
    breaks: 'удержание показало бы нули, а тир приложения занизился бы до seed',
  },
  {
    department: 'growth',
    writtenIn: 'growth_daily_aggregate.ts',
    readIn: 'jarvis/growth_firestore_fetcher.ts',
    field: 'newUsers',
    breaks: 'серверный суточный приток стал бы неизвестен, а legacy sample нельзя выдавать за точное число',
  },
  {
    department: 'cohort retention',
    writtenIn: 'jarvis/learning_metrics.ts',
    readIn: 'jarvis/learning_metrics.ts',
    field: 'cohortSize',
    breaks: 'размер D1/D7 когорты стал бы неизвестен',
  },
  {
    department: 'cohort retention',
    writtenIn: 'jarvis/learning_metrics.ts',
    readIn: 'jarvis/learning_metrics.ts',
    field: 'd1ReturningUsers',
    breaks: 'D1 retention стал бы ложным нулём',
  },
  {
    department: 'cohort retention',
    writtenIn: 'jarvis/learning_metrics.ts',
    readIn: 'jarvis/learning_metrics.ts',
    field: 'd7ReturningUsers',
    breaks: 'D7 retention стал бы ложным нулём',
  },
  {
    department: 'PM business context',
    writtenIn: 'admin_daily_digest.ts',
    readIn: 'jarvis/pm_business_context.ts',
    field: 'generatedAtMs',
    breaks: 'устаревший сравнительный дайджест стал бы выглядеть свежим бизнес-контекстом',
  },
  {
    department: 'PM business context',
    writtenIn: 'admin_daily_digest.ts',
    readIn: 'jarvis/pm_business_context.ts',
    field: 'comparisons',
    breaks: 'Джарвис потерял бы current-vs-previous динамику и снова видел бы только текущие счётчики',
  },
  ...[
    'callsStarted',
    'callsConnected',
    'callsCompleted',
    'reviewsReady',
    'reconnectAttempts',
    'reconnectRecovered',
    'firstAudioLatencyBuckets',
    'mintRejections',
    'mintRejectionReasons',
  ].map((field): FieldContract => ({
    department: 'maxvoice',
    writtenIn: 'max_voice_ops.ts',
    readIn: 'jarvis/maxvoice_firestore_fetcher.ts',
    field,
    breaks: `надёжность MAX по полю ${field} превратилась бы в ложный ноль`,
  })),
];

// Immutable per-user purchase facts are deliberately not Jarvis metrics. Money
// continues to read the bounded RevenueCat receipt collection; these two fields
// exist only so the client can observe an already-confirmed purchase outcome.
const INTENTIONALLY_UNREAD_SERVER_PROGRESS_FIELDS = [
  {
    field: 'achievement_access_plus_paid_v1',
    writer: 'revenuecat_shards.ts',
    authority: 'RevenueCat production INITIAL_PURCHASE, non-trial Plus only',
  },
  {
    field: 'achievement_access_pro_paid_v1',
    writer: 'revenuecat_shards.ts',
    authority: 'RevenueCat production NON_RENEWING_PURCHASE lifetime Pro only',
  },
] as const;

// Owner Repository is an account-scoped local immutable journal, not a new
// Firestore collection and not a Jarvis business metric. Keep new receipt
// variants explicit here so a wallet schema change cannot silently look like
// an omitted Jarvis/Rules migration.
const INTENTIONALLY_UNREAD_LOCAL_ECONOMY_RECEIPTS = [
  {
    receiptType: 'learning_session_reward_composite',
    contract: 'modules/learning-v2/contracts/wallet.ts',
    writer:
      'modules/learning-v2/progress/learning_session_rune_reward_composite_v1.ts',
    authority:
      'client-authoritative immutable Owner Repository operation; no Firestore collection or Jarvis projection',
  },
] as const;

const MONEY_WRITER_CONTRACTS = [
  {
    writer: 'app/economy/client_shard_operation_sync.ts',
    reader: 'functions/src/jarvis/money_firestore_fetcher.ts',
    field: 'openingBalance',
    writerPattern: /\.collection\('client_economy_opening'\)[\s\S]{0,500}openingRef\.set\(\{[\s\S]{0,300}\bopeningBalance\b/,
    readerPattern: /\bopeningBalance:\s*number\(data\.openingBalance\)/,
  },
  {
    writer: 'app/economy/client_shard_operation_sync.ts',
    reader: 'functions/src/jarvis/money_firestore_fetcher.ts',
    field: 'createdAtMs',
    writerPattern: /\.collection\('client_economy_operations'\)[\s\S]{0,300}\.set\(clientShardOperationForCloud\(operation\)/,
    readerPattern: /\.where\('createdAtMs',\s*'<='\s*,\s*input\.nowMs\)/,
  },
  {
    writer: 'functions/src/revenuecat_shards.ts',
    reader: 'functions/src/jarvis/money_firestore_fetcher.ts',
    field: 'eventTimestampMs',
    writerPattern: /const processedRef\s*=\s*db\.collection\('revenuecat_premium_events'\)[\s\S]{0,8000}const receipt\s*=\s*\{[\s\S]{0,1600}\beventTimestampMs\s*:[\s\S]{0,1200}tx\.set\(processedRef,\s*receipt\)/,
    readerPattern: /\.where\('eventTimestampMs',\s*'<='\s*,\s*input\.nowMs\)/,
  },
  {
    writer: 'app/paywall_funnel.ts',
    reader: 'functions/src/jarvis/money_firestore_fetcher.ts',
    field: 'ts',
    writerPattern: /\.collection\(COLLECTION\)\.add\(\{[\s\S]{0,500}\bstep,[\s\S]{0,500}\bts,[\s\S]{0,300}\bdev:/,
    readerPattern: /\.where\('ts',\s*'<='\s*,\s*input\.nowMs\)/,
  },
] as const;

const ISOLATED_COLLECTION_CONTRACTS = [
  {
    collection: 'voice_call_reviews',
    writer: 'functions/src/max_voice_finalize.ts',
    authority: 'intentionally_unread_personal_payload',
    fields: ['studyTarget'],
  },
  {
    collection: 'voice_tutor_memory',
    writer: 'functions/src/max_voice_tutor_memory.ts',
    authority: 'intentionally_unread_personal_payload',
  },
  {
    collection: 'voice_call_quotas',
    writer: 'functions/src/max_voice_safety.ts',
    authority: 'server-only quota ownership and opaque bounded safetyGuard state; intentionally unread by Jarvis and every browser client',
    fields: ['quotaIdentityClosureProof', 'lifetimeTrialUsedAtMs'],
  },
  {
    collection: 'access_projection',
    writer: 'functions/src/access_projection.ts',
    authority: 'intentionally_unread_personal_payload',
  },
  {
    collection: 'personal_sync_segments',
    writer: 'modules/phone-state/firestore_repository.ts',
    authority: 'intentionally_unread_personal_payload',
  },
  {
    collection: 'personal_sync_checkpoints',
    writer: 'modules/phone-state/firestore_repository.ts',
    authority: 'intentionally_unread_personal_payload',
  },
  {
    collection: 'sync_devices',
    writer: 'modules/phone-state/firestore_repository.ts',
    authority: 'intentionally_unread_personal_payload',
  },
  {
    collection: 'personal_external_events',
    writer: 'functions Admin SDK personal external-event writers',
    authority: 'intentionally_unread_personal_payload',
  },
  {
    collection: 'personal_sync_server_state',
    writer: 'functions/src/personal_external_events.ts',
    authority: 'intentionally_unread_personal_payload',
  },
  {
    collection: 'client_economy_operations',
    writer: 'app/economy/client_shard_operation_sync.ts',
    authority: 'client append-only persistence; read-only Jarvis money diagnostics',
  },
  {
    collection: 'client_economy_opening',
    writer: 'app/economy/client_shard_operation_sync.ts',
    authority: 'immutable one-time legacy opening snapshot; read-only Jarvis money diagnostics',
  },
  {
    collection: 'external_economy_events',
    writer: 'functions Admin SDK external-event writers',
    authority: 'server append-only external facts; read-only Jarvis money diagnostics',
  },
  {
    collection: 'arena_v2_receipts',
    writer: 'functions/src/arena_v2.ts',
    authority: 'owner-read/server-write private XP settlement evidence; never a Jarvis business metric',
  },
  {
    collection: 'cosmetic_asset_archive_overrides',
    writer: 'functions Admin SDK cosmetic asset archive controls',
    authority: 'server-managed sale availability; not a Jarvis business projection',
  },
  {
    collection: 'gift_certificate_archive',
    writer: 'functions Admin SDK gift certificate deletion transaction',
    authority: 'immutable server-only deletion history; read through a bounded admin projection only',
  },
  {
    collection: 'global_broadcast_modals',
    writer: 'functions Admin SDK global broadcast admin callables',
    authority: 'public app payload schema v1 only; both first-grant paths and the bounded authenticated public-list callable share the exact server validation allowlist; all browser reads/writes denied; owner scrub uses opaque cursors and Rules rollout requires a hash-bound aggregate server receipt',
  },
  {
    collection: 'promo_codes',
    writer: 'functions Admin SDK promo redemption and manual-access admin callables',
    authority: 'server-owned bearer money authority; never direct browser or Jarvis access',
  },
  {
    collection: 'admin_user_briefs_rate_limits',
    writer: 'functions Admin SDK adminUserBriefs transactional quota',
    authority: 'server-only per-actor read-amplification guard; never a Jarvis business projection',
  },
  {
    collection: 'revenuecat_shard_refunds',
    writer: 'functions Admin SDK RevenueCat shard refund webhook',
    authority: 'server-only real-money refund receipts; read only through the bounded admin projection',
  },
] as const;

describe('Jarvis data contract — silence must never replace a broken source', () => {
  test('MAX daily operations are an explicit bounded Jarvis source', () => {
    const writer = readSource('max_voice_ops.ts');
    const reader = readSource('jarvis/maxvoice_firestore_fetcher.ts');
    const callable = readSource('jarvis/all_departments_callables.ts');
    const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');

    expect(writer).toContain("MAX_VOICE_OPS_COLLECTION = 'max_voice_ops_daily'");
    expect(callable).toContain("db.collection('max_voice_ops_daily')");
    expect(reader).toContain("limit(MAXVOICE_SOURCE_DAYS)");
    expect(reader).toContain('MAXVOICE_SOURCE_DAYS = 7');
    expect(rules).toContain('match /max_voice_ops_daily/{docId}');
  });

  test('MAX review and tutor memory remain intentionally unread personal payloads', () => {
    for (const collection of ['voice_call_reviews', 'voice_tutor_memory']) {
      expect(ISOLATED_COLLECTION_CONTRACTS).toContainEqual(expect.objectContaining({
        collection,
        authority: 'intentionally_unread_personal_payload',
      }));
    }
    expect(ISOLATED_COLLECTION_CONTRACTS).toContainEqual(expect.objectContaining({
      collection: 'voice_call_reviews',
      fields: expect.arrayContaining(['studyTarget']),
    }));
  });

  test('MAX nested safety guard remains server-only and intentionally unread', () => {
    const contract = ISOLATED_COLLECTION_CONTRACTS.find(({ collection }) => collection === 'voice_call_quotas');
    const writer = readSource('max_voice_safety.ts');
    const quotaWriter = readSource('max_voice_quota.ts');
    const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
    const jarvisReaders = fs.readdirSync(path.join(functionsSrc, 'jarvis'))
      .filter((file) => file.endsWith('_firestore_fetcher.ts'))
      .map((file) => fs.readFileSync(path.join(functionsSrc, 'jarvis', file), 'utf8'))
      .join('\n');

    expect(contract).toEqual(expect.objectContaining({
      writer: 'functions/src/max_voice_safety.ts',
      authority: expect.stringContaining('opaque bounded safetyGuard'),
      fields: expect.arrayContaining(['quotaIdentityClosureProof', 'lifetimeTrialUsedAtMs']),
    }));
    expect(writer).toContain('safetyGuard');
    expect(quotaWriter).toContain('quotaIdentityClosureProof');
    expect(quotaWriter.match(/lastSettledAtMs:\s*now/g)).toHaveLength(2);
    expect(rules).toMatch(/match \/voice_call_quotas\/\{docId\}\s*\{\s*allow read, write: if false;/);
    expect(jarvisReaders).not.toContain("collection('voice_call_quotas')");
  });

  test.each(INTENTIONALLY_UNREAD_SERVER_PROGRESS_FIELDS)(
    'server progress fact $field stays writer-backed, client-blocked and intentionally unread',
    ({ field, writer, authority }) => {
      const writerSource = readSource(writer);
      const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
      const jarvisReaders = fs.readdirSync(path.join(functionsSrc, 'jarvis'))
        .filter((file) => file.endsWith('_firestore_fetcher.ts'))
        .map((file) => fs.readFileSync(path.join(functionsSrc, 'jarvis', file), 'utf8'))
        .join('\n');
      expect(writerSource).toContain(field);
      expect(rules).toContain(`'${field}'`);
      expect(jarvisReaders).not.toContain(field);
      expect(authority.length).toBeGreaterThan(30);
    },
  );
  test.each(INTENTIONALLY_UNREAD_LOCAL_ECONOMY_RECEIPTS)(
    'local economy receipt $receiptType stays contract-backed and outside Firestore/Jarvis',
    ({ receiptType, contract, writer, authority }) => {
      const contractSource = fs.readFileSync(path.join(root, contract), 'utf8');
      const writerSource = fs.readFileSync(path.join(root, writer), 'utf8');
      const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
      const jarvisReaders = fs.readdirSync(path.join(functionsSrc, 'jarvis'))
        .filter((file) => file.endsWith('_firestore_fetcher.ts'))
        .map((file) => fs.readFileSync(path.join(functionsSrc, 'jarvis', file), 'utf8'))
        .join('\n');
      expect(contractSource).toContain(`| "${receiptType}"`);
      expect(writerSource).toContain(`receiptType: "${receiptType}"`);
      expect(rules).not.toContain(receiptType);
      expect(jarvisReaders).not.toContain(receiptType);
      expect(authority).toContain('no Firestore collection');
    },
  );
  test('personal sync collections are explicitly intentionally unread by Jarvis', () => {
    for (const collection of [
      'access_projection',
      'personal_sync_segments',
      'personal_sync_checkpoints',
      'sync_devices',
      'personal_external_events',
      'personal_sync_server_state',
    ]) {
      expect(ISOLATED_COLLECTION_CONTRACTS).toContainEqual(expect.objectContaining({
        collection,
        authority: 'intentionally_unread_personal_payload',
      }));
    }
  });

  test.each(MONEY_WRITER_CONTRACTS)(
    'money writer $writer contextually writes $field and its reader consumes the same contract',
    ({ writer, reader, writerPattern, readerPattern, field }) => {
      const writerSource = fs.readFileSync(path.join(root, writer), 'utf8');
      const readerSource = fs.readFileSync(path.join(root, reader), 'utf8');
      const writerVerdict = writerPattern.test(writerSource)
        ? 'ok'
        : `REAL WRITER CONTRACT MISSING: ${writer} no longer writes ${field} in the expected collection write`;
      const readerVerdict = readerPattern.test(readerSource)
        ? 'ok'
        : `JARVIS MONEY READER DRIFT: ${reader} no longer bounds/reads ${field}`;
      expect(writerVerdict).toBe('ok');
      expect(readerVerdict).toBe('ok');
    },
  );

  test('the real safety_flags writer and Jarvis share one explicit age taxonomy contract', () => {
    const { SAFETY_FLAG_WRITER_AGE_CONTRACT } = require('../ai_safety') as typeof import('../ai_safety');
    const { JARVIS_SAFETY_FLAG_AGE_CONTRACT } = require('./safety_firestore_fetcher') as typeof import('./safety_firestore_fetcher');

    expect(SAFETY_FLAG_WRITER_AGE_CONTRACT).toBeDefined();
    expect(JARVIS_SAFETY_FLAG_AGE_CONTRACT).toBe(SAFETY_FLAG_WRITER_AGE_CONTRACT);
    expect(SAFETY_FLAG_WRITER_AGE_CONTRACT).toEqual({
      consentAgeValues: ['adult', 'unknown'],
      evidenceStates: ['confirmed_adult', 'age_unverified', 'unavailable'],
    });
  });

  test.each(FIELD_CONTRACTS)(
    '[$department] поле "$field" живо и там, где пишется, и там, где Джарвис его читает',
    ({ writtenIn, readIn, field, breaks }) => {
      const writer = readSource(writtenIn);
      const reader = readSource(readIn);

      // зачем сравнивать строки, а не булево: у expect в этой версии Jest нет
      // аргумента с сообщением, а голое `false !== true` не объясняет, что
      // именно сломалось. Текст вшит в сравниваемое значение и виден в отчёте.
      const writerVerdict = writer.includes(field)
        ? 'ok'
        : `ПОЛЕ ПРОПАЛО: "${field}" больше не пишется в ${writtenIn} — ${breaks}`;
      expect(writerVerdict).toBe('ok');

      const readerVerdict = reader.includes(field)
        ? 'ok'
        : `ДЖАРВИС ОСЛЕП: "${field}" больше не читается в ${readIn} — ${breaks}`;
      expect(readerVerdict).toBe('ok');
    },
  );

  test('каждая коллекция, которую читает Джарвис, закрыта правилами Firestore', () => {
    // зачем: новая коллекция без правила попадает под общий admin-catch-all и
    // может оказаться доступнее, чем задумано. Проверяем явное упоминание.
    const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
    const jarvisDir = path.join(functionsSrc, 'jarvis');
    const collections = new Set<string>();

    for (const file of fs.readdirSync(jarvisDir)) {
      if (!file.endsWith('.ts') || file.includes('.test.')) continue;
      const source = fs.readFileSync(path.join(jarvisDir, file), 'utf8');
      // Only Firestore roots need a top-level rule. A chained `.collection()` is a
      // subcollection and inherits the rule match of its root; treating it as a
      // root makes legitimate nested schemas fail this guard.
      for (const match of source.matchAll(/(?:\bdb|\.db)\.collection\('([a-z_]+)'\)/g)) {
        collections.add(match[1]);
      }
    }

    expect(collections.size).toBeGreaterThan(0);
    expect(collections).not.toContain('sources');
    expect(collections).not.toContain('buckets');
    expect(collections).not.toContain('affected_users');
    for (const name of collections) {
      const verdict = rules.includes(`/${name}/`)
        ? 'ok'
        : `КОЛЛЕКЦИЯ БЕЗ ПРАВИЛА: "${name}" читается Джарвисом, но не описана в firestore.rules`;
      expect(verdict).toBe('ok');
    }
  });

  test.each(ISOLATED_COLLECTION_CONTRACTS)(
    'economy schema "$collection" is explicit and cannot silently become a Jarvis metric',
    ({ collection, writer, authority }) => {
      const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
      const jarvisDir = path.join(functionsSrc, 'jarvis');
      const jarvisReaders = fs.readdirSync(jarvisDir)
        .filter((file) => file.endsWith('_firestore_fetcher.ts'))
        .map((file) => fs.readFileSync(path.join(jarvisDir, file), 'utf8'))
        .join('\n');
      const writerExists = writer.startsWith('app/')
        ? fs.existsSync(path.join(root, writer))
        : true;

      expect(writerExists).toBe(true);
      expect(rules).toContain(`/${collection}/`);
      expect(jarvisReaders).not.toContain(`collection('${collection}')`);
      expect(authority.length).toBeGreaterThan(20);
    },
  );

  test('каждый департамент подключён к общему своду — иначе он невидим владельцу', () => {
    // зачем: департамент можно написать и забыть подключить. Тогда он есть в
    // коде, но его нет в панели — а выглядит это как «проблем не найдено».
    const decision = readSource('jarvis/decision.ts');
    const snapshot = readSource('jarvis/all_departments_snapshot.ts');

    const unionMatch = decision.match(/export type Department =([^;]+);/);
    expect(unionMatch).not.toBeNull();

    const departments = [...(unionMatch?.[1] ?? '').matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    expect(departments.length).toBeGreaterThanOrEqual(8);

    for (const department of departments) {
      const verdict = snapshot.includes(`'${department}'`)
        ? 'ok'
        : `ДЕПАРТАМЕНТ НЕ ПОДКЛЮЧЁН: "${department}" объявлен, но отсутствует в all_departments_snapshot.ts — владелец его не увидит`;
      expect(verdict).toBe('ok');
    }
  });

  test('панель админки знает каждый департамент по имени', () => {
    // зачем: незнакомый департамент отрисовался бы серым «payments»-подобным
    // кодом вместо названия — владелец не понял бы, о чём речь.
    const decision = readSource('jarvis/decision.ts');
    const panel = fs.readFileSync(path.join(root, 'admin', 'v2', 'legacy.html'), 'utf8');

    const unionMatch = decision.match(/export type Department =([^;]+);/);
    const departments = [...(unionMatch?.[1] ?? '').matchAll(/'([a-z]+)'/g)].map((m) => m[1]);

    const metaMatch = panel.match(/const JF_DEPARTMENT_META = \{([\s\S]*?)\n {2}\};/);
    expect(metaMatch).not.toBeNull();
    const meta = metaMatch?.[1] ?? '';

    for (const department of departments) {
      const verdict = new RegExp(`\\b${department}:`).test(meta)
        ? 'ok'
        : `ПАНЕЛЬ НЕ ЗНАЕТ ДЕПАРТАМЕНТ: "${department}" отсутствует в JF_DEPARTMENT_META (admin/v2/legacy.html)`;
      expect(verdict).toBe('ok');
    }
  });
});

describe('level reward spin Jarvis impact', () => {
  test('records the new server schema as intentionally unread by Jarvis until a metric is approved', () => {
    const writer = readSource('level_reward_spins.ts');
    expect(writer).toContain("collection('level_spin_credits')");
    expect(writer).toContain("collection('level_spin_results')");
    expect(writer).toContain('level_reward_spin_balance');

    const jarvisDir = path.join(functionsSrc, 'jarvis');
    const readers = fs.readdirSync(jarvisDir)
      .filter((file) => file.endsWith('.ts') && !file.includes('.test.'))
      .map((file) => fs.readFileSync(path.join(jarvisDir, file), 'utf8'))
      .join('\n');
    expect(readers).not.toContain('level_spin_credits');
    expect(readers).not.toContain('level_spin_results');
    expect(readers).not.toContain('level_reward_spin_balance');
  });
});

describe('Arena friend invite and notification isolation', () => {
  test('does not silently treat social lifecycle rows as authoritative business metrics', () => {
    const jarvisDir = path.join(functionsSrc, 'jarvis');
    const readers = fs.readdirSync(jarvisDir)
      .filter((file) => file.endsWith('_firestore_fetcher.ts'))
      .map((file) => fs.readFileSync(path.join(jarvisDir, file), 'utf8'))
      .join('\n');
    expect(readers).not.toContain("collection('arena_v2_invites')");
    expect(readers).not.toContain("collection('notifications')");
  });

  test('MAX review receipts stay private, transcript-free, and deletable without becoming a Jarvis content source', () => {
    const writer = fs.readFileSync(path.join(functionsSrc, 'max_voice_finalize.ts'), 'utf8');
    const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
    const deletion = fs.readFileSync(path.join(functionsSrc, 'account_delete.ts'), 'utf8');
    const jarvisDir = path.join(functionsSrc, 'jarvis');
    const jarvisReaders = fs.readdirSync(jarvisDir)
      .filter((file) => file.endsWith('.ts') && !file.includes('.test.'))
      .map((file) => fs.readFileSync(path.join(jarvisDir, file), 'utf8'))
      .join('\n');

    expect(writer).toContain("const REVIEW_COLLECTION = 'voice_call_reviews'");
    expect(writer).not.toMatch(/tx\.set\([^\n]+(?:history|transcript|audio)/i);
    expect(rules).toContain('match /voice_call_reviews/{docId}');
    expect(rules).toContain('allow read, write: if false;');
    expect(deletion).toContain("{ collection: 'voice_call_reviews', field: 'stableUid', values: 'stable' }");
    expect(deletion).toContain("{ collection: 'voice_call_reviews', field: 'authUid', values: 'auth' }");
    expect(jarvisReaders).not.toContain("collection('voice_call_reviews')");
  });
});
