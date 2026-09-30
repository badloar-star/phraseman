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
    expect(phraseCardSource).toContain('{!packTheme ? (');
    // зачем (Liquid Glass, cards.html #8/#37, 30.09.2026): грани PhraseCard без пака — на токенах
    // стекла активной темы (тон + мягкий блик), а не на cardGradient темы.
    expect(phraseCardSource).toContain('liquidGlassTokens(ctx.liquidGlassThemeId)');
    expect(phraseCardSource).toContain('backgroundColor: g.opaqueCard, borderColor: g.glassEdge');
    expect(phraseCardSource).toContain("colors={[g.selected, 'transparent']}");
  });
});
