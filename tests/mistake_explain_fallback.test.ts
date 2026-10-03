import {
  aiExplainLaterNote,
  aiExplainRefreshLabel,
  buildMistakeExplainFallbackText,
} from '../app/mistake_explain_fallback';
import type { Lang } from '../constants/i18n';

// зачем: D158 - локальный шаблон должен быть непустым и осмысленным во всех 9 локалях шторки,
// собираться только из известных слов ошибки и не содержать выдуманной грамматики.
const LANGS: Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

describe('mistake explain local fallback (D158)', () => {
  it.each(LANGS)('builds all three template shapes for %s', (lang) => {
    const both = buildMistakeExplainFallbackText(lang, { picked: 'cat', expected: 'dog' });
    const missing = buildMistakeExplainFallbackText(lang, { picked: undefined, expected: 'dog' });
    const generic = buildMistakeExplainFallbackText(lang, {});
    expect(both).toContain('dog');
    expect(both).toContain('cat');
    expect(missing).toContain('dog');
    expect(missing).not.toContain('cat');
    expect(generic.length).toBeGreaterThan(10);
    expect(generic).not.toContain('undefined');
    expect(aiExplainLaterNote(lang).length).toBeGreaterThan(5);
    expect(aiExplainRefreshLabel(lang).length).toBeGreaterThan(2);
  });

  it('trims words and ignores blanks', () => {
    expect(buildMistakeExplainFallbackText('en', { picked: '  ', expected: ' dog ' })).toContain('“dog”');
  });
});
