import type { LessonPhrase, LessonTeachingNote, LessonWord } from './lesson_data_types';
import { getPlanById, type PersonalPlanId } from './personal_plan_catalog';
import {
  buildGavanWeek1CanonicalPlan,
  type GavanCanonicalDay,
  type GavanCanonicalPhrase,
} from './personal_plan_gavan_week1_canonical_plan';

export type PersonalPlanPhraseLesson = {
  id: string;
  planId: PersonalPlanId;
  title: string;
  subtitle: string;
  afterLessonId: number;
  rationale: string;
  phrases: LessonPhrase[];
};

function note(id: string, titleRu: string, correctRu: string, wrongRu: string) {
  return {
    id,
    titleRu,
    correctRu,
    correctUk: correctRu,
    correctEs: correctRu,
    wrongRu,
    wrongUk: wrongRu,
    wrongEs: wrongRu,
  };
}

const toBeNote = note(
  'gavan_d1_to_be_short',
  'Коротко и спокойно',
  'В английском в такой фразе нужен маленький глагол-связка: I am, You are, It is. В живой речи это часто сжимается до I’m, You’re, It’s.',
  'Если убрать am / are / is, английская фраза звучит как недособранная. По-русски можно сказать короче, а в английском связку лучше оставить.',
);

const clearNote = note(
  'gavan_d1_clear',
  'Clear = понятно',
  'Clear здесь значит “понятно / ясно”. It’s not clear — мягкий способ сказать, что мысль пока не разобралась.',
  'Clear не про чистоту стола. В разговоре это часто про ясность: понятно человеку или нет.',
);

const hereNote = note(
  'gavan_d1_here',
  'Here = здесь',
  'Here помогает коротко обозначить присутствие: I’m here. Без объяснений на три этажа.',
  'Here легко спутать с hear на слух. В этой фразе нужен here — место, где ты находишься.',
);

