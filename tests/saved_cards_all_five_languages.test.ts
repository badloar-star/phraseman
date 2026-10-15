// зачем (аудит кнопок Карточек #1, координатор 15.10): сохранённые карточки es/de/it НЕ загружались — хук читал только en и fr. Теперь все пять языков наборов везде, где читаются карманы сохранённых.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split('\r\n').join('\n');

describe('сохранённые карточки: все пять языков', () => {
  const hook = read('hooks/use-flashcards.ts');
  it('хук не перечисляет только en и fr', () => {
    expect(hook).not.toContain("['en', 'fr']");
    expect(hook).toContain('PACK_LANGUAGES.map(target => loadFlashcardsForAccount(target, token))');
    expect((hook.match(/for \(const target of PACK_LANGUAGES\)/g) ?? []).length).toBe(2);
  });
  it('прогретый кэш первого кадра и обложка стопки читают все пять', () => {
    const contour = read('app/flashcards/saved_language_contour.ts');
    expect(contour).toContain('PACK_LANGUAGES.map((code) => ({ code, cards: peekFlashcardsCache(code) }))');
    expect(contour).not.toContain("peekFlashcardsCache('en')?.[0] ?? peekFlashcardsCache('fr')?.[0]");
    expect(contour).toContain('for (const code of PACK_LANGUAGES)');
  });
});
