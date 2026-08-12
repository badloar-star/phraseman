import { pickReleaseNotesTexts } from '../components/release_notes_copy';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const TOURNAMENT_TERMS = /турн(?:ир|ір)|torne|turn(?:amen|uva|iej)|giải đấu/iu;

describe('release notes tournament owner lock', () => {
  test.each(LOCALES)('does not advertise a retired tournament route in %s', (locale) => {
    const copy = pickReleaseNotesTexts(locale);
    const visibleText = copy.items.map((item) => `${item.title}\n${item.body}`).join('\n');

    expect(copy.items.length).toBeGreaterThan(0);
    expect(visibleText).not.toMatch(TOURNAMENT_TERMS);
  });
});
