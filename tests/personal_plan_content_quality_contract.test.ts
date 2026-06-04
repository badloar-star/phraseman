import {
  validatePersonalPlanContentQuality,
  type PersonalPlanContentQualityScope,
  type PersonalPlanPhraseDraft,
} from '../app/personal_plan_content_quality_contract';

const dayOneScope: PersonalPlanContentQualityScope = {
  planId: 'harbor',
  weekIndex: 1,
  dayIndex: 1,
  mode: 'universal_start',
};

function makePhrase(
  overrides: Partial<PersonalPlanPhraseDraft>,
): PersonalPlanPhraseDraft {
  return {
    id: 'phrase-1',
    english: "I'm here.",
    russian: 'Я здесь.',
    visibleOptions: ["I'm here."],
    explanations: [
      {
        title: "I'm",
        body: "I'm - короткая живая форма I am. Here значит здесь.",
        covers: ["I'm", 'here'],
      },
    ],
    newWords: ['here'],
    firstSeenConstructions: ["I'm"],
    ...overrides,
  };
}

describe('validatePersonalPlanContentQuality', () => {
  it('accepts universal modern day-one phrases', () => {
    const phrases = [
      makePhrase({
        id: 'im-here',
        english: "I'm here.",
        russian: 'Я здесь.',
        newWords: ['here'],
        firstSeenConstructions: ["I'm"],
      }),
      makePhrase({
        id: 'repeat',
        english: 'Could you repeat that?',
        russian: 'Можете повторить?',
        visibleOptions: ['Could you repeat that?'],
        explanations: [
          {
            title: 'Repeat',
            body: 'Repeat значит повторить. Could you помогает попросить спокойно и вежливо.',
            covers: ['repeat', 'could you'],
          },
        ],
        newWords: ['repeat'],
        firstSeenConstructions: ['could you'],
      }),
      makePhrase({
        id: 'minute',
        english: 'I need a minute.',
        russian: 'Мне нужна минутка.',
        visibleOptions: ['I need a minute.'],
        explanations: [
          {
            title: 'A minute',
            body: 'A minute здесь значит короткая пауза, не обязательно ровно 60 секунд.',
            covers: ['minute'],
          },
        ],
        newWords: ['minute'],
        firstSeenConstructions: [],
      }),
    ];

    expect(
      phrases.map((phrase) => validatePersonalPlanContentQuality(
        phrase,
        dayOneScope,
      )),
    ).toEqual([
      { valid: true, issues: [] },
      { valid: true, issues: [] },
      { valid: true, issues: [] },
    ]);
  });

  it('rejects exact phone-number content for the universal first day', () => {
    const result = validatePersonalPlanContentQuality(
      makePhrase({
        english: 'My phone number is 0871234567.',
        russian: 'Мой номер телефона 0871234567.',
        explanations: [
          {
            body: 'Phone number значит номер телефона.',
            covers: ['phone number'],
          },
        ],
        newWords: ['phone number'],
        firstSeenConstructions: [],
      }),
      dayOneScope,
    );

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'exact_personal_data',
        'too_narrow_for_day_one',
      ]),
    );
  });

  it('rejects apartment-only wording for the universal first day', () => {
    const result = validatePersonalPlanContentQuality(
      makePhrase({
        english: "I'm here for the apartment viewing.",
        russian: 'Я на просмотр квартиры.',
        explanations: [
          {
            body: "I'm here значит я здесь. Apartment viewing значит просмотр квартиры.",
            covers: ["I'm", 'apartment viewing'],
          },
        ],
        newWords: ['apartment viewing'],
        firstSeenConstructions: ["I'm"],
      }),
      dayOneScope,
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'too_narrow_for_day_one',
      }),
    );
  });

  it('rejects explanations that mention unseen wrong options', () => {
    const result = validatePersonalPlanContentQuality(
      makePhrase({
        english: "I'm here.",
        visibleOptions: ["I'm here.", "You're here."],
        explanations: [
          {
            body: "I'm here - правильно. He's here тут не подходит.",
            covers: ["I'm", 'here'],
            mentionedOptions: ["He's here."],
          },
        ],
      }),
      dayOneScope,
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: 'explanation_mentions_unseen_option',
      phraseId: 'phrase-1',
      detail: "He's here.",
    });
  });

  it('requires explanations for new words and first-seen constructions', () => {
    const result = validatePersonalPlanContentQuality(
      makePhrase({
        english: "I'm here for my appointment.",
        russian: 'Я здесь на встречу.',
        explanations: [
          {
            body: "I'm - короткая форма I am.",
            covers: ["I'm"],
          },
        ],
        newWords: ['appointment', 'here'],
        firstSeenConstructions: ["I'm"],
      }),
      {
        ...dayOneScope,
        mode: 'regular_day',
        dayIndex: 4,
      },
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        {
          code: 'missing_new_word_explanation',
          phraseId: 'phrase-1',
          detail: 'appointment',
        },
        {
          code: 'missing_new_word_explanation',
          phraseId: 'phrase-1',
          detail: 'here',
        },
      ]),
    );
  });

  it('rejects mojibake or corrupted Cyrillic copy', () => {
    const result = validatePersonalPlanContentQuality(
      makePhrase({
        russian: '\u00d0\u00af \u00d0\u00b7\u00d0\u00b4\u00d0\u00b5\u00d1\u0081\u00d1\u008c.',
        explanations: [
          {
            title: 'Here',
            body: 'Here \u00d0\u00b7\u00d0\u00bd\u00d0\u00b0\u00d1\u0087\u00d0\u00b8\u00d1\u0082 \u00d0\u00b7\u00d0\u00b4\u00d0\u00b5\u00d1\u0081\u00d1\u008c.',
            covers: ['here'],
          },
        ],
      }),
      dayOneScope,
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'corrupted_copy',
      phraseId: 'phrase-1',
    }));
  });

  it('rejects empty, robotic, developer, and overformal copy', () => {
    const result = validatePersonalPlanContentQuality(
      makePhrase({
        english: 'How do you do',
        russian: '',
        explanations: [
          {
            body: 'DEV placeholder draft.',
          },
        ],
        newWords: [],
        firstSeenConstructions: [],
      }),
      dayOneScope,
    );

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'empty_phrase',
        'robotic_or_developer_copy',
        'textbook_or_overformal_phrase',
      ]),
    );
  });
});
