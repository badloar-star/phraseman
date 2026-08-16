// зачем: владелец отменил мою переписку курса «по коммуникативному исходу» и вернул
// эталон — метод из app/lesson_data_*: фраза + разбор по словам + обоснованные
// дистракторы. Здесь ИСТОЧНИК контента (человекочитаемый, компактный), из которого
// билдер разворачивает валидный session shard: 8 локалей, 12 карточек, интро-модал.
//
// Жёсткие запреты владельца (2026-08-15), проверяются гейтом content_ban_gate_v1:
//   • «I am from <страна>» — мёртвая учебниковая формула;
//   • «My name is Anna» — то же самое;
//   • «How do you do» — в живом английском не говорят.
// Каждая фраза самостоятельна: НЕ реплика диалога и НЕ продолжение предыдущей.

/** Разбор одного слова фразы — как в эталоне app/lesson_data_*. */
export interface EpisodeSourceWord {
  /** Правильное слово в этой позиции. */
  readonly correct: string;
  /**
   * Неверные варианты. В отличие от эталона здесь у каждого есть причина:
   * рантайм показывает её в errorExplanation, а не молча засчитывает ошибку.
   */
  readonly distractors: readonly EpisodeSourceDistractor[];
  /** Грамматическая роль: 'pronoun', 'to-be', 'adverb', ... */
  readonly category: string;
}

export interface EpisodeSourceDistractor {
  readonly value: string;
  /** Машинный код причины — попадает в rejectedAnswers.reasonCode. */
  readonly reasonCode: string;
  /** Человеческое объяснение на русском: почему так нельзя. */
  readonly why: string;
}

export interface EpisodeSourcePhrase {
  readonly id: string;
  readonly english: string;
  readonly russian: string;
  /**
   * Почему эта фраза живая и когда её реально говорят. Владелец требует
   * объяснение к каждой фразе, а не голый перевод.
   */
  readonly explanation: string;
  readonly words: readonly EpisodeSourceWord[];
  /** Грамматические признаки для валидатора и покрытия целей. */
  readonly features: readonly string[];
}

/**
 * Эпизод 1 «Hello, I'm…», сессия 1 — самое начало, ученик не знает ничего.
 * Порядок по docs/v2/03: can-do «поздороваться, назвать себя, завершить знакомство».
 *
 * Сессия 1 берёт ТОЛЬКО глагол to be в первом лице и приветствие: девять
 * практических карточек не должны требовать того, что ещё не показано в интро.
 */
