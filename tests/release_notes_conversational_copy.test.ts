import { pickReleaseNotesTexts } from '../components/release_notes_copy';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const EXPECTED_ICONS = [
  'flash-outline',
  'heart-outline',
  'sparkles-outline',
  'person-outline',
  'trophy-outline',
  'swap-horizontal-outline',
  'hardware-chip-outline',
];

describe('conversational post-update copy', () => {
  test.each(LOCALES)('%s has the complete seven-chapter story', (locale) => {
    const copy = pickReleaseNotesTexts(locale);

    expect(copy.items).toHaveLength(7);
    expect(copy.items.map((item) => item.icon)).toEqual(EXPECTED_ICONS);
    expect(copy.pill.trim()).not.toBe('');
    expect(copy.title.trim()).not.toBe('');
    expect(copy.subtitle.trim()).not.toBe('');
    expect(copy.cta.trim()).not.toBe('');
    expect(copy.close.trim()).not.toBe('');
  });

  it('uses the owner-approved Russian conversational chapters', () => {
    const copy = pickReleaseNotesTexts('ru');

    expect(copy.title).toBe('Мы тут снова всё поменяли');
    expect(copy.subtitle).toBe('Спокойно: сейчас расскажем, что куда переехало и зачем.');
    expect(copy.items.map((item) => item.title)).toEqual([
      'Сначала — про энергию',
      'У тебя три попытки',
      'А руны откуда?',
      'Мы освежили твой образ',
      'Арена снова в игре',
      '«Маршрут» собирает чемоданы',
      'И да — теперь есть МАКС',
    ]);
    expect(copy.cta).toBe('Пойти посмотреть');
  });

  it('does not expose internal development names in visible Russian copy', () => {
    const copy = pickReleaseNotesTexts('ru');
    const visible = [
      copy.pill,
      copy.title,
      copy.subtitle,
      ...copy.items.flatMap((item) => [item.title, item.body]),
      copy.footer,
      copy.cta,
      copy.close,
    ].join('\n');

    expect(visible).not.toMatch(/learning\s*v?2|лернинг|леарнинг|v2/i);
  });
});
