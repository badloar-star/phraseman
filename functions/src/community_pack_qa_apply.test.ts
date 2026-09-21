// Контракт применения AI-правок к payload заявки UGC-набора.
// Главное, что охраняется: правка НЕ применяется вслепую — только если текущее
// значение совпадает с тем «было», которое владелец видел на экране.
import { applyQaFixesToPayload, type QaFix } from './community_pack_qa_apply';

function payloadWithCards() {
  return {
    titleRu: 'Фразовые глаголы',
    descriptionRu: 'Набор из урока',
    studyTarget: 'en',
    cards: [
      { id: 'c1', en: 'I go to school yesterday', ru: 'Я ходил в школу вчера' },
      { id: 'c2', en: 'She likes coffee', ru: 'Она любит кофе' },
    ],
  };
}

const cardFix = (over: Partial<QaFix> = {}): QaFix => ({
  scope: 'card',
  cardIndex: 0,
  cardId: 'c1',
  field: 'en',
  before: 'I go to school yesterday',
  after: 'I went to school yesterday',
  ...over,
});

describe('applyQaFixesToPayload', () => {
  it('применяет правку карточки и не трогает остальные поля', () => {
    const source = payloadWithCards();
    const result = applyQaFixesToPayload(source, [cardFix()]);

    expect(result.appliedCount).toBe(1);
    expect(result.skipped).toHaveLength(0);
    const cards = result.payload.cards as Array<Record<string, unknown>>;
    expect(cards[0].en).toBe('I went to school yesterday');
    expect(cards[0].ru).toBe('Я ходил в школу вчера');
    expect(cards[1].en).toBe('She likes coffee');
  });

  it('не мутирует исходный payload', () => {
    const source = payloadWithCards();
    applyQaFixesToPayload(source, [cardFix()]);
    expect(source.cards[0].en).toBe('I go to school yesterday');
  });

  it('пропускает правку, если текст изменился с момента проверки', () => {
    const source = payloadWithCards();
    source.cards[0].en = 'Автор уже переписал это сам';

    const result = applyQaFixesToPayload(source, [cardFix()]);

    expect(result.appliedCount).toBe(0);
    expect(result.skipped[0].reason).toBe('before_mismatch');
    const cards = result.payload.cards as Array<Record<string, unknown>>;
    expect(cards[0].en).toBe('Автор уже переписал это сам');
  });

  it('пропускает правку, если id карточки не совпал (индексы сдвинулись)', () => {
    const source = payloadWithCards();
    const result = applyQaFixesToPayload(source, [cardFix({ cardId: 'c-other' })]);

    expect(result.appliedCount).toBe(0);
    expect(result.skipped[0].reason).toBe('card_id_mismatch');
  });

  it('пропускает правку несуществующей карточки', () => {
    const result = applyQaFixesToPayload(payloadWithCards(), [cardFix({ cardIndex: 99, cardId: '' })]);
    expect(result.appliedCount).toBe(0);
    expect(result.skipped[0].reason).toBe('card_missing');
  });

  it('запрещает правку поля вне белого списка', () => {
    const result = applyQaFixesToPayload(payloadWithCards(), [
      cardFix({ field: 'priceShards', before: '', after: '0' }),
    ]);
    expect(result.appliedCount).toBe(0);
    expect(result.skipped[0].reason).toBe('field_not_editable');
  });

  it('не даёт стереть текст пустой правкой', () => {
    const result = applyQaFixesToPayload(payloadWithCards(), [cardFix({ after: '   ' })]);
    expect(result.appliedCount).toBe(0);
    expect(result.skipped[0].reason).toBe('empty_after');
  });

  it('правит заголовок набора', () => {
    const result = applyQaFixesToPayload(payloadWithCards(), [{
      scope: 'pack',
      field: 'titleRu',
      before: 'Фразовые глаголы',
      after: 'Фразовые глаголы из урока 16',
    }]);

    expect(result.appliedCount).toBe(1);
    expect(result.payload.titleRu).toBe('Фразовые глаголы из урока 16');
  });

  it('запрещает правку служебного поля набора под видом pack-правки', () => {
    const result = applyQaFixesToPayload(payloadWithCards(), [{
      scope: 'pack',
      field: 'studyTarget',
      before: 'en',
      after: 'fr',
    }]);

    expect(result.appliedCount).toBe(0);
    expect(result.skipped[0].reason).toBe('field_not_editable');
    expect(result.payload.studyTarget).toBe('en');
  });

  it('применяет часть правок и объясняет каждую пропущенную', () => {
    const source = payloadWithCards();
    const result = applyQaFixesToPayload(source, [
      cardFix(),
      cardFix({ cardIndex: 1, cardId: 'c2', field: 'en', before: 'не тот текст', after: 'She likes tea' }),
    ]);

    expect(result.appliedCount).toBe(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0].reason).toBe('before_mismatch');
  });

  it('переживает payload без карточек, не падая', () => {
    const result = applyQaFixesToPayload(null, [cardFix()]);
    expect(result.appliedCount).toBe(0);
    expect(result.skipped[0].reason).toBe('card_missing');
  });
});
