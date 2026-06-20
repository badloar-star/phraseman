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
});
