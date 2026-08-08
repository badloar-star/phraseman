import {
  buildMistakeBundleMessages,
  parseMistakeExplanationBundle,
} from './mistake_explain_bundle';

const FULL_OPEN = '<PHRASEMAN_FULL_V1>';
const FULL_CLOSE = '</PHRASEMAN_FULL_V1>';
const ELI5_OPEN = '<PHRASEMAN_ELI5_V1>';
const ELI5_CLOSE = '</PHRASEMAN_ELI5_V1>';

function bundle(full: string, eli5: string): string {
  return `${FULL_OPEN}\n${full}\n${FULL_CLOSE}\n${ELI5_OPEN}\n${eli5}\n${ELI5_CLOSE}`;
}

describe('mistake explanation bundle', () => {
  it('parses exactly one full and one ELI5 section', () => {
    expect(parseMistakeExplanationBundle(bundle('Полный текст', 'Простой текст'))).toEqual({
      full: 'Полный текст',
      eli5: 'Простой текст',
    });
  });

  it.each([
    ['missing markers', 'Полный текст без маркеров'],
    ['empty full', bundle('', 'Простой текст')],
    ['empty ELI5', bundle('Полный текст', '')],
    ['missing ELI5', `${FULL_OPEN}\nПолный текст\n${FULL_CLOSE}`],
    ['extra prefix', `Нельзя показывать\n${bundle('Полный текст', 'Простой текст')}`],
    ['extra suffix', `${bundle('Полный текст', 'Простой текст')}\nНельзя показывать`],
    ['duplicate full', `${bundle('Первый', 'Простой')}\n${FULL_OPEN}\nВторой\n${FULL_CLOSE}`],
  ])('rejects %s without returning partial text', (_name, raw) => {
    expect(() => parseMistakeExplanationBundle(raw)).toThrow('mistake_explain_invalid_bundle');
  });

  it('adds strict bundle instructions without mutating the original inputs', () => {
    const base = [
      { role: 'system' as const, content: 'full-system' },
      { role: 'user' as const, content: 'full-user' },
    ];

    const result = buildMistakeBundleMessages(base);

    expect(result).not.toBe(base);
    expect(result[0]).not.toBe(base[0]);
    expect(result[0].content).toContain('full-system');
    expect(result[0].content).toContain(FULL_OPEN);
    expect(result[0].content).toContain(ELI5_OPEN);
    expect(result[0].content).toContain('under 55 words');
    expect(result[0].content).toContain('same interface language');
    expect(result[1].content).toContain('full-user');
    expect(base).toEqual([
      { role: 'system', content: 'full-system' },
      { role: 'user', content: 'full-user' },
    ]);
  });

  it('rejects a message list without both system and user messages', () => {
    expect(() => buildMistakeBundleMessages([
      { role: 'system', content: 'only-system' },
    ])).toThrow('mistake_explain_bundle_messages_required');
  });
});
