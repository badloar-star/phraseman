import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

// зачем короче (владелец, 2026-08-16): клиентские экраны расширения
// (лаборатория, призрачные дуэли, соперничества, карта мастерства, партнёр)
// удалены — дублировали быстрый матч и ранги, добавляя сущности без новых
// задач. Серверная часть НЕ тронута: функции, правила и индексы ниже по
// файлу продолжают охранять реальный контракт, магазин звёзд остаётся.
const ROUTES = [
  'arena_today',
  'arena_star_wallet',
] as const;

const CALLABLES = [
  'arenaExpansionHome',
  'arenaTodayStart',
  'arenaTodaySubmitAnswer',
  'arenaTodaySubmitSpeedAttempt',
  'arenaTodaySync',
  'arenaMatchLabGet',
  'arenaGhostCreate',
  'arenaGhostAccept',
  'arenaGhostStatus',
  'arenaGhostDecline',
  'arenaRivalPropose',
  'arenaRivalAccept',
  'arenaRivalNext',
  'arenaRivalLeave',
  'arenaRivalMute',
  'arenaPartnerInvite',
  'arenaPartnerAccept',
  'arenaPartnerPause',
  'arenaPartnerPreferences',
  'arenaPartnerNudge',
  'arenaPartnerRemove',
  'arenaPartnerClaimSpotlight',
  'arenaStarStore',
  'arenaStarPurchase',
  'arenaStarEquip',
] as const;

