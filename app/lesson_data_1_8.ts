// Lessons 1-8 Data
import type { LessonIntroScreen } from './lesson_data_types';

/** Теория 1–8 для «учим английский»; испанские слайды подставляет `getLessonIntroScreens(..., 'es')`. */
export {
  LESSON_1_INTRO_SCREENS,
} from './lesson_intro_screens_lesson1_v2';

export {
  LESSON_2_INTRO_SCREENS,
} from './lesson_intro_screens_lesson2_v2';

export {
  LESSON_3_INTRO_SCREENS,
} from './lesson_intro_screens_lesson3_v2';

export {
  LESSON_4_INTRO_SCREENS,
} from './lesson_intro_screens_lesson4_v2';

export {
  LESSON_5_INTRO_SCREENS,
} from './lesson_intro_screens_lesson5_v2';

export {
  LESSON_6_INTRO_SCREENS,
} from './lesson_intro_screens_lesson6_v2';

export {
  LESSON_7_INTRO_SCREENS,
} from './lesson_intro_screens_lesson7_v2';

export {
  LESSON_8_INTRO_SCREENS,
} from './lesson_intro_screens_lesson8_v2';

export {
  LESSON_1_PHRASES,
  LESSON_2_PHRASES,
  LESSON_3_PHRASES,
  LESSON_4_PHRASES,
  LESSON_5_PHRASES,
  LESSON_6_PHRASES,
  LESSON_7_PHRASES,
  LESSON_8_PHRASES,
} from './lesson_data_1_8_phrases_es.gen';



// ==================== LESSON 1 ====================

export const LESSON_1_ENCOURAGEMENT_SCREENS: LessonIntroScreen[] = [];


// ==================== LESSON 2 ====================