export const PERSONAL_PLAN_PHRASE_LESSONS: Record<string, PersonalPlanPhraseLesson> = {
  gavan_day1_short_replies: {
    id: 'gavan_day1_short_replies',
    planId: 'gavan',
    title: 'Короткие ответы',
    subtitle: 'Фразы, которые помогают ответить спокойно и не раздувать разговор.',
    afterLessonId: 1,
    rationale: 'Сначала урок 1 дает I am / You are / It is. Здесь те же конструкции работают в обычных коротких ответах.',
    phrases: [
      {
        id: 'gavan_d1_phrase_1',
        english: "I'm here.",
        russian: 'Я здесь.',
        ukrainian: 'Я тут.',
        spanish: 'Я здесь.',
        words: [
          { text: "I'm", correct: "I'm", distractors: ["You're", "He's", "We're", "It's"], category: 'to-be', teachingNote: toBeNote },
          { text: 'here', correct: 'here', distractors: ['hear', 'there', 'her', 'where'], category: 'place', teachingNote: hereNote },
        ],
      },
      {
        id: 'gavan_d1_phrase_2',
        english: "I'm okay.",
        russian: 'Я в порядке.',
        ukrainian: 'Я в порядку.',
        spanish: 'Я в порядке.',
        words: [
          { text: "I'm", correct: "I'm", distractors: ["You're", "He's", "We're", "It's"], category: 'to-be', teachingNote: toBeNote },
          { text: 'okay', correct: 'okay', distractors: ['ready', 'right', 'busy', 'safe'], category: 'adjective', teachingNote: note('gavan_d1_okay', 'Okay = нормально', 'Okay — простой способ сказать, что все нормально. Не торжественно, не сухо, просто понятно.', 'Okay не значит “идеально”. Это спокойное “нормально / все в порядке”.') },
        ],
      },
      {
        id: 'gavan_d1_phrase_3',
        english: "It's okay.",
        russian: 'Все нормально.',
        ukrainian: 'Все нормально.',
        spanish: 'Все нормально.',
        words: [
          { text: "It's", correct: "It's", distractors: ["I'm", "You're", "We're", "He's"], category: 'to-be', teachingNote: toBeNote },
          { text: 'okay', correct: 'okay', distractors: ['ready', 'right', 'busy', 'safe'], category: 'adjective', teachingNote: note('gavan_d1_it_okay', 'It’s okay', 'It’s okay — короткое “все нормально”. Подходит, когда не хочется звучать драматично.', 'It’s здесь не “это” в тяжелом смысле. Это обычная связка для короткой оценки ситуации.') },
        ],
      },
      {
        id: 'gavan_d1_phrase_4',
        english: "It's not clear.",
        russian: 'Пока непонятно.',
        ukrainian: 'Поки незрозуміло.',
        spanish: 'Пока непонятно.',
        words: [
          { text: "It's", correct: "It's", distractors: ["I'm", "You're", "We're", "He's"], category: 'to-be', teachingNote: toBeNote },
          { text: 'not', correct: 'not', distractors: ['now', 'no', 'note', 'none'], category: 'negative', teachingNote: note('gavan_d1_not', 'Not = не', 'Not ставит спокойное отрицание: it’s clear — понятно, it’s not clear — непонятно.', 'Not нельзя заменить на no внутри такой фразы. No обычно отдельный ответ, а not работает внутри предложения.') },
          { text: 'clear', correct: 'clear', distractors: ['clean', 'close', 'cheap', 'calm'], category: 'adjective', teachingNote: clearNote },
        ],
      },
      {
        id: 'gavan_d1_phrase_5',
        english: "You're right.",
        russian: 'Вы правы.',
        ukrainian: 'Ви праві.',
        spanish: 'Вы правы.',
        words: [
          { text: "You're", correct: "You're", distractors: ["I'm", "He's", "We're", "It's"], category: 'to-be', teachingNote: toBeNote },
          { text: 'right', correct: 'right', distractors: ['write', 'ready', 'wrong', 'bright'], category: 'adjective', teachingNote: note('gavan_d1_right', 'Right = правы', 'You’re right — короткое согласие без лишней церемонии. Хорошая фраза, когда человек объяснил верно.', 'Right здесь не “право” и не направление. В этой фразе это “прав / права / правы”.') },
        ],
      },
    ],
  },
};

const GAVAN_WEEK1_CANONICAL_MEDIA_LESSON_RE = /^gavan_week1_day([1-7])_canonical_media$/;
const GENERATED_PLAN_PHRASE_LESSON_RE = /^(voyazh|mitap|gavan|impuls|echo)_d(\d{3})_content_unit$/;

type GeneratedPhraseTemplate = {
  english: string;
  russian: string;
};

const GENERATED_PLAN_PHRASE_TEMPLATES: Record<PersonalPlanId, GeneratedPhraseTemplate[]> = {
  voyazh: [
    { english: 'I need some help.', russian: 'Мне нужна помощь.' },
    { english: 'Where is the entrance?', russian: 'Где вход?' },
    { english: 'Can you show me?', russian: 'Можете показать?' },
    { english: 'I have a booking.', russian: 'У меня есть бронь.' },
    { english: 'How much is it?', russian: 'Сколько это стоит?' },
    { english: 'I need a receipt.', russian: 'Мне нужен чек.' },
  ],
  mitap: [
    { english: 'The next step is clear.', russian: 'Следующий шаг понятен.' },
    { english: 'I will send the summary.', russian: 'Я отправлю краткое резюме.' },
    { english: 'We need one owner.', russian: 'Нам нужен один ответственный.' },
    { english: 'Can we confirm the deadline?', russian: 'Можем подтвердить срок?' },
    { english: 'I will follow up today.', russian: 'Я вернусь с ответом сегодня.' },
    { english: 'Let us keep this short.', russian: 'Давайте коротко.' },
  ],
  gavan: [
    { english: 'I am here.', russian: 'Я здесь.' },
    { english: 'It is not clear.', russian: 'Пока непонятно.' },
    { english: 'I need this form.', russian: 'Мне нужна эта форма.' },
    { english: 'Can you check it?', russian: 'Можете проверить?' },
    { english: 'The address is correct.', russian: 'Адрес верный.' },
    { english: 'I will bring it tomorrow.', russian: 'Я принесу это завтра.' },
  ],
  impuls: [
    { english: 'I think it works.', russian: 'Думаю, это работает.' },
    { english: 'I need a moment.', russian: 'Мне нужна минутка.' },
    { english: 'That makes sense.', russian: 'Это логично.' },
    { english: 'Let me say it again.', russian: 'Скажу еще раз.' },
    { english: 'Because it is faster.', russian: 'Потому что так быстрее.' },
    { english: 'I can explain briefly.', russian: 'Я могу коротко объяснить.' },
  ],
  echo: [
    { english: 'I heard the main word.', russian: 'Я услышал главное слово.' },
    { english: 'Can you repeat that?', russian: 'Можете повторить?' },
    { english: 'I missed the time.', russian: 'Я пропустил время.' },
    { english: 'The place is clear.', russian: 'Место понятно.' },
    { english: 'Please say it slower.', russian: 'Скажите медленнее, пожалуйста.' },
    { english: 'I can answer now.', russian: 'Я могу ответить сейчас.' },
  ],
};

