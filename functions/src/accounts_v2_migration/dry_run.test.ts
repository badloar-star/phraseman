import {
  ACCOUNTS_V2_LIMITS,
  applyBatch,
  type AccountsV2EntityRecord,
  type AccountsV2OpRecord,
  type AccountsV2TxPort,
} from '../accounts_v2_apply_core';
import { isIssuedBatch } from '../accounts_v2_validate';
import {
  MIGRATION_EXPORT_FORMAT,
  MIGRATION_REPORT_SCHEMA,
  MigrationInputError,
  legacyCleanupPaths,
  assertMigrationApplyAllowed,
  runMigrationDryRun,
  type MigrationDryRunResult,
} from './dry_run';

/*
 * Account V2, Пакет 5 — dry-run миграции на синтетических фикстурах.
 *
 * зачем: доказать до любого реального прогона, что перенос детерминирован,
 * экономика (XP, жемчуг, лиги, спины, бусты) не копируется, неизвестное не
 * теряется молча (HOLD с путём), а готовые операции проходят ядро сервера
 * (validateBatch + applyBatch на in-memory порту). Реальные данные не читаются.
 */

const UID = 'stable-user-0001';
const SENTINEL_XP = 987654;
const SENTINEL_TEXT = 'SECRET-VALUE-должно-не-утечь';
const NOW = 1_790_000_000_000;
const SRS_TIME = 1_780_000_000_000;

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function card(id: string, extra: Record<string, Json> = {}): Record<string, Json> {
  return { id, en: `phrase ${id}`, ru: `фраза ${id}`, uk: `фраза ${id}`, source: 'lesson', addedAt: 1_700_000_000_000, ...extra };
}

// зачем (ремонт №1, P1): id страницы — как flashcardPageDocId в app/flashcards_cloud_pages.ts.
function pageId(target: string, index: number): string {
  return `${target}_${String(index).padStart(4, '0')}`;
}

function page(target: string, index: number, cards: readonly Record<string, Json>[], count = cards.length): Json {
  return { id: pageId(target, index), data: { target, index, count, cards: JSON.stringify(cards), updatedAt: 1_700_000_000_000 } };
}

function snapshot(user: Record<string, Json> | null, subcollections: Record<string, Json[]> = {}, uid = UID): Json {
  return { format: MIGRATION_EXPORT_FORMAT, uid, user, subcollections };
}

function regularUser(): Json {
  return snapshot({
    shards: 1200,
    premium: true,
    progress: {
      lesson1_best_score: '4.5',
      lesson2_best_score: '2',
      lesson1_pass_count: '3',
      'lesson_progress_v2::fr::lesson3_best_score': '5',
      flashcards_v1: JSON.stringify([card('c1'), card('c2', { sourceLocales: { ru: 'x' } })]),
      custom_flashcards_v2: JSON.stringify([
        { id: 'u1', en: 'my', ru: 'моя', uk: 'моя', categoryId: 'custom', isSystem: false, description: 'заметка' },
      ]),
      community_owned_pack_ids_v1: JSON.stringify(['pack-b', 'pack-a', 'pack-a']),
      flashcards_owned_packs_v1: JSON.stringify(['official-1']),
      user_total_xp: String(SENTINEL_XP),
      weekly_xp: '120',
      week_points_v2: '40',
      user_level: '12',
      level_reward_spin_balance: '3',
      club_gift_free_boost_v1: 'true',
      premium_plan: 'yearly',
      flashcards_swipe_memory_v1: JSON.stringify({ 'saved:all:c1': { correct: 1, seen: 1, lastSeenAt: SRS_TIME, nextDueAt: SRS_TIME + 1 } }),
      user_name: SENTINEL_TEXT,
    },
  }, {
    shard_log: [{ id: 'l1', data: { delta: 5 } }, { id: 'l2', data: { delta: -2 } }],
    access_projection: [{ id: 'current', data: { plus: true } }],
  });
}

function operationIds(result: MigrationDryRunResult): string[] {
  return result.batches.flatMap((batch) => batch.operations.map(({ operation }) => operation.operationId));
}

function heldPaths(result: MigrationDryRunResult): string[] {
  return result.report.held.map((entry) => entry.path);
}

class MemoryPort implements AccountsV2TxPort {
  readonly ops = new Map<string, AccountsV2OpRecord>();
  readonly entities = new Map<string, AccountsV2EntityRecord>();
  getOp(_uid: string, id: string): AccountsV2OpRecord | null { return this.ops.get(id) ?? null; }
  getEntity(_uid: string, id: string): AccountsV2EntityRecord | null { return this.entities.get(id) ?? null; }
  putEntity(_uid: string, id: string, record: AccountsV2EntityRecord): void { this.entities.set(id, record); }
  putReceipt(_uid: string, id: string, record: AccountsV2OpRecord): void { this.ops.set(id, record); }
}

