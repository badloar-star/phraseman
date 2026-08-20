// зачем: сессия 2 берёт то, что было вырезано из сессии 1 после прохода
// агента-новичка: вежливые формулы и артикль. Здесь у них СВОЁ интро, поэтому
// ученик встречает их уже объяснёнными, а не угадывает.
//
// Запреты владельца соблюдены: вместо «My name is Anna» — живое «I'm Anna»,
// вместо «I am from <страна>» — «I live in Madrid». См. episode_01_source_v1.ts.
import type { EpisodeSourcePhrase } from './episode_01_source_v1';

export const EPISODE_01_SESSION_02_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze([
    {
      id: 'e01-s02-thank-you',
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
      id: 'e01-s02-see-you-later',
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
      id: 'e01-s02-nice-to-meet-you',
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
      id: 'e01-s02-good-morning',
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
      id: 'e01-s02-i-am-a-student',
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
    {
      id: 'e01-s02-hi',
      english: 'Hi',
      russian: 'Привет',
      explanation:
        'Самое обычное приветствие. Годится и для незнакомого человека, и для друга, и в переписке. «Hello» звучит чуть официальнее, «Hi» уместно почти всегда.',
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
      id: 'e01-s02-i-am-anna',
      english: 'I am Anna',
      russian: 'Я Анна',
      explanation:
        'Так по-настоящему представляются: «I am Anna» или короче «I’m Anna». Книжное «My name is Anna» звучит как из старого учебника — живые люди так почти не говорят. Схема та же, что вы уже знаете: I am + слово, только теперь это имя.',
      words: [
        {
          correct: 'I',
          category: 'pronoun',
          distractors: [
            {
              value: 'me',
              reasonCode: 'object_pronoun_as_subject',
              why: 'Me — форма дополнения. Подлежащее всегда I.',
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
              why: 'Mine — «моё», человека не называет.',
            },
            {
              value: 'am',
              reasonCode: 'verb_as_subject',
              why: 'Am — глагол-связка, а на этом месте нужно подлежащее.',
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
              why: 'Are идёт к you, we, they. К I — только am.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Be — начальная форма, в предложении нужна личная: am.',
            },
            {
              value: 'name',
              reasonCode: 'wrong_word_class',
              why: 'Name — «имя». Связка здесь всё равно нужна.',
            },
            {
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — прошедшее «был», а вы представляетесь сейчас.',
            },
          ],
        },
        {
          correct: 'Anna',
          category: 'name',
          distractors: [
            {
              value: 'anna',
              reasonCode: 'capitalization_invalid',
              why: 'Имена в английском всегда с заглавной буквы.',
            },
            {
              value: 'Ana',
              reasonCode: 'spelling_invalid',
              why: 'Другое написание — другое имя.',
            },
            {
              value: 'Annas',
              reasonCode: 'number_mismatch',
              why: 'Имя не ставят во множественное число.',
            },
            {
              value: 'Anne',
              reasonCode: 'spelling_invalid',
              why: 'Anne — самостоятельное имя, не то же самое.',
            },
            {
              value: 'name',
              reasonCode: 'wrong_word_choice',
              why: 'Здесь называют само имя, а не слово «имя».',
            },
          ],
        },
      ],
      features: [
        'copula_be',
        'first_person_singular',
        'self_introduction',
        'proper_noun',
      ],
    },
    {
      id: 'e01-s02-i-live-in-madrid',
      english: 'I live in Madrid',
      russian: 'Я живу в Мадриде',
      explanation:
        'Так говорят о себе живые люди: называют город, а не страну. Обратите внимание — здесь НЕТ связки am, потому что live это уже действие. Связка нужна только там, где глагола нет.',
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
              why: 'My — «мой», это принадлежность.',
            },
            {
              value: 'i',
              reasonCode: 'capitalization_invalid',
              why: 'Английское «я» всегда пишется заглавной буквой — I.',
            },
            {
              value: 'mine',
              reasonCode: 'possessive_as_subject',
              why: 'Mine человека не называет.',
            },
            {
              value: 'we',
              reasonCode: 'person_mismatch',
              why: 'We — «мы», а речь об одном человеке.',
            },
          ],
        },
        {
          correct: 'live',
          category: 'verb',
          distractors: [
            {
              value: 'am live',
              reasonCode: 'extra_copula',
              why: 'Live — уже действие, связка am здесь лишняя.',
            },
            {
              value: 'lives',
              reasonCode: 'agreement_person_mismatch',
              why: 'Окончание -s идёт к he, she, it. К I — без него.',
            },
            {
              value: 'living',
              reasonCode: 'wrong_word_form',
              why: 'Living — форма с -ing, отдельно так не говорят.',
            },
            {
              value: 'lived',
              reasonCode: 'tense_mismatch',
              why: 'Lived — «жил», прошедшее время.',
            },
            {
              value: 'leave',
              reasonCode: 'near_homophone_confusion',
              why: 'Leave — «уезжать», почти противоположный смысл.',
            },
          ],
        },
        {
          correct: 'in',
          category: 'preposition',
          distractors: [
            {
              value: 'on',
              reasonCode: 'wrong_preposition',
              why: 'On — «на поверхности». В городе живут in.',
            },
            {
              value: 'at',
              reasonCode: 'wrong_preposition',
              why: 'At указывает на точку — адрес, а не город.',
            },
            {
              value: 'to',
              reasonCode: 'wrong_preposition',
              why: 'To — направление движения, а вы не едете.',
            },
            {
              value: 'from',
              reasonCode: 'wrong_preposition',
              why: 'From — «из», это про происхождение.',
            },
            {
              value: 'into',
              reasonCode: 'wrong_preposition',
              why: 'Into — «внутрь», движение.',
            },
          ],
        },
        {
          correct: 'Madrid',
          category: 'place-name',
          distractors: [
            {
              value: 'madrid',
              reasonCode: 'capitalization_invalid',
              why: 'Названия городов пишут с заглавной буквы.',
            },
            {
              value: 'the Madrid',
              reasonCode: 'article_with_city_name',
              why: 'Перед названием города артикль не ставят.',
            },
            {
              value: 'Madryd',
              reasonCode: 'spelling_invalid',
              why: 'Ошибка в написании названия.',
            },
            {
              value: 'Madrids',
              reasonCode: 'number_mismatch',
              why: 'Название города не ставят во множественное число.',
            },
            {
              value: 'Spain',
              reasonCode: 'not_target_word',
              why: 'Spain — страна. Живые люди чаще называют город.',
            },
          ],
        },
      ],
      features: [
        'present_simple_verb',
        'first_person_singular',
        'preposition_place',
        'proper_noun',
      ],
    },
    {
      id: 'e01-s02-please',
      english: 'Please',
      russian: 'Пожалуйста',
      explanation:
        'Одно слово, которое делает любую просьбу вежливой. В английском его добавляют гораздо чаще, чем в русском: без please просьба звучит как приказ.',
      words: [
        {
          correct: 'Please',
          category: 'politeness',
          distractors: [
            {
              value: 'Pleese',
              reasonCode: 'spelling_invalid',
              why: 'Ошибка в написании: правильно please.',
            },
            {
              value: 'Plese',
              reasonCode: 'spelling_invalid',
              why: 'Пропущена буква a.',
            },
            {
              value: 'Pleased',
              reasonCode: 'wrong_word_form',
              why: 'Pleased — «довольный», это признак, а не просьба.',
            },
            {
              value: 'Place',
              reasonCode: 'near_homophone_confusion',
              why: 'Place — «место».',
            },
            {
              value: 'Peace',
              reasonCode: 'near_homophone_confusion',
              why: 'Peace — «мир», созвучно, но смысл другой.',
            },
          ],
        },
      ],
      features: ['fixed_expression', 'politeness', 'single_word_utterance'],
    },
    {
      id: 'e01-s02-sorry',
      english: 'Sorry',
      russian: 'Извините',
      explanation:
        'Универсальное извинение: и когда наступили на ногу, и когда не расслышали. Англичане говорят его очень часто, даже по мелочам.',
      words: [
        {
          correct: 'Sorry',
          category: 'politeness',
          distractors: [
            {
              value: 'Sory',
              reasonCode: 'spelling_invalid',
              why: 'Пропущена буква r: правильно sorry.',
            },
            {
              value: 'Sorrow',
              reasonCode: 'wrong_word_form',
              why: 'Sorrow — «печаль», существительное.',
            },
            {
              value: 'Story',
              reasonCode: 'near_homophone_confusion',
              why: 'Story — «история».',
            },
            {
              value: 'Sorries',
              reasonCode: 'wrong_word_form',
              why: 'Такой формы у этого слова нет.',
            },
            {
              value: 'Sunny',
              reasonCode: 'meaning_mismatch',
              why: 'Sunny — «солнечный».',
            },
          ],
        },
      ],
      features: ['fixed_expression', 'politeness', 'single_word_utterance'],
    },
    {
      id: 'e01-s02-i-am-a-teacher',
      english: 'I am a teacher',
      russian: 'Я учитель',
      explanation:
        'Ещё одно занятие с артиклем a. Правило то же: перед профессией он обязателен, потому что вы один из многих учителей.',
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
              why: 'My — «мой», это принадлежность.',
            },
            {
              value: 'i',
              reasonCode: 'capitalization_invalid',
              why: 'Английское «я» всегда пишется заглавной буквой — I.',
            },
            {
              value: 'mine',
              reasonCode: 'possessive_as_subject',
              why: 'Mine человека не называет.',
            },
            {
              value: 'am',
              reasonCode: 'verb_as_subject',
              why: 'Am — глагол, на этом месте нужно подлежащее.',
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
              why: 'Is ставят к he, she, it. Рядом с I всегда am.',
            },
            {
              value: 'are',
              reasonCode: 'agreement_person_mismatch',
              why: 'Are идёт к you, we, they.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма, а не be.',
            },
            {
              value: 'have',
              reasonCode: 'wrong_auxiliary',
              why: 'Профессию называют через быть, а не иметь.',
            },
            {
              value: 'work',
              reasonCode: 'wrong_verb_choice',
              why: 'Work — «работать», здесь тренируем связку.',
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
              why: 'An нужен перед гласным звуком. Teacher начинается с «т».',
            },
            {
              value: 'the',
              reasonCode: 'article_definiteness_wrong',
              why: 'The — про конкретного, известного. Здесь один из многих.',
            },
            {
              value: 'one',
              reasonCode: 'numeral_instead_of_article',
              why: 'One — число «один», а нужен артикль.',
            },
            {
              value: 'my',
              reasonCode: 'possessive_instead_of_article',
              why: 'My teacher — «мой учитель», другой смысл.',
            },
            {
              value: 'some',
              reasonCode: 'quantifier_instead_of_article',
              why: 'Some — «несколько», с одним человеком не сочетается.',
            },
          ],
        },
        {
          correct: 'teacher',
          category: 'noun',
          distractors: [
            {
              value: 'teachers',
              reasonCode: 'number_mismatch',
              why: 'После a всегда единственное число.',
            },
            {
              value: 'teach',
              reasonCode: 'wrong_word_class',
              why: 'Teach — «учить», глагол.',
            },
            {
              value: 'teaching',
              reasonCode: 'wrong_word_form',
              why: 'После артикля нужно существительное.',
            },
            {
              value: 'techer',
              reasonCode: 'spelling_invalid',
              why: 'Пропущена буква a.',
            },
            {
              value: 'teached',
              reasonCode: 'wrong_word_form',
              why: 'Такой формы нет, и это не существительное.',
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
    {
      id: 'e01-s02-good-night',
      english: 'Good night',
      russian: 'Спокойной ночи',
      explanation:
        'Прощание перед сном, а не приветствие. Этим оно отличается от Good morning: доброго утра желают при встрече, спокойной ночи — при расставании.',
      words: [
        {
          correct: 'Good',
          category: 'adjective',
          distractors: [
            {
              value: 'Well',
              reasonCode: 'wrong_word_class',
              why: 'Well — наречие «хорошо». В этой формуле стоит good.',
            },
            {
              value: 'Goot',
              reasonCode: 'spelling_invalid',
              why: 'Ошибка в написании.',
            },
            {
              value: 'Nice',
              reasonCode: 'not_target_word',
              why: 'Nice night так не прощаются.',
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
          correct: 'night',
          category: 'noun',
          distractors: [
            {
              value: 'knight',
              reasonCode: 'homophone_confusion',
              why: 'Звучит одинаково, но knight — «рыцарь».',
            },
            {
              value: 'nights',
              reasonCode: 'number_mismatch',
              why: 'В этой формуле единственное число.',
            },
            {
              value: 'nite',
              reasonCode: 'spelling_invalid',
              why: 'Так пишут только в рекламе, это не норма.',
            },
            {
              value: 'light',
              reasonCode: 'near_homophone_confusion',
              why: 'Light — «свет».',
            },
            {
              value: 'morning',
              reasonCode: 'meaning_mismatch',
              why: 'Morning — «утро», другое время суток.',
            },
          ],
        },
      ],
      features: ['fixed_expression', 'farewell', 'time_of_day'],
    },
    {
      id: 'e01-s02-i-am-not-hungry',
      english: 'I am not hungry',
      russian: 'Я не голоден',
      explanation:
        'Уже знакомый признак hungry, теперь с отрицанием. Not встаёт сразу после am — то же самое место, что и в любом другом отрицании со связкой.',
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
              why: 'Are — для you, we, they.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'С признаком отрицают через am not, а не do not.',
            },
            {
              value: 'don’t',
              reasonCode: 'wrong_auxiliary',
              why: 'Hungry — не глагол, вспомогательный do не нужен.',
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
              why: 'No отрицает существительное. Глагол-связку отрицают через not.',
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
      features: [
        'copula_be',
        'first_person_singular',
        'negation_not',
        'state_adjective',
      ],
    },
    {
      id: 'e01-s02-i-am-not-here',
      english: 'I am not here',
      russian: 'Меня здесь нет',
      explanation:
        'Отрицание места вместо признака: not после am работает точно так же, здесь просто меняется here вместо busy или hungry. Так пишут в ответ на сообщение, когда человек уже ушёл.',
      words: [
        {
          correct: 'I',
          category: 'pronoun',
          distractors: [
            {
              value: 'me',
              reasonCode: 'object_pronoun_as_subject',
              why: 'Соблазн сказать «меня» велик, но подлежащее — I.',
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
              why: 'Are — для you, we, they.',
            },
            {
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — прошедшее время. Здесь речь про сейчас.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Be — начальная форма, нужна личная: am.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'Место отрицают через am not, а не do not.',
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
              why: 'No отрицает существительное. Глагол-связку отрицают через not.',
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
          correct: 'here',
          category: 'place',
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
      features: ['copula_be', 'first_person_singular', 'negation_not', 'adverb_place'],
    },
    {
      id: 'e01-s02-i-am-not-happy',
      english: 'I am not happy',
      russian: 'Я не рад',
      explanation:
        'Тот же признак happy, что и в уроке раньше, теперь с отрицанием. Порядок слов не меняется — not всегда сразу после am.',
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
              why: 'Are — для you, we, they.',
            },
            {
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — прошедшее время. Здесь речь про сейчас.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Be — начальная форма, нужна личная: am.',
            },
            {
              value: 'have',
              reasonCode: 'wrong_auxiliary',
              why: 'Радость отрицают через быть, а не иметь.',
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
              why: 'No отрицает существительное. Глагол-связку отрицают через not.',
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
      features: [
        'copula_be',
        'first_person_singular',
        'negation_not',
        'state_adjective',
      ],
    },
  ]);
