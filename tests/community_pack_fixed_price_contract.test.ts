import fs from 'fs';
import path from 'path';
import {
  COMMUNITY_PACK_PRICE_SHARDS,
  buildCommunityPackPayloadForCloud,
  validateCommunityPackPayload,
  type CommunityPackSubmissionPayload,
} from '../app/community_packs/schema';
import { mapCommunityPackDocToMarket } from '../app/community_packs/communityFirestore';

jest.mock('@react-native-firebase/firestore', () => jest.fn());
jest.mock('../app/community_packs/functionsClient', () => ({
  callCommunityFetchPackCardsIfAccessible: jest.fn(),
  isCommunityPacksCloudEnabled: jest.fn(() => true),
}));

const ROOT = path.join(__dirname, '..');

function payloadWithClientPrice(priceShards: number): CommunityPackSubmissionPayload {
  return {
    studyTarget: 'en',
    title: 'Creator pack',
    description: 'Community examples',
    sourceLang: 'ru',
    priceShards,
    cards: Array.from({ length: 10 }, (_, i) => ({
      id: `c${i + 1}`,
      en: `Phrase ${i + 1}`,
      ru: `Фраза ${i + 1}`,
    })),
  };
}

describe('community pack fixed price contract', () => {
  it('uses exactly 10 pearls and ignores stale or forged client prices in submission payloads', () => {
    const stalePayload = payloadWithClientPrice(40);

    expect(COMMUNITY_PACK_PRICE_SHARDS).toBe(10);
    expect(validateCommunityPackPayload(stalePayload)).toBeNull();
    expect(buildCommunityPackPayloadForCloud(stalePayload)).toMatchObject({ priceShards: 10 });
  });

  it('maps every legacy community listing to the canonical price', () => {
    const pack = mapCommunityPackDocToMarket('legacy-price-pack', {
      listingStatus: 'published',
      studyTarget: 'en',
      titleRu: 'Старый набор',
      cardCount: 10,
      priceShards: 999,
      updatedAt: 1,
    }, { studyTarget: 'en' });

    expect(pack?.priceShards).toBe(10);
  });

  it('shows a static fixed price in create and admin UI instead of stored arbitrary values', () => {
    const createSource = fs.readFileSync(path.join(ROOT, 'app', 'community_pack_create.tsx'), 'utf8');
    const adminSource = fs.readFileSync(path.join(ROOT, 'admin', 'v2', 'legacy.html'), 'utf8');
    const functionsSource = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'community_packs.ts'), 'utf8');

    expect(createSource).toContain('Цена набора для всех: 10 жемчужин. Изменить её нельзя.');
    expect(createSource).not.toContain('Проверь название, описание, цену и все карточки.');
    expect(createSource).not.toContain("case 'price':");

    expect(adminSource).toContain('const COMMUNITY_PACK_FIXED_PRICE_SHARDS = 10;');
    expect(adminSource).toContain('const pr = COMMUNITY_PACK_FIXED_PRICE_SHARDS;');
    expect(adminSource).toContain('const price = COMMUNITY_PACK_FIXED_PRICE_SHARDS;');
    expect(adminSource).toContain('String(COMMUNITY_PACK_FIXED_PRICE_SHARDS)');
    expect(functionsSource).not.toContain('priceShards: Math.floor(Number(payload.priceShards))');
  });

  it('wires every client gift callable through the Functions export and safe deploy lists', () => {
    const clientSource = fs.readFileSync(path.join(ROOT, 'app', 'community_packs', 'functionsClient.ts'), 'utf8');
    const indexSource = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'index.ts'), 'utf8');
    const functionsPackage = JSON.parse(fs.readFileSync(path.join(ROOT, 'functions', 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    const clientCallableNames = [
      'flashcardPackGiftRedeem',
      'flashcardPackGiftGrantGlobalBroadcast',
    ];
    const deployedCallableNames = [
      ...clientCallableNames,
      'communityRedeemPackGiftVoucher',
    ];

    for (const callableName of clientCallableNames) {
      expect(clientSource).toContain(`'${callableName}'`);
    }
    for (const callableName of deployedCallableNames) {
      expect(indexSource).toMatch(new RegExp(`\\b${callableName}\\b`));
      expect(functionsPackage.scripts['deploy:community-gift']).toContain(`functions:${callableName}`);
      expect(functionsPackage.scripts['deploy:safe']).toContain(`functions:${callableName}`);
    }
    expect(indexSource).toMatch(/\badminRefundCommunityPackPurchase\b/);
    expect(functionsPackage.scripts['deploy:safe']).toContain('functions:adminRefundCommunityPackPurchase');
  });

  it('keeps refund authority on the server and achievement spend on the canonical price', () => {
    const adminSource = fs.readFileSync(path.join(ROOT, 'admin', 'v2', 'legacy.html'), 'utf8');
    const appPurchaseSource = fs.readFileSync(path.join(ROOT, 'app', 'community_packs', 'purchaseCommunityPack.ts'), 'utf8');
    const functionsSource = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'community_packs.ts'), 'utf8');
    const digestSource = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'admin_daily_digest.ts'), 'utf8');
    const profileSource = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'admin_user_profile.ts'), 'utf8');
    const refundBodies = [...adminSource.matchAll(/window\.refundUgcPurchase = async function refundUgcPurchase\(purchaseId\) \{[\s\S]*?\n  \};/g)]
      .map((match) => match[0]);
    const refundCenterBodies = [...adminSource.matchAll(/window\.loadRefunds = async function\(force\) \{[\s\S]*?\n  \};/g)]
      .map((match) => match[0]);
    const ugcRenderBodies = [...adminSource.matchAll(/window\.renderUgcPurchases = function renderUgcPurchases\(\) \{[\s\S]*?\n  \};/g)]
      .map((match) => match[0]);
    const user360SocialBody = adminSource.match(/\} else if \(kind === 'social'\) \{[\s\S]*?(?=\} else if \(kind === 'unified'\) \{)/)?.[0] || '';

    expect(refundBodies).toHaveLength(1);
    refundBodies.forEach((body) => {
      expect(body).toContain('getAdminRefundCommunityPackPurchaseCallable()');
      expect(body).not.toContain('runTransaction(');
      expect(body).not.toContain('p.priceShards');
    });
    expect(refundCenterBodies).toHaveLength(1);
    refundCenterBodies.forEach((body) => {
      expect(body).toContain('amount: communityPurchaseDisplayPrice(p)');
      expect(body).not.toContain('p.refundedAmountShards');
    });
    expect(ugcRenderBodies).toHaveLength(1);
    ugcRenderBodies.forEach((body) => {
      expect(body).toContain("p.authorStableId || p.sellerStableId || p.sellerUid || ''");
      expect(body).toContain("const seller = p.authorStableId || p.sellerStableId || p.sellerUid || '?'");
      expect(body).not.toContain("(p.sellerStableId || p.sellerUid || '').toLowerCase()");
      expect(body).not.toContain("const seller = p.sellerStableId || p.sellerUid || '?'");
    });
    expect(user360SocialBody).toContain("u360Query('community_pack_purchases', 'authorStableId', uid, 'createdAt', 15)");
    expect(user360SocialBody).toContain("u360Query('community_pack_purchases', 'sellerStableId', uid, 'createdAt', 15)");
    expect(user360SocialBody).toContain('u360MergeRowsById(authoredSales, legacySales)');
    expect(user360SocialBody).not.toContain("const [buys, sells, refByMe, refMe]");
    expect(adminSource).toContain('function u360MergeRowsById(...rowSets)');
    expect(adminSource).toContain('if (id && !rowsById.has(id)) rowsById.set(id, row);');
    expect(adminSource).toContain("return purchase?.acquisitionSource === 'weekly_boon_gift' ? 0 : COMMUNITY_PACK_FIXED_PRICE_SHARDS;");
    expect(adminSource).toContain('const refundBtn = communityPurchaseCanRefund(p)');
    expect(adminSource).toContain('communityPurchaseDisplayPrice(r)');
    expect(adminSource).not.toContain("String(r.priceShards ?? r.price ?? '—')");
    expect(digestSource).toContain('canonicalCommunityPackPurchaseShards(p)');
    expect(digestSource).not.toContain('Number(p.priceShards)');
    expect(profileSource).toContain('canonicalizeCommunityPurchaseRows(ugcBuys.rows)');
    expect(profileSource).toContain('canonicalizeCommunityPurchaseRows(ugcSells.rows)');
    expect(profileSource).not.toContain("ugcBuys, ['id', 'packId', 'packTitle', 'status', 'priceShards', 'price', 'createdAt']");
    expect(profileSource).not.toContain("ugcSells, ['id', 'packId', 'packTitle', 'status', 'priceShards', 'price', 'createdAt']");
    expect(appPurchaseSource).toContain('trackExternalShardSpendAchievement(COMMUNITY_PACK_PRICE_SHARDS)');
    expect(appPurchaseSource).not.toContain('trackExternalShardSpendAchievement(pack.priceShards)');
    expect(functionsSource).toMatch(/readonly priceShards\?: unknown;/);
    expect(functionsSource).toMatch(
      /export const adminRefundCommunityPackPurchase = onCall\(\s*\{ region: 'us-central1', enforceAppCheck: ENFORCE_APP_CHECK \}/,
    );
  });
});