describe('accounts_v2_migration dry-run — обычный пользователь', () => {
  let result: MigrationDryRunResult;
  beforeAll(() => {
    result = runMigrationDryRun(regularUser());
  });

  it('переносит уроки, карточки и библиотеку сообщества по доменам', () => {
    expect(result.operations.lesson_progress).toHaveLength(3);
    expect(result.operations.flashcard).toHaveLength(3);
    expect(result.operations.library_membership).toHaveLength(1);
    expect(result.report.carried).toEqual({ lesson_progress: 3, flashcard: 3, library_membership: 1 });
  });

  it('урок: passed от 60%, 40–59% — только если следующий урок уже открыт (D121), score как есть', () => {
    const byId = new Map(result.operations.lesson_progress.map((op) => [op.entityId, op.payload]));
    expect(byId.get('en:lesson:1')).toEqual({ passed: true, score: 4.5 });
    expect(byId.get('en:lesson:2')).toEqual({ passed: false, score: 2 });
    expect(byId.get('fr:lesson:3')).toEqual({ passed: true, score: 5 });
  });

  it('библиотека: только наборы сообщества, уникально и по порядку; официальные — drop D68', () => {
    expect(result.operations.library_membership[0]).toMatchObject({
      entityId: 'en:community_packs', payload: { itemIds: ['pack-a', 'pack-b'] },
    });
    const dropped = result.report.dropped.find((entry) => entry.path === 'progress.flashcards_owned_packs_v1');
    expect(dropped?.decisions).toContain('D68');
  });

  it('XP, уровень, лиги, спины, бусты и жемчуг — dropped с решениями, в операции не попали', () => {
    const paths = result.report.dropped.map((entry) => entry.path);
    for (const path of [
      'progress.user_total_xp', 'progress.weekly_xp', 'progress.week_points_v2', 'progress.user_level',
      'progress.level_reward_spin_balance', 'progress.club_gift_free_boost_v1', 'shards', 'subcollections.shard_log',
    ]) expect(paths).toContain(path);
    const shardLog = result.report.dropped.find((entry) => entry.path === 'subcollections.shard_log');
    expect(shardLog?.count).toBe(2);
    expect(JSON.stringify(result.batches)).not.toContain(String(SENTINEL_XP));
    expect(result.report.disallowedFieldsCopied).toBe(0);
  });

  it('права Plus — derive (ссылка), без копии в операции', () => {
    const derived = result.report.derived.map((entry) => entry.path);
    expect(derived).toEqual(expect.arrayContaining(['premium', 'progress.premium_plan', 'subcollections.access_projection']));
    expect(JSON.stringify(result.batches)).not.toContain('yearly');
  });

  it('не решённое — блокирующий HOLD, нет домена — информационно, без значений', () => {
    expect(heldPaths(result)).toEqual(expect.arrayContaining(['progress.lesson1_pass_count']));
    expect(heldPaths(result)).not.toContain('progress.user_name');
    expect(result.report.informational.map((entry) => entry.path)).toContain('progress.user_name');
    expect(JSON.stringify(result.report)).not.toContain(SENTINEL_TEXT);
    expect(result.report.status).toBe('hold');
    expect(result.report.applyAllowed).toBe(false);
  });

  it('SRS-память свайпов переносится в карточку, updatedAtMs из старой записи', () => {
    const c1 = result.operations.flashcard.find((op) => op.entityId === 'en:saved:c1');
    const fields = (c1?.payload as { fields: Record<string, Json> }).fields;
    expect(fields.srs).toMatchObject({ updatedAtMs: SRS_TIME, lastSeenAt: SRS_TIME, correct: 1, seen: 1 });
  });

  it('отчёт без uid: только хэш', () => {
    expect(result.report.schema).toBe(MIGRATION_REPORT_SCHEMA);
    expect(result.report.uidHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(result.report)).not.toContain(UID);
  });

  it('все пакеты выданы validateBatch и укладываются в лимиты клиента', () => {
    expect(result.batches.length).toBeGreaterThan(0);
    for (const batch of result.batches) {
      expect(isIssuedBatch(batch)).toBe(true);
      expect(batch.operations.length).toBeLessThanOrEqual(ACCOUNTS_V2_LIMITS.maxBatchOperations);
      for (const { ownerUid, operation } of batch.operations) {
        expect(ownerUid).toBe(UID);
        expect(operation.baseRevision).toBeNull();
        expect(Buffer.byteLength(operation.operationId, 'utf8')).toBeLessThanOrEqual(ACCOUNTS_V2_LIMITS.maxOperationIdUtf8Bytes);
      }
    }
    expect(result.report.operations.count).toBe(7);
  });

  it('applyBatch ядра на in-memory порту: всё applied, повтор — duplicate', () => {
    const port = new MemoryPort();
    const first = result.batches.flatMap((batch) => applyBatch(port, UID, batch, NOW));
    expect(first.map((receipt) => receipt.outcome)).toEqual(first.map(() => 'applied'));
    expect(port.entities.size).toBe(7);
    const again = runMigrationDryRun(regularUser());
    const second = again.batches.flatMap((batch) => applyBatch(port, UID, batch, NOW + 1));
    expect(second.map((receipt) => receipt.outcome)).toEqual(second.map(() => 'duplicate'));
  });
});

