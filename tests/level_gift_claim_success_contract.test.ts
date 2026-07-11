import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(ROOT, relativePath), 'utf8').replace(/\r\n/g, '\n');

describe('level gift claim success contract', () => {
  it('claims single gifts locally before applying reward effects', () => {
    const source = readSource(path.join('components', 'LevelGiftModal.tsx'));
    const tapApplyBlock = source.slice(
      source.indexOf('const applyP: Promise<ApplyGiftResult>'),
      source.indexOf('const applyResultP: Promise<ApplyGiftResult>'),
    );
    const choiceBlock = source.slice(
      source.indexOf('const handleChoice = async'),
      source.indexOf('if (!visible || !gift) return null'),
    );

    expect(tapApplyBlock).toContain('const claimP = (onGiftClaimed ? onGiftClaimed(g) : markGiftClaimed(level))');
    expect(tapApplyBlock.indexOf('await claimP;')).toBeLessThan(tapApplyBlock.indexOf('const result = await applyGift('));
    expect(tapApplyBlock).toContain('if (result.success) {');
    expect(tapApplyBlock).toContain('} else if (!onGiftClaimed) {\n            await saveUnclaimedGift(level, g);');

    expect(choiceBlock).toContain('const claimP = (onGiftClaimed ? onGiftClaimed(chosen) : markGiftClaimed(level))');
    expect(choiceBlock.indexOf('await claimP;')).toBeLessThan(choiceBlock.indexOf('const setEnergyFn = async'));
    expect(choiceBlock.indexOf('const setEnergyFn = async')).toBeLessThan(choiceBlock.indexOf('const result = await applyGift('));
    expect(choiceBlock).toContain('if (result.success) {');
    expect(choiceBlock).toContain('} else if (!onGiftClaimed) {\n          await saveUnclaimedGift(level, chosen);');
  });

  it('closes dual gifts immediately and persists reward effects in the background', () => {
    const source = readSource(path.join('components', 'LevelGiftDualModal.tsx'));
    const outcomeBlock = source.slice(
      source.indexOf('const persistDualGiftOutcome = async'),
      source.indexOf('const runOpenAnim ='),
    );
    const handleDoneBlock = source.slice(
      source.indexOf('const handleDone = async'),
      source.indexOf('const handleUseNow = async'),
    );
    const handleUseNowBlock = source.slice(
      source.indexOf('const handleUseNow = async'),
      source.indexOf('if (!visible || !f2pGift || !premGift) return null'),
    );

    expect(outcomeBlock).toContain('await markDualGiftClaimed(level);');
    expect(outcomeBlock).toContain('await saveRemainingGiftAfterPartialDualClaim(level, prem);');
    expect(outcomeBlock).toContain('await saveRemainingGiftAfterPartialDualClaim(level, f2p);');
    expect(outcomeBlock).not.toContain('await saveUnclaimedGift(level, prem);');
    expect(outcomeBlock).not.toContain('await saveUnclaimedGift(level, f2p);');
    expect(outcomeBlock).toContain('await saveUnclaimedDualGift(level, { f2p, prem });');

    expect(handleDoneBlock).toContain('onClose(true);');
    expect(handleDoneBlock).toContain('void (async () => {');
    expect(handleDoneBlock).toContain('f2pApplyPromiseRef.current ?? Promise.resolve(f2pAppliedMeta)');
    expect(handleDoneBlock).toContain('premApplyPromiseRef.current ?? Promise.resolve(premAppliedMeta)');
    expect(handleDoneBlock).toContain('await persistDualGiftOutcome(f2p, prem, f2pResult, premResult);');

    expect(handleUseNowBlock).toContain('onClose(true);');
    expect(handleUseNowBlock).toContain('void (async () => {');
    expect(handleUseNowBlock).toContain('await persistDualGiftOutcome(f2p, prem, f2pResult, premResult);');
    expect(handleUseNowBlock).not.toContain('await markDualGiftClaimed(level);');
    expect(handleUseNowBlock).not.toContain('await markGiftClaimed(level);');
  });
});
