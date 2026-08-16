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
 * зачем ТОЛЬКО «I am»: агент-новичок прошёл первую версию этой сессии и показал
 * дыру — интро объясняет три страницы про связку, а половина карточек требовала
 * приветствий и артикля, которых до задания никто не объяснял. Правило из
 * подсказки приходит ПОСЛЕ ответа, то есть ученик угадывает. Поэтому сессия 1
 * держит одну тему: «I + am + признак/место». Вежливые формулы (Hi, Thank you,
 * See you later, Nice to meet you, Good morning) и артикль a вынесены в сессию 2
 * со своим интро.
 */
export const EPISODE_01_SESSION_01_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze([
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
      id: 'e01-s01-i-am-cold',
      english: 'I am cold',
      russian: 'Мне холодно',
      explanation:
        'Обратите внимание на разницу: по-русски «мне холодно», по-английски «я холодный». Англичанин делает себя подлежащим, а не тем, кому холодно.',
      words: [
        {
          correct: 'I',
          category: 'pronoun',
          distractors: [
            {
              value: 'me',
              reasonCode: 'object_pronoun_as_subject',
              why: 'Соблазн сказать «мне» велик, но подлежащее — I.',
            },
            {
              value: 'my',
              reasonCode: 'possessive_as_subject',
              why: 'My — «мой», это принадлежность, а не тот, о ком речь.',
            },
            {
              value: 'i',
              reasonCode: 'capitalization_invalid',
              why: 'Английское «я» всегда пишется заглавной буквой — I.',
            },
            {
              value: 'mine',
              reasonCode: 'possessive_as_subject',
              why: 'Mine не называет человека.',
            },
            {
              value: 'am',
              reasonCode: 'verb_as_subject',
              why: 'Am — глагол-связка, а на этом месте нужно слово-подлежащее.',
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
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — про прошлое.',
            },
            {
              value: 'feel',
              reasonCode: 'wrong_verb_choice',
              why: 'Здесь тренируем связку am.',
            },
          ],
        },
        {
          correct: 'cold',
          category: 'adjective',
          distractors: [
            {
              value: 'cool',
              reasonCode: 'meaning_mismatch',
              why: 'Cool — «прохладный» или «классный».',
            },
            {
              value: 'called',
              reasonCode: 'near_homophone_confusion',
              why: 'Called — «названный».',
            },
            {
              value: 'colder',
              reasonCode: 'wrong_word_form',
              why: 'Colder — «холоднее», нужно сравнение.',
            },
            {
              value: 'coldly',
              reasonCode: 'wrong_word_class',
              why: 'Наречие «холодно» о манере.',
            },
            {
              value: 'gold',
              reasonCode: 'near_homophone_confusion',
              why: 'Gold — «золото».',
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
              why: 'My — «мой», это принадлежность, а не тот, о ком речь.',
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
      id: 'e01-s01-i-am-hungry',
      english: 'I am hungry',
      russian: 'Я голоден',
      explanation:
        'В английском голод — это состояние, в котором ты находишься: «я есть голодный». Поэтому нужна связка am, а не глагол «хотеть».',
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
              why: 'My — «мой», это принадлежность, а не тот, о ком речь.',
            },
            {
              value: 'i',
              reasonCode: 'capitalization_invalid',
              why: 'Английское «я» всегда пишется заглавной буквой — I.',
            },
            {
              value: 'am',
              reasonCode: 'verb_as_subject',
              why: 'Это глагол, не подлежащее.',
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
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — про прошлое.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'Do не соединяет «я» с признаком.',
            },
          ],
        },
        {
          correct: 'hungry',
          category: 'adjective',
          distractors: [
            {
              value: 'hungery',
              reasonCode: 'spelling_invalid',
              why: 'Лишняя буква e.',
            },
            {
              value: 'angry',
              reasonCode: 'near_homophone_confusion',
              why: 'Angry — «злой». Отличается одной буквой.',
            },
            {
              value: 'hunger',
              reasonCode: 'wrong_word_class',
              why: 'Hunger — «голод», существительное.',
            },
            {
              value: 'hungrily',
              reasonCode: 'wrong_word_class',
              why: 'Наречие. После am ставят признак.',
            },
            {
              value: 'happy',
              reasonCode: 'meaning_mismatch',
              why: 'Happy — «рад», другое состояние.',
            },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'state_adjective'],
    },
    {
      id: 'e01-s01-i-am-not-late',
      english: 'I am not late',
      russian: 'Я не опаздываю',
      explanation:
        'Отрицание на уже знакомой фразе: not встаёт сразу после am, остальное не меняется. Так работает любое отрицание со связкой.',
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
              value: 'not',
              reasonCode: 'negator_as_subject',
              why: 'Not — частица, а не подлежащее.',
            },
            {
              value: 'my',
              reasonCode: 'possessive_as_subject',
              why: 'My — «мой», это принадлежность, а не тот, о ком речь.',
            },
            {
              value: 'i',
              reasonCode: 'capitalization_invalid',
              why: 'Английское «я» всегда пишется заглавной буквой — I.',
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
              why: 'Is ставят к he, she, it. Рядом с I всегда только am.',
            },
            {
              value: 'are',
              reasonCode: 'agreement_person_mismatch',
              why: 'Are — не для I.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'С признаком отрицают через am not.',
            },
            {
              value: 'don’t',
              reasonCode: 'wrong_auxiliary',
              why: 'Late — не действие, do здесь не нужен.',
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
              why: 'No отрицает существительное, глагол — not.',
            },
            {
              value: 'never',
              reasonCode: 'meaning_mismatch',
              why: 'Never — «никогда», про частоту.',
            },
            {
              value: 'don’t',
              reasonCode: 'wrong_auxiliary',
              why: 'При am вспомогательный do лишний.',
            },
            {
              value: 'nor',
              reasonCode: 'wrong_word_class',
              why: 'Nor соединяет два отрицания.',
            },
            {
              value: 'note',
              reasonCode: 'near_homophone_confusion',
              why: 'Note — «заметка».',
            },
          ],
        },
        {
          correct: 'late',
          category: 'adjective',
          distractors: [
            {
              value: 'later',
              reasonCode: 'wrong_word_form',
              why: 'Later — «позже».',
            },
            {
              value: 'lately',
              reasonCode: 'wrong_word_class',
              why: 'Lately — «в последнее время».',
            },
            {
              value: 'latest',
              reasonCode: 'wrong_word_form',
              why: 'Latest — «самый последний».',
            },
            {
              value: 'let',
              reasonCode: 'near_homophone_confusion',
              why: 'Let — «позволить».',
            },
            {
              value: 'lately’s',
              reasonCode: 'spelling_invalid',
              why: 'Такой формы не существует.',
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
              why: 'My — «мой», это принадлежность, а не тот, о ком речь.',
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
              why: 'My — «мой», это принадлежность, а не тот, о ком речь.',
            },
            {
              value: 'i',
              reasonCode: 'capitalization_invalid',
              why: 'Пишется заглавной.',
            },
            {
              value: 'am',
              reasonCode: 'verb_as_subject',
              why: 'Am — глагол-связка, а на этом месте нужно слово-подлежащее.',
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
              why: 'Is ставят к he, she, it. Рядом с I всегда только am.',
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
      id: 'e01-s01-i-am-not-ready',
      english: 'I am not ready',
      russian: 'Я не готов',
      explanation:
        'Третье отрицание подряд — правило закрепляется. Заметьте: порядок слов ни разу не поменялся, меняется только последнее слово.',
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
              value: 'not',
              reasonCode: 'negator_as_subject',
              why: 'Not не бывает подлежащим.',
            },
            {
              value: 'my',
              reasonCode: 'possessive_as_subject',
              why: 'My — «мой», это принадлежность, а не тот, о ком речь.',
            },
            {
              value: 'i',
              reasonCode: 'capitalization_invalid',
              why: 'Английское «я» всегда пишется заглавной буквой — I.',
            },
            {
              value: 'am',
              reasonCode: 'verb_as_subject',
              why: 'Am — глагол-связка, а на этом месте нужно слово-подлежащее.',
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
              why: 'Is ставят к he, she, it. Рядом с I всегда только am.',
            },
            {
              value: 'are',
              reasonCode: 'agreement_person_mismatch',
              why: 'Are — не для I.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'Ready — признак, do не нужен.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — прошедшее время «был», а здесь речь про сейчас.',
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
              why: 'No — для существительных.',
            },
            {
              value: 'don’t',
              reasonCode: 'wrong_auxiliary',
              why: 'При am do не ставят.',
            },
            {
              value: 'never',
              reasonCode: 'meaning_mismatch',
              why: 'Never — «никогда».',
            },
            {
              value: 'not a',
              reasonCode: 'extra_word',
              why: 'Перед признаком артикль не нужен.',
            },
            {
              value: 'nor',
              reasonCode: 'wrong_word_class',
              why: 'Nor соединяет отрицания.',
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
              why: 'Read — «читать».',
            },
            {
              value: 'already',
              reasonCode: 'wrong_word_class',
              why: 'Already — «уже».',
            },
            {
              value: 'readily',
              reasonCode: 'wrong_word_class',
              why: 'Наречие «охотно».',
            },
            {
              value: 'red',
              reasonCode: 'near_homophone_confusion',
              why: 'Red — «красный».',
            },
            {
              value: 'reader',
              reasonCode: 'wrong_word_class',
              why: 'Reader — «читатель».',
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
      id: 'e01-s01-i-am-late',
      english: 'I am late',
      russian: 'Я опаздываю',
      explanation:
        'Ещё одно состояние через связку. По-русски мы говорим действием — «опаздываю», по-английски признаком: «я есть поздний». Так предупреждают, что задерживаешься.',
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
              why: 'My — «мой», это принадлежность, а не тот, о ком речь.',
            },
            {
              value: 'i',
              reasonCode: 'capitalization_invalid',
              why: 'Английское «я» всегда пишется заглавной буквой — I.',
            },
            {
              value: 'am',
              reasonCode: 'verb_as_subject',
              why: 'Глагол не бывает подлежащим.',
            },
            {
              value: 'we',
              reasonCode: 'person_mismatch',
              why: 'We — «мы», речь об одном.',
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
              why: 'Is ставят к he, she, it. Рядом с I всегда только am.',
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
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — прошедшее время «был», а здесь речь про сейчас.',
            },
            {
              value: 'have',
              reasonCode: 'wrong_auxiliary',
              why: 'Состояние выражают через быть.',
            },
          ],
        },
        {
          correct: 'late',
          category: 'adjective',
          distractors: [
            {
              value: 'later',
              reasonCode: 'wrong_word_form',
              why: 'Later — «позже», сравнение.',
            },
            {
              value: 'lately',
              reasonCode: 'wrong_word_class',
              why: 'Lately — «в последнее время».',
            },
            {
              value: 'latest',
              reasonCode: 'wrong_word_form',
              why: 'Latest — «самый последний».',
            },
            {
              value: 'let',
              reasonCode: 'near_homophone_confusion',
              why: 'Let — «позволить».',
            },
            {
              value: 'light',
              reasonCode: 'meaning_mismatch',
              why: 'Light — «свет», «лёгкий».',
            },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'state_adjective'],
    },
    {
      id: 'e01-s01-i-am-busy',
      english: 'I am busy',
      russian: 'Я занят',
      explanation:
        'Вежливый способ сказать, что сейчас не получится поговорить. Форма одна и для мужчины, и для женщины.',
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
              why: 'My — «мой», это принадлежность, а не тот, о ком речь.',
            },
            {
              value: 'i',
              reasonCode: 'capitalization_invalid',
              why: 'Английское «я» всегда пишется заглавной буквой — I.',
            },
            {
              value: 'am',
              reasonCode: 'verb_as_subject',
              why: 'Am — глагол-связка, а на этом месте нужно слово-подлежащее.',
            },
            {
              value: 'he',
              reasonCode: 'person_mismatch',
              why: 'He — «он», а мы говорим о себе, поэтому нужно I.',
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
              why: 'Is ставят к he, she, it. Рядом с I всегда только am.',
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
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'Do с признаком не ставят.',
            },
            {
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — прошедшее время «был», а здесь речь про сейчас.',
            },
          ],
        },
        {
          correct: 'busy',
          category: 'adjective',
          distractors: [
            {
              value: 'bussy',
              reasonCode: 'spelling_invalid',
              why: 'Лишняя буква s: правильно пишется busy, с одной s.',
            },
            {
              value: 'business',
              reasonCode: 'wrong_word_class',
              why: 'Business — «дело», существительное.',
            },
            {
              value: 'busily',
              reasonCode: 'wrong_word_class',
              why: 'Busily — наречие «деловито». После am ставят признак.',
            },
            {
              value: 'buzy',
              reasonCode: 'spelling_invalid',
              why: 'Пишется через s: busy.',
            },
            {
              value: 'bored',
              reasonCode: 'meaning_mismatch',
              why: 'Bored — «скучающий», почти противоположное.',
            },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'state_adjective'],
    },
  ]);