describe('accounts_v2_migration dry-run — детерминизм', () => {
  it('повторный прогон даёт те же operationId, batchId и отчёт', () => {
    const first = runMigrationDryRun(regularUser());
    const second = runMigrationDryRun(regularUser());
    expect(operationIds(second)).toEqual(operationIds(first));
    expect(second.batches.map((batch) => batch.batchId)).toEqual(first.batches.map((batch) => batch.batchId));
    expect(second.report).toEqual(first.report);
  });

  it('другой uid — другие operationId (хэш uid+пути)', () => {
    const base = runMigrationDryRun(regularUser());
    const other = runMigrationDryRun(snapshot(
      (regularUser() as { user: Record<string, Json> }).user, {}, 'stable-user-0002',
    ));
    const overlap = operationIds(other).filter((id) => operationIds(base).includes(id));
    expect(overlap).toEqual([]);
  });

  it('порядок ключей во входе не меняет результат', () => {
    const reversed = Object.fromEntries(Object.entries(
      ((regularUser() as { user: Record<string, Json> }).user.progress as Record<string, Json>),
    ).reverse());
    const flipped = runMigrationDryRun(snapshot({ shards: 1200, premium: true, progress: reversed }, {
      access_projection: [{ id: 'current', data: { plus: true } }],
      shard_log: [{ id: 'l2', data: { delta: -2 } }, { id: 'l1', data: { delta: 5 } }],
    }));
    expect(operationIds(flipped)).toEqual(operationIds(runMigrationDryRun(regularUser())));
  });
});

describe('accounts_v2_migration dry-run — пустые и старые формы', () => {
  it('документа нет (user: null) — ни операций, ни ошибок', () => {
    const result = runMigrationDryRun(snapshot(null));
    expect(result.batches).toEqual([]);
    expect(result.report.totals).toEqual({ carried: 0, dropped: 0, derived: 0, held: 0, informational: 0, keptInPlace: 0 });
    expect(result.report.status).toBe('ready');
  });

  it('пустой документ и пустые списки — ноль операций', () => {
    const result = runMigrationDryRun(snapshot({ progress: { flashcards_v1: '[]', community_owned_pack_ids_v1: '[]' } }));
    expect(result.batches).toEqual([]);
    expect(result.report.carried).toEqual({ lesson_progress: 0, flashcard: 0, library_membership: 0 });
  });

  it('старые формы: значения уже разобраны (число/массив), не строки', () => {
    const result = runMigrationDryRun(snapshot({ progress: {
      lesson4_best_score: 3,
      flashcards_v1: [card('a1')],
      community_owned_pack_ids_v1: ['p1'],
    } }));
    expect(result.report.carried).toEqual({ lesson_progress: 1, flashcard: 1, library_membership: 1 });
  });

  it('старый псевдоним progress.flashcards заполняет пустой flashcards_v1', () => {
    const result = runMigrationDryRun(snapshot({ progress: { flashcards: JSON.stringify([card('old')]) } }));
    expect(result.operations.flashcard.map((op) => op.entityId)).toEqual(['en:saved:old']);
  });

  it('только страницы: карточки берутся из flashcard_pages, FR отдельно', () => {
    const result = runMigrationDryRun(snapshot({ progress: {} }, {
      flashcard_pages: [page('en', 1, [card('p2')]), page('en', 0, [card('p1')]), page('fr', 0, [card('f1')])],
    }));
    expect(result.operations.flashcard.map((op) => op.entityId).sort()).toEqual(['en:saved:p1', 'en:saved:p2', 'fr:saved:f1']);
  });

  it('документ и страницы вместе: документ главнее, расхождение — в conflicts', () => {
    const result = runMigrationDryRun(snapshot({ progress: { flashcards_v1: JSON.stringify([card('doc')]) } }, {
      flashcard_pages: [page('en', 0, [card('pg')])],
    }));
    expect(result.operations.flashcard.map((op) => op.entityId)).toEqual(['en:saved:doc']);
    expect(result.report.conflicts).toEqual([{ kind: 'saved_cards_document_and_pages_differ', path: 'progress.flashcards_v1', count: 1 }]);
  });
});

