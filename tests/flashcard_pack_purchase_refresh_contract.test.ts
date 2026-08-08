import fs from 'fs';
import path from 'path';

describe('flashcard pack shard purchase refresh contract', () => {
  it('waits briefly for local market refresh after successful purchase', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'app', 'flashcards', 'useCardPackShardPaywall.tsx'),
      'utf8',
    );

    const successStart = source.indexOf("if (r === 'ok')");
    const openingStart = source.indexOf('const alreadyOpened = await isPackCeremoniallyOpened', successStart);
    const successBody = source.slice(successStart, openingStart);

    expect(successBody).toContain('await Promise.race');
    expect(successBody).toContain('Promise.resolve(onAfterPurchase()).catch(() => {})');
    expect(successBody).toContain('setTimeout(resolve, 900)');
  });

  it('does not render an already-owned pack as purchasable during initial hydration', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'flashcards.tsx'), 'utf8');

    expect(source).toContain('peekWarmOwnedPackIds');
    expect(source).toContain(
      'const [ownedPackIds, setOwnedPackIds] = useState<string[]>(() => peekWarmOwnedPackIds(studyTarget) ?? []);',
    );
  });

  it('forwards the source locale and closes every terminal no-op result', () => {
    const hook = fs.readFileSync(
      path.join(process.cwd(), 'app', 'flashcards', 'useCardPackShardPaywall.tsx'),
      'utf8',
    );
    const purchase = fs.readFileSync(
      path.join(process.cwd(), 'app', 'flashcards', 'cardPackShardPurchase.ts'),
      'utf8',
    );

    expect(hook).toContain('redeemPackGiftVoucher(pw.pack, studyTarget, lang)');
    expect(hook).toContain('purchaseCardPackWithShards(pw.pack, studyTarget, lang)');
    expect(hook).toContain("r === 'already_owned'");
    expect(hook).toContain("r === 'spend_failed' || r === 'source_gated'");
    expect(purchase).toContain('sourceLocale?: unknown');
    expect(purchase).toContain('flashcardsOfficialPacksAvailableForTarget(studyTarget, sourceLocale)');
  });
});
