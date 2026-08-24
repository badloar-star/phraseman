import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(ROOT, relativePath), 'utf8').replace(/\r\n/g, '\n');

describe('level gift claim success contract', () => {
  it('pins every modal inventory mutation to the immutable token captured for that opening', () => {
    const single = readSource(path.join('components', 'LevelGiftModal.tsx'));
    const dual = readSource(path.join('components', 'LevelGiftDualModal.tsx'));
    const inventoryScreen = readSource(path.join('app', 'level_gifts_inventory.tsx'));
    const giftSystem = readSource(path.join('app', 'level_gift_system.ts'));
    const openingGuard = readSource(path.join('app', 'level_gift_opening_guard.ts'));

    expect(single).toContain('captureAccountGeneration,');
    expect(single).toContain('type AccountGenerationToken,');
    expect(single).toContain('openingAccountTokenRef.current = captureAccountGeneration();');
    expect(single).toContain('const accountToken = openingAccountTokenRef.current;');
    expect(single).toContain('onGiftClaimed(g, accountToken)');
    expect(single).toContain('markGiftClaimed(level, accountToken)');
    expect(single).toContain('saveClaimedGiftRarity(level, g.rarity, accountToken)');
    expect(single).toContain('saveUnclaimedGift(level, g, accountToken)');
    expect(single).toContain('onGiftClaimed(chosenWithReservation, accountToken)');
    expect(single).toContain('markGiftClaimed(level, accountToken)');
    expect(single).toContain('saveClaimedGiftRarity(level, chosenWithReservation.rarity, accountToken)');
    expect(single).toContain('saveUnclaimedGift(level, chosenWithReservation, accountToken)');
    expect(single.match(/studyTarget,\s*accountToken/g)?.length).toBeGreaterThanOrEqual(2);
    expect(single).not.toContain('if (!isVisibleRef.current)');
    expect(single).toContain('if (!isCurrentAccountGeneration(accountToken)) return;');

    expect(dual).toContain('captureAccountGeneration,');
    expect(dual).toContain('type AccountGenerationToken,');
    expect(dual).toContain('openingAccountTokenRef.current = captureAccountGeneration();');
    expect(dual).toContain('const accountToken = openingAccountTokenRef.current;');
    expect(dual).toContain('markDualGiftClaimed(level, accountToken)');
    expect(dual).toContain('markGiftClaimed(level, accountToken)');
    expect(dual).toContain('setLevelHadDualClaim(level, accountToken)');
    expect(dual).toContain('saveClaimedGiftRarity(level, best, accountToken)');
    expect(dual).toContain('saveRemainingGiftAfterPartialDualClaim(level, prem, accountToken)');
    expect(dual).toContain('saveRemainingGiftAfterPartialDualClaim(level, f2p, accountToken)');
    expect(dual).toContain('saveUnclaimedDualGift(level, { f2p, prem }, accountToken)');
    expect(dual.match(/studyTarget,\s*accountToken/g)?.length).toBeGreaterThanOrEqual(2);
    expect(dual).not.toContain('if (!wasVisibleRef.current)');
    expect(dual).toContain('if (!isCurrentAccountGeneration(accountToken)) return;');
    expect(inventoryScreen).toContain('(_gift, accountToken) => markDualGiftPartClaimed(selected.level, selected.dualPart!, accountToken)');
    expect(giftSystem).toContain('return withAccountTransitionLock(async () => {');
    expect(giftSystem).toContain('if (!isCurrentAccountGeneration(accountToken)) return { success: false };');
    expect(giftSystem).toContain('return applyGiftUnlocked(gift, userName, currentEnergy, maxEnergy, setEnergy, opts);');
    expect(openingGuard).toContain('currentOpeningToken === handlerToken');
    expect(single).toContain('isCurrentLevelGiftOpening(openingAccountTokenRef.current, accountToken)');
    expect(dual).toContain('isCurrentLevelGiftOpening(openingAccountTokenRef.current, accountToken)');
  });

  it('applies single-gift effects before removing the recoverable inventory entitlement', () => {
    const source = readSource(path.join('components', 'LevelGiftModal.tsx'));
    const tapApplyBlock = source.slice(
      source.indexOf('const applyP: Promise<ApplyGiftResult>'),
      source.indexOf('const applyResultP: Promise<ApplyGiftResult>'),
    );
    const choiceBlock = source.slice(
      source.indexOf('const handleChoice = async'),
      source.indexOf('if (!visible || !gift) return null'),
    );

    expect(tapApplyBlock.indexOf('const result = await applyGift(')).toBeLessThan(
      tapApplyBlock.indexOf('await (onGiftClaimed ? onGiftClaimed(g, accountToken) : markGiftClaimed(level, accountToken));'),
    );
    expect(tapApplyBlock).toContain('if (result.success) {');
    expect(tapApplyBlock).toMatch(/} else if \(onGiftApplyFailed\) {\s+await onGiftApplyFailed\(g, accountToken\);/);

    expect(choiceBlock.indexOf('const setEnergyFn = async')).toBeLessThan(choiceBlock.indexOf('const result = await applyGift('));
    expect(choiceBlock.indexOf('const result = await applyGift(')).toBeLessThan(
      choiceBlock.indexOf('await (onGiftClaimed ? onGiftClaimed(chosenWithReservation, accountToken) : markGiftClaimed(level, accountToken));'),
    );
    expect(choiceBlock).toContain('if (result.success) {');
    expect(choiceBlock).toContain('} else if (onGiftApplyFailed) {\n          await onGiftApplyFailed(chosenWithReservation, accountToken);');
  });

  it('closes dual gifts immediately and persists reward effects in the background', () => {
    const source = readSource(path.join('components', 'LevelGiftDualModal.tsx'));
    const outcomeBlock = source.slice(
      source.indexOf('const persistDualGiftOutcome = async'),
      // Граница — следующая функция (handleCloseMidWith): путь «закрыть в середине»
      // легально использует isCurrentOpening, а persistDualGiftOutcome — нет.
      source.indexOf('const handleCloseMidWith'),
    );
    const handleDoneBlock = source.slice(
      source.indexOf('const handleDone = async'),
      source.indexOf('const handleUseNow = async'),
    );
    const handleUseNowBlock = source.slice(
      source.indexOf('const handleUseNow = async'),
      source.indexOf('if (!visible || !f2pGift || !premGift) return null'),
    );

    expect(outcomeBlock).toContain('await markDualGiftClaimed(level, accountToken);');
    expect(outcomeBlock).toContain('await saveRemainingGiftAfterPartialDualClaim(level, prem, accountToken);');
    expect(outcomeBlock).toContain('await saveRemainingGiftAfterPartialDualClaim(level, f2p, accountToken);');
    expect(outcomeBlock).not.toContain('await saveUnclaimedGift(level, prem);');
    expect(outcomeBlock).not.toContain('await saveUnclaimedGift(level, f2p);');
    expect(outcomeBlock).toContain('await saveUnclaimedDualGift(level, { f2p, prem }, accountToken);');
    expect(outcomeBlock).toContain('const f2pOk = f2pResult.success === true || f2pResult.alreadyClaimed === true;');
    expect(outcomeBlock).toContain('const premOk = premResult.success === true || premResult.alreadyClaimed === true;');
    expect(outcomeBlock).toContain('if (!isCurrentAccountGeneration(accountToken)) return;');
    expect(outcomeBlock).not.toContain('isCurrentOpening(accountToken)');

    expect(handleDoneBlock).toContain('onClose(true);');
    expect(handleDoneBlock).toContain('void (async () => {');
    expect(handleDoneBlock).toContain('f2pApplyPromiseRef.current ?? Promise.resolve(f2pAppliedMeta)');
    expect(handleDoneBlock).toContain('premApplyPromiseRef.current ?? Promise.resolve(premAppliedMeta)');
    expect(handleDoneBlock).toContain('await persistDualGiftOutcome(f2p, prem, f2pResult, premResult, accountToken);');
    expect(handleDoneBlock).toContain('if (isCurrentOpening(accountToken)) {');
    expect(handleDoneBlock.indexOf('if (isCurrentOpening(accountToken)) {')).toBeLessThan(
      handleDoneBlock.indexOf('await persistDualGiftOutcome('),
    );

    expect(handleUseNowBlock).toContain('onClose(true);');
    expect(handleUseNowBlock).toContain('void (async () => {');
    expect(handleUseNowBlock).toContain('await persistDualGiftOutcome(f2p, prem, f2pResult, premResult, accountToken);');
    expect(handleUseNowBlock).toContain('if (isCurrentOpening(accountToken)) {');
    expect(handleUseNowBlock).not.toContain('await markDualGiftClaimed(level);');
    expect(handleUseNowBlock).not.toContain('await markGiftClaimed(level);');
  });
});