describe('accounts_v2_migration dry-run — битые значения и неизвестное', () => {
  it('битая оценка урока — HOLD malformed_value, остальное переносится', () => {
    const result = runMigrationDryRun(snapshot({ progress: {
      lesson1_best_score: 'abc', lesson2_best_score: '7', lesson3_best_score: '-1', lesson4_best_score: '5',
    } }));
    expect(result.operations.lesson_progress.map((op) => op.entityId)).toEqual(['en:lesson:4']);
    const malformed = result.report.held.filter((entry) => entry.reason === 'malformed_value').map((entry) => entry.path);
    expect(malformed).toEqual(['progress.lesson1_best_score', 'progress.lesson2_best_score', 'progress.lesson3_best_score']);
  });

  it('неразбираемый JSON карточек и не-массив библиотеки — HOLD', () => {
    const result = runMigrationDryRun(snapshot({ progress: {
      flashcards_v1: '[{"id":', community_owned_pack_ids_v1: '{"a":1}',
    } }));
    expect(result.batches).toEqual([]);
    expect(heldPaths(result)).toEqual(['progress.community_owned_pack_ids_v1', 'progress.flashcards_v1']);
  });

  it('карточка без id, с неизвестным полем или SRS — HOLD с путём поля, прочие переносятся', () => {
    const result = runMigrationDryRun(snapshot({ progress: { flashcards_v1: JSON.stringify([
      card('ok'), { en: 'no id' }, card('x', { mysteryField: SENTINEL_TEXT }), card('s', { srs: { due: 1 } }),
    ]) } }));
    expect(result.operations.flashcard.map((op) => op.entityId)).toEqual(['en:saved:ok']);
    expect(result.report.held).toEqual(expect.arrayContaining([
      { reason: 'malformed_value', path: 'progress.flashcards_v1[*].id', count: 1 },
      { reason: 'unknown_card_field', path: 'progress.flashcards_v1[*].mysteryField', count: 1 },
      { reason: 'srs_time_missing', path: 'progress.flashcards_v1[*].srs', count: 1 },
    ]));
    expect(JSON.stringify(result.report)).not.toContain(SENTINEL_TEXT);
  });

  it('7E р1: updatedAt карточки переносится как поле; перенос ready (не HOLD)', () => {
    const result = runMigrationDryRun(snapshot({ progress: { flashcards_v1: JSON.stringify([
      card('u1', { updatedAt: 1_700_000_500_000 }),
    ]) } }));
    expect(result.report.status).toBe('ready');
    expect(result.report.held).toEqual([]);
    const fields = (result.operations.flashcard[0]?.payload as { fields: Record<string, Json> }).fields;
    expect(fields.updatedAt).toBe(1_700_000_500_000);
  });

  it('7E р1: битый updatedAt снимается с карточки (informational), аккаунт не в HOLD, карточка переносится', () => {
    const result = runMigrationDryRun(snapshot({ progress: { flashcards_v1: JSON.stringify([
      card('b1', { updatedAt: 'x' }), card('b2', { updatedAt: -5 }), card('b3', { updatedAt: 1.5 }), card('b4', { updatedAt: null }),
    ]) } }));
    expect(result.report.status).toBe('ready');
    expect(result.operations.flashcard.map((op) => op.entityId)).toEqual(['en:saved:b1', 'en:saved:b2', 'en:saved:b3', 'en:saved:b4']);
    for (const op of result.operations.flashcard) {
      expect(Object.keys((op.payload as { fields: Record<string, Json> }).fields)).not.toContain('updatedAt');
    }
    expect(result.report.informational).toEqual(expect.arrayContaining([
      { reason: 'malformed_value', path: 'progress.flashcards_v1[*].updatedAt', count: 4 },
    ]));
  });

  it('два разных содержимых под одним id карточки — HOLD, одинаковые — одна операция', () => {
    const result = runMigrationDryRun(snapshot({ progress: { flashcards_v1: JSON.stringify([
      card('d1'), card('d1'), card('d2'), card('d2', { ru: 'другое' }),
    ]) } }));
    expect(result.operations.flashcard.map((op) => op.entityId)).toEqual(['en:saved:d1']);
    expect(result.report.held).toEqual(expect.arrayContaining([
      { reason: 'duplicate_card_id', path: 'progress.flashcards_v1[*]', count: 1 },
    ]));
  });

  it.each([
    ['пропуск середины', [page('en', 0, [card('a')]), page('en', 2, [card('c')])]],
    ['повтор индекса', [page('en', 0, [card('a')]), { id: 'en_0b', data: { target: 'en', index: 0, count: 1, cards: '[]', updatedAt: 1 } }]],
    ['count не совпадает', [page('en', 0, [card('a')], 5)]],
    ['битый JSON страницы', [{ id: 'en_0', data: { target: 'en', index: 0, count: 1, cards: '[{', updatedAt: 1 } }]],
  ] as const)('неполный набор страниц (%s) — HOLD pages_incomplete, частичную библиотеку не переносим', (_name, pages) => {
    const result = runMigrationDryRun(snapshot({ progress: {} }, { flashcard_pages: pages as unknown as Json[] }));
    expect(result.operations.flashcard).toEqual([]);
    expect(result.report.held).toEqual(expect.arrayContaining([
      { reason: 'pages_incomplete', path: 'subcollections.flashcard_pages/en', count: 1 },
    ]));
  });

  it('неизвестные поля в корне, progress и подколлекциях — HOLD unknown_field', () => {
    const result = runMigrationDryRun(snapshot({ someFutureRootField: SENTINEL_TEXT, progress: { brand_new_key_v7: SENTINEL_TEXT } }, {
      mystery_docs: [{ id: 'm1', data: { value: SENTINEL_TEXT } }],
    }));
    expect(result.report.held).toEqual(expect.arrayContaining([
      { reason: 'unknown_field', path: 'someFutureRootField', count: 1 },
      { reason: 'unknown_field', path: 'progress.brand_new_key_v7', count: 1 },
      { reason: 'unknown_field', path: 'subcollections.mystery_docs', count: 1 },
    ]));
    expect(JSON.stringify(result.report)).not.toContain(SENTINEL_TEXT);
  });

  it('uid внутри неизвестного ключа не утекает в отчёт', () => {
    const result = runMigrationDryRun(snapshot({ progress: { [`cache:${UID}:v1`]: '1' } }));
    expect(heldPaths(result)).toEqual(['progress.cache:<uid>:v1']);
  });

  it('чужой владелец документа (canonicalStableId) — HOLD всего аккаунта, ноль операций', () => {
    const result = runMigrationDryRun(snapshot({ canonicalStableId: 'someone-else', progress: { lesson1_best_score: '5' } }));
    expect(result.batches).toEqual([]);
    expect(result.report.held).toEqual([{ reason: 'owner_mismatch', path: '$', count: 1 }]);
    expect(result.report.status).toBe('hold');
  });
});

