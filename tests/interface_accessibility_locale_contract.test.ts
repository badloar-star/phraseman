import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const ALL_INTERFACE_LOCALE_KEYS = ['ru:', 'uk:', 'es:', "'pt-BR':", 'vi:', 'id:', 'tr:', 'pl:'];

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('release UI accessibility localization', () => {
  const localizedTemplates = [
    ['app/(tabs)/home.tsx', 'home shard balance'],
    ['components/ui/V2Countdown.tsx', 'tournament question timer'],
    ['components/flashcards/FlashcardsHubHeader.tsx', 'flashcards balance'],
    ['components/flashcards/CollectionLimitHeader.tsx', 'flashcards collection limit'],
  ] as const;

  it.each(localizedTemplates)('%s supplies all interface locales for %s', (file) => {
    const source = read(file);
    expect(source).toContain('triLang(lang, {');
    for (const localeKey of ALL_INTERFACE_LOCALE_KEYS) {
      expect(source).toContain(localeKey);
    }
  });

  it('does not leave the old Russian accessibility templates in the release UI', () => {
    expect(read('app/(tabs)/home.tsx')).not.toContain('accessibilityLabel={`Баланс: ${shardsBalance} жемчужин`}');
    expect(read('components/ui/V2Countdown.tsx')).not.toContain('accessibilityLabel={`Время вопроса: ${Math.ceil(seconds)} секунд`}');
    expect(read('components/flashcards/FlashcardsHubHeader.tsx')).not.toContain('accessibilityLabel={`Баланс: ${balance}`}');
    expect(read('components/flashcards/CollectionLimitHeader.tsx')).not.toContain('accessibilityLabel={`Сохранено ${saved} из ${FREE_FLASHCARD_LIMIT}`}');
  });
});
