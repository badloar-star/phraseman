import type { Lang } from '../constants/i18n';
import { arenaExpansionText } from '../modules/arena/expansion_copy';
import { arenaUnifiedStarsObservation, normalizeArenaExpansionHome, masteryLevel } from '../modules/arena/expansion_contract';
import { evaluateArenaLabRecovery, evaluateArenaLabSpeedAttempt, visibleArenaRecoveryItems } from '../modules/arena/expansion_model';
import { ARENA_LOCALIZED_STORE_ITEM_IDS, arenaStoreItemTitle } from '../modules/arena/expansion_store_copy';
import { arenaActionEvent, arenaFeatureOpenEvent, arenaRunCompleteEvent, arenaStoreActionEvent } from '../modules/arena/telemetry';
import { ARENA_COSMETICS, arenaCosmeticDefinition } from '../modules/arena/arena_cosmetics';
import fs from 'node:fs';
import path from 'node:path';

const locales = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const satisfies readonly Lang[];

describe('Arena Expansion client contract', () => {
  test('normalizes score, privacy-safe partner progress, slots, and exactly ten Today tasks', () => {
    const home = normalizeArenaExpansionHome({
      ok: true,
      availability: { today: true, lab: true, ghost: true, rival: true, mastery: true, partner: true, store: true },
      walletStars: 40,
      starsEarnedTotal: 1000,
      seasonStarsEarned: 90,
      equippedBySlot: { title: 'title_wordsmith' },
      mastery: { guess_phrase: { score: 65, sampleCount: 8, confidence: 'preliminary', accuracy: 72, medianMs: 1200, trend: 'up' } },
      today: { dayKey: '2026-08-11', status: 'in_progress', matchId: 'run', completedTasks: 99 },
      partners: [{ partnershipId: 'p', state: 'active', partnerName: 'Friend', sharedDays: 3, targetSharedDays: 5, claimedSharedDayThresholds: [3] }],
      rivals: [],
      store: { catalogVersion: 'v1' },
    });
    expect(home.today).toMatchObject({ totalTasks: 10, completedTasks: 10 });
    expect(home.mastery[0]).toMatchObject({ score: 65, accuracy: 72 });
    expect(home.partner).toMatchObject({ sharedDays: 3, claimedSharedDayThresholds: [3] });
    expect(home.partners).toHaveLength(1);
    expect(home.wallet.equippedBySlot.title).toBe('title_wordsmith');
    expect(home.wallet).toMatchObject({ walletStars: 40, starsEarnedTotal: 1000, seasonStarsEarned: 90 });
    expect(arenaUnifiedStarsObservation(home)).toEqual({ stars: 40, starsEarnedTotal: 1000 });
  });

  test('normalizes numeric mastery trend and preserves active-run resume metadata', () => {
    const home = normalizeArenaExpansionHome({
      ok: true,
      availability: { today: true, lab: true, ghost: true, rival: true, mastery: true, partner: true, store: true },
      walletStars: 0,
      starsEarnedTotal: 0,
      seasonStarsEarned: 0,
      mastery: { speed_match: { score: 80, sampleCount: 9, confidence: 'confident', accuracy: 81, trend: -0.4 } },
      today: { dayKey: '2026-08-11', status: 'available' },
      partners: [], rivals: [], store: {},
      activeRun: { runId: 'ghost_g1', runKind: 'ghost' },
    });
    expect(home.mastery[0].trend).toBe('down');
    expect(home.activeRun).toEqual({ runId: 'ghost_g1', runKind: 'ghost' });
    expect(home.wallet.starsSeq).toBeUndefined();
  });

  test('the shared home client observes revisioned stars for every Arena home consumer', () => {
    const client = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_client.ts'), 'utf8');
    const wallet = fs.readFileSync(path.resolve(__dirname, '..', 'app/arena_star_wallet.tsx'), 'utf8');
    expect(client).toMatch(/arenaExpansionHome[\s\S]*captureAccountGeneration\(\)[\s\S]*callArena<ArenaExpansionHomeWire>[\s\S]*mergeLevelSpinServerStars/);
    expect(client).toMatch(/export async function arenaStarStore[\s\S]*callArena<ArenaStarStoreResponse>[\s\S]*arenaUnifiedStarsObservation/);
    expect(client).toContain('isCurrentAccountGeneration(accountToken, ownerStableId)');
    expect(wallet).not.toMatch(/mergeLevelSpinServerStars\(accountToken,\s*\{\s*stars:\s*home\.wallet\.walletStars/);
  });

  test('classifies only the frozen 0..100 mastery score thresholds', () => {
    expect([null, 49, 50, 65, 80, 90].map((score) => masteryLevel({ score }))).toEqual(['hidden', 'starter', 'developing', 'strong', 'expert', 'mastered']);
  });

  test('caps owner-only recovery at three and evaluates exact encoded answers', () => {
    const item = { publicTask: { taskId: 'a', mode: 'guess_phrase', kind: 'choice', isVoice: false, difficulty: 1, payload: { phrase: 'x', options: ['a', 'b'] } } as const, correctAnswer: { selectedIndex: 1 } };
    expect(visibleArenaRecoveryItems([item, item, item, item])).toHaveLength(3);
    expect(evaluateArenaLabRecovery({ selectedIndex: 1 }, { selectedIndex: 1 })).toBe(true);
    expect(evaluateArenaLabSpeedAttempt({ pairs: [2, 0] }, 0, 2)).toBe(true);
  });

  test('localizes all 13 store items and expansion copy in eight locales', () => {
    expect(ARENA_LOCALIZED_STORE_ITEM_IDS).toHaveLength(13);
    for (const locale of locales) {
      expect(arenaExpansionText(locale, 'ghostDisclosure')).not.toBe('');
      for (const itemId of ARENA_LOCALIZED_STORE_ITEM_IDS) expect(arenaStoreItemTitle(locale, itemId)).toBeTruthy();
    }
  });

  test('wires every shipped cosmetic id to a code-native consumer treatment', () => {
    expect(ARENA_COSMETICS).toHaveLength(13);
    expect(new Set(ARENA_COSMETICS.map((item) => item.itemId)).size).toBe(13);
    for (const itemId of ARENA_LOCALIZED_STORE_ITEM_IDS) expect(arenaCosmeticDefinition(itemId)).not.toBeNull();
  });

  test('telemetry is bounded and contains no identity, answer, token, exact balance, or raw error', () => {
    const descriptors = [
      arenaFeatureOpenEvent('ghost', 'invite'),
      arenaActionEvent('today', 'start', 'mixed'),
      arenaRunCompleteEvent('today', 'mixed', 'complete', 99, 640_000),
      arenaStoreActionEvent('purchase', 'title_wordsmith', 'title', 600),
    ];
    expect(descriptors[2].params).toMatchObject({ correct_count: 10, duration_bucket: '10m_plus' });
    const json = JSON.stringify(descriptors);
    expect(json).not.toMatch(/uid|token|answer|opponent|wallet|rating|raw_error/);
  });
});