describe('accounts_v2_migration dry-run — порции по лимитам ядра', () => {
  it('много карточек режутся на пакеты ≤ 50 операций, все проходят ядро', () => {
    const cards = Array.from({ length: 130 }, (_, index) => card(`k${String(index).padStart(3, '0')}`));
    const result = runMigrationDryRun(snapshot({ progress: { flashcards_v1: JSON.stringify(cards) } }));
    expect(result.batches.map((batch) => batch.operations.length)).toEqual([50, 50, 30]);
    const port = new MemoryPort();
    const receipts = result.batches.flatMap((batch) => applyBatch(port, UID, batch, NOW));
    expect(receipts).toHaveLength(130);
    expect(new Set(receipts.map((receipt) => receipt.outcome))).toEqual(new Set(['applied']));
  });

  it('карточка больше предела конверта — HOLD envelope_too_large, не роняет прогон', () => {
    const huge = card('huge', { description: 'x'.repeat(ACCOUNTS_V2_LIMITS.maxEnvelopeUtf8Bytes) });
    const result = runMigrationDryRun(snapshot({ progress: { custom_flashcards_v2: JSON.stringify([huge, card('small')]) } }));
    expect(result.operations.flashcard.map((op) => op.entityId)).toEqual(['en:custom:small']);
    expect(result.report.held).toEqual(expect.arrayContaining([
      { reason: 'envelope_too_large', path: 'progress.custom_flashcards_v2[*]', count: 1 },
    ]));
  });

  it('большая библиотека режется на операции одной сущности в одном пакете', () => {
    const ids = Array.from({ length: 1200 }, (_, index) => `pack-${String(index).padStart(4, '0')}`);
    const result = runMigrationDryRun(snapshot({ progress: { community_owned_pack_ids_v1: ids } }));
    expect(result.operations.library_membership).toHaveLength(3);
    expect(result.batches).toHaveLength(1);
    const port = new MemoryPort();
    const receipts = applyBatch(port, UID, result.batches[0], NOW);
    expect(receipts.map((receipt) => receipt.outcome)).toEqual(['applied', 'applied', 'applied']);
  });
});

describe('accounts_v2_migration dry-run — строгий вход', () => {
  it.each([
    ['не объект', 'x', 'input_not_object'],
    ['чужой формат', { format: 'other', uid: UID, user: null }, 'format_unsupported'],
    ['нет uid', { format: MIGRATION_EXPORT_FORMAT, user: null }, 'uid_invalid'],
    ['uid с пробелами', { format: MIGRATION_EXPORT_FORMAT, uid: ' u ', user: null }, 'uid_invalid'],
    ['user не объект', { format: MIGRATION_EXPORT_FORMAT, uid: UID, user: [] }, 'user_invalid'],
    ['подколлекции не объект', { format: MIGRATION_EXPORT_FORMAT, uid: UID, user: null, subcollections: 5 }, 'subcollections_invalid'],
    ['лишнее поле', { format: MIGRATION_EXPORT_FORMAT, uid: UID, user: null, extra: 1 }, 'input_unknown_field'],
  ] as const)('%s → MigrationInputError(%s)', (_name, input, code) => {
    expect(() => runMigrationDryRun(input)).toThrow(MigrationInputError);
    try {
      runMigrationDryRun(input);
    } catch (error) {
      expect((error as MigrationInputError).code).toBe(code);
    }
  });
});

