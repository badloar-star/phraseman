import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('бонусная колода: выбор любого набора навсегда', () => {
  const paywallHook = read('app/flashcards/useCardPackShardPaywall.tsx');
  const purchase = read('app/flashcards/cardPackShardPurchase.ts');
  const communityPurchase = read('app/community_packs/purchaseCommunityPack.ts');
  /**
   * Cards 2.1 §1.3: каталог раздела «Карточки» больше не продаёт и не «дарит» наборы —
   * ваучерный флоу целиком живёт в «Магазине осколков» (`shards_shop.tsx`).
   */
  const hub = read('app/shards_shop.tsx');
  const shop = read('app/shards_shop.tsx');
  const modal = read('app/flashcards/CardPackShardPaywallModal.tsx');
  const giftState = read('app/flashcards/pack_trial_gift.ts');
  const boonBootstrap = read('app/boons/boon_bootstrap.ts');
  const functionsClient = read('app/community_packs/functionsClient.ts');
  const globalBroadcast = read('app/global_broadcast_modal.ts');
  const leagueRewards = read('app/services/league_chest_rewards.ts');
  const functionsIndex = read('functions/src/index.ts');
  const functionsPackage = read('functions/package.json');
  const accountDelete = read('functions/src/account_delete.ts');

  it('ваучер доступен и официальным, и community-наборам', () => {
    expect(paywallHook).toContain('const voucherEligible = hasVoucher && (!pack.isCommunityUgc || hasCommunityVoucher);');
    expect(paywallHook).not.toContain('hasVoucher && !pack.isCommunityUgc');
    expect(giftState).toContain('hasActiveCommunityPackGiftVoucher');
    expect(giftState).not.toContain('getTodaysBoons');
    expect(boonBootstrap).toContain('setPackGiftTrial48hOnce(studyTarget, occurrenceId');
  });

  it('official и community используют один серверный claim, а не раздельные пути', () => {
    expect(purchase).toContain('callFlashcardPackGiftRedeem');
    expect(communityPurchase).toContain('callFlashcardPackGiftRedeem');
    expect(communityPurchase).not.toContain('callCommunityRedeemPackGiftVoucher');
    expect(communityPurchase).toContain('consumePackGiftTrial(trial.localVoucherId)');
    expect(purchase).toContain('voucherId: trial.voucherId');
    expect(communityPurchase).toContain('voucherId: trial.voucherId');
    expect(purchase).toContain('voucherOccurrenceId: trial.occurrenceId');
    expect(communityPurchase).toContain('voucherOccurrenceId: trial.occurrenceId');
  });

  it('сначала завершает серверный receipt и локальное владение, затем best-effort кэш и consume', () => {
    const officialRedeem = purchase.slice(purchase.indexOf('export async function redeemPackGiftVoucher'));
    expect(officialRedeem.indexOf('callFlashcardPackGiftRedeem')).toBeLessThan(officialRedeem.indexOf('addOwnedPackId'));
    expect(officialRedeem.indexOf('bindPackGiftVoucherSelection')).toBeLessThan(officialRedeem.indexOf('addOwnedPackId'));
    expect(officialRedeem.indexOf('addOwnedPackId')).toBeLessThan(officialRedeem.indexOf('consumePackGiftTrial'));
    expect(officialRedeem).toContain('primeMarketplaceBuiltCardsCacheFromOwnedStorage(studyTarget).catch(() => {})');

    const communityRedeem = communityPurchase.slice(communityPurchase.indexOf('export async function redeemCommunityPackGiftVoucher'));
    expect(communityRedeem.indexOf('callFlashcardPackGiftRedeem')).toBeLessThan(communityRedeem.indexOf('addCommunityOwnedPackId'));
    expect(communityRedeem.indexOf('bindPackGiftVoucherSelection')).toBeLessThan(communityRedeem.indexOf('addCommunityOwnedPackId'));
    expect(communityRedeem.indexOf('addCommunityOwnedPackId')).toBeLessThan(communityRedeem.indexOf('consumePackGiftTrial'));
  });

  it('не блокирует recovery ранним локальным already-owned и закрывает modal с явной ошибкой', () => {
    const communityRedeem = communityPurchase.slice(communityPurchase.indexOf('export async function redeemCommunityPackGiftVoucher'));
    expect(communityRedeem).not.toContain("if (owned.includes(pack.id)) return 'already_owned';");
    expect(paywallHook).toContain("r === 'no_voucher' || r === 'redeem_failed'");
  });

  it('в Витрине и Сообществе каждая доступная плитка получает иконку подарка', () => {
    expect(hub).toContain('const voucherEligible = hasActiveVoucher && (!pack.isCommunityUgc || hasCommunityPackVoucher) && !owned;');
    expect(hub).toContain("'gift-outline'");
  });

  it('магазин карточек показывает подарок без исключения community из общей политики', () => {
    expect(shop).toContain('const voucherEligible = hasActiveVoucher && (!pack.isCommunityUgc || hasCommunityPackVoucher) && !owned;');
    expect(shop).toContain('hasCommunityVoucher: hasCommunityPackVoucher');
    expect(shop).not.toContain('hasActiveVoucher && !pack.isCommunityUgc && !owned');
  });

  it('hub и магазин обновляют истечение ваучера только в фокусе с минутным lifecycle timer', () => {
    expect(hub).toContain('60_000');
    expect(hub).toContain("AppState.addEventListener('change'");
    expect(hub).toContain('clearInterval');
    expect(shop).toContain('60_000');
    expect(shop).toContain('shardsShopRuntimeActive');
    expect(shop).toContain('clearInterval');
  });

  it('server-issued voucher id survives local state and is required by league/global sources', () => {
    expect(giftState).toContain('voucherId?: string');
    expect(leagueRewards).toContain('rewardPack.packGiftVoucherId');
    expect(functionsClient).toContain('callFlashcardPackGiftGrantGlobalBroadcast');
    expect(globalBroadcast).toContain('callFlashcardPackGiftGrantGlobalBroadcast');
    expect(globalBroadcast).toContain('grant.voucherId');
    expect(globalBroadcast).toContain('grant.expiresAt');
  });

  it('new callables are exported, deploy-safe, and their user-owned rows are deletable', () => {
    expect(functionsIndex).toContain('flashcardPackGiftRedeem');
    expect(functionsIndex).toContain('flashcardPackGiftGrantGlobalBroadcast');
    expect(functionsIndex).toContain('flashcardPackGiftSyncState');
    expect(functionsPackage).toContain('functions:flashcardPackGiftRedeem');
    expect(functionsPackage).toContain('functions:flashcardPackGiftGrantGlobalBroadcast');
    expect(functionsPackage).toContain('functions:flashcardPackGiftSyncState');
    const communityDeploy = JSON.parse(functionsPackage).scripts['deploy:community-gift'] as string;
    for (const name of ['leagueChestClaim', 'accountDeleteMine', 'accountDeleteEnqueue', 'accountDeleteWorker', 'accountDeleteRetryCron']) {
      expect(communityDeploy).toContain(`functions:${name}`);
    }
    expect(accountDelete).toContain("collection: 'flashcard_pack_gift_claims'");
    expect(accountDelete).toContain("collection: 'flashcard_pack_gift_entitlements'");
    expect(accountDelete).toContain("collection: 'flashcard_pack_gift_grants'");
  });

  it('hub and shop best-effort merge cross-device gift state on focus', () => {
    expect(hub).toContain('syncFlashcardPackGiftState');
    expect(shop).toContain('syncFlashcardPackGiftState().then(() => refreshPackTrial())');
  });

  it('подтверждение прямо обещает постоянное владение', () => {
    expect(modal).toContain('Этот набор навсегда добавится в «Карточки» бесплатно');
  });
});