const GENERATED_DAY1_PHRASE_TEMPLATES: Partial<Record<string, GeneratedPhraseTemplate[]>> = {
  mitap_d001_content_unit: [
    { english: 'The next steps are clear.', russian: 'Следующие шаги понятны.' },
    { english: 'I will send the next steps.', russian: 'Я отправлю следующие шаги.' },
    { english: 'We need one owner.', russian: 'Нам нужен один ответственный.' },
    { english: 'The deadline is today.', russian: 'Срок сегодня.' },
    { english: 'I will follow up after the call.', russian: 'Я вернусь с ответом после звонка.' },
    { english: 'Let us keep the summary short.', russian: 'Давайте оставим резюме коротким.' },
  ],
  mitap_d002_content_unit: [
    { english: 'My update is short.', russian: 'Мой апдейт короткий.' },
    { english: 'The first task is done.', russian: 'Первая задача готова.' },
    { english: 'I am working on the next part.', russian: 'Я работаю над следующей частью.' },
    { english: 'I have one small blocker.', russian: 'У меня есть один небольшой блокер.' },
    { english: 'I need ten more minutes.', russian: 'Мне нужно еще десять минут.' },
    { english: 'I will share the result today.', russian: 'Я поделюсь результатом сегодня.' },
  ],
  voyazh_d001_content_unit: [
    { english: 'I need help now.', russian: 'Мне нужна помощь сейчас.' },
    { english: 'Can you help me, please?', russian: 'Можете мне помочь, пожалуйста?' },
    { english: 'I lost my bag.', russian: 'Я потерял сумку.' },
    { english: 'I need the information desk.', russian: 'Мне нужна информационная стойка.' },
    { english: 'Please call airport staff.', russian: 'Пожалуйста, позовите сотрудников аэропорта.' },
    { english: 'I can wait here.', russian: 'Я могу подождать здесь.' },
  ],
  voyazh_d002_content_unit: [
    { english: 'Here is my passport.', russian: 'Вот мой паспорт.' },
    { english: 'I am here for vacation.', russian: 'Я здесь в отпуске.' },
    { english: 'I have a return ticket.', russian: 'У меня есть обратный билет.' },
    { english: 'I will stay for one week.', russian: 'Я останусь на одну неделю.' },
    { english: 'This is my hotel booking.', russian: 'Это моя бронь отеля.' },
    { english: 'Can I go now?', russian: 'Могу я идти сейчас?' },
  ],
  voyazh_d003_content_unit: [
    { english: 'I need to check this bag.', russian: 'Мне нужно сдать эту сумку.' },
    { english: 'Here is my boarding pass.', russian: 'Вот мой посадочный талон.' },
    { english: 'The bag is not heavy.', russian: 'Сумка не тяжелая.' },
    { english: 'There is one fragile item.', russian: 'Там есть одна хрупкая вещь.' },
    { english: 'Can I get a baggage receipt?', russian: 'Могу я получить багажную квитанцию?' },
    { english: 'Which gate should I use?', russian: 'Каким выходом мне пользоваться?' },
  ],
  gavan_d001_content_unit: [
    { english: "I'm here.", russian: 'Я здесь.' },
    { english: "I'm okay.", russian: 'Я в порядке.' },
    { english: "It's okay.", russian: 'Все нормально.' },
    { english: "It's not clear.", russian: 'Пока непонятно.' },
    { english: "You're right.", russian: 'Вы правы.' },
    { english: "I'm ready.", russian: 'Я готов.' },
  ],
  gavan_d002_content_unit: [
    { english: 'This is my full address.', russian: 'Это мой полный адрес.' },
    { english: 'The postcode is correct.', russian: 'Почтовый индекс верный.' },
    { english: 'My flat number is five.', russian: 'Номер моей квартиры пять.' },
    { english: 'Can you spell the street name?', russian: 'Можете произнести название улицы по буквам?' },
    { english: 'The address is on this form.', russian: 'Адрес указан в этой форме.' },
    { english: 'I can send proof of address.', russian: 'Я могу отправить подтверждение адреса.' },
  ],
  impuls_d001_content_unit: [
    { english: 'I can tell a short story.', russian: 'Я могу рассказать короткую историю.' },
    { english: 'First, I missed the bus.', russian: 'Сначала я пропустил автобус.' },
    { english: 'Then I called my friend.', russian: 'Потом я позвонил другу.' },
    { english: 'After that, I found another way.', russian: 'После этого я нашел другой путь.' },
    { english: 'The story ends well.', russian: 'История заканчивается хорошо.' },
    { english: 'That is why I was late.', russian: 'Вот почему я опоздал.' },
  ],
  impuls_d002_content_unit: [
    { english: 'I think this is useful.', russian: 'Я думаю, это полезно.' },
    { english: 'My opinion is simple.', russian: 'Мое мнение простое.' },
    { english: 'I like this idea.', russian: 'Мне нравится эта идея.' },
    { english: 'I do not agree yet.', russian: 'Я пока не согласен.' },
    { english: 'The reason is clear.', russian: 'Причина понятна.' },
    { english: 'I can explain it briefly.', russian: 'Я могу коротко это объяснить.' },
  ],
  echo_d001_content_unit: [
    { english: 'Can you repeat that?', russian: 'Можете повторить это?' },
    { english: 'Please repeat the last word.', russian: 'Пожалуйста, повторите последнее слово.' },
    { english: 'I heard the time.', russian: 'Я услышал время.' },
    { english: 'I missed the place.', russian: 'Я пропустил место.' },
    { english: 'Did you say today?', russian: 'Вы сказали сегодня?' },
    { english: 'Now I can answer.', russian: 'Теперь я могу ответить.' },
  ],
  echo_d002_content_unit: [
    { english: 'Yes, I understand.', russian: 'Да, я понимаю.' },
    { english: 'No, not yet.', russian: 'Нет, пока нет.' },
    { english: 'I can answer now.', russian: 'Я могу ответить сейчас.' },
    { english: 'Please say it again.', russian: 'Пожалуйста, скажите это еще раз.' },
    { english: 'The answer is short.', russian: 'Ответ короткий.' },
    { english: 'I need one more second.', russian: 'Мне нужна еще одна секунда.' },
  ],
};