describe('accounts_v2_migration dry-run — ремонт №1: страницы и идемпотентность (P1)', () => {
  it('id страниц — `${target}_0000` как flashcardPageDocId; старая форма `en_0` — pages_incomplete', () => {
    const cards = Array.from({ length: 11 }, (_, index) => page('en', index, [card(`p${index}`)]));
    const good = runMigrationDryRun(snapshot({ progress: {} }, { flashcard_pages: cards }));
    expect(good.operations.flashcard).toHaveLength(11);
    expect(good.report.held).toEqual([]);
    const legacyId = { id: 'en_0', data: { target: 'en', index: 0, count: 1, cards: JSON.stringify([card('a')]), updatedAt: 1 } };
    const bad = runMigrationDryRun(snapshot({ progress: {} }, { flashcard_pages: [legacyId] }));
    expect(bad.operations.flashcard).toEqual([]);
    expect(bad.report.held).toEqual([{ reason: 'pages_incomplete', path: 'subcollections.flashcard_pages/en', count: 1 }]);
  });

  it('clientSequence считается внутри сущности: номер куска + 1', () => {
    const ids = Array.from({ length: 1200 }, (_, index) => `pack-${String(index).padStart(4, '0')}`);
    const result = runMigrationDryRun(snapshot({ progress: {
      community_owned_pack_ids_v1: ids, lesson1_best_score: '5', flashcards_v1: JSON.stringify([card('a'), card('b')]),
    } }));
    expect(result.operations.library_membership.map((op) => op.clientSequence)).toEqual([1, 2, 3]);
    expect(result.operations.lesson_progress.map((op) => op.clientSequence)).toEqual([1]);
    expect(result.operations.flashcard.map((op) => op.clientSequence)).toEqual([1, 1]);
  });

  it('снимок → новая карточка → повтор: старые операции duplicate, новая — applied', () => {
    const port = new MemoryPort();
    const first = runMigrationDryRun(snapshot({ progress: {
      lesson5_best_score: '4', flashcards_v1: JSON.stringify([card('c1'), card('c2')]),
    } }));
    const firstReceipts = first.batches.flatMap((batch) => applyBatch(port, UID, batch, NOW));
    expect(new Set(firstReceipts.map((receipt) => receipt.outcome))).toEqual(new Set(['applied']));
    // зачем: новая карточка сортируется ПЕРЕД старыми — раньше сдвигала общий счётчик.
    const second = runMigrationDryRun(snapshot({ progress: {
      lesson5_best_score: '4', flashcards_v1: JSON.stringify([card('a0'), card('c1'), card('c2')]),
    } }));
    const receipts = new Map(second.batches.flatMap((batch) => applyBatch(port, UID, batch, NOW + 1))
      .map((receipt) => [receipt.operationId, receipt.outcome]));
    const oldIds = new Set(operationIds(first));
    for (const [operationId, outcome] of receipts) {
      expect(outcome).toBe(oldIds.has(operationId) ? 'duplicate' : 'applied');
    }
    expect([...receipts.values()].filter((outcome) => outcome === 'applied')).toHaveLength(1);
  });

  it('изменилось содержимое сущности — новый operationId (хэш содержимого)', () => {
    const before = runMigrationDryRun(snapshot({ progress: { lesson1_best_score: '3' } }));
    const after = runMigrationDryRun(snapshot({ progress: { lesson1_best_score: '4' } }));
    expect(operationIds(after)[0]).not.toBe(operationIds(before)[0]);
  });
});

describe('accounts_v2_migration dry-run — ремонт №1: HOLD всего аккаунта и статус (P2)', () => {
  it.each([
    ['identityHidden:true', { identityHidden: true }, 'identity_hidden'],
    ['anon_merge_claim', { anon_merge_claim: { from: 'x' } }, 'anon_merge_pending'],
    ['canonicalStableId чужой', { canonicalStableId: 'someone-else' }, 'owner_mismatch'],
  ] as const)('%s → HOLD всего аккаунта, ноль операций', (_name, extra, reason) => {
    const result = runMigrationDryRun(snapshot({ ...(extra as Record<string, Json>), progress: { lesson1_best_score: '5' } }));
    expect(result.batches).toEqual([]);
    expect(result.report.held).toEqual([{ reason, path: '$', count: 1 }]);
    expect(result.report.status).toBe('hold');
    expect(result.report.applyAllowed).toBe(false);
  });

  it('identityHidden:false и anon_merge_claim:null — не блокируют аккаунт целиком', () => {
    const result = runMigrationDryRun(snapshot({ identityHidden: false, anon_merge_claim: null, progress: { lesson1_best_score: '5' } }));
    expect(result.operations.lesson_progress).toHaveLength(1);
    expect(heldPaths(result)).not.toContain('$');
  });

  it('только информационное (нет домена) — статус ready, применять можно', () => {
    const result = runMigrationDryRun(snapshot({ progress: { lesson1_best_score: '5', user_name: 'x', streak_count: '4' } }));
    expect(result.report.held).toEqual([]);
    expect(result.report.status).toBe('ready');
    expect(result.report.applyAllowed).toBe(true);
    expect(result.report.totals.informational).toBe(1);
    expect(result.report.totals.keptInPlace).toBe(1);
    expect(() => assertMigrationApplyAllowed(result.report)).not.toThrow();
  });

  it('исполнитель не применяет пакеты при статусе ≠ ready', () => {
    const held = runMigrationDryRun(snapshot({ progress: { brand_new_key_v7: '1', lesson1_best_score: '5' } }));
    expect(held.report.status).toBe('hold');
    expect(() => assertMigrationApplyAllowed(held.report)).toThrow('accounts_v2_migration_apply_forbidden:hold');
  });
});

