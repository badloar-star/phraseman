// зачем (координатор 12.10, cards-010 снят пустым «Пока пусто»): лимит «сохранённых» 50/50 считается по СОХРАНЁННЫМ карточкам, а cards=custom50 пишет СВОИ — в «Сохранённых» они не видны.
// Ссылка cards-010 / cards-v2-045 обязана наполнять «Сохранённые» (cards=demo, 64 карточки) на Free (plus=off); custom50 остаётся только у лимита своих карточек (cards-v2-046).
import fs from 'node:fs';
import path from 'node:path';

const steps = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'dev_links_r1_steps.py'), 'utf8');

describe('dev links: cards-010 fills the saved list', () => {
  it("cards-010 / cards-v2-045 use cards=demo&plus=off on the saved route, not custom50", () => {
    const line = steps.split(/\r?\n/).find((l) => l.startsWith("add(['cards-010', 'cards-v2-045']"));
    expect(line).toBeDefined();
    expect(line).toContain("'cards=demo&plus=off'");
    expect(line).toContain('SAVED');
    expect(line).not.toContain('CUSTOM50');
  });

  it('custom50 stays only for the own-cards limit row', () => {
    const uses = steps.split(/\r?\n/).filter((l) => l.startsWith('add(') && l.includes('CUSTOM50'));
    expect(uses).toHaveLength(1);
    expect(uses[0]).toContain("'cards-v2-046'");
  });

  it('the free saved limit is counted from saved cards (why custom50 produced an empty frame)', () => {
    const container = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards_collection.tsx'), 'utf8');
    // 15.10 (аудит Карточек #11): лимит считается по сохранённым карточкам ЯЗЫКА набора, а не по всем языкам сразу — смысл теста прежний: считаем от сохранённых, не от показанных
    expect(container).toMatch(/savedLimitReached = savedSurface && !isPremium && \(hiddenByLimitCount > 0 \|\| savedCardsForPackLanguage\.length >= FREE_SAVED_CARD_LIMIT\)/);
  });
});
