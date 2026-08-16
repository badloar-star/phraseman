// зачем: сессия 3 закрывает вторую половину can-do эпизода 1 из docs/v2/03 —
// «завершить знакомство»: спросить собеседника и ответить коротко. Здесь
// впервые появляются you are и вопрос, поэтому интро объясняет перестановку.
import type { EpisodeSourcePhrase } from './episode_01_source_v1';

export const EPISODE_01_SESSION_03_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze([
    {
      id: 'e01-s03-you-are-here',
      english: 'You are here',
      russian: 'Ты здесь',
      explanation:
        'Та же схема, но про собеседника. К слову you связка меняется на are — это единственное отличие от знакомого I am.',
      words: [
        {
          correct: 'You',
          category: 'pronoun',
          distractors: [
            {
              value: 'you',
              reasonCode: 'capitalization_invalid',
              why: 'В начале предложения слово пишут с заглавной буквы.',
            },
            {
              value: 'Your',
              reasonCode: 'possessive_as_subject',
              why: 'Your — «твой», это принадлежность, а не сам человек.',
            },
            {
              value: 'Yours',
              reasonCode: 'possessive_as_subject',
              why: 'Yours заменяет предмет, а не подлежащее.',
            },
            {
              value: 'I',
              reasonCode: 'person_mismatch',
              why: 'I — «я», а речь о собеседнике.',
            },
            {
              value: 'U',
              reasonCode: 'chat_abbreviation',
              why: 'Так пишут только в быстрых сообщениях.',
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
              why: 'Am идёт только к I. К you — are.',
            },
            {
              value: 'is',
              reasonCode: 'agreement_person_mismatch',
              why: 'Is идёт к he, she, it, но не к you.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Be — начальная форма, нужна личная: are.',
            },
            {
              value: 'were',
              reasonCode: 'tense_mismatch',
              why: 'Were — прошедшее «был», а речь про сейчас.',
            },
            {
              value: 'ar',
              reasonCode: 'spelling_invalid',
              why: 'Пропущена буква e: правильно are.',
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
              why: 'Звучит одинаково, но hear — «слышать».',
            },
            {
              value: 'there',
              reasonCode: 'deixis_opposite',
              why: 'There — «там», противоположное место.',
            },
            {
              value: 'her',
              reasonCode: 'wrong_word_class',
              why: 'Her — «её», места не обозначает.',
            },
            {
              value: 'where',
              reasonCode: 'question_word_in_statement',
              why: 'Where — вопросительное «где».',
            },
            {
              value: 'hair',
              reasonCode: 'near_homophone_confusion',
              why: 'Hair — «волосы».',
            },
          ],
        },
      ],
      features: ['copula_be', 'second_person', 'adverb_place'],
    },
    {
      id: 'e01-s03-you-are-ready',
      english: 'You are ready',
      russian: 'Ты готов',
      explanation:
        'Знакомое слово ready, но теперь про другого человека. Заметьте: само слово-признак не меняется, меняется только связка.',
      words: [
        {
          correct: 'You',
          category: 'pronoun',
          distractors: [
            {
              value: 'you',
              reasonCode: 'capitalization_invalid',
              why: 'В начале предложения нужна заглавная буква.',
            },
            {
              value: 'Your',
              reasonCode: 'possessive_as_subject',
              why: 'Your — «твой», а нужен сам человек.',
            },
            {
              value: 'I',
              reasonCode: 'person_mismatch',
              why: 'I — «я», а речь о собеседнике.',
            },
            {
              value: 'Yours',
              reasonCode: 'possessive_as_subject',
              why: 'Yours заменяет предмет.',
            },
            {
              value: 'Me',
              reasonCode: 'object_pronoun_as_subject',
              why: 'Me не бывает подлежащим.',
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
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'were',
              reasonCode: 'tense_mismatch',
              why: 'Were — прошедшее время.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'Do не соединяет человека с признаком.',
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
              why: 'Already — «уже», это про время.',
            },
            {
              value: 'readily',
              reasonCode: 'wrong_word_class',
              why: 'Наречие «охотно», а нужен признак.',
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
      features: ['copula_be', 'second_person', 'state_adjective'],
    },
    {
      id: 'e01-s03-are-you-ready',
      english: 'Are you ready?',
      russian: 'Ты готов?',
      explanation:
        'Первый вопрос. Чтобы спросить, слова просто меняются местами: was «You are», стало «Are you». Больше ничего добавлять не нужно.',
      words: [
        {
          correct: 'Are',
          category: 'to-be',
          distractors: [
            {
              value: 'Do',
              reasonCode: 'wrong_auxiliary',
              why: 'Do нужен другим глаголам, со связкой его не ставят.',
            },
            {
              value: 'Is',
              reasonCode: 'agreement_person_mismatch',
              why: 'Is — к he, she, it, а здесь you.',
            },
            {
              value: 'Am',
              reasonCode: 'agreement_person_mismatch',
              why: 'Am — только к I.',
            },
            {
              value: 'Be',
              reasonCode: 'infinitive_not_finite',
              why: 'Be — начальная форма, вопрос так не строят.',
            },
            {
              value: 'Were',
              reasonCode: 'tense_mismatch',
              why: 'Were — про прошлое.',
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
              why: 'Получился бы вопрос о себе.',
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
          correct: 'ready',
          category: 'adjective',
          distractors: [
            {
              value: 'read',
              reasonCode: 'near_homophone_confusion',
              why: 'Read — «читать».',
            },
            {
              value: 'readily',
              reasonCode: 'wrong_word_class',
              why: 'Наречие, а нужен признак.',
            },
            {
              value: 'already',
              reasonCode: 'wrong_word_class',
              why: 'Already — «уже».',
            },
            {
              value: 'red',
              reasonCode: 'near_homophone_confusion',
              why: 'Red — «красный».',
            },
            {
              value: 'reading',
              reasonCode: 'wrong_word_form',
              why: 'Reading — «чтение».',
            },
          ],
        },
      ],
      features: ['copula_be', 'second_person', 'question_inversion'],
    },
    {
      id: 'e01-s03-yes-i-am',
      english: 'Yes, I am',
      russian: 'Да',
      explanation:
        'Так отвечают на вопрос со связкой. Просто «Yes» звучит суховато, а «Yes, I am» — полно и естественно. Обратите внимание: связку повторяют, а признак нет.',
      words: [
        {
          correct: 'Yes',
          category: 'answer',
          distractors: [
            {
              value: 'Yeah',
              reasonCode: 'register_mismatch',
              why: 'Yeah — очень разговорное, для вежливого ответа лучше Yes.',
            },
            {
              value: 'Yess',
              reasonCode: 'spelling_invalid',
              why: 'Лишняя буква s.',
            },
            {
              value: 'No',
              reasonCode: 'polarity_inverted',
              why: 'No — противоположный ответ.',
            },
            {
              value: 'Ye',
              reasonCode: 'spelling_invalid',
              why: 'Устаревшая форма, сегодня так не отвечают.',
            },
            {
              value: 'Yes,',
              reasonCode: 'punctuation_in_word',
              why: 'Запятая ставится отдельно, она не часть слова.',
            },
          ],
        },
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
              why: 'Английское «я» всегда заглавное.',
            },
            {
              value: 'you',
              reasonCode: 'person_mismatch',
              why: 'Отвечаете вы, значит I.',
            },
            {
              value: 'my',
              reasonCode: 'possessive_as_subject',
              why: 'My — «мой».',
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
              why: 'Are — к you, а вы отвечаете о себе.',
            },
            {
              value: 'is',
              reasonCode: 'agreement_person_mismatch',
              why: 'Is — к he, she, it.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'В ответе повторяют ту же связку, что была в вопросе.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'am ready',
              reasonCode: 'redundant_repetition',
              why: 'Признак не повторяют — достаточно «Yes, I am».',
            },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'short_answer'],
    },
    {
      id: 'e01-s03-no-i-am-not',
      english: 'No, I am not',
      russian: 'Нет',
      explanation:
        'Отрицательный короткий ответ. Внутри знакомое I am not, только без признака в конце.',
      words: [
        {
          correct: 'No',
          category: 'answer',
          distractors: [
            {
              value: 'Not',
              reasonCode: 'negator_type_mismatch',
              why: 'Not отрицает внутри фразы, а ответ начинают с No.',
            },
            {
              value: 'Yes',
              reasonCode: 'polarity_inverted',
              why: 'Yes — противоположный ответ.',
            },
            {
              value: 'Now',
              reasonCode: 'near_homophone_confusion',
              why: 'Now — «сейчас».',
            },
            {
              value: 'Know',
              reasonCode: 'homophone_confusion',
              why: 'Звучит одинаково, но know — «знать».',
            },
            {
              value: 'Nope',
              reasonCode: 'register_mismatch',
              why: 'Nope — очень разговорное, звучит небрежно.',
            },
          ],
        },
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
              value: 'i',
              reasonCode: 'capitalization_invalid',
              why: 'Английское «я» всегда заглавное.',
            },
            {
              value: 'you',
              reasonCode: 'person_mismatch',
              why: 'Отвечаете о себе.',
            },
            {
              value: 'my',
              reasonCode: 'possessive_as_subject',
              why: 'My — «мой».',
            },
            {
              value: 'not',
              reasonCode: 'negator_as_subject',
              why: 'Not — частица, не подлежащее.',
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
              why: 'Are — к you.',
            },
            {
              value: 'is',
              reasonCode: 'agreement_person_mismatch',
              why: 'Is — к he, she, it.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'При связке do не ставят.',
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
          ],
        },
        {
          correct: 'not',
          category: 'negation',
          distractors: [
            {
              value: 'no',
              reasonCode: 'negator_type_mismatch',
              why: 'No уже сказано в начале, внутри нужен not.',
            },
            {
              value: 'never',
              reasonCode: 'meaning_mismatch',
              why: 'Never — «никогда», это про частоту.',
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
      ],
      features: [
        'copula_be',
        'first_person_singular',
        'negation_not',
        'short_answer',
      ],
    },
    {
      id: 'e01-s03-and-you',
      english: 'And you?',
      russian: 'А ты?',
      explanation:
        'Короткий способ вернуть вопрос собеседнику, не повторяя его целиком. Отвечаете и сразу спрашиваете в ответ — так разговор не обрывается.',
      words: [
        {
          correct: 'And',
          category: 'conjunction',
          distractors: [
            {
              value: 'End',
              reasonCode: 'near_homophone_confusion',
              why: 'End — «конец».',
            },
            {
              value: 'Ant',
              reasonCode: 'near_homophone_confusion',
              why: 'Ant — «муравей».',
            },
            {
              value: 'But',
              reasonCode: 'wrong_conjunction',
              why: 'But — «но», это противопоставление.',
            },
            {
              value: 'Or',
              reasonCode: 'wrong_conjunction',
              why: 'Or — «или», предлагает выбор.',
            },
            {
              value: 'An',
              reasonCode: 'spelling_invalid',
              why: 'An — артикль, а нужно слово «и».',
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
              why: 'Your — «твой», а спрашивают о человеке.',
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
              reasonCode: 'wrong_referent',
              why: 'Получилось бы «а я?».',
            },
            {
              value: 'him',
              reasonCode: 'wrong_referent',
              why: 'Спрашивают собеседника, а не третьего.',
            },
          ],
        },
      ],
      features: ['fixed_expression', 'second_person', 'turn_taking'],
    },
    {
      id: 'e01-s03-are-you-ok',
      english: 'Are you OK?',
      russian: 'Ты в порядке?',
      explanation:
        'Очень частый вопрос: спрашивают, когда человек выглядит расстроенным или споткнулся. Та же перестановка, что вы уже видели.',
      words: [
        {
          correct: 'Are',
          category: 'to-be',
          distractors: [
            {
              value: 'Do',
              reasonCode: 'wrong_auxiliary',
              why: 'Со связкой do не ставят.',
            },
            {
              value: 'Is',
              reasonCode: 'agreement_person_mismatch',
              why: 'Is — к he, she, it.',
            },
            {
              value: 'Am',
              reasonCode: 'agreement_person_mismatch',
              why: 'Am — только к I.',
            },
            {
              value: 'Be',
              reasonCode: 'infinitive_not_finite',
              why: 'Вопрос так не строят.',
            },
            {
              value: 'Were',
              reasonCode: 'tense_mismatch',
              why: 'Were — про прошлое.',
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
              value: 'yours',
              reasonCode: 'possessive_as_subject',
              why: 'Yours заменяет предмет.',
            },
            {
              value: 'me',
              reasonCode: 'object_pronoun_as_subject',
              why: 'Me не бывает подлежащим.',
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
              value: 'oky',
              reasonCode: 'spelling_invalid',
              why: 'Ошибка в написании.',
            },
            {
              value: 'okays',
              reasonCode: 'wrong_word_class',
              why: 'Признак не ставят во множественное число.',
            },
            {
              value: 'good',
              reasonCode: 'not_target_word',
              why: 'Здесь тренируем именно OK.',
            },
            {
              value: 'well',
              reasonCode: 'wrong_word_class',
              why: 'Well — наречие «хорошо».',
            },
          ],
        },
      ],
      features: ['copula_be', 'second_person', 'question_inversion'],
    },
    {
      id: 'e01-s03-you-are-not-late',
      english: 'You are not late',
      russian: 'Ты не опаздываешь',
      explanation:
        'Отрицание про собеседника: not встаёт после are точно так же, как раньше после am. Правило одно, меняется только связка.',
      words: [
        {
          correct: 'You',
          category: 'pronoun',
          distractors: [
            {
              value: 'you',
              reasonCode: 'capitalization_invalid',
              why: 'В начале предложения нужна заглавная.',
            },
            {
              value: 'Your',
              reasonCode: 'possessive_as_subject',
              why: 'Your — «твой».',
            },
            {
              value: 'I',
              reasonCode: 'person_mismatch',
              why: 'Речь о собеседнике.',
            },
            {
              value: 'Not',
              reasonCode: 'negator_as_subject',
              why: 'Not — частица, не подлежащее.',
            },
            {
              value: 'Me',
              reasonCode: 'object_pronoun_as_subject',
              why: 'Me не бывает подлежащим.',
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
              why: 'Late — признак, do здесь не нужен.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'were',
              reasonCode: 'tense_mismatch',
              why: 'Were — про прошлое.',
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
              value: 'don’t',
              reasonCode: 'wrong_auxiliary',
              why: 'При are вспомогательный do лишний.',
            },
            {
              value: 'never',
              reasonCode: 'meaning_mismatch',
              why: 'Never — «никогда».',
            },
            {
              value: 'nor',
              reasonCode: 'wrong_word_class',
              why: 'Nor соединяет два отрицания.',
            },
            {
              value: 'not a',
              reasonCode: 'extra_word',
              why: 'Перед признаком артикль не нужен.',
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
              value: 'light',
              reasonCode: 'meaning_mismatch',
              why: 'Light — «свет».',
            },
          ],
        },
      ],
      features: [
        'copula_be',
        'second_person',
        'negation_not',
        'state_adjective',
      ],
    },
    {
      id: 'e01-s03-are-you-tired',
      english: 'Are you tired?',
      russian: 'Ты устал?',
      explanation:
        'Вопрос с уже знакомым словом tired. Перестановка та же, ничего нового запоминать не нужно.',
      words: [
        {
          correct: 'Are',
          category: 'to-be',
          distractors: [
            {
              value: 'Do',
              reasonCode: 'wrong_auxiliary',
              why: 'Со связкой do не ставят.',
            },
            {
              value: 'Is',
              reasonCode: 'agreement_person_mismatch',
              why: 'Is — к he, she, it.',
            },
            {
              value: 'Am',
              reasonCode: 'agreement_person_mismatch',
              why: 'Am — только к I.',
            },
            {
              value: 'Be',
              reasonCode: 'infinitive_not_finite',
              why: 'Вопрос так не строят.',
            },
            {
              value: 'Have',
              reasonCode: 'wrong_auxiliary',
              why: 'Have — «иметь», состояние спрашивают через связку.',
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
          correct: 'tired',
          category: 'adjective',
          distractors: [
            {
              value: 'tried',
              reasonCode: 'letter_order_confusion',
              why: 'Tried — «пробовал», буквы переставлены.',
            },
            {
              value: 'tire',
              reasonCode: 'wrong_word_class',
              why: 'Tire — «шина».',
            },
            {
              value: 'tiring',
              reasonCode: 'participle_direction_wrong',
              why: 'Tiring — «утомительный», о том, что утомляет.',
            },
            {
              value: 'tiredly',
              reasonCode: 'wrong_word_class',
              why: 'Наречие, а нужен признак.',
            },
            {
              value: 'tender',
              reasonCode: 'meaning_mismatch',
              why: 'Tender — «нежный».',
            },
          ],
        },
      ],
      features: ['copula_be', 'second_person', 'question_inversion'],
    },
    {
      id: 'e01-s03-you-are-not-alone',
      english: 'You are not alone',
      russian: 'Ты не один',
      explanation:
        'Тёплая фраза поддержки, которую действительно говорят. Alone значит «один», без компании — не путайте с числом.',
      words: [
        {
          correct: 'You',
          category: 'pronoun',
          distractors: [
            {
              value: 'you',
              reasonCode: 'capitalization_invalid',
              why: 'В начале предложения нужна заглавная.',
            },
            {
              value: 'Your',
              reasonCode: 'possessive_as_subject',
              why: 'Your — «твой».',
            },
            {
              value: 'I',
              reasonCode: 'person_mismatch',
              why: 'Речь о собеседнике.',
            },
            {
              value: 'Me',
              reasonCode: 'object_pronoun_as_subject',
              why: 'Me не бывает подлежащим.',
            },
            {
              value: 'Yours',
              reasonCode: 'possessive_as_subject',
              why: 'Yours заменяет предмет.',
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
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'do',
              reasonCode: 'wrong_auxiliary',
              why: 'Alone — признак, do не нужен.',
            },
            {
              value: 'were',
              reasonCode: 'tense_mismatch',
              why: 'Were — про прошлое.',
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
              why: 'Глагол отрицают через not.',
            },
            {
              value: 'never',
              reasonCode: 'meaning_mismatch',
              why: 'Never — «никогда».',
            },
            {
              value: 'don’t',
              reasonCode: 'wrong_auxiliary',
              why: 'При are do лишний.',
            },
            {
              value: 'nor',
              reasonCode: 'wrong_word_class',
              why: 'Nor соединяет отрицания.',
            },
            {
              value: 'not a',
              reasonCode: 'extra_word',
              why: 'Перед признаком артикль не нужен.',
            },
          ],
        },
        {
          correct: 'alone',
          category: 'adjective',
          distractors: [
            {
              value: 'along',
              reasonCode: 'near_homophone_confusion',
              why: 'Along — «вдоль», предлог.',
            },
            {
              value: 'lonely',
              reasonCode: 'meaning_mismatch',
              why: 'Lonely — «одинокий», про чувство, а не про факт.',
            },
            {
              value: 'one',
              reasonCode: 'numeral_instead_of_adjective',
              why: 'One — число «один», а нужен признак.',
            },
            {
              value: 'alon',
              reasonCode: 'spelling_invalid',
              why: 'Пропущена буква e.',
            },
            {
              value: 'aloud',
              reasonCode: 'near_homophone_confusion',
              why: 'Aloud — «вслух».',
            },
          ],
        },
      ],
      features: [
        'copula_be',
        'second_person',
        'negation_not',
        'state_adjective',
      ],
    },
    {
      id: 'e01-s03-am-i-late',
      english: 'Am I late?',
      russian: 'Я опаздываю?',
      explanation:
        'Вопрос о себе: связка am уходит вперёд, как и are в вопросе о собеседнике. Правило перестановки одно на все лица.',
      words: [
        {
          correct: 'Am',
          category: 'to-be',
          distractors: [
            {
              value: 'Are',
              reasonCode: 'agreement_person_mismatch',
              why: 'Are — к you, а вопрос о себе.',
            },
            {
              value: 'Is',
              reasonCode: 'agreement_person_mismatch',
              why: 'Is — к he, she, it.',
            },
            {
              value: 'Do',
              reasonCode: 'wrong_auxiliary',
              why: 'Со связкой do не ставят.',
            },
            {
              value: 'Be',
              reasonCode: 'infinitive_not_finite',
              why: 'Вопрос так не строят.',
            },
            {
              value: 'Was',
              reasonCode: 'tense_mismatch',
              why: 'Was — про прошлое.',
            },
          ],
        },
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
              why: 'Английское «я» всегда заглавное.',
            },
            {
              value: 'my',
              reasonCode: 'possessive_as_subject',
              why: 'My — «мой».',
            },
            {
              value: 'you',
              reasonCode: 'person_mismatch',
              why: 'Вопрос о себе.',
            },
            {
              value: 'mine',
              reasonCode: 'possessive_as_subject',
              why: 'Mine человека не называет.',
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
              value: 'light',
              reasonCode: 'meaning_mismatch',
              why: 'Light — «свет».',
            },
          ],
        },
      ],
      features: [
        'copula_be',
        'first_person_singular',
        'question_inversion',
      ],
    },
    {
      id: 'e01-s03-you-are-not-busy',
      english: 'You are not busy',
      russian: 'Ты не занят',
      explanation:
        'Последняя фраза урока собирает всё вместе: собеседник, связка are, отрицание not и знакомый признак busy.',
      words: [
        {
          correct: 'You',
          category: 'pronoun',
          distractors: [
            {
              value: 'you',
              reasonCode: 'capitalization_invalid',
              why: 'В начале предложения нужна заглавная.',
            },
            {
              value: 'Your',
              reasonCode: 'possessive_as_subject',
              why: 'Your — «твой».',
            },
            {
              value: 'I',
              reasonCode: 'person_mismatch',
              why: 'Речь о собеседнике.',
            },
            {
              value: 'Me',
              reasonCode: 'object_pronoun_as_subject',
              why: 'Me не бывает подлежащим.',
            },
            {
              value: 'Not',
              reasonCode: 'negator_as_subject',
              why: 'Not — частица, не подлежащее.',
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
              why: 'Busy — признак, do не нужен.',
            },
            {
              value: 'be',
              reasonCode: 'infinitive_not_finite',
              why: 'Нужна личная форма.',
            },
            {
              value: 'were',
              reasonCode: 'tense_mismatch',
              why: 'Were — про прошлое.',
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
              why: 'Глагол отрицают через not.',
            },
            {
              value: 'don’t',
              reasonCode: 'wrong_auxiliary',
              why: 'При are do лишний.',
            },
            {
              value: 'never',
              reasonCode: 'meaning_mismatch',
              why: 'Never — «никогда».',
            },
            {
              value: 'nor',
              reasonCode: 'wrong_word_class',
              why: 'Nor соединяет отрицания.',
            },
            {
              value: 'note',
              reasonCode: 'near_homophone_confusion',
              why: 'Note — «заметка».',
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
              why: 'Лишняя буква s: правильно busy.',
            },
            {
              value: 'business',
              reasonCode: 'wrong_word_class',
              why: 'Business — «дело», существительное.',
            },
            {
              value: 'busily',
              reasonCode: 'wrong_word_class',
              why: 'Наречие «деловито».',
            },
            {
              value: 'buzy',
              reasonCode: 'spelling_invalid',
              why: 'Пишется через s.',
            },
            {
              value: 'bored',
              reasonCode: 'meaning_mismatch',
              why: 'Bored — «скучающий».',
            },
          ],
        },
      ],
      features: [
        'copula_be',
        'second_person',
        'negation_not',
        'state_adjective',
      ],
    },
  ]);