export const LESSON_2_PHRASES: LessonPhrase[] = [
  {
    id: 'lesson2_phrase_1',
    english: 'I am not hungry',
    russian: 'Я не голоден',
    ukrainian: 'Я не голодний',
    words: [
      { text: 'I', correct: 'I', distractors: ['me', 'my', 'mine', 'eye', 'hi'], category: 'pronoun' },
      { text: 'am', correct: 'am', distractors: ['is', 'are', 'be', 'been', 'being'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'hungry', correct: 'hungry', distractors: ['angry', 'hurry', 'hunger', 'honey', 'hang'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_2',
    english: 'Are you sure?',
    russian: 'Ты уверен?',
    ukrainian: 'Ти впевнений?',
    words: [
      { text: 'Are', correct: 'Are', distractors: ['am', 'is', 'art', 'air', 'age'], category: 'to-be' },
      { text: 'you', correct: 'you', distractors: ['your', "you're", 'u', 'yours', 'youth'], category: 'pronoun' },
      { text: 'sure', correct: 'sure', distractors: ['shore', 'sugar', 'sore', 'pure', 'surelly'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_3',
    english: 'He is not here',
    russian: 'Он не здесь',
    ukrainian: 'Він не тут',
    words: [
      { text: 'He', correct: 'He', distractors: ['his', 'him', 'she', 'hey', 'hi'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['non', 'none', 'now', 'new', 'night'], category: 'adverb' },
      { text: 'here', correct: 'here', distractors: ['hear', 'her', 'there', 'where', 'hair'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson2_phrase_4',
    english: 'Is it expensive?',
    russian: 'Это дорого?',
    ukrainian: 'Це дорого?',
    words: [
      { text: 'Is', correct: 'Is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'it', correct: 'it', distractors: ['its', 'eat', 'at', 'if', 'in'], category: 'pronoun' },
      { text: 'expensive', correct: 'expensive', distractors: ['expand', 'expense', 'expect', 'explain', 'express'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_5',
    english: 'We are not ready',
    russian: 'Мы не готовы',
    ukrainian: 'Ми не готові',
    words: [
      { text: 'We', correct: 'We', distractors: ['way', 'us', 'our', 'west', 'wet'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'know', 'nose', 'note', 'net'], category: 'adverb' },
      { text: 'ready', correct: 'ready', distractors: ['read', 'red', 'road', 'real', 'already'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_6',
    english: 'They are not at home',
    alternatives: ['They are not home'],
    russian: 'Их нет дома',
    ukrainian: 'Їх немає вдома',
    words: [
      { text: 'They', correct: 'They', distractors: ['them', 'their', 'there', 'the', 'then'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'at', correct: 'at', distractors: ['in', 'on', 'by', 'of', 'home'], category: 'preposition' },
      { text: 'home', correct: 'home', distractors: ['come', 'some', 'dome', 'hole', 'hope'], category: 'noun' },
    ],
  },
  {
    id: 'lesson2_phrase_7',
    english: 'Is she a doctor?',
    russian: 'Она врач?',
    ukrainian: 'Вона лікар?',
    words: [
      { text: 'Is', correct: 'Is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'she', correct: 'she', distractors: ['her', 'he', 'see', 'the', 'shy'], category: 'pronoun' },
      { text: 'a', correct: 'a', distractors: ['an', 'the', 'of', 'in', 'to'], category: 'article' },
      { text: 'doctor', correct: 'doctor', distractors: ['doctor', 'factor', 'rector', 'sector', 'actor'], category: 'noun' },
    ],
  },
  {
    id: 'lesson2_phrase_8',
    english: 'It is not scary',
    russian: 'Это не страшно',
    ukrainian: 'Це не страшно',
    words: [
      { text: 'It', correct: 'It', distractors: ['its', 'is', 'if', 'in', 'eat'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'scary', correct: 'scary', distractors: ['scar', 'scarce', 'scarf', 'carry', 'care'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_9',
    english: 'Are you busy?',
    russian: 'Ты занят?',
    ukrainian: 'Ти зайнятий?',
    words: [
      { text: 'Are', correct: 'Are', distractors: ['am', 'is', 'art', 'air', 'age'], category: 'to-be' },
      { text: 'you', correct: 'you', distractors: ['your', "you're", 'u', 'yours', 'youth'], category: 'pronoun' },
      { text: 'busy', correct: 'busy', distractors: ['bus', 'business', 'bossy', 'buy', 'easy'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_10',
    english: 'I am not alone',
    russian: 'Я не один',
    ukrainian: 'Я не один',
    words: [
      { text: 'I', correct: 'I', distractors: ['me', 'my', 'mine', 'eye', 'hi'], category: 'pronoun' },
      { text: 'am', correct: 'am', distractors: ['is', 'are', 'be', 'been', 'being'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'alone', correct: 'alone', distractors: ['along', 'aloud', 'above', 'below', 'clone'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_11',
    english: 'We are not in danger',
    russian: 'Мы не в опасности',
    ukrainian: 'Ми не в небезпеці',
    words: [
      { text: 'We', correct: 'We', distractors: ['way', 'us', 'our', 'west', 'wet'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'know', 'nose', 'note', 'net'], category: 'adverb' },
      { text: 'in', correct: 'in', distractors: ['on', 'at', 'by', 'of', 'to'], category: 'preposition' },
      { text: 'danger', correct: 'danger', distractors: ['anger', 'ranger', 'manger', 'dancer', 'cancer'], category: 'noun' },
    ],
  },
  {
    id: 'lesson2_phrase_12',
    english: 'Is he angry?',
    alternatives: ['Is he mean?'],
    russian: 'Он злой?',
    ukrainian: 'Він злий?',
    words: [
      { text: 'Is', correct: 'Is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'he', correct: 'he', distractors: ['his', 'him', 'she', 'hey', 'hi'], category: 'pronoun' },
      { text: 'angry', correct: 'angry', distractors: ['hungry', 'anger', 'angry', 'angle', 'ankle'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_13',
    english: 'I am not alone',
    russian: 'Я не один',
    ukrainian: 'Я не один',
    words: [
      { text: 'I', correct: 'I', distractors: ['me', 'my', 'mine', 'eye', 'hi'], category: 'pronoun' },
      { text: 'am', correct: 'am', distractors: ['is', 'are', 'be', 'been', 'being'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'alone', correct: 'alone', distractors: ['along', 'aloud', 'above', 'below', 'clone'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_14',
    english: 'She is not married',
    russian: 'Она не замужем',
    ukrainian: 'Вона не одружена',
    words: [
      { text: 'She', correct: 'She', distractors: ['her', 'he', 'see', 'the', 'shy'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'married', correct: 'married', distractors: ['marry', 'merry', 'carry', 'varies', 'worried'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_15',
    english: 'Is it open?',
    russian: 'Это открыто?',
    ukrainian: 'Це відкрито?',
    words: [
      { text: 'Is', correct: 'Is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'it', correct: 'it', distractors: ['its', 'eat', 'at', 'if', 'in'], category: 'pronoun' },
      { text: 'open', correct: 'open', distractors: ['oven', 'often', 'over', 'even', 'oper'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_16',
    english: 'You are not on the list',
    russian: 'Тебя нет в списке',
    ukrainian: 'Тебе немає в списку',
    words: [
      { text: 'You', correct: 'You', distractors: ['your', "you're", 'u', 'yours', 'youth'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'know', 'nose', 'note', 'net'], category: 'adverb' },
      { text: 'on', correct: 'on', distractors: ['in', 'at', 'by', 'of', 'to'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['a', 'an', 'of', 'in', 'to'], category: 'article' },
      { text: 'list', correct: 'list', distractors: ['fist', 'mist', 'hist', 'gist', 'last'], category: 'noun' },
    ],
  },
  {
    id: 'lesson2_phrase_17',
    english: 'Is it free?',
    russian: 'Это бесплатно?',
    ukrainian: 'Це безкоштовно?',
    words: [
      { text: 'Is', correct: 'Is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'it', correct: 'it', distractors: ['its', 'eat', 'at', 'if', 'in'], category: 'pronoun' },
      { text: 'free', correct: 'free', distractors: ['tree', 'three', 'fee', 'flee', 'fro'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_18',
    english: 'They are not busy',
    russian: 'Они не заняты',
    ukrainian: 'Вони не зайняті',
    words: [
      { text: 'They', correct: 'They', distractors: ['them', 'their', 'there', 'the', 'then'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'busy', correct: 'busy', distractors: ['bus', 'business', 'bossy', 'buy', 'easy'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_19',
    english: 'Am I not right?',
    russian: 'Разве я не прав?',
    ukrainian: 'Хіба я не правий?',
    words: [
      { text: 'Am', correct: 'Am', distractors: ['is', 'are', 'be', 'been', 'being'], category: 'to-be' },
      { text: 'I', correct: 'I', distractors: ['me', 'my', 'mine', 'eye', 'hi'], category: 'pronoun' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'right', correct: 'right', distractors: ['write', 'light', 'night', 'fight', 'sight'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_20',
    english: 'She is not here',
    russian: 'Её здесь нет',
    ukrainian: 'Її тут немає',
    words: [
      { text: 'She', correct: 'She', distractors: ['her', 'he', 'see', 'the', 'shy'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'here', correct: 'here', distractors: ['hear', 'her', 'there', 'where', 'hair'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson2_phrase_21',
    english: 'It is not a joke',
    russian: 'Это не шутка',
    ukrainian: 'Це не жарт',
    words: [
      { text: 'It', correct: 'It', distractors: ['its', 'is', 'if', 'in', 'eat'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'a', correct: 'a', distractors: ['an', 'the', 'of', 'in', 'to'], category: 'article' },
      { text: 'joke', correct: 'joke', distractors: ['poke', 'coke', 'woke', 'yoke', 'cope'], category: 'noun' },
    ],
  },
  {
    id: 'lesson2_phrase_22',
    english: 'Are you okay?',
    russian: 'Ты в порядке?',
    ukrainian: 'Ти в порядку?',
    words: [
      { text: 'Are', correct: 'Are', distractors: ['am', 'is', 'art', 'air', 'age'], category: 'to-be' },
      { text: 'you', correct: 'you', distractors: ['your', "you're", 'u', 'yours', 'youth'], category: 'pronoun' },
      { text: 'okay', correct: 'okay', distractors: ['okay', 'obey', 'away', 'okay', 'okey'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_23',
    english: 'He is not hungry',
    russian: 'Он не голоден',
    ukrainian: 'Він не голодний',
    words: [
      { text: 'He', correct: 'He', distractors: ['his', 'him', 'she', 'hey', 'hi'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'hungry', correct: 'hungry', distractors: ['angry', 'hurry', 'hunger', 'honey', 'hang'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_24',
    english: 'Is she in the taxi?',
    russian: 'Она в такси?',
    ukrainian: 'Вона в таксі?',
    words: [
      { text: 'Is', correct: 'Is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'she', correct: 'she', distractors: ['her', 'he', 'see', 'the', 'shy'], category: 'pronoun' },
      { text: 'in', correct: 'in', distractors: ['on', 'at', 'by', 'of', 'to'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['a', 'an', 'of', 'in', 'to'], category: 'article' },
      { text: 'taxi', correct: 'taxi', distractors: ['tax', 'text', 'wax', 'taxis', 'taxi'], category: 'noun' },
    ],
  },
  {
    id: 'lesson2_phrase_25',
    english: 'We are not at school',
    russian: 'Мы не в школе',
    ukrainian: 'Ми не в школі',
    words: [
      { text: 'We', correct: 'We', distractors: ['way', 'us', 'our', 'west', 'wet'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'know', 'nose', 'note', 'net'], category: 'adverb' },
      { text: 'at', correct: 'at', distractors: ['in', 'on', 'by', 'of', 'to'], category: 'preposition' },
      { text: 'school', correct: 'school', distractors: ['cool', 'fool', 'tool', 'pool', 'spool'], category: 'noun' },
    ],
  },
  {
    id: 'lesson2_phrase_26',
    english: 'I am not afraid',
    russian: 'Я не боюсь',
    ukrainian: 'Я не боюся',
    words: [
      { text: 'I', correct: 'I', distractors: ['me', 'my', 'mine', 'eye', 'hi'], category: 'pronoun' },
      { text: 'am', correct: 'am', distractors: ['is', 'are', 'be', 'been', 'being'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'afraid', correct: 'afraid', distractors: ['afraid', 'afar', 'afield', 'ahead', 'afoot'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_27',
    english: 'Are they here?',
    russian: 'Они здесь?',
    ukrainian: 'Вони тут?',
    words: [
      { text: 'Are', correct: 'Are', distractors: ['am', 'is', 'art', 'air', 'age'], category: 'to-be' },
      { text: 'they', correct: 'they', distractors: ['them', 'their', 'there', 'the', 'then'], category: 'pronoun' },
      { text: 'here', correct: 'here', distractors: ['hear', 'her', 'there', 'where', 'hair'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson2_phrase_28',
    english: 'She is not angry',
    russian: 'Она не злится',
    ukrainian: 'Вона не злиться',
    words: [
      { text: 'She', correct: 'She', distractors: ['her', 'he', 'see', 'the', 'shy'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'angry', correct: 'angry', distractors: ['hungry', 'anger', 'ankle', 'angle', 'handy'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_29',
    english: 'Is it far?',
    russian: 'Это далеко?',
    ukrainian: 'Це далеко?',
    words: [
      { text: 'Is', correct: 'Is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'it', correct: 'it', distractors: ['its', 'eat', 'at', 'if', 'in'], category: 'pronoun' },
      { text: 'far', correct: 'far', distractors: ['car', 'bar', 'jar', 'tar', 'war'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_30',
    english: 'We are not enemies',
    russian: 'Мы не враги',
    ukrainian: 'Ми не вороги',
    words: [
      { text: 'We', correct: 'We', distractors: ['way', 'us', 'our', 'west', 'wet'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'know', 'nose', 'note', 'net'], category: 'adverb' },
      { text: 'enemies', correct: 'enemies', distractors: ['enemy', 'empties', 'engines', 'entries', 'envies'], category: 'noun' },
    ],
  },
  {
    id: 'lesson2_phrase_31',
    english: 'You are not alone',
    russian: 'Ты не один',
    ukrainian: 'Ти не один',
    words: [
      { text: 'You', correct: 'You', distractors: ['your', "you're", 'u', 'yours', 'youth'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'know', 'nose', 'note', 'net'], category: 'adverb' },
      { text: 'alone', correct: 'alone', distractors: ['along', 'aloud', 'above', 'below', 'clone'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_32',
    english: 'Is he at the office?',
    russian: 'Он в офисе?',
    ukrainian: 'Він в офісі?',
    words: [
      { text: 'Is', correct: 'Is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'he', correct: 'he', distractors: ['his', 'him', 'she', 'hey', 'hi'], category: 'pronoun' },
      { text: 'at', correct: 'at', distractors: ['in', 'on', 'by', 'of', 'to'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['a', 'an', 'of', 'in', 'to'], category: 'article' },
      { text: 'office', correct: 'office', distractors: ['officer', 'offend', 'effect', 'effort', 'offer'], category: 'noun' },
    ],
  },
  {
    id: 'lesson2_phrase_33',
    english: 'I am not in the mood',
    russian: 'Я не в настроении',
    ukrainian: 'Я не в настрої',
    words: [
      { text: 'I', correct: 'I', distractors: ['me', 'my', 'mine', 'eye', 'hi'], category: 'pronoun' },
      { text: 'am', correct: 'am', distractors: ['is', 'are', 'be', 'been', 'being'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'in', correct: 'in', distractors: ['on', 'at', 'by', 'of', 'to'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['a', 'an', 'of', 'in', 'to'], category: 'article' },
      { text: 'mood', correct: 'mood', distractors: ['food', 'good', 'wood', 'blood', 'flood'], category: 'noun' },
    ],
  },
  {
    id: 'lesson2_phrase_34',
    english: 'Is it true?',
    russian: 'Это правда?',
    ukrainian: 'Це правда?',
    words: [
      { text: 'Is', correct: 'Is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'it', correct: 'it', distractors: ['its', 'eat', 'at', 'if', 'in'], category: 'pronoun' },
      { text: 'true', correct: 'true', distractors: ['tree', 'blue', 'clue', 'glue', 'crew'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_35',
    english: 'We are not in a trap',
    russian: 'Мы не в ловушке',
    ukrainian: 'Ми не в пастці',
    words: [
      { text: 'We', correct: 'We', distractors: ['way', 'us', 'our', 'west', 'wet'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'know', 'nose', 'note', 'net'], category: 'adverb' },
      { text: 'in', correct: 'in', distractors: ['on', 'at', 'by', 'of', 'to'], category: 'preposition' },
      { text: 'a', correct: 'a', distractors: ['an', 'the', 'of', 'in', 'to'], category: 'article' },
      { text: 'trap', correct: 'trap', distractors: ['trip', 'drip', 'drop', 'wrap', 'track'], category: 'noun' },
    ],
  },
  {
    id: 'lesson2_phrase_36',
    english: 'They are not ready',
    russian: 'Они не готовы',
    ukrainian: 'Вони не готові',
    words: [
      { text: 'They', correct: 'They', distractors: ['them', 'their', 'there', 'the', 'then'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'ready', correct: 'ready', distractors: ['read', 'red', 'road', 'real', 'already'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_37',
    english: 'It is not important',
    russian: 'Это не важно',
    ukrainian: 'Це не важливо',
    words: [
      { text: 'It', correct: 'It', distractors: ['its', 'is', 'if', 'in', 'eat'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'important', correct: 'important', distractors: ['import', 'impart', 'impact', 'impost', 'impound'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_38',
    english: 'Are you on the way?',
    russian: 'Ты в пути?',
    ukrainian: 'Ти в дорозі?',
    words: [
      { text: 'Are', correct: 'Are', distractors: ['am', 'is', 'art', 'air', 'age'], category: 'to-be' },
      { text: 'you', correct: 'you', distractors: ['your', "you're", 'u', 'yours', 'youth'], category: 'pronoun' },
      { text: 'on', correct: 'on', distractors: ['in', 'at', 'by', 'of', 'to'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['a', 'an', 'of', 'in', 'to'], category: 'article' },
      { text: 'way', correct: 'way', distractors: ['day', 'say', 'pay', 'may', 'bay'], category: 'noun' },
    ],
  },
  {
    id: 'lesson2_phrase_39',
    english: 'She is not sick',
    russian: 'Она не больна',
    ukrainian: 'Вона не хвора',
    words: [
      { text: 'She', correct: 'She', distractors: ['her', 'he', 'see', 'the', 'shy'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'sick', correct: 'sick', distractors: ['kick', 'pick', 'tick', 'wick', 'lick'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_40',
    english: 'I am not in the car',
    russian: 'Я не в машине',
    ukrainian: 'Я не в машині',
    words: [
      { text: 'I', correct: 'I', distractors: ['me', 'my', 'mine', 'eye', 'hi'], category: 'pronoun' },
      { text: 'am', correct: 'am', distractors: ['is', 'are', 'be', 'been', 'being'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'in', correct: 'in', distractors: ['on', 'at', 'by', 'of', 'to'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['a', 'an', 'of', 'in', 'to'], category: 'article' },
      { text: 'car', correct: 'car', distractors: ['bar', 'far', 'jar', 'tar', 'star'], category: 'noun' },
    ],
  },
  {
    id: 'lesson2_phrase_41',
    english: 'We are not guilty',
    russian: 'Мы не виноваты',
    ukrainian: 'Ми не винні',
    words: [
      { text: 'We', correct: 'We', distractors: ['way', 'us', 'our', 'west', 'wet'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'know', 'nose', 'note', 'net'], category: 'adverb' },
      { text: 'guilty', correct: 'guilty', distractors: ['built', 'guilt', 'gilded', 'tilted', 'wilted'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_42',
    english: 'Is he in the elevator?',
    russian: 'Он в лифте?',
    ukrainian: 'Він в ліфті?',
    words: [
      { text: 'Is', correct: 'Is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'he', correct: 'he', distractors: ['his', 'him', 'she', 'hey', 'hi'], category: 'pronoun' },
      { text: 'in', correct: 'in', distractors: ['on', 'at', 'by', 'of', 'to'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['a', 'an', 'of', 'in', 'to'], category: 'article' },
      { text: 'elevator', correct: 'elevator', distractors: ['elevator', 'alligator', 'generator', 'narrator', 'liberator'], category: 'noun' },
    ],
  },
  {
    id: 'lesson2_phrase_43',
    english: 'It is not dangerous',
    russian: 'Это не опасно',
    ukrainian: 'Це не небезпечно',
    words: [
      { text: 'It', correct: 'It', distractors: ['its', 'is', 'if', 'in', 'eat'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'dangerous', correct: 'dangerous', distractors: ['danger', 'famous', 'various', 'serious', 'nervous'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_44',
    english: 'Are you in the building?',
    russian: 'Ты в здании?',
    ukrainian: 'Ти в будівлі?',
    words: [
      { text: 'Are', correct: 'Are', distractors: ['am', 'is', 'art', 'air', 'age'], category: 'to-be' },
      { text: 'you', correct: 'you', distractors: ['your', "you're", 'u', 'yours', 'youth'], category: 'pronoun' },
      { text: 'in', correct: 'in', distractors: ['on', 'at', 'by', 'of', 'to'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['a', 'an', 'of', 'in', 'to'], category: 'article' },
      { text: 'building', correct: 'building', distractors: ['billing', 'holding', 'folding', 'molding', 'gilding'], category: 'noun' },
    ],
  },
  {
    id: 'lesson2_phrase_45',
    english: 'I am not mean',
    alternatives: ['I am not angry'],
    russian: 'Я не злой',
    ukrainian: 'Я не злий',
    words: [
      { text: 'I', correct: 'I', distractors: ['me', 'my', 'mine', 'eye', 'hi'], category: 'pronoun' },
      { text: 'am', correct: 'am', distractors: ['is', 'are', 'be', 'been', 'being'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'mean', correct: 'mean', distractors: ['bean', 'lean', 'keen', 'dean', 'clean'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_46',
    english: 'She is not in the mood',
    russian: 'Она не в настроении',
    ukrainian: 'Вона не в настрої',
    words: [
      { text: 'She', correct: 'She', distractors: ['her', 'he', 'see', 'the', 'shy'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'in', correct: 'in', distractors: ['on', 'at', 'by', 'of', 'to'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['a', 'an', 'of', 'in', 'to'], category: 'article' },
      { text: 'mood', correct: 'mood', distractors: ['food', 'good', 'wood', 'blood', 'flood'], category: 'noun' },
    ],
  },
  {
    id: 'lesson2_phrase_47',
    english: 'Are we not on the list?',
    russian: 'Разве нас нет в списке?',
    ukrainian: 'Хіба нас немає в списку?',
    words: [
      { text: 'Are', correct: 'Are', distractors: ['am', 'is', 'art', 'air', 'age'], category: 'to-be' },
      { text: 'we', correct: 'we', distractors: ['way', 'us', 'our', 'west', 'wet'], category: 'pronoun' },
      { text: 'not', correct: 'not', distractors: ['no', 'know', 'nose', 'note', 'net'], category: 'adverb' },
      { text: 'on', correct: 'on', distractors: ['in', 'at', 'by', 'of', 'to'], category: 'preposition' },
      { text: 'the', correct: 'the', distractors: ['a', 'an', 'of', 'in', 'to'], category: 'article' },
      { text: 'list', correct: 'list', distractors: ['fist', 'mist', 'hist', 'gist', 'last'], category: 'noun' },
    ],
  },
  {
    id: 'lesson2_phrase_48',
    english: 'It is not serious',
    russian: 'Это не серьёзно',
    ukrainian: 'Це не серйозно',
    words: [
      { text: 'It', correct: 'It', distractors: ['its', 'is', 'if', 'in', 'eat'], category: 'pronoun' },
      { text: 'is', correct: 'is', distractors: ['am', 'are', 'it', 'if', 'in'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'serious', correct: 'serious', distractors: ['curious', 'various', 'obvious', 'nervous', 'famous'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson2_phrase_49',
    english: 'They are not together',
    russian: 'Они не вместе',
    ukrainian: 'Вони не разом',
    words: [
      { text: 'They', correct: 'They', distractors: ['them', 'their', 'there', 'the', 'then'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'nor', 'net', 'note', 'nut'], category: 'adverb' },
      { text: 'together', correct: 'together', distractors: ['whether', 'weather', 'leather', 'feather', 'tether'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson2_phrase_50',
    english: 'You are not right',
    russian: 'Ты не прав',
    ukrainian: 'Ти не правий',
    words: [
      { text: 'You', correct: 'You', distractors: ['your', "you're", 'u', 'yours', 'youth'], category: 'pronoun' },
      { text: 'are', correct: 'are', distractors: ['am', 'is', 'art', 'air', 'arm'], category: 'to-be' },
      { text: 'not', correct: 'not', distractors: ['no', 'know', 'nose', 'note', 'net'], category: 'adverb' },
      { text: 'right', correct: 'right', distractors: ['write', 'light', 'night', 'fight', 'sight'], category: 'adjective' },
    ],
  },
];

// ==================== LESSON 3 ====================

export const LESSON_3_ENCOURAGEMENT_SCREENS: LessonIntroScreen[] = [];

// ==================== LESSON 4 ====================

// Lesson 4 Vocabulary

// ==================== LESSON 5 ====================

export const LESSON_5_ENCOURAGEMENT_SCREENS: LessonIntroScreen[] = [];

export const LESSON_5_PHRASES: LessonPhrase[] = [
  {
    id: 'lesson5_phrase_1',
    english: 'Do you drink coffee?',
    russian: 'Ты пьешь кофе?',
    ukrainian: 'Ти п\'єш каву?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'doing', 'done', 'did', 'dot'], category: 'verb' },
      { text: 'you', correct: 'you', distractors: ['your', 'yours', 'you\'re', 'u', 'youth'], category: 'pronoun' },
      { text: 'drink', correct: 'drink', distractors: ['drinks', 'drinking', 'drunk', 'dream', 'drive'], category: 'verb' },
      { text: 'coffee', correct: 'coffee', distractors: ['office', 'cough', 'copy', 'cake', 'cafe'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_2',
    english: 'Does he live here?',
    russian: 'Он живет здесь?',
    ukrainian: 'Він живе тут?',
    words: [
      { text: 'Does', correct: 'Does', distractors: ['do', 'did', 'done', 'dose', 'doing'], category: 'verb' },
      { text: 'he', correct: 'he', distractors: ['she', 'her', 'his', 'hey', 'hem'], category: 'pronoun' },
      { text: 'live', correct: 'live', distractors: ['lives', 'lived', 'like', 'give', 'lift'], category: 'verb' },
      { text: 'here', correct: 'here', distractors: ['hear', 'hero', 'her', 'herd', 'hare'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson5_phrase_3',
    english: 'Do we work tomorrow?',
    russian: 'Мы работаем завтра?',
    ukrainian: 'Ми працюємо завтра?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'doing', 'don\'t', 'Dot'], category: 'verb' },
      { text: 'we', correct: 'we', distractors: ['me', 'be', 'he', 'she', 'see'], category: 'pronoun' },
      { text: 'work', correct: 'work', distractors: ['works', 'word', 'walk', 'wore', 'work\'s'], category: 'verb' },
      { text: 'tomorrow', correct: 'tomorrow', distractors: ['today', 'tomoRow', 'borrow', 'sorrow', 'follow'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson5_phrase_4',
    english: 'Does she understand English?',
    russian: 'Она понимает английский?',
    ukrainian: 'Вона розуміє англійську?',
    words: [
      { text: 'Does', correct: 'Does', distractors: ['do', 'did', 'dose', 'doing', 'don\'t'], category: 'verb' },
      { text: 'she', correct: 'she', distractors: ['he', 'her', 'the', 'shy', 'shed'], category: 'pronoun' },
      { text: 'understand', correct: 'understand', distractors: ['understands', 'understood', 'understate', 'underland', 'undershirt'], category: 'verb' },
      { text: 'English', correct: 'English', distractors: ['englesh', 'england', 'angle', 'single', 'inglish'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_5',
    english: 'Do they know the password?',
    russian: 'Они знают пароль?',
    ukrainian: 'Вони знають пароль?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'done', 'dot', 'door'], category: 'verb' },
      { text: 'they', correct: 'they', distractors: ['the', 'their', 'them', 'then', 'there'], category: 'pronoun' },
      { text: 'know', correct: 'know', distractors: ['knew', 'known', 'now', 'knew', 'knee'], category: 'verb' },
      { text: 'the', correct: 'the', distractors: ['a', 'an', 'this', 'that', 'these'], category: 'article' },
      { text: 'password', correct: 'password', distractors: ['passcode', 'passwork', 'passport', 'bassword', 'passward'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_6',
    english: 'Do I write correctly?',
    russian: 'Я правильно пишу?',
    ukrainian: 'Я правильно пишу?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'doing', 'don', 'dow'], category: 'verb' },
      { text: 'I', correct: 'I', distractors: ['a', 'it', 'in', 'is', 'if'], category: 'pronoun' },
      { text: 'write', correct: 'write', distractors: ['wrote', 'right', 'white', 'rides', 'writ'], category: 'verb' },
      { text: 'correctly', correct: 'correctly', distractors: ['correct', 'directly', 'closely', 'corrected', 'corectly'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson5_phrase_7',
    english: 'Does it cost much?',
    russian: 'Это стоит дорого?',
    ukrainian: 'Це коштує дорого?',
    words: [
      { text: 'Does', correct: 'Does', distractors: ['do', 'did', 'dose', 'done', 'dot'], category: 'verb' },
      { text: 'it', correct: 'it', distractors: ['is', 'its', 'in', 'if', 'at'], category: 'pronoun' },
      { text: 'cost', correct: 'cost', distractors: ['costs', 'costing', 'cast', 'coast', 'lost'], category: 'verb' },
      { text: 'much', correct: 'much', distractors: ['many', 'more', 'mush', 'such', 'match'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson5_phrase_8',
    english: 'Do you travel often?',
    russian: 'Вы часто путешествуете?',
    ukrainian: 'Ви часто подорожуєте?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'doing', 'doo', 'don'], category: 'verb' },
      { text: 'you', correct: 'you', distractors: ['your', 'yours', 'u', 'yew', 'yore'], category: 'pronoun' },
      { text: 'travel', correct: 'travel', distractors: ['travels', 'gravel', 'travail', 'trevel', 'trawl'], category: 'verb' },
      { text: 'often', correct: 'often', distractors: ['often', 'after', 'offer', 'open', 'often'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson5_phrase_9',
    english: 'Does he drink tea?',
    russian: 'Он пьет чай?',
    ukrainian: 'Він п\'є чай?',
    words: [
      { text: 'Does', correct: 'Does', distractors: ['do', 'did', 'dose', 'door', 'doing'], category: 'verb' },
      { text: 'he', correct: 'he', distractors: ['she', 'we', 'me', 'be', 'hi'], category: 'pronoun' },
      { text: 'drink', correct: 'drink', distractors: ['drinks', 'drunk', 'drank', 'rink', 'think'], category: 'verb' },
      { text: 'tea', correct: 'tea', distractors: ['sea', 'pea', 'tee', 'ten', 'team'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_10',
    english: 'Do we use this code?',
    russian: 'Мы используем этот код?',
    ukrainian: 'Ми використовуємо цей код?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'done', 'dog', 'dow'], category: 'verb' },
      { text: 'we', correct: 'we', distractors: ['me', 'he', 'be', 'see', 'fee'], category: 'pronoun' },
      { text: 'use', correct: 'use', distractors: ['uses', 'used', 'fuse', 'lose', 'user'], category: 'verb' },
      { text: 'this', correct: 'this', distractors: ['the', 'that', 'these', 'thus', 'his'], category: 'article' },
      { text: 'code', correct: 'code', distractors: ['mode', 'node', 'rode', 'cede', 'cord'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_11',
    english: 'Does she wear a mask?',
    russian: 'Она носит маску?',
    ukrainian: 'Вона носить маску?',
    words: [
      { text: 'Does', correct: 'Does', distractors: ['do', 'did', 'dose', 'doss', 'dong'], category: 'verb' },
      { text: 'she', correct: 'she', distractors: ['he', 'the', 'see', 'shy', 'show'], category: 'pronoun' },
      { text: 'wear', correct: 'wear', distractors: ['wears', 'wore', 'near', 'dear', 'bear'], category: 'verb' },
      { text: 'a', correct: 'a', distractors: ['an', 'the', 'at', 'as', 'and'], category: 'article' },
      { text: 'mask', correct: 'mask', distractors: ['task', 'mast', 'ask', 'masc', 'mass'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_12',
    english: 'Do they sell tickets?',
    russian: 'Они продают билеты?',
    ukrainian: 'Вони продають квитки?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'doo', 'don', 'dot'], category: 'verb' },
      { text: 'they', correct: 'they', distractors: ['the', 'then', 'them', 'there', 'three'], category: 'pronoun' },
      { text: 'sell', correct: 'sell', distractors: ['sells', 'tell', 'bell', 'fell', 'cell'], category: 'verb' },
      { text: 'tickets', correct: 'tickets', distractors: ['ticket', 'tickers', 'pickets', 'wickets', 'tickles'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_13',
    english: 'Do I look tired?',
    russian: 'Я выгляжу усталым?',
    ukrainian: 'Я виглядаю втомленим?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'doing', 'don', 'dop'], category: 'verb' },
      { text: 'I', correct: 'I', distractors: ['a', 'it', 'is', 'in', 'ill'], category: 'pronoun' },
      { text: 'look', correct: 'look', distractors: ['looks', 'book', 'hook', 'cook', 'lock'], category: 'verb' },
      { text: 'tired', correct: 'tired', distractors: ['tired', 'hired', 'fired', 'wired', 'tiered'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson5_phrase_14',
    english: 'Do you remember the address?',
    russian: 'Ты помнишь адрес?',
    ukrainian: 'Ти пам\'ятаєш адресу?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'done', 'dol', 'dim'], category: 'verb' },
      { text: 'you', correct: 'you', distractors: ['your', 'yours', 'yew', 'yore', 'you\'d'], category: 'pronoun' },
      { text: 'remember', correct: 'remember', distractors: ['remembers', 'remembered', 'resemble', 'remainder', 'rember'], category: 'verb' },
      { text: 'the', correct: 'the', distractors: ['a', 'an', 'this', 'that', 'thy'], category: 'article' },
      { text: 'address', correct: 'address', distractors: ['addres', 'adress', 'actress', 'access', 'distress'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_15',
    english: 'Does he buy food?',
    russian: 'Он покупает еду?',
    ukrainian: 'Він купує їжу?',
    words: [
      { text: 'Does', correct: 'Does', distractors: ['do', 'did', 'dose', 'doss', 'don'], category: 'verb' },
      { text: 'he', correct: 'he', distractors: ['she', 'we', 'the', 'hey', 'hew'], category: 'pronoun' },
      { text: 'buy', correct: 'buy', distractors: ['buys', 'by', 'bye', 'bay', 'guy'], category: 'verb' },
      { text: 'food', correct: 'food', distractors: ['foot', 'fool', 'flood', 'mood', 'good'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_16',
    english: 'Do we pay cash?',
    russian: 'Мы платим наличными?',
    ukrainian: 'Ми платимо готівкою?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'doo', 'dob', 'dow'], category: 'verb' },
      { text: 'we', correct: 'we', distractors: ['me', 'he', 'be', 'fee', 'see'], category: 'pronoun' },
      { text: 'pay', correct: 'pay', distractors: ['pays', 'paid', 'say', 'bay', 'play'], category: 'verb' },
      { text: 'cash', correct: 'cash', distractors: ['clash', 'gash', 'dash', 'hash', 'lash'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_17',
    english: 'Do they smoke here?',
    russian: 'Они курят здесь?',
    ukrainian: 'Вони курять тут?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'done', 'dow', 'dog'], category: 'verb' },
      { text: 'they', correct: 'they', distractors: ['the', 'their', 'there', 'then', 'three'], category: 'pronoun' },
      { text: 'smoke', correct: 'smoke', distractors: ['smokes', 'spoke', 'stoke', 'smock', 'broke'], category: 'verb' },
      { text: 'here', correct: 'here', distractors: ['hear', 'herd', 'hero', 'were', 'hire'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson5_phrase_18',
    english: 'Does she eat meat?',
    russian: 'Она ест мясо?',
    ukrainian: 'Вона їсть м\'ясо?',
    words: [
      { text: 'Does', correct: 'Does', distractors: ['do', 'did', 'dose', 'dome', 'dole'], category: 'verb' },
      { text: 'she', correct: 'she', distractors: ['he', 'the', 'shy', 'shed', 'shoe'], category: 'pronoun' },
      { text: 'eat', correct: 'eat', distractors: ['eats', 'ate', 'east', 'each', 'feat'], category: 'verb' },
      { text: 'meat', correct: 'meat', distractors: ['meal', 'meet', 'beat', 'heat', 'seat'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_19',
    english: 'Do you hear a noise?',
    russian: 'Вы слышите шум?',
    ukrainian: 'Ви чуєте шум?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'doo', 'don', 'dot'], category: 'verb' },
      { text: 'you', correct: 'you', distractors: ['your', 'yours', 'you\'ve', 'yew', 'yore'], category: 'pronoun' },
      { text: 'hear', correct: 'hear', distractors: ['hears', 'here', 'near', 'fear', 'dear'], category: 'verb' },
      { text: 'a', correct: 'a', distractors: ['an', 'the', 'at', 'as', 'ah'], category: 'article' },
      { text: 'noise', correct: 'noise', distractors: ['noisy', 'voice', 'choice', 'poise', 'noice'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_20',
    english: 'Does he call often?',
    russian: 'Он часто звонит?',
    ukrainian: 'Він часто телефонує?',
    words: [
      { text: 'Does', correct: 'Does', distractors: ['do', 'did', 'dose', 'doles', 'doing'], category: 'verb' },
      { text: 'he', correct: 'he', distractors: ['she', 'we', 'me', 'hi', 'hem'], category: 'pronoun' },
      { text: 'call', correct: 'call', distractors: ['calls', 'fall', 'tall', 'hall', 'ball'], category: 'verb' },
      { text: 'often', correct: 'often', distractors: ['after', 'offer', 'open', 'often\'s', 'soften'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson5_phrase_21',
    english: 'Do I sing well?',
    russian: 'Я хорошо пою?',
    ukrainian: 'Я добре співаю?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'dop', 'don', 'dob'], category: 'verb' },
      { text: 'I', correct: 'I', distractors: ['a', 'it', 'in', 'if', 'ice'], category: 'pronoun' },
      { text: 'sing', correct: 'sing', distractors: ['sings', 'ring', 'king', 'thing', 'bing'], category: 'verb' },
      { text: 'well', correct: 'well', distractors: ['will', 'bell', 'fell', 'yell', 'sell'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson5_phrase_22',
    english: 'Do we order pizza?',
    russian: 'Мы заказываем пиццу?',
    ukrainian: 'Ми замовляємо піцу?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'done', 'dot', 'dom'], category: 'verb' },
      { text: 'we', correct: 'we', distractors: ['me', 'he', 'she', 'be', 'fee'], category: 'pronoun' },
      { text: 'order', correct: 'order', distractors: ['orders', 'older', 'odder', 'offer', 'border'], category: 'verb' },
      { text: 'pizza', correct: 'pizza', distractors: ['piazza', 'pita', 'pieza', 'pizzas', 'plaza'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_23',
    english: 'Does she believe in luck?',
    russian: 'Она верит в удачу?',
    ukrainian: 'Вона вірить в удачу?',
    words: [
      { text: 'Does', correct: 'Does', distractors: ['do', 'did', 'dose', 'doles', 'dome'], category: 'verb' },
      { text: 'she', correct: 'she', distractors: ['he', 'the', 'see', 'shed', 'shy'], category: 'pronoun' },
      { text: 'believe', correct: 'believe', distractors: ['believes', 'believed', 'relieve', 'bereave', 'belive'], category: 'verb' },
      { text: 'in', correct: 'in', distractors: ['on', 'at', 'an', 'into', 'inn'], category: 'preposition' },
      { text: 'luck', correct: 'luck', distractors: ['lock', 'duck', 'tuck', 'lack', 'lick'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_24',
    english: 'Do they travel much?',
    russian: 'Они много путешествуют?',
    ukrainian: 'Вони багато подорожують?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'done', 'don', 'dob'], category: 'verb' },
      { text: 'they', correct: 'they', distractors: ['the', 'their', 'them', 'then', 'hey'], category: 'pronoun' },
      { text: 'travel', correct: 'travel', distractors: ['travels', 'gravel', 'unravel', 'treavel', 'trawl'], category: 'verb' },
      { text: 'much', correct: 'much', distractors: ['many', 'more', 'such', 'mush', 'hutch'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson5_phrase_25',
    english: 'Do you understand the risk?',
    russian: 'Вы понимаете риск?',
    ukrainian: 'Ви розумієте ризик?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'done', 'dote', 'dim'], category: 'verb' },
      { text: 'you', correct: 'you', distractors: ['your', 'yours', 'you\'ve', 'yew', 'you\'d'], category: 'pronoun' },
      { text: 'understand', correct: 'understand', distractors: ['understands', 'understood', 'undermine', 'undershoot', 'understnd'], category: 'verb' },
      { text: 'the', correct: 'the', distractors: ['a', 'an', 'this', 'that', 'thee'], category: 'article' },
      { text: 'risk', correct: 'risk', distractors: ['risks', 'disk', 'brisk', 'rink', 'rusk'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_26',
    english: 'Does he drive a car?',
    russian: 'Он водит машину?',
    ukrainian: 'Він водить машину?',
    words: [
      { text: 'Does', correct: 'Does', distractors: ['do', 'dose', 'done', 'did', 'dust'], category: 'verb' },
      { text: 'he', correct: 'he', distractors: ['his', 'him', 'she', 'hey', 'hi'], category: 'pronoun' },
      { text: 'drive', correct: 'drive', distractors: ['drives', 'driving', 'drove', 'drank', 'dream'], category: 'verb' },
      { text: 'a', correct: 'a', distractors: ['an', 'the', 'and', 'as', 'at'], category: 'article' },
      { text: 'car', correct: 'car', distractors: ['cat', 'can', 'care', 'bar', 'far'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_27',
    english: 'Do we lose money?',
    russian: 'Мы теряем деньги?',
    ukrainian: 'Ми втрачаємо гроші?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'done', 'dot', 'doe'], category: 'verb' },
      { text: 'we', correct: 'we', distractors: ['me', 'he', 'be', 'she', 'the'], category: 'pronoun' },
      { text: 'lose', correct: 'lose', distractors: ['loss', 'loose', 'love', 'lone', 'lore'], category: 'verb' },
      { text: 'money', correct: 'money', distractors: ['monkey', 'honey', 'many', 'mono', 'funny'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_28',
    english: 'Does she read books?',
    russian: 'Она читает книги?',
    ukrainian: 'Вона читає книги?',
    words: [
      { text: 'Does', correct: 'Does', distractors: ['do', 'dose', 'doss', 'did', 'dotes'], category: 'verb' },
      { text: 'she', correct: 'she', distractors: ['her', 'he', 'the', 'see', 'shy'], category: 'pronoun' },
      { text: 'read', correct: 'read', distractors: ['reed', 'lead', 'bead', 'real', 'ride'], category: 'verb' },
      { text: 'books', correct: 'books', distractors: ['boos', 'boots', 'looks', 'hooks', 'cooks'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_29',
    english: 'Do they help people?',
    russian: 'Они помогают людям?',
    ukrainian: 'Вони допомагають людям?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'dot', 'due', 'doo'], category: 'verb' },
      { text: 'they', correct: 'they', distractors: ['the', 'then', 'there', 'them', 'hey'], category: 'pronoun' },
      { text: 'help', correct: 'help', distractors: ['held', 'heap', 'helm', 'kelp', 'whelp'], category: 'verb' },
      { text: 'people', correct: 'people', distractors: ['purple', 'peeple', 'people', 'maple', 'peeled'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_30',
    english: 'Do you feel the difference?',
    russian: 'Ты чувствуешь разницу?',
    ukrainian: 'Ти відчуваєш різницю?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'due', 'dew', 'doe'], category: 'verb' },
      { text: 'you', correct: 'you', distractors: ['your', 'yew', 'yore', 'yow', 'you\'re'], category: 'pronoun' },
      { text: 'feel', correct: 'feel', distractors: ['fell', 'felt', 'heel', 'reel', 'fill'], category: 'verb' },
      { text: 'the', correct: 'the', distractors: ['a', 'an', 'this', 'that', 'thee'], category: 'article' },
      { text: 'difference', correct: 'difference', distractors: ['different', 'difference', 'defence', 'diffrence', 'differance'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_31',
    english: 'Do you change the password often?',
    russian: 'Вы часто меняете пароль?',
    ukrainian: 'Ви часто змінюєте пароль?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'doth', 'dot', 'due'], category: 'verb' },
      { text: 'you', correct: 'you', distractors: ['your', 'yore', 'you\'re', 'yous', 'yew'], category: 'pronoun' },
      { text: 'change', correct: 'change', distractors: ['chance', 'charge', 'chafe', 'strange', 'range'], category: 'verb' },
      { text: 'the', correct: 'the', distractors: ['a', 'an', 'those', 'this', 'thee'], category: 'article' },
      { text: 'password', correct: 'password', distractors: ['passport', 'passward', 'pasword', 'passcode', 'passwork'], category: 'noun' },
      { text: 'often', correct: 'often', distractors: ['often', 'open', 'offer', 'oven', 'orphan'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson5_phrase_32',
    english: 'Does he take a commission?',
    russian: 'Он берет комиссию?',
    ukrainian: 'Він бере комісію?',
    words: [
      { text: 'Does', correct: 'Does', distractors: ['do', 'did', 'doss', 'dotes', 'dose'], category: 'verb' },
      { text: 'he', correct: 'he', distractors: ['his', 'her', 'hey', 'hit', 'hi'], category: 'pronoun' },
      { text: 'take', correct: 'take', distractors: ['taken', 'tale', 'fake', 'lake', 'wake'], category: 'verb' },
      { text: 'a', correct: 'a', distractors: ['an', 'the', 'at', 'and', 'as'], category: 'article' },
      { text: 'commission', correct: 'commission', distractors: ['omission', 'permission', 'comission', 'commision', 'emission'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_33',
    english: 'Do we book a table?',
    russian: 'Мы бронируем столик?',
    ukrainian: 'Ми бронюємо столик?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'due', 'dew', 'doe'], category: 'verb' },
      { text: 'we', correct: 'we', distractors: ['me', 'he', 'be', 'fee', 'see'], category: 'pronoun' },
      { text: 'book', correct: 'book', distractors: ['cook', 'look', 'hook', 'boot', 'took'], category: 'verb' },
      { text: 'a', correct: 'a', distractors: ['an', 'the', 'at', 'and', 'ace'], category: 'article' },
      { text: 'table', correct: 'table', distractors: ['cable', 'fable', 'sable', 'tablet', 'tables'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_34',
    english: 'Does she drink green tea?',
    russian: 'Она пьет зеленый чай?',
    ukrainian: 'Вона п\'є зелений чай?',
    words: [
      { text: 'Does', correct: 'Does', distractors: ['do', 'did', 'dose', 'doss', 'done'], category: 'verb' },
      { text: 'she', correct: 'she', distractors: ['her', 'he', 'see', 'shy', 'shee'], category: 'pronoun' },
      { text: 'drink', correct: 'drink', distractors: ['drank', 'drunk', 'drip', 'brink', 'rink'], category: 'verb' },
      { text: 'green', correct: 'green', distractors: ['greet', 'grew', 'keen', 'seen', 'queen'], category: 'adjective' },
      { text: 'tea', correct: 'tea', distractors: ['sea', 'pea', 'tee', 'tear', 'real'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_35',
    english: 'Do they accept credit cards?',
    russian: 'Они принимают кредитные карты?',
    ukrainian: 'Вони приймають кредитні картки?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'doth', 'due', 'dot'], category: 'verb' },
      { text: 'they', correct: 'they', distractors: ['them', 'the', 'then', 'there', 'hey'], category: 'pronoun' },
      { text: 'accept', correct: 'accept', distractors: ['except', 'accent', 'access', 'accpet', 'acept'], category: 'verb' },
      { text: 'credit', correct: 'credit', distractors: ['debit', 'credits', 'credot', 'credo', 'greed'], category: 'adjective' },
      { text: 'cards', correct: 'cards', distractors: ['carts', 'yards', 'bards', 'car', 'cares'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_36',
    english: 'Do we go inside?',
    russian: 'Мы заходим внутрь?',
    ukrainian: 'Ми заходимо всередину?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'doe', 'dew', 'due'], category: 'verb' },
      { text: 'we', correct: 'we', distractors: ['me', 'he', 'be', 'see', 'fee'], category: 'pronoun' },
      { text: 'go', correct: 'go', distractors: ['got', 'gone', 'goes', 'no', 'so'], category: 'verb' },
      { text: 'inside', correct: 'inside', distractors: ['outside', 'beside', 'insane', 'instep', 'reside'], category: 'preposition' },
    ],
  },
  {
    id: 'lesson5_phrase_37',
    english: 'Does she feel pain?',
    russian: 'Она чувствует боль?',
    ukrainian: 'Вона відчуває біль?',
    words: [
      { text: 'Does', correct: 'Does', distractors: ['do', 'did', 'dose', 'done', 'dotes'], category: 'verb' },
      { text: 'she', correct: 'she', distractors: ['her', 'he', 'shy', 'see', 'shea'], category: 'pronoun' },
      { text: 'feel', correct: 'feel', distractors: ['fell', 'felt', 'fill', 'heel', 'peel'], category: 'verb' },
      { text: 'pain', correct: 'pain', distractors: ['main', 'rain', 'pan', 'pine', 'pail'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_38',
    english: 'Do they know the answer?',
    russian: 'Они знают ответ?',
    ukrainian: 'Вони знають відповідь?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'doth', 'dot', 'doe'], category: 'verb' },
      { text: 'they', correct: 'they', distractors: ['them', 'the', 'then', 'there', 'these'], category: 'pronoun' },
      { text: 'know', correct: 'know', distractors: ['knew', 'known', 'now', 'no', 'blow'], category: 'verb' },
      { text: 'the', correct: 'the', distractors: ['a', 'an', 'this', 'that', 'thee'], category: 'article' },
      { text: 'answer', correct: 'answer', distractors: ['anwser', 'cancer', 'dancer', 'manage', 'wonder'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_39',
    english: 'Do I look good?',
    russian: 'Я выгляжу хорошо?',
    ukrainian: 'Я виглядаю добре?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'dew', 'due', 'dot'], category: 'verb' },
      { text: 'I', correct: 'I', distractors: ['me', 'my', 'it', 'in', 'if'], category: 'pronoun' },
      { text: 'look', correct: 'look', distractors: ['cook', 'book', 'hook', 'lock', 'loot'], category: 'verb' },
      { text: 'good', correct: 'good', distractors: ['food', 'mood', 'wood', 'goof', 'goods'], category: 'adjective' },
    ],
  },
  {
    id: 'lesson5_phrase_40',
    english: 'Do you wear glasses?',
    russian: 'Ты носишь очки?',
    ukrainian: 'Ти носиш окуляри?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'doe', 'due', 'dot'], category: 'verb' },
      { text: 'you', correct: 'you', distractors: ['your', 'yore', 'yew', 'yous', 'yow'], category: 'pronoun' },
      { text: 'wear', correct: 'wear', distractors: ['were', 'where', 'year', 'bear', 'fear'], category: 'verb' },
      { text: 'glasses', correct: 'glasses', distractors: ['classes', 'masses', 'passes', 'glases', 'places'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_41',
    english: 'Do you understand the terms?',
    russian: 'Вы понимаете условия?',
    ukrainian: 'Ви розумієте умови?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'doth', 'due', 'dot'], category: 'verb' },
      { text: 'you', correct: 'you', distractors: ['your', 'yore', 'yew', 'yous', 'you\'re'], category: 'pronoun' },
      { text: 'understand', correct: 'understand', distractors: ['understad', 'underhand', 'overstand', 'understend', 'undstand'], category: 'verb' },
      { text: 'the', correct: 'the', distractors: ['a', 'an', 'those', 'this', 'thee'], category: 'article' },
      { text: 'terms', correct: 'terms', distractors: ['germs', 'perms', 'ferns', 'firms', 'term'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_42',
    english: 'Does he often forget keys?',
    russian: 'Он часто забывает ключи?',
    ukrainian: 'Він часто забуває ключі?',
    words: [
      { text: 'Does', correct: 'Does', distractors: ['do', 'did', 'dose', 'done', 'doss'], category: 'verb' },
      { text: 'he', correct: 'he', distractors: ['his', 'her', 'hey', 'hit', 'hi'], category: 'pronoun' },
      { text: 'often', correct: 'often', distractors: ['open', 'offer', 'oven', 'orphan', 'offend'], category: 'adverb' },
      { text: 'forget', correct: 'forget', distractors: ['forgive', 'forged', 'forgot', 'forket', 'regret'], category: 'verb' },
      { text: 'keys', correct: 'keys', distractors: ['keas', 'kegs', 'bees', 'fees', 'tees'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_43',
    english: 'Do we pay taxes?',
    russian: 'Мы платим налоги?',
    ukrainian: 'Ми платимо податки?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'due', 'dew', 'dot'], category: 'verb' },
      { text: 'we', correct: 'we', distractors: ['me', 'he', 'be', 'see', 'fee'], category: 'pronoun' },
      { text: 'pay', correct: 'pay', distractors: ['paid', 'pays', 'bay', 'say', 'day'], category: 'verb' },
      { text: 'taxes', correct: 'taxes', distractors: ['faxes', 'waxes', 'takes', 'taxis', 'taxed'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_44',
    english: 'Does she look for a job?',
    russian: 'Она ищет работу?',
    ukrainian: 'Вона шукає роботу?',
    words: [
      { text: 'Does', correct: 'Does', distractors: ['do', 'did', 'dose', 'done', 'dotes'], category: 'verb' },
      { text: 'she', correct: 'she', distractors: ['her', 'he', 'see', 'shy', 'shea'], category: 'pronoun' },
      { text: 'look', correct: 'look', distractors: ['cook', 'book', 'hook', 'lock', 'loom'], category: 'verb' },
      { text: 'for', correct: 'for', distractors: ['from', 'far', 'fore', 'four', 'fort'], category: 'preposition' },
      { text: 'a', correct: 'a', distractors: ['an', 'the', 'at', 'as', 'and'], category: 'article' },
      { text: 'job', correct: 'job', distractors: ['jot', 'jog', 'sob', 'mob', 'rob'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_45',
    english: 'Do they sell vegetables?',
    russian: 'Они продают овощи?',
    ukrainian: 'Вони продають овочі?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'doth', 'due', 'doe'], category: 'verb' },
      { text: 'they', correct: 'they', distractors: ['them', 'the', 'then', 'there', 'these'], category: 'pronoun' },
      { text: 'sell', correct: 'sell', distractors: ['sold', 'bell', 'cell', 'fell', 'tell'], category: 'verb' },
      { text: 'vegetables', correct: 'vegetables', distractors: ['vegetable', 'veggies', 'vegetbles', 'vegitables', 'vegetalbes'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_46',
    english: 'Do I sleep enough?',
    russian: 'Я достаточно сплю?',
    ukrainian: 'Чи я достатньо сплю?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'dew', 'due', 'dot'], category: 'verb' },
      { text: 'I', correct: 'I', distractors: ['me', 'my', 'it', 'in', 'if'], category: 'pronoun' },
      { text: 'sleep', correct: 'sleep', distractors: ['slept', 'seep', 'sweep', 'steep', 'creep'], category: 'verb' },
      { text: 'enough', correct: 'enough', distractors: ['rough', 'tough', 'cough', 'dough', 'enuff'], category: 'adverb' },
    ],
  },
  {
    id: 'lesson5_phrase_47',
    english: 'Do we book a room?',
    russian: 'Мы бронируем номер?',
    ukrainian: 'Ми бронюємо номер?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'doe', 'due', 'dew'], category: 'verb' },
      { text: 'we', correct: 'we', distractors: ['me', 'he', 'be', 'fee', 'sea'], category: 'pronoun' },
      { text: 'book', correct: 'book', distractors: ['look', 'hook', 'took', 'boot', 'rook'], category: 'verb' },
      { text: 'a', correct: 'a', distractors: ['an', 'the', 'at', 'and', 'ace'], category: 'article' },
      { text: 'room', correct: 'room', distractors: ['boom', 'doom', 'zoom', 'loom', 'roam'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_48',
    english: 'Does he find mistakes?',
    russian: 'Он находит ошибки?',
    ukrainian: 'Він знаходить помилки?',
    words: [
      { text: 'Does', correct: 'Does', distractors: ['do', 'did', 'dose', 'done', 'doss'], category: 'verb' },
      { text: 'he', correct: 'he', distractors: ['his', 'her', 'hey', 'hit', 'hi'], category: 'pronoun' },
      { text: 'find', correct: 'find', distractors: ['mind', 'kind', 'bind', 'fine', 'fond'], category: 'verb' },
      { text: 'mistakes', correct: 'mistakes', distractors: ['mistaken', 'milkshakes', 'mikstakes', 'misttakes', 'misstakes'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_49',
    english: 'Does she often cook dinner?',
    russian: 'Она часто готовит ужин?',
    ukrainian: 'Вона часто готує вечерю?',
    words: [
      { text: 'Does', correct: 'Does', distractors: ['do', 'did', 'dose', 'done', 'dotes'], category: 'verb' },
      { text: 'she', correct: 'she', distractors: ['her', 'he', 'see', 'shy', 'shea'], category: 'pronoun' },
      { text: 'often', correct: 'often', distractors: ['open', 'offer', 'oven', 'soften', 'orphan'], category: 'adverb' },
      { text: 'cook', correct: 'cook', distractors: ['look', 'book', 'hook', 'cool', 'cork'], category: 'verb' },
      { text: 'dinner', correct: 'dinner', distractors: ['diner', 'inner', 'winner', 'thinner', 'sinned'], category: 'noun' },
    ],
  },
  {
    id: 'lesson5_phrase_50',
    english: 'Do they hear us?',
    russian: 'Они слышат нас?',
    ukrainian: 'Вони чують нас?',
    words: [
      { text: 'Do', correct: 'Do', distractors: ['does', 'did', 'doth', 'due', 'doe'], category: 'verb' },
      { text: 'they', correct: 'they', distractors: ['them', 'the', 'then', 'there', 'these'], category: 'pronoun' },
      { text: 'hear', correct: 'hear', distractors: ['here', 'fear', 'year', 'near', 'heat'], category: 'verb' },
      { text: 'us', correct: 'us', distractors: ['as', 'is', 'bus', 'fuss', 'thus'], category: 'pronoun' },
    ],
  },
];

// ==================== LESSON 6 ====================

export const LESSON_6_ENCOURAGEMENT_SCREENS: LessonIntroScreen[] = [];

// ==================== LESSON 7 ====================

export const LESSON_7_ENCOURAGEMENT_SCREENS: LessonIntroScreen[] = [];/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