export const EPISODE_01_SESSION_01_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze([
    {
      id: 'e01-s01-hi',
      english: 'Hi',
      russian: 'Привет',
      explanation:
        'Самое обычное приветствие в английском. Годится и для незнакомого человека, и для друга, и в переписке. «Hello» звучит чуть официальнее, «Hi» — нейтрально и уместно почти всегда.',
      words: [
        {
          correct: 'Hi',
          category: 'greeting',
          distractors: [
            {
              value: 'Hy',
              reasonCode: 'spelling_invalid',
              why: 'Такого слова нет: приветствие пишется через i — Hi.',
            },
            {
              value: 'High',
              reasonCode: 'homophone_confusion',
              why: 'Звучит так же, но означает «высокий». Приветствие — Hi.',
            },
            {
              value: 'He',
              reasonCode: 'wrong_word_class',
              why: 'He — это «он», местоимение, а не приветствие.',
            },
            {
              value: 'Hit',
              reasonCode: 'wrong_word_class',
              why: 'Hit — «ударить». Одна лишняя буква меняет смысл полностью.',
            },
            {
              value: 'Hei',
              reasonCode: 'spelling_invalid',
              why: 'Это норвежское приветствие, в английском так не пишут.',
            },
          ],
        },
      ],
      features: ['greeting', 'single_word_utterance'],
    },
    {
      id: 'e01-s01-i-am-here',
      english: 'I am here',
      russian: 'Я здесь',
      explanation:
        'Первая полная фраза: «я» + глагол-связка + место. В русском связки нет — мы говорим «я здесь». В английском она обязательна: без am предложение разваливается.',
      words: [
        {
          correct: 'I',
          category: 'pronoun',
          distractors: [
            {
              value: 'me',
              reasonCode: 'object_pronoun_as_subject',
              why: 'Me — форма дополнения («мне», «меня»). Подлежащее всегда I.',
            },
            {
              value: 'my',
              reasonCode: 'possessive_as_subject',
              why: 'My — «мой», указывает на принадлежность, а не на того, кто действует.',
            },
            {
              value: 'mine',
              reasonCode: 'possessive_as_subject',
              why: 'Mine — «моё» без существительного. Подлежащим быть не может.',
            },
            {
              value: 'am',
              reasonCode: 'verb_as_subject',
              why: 'Am — это глагол. Начинать утверждение с него нельзя.',
            },
            {
              value: 'i',
              reasonCode: 'capitalization_invalid',
              why: 'Английское «я» всегда пишется с большой буквы — I, где бы ни стояло.',
            },
          ],
        },
        {
          correct: 'am',
          category: 'to-be',
          distractors: [
            {
              value: 'is',
              reasonCode: 'agreement_person_mismatch',
              why: 'Is идёт к he, she, it. К I — только am.',
            },
            {
              value: 'are',
              reasonCode: 'agreement_person_mismatch',
              why: 'Are идёт к you, we, they. К I — только am.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Be — начальная форма. В готовом предложении нужна личная: am.',
            },
            {
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — прошедшее время, «был». Здесь речь про сейчас.',
            },
            {
              value: 'im',
              reasonCode: 'contraction_malformed',
              why: 'Сокращение пишется с апострофом: I’m. Без него это не слово.',
            },
          ],
        },
        {
          correct: 'here',
          category: 'adverb',
          distractors: [
            {
              value: 'hear',
              reasonCode: 'homophone_confusion',
              why: 'Звучит одинаково, но hear — «слышать». Место — here.',
            },
            {
              value: 'there',
              reasonCode: 'deixis_opposite',
              why: 'There — «там», противоположное направление.',
            },
            {
              value: 'her',
              reasonCode: 'wrong_word_class',
              why: 'Her — «её». Не указывает на место.',
            },
            {
              value: 'where',
              reasonCode: 'question_word_in_statement',
              why: 'Where — вопросительное «где». В утверждении не стоит.',
            },
            {
              value: 'hair',
              reasonCode: 'near_homophone_confusion',
              why: 'Hair — «волосы». Похоже на слух, смысл другой.',
            },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'adverb_place'],
    },
    {
      id: 'e01-s01-i-am-ready',
      english: 'I am ready',
      russian: 'Я готов',
      explanation:
        'Та же опора «I am», но дальше идёт признак, а не место. Живая фраза: так отвечают, когда можно начинать — перед выходом, звонком, игрой.',
      words: [
        {
          correct: 'I',
          category: 'pronoun',
          distractors: [
            {
              value: 'me',
              reasonCode: 'object_pronoun_as_subject',
              why: 'Me не бывает подлежащим — только I.',
            },
            {
              value: 'my',
              reasonCode: 'possessive_as_subject',
              why: 'My — «мой», это не тот, кто готов.',
            },
            {
              value: 'am',
              reasonCode: 'verb_as_subject',
              why: 'Глагол не может стоять первым в утверждении.',
            },
            {
              value: 'mine',
              reasonCode: 'possessive_as_subject',
              why: 'Mine заменяет предмет, а не человека-подлежащее.',
            },
            {
              value: 'i',
              reasonCode: 'capitalization_invalid',
              why: 'I всегда заглавная.',
            },
          ],
        },
        {
          correct: 'am',
          category: 'to-be',
          distractors: [
            {
              value: 'is',
              reasonCode: 'agreement_person_mismatch',
              why: 'К I никогда не ставят is.',
            },
            {
              value: 'are',
              reasonCode: 'agreement_person_mismatch',
              why: 'Are — для you, we, they.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Be — словарная форма, в предложении нужна am.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'Do не соединяет подлежащее с признаком.',
            },
            {
              value: 'have',
              reasonCode: 'wrong_auxiliary',
              why: 'Have — «иметь». Готовность выражают через быть, а не иметь.',
            },
          ],
        },
        {
          correct: 'ready',
          category: 'adjective',
          distractors: [
            {
              value: 'read',
              reasonCode: 'near_homophone_confusion',
              why: 'Read — «читать». Похоже на письме, смысл другой.',
            },
            {
              value: 'red',
              reasonCode: 'near_homophone_confusion',
              why: 'Red — «красный».',
            },
            {
              value: 'already',
              reasonCode: 'wrong_word_class',
              why: 'Already — «уже», это про время, а не про готовность.',
            },
            {
              value: 'readily',
              reasonCode: 'wrong_word_class',
              why: 'Readily — наречие «охотно». После am нужен признак: ready.',
            },
            {
              value: 'reader',
              reasonCode: 'wrong_word_class',
              why: 'Reader — «читатель», существительное.',
            },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'adjective_predicate'],
    },
    {
      id: 'e01-s01-i-am-tired',
      english: 'I am tired',
      russian: 'Я устал',
      explanation:
        'Одна из самых частых фраз о состоянии. В английском устаёшь «быть уставшим»: I am tired, а не «я устал» через действие. Работает и для мужчины, и для женщины — форма не меняется.',
      words: [
        {
          correct: 'I',
          category: 'pronoun',
          distractors: [
            {
              value: 'me',
              reasonCode: 'object_pronoun_as_subject',
              why: 'Подлежащее — I, не me.',
            },
            {
              value: 'my',
              reasonCode: 'possessive_as_subject',
              why: 'My — принадлежность, не деятель.',
            },
            {
              value: 'am',
              reasonCode: 'verb_as_subject',
              why: 'С глагола утверждение не начинают.',
            },
            {
              value: 'i',
              reasonCode: 'capitalization_invalid',
              why: 'Всегда заглавная I.',
            },
            {
              value: 'mine',
              reasonCode: 'possessive_as_subject',
              why: 'Mine не обозначает человека.',
            },
          ],
        },
        {
          correct: 'am',
          category: 'to-be',
          distractors: [
            {
              value: 'is',
              reasonCode: 'agreement_person_mismatch',
              why: 'Is — только к he, she, it.',
            },
            {
              value: 'are',
              reasonCode: 'agreement_person_mismatch',
              why: 'Are — к you, we, they.',
            },
            {
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — про прошлое. Устал сейчас — am.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма, а не be.',
            },
            {
              value: 'feel',
              reasonCode: 'wrong_verb_choice',
              why: 'Feel tired тоже говорят, но здесь тренируем связку am.',
            },
          ],
        },
        {
          correct: 'tired',
          category: 'adjective',
          distractors: [
            {
              value: 'tire',
              reasonCode: 'wrong_word_class',
              why: 'Tire — «шина» или «утомлять». Признак — tired.',
            },
            {
              value: 'tried',
              reasonCode: 'letter_order_confusion',
              why: 'Tried — «пробовал». Буквы те же, порядок другой.',
            },
            {
              value: 'tiring',
              reasonCode: 'participle_direction_wrong',
              why: 'Tiring — «утомительный», о том, что утомляет других. Устал сам — tired.',
            },
            {
              value: 'tiredly',
              reasonCode: 'wrong_word_class',
              why: 'Наречие. После am ставят признак, а не наречие.',
            },
            {
              value: 'tender',
              reasonCode: 'meaning_mismatch',
              why: 'Tender — «нежный», совсем другое значение.',
            },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'state_adjective'],
    },
    {
      id: 'e01-s01-i-am-ok',
      english: 'I am OK',
      russian: 'Я в порядке',
      explanation:
        'Так отвечают, когда спрашивают, всё ли хорошо. Короткий honest-ответ, живее книжного «I am fine, thank you». OK пишут заглавными или okay — оба варианта нормальны.',
      words: [
        {
          correct: 'I',
          category: 'pronoun',
          distractors: [
            {
              value: 'me',
              reasonCode: 'object_pronoun_as_subject',
              why: 'Только I может быть подлежащим.',
            },
            {
              value: 'my',
              reasonCode: 'possessive_as_subject',
              why: 'My — «мой».',
            },
            {
              value: 'i',
              reasonCode: 'capitalization_invalid',
              why: 'Пишется заглавной.',
            },
            {
              value: 'am',
              reasonCode: 'verb_as_subject',
              why: 'Это глагол, не подлежащее.',
            },
            {
              value: 'we',
              reasonCode: 'person_mismatch',
              why: 'We — «мы», речь об одном человеке.',
            },
          ],
        },
        {
          correct: 'am',
          category: 'to-be',
          distractors: [
            {
              value: 'is',
              reasonCode: 'agreement_person_mismatch',
              why: 'К I не ставят is.',
            },
            {
              value: 'are',
              reasonCode: 'agreement_person_mismatch',
              why: 'Are — не для I.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Be — начальная форма.',
            },
            {
              value: 'am not',
              reasonCode: 'polarity_inverted',
              why: 'Это отрицание — «я не в порядке». Смысл противоположный.',
            },
            {
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — «был», а речь про сейчас.',
            },
          ],
        },
        {
          correct: 'OK',
          category: 'adjective',
          distractors: [
            {
              value: 'okey',
              reasonCode: 'spelling_invalid',
              why: 'Такого написания нет: OK или okay.',
            },
            {
              value: 'ok?',
              reasonCode: 'punctuation_changes_intent',
              why: 'Со знаком вопроса это уже вопрос, а не ответ.',
            },
            {
              value: 'good',
              reasonCode: 'not_target_word',
              why: 'I am good тоже говорят, но здесь тренируем OK.',
            },
            {
              value: 'okays',
              reasonCode: 'wrong_word_class',
              why: 'Признак не получает окончание множественного числа.',
            },
            {
              value: 'oky',
              reasonCode: 'spelling_invalid',
              why: 'Ошибка в написании.',
            },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'state_adjective'],
    },
    {
      id: 'e01-s01-i-am-not-sure',
      english: 'I am not sure',
      russian: 'Я не уверен',
      explanation:
        'Первое отрицание. Not ставится сразу после am — это единственное место. Фраза выручает постоянно: так честно говорят, когда не знают ответа.',
      words: [
        {
          correct: 'I',
          category: 'pronoun',
          distractors: [
            {
              value: 'me',
              reasonCode: 'object_pronoun_as_subject',
              why: 'Подлежащее — I.',
            },
            {
              value: 'my',
              reasonCode: 'possessive_as_subject',
              why: 'My — «мой».',
            },
            {
              value: 'i',
              reasonCode: 'capitalization_invalid',
              why: 'Только заглавная I.',
            },
            {
              value: 'not',
              reasonCode: 'negator_as_subject',
              why: 'Not — частица отрицания, не подлежащее.',
            },
            {
              value: 'mine',
              reasonCode: 'possessive_as_subject',
              why: 'Mine не называет человека.',
            },
          ],
        },
        {
          correct: 'am',
          category: 'to-be',
          distractors: [
            {
              value: 'is',
              reasonCode: 'agreement_person_mismatch',
              why: 'Is не сочетается с I.',
            },
            {
              value: 'are',
              reasonCode: 'agreement_person_mismatch',
              why: 'Are не сочетается с I.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'С признаком отрицают через am not, а не do not.',
            },
            {
              value: 'don’t',
              reasonCode: 'wrong_auxiliary',
              why: 'I don’t sure — грубая ошибка: sure не глагол.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
          ],
        },
        {
          correct: 'not',
          category: 'negation',
          distractors: [
            {
              value: 'no',
              reasonCode: 'negator_type_mismatch',
              why: 'No отрицает существительное. Глагол отрицают через not.',
            },
            {
              value: 'don’t',
              reasonCode: 'wrong_auxiliary',
              why: 'При am вспомогательный do не нужен.',
            },
            {
              value: 'never',
              reasonCode: 'meaning_mismatch',
              why: 'Never — «никогда», это про частоту.',
            },
            {
              value: 'nor',
              reasonCode: 'wrong_word_class',
              why: 'Nor соединяет два отрицания, здесь оно одно.',
            },
            {
              value: 'note',
              reasonCode: 'near_homophone_confusion',
              why: 'Note — «заметка».',
            },
          ],
        },
        {
          correct: 'sure',
          category: 'adjective',
          distractors: [
            {
              value: 'sur',
              reasonCode: 'spelling_invalid',
              why: 'В английском такого слова нет.',
            },
            {
              value: 'shore',
              reasonCode: 'near_homophone_confusion',
              why: 'Shore — «берег».',
            },
            {
              value: 'surely',
              reasonCode: 'wrong_word_class',
              why: 'Surely — наречие «конечно». После am нужен признак.',
            },
            {
              value: 'sugar',
              reasonCode: 'meaning_mismatch',
              why: 'Похожее начало, но это «сахар».',
            },
            {
              value: 'sore',
              reasonCode: 'near_homophone_confusion',
              why: 'Sore — «болезненный».',
            },
          ],
        },
      ],
      features: [
        'copula_be',
        'first_person_singular',
        'negation_not',
        'state_adjective',
      ],
    },
    {
      id: 'e01-s01-thank-you',
      english: 'Thank you',
      russian: 'Спасибо',
      explanation:
        'Самая частая вежливая фраза английского. Дословно «благодарю тебя», но воспринимается одним куском — так и запоминают. «Thanks» короче и чуть неформальнее.',
      words: [
        {
          correct: 'Thank',
          category: 'verb',
          distractors: [
            {
              value: 'Thanks',
              reasonCode: 'form_mismatch_in_phrase',
              why: 'Thanks говорят отдельно. Внутри Thank you — без s.',
            },
            {
              value: 'Think',
              reasonCode: 'near_homophone_confusion',
              why: 'Think — «думать». Одна буква меняет всё.',
            },
            {
              value: 'Thank’s',
              reasonCode: 'apostrophe_misuse',
              why: 'Апостроф здесь не нужен — это не принадлежность.',
            },
            {
              value: 'Tank',
              reasonCode: 'near_homophone_confusion',
              why: 'Tank — «бак», «танк».',
            },
            {
              value: 'Thanking',
              reasonCode: 'wrong_word_form',
              why: 'Готовая формула вежливости — только Thank you.',
            },
          ],
        },
        {
          correct: 'you',
          category: 'pronoun',
          distractors: [
            {
              value: 'your',
              reasonCode: 'possessive_as_object',
              why: 'Your — «твой». Благодарят тебя, а не твоё.',
            },
            {
              value: 'u',
              reasonCode: 'chat_abbreviation',
              why: 'Так пишут только в быстрых сообщениях, это не литературная форма.',
            },
            {
              value: 'yours',
              reasonCode: 'possessive_as_object',
              why: 'Yours заменяет предмет, а не человека.',
            },
            {
              value: 'me',
              reasonCode: 'wrong_referent',
              why: 'Получилось бы «спасибо мне».',
            },
            {
              value: 'yo',
              reasonCode: 'spelling_invalid',
              why: 'Не слово английского языка в этом значении.',
            },
          ],
        },
      ],
      features: ['fixed_expression', 'politeness'],
    },
    {
      id: 'e01-s01-see-you-later',
      english: 'See you later',
      russian: 'До встречи',
      explanation:
        'Обычное прощание, когда человека ещё увидишь. Живее книжного «Goodbye», которое звучит суховато и окончательно. Часто сокращают до «See you».',
      words: [
        {
          correct: 'See',
          category: 'verb',
          distractors: [
            {
              value: 'Sea',
              reasonCode: 'homophone_confusion',
              why: 'Sea — «море». Звучит одинаково.',
            },
            {
              value: 'Seen',
              reasonCode: 'wrong_word_form',
              why: 'Seen — третья форма, отдельно так не прощаются.',
            },
            {
              value: 'Saw',
              reasonCode: 'tense_mismatch',
              why: 'Saw — прошедшее. Прощание смотрит в будущее.',
            },
            {
              value: 'Say',
              reasonCode: 'meaning_mismatch',
              why: 'Say — «сказать».',
            },
            {
              value: 'Sit',
              reasonCode: 'meaning_mismatch',
              why: 'Sit — «сидеть».',
            },
          ],
        },
        {
          correct: 'you',
          category: 'pronoun',
          distractors: [
            {
              value: 'your',
              reasonCode: 'possessive_as_object',
              why: 'Увидят тебя, а не твоё.',
            },
            {
              value: 'yours',
              reasonCode: 'possessive_as_object',
              why: 'Yours заменяет предмет.',
            },
            {
              value: 'u',
              reasonCode: 'chat_abbreviation',
              why: 'Сокращение из переписки.',
            },
            {
              value: 'me',
              reasonCode: 'wrong_referent',
              why: 'Смысл переворачивается.',
            },
            {
              value: 'him',
              reasonCode: 'wrong_referent',
              why: 'Прощаются с собеседником, а не с третьим лицом.',
            },
          ],
        },
        {
          correct: 'later',
          category: 'adverb',
          distractors: [
            {
              value: 'late',
              reasonCode: 'wrong_word_form',
              why: 'Late — «поздно». Нужно «позже» — later.',
            },
            {
              value: 'latter',
              reasonCode: 'near_homophone_confusion',
              why: 'Latter — «последний из двух».',
            },
            {
              value: 'letter',
              reasonCode: 'near_homophone_confusion',
              why: 'Letter — «письмо», «буква».',
            },
            {
              value: 'lately',
              reasonCode: 'meaning_mismatch',
              why: 'Lately — «в последнее время», это про прошлое.',
            },
            {
              value: 'latest',
              reasonCode: 'wrong_word_form',
              why: 'Latest — «самый свежий».',
            },
          ],
        },
      ],
      features: ['fixed_expression', 'farewell', 'adverb_time'],
    },
    {
      id: 'e01-s01-nice-to-meet-you',
      english: 'Nice to meet you',
      russian: 'Приятно познакомиться',
      explanation:
        'Живая формула при знакомстве — именно её говорят вместо мёртвого «How do you do», которое сегодня звучит как из старого учебника. Произносят один раз, при первой встрече.',
      words: [
        {
          correct: 'Nice',
          category: 'adjective',
          distractors: [
            {
              value: 'Nise',
              reasonCode: 'spelling_invalid',
              why: 'Ошибка в написании.',
            },
            {
              value: 'Niece',
              reasonCode: 'near_homophone_confusion',
              why: 'Niece — «племянница».',
            },
            {
              value: 'Nicely',
              reasonCode: 'wrong_word_class',
              why: 'Наречие. В этой формуле — признак nice.',
            },
            {
              value: 'Ice',
              reasonCode: 'meaning_mismatch',
              why: 'Ice — «лёд».',
            },
            {
              value: 'Nine',
              reasonCode: 'near_homophone_confusion',
              why: 'Nine — «девять».',
            },
          ],
        },
        {
          correct: 'to',
          category: 'infinitive-marker',
          distractors: [
            {
              value: 'too',
              reasonCode: 'homophone_confusion',
              why: 'Too — «слишком» или «тоже». Перед глаголом нужна частица to.',
            },
            {
              value: 'two',
              reasonCode: 'homophone_confusion',
              why: 'Two — «два».',
            },
            {
              value: 'for',
              reasonCode: 'wrong_preposition',
              why: 'Перед глаголом в этой формуле стоит to.',
            },
            {
              value: 'at',
              reasonCode: 'wrong_preposition',
              why: 'At указывает на место или время.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_word_class',
              why: 'Do — глагол, а нужна частица.',
            },
          ],
        },
        {
          correct: 'meet',
          category: 'verb',
          distractors: [
            {
              value: 'meat',
              reasonCode: 'homophone_confusion',
              why: 'Meat — «мясо». Звучит одинаково.',
            },
            {
              value: 'met',
              reasonCode: 'tense_mismatch',
              why: 'Met — прошедшее. После to — начальная форма.',
            },
            {
              value: 'meets',
              reasonCode: 'agreement_after_infinitive',
              why: 'После to окончание -s не ставят.',
            },
            {
              value: 'meeting',
              reasonCode: 'wrong_word_form',
              why: 'После to нужна начальная форма, не -ing.',
            },
            {
              value: 'mean',
              reasonCode: 'meaning_mismatch',
              why: 'Mean — «значить».',
            },
          ],
        },
        {
          correct: 'you',
          category: 'pronoun',
          distractors: [
            {
              value: 'your',
              reasonCode: 'possessive_as_object',
              why: 'Знакомятся с тобой, а не с твоим.',
            },
            {
              value: 'yours',
              reasonCode: 'possessive_as_object',
              why: 'Yours заменяет предмет.',
            },
            {
              value: 'u',
              reasonCode: 'chat_abbreviation',
              why: 'Форма из переписки.',
            },
            {
              value: 'me',
              reasonCode: 'wrong_referent',
              why: 'Получится «приятно познакомиться со мной».',
            },
            {
              value: 'they',
              reasonCode: 'wrong_referent',
              why: 'They — «они», речь о собеседнике.',
            },
          ],
        },
      ],
      features: ['fixed_expression', 'infinitive_marker', 'politeness'],
    },
    {
      id: 'e01-s01-i-am-happy',
      english: 'I am happy',
      russian: 'Я рад',
      explanation:
        'Ещё один признак после «I am». Форма слова не зависит от того, мужчина говорит или женщина, — в английском признаки не меняются по родам.',
      words: [
        {
          correct: 'I',
          category: 'pronoun',
          distractors: [
            {
              value: 'me',
              reasonCode: 'object_pronoun_as_subject',
              why: 'Подлежащее — только I.',
            },
            {
              value: 'my',
              reasonCode: 'possessive_as_subject',
              why: 'My — «мой».',
            },
            {
              value: 'i',
              reasonCode: 'capitalization_invalid',
              why: 'Пишется заглавной.',
            },
            {
              value: 'am',
              reasonCode: 'verb_as_subject',
              why: 'Это глагол.',
            },
            {
              value: 'he',
              reasonCode: 'person_mismatch',
              why: 'He — «он», а речь о себе.',
            },
          ],
        },
        {
          correct: 'am',
          category: 'to-be',
          distractors: [
            {
              value: 'is',
              reasonCode: 'agreement_person_mismatch',
              why: 'Is — не для I.',
            },
            {
              value: 'are',
              reasonCode: 'agreement_person_mismatch',
              why: 'Are — не для I.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'have',
              reasonCode: 'wrong_auxiliary',
              why: 'Радость выражают через быть, а не иметь.',
            },
            {
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — про прошлое.',
            },
          ],
        },
        {
          correct: 'happy',
          category: 'adjective',
          distractors: [
            {
              value: 'happily',
              reasonCode: 'wrong_word_class',
              why: 'Наречие «счастливо». После am — признак.',
            },
            {
              value: 'happiness',
              reasonCode: 'wrong_word_class',
              why: 'Существительное «счастье».',
            },
            {
              value: 'hapy',
              reasonCode: 'spelling_invalid',
              why: 'Пропущена буква: happy.',
            },
            {
              value: 'happier',
              reasonCode: 'wrong_word_form',
              why: 'Happier — «счастливее», нужно сравнение с чем-то.',
            },
            {
              value: 'hungry',
              reasonCode: 'meaning_mismatch',
              why: 'Hungry — «голодный».',
            },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'state_adjective'],
    },
    {
      id: 'e01-s01-good-morning',
      english: 'Good morning',
      russian: 'Доброе утро',
      explanation:
        'Приветствие до полудня. Дальше в ходу Good afternoon, а вечером Good evening. Обратите внимание: артикль не нужен, слова идут парой.',
      words: [
        {
          correct: 'Good',
          category: 'adjective',
          distractors: [
            {
              value: 'Well',
              reasonCode: 'wrong_word_class',
              why: 'Well — наречие «хорошо». В приветствии стоит good.',
            },
            {
              value: 'Goot',
              reasonCode: 'spelling_invalid',
              why: 'Ошибка в написании.',
            },
            {
              value: 'Nice',
              reasonCode: 'not_target_word',
              why: 'Nice morning так не говорят как приветствие.',
            },
            {
              value: 'Better',
              reasonCode: 'wrong_word_form',
              why: 'Better — «лучше», сравнение.',
            },
            {
              value: 'Goods',
              reasonCode: 'wrong_word_class',
              why: 'Goods — «товары».',
            },
          ],
        },
        {
          correct: 'morning',
          category: 'noun',
          distractors: [
            {
              value: 'mourning',
              reasonCode: 'homophone_confusion',
              why: 'Звучит одинаково, но значит «траур».',
            },
            {
              value: 'morninig',
              reasonCode: 'spelling_invalid',
              why: 'Перепутаны буквы.',
            },
            {
              value: 'mornings',
              reasonCode: 'wrong_word_form',
              why: 'В приветствии — единственное число.',
            },
            {
              value: 'moring',
              reasonCode: 'spelling_invalid',
              why: 'Пропущена буква n.',
            },
            {
              value: 'evening',
              reasonCode: 'meaning_mismatch',
              why: 'Evening — «вечер», другое время суток.',
            },
          ],
        },
      ],
      features: ['fixed_expression', 'greeting', 'time_of_day'],
    },
    {
      id: 'e01-s01-i-am-a-student',
      english: 'I am a student',
      russian: 'Я студент',
      explanation:
        'Первое существительное после связки. В английском перед профессией или занятием обязателен артикль a — «я один из студентов». В русском такого слова нет, и его чаще всего забывают.',
      words: [
        {
          correct: 'I',
          category: 'pronoun',
          distractors: [
            {
              value: 'me',
              reasonCode: 'object_pronoun_as_subject',
              why: 'Подлежащее — I.',
            },
            {
              value: 'my',
              reasonCode: 'possessive_as_subject',
              why: 'My — «мой».',
            },
            {
              value: 'i',
              reasonCode: 'capitalization_invalid',
              why: 'Заглавная I.',
            },
            {
              value: 'mine',
              reasonCode: 'possessive_as_subject',
              why: 'Mine не называет человека.',
            },
            {
              value: 'am',
              reasonCode: 'verb_as_subject',
              why: 'Глагол не бывает первым в утверждении.',
            },
          ],
        },
        {
          correct: 'am',
          category: 'to-be',
          distractors: [
            {
              value: 'is',
              reasonCode: 'agreement_person_mismatch',
              why: 'Is — для he, she, it.',
            },
            {
              value: 'are',
              reasonCode: 'agreement_person_mismatch',
              why: 'Are — для you, we, they.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'have',
              reasonCode: 'wrong_auxiliary',
              why: 'Профессию называют через быть.',
            },
            {
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — «был».',
            },
          ],
        },
        {
          correct: 'a',
          category: 'article',
          distractors: [
            {
              value: 'an',
              reasonCode: 'article_form_mismatch',
              why: 'An ставят перед гласным звуком. Student начинается со звука «с».',
            },
            {
              value: 'the',
              reasonCode: 'article_definiteness_wrong',
              why: 'The указывает на конкретного, известного. Здесь — один из многих.',
            },
            {
              value: 'one',
              reasonCode: 'numeral_instead_of_article',
              why: 'One — число «один», а нужен артикль.',
            },
            {
              value: 'my',
              reasonCode: 'possessive_instead_of_article',
              why: 'My student — «мой студент», другой смысл.',
            },
            {
              value: 'some',
              reasonCode: 'quantifier_instead_of_article',
              why: 'Some — «несколько», с одним человеком не сочетается.',
            },
          ],
        },
        {
          correct: 'student',
          category: 'noun',
          distractors: [
            {
              value: 'students',
              reasonCode: 'number_mismatch',
              why: 'После a всегда единственное число.',
            },
            {
              value: 'studend',
              reasonCode: 'spelling_invalid',
              why: 'Ошибка в написании.',
            },
            {
              value: 'study',
              reasonCode: 'wrong_word_class',
              why: 'Study — «учиться», глагол.',
            },
            {
              value: 'studying',
              reasonCode: 'wrong_word_form',
              why: 'После артикля нужно существительное.',
            },
            {
              value: 'stundent',
              reasonCode: 'spelling_invalid',
              why: 'Переставлены буквы.',
            },
          ],
        },
      ],
      features: [
        'copula_be',
        'first_person_singular',
        'indefinite_article',
        'noun_predicate',
      ],
    },
  ]);
