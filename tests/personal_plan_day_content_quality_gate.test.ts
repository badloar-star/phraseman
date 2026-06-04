import {
  validatePersonalPlanDayContentQuality,
} from '../app/personal_plan_day_content_quality_gate';
import {
  PersonalPlanContentQualityScope,
  PersonalPlanPhraseDraft,
} from '../app/personal_plan_content_quality_contract';

const dayOneScope: PersonalPlanContentQualityScope = {
  planId: 'harbor',
  weekIndex: 1,
  dayIndex: 1,
  mode: 'universal_start',
};

function makePhrase(
  id: string,
  overrides: Partial<PersonalPlanPhraseDraft> = {},
): PersonalPlanPhraseDraft {
  return {
    id,
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

describe('validatePersonalPlanDayContentQuality', () => {
  it('passes a valid day with universal phrases', () => {
    const result = validatePersonalPlanDayContentQuality({
      dayId: 'harbor-week1-day1',
      scope: dayOneScope,
      phrases: [
        makePhrase('im-here'),
        makePhrase('repeat', {
          english: 'Could you repeat that?',
          russian: 'Можете повторить?',
          visibleOptions: ['Could you repeat that?'],
          explanations: [
            {
              title: 'Repeat',
              body: 'Repeat значит повторить. Could you звучит спокойно и вежливо.',
              covers: ['repeat', 'could you'],
            },
          ],
          newWords: ['repeat'],
          firstSeenConstructions: ['could you'],
        }),
      ],
    });

    expect(result).toEqual({
      valid: true,
      dayId: 'harbor-week1-day1',
      summary: {
        total: 2,
        valid: 2,
        invalid: 0,
      },
      issuesByPhrase: [
        {
          phraseId: 'im-here',
          valid: true,
          issues: [],
        },
        {
          phraseId: 'repeat',
          valid: true,
          issues: [],
        },
      ],
      dayIssueCodes: [],
    });
  });

  it('fails an empty day', () => {
    const result = validatePersonalPlanDayContentQuality({
      dayId: 'empty-day',
      scope: dayOneScope,
      phrases: [],
    });

    expect(result.valid).toBe(false);
    expect(result.summary).toEqual({
      total: 0,
      valid: 0,
      invalid: 0,
    });
    expect(result.dayIssueCodes).toEqual(['empty_day']);
  });

  it('fails day one when it contains phone or apartment-only phrases', () => {
    const result = validatePersonalPlanDayContentQuality({
      dayId: 'bad-day-one',
      scope: dayOneScope,
      phrases: [
        makePhrase('phone', {
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
        makePhrase('apartment', {
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
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.summary).toEqual({
      total: 2,
      valid: 0,
      invalid: 2,
    });
    expect(result.dayIssueCodes).toEqual(
      expect.arrayContaining([
        'exact_personal_data',
        'too_narrow_for_day_one',
        'day_one_contains_personal_data',
        'day_one_contains_narrow_phrase',
      ]),
    );
  });

  it('keeps phrase-level explanation issues in issuesByPhrase', () => {
    const result = validatePersonalPlanDayContentQuality({
      dayId: 'missing-explanation-day',
      scope: {
        ...dayOneScope,
        mode: 'regular_day',
        dayIndex: 3,
      },
      phrases: [
        makePhrase('appointment', {
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
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.issuesByPhrase).toEqual([
      {
        phraseId: 'appointment',
        valid: false,
        issues: expect.arrayContaining([
          {
            code: 'missing_new_word_explanation',
            phraseId: 'appointment',
            detail: 'appointment',
          },
          {
            code: 'missing_new_word_explanation',
            phraseId: 'appointment',
            detail: 'here',
          },
        ]),
      },
    ]);
    expect(result.dayIssueCodes).toEqual(
      expect.arrayContaining([
        'missing_new_word_explanation',
        'day_has_missing_explanations',
      ]),
    );
  });

  it('counts valid and invalid phrases correctly', () => {
    const result = validatePersonalPlanDayContentQuality({
      dayId: 'mixed-day',
      scope: dayOneScope,
      phrases: [
        makePhrase('valid'),
        makePhrase('invalid', {
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
      ],
    });

    expect(result.summary).toEqual({
      total: 2,
      valid: 1,
      invalid: 1,
    });
    expect(result.valid).toBe(false);
  });
});
