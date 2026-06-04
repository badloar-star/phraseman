import type { PersonalPlanPhraseDraft } from './personal_plan_content_quality_contract';
import type {
  PersonalPlanWeekContentQualityInput,
  PersonalPlanWeekDayDraft,
} from './personal_plan_week_content_quality_gate';

function phrase(
  id: string,
  english: string,
  russian: string,
  explanationBody: string,
  newWords: string[],
  firstSeenConstructions: string[] = [],
): PersonalPlanPhraseDraft {
  return {
    id,
    english,
    russian,
    visibleOptions: [english],
    explanations: [
      {
        title: english,
        body: explanationBody,
        covers: [...newWords, ...firstSeenConstructions],
      },
    ],
    newWords,
    firstSeenConstructions,
  };
}

function day(
  dayIndex: number,
  mode: 'universal_start' | 'regular_day',
  focusTags: string[],
  exerciseGoals: string[],
  phrases: PersonalPlanPhraseDraft[],
): PersonalPlanWeekDayDraft {
  return {
    dayId: `gavan-week1-day${dayIndex}`,
    scope: {
      planId: 'gavan',
      weekIndex: 1,
      dayIndex,
      mode,
    },
    phrases,
    focusTags,
    exerciseGoals,
  };
}

const GAVAN_WEEK1_BLUEPRINT_DAYS: PersonalPlanWeekDayDraft[] = [
  day(1, 'universal_start', ['arrival', 'pause'], ['phrase_build', 'missing_word'], [
    phrase(
      'gavan-w1-d1-p1',
      "I'm here.",
      'Я здесь.',
      "I'm - короткая живая форма I am. Here значит здесь: коротко и спокойно говорим, что вы уже на месте.",
      ['here'],
      ["I'm"],
    ),
    phrase(
      'gavan-w1-d1-p2',
      'I need a minute.',
      'Мне нужна минута.',
      'Need значит нужно, minute значит минута. I need a minute помогает взять короткую паузу без лишних объяснений.',
      ['need', 'minute'],
      ['I need'],
    ),
  ]),
  day(2, 'regular_day', ['repeat_request', 'listening'], ['choose_natural_phrase', 'listen_choose'], [
    phrase(
      'gavan-w1-d2-p1',
      'Could you repeat that?',
      'Можете повторить?',
      'Could you делает просьбу мягкой. Repeat значит повторить, that указывает на сказанную фразу.',
      ['repeat', 'that'],
      ['Could you'],
    ),
    phrase(
      'gavan-w1-d2-p2',
      'Could you say that again?',
      'Можете сказать это ещё раз?',
      'Say значит сказать, again значит снова. Фраза звучит естественно, когда нужно переспросить без напряжения.',
      ['say', 'again'],
      ['Could you'],
    ),
  ]),
  day(3, 'regular_day', ['understanding', 'slow_down'], ['missing_word', 'listen_build'], [
    phrase(
      'gavan-w1-d3-p1',
      "I don't understand.",
      'Я не понимаю.',
      "Don't understand значит не понимаю. Это нормальная короткая фраза, когда темп или смысл пока не пойманы.",
      ['understand'],
      ["I don't"],
    ),
    phrase(
      'gavan-w1-d3-p2',
      'Can you speak a bit slower?',
      'Можете говорить чуть медленнее?',
      'Can you - простая просьба. Speak значит говорить, a bit slower значит чуть медленнее.',
      ['speak', 'slower'],
      ['Can you'],
    ),
  ]),
  day(4, 'regular_day', ['polite_help', 'simple_need'], ['phrase_build', 'quick_reply'], [
    phrase(
      'gavan-w1-d4-p1',
      'Can you help me with this?',
      'Можете помочь мне с этим?',
      'Help значит помочь, this значит это. Can you help me with this подходит, когда нужно показать предмет, форму или экран.',
      ['help', 'this'],
      ['Can you'],
    ),
    phrase(
      'gavan-w1-d4-p2',
      'I need help with this.',
      'Мне нужна помощь с этим.',
      'Need help значит нужна помощь. With this добавляет, с чем именно нужна помощь, без длинного объяснения.',
      ['need', 'help', 'this'],
      ['I need'],
    ),
  ]),
  day(5, 'regular_day', ['confirming', 'direction_check'], ['choose_natural_phrase', 'micro_dialogue'], [
    phrase(
      'gavan-w1-d5-p1',
      'This way?',
      'Сюда?',
      'This значит это или этот, way значит путь или направление. This way? помогает быстро уточнить, куда идти.',
      ['this', 'way'],
    ),
    phrase(
      'gavan-w1-d5-p2',
      'Is this right?',
      'Так правильно?',
      'Right здесь значит правильно. Is this right? мягко проверяет, что вы всё поняли верно.',
      ['this', 'right'],
      ['Is this'],
    ),
  ]),
  day(6, 'regular_day', ['short_answer', 'confidence'], ['phrase_recall', 'error_repair'], [
    phrase(
      'gavan-w1-d6-p1',
      'That works for me.',
      'Мне это подходит.',
      'Works for me значит мне подходит. That указывает на предложенный вариант, без лишней торжественности.',
      ['that', 'works'],
      ['That works'],
    ),
    phrase(
      'gavan-w1-d6-p2',
      "I'm not sure yet.",
      'Я пока не уверен.',
      "Sure значит уверен, yet значит пока или ещё. I'm not sure yet даёт время подумать и не звучит резко.",
      ['sure', 'yet'],
      ["I'm not"],
    ),
  ]),
  day(7, 'regular_day', ['review', 'next_step'], ['recall', 'quiz', 'listen_choose'], [
    phrase(
      'gavan-w1-d7-p1',
      'Let me check.',
      'Дайте мне проверить.',
      'Check значит проверить. Let me check звучит спокойно, когда нужно посмотреть сообщение, карту или детали.',
      ['check'],
      ['Let me'],
    ),
    phrase(
      'gavan-w1-d7-p2',
      "I'll come back to this.",
      'Я вернусь к этому.',
      "Come back значит вернуться. I'll come back to this помогает отложить вопрос и не зависнуть на месте.",
      ['come', 'back', 'this'],
      ["I'll"],
    ),
  ]),
];

export const HARBOR_WEEK1_BLUEPRINT_DRAFT: PersonalPlanWeekContentQualityInput = {
  weekId: 'gavan-week1',
  planId: 'gavan',
  days: GAVAN_WEEK1_BLUEPRINT_DAYS,
};

export const GAVAN_WEEK1_BLUEPRINT_DRAFT = HARBOR_WEEK1_BLUEPRINT_DRAFT;