function compactUnique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalized(value: string): string {
  return value.trim().toLowerCase().replace(/[.!?]+$/g, '');
}

function targetWordsForPhrase(phrase: GavanCanonicalPhrase): string[] {
  return phrase.english
    .replace(/[.!?]+$/g, '')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function canonicalWordCategory(phrase: GavanCanonicalPhrase, word: string): string {
  const norm = normalized(word);
  if (phrase.firstSeenConstructions.some((item) => normalized(item).split(/\s+/).includes(norm))) {
    return 'grammar';
  }
  if (phrase.newWords.some((item) => normalized(item).split(/\s+/).includes(norm))) {
    return 'vocabulary';
  }
  return 'phrase';
}

function canonicalWordDistractors(day: GavanCanonicalDay, word: string): string[] {
  const norm = normalized(word);
  const dayWords = day.phrases
    .flatMap(targetWordsForPhrase)
    .filter((candidate) => normalized(candidate) !== norm);
  const defaults = ['please', 'now', 'again', 'here', 'that', 'okay', 'right', 'check']
    .filter((candidate) => normalized(candidate) !== norm);

  return compactUnique([...dayWords, ...defaults]).slice(0, 5);
}

function canonicalTeachingNote(phrase: GavanCanonicalPhrase): LessonTeachingNote {
  const card = phrase.explanationCards[0];
  const fallback = `${phrase.english} работает как короткая готовая фраза. Сначала держим общий смысл, потом уже отдельные слова.`;

  return {
    id: card?.id ?? `${phrase.id}:canonical-note`,
    titleRu: card?.covers?.[0] ? `Фраза: ${card.covers[0]}` : 'Слушаем фразу целиком',
    correctRu: card?.correctRu ?? fallback,
    correctUk: card?.correctRu ?? fallback,
    correctEs: card?.correctRu ?? fallback,
    wrongRu: card?.wrongRu ?? 'Послушай еще раз и выбери смысл всей фразы, а не одно знакомое слово.',
    wrongUk: card?.wrongRu ?? 'Послушай еще раз и выбери смысл всей фразы, а не одно знакомое слово.',
    wrongEs: card?.wrongRu ?? 'Послушай еще раз и выбери смысл всей фразы, а не одно знакомое слово.',
  };
}

function canonicalWordsForPhrase(day: GavanCanonicalDay, phrase: GavanCanonicalPhrase): LessonWord[] {
  const words = targetWordsForPhrase(phrase);
  const note = canonicalTeachingNote(phrase);

  return words.map((word, index) => ({
    text: word,
    correct: word,
    distractors: canonicalWordDistractors(day, word),
    category: canonicalWordCategory(phrase, word),
    ...(index === words.length - 1 ? { teachingNote: note } : {}),
  }));
}

export function isGeneratedPersonalPlanPhraseLessonId(id: string | undefined): boolean {
  return Boolean(id && GENERATED_PLAN_PHRASE_LESSON_RE.test(id));
}

export function getGeneratedPersonalPlanPhraseLessonContentUnitIds(
  lessonId: string,
  count = 6,
): string[] {
  if (!isGeneratedPersonalPlanPhraseLessonId(lessonId)) return [];
  return Array.from({ length: Math.max(0, count) }, (_, index) => `${lessonId}_phrase_${index + 1}`);
}

function generatedWordsForPhrase(phrase: GeneratedPhraseTemplate, noteId: string): LessonWord[] {
  const targetWords = phrase.english
    .replace(/[.!?]+$/g, '')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  const fallbackDistractors = ['now', 'today', 'please', 'clear', 'short', 'next', 'again', 'here'];
  const teachingNote = note(
    noteId,
    'Phrase meaning',
    `${phrase.english} is a short practical phrase. Focus on the whole message first, then the separate words.`,
    'First match the whole situation. Then rebuild the phrase slowly and keep the answer short.',
  );

  return targetWords.map((word, index) => ({
    text: word,
    correct: word,
    distractors: compactUnique([...targetWords, ...fallbackDistractors].filter((item) => item !== word)).slice(0, 5),
    category: index === 0 ? 'grammar' : 'phrase',
    ...(index === targetWords.length - 1 ? { teachingNote } : {}),
  }));
}

function buildGeneratedPlanPhraseLesson(id: string): PersonalPlanPhraseLesson | null {
  const match = GENERATED_PLAN_PHRASE_LESSON_RE.exec(id);
  if (!match) return null;

  const planId = match[1] as PersonalPlanId;
  const dayIndex = Number(match[2]);
  const plan = getPlanById(planId);
  const day = plan.days.find((item) => item.dayIndex === dayIndex);
  const templates = GENERATED_DAY1_PHRASE_TEMPLATES[id] ?? GENERATED_PLAN_PHRASE_TEMPLATES[planId];

  return {
    id,
    planId,
    title: day?.title ?? `Personal plan day ${dayIndex}`,
    subtitle: day?.phraseGoal ?? 'Personal plan phrase practice.',
    afterLessonId: 1,
    rationale: day?.theory ?? 'This day builds short phrases for the selected real-life scenario.',
    phrases: templates.map((template, index) => ({
      id: `${id}_phrase_${index + 1}`,
      english: template.english,
      russian: template.russian,
      ukrainian: template.russian,
      spanish: template.russian,
      words: generatedWordsForPhrase(template, `${id}_phrase_${index + 1}_note`),
    })),
  };
}

function buildGavanCanonicalMediaPhraseLesson(day: GavanCanonicalDay): PersonalPlanPhraseLesson {
  const afterLessonId = day.exerciseBlocks
    .flatMap((block) => block.prerequisiteLessonIds)
    .find((lessonId) => Number.isFinite(lessonId)) ?? 1;

  return {
    id: `gavan_week1_day${day.dayIndex}_canonical_media`,
    planId: 'gavan',
    title: day.titleRu,
    subtitle: day.goalRu,
    afterLessonId,
    rationale: day.prerequisiteSummaryRu,
    phrases: day.phrases.map((phrase) => ({
      id: phrase.id,
      english: phrase.english,
      russian: phrase.ru,
      ukrainian: phrase.ru,
      spanish: phrase.ru,
      words: canonicalWordsForPhrase(day, phrase),
    })),
  };
}

export function getGavanCanonicalMediaPhraseLesson(id: string): PersonalPlanPhraseLesson | null {
  const match = GAVAN_WEEK1_CANONICAL_MEDIA_LESSON_RE.exec(id);
  if (!match) return null;

  const dayIndex = Number(match[1]);
  const day = buildGavanWeek1CanonicalPlan().days.find((item) => item.dayIndex === dayIndex);
  return day ? buildGavanCanonicalMediaPhraseLesson(day) : null;
}

function cleanPlanUserName(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim().replace(/\s+/g, ' ');
  return trimmed ? trimmed.slice(0, 32) : 'Phraseman';
}

export function personalizePlanPhraseLesson(
  lesson: PersonalPlanPhraseLesson,
  userName: string | null | undefined,
): PersonalPlanPhraseLesson {
  const name = cleanPlanUserName(userName);
  const fill = (text: string | undefined): string | undefined => text?.replace(/\{\{name\}\}/g, name);
  return {
    ...lesson,
    title: fill(lesson.title) ?? lesson.title,
    subtitle: fill(lesson.subtitle) ?? lesson.subtitle,
    rationale: fill(lesson.rationale) ?? lesson.rationale,
    phrases: lesson.phrases.map((phrase) => ({
      ...phrase,
      english: fill(phrase.english) ?? phrase.english,
      spanish: fill(phrase.spanish),
      russian: fill(phrase.russian) ?? phrase.russian,
      ukrainian: fill(phrase.ukrainian) ?? phrase.ukrainian,
      words: phrase.words?.map((word) => ({
        ...word,
        text: fill(word.text) ?? word.text,
        correct: fill(word.correct) ?? word.correct,
        distractors: word.distractors.map((item) => fill(item) ?? item),
      })),
    })),
  };
}

export function getPersonalPlanPhraseLesson(id: string | string[] | undefined): PersonalPlanPhraseLesson | null {
  const lessonId = Array.isArray(id) ? id[0] : id;
  if (!lessonId) return null;
  return PERSONAL_PLAN_PHRASE_LESSONS[lessonId]
    ?? getGavanCanonicalMediaPhraseLesson(lessonId)
    ?? buildGeneratedPlanPhraseLesson(lessonId);
}