describe('accounts_v2_migration dry-run — решения владельца 6–9', () => {
  it('руны → монеты 1:1: сумма в runesToCoins (информационно), баланс остаётся в леджере (keep_in_place); звёзды → drop', () => {
    const result = runMigrationDryRun(snapshot({
      stars: { balance: 120, earnedTotal: 500 }, v2_access_stars: 30, v2_access_stars_updated_at_ms: 5,
      practice_runes_daily: { day: '2026-09-30', count: 4 }, progress: { lesson1_best_score: '5' },
    }, { star_operations: [{ id: 'o1', data: { delta: 5 } }] }));
    expect(result.report.runesToCoins).toEqual({ rate: 1, runes: 120, coins: 120 });
    expect(result.report.keptInPlace).toEqual([
      { reason: 'coins_ledger_authoritative', path: 'stars', count: 1, decisions: ['D03', 'OD10'] },
    ]);
    expect(result.report.dropped).toEqual([
      { reason: 'stars_not_transferred', path: 'v2_access_stars', count: 1, decisions: ['OD10'] },
      { reason: 'stars_not_transferred', path: 'v2_access_stars_updated_at_ms', count: 1, decisions: ['OD10'] },
    ]);
    expect(result.operations.lesson_progress).toHaveLength(1);
    expect(JSON.stringify(result.batches)).not.toContain('120');
    expect(result.report.status).toBe('ready');
    expect(result.report.pendingDomainCount).toBe(0);
    expect(result.report.keptInPlaceCount).toBe(1);
    expect(legacyCleanupPaths(result.report)).not.toContain('stars');
  });

  it('нулевой баланс рун — переносить нечего; битый баланс — HOLD', () => {
    const zero = runMigrationDryRun(snapshot({ stars: { balance: 0 }, v2_access_stars: 0 }));
    expect(zero.report.status).toBe('ready');
    expect(zero.report.pendingDomainCount).toBe(0);
    expect(zero.report.runesToCoins).toEqual({ rate: 1, runes: 0, coins: 0 });
    const bad = runMigrationDryRun(snapshot({ stars: 'много' }));
    expect(bad.report.held).toEqual([{ reason: 'malformed_value', path: 'stars', count: 1 }]);
    expect(bad.report.runesToCoins.runes).toBe(0);
  });

  it('служебные поля входа (решение 11) — dropped, не блокируют перенос', () => {
    const result = runMigrationDryRun(snapshot({
      firebaseAuthUid: 'auth-1', linkedAuth: { google: true }, identityHidden: false, canonicalStableId: UID,
      progress: { lesson1_best_score: '5' },
    }));
    expect(result.report.held).toEqual([]);
    expect(result.report.status).toBe('ready');
    expect(result.report.dropped.map((entry) => entry.path)).toEqual(['canonicalStableId', 'firebaseAuthUid', 'identityHidden', 'linkedAuth']);
    for (const entry of result.report.dropped) expect(entry).toMatchObject({ reason: 'login_service_field', decisions: ['OD11'] });
  });

  it('купленная заморозка серии → dropped (решение 7), серия/экзамены/достижения → keep_in_place с путём', () => {
    const result = runMigrationDryRun(snapshot({ progress: {
      streak_freeze: '2', streak_count: '15', active_days_v1: '[]', 'level_exams_v2::fr::level_exam_A1_pct': '80',
      achievements_state: '{}', user_stats_v1: '{}',
    } }));
    expect(result.report.dropped).toEqual([
      { reason: 'streak_freeze_plus_only', path: 'progress.streak_freeze', count: 1, decisions: ['D101', 'D107'] },
    ]);
    const kept = result.report.keptInPlace.map((entry) => entry.path);
    expect(kept).toEqual([
      'progress.achievements_state', 'progress.active_days_v1', 'progress.level_exams_v2::fr::level_exam_A1_pct',
      'progress.streak_count', 'progress.user_stats_v1',
    ]);
    expect(result.report.status).toBe('ready');
  });
});

