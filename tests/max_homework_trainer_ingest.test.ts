// Домашка MAX → карточки Тренажёра: чистая сборка (без AsyncStorage).
// зачем: обещание учителя «фразы будут в Тренажёре» держится на этом модуле —
// формат карточки обязан совпадать с ручным созданием (categoryId 'custom',
// перевод в поле СВОЕЙ локали), а дедуп — не плодить дубликаты при повторной
// домашке с теми же фразами.
import { buildMaxHomeworkCards } from '../app/max_homework_trainer_ingest';
import type { CardItem } from '../app/flashcards/types';

const NOW = 1_756_500_000_000;

const baseArgs = {
  lang: 'ru' as const,
  studyTarget: 'en' as const,
  sessionId: 'vs_test-session',
  nowMs: NOW,
};

function existingCard(en: string): CardItem {
  return {
    id: `old_${en}`,
    en,
    ru: 'старое',
    uk: '',
    categoryId: 'custom',
    isSystem: false,
  } as CardItem;
}

describe('buildMaxHomeworkCards', () => {
  it('строит карточку в формате ручного создания: значение в поле своей локали', () => {
    const { cards, created } = buildMaxHomeworkCards([], {
      ...baseArgs,
      items: [{ text: "I'd like a large one", meaning: 'Я бы хотел большой' }],
    });

    expect(created).toBe(1);
    expect(cards[0]).toMatchObject({
      en: "I'd like a large one",
      ru: 'Я бы хотел большой',
      uk: '',
      es: '',
      categoryId: 'custom',
      isSystem: false,
      source: 'max_voice',
      sourceId: 'vs_test-session',
      addedAt: NOW,
    });
    expect(cards[0].id).toBe(`max_hw_${NOW}_0`);
  });

  it('кладёт перевод неплановой локали в sourceLocales (vi), не затирая базовые поля', () => {
    const { cards } = buildMaxHomeworkCards([], {
      ...baseArgs,
      lang: 'vi' as const,
      items: [{ text: 'How much is it?', meaning: 'Cái này giá bao nhiêu?' }],
    });

    expect(cards[0].ru).toBe('');
    expect(cards[0].sourceLocales?.vi).toBe('Cái này giá bao nhiêu?');
  });

  it('дедуп по тексту: против существующей коллекции (без учёта регистра) и внутри пачки', () => {
    const { cards, created, duplicates } = buildMaxHomeworkCards(
      [existingCard('Could I get the bill?')],
      {
        ...baseArgs,
        items: [
          { text: 'could i get the bill?', meaning: 'Можно счёт?' },
          { text: 'See you tomorrow', meaning: 'До завтра' },
          { text: 'See you tomorrow', meaning: 'До завтра (дубль)' },
        ],
      },
    );

    expect(created).toBe(1);
    expect(duplicates).toBe(2);
    expect(cards.map((c) => c.en)).toEqual(['See you tomorrow']);
  });

  it('пустой текст или пустое значение — пропуск, не карточка-огрызок', () => {
    const { cards, created } = buildMaxHomeworkCards([], {
      ...baseArgs,
      items: [
        { text: '   ', meaning: 'что-то' },
        { text: 'A phrase', meaning: '' },
      ],
    });

    expect(created).toBe(0);
    expect(cards).toHaveLength(0);
  });

  it('английская транскрипция только для курса en; fr-курс без английской IPA', () => {
    const en = buildMaxHomeworkCards([], {
      ...baseArgs,
      items: [{ text: 'water', meaning: 'вода' }],
    });
    const fr = buildMaxHomeworkCards([], {
      ...baseArgs,
      studyTarget: 'fr' as const,
      items: [{ text: 'bonjour', meaning: 'здравствуйте' }],
    });

    // Для en транскрипция либо есть, либо честно отсутствует (словарь не знает
    // слова) — но для fr её быть НЕ должно никогда.
    expect(fr.cards[0].transcription).toBeUndefined();
    expect(en.created).toBe(1);
  });
});
