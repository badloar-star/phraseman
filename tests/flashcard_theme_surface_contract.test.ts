import fs from 'node:fs';
import path from 'node:path';

const listItemSource = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'flashcards', 'FlashcardListItem.tsx'),
  'utf8',
);
const phraseCardSource = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'flashcards', 'PhraseCard.tsx'),
  'utf8',
);

describe('saved flashcard theme surfaces', () => {
  test('ordinary card faces use both colors from the active theme card palette', () => {
    expect(listItemSource).toContain('{!usePackFace && (');
    expect(listItemSource).toContain('colors={t.cardGradient}');
    expect(listItemSource).toContain('colors={[t.cardGradient[1], t.cardGradient[0]]}');
    expect(phraseCardSource).toContain('{!packTheme ? <PlateFill g={g} radius={faceRadius} /> : null}');
    // зачем (Liquid Glass, cards.html #8/#37, 30.09.2026; Тень 12.10): грани PhraseCard без пака — на токенах
    // активной темы: заливка плашки (PlateFill) и тень плашки без кромки glassEdge, а не на cardGradient темы.
    expect(phraseCardSource).toContain('liquidGlassTokens(ctx.liquidGlassThemeId)');
    expect(phraseCardSource).toContain('backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g)');
    expect(phraseCardSource).not.toContain('borderColor: g.glassEdge');
  });
});