describe('accounts_v2_migration dry-run — SRS-память (решение 9)', () => {
  function memoryUser(memory: Record<string, Json>, extra: Record<string, Json> = {}): Json {
    return snapshot({ progress: {
      flashcards_v1: JSON.stringify([card('s1'), card('s2')]),
      custom_flashcards_v2: JSON.stringify([card('u1')]),
      flashcards_swipe_memory_v1: JSON.stringify(memory),
      ...extra,
    } });
  }

  function srsOf(result: MigrationDryRunResult, entityId: string): Json | undefined {
    const op = result.operations.flashcard.find((item) => item.entityId === entityId);
    return (op?.payload as { fields: Record<string, Json> } | undefined)?.fields.srs;
  }

  it('saved/custom → поле srs карточки с updatedAtMs = lastSeenAt; ядро принимает', () => {
    const result = runMigrationDryRun(memoryUser({
      'saved:all:s1': { correct: 2, wrong: 1, hints: 0, seen: 3, mastered: 1, lastSeenAt: SRS_TIME, nextDueAt: SRS_TIME + 5, ease: 2.4 },
      'custom:all:u1': { seen: 1, lastSeenAt: SRS_TIME - 10 },
    }));
    expect(srsOf(result, 'en:saved:s1')).toEqual({
      updatedAtMs: SRS_TIME, correct: 2, wrong: 1, hints: 0, seen: 3, mastered: 1, lastSeenAt: SRS_TIME, nextDueAt: SRS_TIME + 5, ease: 2.4,
    });
    expect(srsOf(result, 'en:custom:u1')).toEqual({ updatedAtMs: SRS_TIME - 10, seen: 1, lastSeenAt: SRS_TIME - 10 });
    expect(srsOf(result, 'en:saved:s2')).toBeUndefined();
    expect(result.report.held).toEqual([]);
    expect(result.report.disallowedFieldsCopied).toBe(0);
    const port = new MemoryPort();
    const receipts = result.batches.flatMap((batch) => applyBatch(port, UID, batch, NOW));
    expect(new Set(receipts.map((receipt) => receipt.outcome))).toEqual(new Set(['applied']));
  });

  it('нет времени правки — HOLD srs_time_missing, карточка переносится без srs', () => {
    const result = runMigrationDryRun(memoryUser({ 'saved:all:s1': { seen: 3, lastSeenAt: 0 }, 'saved:all:s2': { seen: 1 } }));
    expect(result.report.held).toEqual([
      { reason: 'srs_time_missing', path: 'progress.flashcards_swipe_memory_v1[*]', count: 2 },
    ]);
    expect(result.operations.flashcard).toHaveLength(3);
    for (const op of result.operations.flashcard) {
      expect((op.payload as { fields: Record<string, Json> }).fields.srs).toBeUndefined();
    }
  });

  it('неизвестное поле SRS-записи — HOLD; время в будущем относительно nowMs — HOLD', () => {
    const unknown = runMigrationDryRun(memoryUser({ 'saved:all:s1': { seen: 1, lastSeenAt: SRS_TIME, mystery: SENTINEL_TEXT } }));
    expect(unknown.report.held).toEqual([{ reason: 'unknown_srs_field', path: 'progress.flashcards_swipe_memory_v1[*].mystery', count: 1 }]);
    expect(srsOf(unknown, 'en:saved:s1')).toBeUndefined();
    const future = runMigrationDryRun(memoryUser({ 'saved:all:s1': { seen: 1, lastSeenAt: NOW + 3_600_000 } }), { nowMs: NOW });
    expect(future.report.held).toEqual([{ reason: 'srs_time_in_future', path: 'progress.flashcards_swipe_memory_v1[*]', count: 1 }]);
  });

  it('официальный набор → dropped D68; набор сообщества — carry_pending_domain; нет карточки — информационно', () => {
    const result = runMigrationDryRun(memoryUser({
      'official:pack1:x': { seen: 1, lastSeenAt: SRS_TIME },
      'community:pack2:y': { seen: 1, lastSeenAt: SRS_TIME },
      'saved:all:gone': { seen: 1, lastSeenAt: SRS_TIME },
    }));
    expect(result.report.dropped).toEqual([
      { reason: 'official_packs_removed', path: 'progress.flashcards_swipe_memory_v1[official:*]', count: 1, decisions: ['D68'] },
    ]);
    expect(result.report.informational).toEqual(expect.arrayContaining([
      { reason: 'carry_pending_domain', path: 'progress.flashcards_swipe_memory_v1[community:*]', count: 1 },
      { reason: 'srs_card_absent', path: 'progress.flashcards_swipe_memory_v1[saved:*]', count: 1 },
    ]));
    expect(result.report.held).toEqual([]);
  });

  it('встроенный srs карточки с updatedAtMs переносится; память свежее — побеждает память', () => {
    const embedded = { updatedAtMs: SRS_TIME - 100, seen: 9 };
    const result = runMigrationDryRun(snapshot({ progress: {
      flashcards_v1: JSON.stringify([card('e1', { srs: embedded }), card('e2', { srs: embedded })]),
      flashcards_swipe_memory_v1: JSON.stringify({ 'saved:all:e2': { seen: 1, lastSeenAt: SRS_TIME } }),
    } }));
    expect(srsOf(result, 'en:saved:e1')).toEqual(embedded);
    expect(srsOf(result, 'en:saved:e2')).toEqual({ updatedAtMs: SRS_TIME, seen: 1, lastSeenAt: SRS_TIME });
    expect(result.report.held).toEqual([]);
  });

  it('битая SRS-память (не объект) — HOLD malformed_value', () => {
    const result = runMigrationDryRun(memoryUser({}, { flashcards_swipe_memory_v1: '[1,2]' }));
    expect(result.report.held).toEqual([{ reason: 'malformed_value', path: 'progress.flashcards_swipe_memory_v1', count: 1 }]);
  });
});

describe('accounts_v2_migration dry-run — маскировка ключей (P3)', () => {
  it('почта, длинные id и не-ASCII в неизвестном ключе маскируются', () => {
    const result = runMigrationDryRun(snapshot({ progress: {
      'cache:someone@example.com:v1': '1', 'x:AbCdEf0123456789XyZ:v2': '1', 'ключ_Иван': '1',
    } }));
    const paths = heldPaths(result);
    expect(paths).toEqual(expect.arrayContaining(['progress.cache:<masked>:v1', 'progress.x:<masked>:v2', 'progress.<masked>']));
    const text = JSON.stringify(result.report);
    for (const secret of ['someone@example.com', 'AbCdEf0123456789XyZ', 'Иван']) expect(text).not.toContain(secret);
  });

  it('известные ключи keep_in_place — точный путь без маски', () => {
    const result = runMigrationDryRun(snapshot({ progress: { 'level_exams_v2::fr::level_exam_B1_passed': 'true' } }));
    expect(result.report.keptInPlace[0].path).toBe('progress.level_exams_v2::fr::level_exam_B1_passed');
  });
});
