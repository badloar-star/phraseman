import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('level gift server reservation contract', () => {
  const levelGifts = read('app/level_gift_system.ts');
  const client = read('app/community_packs/functionsClient.ts');
  const functionsIndex = read('functions/src/index.ts');
  const functionsPackage = read('functions/package.json');
  const accountDelete = read('functions/src/account_delete.ts');
  const singleModal = read('components/LevelGiftModal.tsx');
  const dualModal = read('components/LevelGiftDualModal.tsx');

  test('both lanes consume a canonical server reservation and never Math.random', () => {
    const f2p = levelGifts.slice(
      levelGifts.indexOf('export async function rollF2pLevelGiftForUser'),
      levelGifts.indexOf('/** Второй сундук'),
    );
    const premium = levelGifts.slice(
      levelGifts.indexOf('export async function rollPremiumLevelGiftForUser'),
      levelGifts.indexOf('export async function rollLevelGiftForUser'),
    );
    expect(f2p).toContain("reserveServerLevelGift(level, 'f2p'");
    expect(premium).toContain("reserveServerLevelGift(level, 'premium'");
    expect(f2p).not.toContain('Math.random');
    expect(premium).not.toContain('Math.random');
    expect(client).toContain("'levelGiftReserve'");
  });

  test('the root host is Spin-only while inventory modals retain canonical reservation handling', () => {
    const rootLayout = read('app/_layout.tsx');
    expect(rootLayout).not.toContain('acquireLevelGiftDisplay');
    expect(rootLayout).not.toContain('reserveLevelGiftForDisplay');
    expect(rootLayout).not.toContain('saveUnclaimedGift');
    expect(rootLayout).not.toContain('saveUnclaimedDualGift');
    expect(singleModal).toContain('rollF2pLevelGiftForUser(level, { studyTarget })');
    expect(dualModal).toContain('rollF2pLevelGiftForUser(level, { premiumSafe: true, studyTarget })');
    expect(dualModal).toContain('rollPremiumLevelGiftForUser(level, { studyTarget })');
  });

  test('pack access activates a server grant and carries its voucher into local state/redemption', () => {
    expect(levelGifts).toContain('levelGiftReservation?:');
    expect(levelGifts).toContain('callLevelGiftActivatePackGift');
    expect(levelGifts).toContain('grant.voucherId');
    expect(levelGifts).toContain('callFlashcardPackGiftRedeem');
    expect(client).toContain("'levelGiftActivatePackGift'");
  });

  test('server perk receipts replace local mirrors exactly after complete_claim', () => {
    expect(levelGifts).toContain("AsyncStorage.setItem(CHAIN_SHIELD_KEY, completed.chainShield)");
    expect(levelGifts).toContain("AsyncStorage.setItem(GIFT_MULT_KEY, completed.giftXpMultiplier)");
    const completion = levelGifts.slice(
      levelGifts.indexOf("action: 'complete_claim'"),
      levelGifts.indexOf('removeLevelGiftApplyJournalEntry', levelGifts.indexOf("action: 'complete_claim'")),
    );
    expect(completion).not.toContain('Math.max');
  });

  test('callables are export/deploy/delete covered', () => {
    expect(functionsIndex).toContain('levelGiftReserve');
    expect(functionsIndex).toContain('levelGiftActivatePackGift');
    expect(functionsPackage).toContain('functions:levelGiftReserve');
    expect(functionsPackage).toContain('functions:levelGiftActivatePackGift');
    expect(accountDelete).toContain("collection: 'level_gift_reservations'");
  });

  test('reservation failure tells the user the gift is retained before closing', () => {
    for (const modal of [singleModal, dualModal]) {
      const failure = modal.slice(modal.indexOf('} catch {'), modal.indexOf('} catch {') + 700);
      expect(failure).toContain("emitAppEvent('action_toast'");
      expect(failure).toContain('onClose(false)');
      expect(failure.indexOf("emitAppEvent('action_toast'")).toBeLessThan(failure.indexOf('onClose(false)'));
    }
  });
});