describe('Arena Expansion integration boundary', () => {
  test('registers every expansion route in the permanent Arena stack', () => {
    const layout = read('app/_layout.tsx');
    for (const route of ROUTES) {
      expect(fs.existsSync(path.join(ROOT, 'app', `${route}.tsx`))).toBe(true);
      expect(layout).toContain(`<Stack.Screen name="${route}"`);
      expect(read('app/product_analytics_screen_registry.ts')).toContain(`'${route}'`);
    }
  });

  test('exports the complete callable surface from the deployed entrypoint', () => {
    const index = read('functions/src/index.ts');
    for (const callable of CALLABLES) expect(index).toContain(callable);
    // Стиль кавычек в точке входа переписывает форматирование, и держать
    // договор за него — значит краснеть от прогона prettier, а не от ошибки.
    expect(/from ['"]\.\/arena_expansion['"]/.test(index)).toBe(true);
  });

  test('closes every server-only root and scopes every user projection', () => {
    const rules = read('firestore.rules');
    for (const collection of [
      'arena_v2_daily_private',
      'arena_v2_ghosts',
      'arena_v2_series',
      'arena_v2_partnerships',
    ]) {
      expect(rules).toMatch(new RegExp(`match /${collection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\{[^}]+\\} \\{[\\s\\S]*?allow read, write: if false;`));
    }
    for (const collection of [
      'arena_v2_daily_attempts',
      'arena_v2_expansion_runs',
      'arena_v2_mastery_signatures',
      'arena_v2_activity_days',
      'arena_v2_expansion_receipts',
    ]) {
      expect(rules).toMatch(new RegExp(`match /${collection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\{[^}]+\\} \\{[\\s\\S]*?allow read, write: if false;`));
    }
    for (const collection of [
      'arena_v2_match_labs',
      'arena_v2_partner_weeks',
      'arena_v2_star_ledger',
      'arena_v2_entitlements',
    ]) {
      expect(rules).toContain(`match /${collection}/`);
      expect(rules).toMatch(new RegExp(`match /${collection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/\\{[^}]+\\} \\{[\\s\\S]*?allow write: if false;`));
    }
  });

  test('keeps expansion code out of Learning V2 and retired Tournament runtime', () => {
    const source = [
      read('functions/src/arena_expansion.ts'),
      read('functions/src/arena_expansion_core.ts'),
      read('app/arena_client.ts'),
    ].join('\n');
    expect(source).not.toMatch(/v2_star_journal|v2_wallet|learning_v2|LearningV2/);
    expect(source).not.toMatch(/from ['"]\.\/tournaments['"]/);
  });

  test('ships only the proven Ghost query index and suppresses sealed payload indexing', () => {
    const indexes = JSON.parse(read('firestore.indexes.json')) as {
      indexes: Array<{ collectionGroup: string; fields: Array<{ fieldPath: string; order?: string; arrayConfig?: string }> }>;
      fieldOverrides: Array<{ collectionGroup: string; fieldPath: string; indexes: unknown[] }>;
    };
    expect(indexes.indexes).toEqual(expect.arrayContaining([expect.objectContaining({
      collectionGroup: 'arena_v2_ghosts',
      fields: [
        { fieldPath: 'participantStableUids', arrayConfig: 'CONTAINS' },
        { fieldPath: 'status', order: 'ASCENDING' },
      ],
    }), expect.objectContaining({
      collectionGroup: 'arena_v2_ghosts',
      fields: [
        { fieldPath: 'fromStableUid', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
      ],
    }), expect.objectContaining({
      collectionGroup: 'arena_v2_ghosts',
      fields: [
        { fieldPath: 'fromStableUid', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'expiresAtMs', order: 'ASCENDING' },
      ],
    }), expect.objectContaining({
      collectionGroup: 'arena_v2_ghosts',
      fields: [
        { fieldPath: 'pairId', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
      ],
    }), expect.objectContaining({
      collectionGroup: 'arena_v2_ghosts',
      fields: [
        { fieldPath: 'pairId', order: 'ASCENDING' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'expiresAtMs', order: 'ASCENDING' },
      ],
    }), expect.objectContaining({
      collectionGroup: 'arena_v2_partnerships',
      fields: [
        { fieldPath: 'participantStableUids', arrayConfig: 'CONTAINS' },
        { fieldPath: 'status', order: 'ASCENDING' },
      ],
    }), expect.objectContaining({
      collectionGroup: 'arena_v2_series',
      fields: [
        { fieldPath: 'pairId', order: 'ASCENDING' },
        { fieldPath: 'dayKey', order: 'ASCENDING' },
        { fieldPath: 'createdAtMs', order: 'DESCENDING' },
      ],
    }), expect.objectContaining({
      collectionGroup: 'arena_v2_series',
      fields: [
        { fieldPath: 'participantStableUids', arrayConfig: 'CONTAINS' },
        { fieldPath: 'status', order: 'ASCENDING' },
      ],
    }), expect.objectContaining({
      collectionGroup: 'arena_v2_ghosts',
      fields: [
        { fieldPath: 'participantStableUids', arrayConfig: 'CONTAINS' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'expiresAtMs', order: 'ASCENDING' },
      ],
    }), expect.objectContaining({
      collectionGroup: 'arena_v2_ghosts',
      fields: [
        { fieldPath: 'participantStableUids', arrayConfig: 'CONTAINS' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'completedAtMs', order: 'DESCENDING' },
      ],
    }), expect.objectContaining({
      collectionGroup: 'arena_v2_partnerships',
      fields: [
        { fieldPath: 'participantStableUids', arrayConfig: 'CONTAINS' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'expiresAtMs', order: 'ASCENDING' },
      ],
    }), expect.objectContaining({
      collectionGroup: 'arena_v2_series',
      fields: [
        { fieldPath: 'participantStableUids', arrayConfig: 'CONTAINS' },
        { fieldPath: 'status', order: 'ASCENDING' },
        { fieldPath: 'offerExpiresAtMs', order: 'ASCENDING' },
      ],
    })]));
    for (const [collectionGroup, fieldPath] of [
      ['arena_v2_daily_private', 'tasks'],
      ['arena_v2_ghosts', 'tasks'],
      ['arena_v2_ghosts', 'hostPlan'],
      ['arena_v2_expansion_runs', 'tasks'],
      ['arena_v2_expansion_runs', 'answers'],
      ['arena_v2_match_labs', 'tasks'],
      ['arena_v2_profiles', 'equippedCosmetics'],
    ]) {
      expect(indexes.fieldOverrides).toEqual(expect.arrayContaining([
        { collectionGroup, fieldPath, indexes: [] },
      ]));
    }
  });

  test('documents gross season progress separately from spendable balance', () => {
    const contract = read('docs/arena/EXPANSION_PRODUCT_CONTRACT.md');
    expect(contract).toContain('season.stars');
    expect(contract).toContain('users/{uid}.stars.balance');
    expect(contract).toContain('Покупка уменьшает только кошелёк');
  });

  test('Arena purchase prechecks and returns the unified revisioned stars ledger', () => {
    const source = read('functions/src/arena_expansion.ts');
    const start = source.indexOf('export const arenaStarPurchase');
    const end = source.indexOf('export const arenaStarEquip', start);
    const purchase = source.slice(start, end);
    expect(purchase).toContain('normalizeStars(userSnap.data()?.stars)');
    expect(purchase).not.toContain('Number(profile.starWalletBalance');
    expect(purchase).toContain("errorCode === 'insufficient_stars'");
    expect(purchase).toContain('starsSeq: purchaseResult.seq');
  });

  test('Arena home and store expose lifetime earned stars separately from season progress', () => {
    const source = read('functions/src/arena_expansion.ts');
    const home = source.slice(
      source.indexOf('export const arenaExpansionHome'),
      source.indexOf('export const arenaTodayStart'),
    );
    const store = source.slice(
      source.indexOf('export const arenaStarStore'),
      source.indexOf('export const arenaStarPurchase'),
    );
    expect(home).toContain('starsEarnedTotal: unifiedStars.earnedTotal');
    expect(store).toContain('starsEarnedTotal: unifiedStars.earnedTotal');
    expect(home).toContain('seasonStarsEarned:');
    expect(store).toContain('seasonStarsEarned:');
  });
});
