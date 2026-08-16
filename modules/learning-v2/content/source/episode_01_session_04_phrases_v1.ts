// зачем: агент-новичок после трёх сессий назвал ровно один оставшийся пробел —
// «не умею задать вопрос вроде "как тебя зовут", потому что вопросительные слова
// пока не проходили». Сессия 4 даёт What / Where / How и закрывает знакомство.
//
// Про запрет владельца: под запретом была фраза-ОТВЕТ «My name is Anna».
// Вопрос «What is your name?» — живой и обязательный, иначе имя не спросить.
// Ответ по-прежнему учим живой: I am Anna (см. сессию 2).
import type { EpisodeSourcePhrase } from './episode_01_source_v1';

export const EPISODE_01_SESSION_04_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze([
    {
      id: 'e01-s04-what-is-your-name',
      english: 'What is your name?',
      russian: 'Как тебя зовут?',
      explanation:
        'Главный вопрос при знакомстве. Дословно «какое твоё имя» — англичане спрашивают через «что», а не через «как». В речи почти всегда сокращают: What’s your name?',
      words: [
        {
          correct: 'What',
          category: 'question-word',
          distractors: [
            {
              value: 'How',
              reasonCode: 'wrong_question_word',
              why: 'How — «как». Дословный перевод с русского здесь не работает.',
            },
            {
              value: 'Who',
              reasonCode: 'wrong_question_word',
              why: 'Who — «кто», спрашивает о человеке, а не о его имени.',
            },
            {
              value: 'Where',
              reasonCode: 'wrong_question_word',
              why: 'Where — «где», это о месте.',
            },
            {
              value: 'Wat',
              reasonCode: 'spelling_invalid',
              why: 'Пропущена буква h: правильно what.',
            },
            {
              value: 'Whot',
              reasonCode: 'spelling_invalid',
              why: 'Ошибка в написании.',
            },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            {
              value: 'are',
              reasonCode: 'agreement_person_mismatch',
              why: 'Name — одно слово-предмет, к нему идёт is.',
            },
            {
              value: 'am',
              reasonCode: 'agreement_person_mismatch',
              why: 'Am — только к I.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'Со связкой do не ставят.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — прошедшее время.',
            },
          ],
        },
        {
          correct: 'your',
          category: 'possessive',
          distractors: [
            {
              value: 'you',
              reasonCode: 'pronoun_instead_of_possessive',
              why: 'Спрашивают про твоё имя, значит нужно your.',
            },
            {
              value: 'yours',
              reasonCode: 'possessive_pronoun_before_noun',
              why: 'Yours стоит без существительного, а тут дальше идёт name.',
            },
            {
              value: 'my',
              reasonCode: 'wrong_referent',
              why: 'My — «моё», а спрашивают о собеседнике.',
            },
            {
              value: 'your’s',
              reasonCode: 'apostrophe_misuse',
              why: 'Такой формы не существует.',
            },
            {
              value: 'ur',
              reasonCode: 'chat_abbreviation',
              why: 'Сокращение из переписки, не литературная форма.',
            },
          ],
        },
        {
          correct: 'name',
          category: 'noun',
          distractors: [
            {
              value: 'names',
              reasonCode: 'number_mismatch',
              why: 'Имя одно, множественное число здесь не нужно.',
            },
            {
              value: 'nane',
              reasonCode: 'spelling_invalid',
              why: 'Ошибка в написании.',
            },
            {
              value: 'named',
              reasonCode: 'wrong_word_form',
              why: 'Named — «названный», это уже другая форма.',
            },
            {
              value: 'game',
              reasonCode: 'near_homophone_confusion',
              why: 'Game — «игра».',
            },
            {
              value: 'nam',
              reasonCode: 'spelling_invalid',
              why: 'Пропущена буква e.',
            },
          ],
        },
      ],
      features: ['question_word', 'copula_be', 'possessive_your', 'third_person_singular'],
    },
    {
      id: 'e01-s04-where-are-you-from',
      english: 'Where are you from?',
      russian: 'Откуда ты?',
      explanation:
        'Спрашивают о родном городе или стране. Обратите внимание: маленькое from стоит в самом конце — это нормально для английского вопроса.',
      words: [
        {
          correct: 'Where',
          category: 'question-word',
          distractors: [
            {
              value: 'What',
              reasonCode: 'wrong_question_word',
              why: 'What — «что», а спрашивают о месте.',
            },
            {
              value: 'When',
              reasonCode: 'wrong_question_word',
              why: 'When — «когда», это о времени.',
            },
            {
              value: 'Who',
              reasonCode: 'wrong_question_word',
              why: 'Who — «кто».',
            },
            {
              value: 'Were',
              reasonCode: 'near_homophone_confusion',
              why: 'Were — форма глагола, а не вопросительное слово.',
            },
            {
              value: 'Wher',
              reasonCode: 'spelling_invalid',
              why: 'Пропущена буква e.',
            },
          ],
        },
        {
          correct: 'are',
          category: 'to-be',
          distractors: [
            {
              value: 'am',
              reasonCode: 'agreement_person_mismatch',
              why: 'Am — только к I, а здесь you.',
            },
            {
              value: 'is',
              reasonCode: 'agreement_person_mismatch',
              why: 'Is — к he, she, it.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'Со связкой do не ставят.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'were',
              reasonCode: 'tense_mismatch',
              why: 'Were — прошедшее время.',
            },
          ],
        },
        {
          correct: 'you',
          category: 'pronoun',
          distractors: [
            {
              value: 'your',
              reasonCode: 'possessive_as_subject',
              why: 'Your — «твой», а спрашивают о самом человеке.',
            },
            {
              value: 'I',
              reasonCode: 'person_mismatch',
              why: 'Вопрос собеседнику, значит you.',
            },
            {
              value: 'yours',
              reasonCode: 'possessive_as_subject',
              why: 'Yours заменяет предмет.',
            },
            {
              value: 'u',
              reasonCode: 'chat_abbreviation',
              why: 'Форма из переписки.',
            },
            {
              value: 'me',
              reasonCode: 'object_pronoun_as_subject',
              why: 'Me не бывает подлежащим.',
            },
          ],
        },
        {
          correct: 'from',
          category: 'preposition',
          distractors: [
            {
              value: 'in',
              reasonCode: 'wrong_preposition',
              why: 'In — «внутри», а тут о происхождении: from.',
            },
            {
              value: 'to',
              reasonCode: 'wrong_preposition',
              why: 'To — направление движения.',
            },
            {
              value: 'at',
              reasonCode: 'wrong_preposition',
              why: 'At — точка на месте.',
            },
            {
              value: 'form',
              reasonCode: 'letter_order_confusion',
              why: 'Form — «форма», буквы переставлены.',
            },
            {
              value: 'of',
              reasonCode: 'wrong_preposition',
              why: 'Of — «из чего сделано», не о городе.',
            },
          ],
        },
      ],
      features: ['question_word', 'copula_be', 'second_person', 'preposition_place'],
    },
    {
      id: 'e01-s04-how-are-you',
      english: 'How are you?',
      russian: 'Как дела?',
      explanation:
        'Самый частый вопрос при встрече. Часто это просто вежливость, а не настоящий интерес — отвечают коротко и спрашивают в ответ.',
      words: [
        {
          correct: 'How',
          category: 'question-word',
          distractors: [
            {
              value: 'What',
              reasonCode: 'wrong_question_word',
              why: 'What — «что», а здесь спрашивают о состоянии.',
            },
            {
              value: 'Where',
              reasonCode: 'wrong_question_word',
              why: 'Where — «где».',
            },
            {
              value: 'Who',
              reasonCode: 'wrong_question_word',
              why: 'Who — «кто».',
            },
            {
              value: 'Hou',
              reasonCode: 'spelling_invalid',
              why: 'Ошибка в написании: how.',
            },
            {
              value: 'Now',
              reasonCode: 'near_homophone_confusion',
              why: 'Now — «сейчас».',
            },
          ],
        },
        {
          correct: 'are',
          category: 'to-be',
          distractors: [
            {
              value: 'am',
              reasonCode: 'agreement_person_mismatch',
              why: 'Am — только к I.',
            },
            {
              value: 'is',
              reasonCode: 'agreement_person_mismatch',
              why: 'Is — к he, she, it.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'Со связкой do не ставят.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'were',
              reasonCode: 'tense_mismatch',
              why: 'Were — прошедшее время.',
            },
          ],
        },
        {
          correct: 'you',
          category: 'pronoun',
          distractors: [
            {
              value: 'your',
              reasonCode: 'possessive_as_subject',
              why: 'Your — «твой».',
            },
            {
              value: 'I',
              reasonCode: 'person_mismatch',
              why: 'Спрашивают собеседника.',
            },
            {
              value: 'u',
              reasonCode: 'chat_abbreviation',
              why: 'Форма из переписки.',
            },
            {
              value: 'me',
              reasonCode: 'object_pronoun_as_subject',
              why: 'Me не бывает подлежащим.',
            },
            {
              value: 'yours',
              reasonCode: 'possessive_as_subject',
              why: 'Yours заменяет предмет.',
            },
          ],
        },
      ],
      features: ['question_word', 'copula_be', 'second_person'],
    },
    {
      id: 'e01-s04-i-am-good-thanks',
      english: 'I am good, thanks',
      russian: 'Хорошо, спасибо',
      explanation:
        'Обычный ответ на «How are you?». Живее книжного «I am fine, thank you» — так отвечают в жизни, коротко и с благодарностью.',
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
              value: 'i',
              reasonCode: 'capitalization_invalid',
              why: 'Английское «я» всегда пишется заглавной буквой.',
            },
            {
              value: 'my',
              reasonCode: 'possessive_as_subject',
              why: 'My — «мой».',
            },
            {
              value: 'you',
              reasonCode: 'person_mismatch',
              why: 'Отвечаете о себе.',
            },
            {
              value: 'mine',
              reasonCode: 'possessive_as_subject',
              why: 'Mine человека не называет.',
            },
          ],
        },
        {
          correct: 'am',
          category: 'to-be',
          distractors: [
            {
              value: 'are',
              reasonCode: 'agreement_person_mismatch',
              why: 'Are — к you, а речь о себе.',
            },
            {
              value: 'is',
              reasonCode: 'agreement_person_mismatch',
              why: 'Is — к he, she, it.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'Со связкой do не ставят.',
            },
            {
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — про прошлое.',
            },
          ],
        },
        {
          correct: 'good',
          category: 'adjective',
          distractors: [
            {
              value: 'well',
              reasonCode: 'register_mismatch',
              why: 'I am well тоже верно, но звучит официальнее. В жизни чаще good.',
            },
            {
              value: 'goot',
              reasonCode: 'spelling_invalid',
              why: 'Ошибка в написании.',
            },
            {
              value: 'better',
              reasonCode: 'wrong_word_form',
              why: 'Better — «лучше», нужно сравнение с чем-то.',
            },
            {
              value: 'goods',
              reasonCode: 'wrong_word_class',
              why: 'Goods — «товары».',
            },
            {
              value: 'best',
              reasonCode: 'wrong_word_form',
              why: 'Best — «самый лучший».',
            },
          ],
        },
        {
          correct: 'thanks',
          category: 'politeness',
          distractors: [
            {
              value: 'thank',
              reasonCode: 'form_mismatch_in_phrase',
              why: 'Отдельно говорят thanks, с s. Без s только внутри Thank you.',
            },
            {
              value: 'thank’s',
              reasonCode: 'apostrophe_misuse',
              why: 'Апостроф здесь не нужен.',
            },
            {
              value: 'thinks',
              reasonCode: 'near_homophone_confusion',
              why: 'Thinks — «думает».',
            },
            {
              value: 'tanks',
              reasonCode: 'near_homophone_confusion',
              why: 'Tanks — «баки», «танки».',
            },
            {
              value: 'thanx',
              reasonCode: 'chat_abbreviation',
              why: 'Так пишут только в переписке.',
            },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'state_adjective', 'politeness'],
    },
    {
      id: 'e01-s04-where-is-the-exit',
      english: 'Where is the exit?',
      russian: 'Где выход?',
      explanation:
        'Первый по-настоящему полезный вопрос в чужом городе. Здесь стоит the, а не a: выход конкретный, тот самый, который вы ищете.',
      words: [
        {
          correct: 'Where',
          category: 'question-word',
          distractors: [
            {
              value: 'What',
              reasonCode: 'wrong_question_word',
              why: 'What — «что», а спрашивают о месте.',
            },
            {
              value: 'When',
              reasonCode: 'wrong_question_word',
              why: 'When — «когда».',
            },
            {
              value: 'How',
              reasonCode: 'wrong_question_word',
              why: 'How — «как».',
            },
            {
              value: 'Were',
              reasonCode: 'near_homophone_confusion',
              why: 'Were — форма глагола.',
            },
            {
              value: 'Wear',
              reasonCode: 'homophone_confusion',
              why: 'Звучит одинаково, но wear — «носить одежду».',
            },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            {
              value: 'are',
              reasonCode: 'agreement_person_mismatch',
              why: 'Выход один, значит is.',
            },
            {
              value: 'am',
              reasonCode: 'agreement_person_mismatch',
              why: 'Am — только к I.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'Со связкой do не ставят.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — прошедшее время.',
            },
          ],
        },
        {
          correct: 'the',
          category: 'article',
          distractors: [
            {
              value: 'a',
              reasonCode: 'article_definiteness_wrong',
              why: 'A — «какой-нибудь один». Вы ищете конкретный выход, значит the.',
            },
            {
              value: 'an',
              reasonCode: 'article_definiteness_wrong',
              why: 'An — тот же неопределённый артикль, только перед гласным.',
            },
            {
              value: 'my',
              reasonCode: 'possessive_instead_of_article',
              why: 'My exit — «мой выход», другой смысл.',
            },
            {
              value: 'this',
              reasonCode: 'demonstrative_instead_of_article',
              why: 'This — «этот», вы показываете на него, а не ищете.',
            },
            {
              value: 'some',
              reasonCode: 'quantifier_instead_of_article',
              why: 'Some — «несколько».',
            },
          ],
        },
        {
          correct: 'exit',
          category: 'noun',
          distractors: [
            {
              value: 'exits',
              reasonCode: 'number_mismatch',
              why: 'После the и is здесь один выход.',
            },
            {
              value: 'exite',
              reasonCode: 'spelling_invalid',
              why: 'Лишняя буква e.',
            },
            {
              value: 'entrance',
              reasonCode: 'meaning_mismatch',
              why: 'Entrance — «вход», противоположное.',
            },
            {
              value: 'excite',
              reasonCode: 'near_homophone_confusion',
              why: 'Excite — «волновать».',
            },
            {
              value: 'exist',
              reasonCode: 'near_homophone_confusion',
              why: 'Exist — «существовать».',
            },
          ],
        },
      ],
      features: [
        'question_word',
        'copula_be',
        'third_person_singular',
        'definite_article',
      ],
    },
    {
      id: 'e01-s04-what-is-this',
      english: 'What is this?',
      russian: 'Что это?',
      explanation:
        'Спасательный вопрос, когда не знаете слова: покажите на предмет и спросите. Так учат язык быстрее всего.',
      words: [
        {
          correct: 'What',
          category: 'question-word',
          distractors: [
            {
              value: 'Where',
              reasonCode: 'wrong_question_word',
              why: 'Where — «где», это о месте.',
            },
            {
              value: 'Who',
              reasonCode: 'wrong_question_word',
              why: 'Who — «кто», о человеке.',
            },
            {
              value: 'How',
              reasonCode: 'wrong_question_word',
              why: 'How — «как».',
            },
            {
              value: 'Wat',
              reasonCode: 'spelling_invalid',
              why: 'Пропущена буква h.',
            },
            {
              value: 'That',
              reasonCode: 'wrong_word_class',
              why: 'That — «тот», это не вопрос.',
            },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            {
              value: 'are',
              reasonCode: 'agreement_person_mismatch',
              why: 'This — один предмет, значит is.',
            },
            {
              value: 'am',
              reasonCode: 'agreement_person_mismatch',
              why: 'Am — только к I.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'Со связкой do не ставят.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — прошедшее время.',
            },
          ],
        },
        {
          correct: 'this',
          category: 'demonstrative',
          distractors: [
            {
              value: 'that',
              reasonCode: 'deixis_distance',
              why: 'That — «то», о дальнем предмете. Рядом — this.',
            },
            {
              value: 'these',
              reasonCode: 'number_mismatch',
              why: 'These — «эти», о нескольких предметах.',
            },
            {
              value: 'his',
              reasonCode: 'near_homophone_confusion',
              why: 'His — «его».',
            },
            {
              value: 'thes',
              reasonCode: 'spelling_invalid',
              why: 'Ошибка в написании.',
            },
            {
              value: 'it',
              reasonCode: 'wrong_word_choice',
              why: 'It не показывает на предмет рядом, для этого есть this.',
            },
          ],
        },
      ],
      features: ['question_word', 'copula_be', 'third_person_singular', 'demonstrative'],
    },
    {
      id: 'e01-s04-how-much-is-it',
      english: 'How much is it?',
      russian: 'Сколько это стоит?',
      explanation:
        'Вопрос о цене — из тех, что выручают каждый день в поездке. How much буквально «как много», два слова работают как одно.',
      words: [
        {
          correct: 'How',
          category: 'question-word',
          distractors: [
            {
              value: 'What',
              reasonCode: 'wrong_question_word',
              why: 'О цене спрашивают через how much.',
            },
            {
              value: 'Where',
              reasonCode: 'wrong_question_word',
              why: 'Where — «где».',
            },
            {
              value: 'Who',
              reasonCode: 'wrong_question_word',
              why: 'Who — «кто».',
            },
            {
              value: 'Hou',
              reasonCode: 'spelling_invalid',
              why: 'Ошибка в написании.',
            },
            {
              value: 'Now',
              reasonCode: 'near_homophone_confusion',
              why: 'Now — «сейчас».',
            },
          ],
        },
        {
          correct: 'much',
          category: 'quantifier',
          distractors: [
            {
              value: 'many',
              reasonCode: 'quantifier_countability',
              why: 'Many — о штуках, которые считают. О деньгах говорят much.',
            },
            {
              value: 'more',
              reasonCode: 'wrong_word_form',
              why: 'More — «больше», это сравнение.',
            },
            {
              value: 'mach',
              reasonCode: 'spelling_invalid',
              why: 'Ошибка в написании.',
            },
            {
              value: 'must',
              reasonCode: 'near_homophone_confusion',
              why: 'Must — «должен».',
            },
            {
              value: 'match',
              reasonCode: 'near_homophone_confusion',
              why: 'Match — «спичка», «матч».',
            },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            {
              value: 'are',
              reasonCode: 'agreement_person_mismatch',
              why: 'It — один предмет, значит is.',
            },
            {
              value: 'am',
              reasonCode: 'agreement_person_mismatch',
              why: 'Am — только к I.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'Со связкой do не ставят.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — прошедшее время.',
            },
          ],
        },
        {
          correct: 'it',
          category: 'pronoun',
          distractors: [
            {
              value: 'this',
              reasonCode: 'wrong_word_choice',
              why: 'В этой готовой фразе стоит именно it.',
            },
            {
              value: 'he',
              reasonCode: 'wrong_referent',
              why: 'He — о человеке, а не о предмете.',
            },
            {
              value: 'they',
              reasonCode: 'number_mismatch',
              why: 'They — о нескольких.',
            },
            {
              value: 'its',
              reasonCode: 'possessive_as_subject',
              why: 'Its — «его», принадлежность.',
            },
            {
              value: 'it’s',
              reasonCode: 'contraction_in_wrong_place',
              why: 'It’s — это «it is», связка тут уже есть.',
            },
          ],
        },
      ],
      features: ['question_word', 'copula_be', 'third_person_singular', 'quantifier'],
    },
    {
      id: 'e01-s04-where-are-you-now',
      english: 'Where are you now?',
      russian: 'Ты сейчас где?',
      explanation:
        'Частый вопрос по телефону. Now значит «сейчас» и ставится в конце — как и большинство слов о времени.',
      words: [
        {
          correct: 'Where',
          category: 'question-word',
          distractors: [
            {
              value: 'What',
              reasonCode: 'wrong_question_word',
              why: 'What — «что», а спрашивают о месте.',
            },
            {
              value: 'When',
              reasonCode: 'wrong_question_word',
              why: 'When — «когда», о времени.',
            },
            {
              value: 'How',
              reasonCode: 'wrong_question_word',
              why: 'How — «как».',
            },
            {
              value: 'Were',
              reasonCode: 'near_homophone_confusion',
              why: 'Were — форма глагола.',
            },
            {
              value: 'Wear',
              reasonCode: 'homophone_confusion',
              why: 'Wear — «носить одежду».',
            },
          ],
        },
        {
          correct: 'are',
          category: 'to-be',
          distractors: [
            {
              value: 'am',
              reasonCode: 'agreement_person_mismatch',
              why: 'Am — только к I.',
            },
            {
              value: 'is',
              reasonCode: 'agreement_person_mismatch',
              why: 'Is — к he, she, it.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'Со связкой do не ставят.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'were',
              reasonCode: 'tense_mismatch',
              why: 'Were — прошедшее время.',
            },
          ],
        },
        {
          correct: 'you',
          category: 'pronoun',
          distractors: [
            {
              value: 'your',
              reasonCode: 'possessive_as_subject',
              why: 'Your — «твой».',
            },
            {
              value: 'I',
              reasonCode: 'person_mismatch',
              why: 'Спрашивают собеседника.',
            },
            {
              value: 'u',
              reasonCode: 'chat_abbreviation',
              why: 'Форма из переписки.',
            },
            {
              value: 'me',
              reasonCode: 'object_pronoun_as_subject',
              why: 'Me не бывает подлежащим.',
            },
            {
              value: 'yours',
              reasonCode: 'possessive_as_subject',
              why: 'Yours заменяет предмет.',
            },
          ],
        },
        {
          correct: 'now',
          category: 'adverb',
          distractors: [
            {
              value: 'know',
              reasonCode: 'homophone_confusion',
              why: 'Звучит одинаково, но know — «знать».',
            },
            {
              value: 'no',
              reasonCode: 'near_homophone_confusion',
              why: 'No — «нет».',
            },
            {
              value: 'new',
              reasonCode: 'near_homophone_confusion',
              why: 'New — «новый».',
            },
            {
              value: 'nowadays',
              reasonCode: 'wrong_word_form',
              why: 'Nowadays — «в наши дни», о целой эпохе.',
            },
            {
              value: 'nov',
              reasonCode: 'spelling_invalid',
              why: 'Такого слова нет.',
            },
          ],
        },
      ],
      features: [
        'question_word',
        'copula_be',
        'second_person',
        'adverb_time',
      ],
    },
    {
      id: 'e01-s04-what-is-your-number',
      english: 'What is your number?',
      russian: 'Какой у тебя номер?',
      explanation:
        'Так спрашивают телефон. Схема та же, что и с именем: What is your + предмет. Одна конструкция — много вопросов.',
      words: [
        {
          correct: 'What',
          category: 'question-word',
          distractors: [
            {
              value: 'How',
              reasonCode: 'wrong_question_word',
              why: 'О номере спрашивают через what.',
            },
            {
              value: 'Where',
              reasonCode: 'wrong_question_word',
              why: 'Where — «где».',
            },
            {
              value: 'Who',
              reasonCode: 'wrong_question_word',
              why: 'Who — «кто».',
            },
            {
              value: 'When',
              reasonCode: 'wrong_question_word',
              why: 'When — «когда», это о времени.',
            },
            {
              value: 'Wat',
              reasonCode: 'spelling_invalid',
              why: 'Пропущена буква h.',
            },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            {
              value: 'are',
              reasonCode: 'agreement_person_mismatch',
              why: 'Number — один предмет, значит is.',
            },
            {
              value: 'am',
              reasonCode: 'agreement_person_mismatch',
              why: 'Am — только к I.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'Со связкой do не ставят.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — прошедшее время.',
            },
          ],
        },
        {
          correct: 'your',
          category: 'possessive',
          distractors: [
            {
              value: 'you',
              reasonCode: 'pronoun_instead_of_possessive',
              why: 'Перед предметом ставят your, а не you.',
            },
            {
              value: 'yours',
              reasonCode: 'possessive_pronoun_before_noun',
              why: 'Yours стоит без существительного.',
            },
            {
              value: 'my',
              reasonCode: 'wrong_referent',
              why: 'My — «мой», а спрашивают о собеседнике.',
            },
            {
              value: 'ur',
              reasonCode: 'chat_abbreviation',
              why: 'Сокращение из переписки.',
            },
            {
              value: 'your’s',
              reasonCode: 'apostrophe_misuse',
              why: 'Такой формы не существует.',
            },
          ],
        },
        {
          correct: 'number',
          category: 'noun',
          distractors: [
            {
              value: 'numbers',
              reasonCode: 'number_mismatch',
              why: 'Номер один, множественное число не нужно.',
            },
            {
              value: 'nomber',
              reasonCode: 'spelling_invalid',
              why: 'Ошибка в написании.',
            },
            {
              value: 'name',
              reasonCode: 'meaning_mismatch',
              why: 'Name — «имя», а спрашивают номер.',
            },
            {
              value: 'numer',
              reasonCode: 'spelling_invalid',
              why: 'Пропущена буква b.',
            },
            {
              value: 'nummer',
              reasonCode: 'spelling_invalid',
              why: 'Это немецкое написание.',
            },
          ],
        },
      ],
      features: ['question_word', 'copula_be', 'possessive_your', 'third_person_singular'],
    },
    {
      id: 'e01-s04-how-is-your-day',
      english: 'How is your day?',
      russian: 'Как твой день?',
      explanation:
        'Тёплый вопрос знакомому человеку — чуть личнее, чем дежурное How are you. Спрашивают среди дня, а не при первой встрече.',
      words: [
        {
          correct: 'How',
          category: 'question-word',
          distractors: [
            {
              value: 'What',
              reasonCode: 'wrong_question_word',
              why: 'О качестве дня спрашивают через how.',
            },
            {
              value: 'Where',
              reasonCode: 'wrong_question_word',
              why: 'Where — «где».',
            },
            {
              value: 'When',
              reasonCode: 'wrong_question_word',
              why: 'When — «когда».',
            },
            {
              value: 'Who',
              reasonCode: 'wrong_question_word',
              why: 'Who — «кто».',
            },
            {
              value: 'Hou',
              reasonCode: 'spelling_invalid',
              why: 'Ошибка в написании.',
            },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            {
              value: 'are',
              reasonCode: 'agreement_person_mismatch',
              why: 'Day — один предмет, значит is.',
            },
            {
              value: 'am',
              reasonCode: 'agreement_person_mismatch',
              why: 'Am — только к I.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'Со связкой do не ставят.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — прошедшее время.',
            },
          ],
        },
        {
          correct: 'your',
          category: 'possessive',
          distractors: [
            {
              value: 'you',
              reasonCode: 'pronoun_instead_of_possessive',
              why: 'Перед предметом ставят your.',
            },
            {
              value: 'yours',
              reasonCode: 'possessive_pronoun_before_noun',
              why: 'Yours стоит без существительного.',
            },
            {
              value: 'my',
              reasonCode: 'wrong_referent',
              why: 'My — «мой».',
            },
            {
              value: 'ur',
              reasonCode: 'chat_abbreviation',
              why: 'Сокращение из переписки.',
            },
            {
              value: 'the',
              reasonCode: 'article_instead_of_possessive',
              why: 'The day — «тот самый день», а спрашивают про твой.',
            },
          ],
        },
        {
          correct: 'day',
          category: 'noun',
          distractors: [
            {
              value: 'days',
              reasonCode: 'number_mismatch',
              why: 'День один, множественное число не нужно.',
            },
            {
              value: 'dey',
              reasonCode: 'spelling_invalid',
              why: 'Ошибка в написании.',
            },
            {
              value: 'daily',
              reasonCode: 'wrong_word_class',
              why: 'Daily — «ежедневный».',
            },
            {
              value: 'dai',
              reasonCode: 'spelling_invalid',
              why: 'Такого слова нет.',
            },
            {
              value: 'today',
              reasonCode: 'wrong_word_choice',
              why: 'Today — «сегодня», это наречие времени.',
            },
          ],
        },
      ],
      features: ['question_word', 'copula_be', 'possessive_your', 'third_person_singular'],
    },
    {
      id: 'e01-s04-where-is-my-bag',
      english: 'Where is my bag?',
      russian: 'Где моя сумка?',
      explanation:
        'Здесь вместо артикля стоит my — когда есть слово о принадлежности, артикль не нужен. Два таких слова подряд не ставят никогда.',
      words: [
        {
          correct: 'Where',
          category: 'question-word',
          distractors: [
            {
              value: 'What',
              reasonCode: 'wrong_question_word',
              why: 'What — «что», а спрашивают о месте.',
            },
            {
              value: 'How',
              reasonCode: 'wrong_question_word',
              why: 'How — «как».',
            },
            {
              value: 'When',
              reasonCode: 'wrong_question_word',
              why: 'When — «когда».',
            },
            {
              value: 'Were',
              reasonCode: 'near_homophone_confusion',
              why: 'Were — форма глагола.',
            },
            {
              value: 'Wear',
              reasonCode: 'homophone_confusion',
              why: 'Wear — «носить одежду».',
            },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            {
              value: 'are',
              reasonCode: 'agreement_person_mismatch',
              why: 'Сумка одна, значит is.',
            },
            {
              value: 'am',
              reasonCode: 'agreement_person_mismatch',
              why: 'Am — только к I.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'Со связкой do не ставят.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — прошедшее время.',
            },
          ],
        },
        {
          correct: 'my',
          category: 'possessive',
          distractors: [
            {
              value: 'I',
              reasonCode: 'pronoun_instead_of_possessive',
              why: 'Перед предметом нужно my, а не I.',
            },
            {
              value: 'me',
              reasonCode: 'pronoun_instead_of_possessive',
              why: 'Me — форма дополнения, принадлежность — my.',
            },
            {
              value: 'mine',
              reasonCode: 'possessive_pronoun_before_noun',
              why: 'Mine стоит без существительного, а дальше идёт bag.',
            },
            {
              value: 'the my',
              reasonCode: 'article_with_possessive',
              why: 'Артикль и слово о принадлежности вместе не ставят.',
            },
            {
              value: 'a my',
              reasonCode: 'article_with_possessive',
              why: 'Та же ошибка: или a, или my, но не оба.',
            },
          ],
        },
        {
          correct: 'bag',
          category: 'noun',
          distractors: [
            {
              value: 'bags',
              reasonCode: 'number_mismatch',
              why: 'Сумка одна, значит без s.',
            },
            {
              value: 'bug',
              reasonCode: 'near_homophone_confusion',
              why: 'Bug — «жук».',
            },
            {
              value: 'big',
              reasonCode: 'near_homophone_confusion',
              why: 'Big — «большой».',
            },
            {
              value: 'back',
              reasonCode: 'near_homophone_confusion',
              why: 'Back — «спина», «назад».',
            },
            {
              value: 'beg',
              reasonCode: 'near_homophone_confusion',
              why: 'Beg — «умолять».',
            },
          ],
        },
      ],
      features: [
        'question_word',
        'copula_be',
        'third_person_singular',
        'possessive_my',
      ],
    },
    {
      id: 'e01-s04-what-is-your-job',
      english: 'What is your job?',
      russian: 'Кем ты работаешь?',
      explanation:
        'Так спрашивают о профессии. Отвечают уже знакомой фразой: I am a teacher — с артиклем a, как вы учили.',
      words: [
        {
          correct: 'What',
          category: 'question-word',
          distractors: [
            {
              value: 'Who',
              reasonCode: 'wrong_question_word',
              why: 'Who — «кто» как человек. О работе спрашивают what.',
            },
            {
              value: 'How',
              reasonCode: 'wrong_question_word',
              why: 'How — «как».',
            },
            {
              value: 'Where',
              reasonCode: 'wrong_question_word',
              why: 'Where — «где».',
            },
            {
              value: 'When',
              reasonCode: 'wrong_question_word',
              why: 'When — «когда», это о времени, а не о работе.',
            },
            {
              value: 'Wat',
              reasonCode: 'spelling_invalid',
              why: 'Пропущена буква h.',
            },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            {
              value: 'are',
              reasonCode: 'agreement_person_mismatch',
              why: 'Job — один предмет, значит is.',
            },
            {
              value: 'am',
              reasonCode: 'agreement_person_mismatch',
              why: 'Am — только к I.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'Со связкой do не ставят.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'was',
              reasonCode: 'tense_mismatch',
              why: 'Was — прошедшее время.',
            },
          ],
        },
        {
          correct: 'your',
          category: 'possessive',
          distractors: [
            {
              value: 'you',
              reasonCode: 'pronoun_instead_of_possessive',
              why: 'Перед предметом ставят your.',
            },
            {
              value: 'yours',
              reasonCode: 'possessive_pronoun_before_noun',
              why: 'Yours стоит без существительного.',
            },
            {
              value: 'my',
              reasonCode: 'wrong_referent',
              why: 'My — «мой».',
            },
            {
              value: 'ur',
              reasonCode: 'chat_abbreviation',
              why: 'Сокращение из переписки.',
            },
            {
              value: 'a your',
              reasonCode: 'article_with_possessive',
              why: 'Артикль и your вместе не ставят.',
            },
          ],
        },
        {
          correct: 'job',
          category: 'noun',
          distractors: [
            {
              value: 'jobs',
              reasonCode: 'number_mismatch',
              why: 'Работа одна, множественное число не нужно.',
            },
            {
              value: 'work',
              reasonCode: 'not_target_word',
              why: 'Work тоже «работа», но в этом вопросе говорят job.',
            },
            {
              value: 'jab',
              reasonCode: 'near_homophone_confusion',
              why: 'Jab — «укол», «тычок».',
            },
            {
              value: 'joob',
              reasonCode: 'spelling_invalid',
              why: 'Лишняя буква o.',
            },
            {
              value: 'jog',
              reasonCode: 'near_homophone_confusion',
              why: 'Jog — «бег трусцой».',
            },
          ],
        },
      ],
      features: ['question_word', 'copula_be', 'possessive_your', 'third_person_singular'],
    },
  ]);
