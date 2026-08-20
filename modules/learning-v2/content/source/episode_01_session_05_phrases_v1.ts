// зачем: сессия 5 голосовая — человек впервые ПРОИЗНОСИТ то, что до сих пор
// только собирал глазами. Новых слов нет намеренно: фразы взяты из сессий 1–3,
// это активное припоминание (владелец: «используем принцип актив рекол»).
// Сложность даёт не лексика, а произношение — там, где русскоязычные спотыкаются.
import type { EpisodeSourcePhrase } from './episode_01_source_v1';

export const EPISODE_01_SESSION_05_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze([
    {
      id: 'e01-s05-i-am-here',
      english: 'I am here',
      russian: 'Я здесь',
      explanation:
        'Произнесите вслух. Главное — не проглотить am: в беглой речи оно звучит коротко, но полностью исчезнуть не может.',
      words: [
        {
          correct: 'I',
          category: 'pronoun',
          distractors: [
            { value: 'me', reasonCode: 'object_pronoun_as_subject', why: 'Me — форма дополнения, подлежащее всегда I.' },
            { value: 'my', reasonCode: 'possessive_as_subject', why: 'My — «мой», это принадлежность.' },
            { value: 'i', reasonCode: 'capitalization_invalid', why: 'Английское «я» всегда пишется заглавной буквой.' },
            { value: 'mine', reasonCode: 'possessive_as_subject', why: 'Mine человека не называет.' },
            { value: 'am', reasonCode: 'verb_as_subject', why: 'Am — глагол, на этом месте нужно подлежащее.' },
          ],
        },
        {
          correct: 'am',
          category: 'to-be',
          distractors: [
            { value: 'is', reasonCode: 'agreement_person_mismatch', why: 'Is ставят к he, she, it. Рядом с I всегда am.' },
            { value: 'are', reasonCode: 'agreement_person_mismatch', why: 'Are идёт к you, we, they.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Be — начальная форма, нужна личная.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — прошедшее «был», речь про сейчас.' },
            { value: 'im', reasonCode: 'contraction_malformed', why: 'Сокращение пишется с апострофом: I’m.' },
          ],
        },
        {
          correct: 'here',
          category: 'adverb',
          distractors: [
            { value: 'hear', reasonCode: 'homophone_confusion', why: 'Звучит одинаково, но hear — «слышать».' },
            { value: 'there', reasonCode: 'deixis_opposite', why: 'There — «там», противоположное место.' },
            { value: 'her', reasonCode: 'wrong_word_class', why: 'Her — «её», места не обозначает.' },
            { value: 'where', reasonCode: 'question_word_in_statement', why: 'Where — вопросительное «где».' },
            { value: 'hair', reasonCode: 'near_homophone_confusion', why: 'Hair — «волосы».' },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'adverb_place', 'spoken_production'],
    },
    {
      id: 'e01-s05-i-am-ready',
      english: 'I am ready',
      russian: 'Я готов',
      explanation:
        'В слове ready первый звук — не мягкое русское «р». Язык не касается нёба: он поднят и отведён назад, как будто вы начинаете рычать и передумали.',
      words: [
        {
          correct: 'I',
          category: 'pronoun',
          distractors: [
            { value: 'me', reasonCode: 'object_pronoun_as_subject', why: 'Подлежащее — только I.' },
            { value: 'my', reasonCode: 'possessive_as_subject', why: 'My — «мой».' },
            { value: 'i', reasonCode: 'capitalization_invalid', why: 'Заглавная I.' },
            { value: 'mine', reasonCode: 'possessive_as_subject', why: 'Mine человека не называет.' },
            { value: 'we', reasonCode: 'person_mismatch', why: 'We — «мы», речь об одном.' },
          ],
        },
        {
          correct: 'am',
          category: 'to-be',
          distractors: [
            { value: 'is', reasonCode: 'agreement_person_mismatch', why: 'Is — для he, she, it.' },
            { value: 'are', reasonCode: 'agreement_person_mismatch', why: 'Are — для you, we, they.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Do не соединяет «я» с признаком.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
          ],
        },
        {
          correct: 'ready',
          category: 'adjective',
          distractors: [
            { value: 'read', reasonCode: 'near_homophone_confusion', why: 'Read — «читать».' },
            { value: 'red', reasonCode: 'near_homophone_confusion', why: 'Red — «красный».' },
            { value: 'already', reasonCode: 'wrong_word_class', why: 'Already — «уже», это про время.' },
            { value: 'readily', reasonCode: 'wrong_word_class', why: 'Наречие «охотно», нужен признак.' },
            { value: 'reader', reasonCode: 'wrong_word_class', why: 'Reader — «читатель».' },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'state_adjective', 'spoken_production'],
    },
    {
      id: 'e01-s05-i-am-tired',
      english: 'I am tired',
      russian: 'Я устал',
      explanation:
        'Здесь два подводных камня: тот же английский r и окончание -ed, которое в tired звучит как один звук «д», а не как отдельный слог.',
      words: [
        {
          correct: 'I',
          category: 'pronoun',
          distractors: [
            { value: 'me', reasonCode: 'object_pronoun_as_subject', why: 'Подлежащее — I.' },
            { value: 'my', reasonCode: 'possessive_as_subject', why: 'My — «мой».' },
            { value: 'i', reasonCode: 'capitalization_invalid', why: 'Заглавная I.' },
            { value: 'am', reasonCode: 'verb_as_subject', why: 'Это глагол.' },
            { value: 'mine', reasonCode: 'possessive_as_subject', why: 'Mine человека не называет.' },
          ],
        },
        {
          correct: 'am',
          category: 'to-be',
          distractors: [
            { value: 'is', reasonCode: 'agreement_person_mismatch', why: 'Is — только к he, she, it.' },
            { value: 'are', reasonCode: 'agreement_person_mismatch', why: 'Are — к you, we, they.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'feel', reasonCode: 'wrong_verb_choice', why: 'Здесь тренируем связку am.' },
          ],
        },
        {
          correct: 'tired',
          category: 'adjective',
          distractors: [
            { value: 'tried', reasonCode: 'letter_order_confusion', why: 'Tried — «пробовал», буквы переставлены.' },
            { value: 'tire', reasonCode: 'wrong_word_class', why: 'Tire — «шина».' },
            { value: 'tiring', reasonCode: 'participle_direction_wrong', why: 'Tiring — «утомительный», о том, что утомляет других.' },
            { value: 'tiredly', reasonCode: 'wrong_word_class', why: 'Наречие, а после am нужен признак.' },
            { value: 'tender', reasonCode: 'meaning_mismatch', why: 'Tender — «нежный».' },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'state_adjective', 'spoken_production'],
    },
    {
      id: 'e01-s05-thank-you',
      english: 'Thank you',
      russian: 'Спасибо',
      explanation:
        'Самый трудный звук для русскоязычных: th в thank. Кончик языка между зубами, воздух проходит сквозь щель. Не «сэнк» и не «фэнк» — язык должно быть видно.',
      words: [
        {
          correct: 'Thank',
          category: 'verb',
          distractors: [
            { value: 'Thanks', reasonCode: 'form_mismatch_in_phrase', why: 'Thanks говорят отдельно. Внутри Thank you — без s.' },
            { value: 'Sank', reasonCode: 'th_substitution', why: 'Так слышится, если язык не между зубами. Sank — «утонул».' },
            { value: 'Fank', reasonCode: 'th_substitution', why: 'Другая частая подмена звука th. Такого слова нет.' },
            { value: 'Tank', reasonCode: 'near_homophone_confusion', why: 'Tank — «бак», «танк».' },
            { value: 'Think', reasonCode: 'near_homophone_confusion', why: 'Think — «думать».' },
          ],
        },
        {
          correct: 'you',
          category: 'pronoun',
          distractors: [
            { value: 'your', reasonCode: 'possessive_as_object', why: 'Благодарят тебя, а не твоё.' },
            { value: 'yours', reasonCode: 'possessive_as_object', why: 'Yours заменяет предмет.' },
            { value: 'u', reasonCode: 'chat_abbreviation', why: 'Форма из переписки.' },
            { value: 'me', reasonCode: 'wrong_referent', why: 'Получилось бы «спасибо мне».' },
            { value: 'yo', reasonCode: 'spelling_invalid', why: 'Не слово английского языка в этом значении.' },
          ],
        },
      ],
      features: ['fixed_expression', 'politeness', 'spoken_production'],
    },
    {
      id: 'e01-s05-nice-to-meet-you',
      english: 'Nice to meet you',
      russian: 'Приятно познакомиться',
      explanation:
        'В живой речи meet you сливается и звучит примерно как «миччу». Это нормально: носители не проговаривают каждое слово отдельно.',
      words: [
        {
          correct: 'Nice',
          category: 'adjective',
          distractors: [
            { value: 'Nise', reasonCode: 'spelling_invalid', why: 'Ошибка в написании.' },
            { value: 'Niece', reasonCode: 'near_homophone_confusion', why: 'Niece — «племянница».' },
            { value: 'Nicely', reasonCode: 'wrong_word_class', why: 'Наречие, в этой формуле нужен признак.' },
            { value: 'Ice', reasonCode: 'meaning_mismatch', why: 'Ice — «лёд».' },
            { value: 'Nine', reasonCode: 'near_homophone_confusion', why: 'Nine — «девять».' },
          ],
        },
        {
          correct: 'to',
          category: 'infinitive-marker',
          distractors: [
            { value: 'too', reasonCode: 'homophone_confusion', why: 'Too — «слишком» или «тоже».' },
            { value: 'two', reasonCode: 'homophone_confusion', why: 'Two — «два».' },
            { value: 'for', reasonCode: 'wrong_preposition', why: 'Перед глаголом в этой формуле стоит to.' },
            { value: 'at', reasonCode: 'wrong_preposition', why: 'At указывает на место или время.' },
            { value: 'do', reasonCode: 'wrong_word_class', why: 'Do — глагол, а нужна частица.' },
          ],
        },
        {
          correct: 'meet',
          category: 'verb',
          distractors: [
            { value: 'meat', reasonCode: 'homophone_confusion', why: 'Meat — «мясо», звучит одинаково.' },
            { value: 'met', reasonCode: 'tense_mismatch', why: 'Met — прошедшее. После to — начальная форма.' },
            { value: 'meets', reasonCode: 'agreement_after_infinitive', why: 'После to окончание -s не ставят.' },
            { value: 'meeting', reasonCode: 'wrong_word_form', why: 'После to нужна начальная форма.' },
            { value: 'mean', reasonCode: 'meaning_mismatch', why: 'Mean — «значить».' },
          ],
        },
        {
          correct: 'you',
          category: 'pronoun',
          distractors: [
            { value: 'your', reasonCode: 'possessive_as_object', why: 'Знакомятся с тобой, а не с твоим.' },
            { value: 'yours', reasonCode: 'possessive_as_object', why: 'Yours заменяет предмет.' },
            { value: 'u', reasonCode: 'chat_abbreviation', why: 'Форма из переписки.' },
            { value: 'me', reasonCode: 'wrong_referent', why: 'Получится «приятно познакомиться со мной».' },
            { value: 'they', reasonCode: 'wrong_referent', why: 'They — «они», речь о собеседнике.' },
          ],
        },
      ],
      features: ['fixed_expression', 'infinitive_marker', 'politeness', 'spoken_production'],
    },
    {
      id: 'e01-s05-i-am-not-sure',
      english: 'I am not sure',
      russian: 'Я не уверен',
      explanation:
        'Скажите вслух и обратите внимание на ритм: not здесь звучит сильнее остальных слов — именно оно несёт смысл отрицания.',
      words: [
        {
          correct: 'I',
          category: 'pronoun',
          distractors: [
            { value: 'me', reasonCode: 'object_pronoun_as_subject', why: 'Подлежащее — I.' },
            { value: 'my', reasonCode: 'possessive_as_subject', why: 'My — «мой».' },
            { value: 'i', reasonCode: 'capitalization_invalid', why: 'Заглавная I.' },
            { value: 'not', reasonCode: 'negator_as_subject', why: 'Not — частица, не подлежащее.' },
            { value: 'mine', reasonCode: 'possessive_as_subject', why: 'Mine не называет человека.' },
          ],
        },
        {
          correct: 'am',
          category: 'to-be',
          distractors: [
            { value: 'is', reasonCode: 'agreement_person_mismatch', why: 'Is не сочетается с I.' },
            { value: 'are', reasonCode: 'agreement_person_mismatch', why: 'Are не сочетается с I.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'С признаком отрицают через am not.' },
            { value: 'don’t', reasonCode: 'wrong_auxiliary', why: 'I don’t sure — грубая ошибка: sure не глагол.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
          ],
        },
        {
          correct: 'not',
          category: 'negation',
          distractors: [
            { value: 'no', reasonCode: 'negator_type_mismatch', why: 'No отрицает существительное, глагол — not.' },
            { value: 'don’t', reasonCode: 'wrong_auxiliary', why: 'При am вспомогательный do не нужен.' },
            { value: 'never', reasonCode: 'meaning_mismatch', why: 'Never — «никогда», это про частоту.' },
            { value: 'nor', reasonCode: 'wrong_word_class', why: 'Nor соединяет два отрицания.' },
            { value: 'note', reasonCode: 'near_homophone_confusion', why: 'Note — «заметка».' },
          ],
        },
        {
          correct: 'sure',
          category: 'adjective',
          distractors: [
            { value: 'sur', reasonCode: 'spelling_invalid', why: 'В английском такого слова нет.' },
            { value: 'shore', reasonCode: 'near_homophone_confusion', why: 'Shore — «берег».' },
            { value: 'surely', reasonCode: 'wrong_word_class', why: 'Surely — наречие «конечно».' },
            { value: 'sugar', reasonCode: 'meaning_mismatch', why: 'Похожее начало, но это «сахар».' },
            { value: 'sore', reasonCode: 'near_homophone_confusion', why: 'Sore — «болезненный».' },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'negation_not', 'state_adjective', 'spoken_production'],
    },
    {
      id: 'e01-s05-i-am-anna',
      english: 'I am Anna',
      russian: 'Я Анна',
      explanation:
        'Представьтесь вслух своим именем. В живой речи почти всегда говорят коротко: I’m — два слова сливаются в одно.',
      words: [
        {
          correct: 'I',
          category: 'pronoun',
          distractors: [
            { value: 'me', reasonCode: 'object_pronoun_as_subject', why: 'Подлежащее — только I.' },
            { value: 'my', reasonCode: 'possessive_as_subject', why: 'My — «мой».' },
            { value: 'i', reasonCode: 'capitalization_invalid', why: 'Заглавная I.' },
            { value: 'mine', reasonCode: 'possessive_as_subject', why: 'Mine человека не называет.' },
            { value: 'am', reasonCode: 'verb_as_subject', why: 'Это глагол.' },
          ],
        },
        {
          correct: 'am',
          category: 'to-be',
          distractors: [
            { value: 'is', reasonCode: 'agreement_person_mismatch', why: 'Is — к he, she, it.' },
            { value: 'are', reasonCode: 'agreement_person_mismatch', why: 'Are — к you, we, they.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'name', reasonCode: 'wrong_word_class', why: 'Name — «имя», связка всё равно нужна.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — прошедшее, а вы представляетесь сейчас.' },
          ],
        },
        {
          correct: 'Anna',
          category: 'name',
          distractors: [
            { value: 'anna', reasonCode: 'capitalization_invalid', why: 'Имена всегда с заглавной буквы.' },
            { value: 'Ana', reasonCode: 'spelling_invalid', why: 'Другое написание — другое имя.' },
            { value: 'Annas', reasonCode: 'number_mismatch', why: 'Имя не ставят во множественное число.' },
            { value: 'Anne', reasonCode: 'spelling_invalid', why: 'Anne — самостоятельное имя.' },
            { value: 'name', reasonCode: 'wrong_word_choice', why: 'Здесь называют само имя.' },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'self_introduction', 'proper_noun', 'spoken_production'],
    },
    {
      id: 'e01-s05-are-you-ready',
      english: 'Are you ready?',
      russian: 'Ты готов?',
      explanation:
        'Произнесите как вопрос: голос идёт вверх к концу фразы. Без этого подъёма носитель услышит утверждение, а не вопрос.',
      words: [
        {
          correct: 'Are',
          category: 'to-be',
          distractors: [
            { value: 'Do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
            { value: 'Is', reasonCode: 'agreement_person_mismatch', why: 'Is — к he, she, it, а здесь you.' },
            { value: 'Am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'Be', reasonCode: 'infinitive_not_finite', why: 'Вопрос так не строят.' },
            { value: 'Were', reasonCode: 'tense_mismatch', why: 'Were — про прошлое.' },
          ],
        },
        {
          correct: 'you',
          category: 'pronoun',
          distractors: [
            { value: 'your', reasonCode: 'possessive_as_subject', why: 'Your — «твой».' },
            { value: 'I', reasonCode: 'person_mismatch', why: 'Спрашивают собеседника.' },
            { value: 'yours', reasonCode: 'possessive_as_subject', why: 'Yours заменяет предмет.' },
            { value: 'u', reasonCode: 'chat_abbreviation', why: 'Форма из переписки.' },
            { value: 'me', reasonCode: 'object_pronoun_as_subject', why: 'Me не бывает подлежащим.' },
          ],
        },
        {
          correct: 'ready',
          category: 'adjective',
          distractors: [
            { value: 'read', reasonCode: 'near_homophone_confusion', why: 'Read — «читать».' },
            { value: 'red', reasonCode: 'near_homophone_confusion', why: 'Red — «красный».' },
            { value: 'already', reasonCode: 'wrong_word_class', why: 'Already — «уже».' },
            { value: 'readily', reasonCode: 'wrong_word_class', why: 'Наречие «охотно».' },
            { value: 'reading', reasonCode: 'wrong_word_form', why: 'Reading — «чтение».' },
          ],
        },
      ],
      features: ['copula_be', 'second_person', 'question_inversion', 'spoken_production'],
    },
    {
      id: 'e01-s05-yes-i-am',
      english: 'Yes, I am',
      russian: 'Да',
      explanation:
        'Короткий ответ произносят с ударением на am — именно оно подтверждает. «Yes, I AM» звучит уверенно, ровный тон — вяло.',
      words: [
        {
          correct: 'Yes',
          category: 'answer',
          distractors: [
            { value: 'Yeah', reasonCode: 'register_mismatch', why: 'Yeah — очень разговорное.' },
            { value: 'Yess', reasonCode: 'spelling_invalid', why: 'Лишняя буква s.' },
            { value: 'No', reasonCode: 'polarity_inverted', why: 'No — противоположный ответ.' },
            { value: 'Ye', reasonCode: 'spelling_invalid', why: 'Устаревшая форма.' },
            { value: 'Yep', reasonCode: 'register_mismatch', why: 'Yep — небрежно-разговорное.' },
          ],
        },
        {
          correct: 'I',
          category: 'pronoun',
          distractors: [
            { value: 'me', reasonCode: 'object_pronoun_as_subject', why: 'Подлежащее — только I.' },
            { value: 'i', reasonCode: 'capitalization_invalid', why: 'Заглавная I.' },
            { value: 'you', reasonCode: 'person_mismatch', why: 'Отвечаете о себе.' },
            { value: 'my', reasonCode: 'possessive_as_subject', why: 'My — «мой».' },
            { value: 'mine', reasonCode: 'possessive_as_subject', why: 'Mine человека не называет.' },
          ],
        },
        {
          correct: 'am',
          category: 'to-be',
          distractors: [
            { value: 'are', reasonCode: 'agreement_person_mismatch', why: 'Are — к you, а вы отвечаете о себе.' },
            { value: 'is', reasonCode: 'agreement_person_mismatch', why: 'Is — к he, she, it.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'В ответе повторяют ту же связку.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'am ready', reasonCode: 'redundant_repetition', why: 'Признак не повторяют — достаточно «Yes, I am».' },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'short_answer', 'spoken_production'],
    },
    {
      id: 'e01-s05-see-you-later',
      english: 'See you later',
      russian: 'До встречи',
      explanation:
        'В беглой речи see you часто звучит как «сию». Скажите слитно, не разделяя слова паузой — так прощаются на самом деле.',
      words: [
        {
          correct: 'See',
          category: 'verb',
          distractors: [
            { value: 'Sea', reasonCode: 'homophone_confusion', why: 'Sea — «море», звучит одинаково.' },
            { value: 'Seen', reasonCode: 'wrong_word_form', why: 'Seen — третья форма, так не прощаются.' },
            { value: 'Saw', reasonCode: 'tense_mismatch', why: 'Saw — прошедшее, а прощание про будущее.' },
            { value: 'Say', reasonCode: 'meaning_mismatch', why: 'Say — «сказать».' },
            { value: 'Sit', reasonCode: 'meaning_mismatch', why: 'Sit — «сидеть».' },
          ],
        },
        {
          correct: 'you',
          category: 'pronoun',
          distractors: [
            { value: 'your', reasonCode: 'possessive_as_object', why: 'Увидят тебя, а не твоё.' },
            { value: 'yours', reasonCode: 'possessive_as_object', why: 'Yours заменяет предмет.' },
            { value: 'u', reasonCode: 'chat_abbreviation', why: 'Сокращение из переписки.' },
            { value: 'me', reasonCode: 'wrong_referent', why: 'Смысл переворачивается.' },
            { value: 'him', reasonCode: 'wrong_referent', why: 'Прощаются с собеседником.' },
          ],
        },
        {
          correct: 'later',
          category: 'adverb',
          distractors: [
            { value: 'late', reasonCode: 'wrong_word_form', why: 'Late — «поздно». Нужно «позже» — later.' },
            { value: 'latter', reasonCode: 'near_homophone_confusion', why: 'Latter — «последний из двух».' },
            { value: 'letter', reasonCode: 'near_homophone_confusion', why: 'Letter — «письмо».' },
            { value: 'lately', reasonCode: 'meaning_mismatch', why: 'Lately — «в последнее время».' },
            { value: 'latest', reasonCode: 'wrong_word_form', why: 'Latest — «самый свежий».' },
          ],
        },
      ],
      features: ['fixed_expression', 'farewell', 'adverb_time', 'spoken_production'],
    },
    {
      id: 'e01-s05-i-am-not-late',
      english: 'I am not late',
      russian: 'Я не опаздываю',
      explanation:
        'Произнесите отрицание вслух. В быстрой речи am not сливается, но not проглатывать нельзя — иначе смысл станет противоположным.',
      words: [
        {
          correct: 'I',
          category: 'pronoun',
          distractors: [
            { value: 'me', reasonCode: 'object_pronoun_as_subject', why: 'Подлежащее — I.' },
            { value: 'not', reasonCode: 'negator_as_subject', why: 'Not — частица, не подлежащее.' },
            { value: 'my', reasonCode: 'possessive_as_subject', why: 'My — «мой».' },
            { value: 'i', reasonCode: 'capitalization_invalid', why: 'Заглавная I.' },
            { value: 'mine', reasonCode: 'possessive_as_subject', why: 'Mine человека не называет.' },
          ],
        },
        {
          correct: 'am',
          category: 'to-be',
          distractors: [
            { value: 'is', reasonCode: 'agreement_person_mismatch', why: 'Is — не для I.' },
            { value: 'are', reasonCode: 'agreement_person_mismatch', why: 'Are — не для I.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Late — признак, do здесь не нужен.' },
            { value: 'don’t', reasonCode: 'wrong_auxiliary', why: 'При связке do не ставят.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
          ],
        },
        {
          correct: 'not',
          category: 'negation',
          distractors: [
            { value: 'no', reasonCode: 'negator_type_mismatch', why: 'Глагол отрицают через not.' },
            { value: 'never', reasonCode: 'meaning_mismatch', why: 'Never — «никогда».' },
            { value: 'don’t', reasonCode: 'wrong_auxiliary', why: 'При am do лишний.' },
            { value: 'nor', reasonCode: 'wrong_word_class', why: 'Nor соединяет два отрицания.' },
            { value: 'note', reasonCode: 'near_homophone_confusion', why: 'Note — «заметка».' },
          ],
        },
        {
          correct: 'late',
          category: 'adjective',
          distractors: [
            { value: 'later', reasonCode: 'wrong_word_form', why: 'Later — «позже».' },
            { value: 'lately', reasonCode: 'wrong_word_class', why: 'Lately — «в последнее время».' },
            { value: 'latest', reasonCode: 'wrong_word_form', why: 'Latest — «самый последний».' },
            { value: 'let', reasonCode: 'near_homophone_confusion', why: 'Let — «позволить».' },
            { value: 'light', reasonCode: 'meaning_mismatch', why: 'Light — «свет».' },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'negation_not', 'state_adjective', 'spoken_production'],
    },
    {
      id: 'e01-s05-good-morning',
      english: 'Good morning',
      russian: 'Доброе утро',
      explanation:
        'Последняя фраза урока. В good morning конечное d почти не слышно — оно сливается со следующим словом. Скажите одним движением, не по слогам.',
      words: [
        {
          correct: 'Good',
          category: 'adjective',
          distractors: [
            { value: 'Well', reasonCode: 'wrong_word_class', why: 'Well — наречие «хорошо».' },
            { value: 'Goot', reasonCode: 'spelling_invalid', why: 'Ошибка в написании.' },
            { value: 'Nice', reasonCode: 'not_target_word', why: 'Nice morning так не приветствуют.' },
            { value: 'Better', reasonCode: 'wrong_word_form', why: 'Better — «лучше».' },
            { value: 'Goods', reasonCode: 'wrong_word_class', why: 'Goods — «товары».' },
          ],
        },
        {
          correct: 'morning',
          category: 'noun',
          distractors: [
            { value: 'mourning', reasonCode: 'homophone_confusion', why: 'Звучит одинаково, но значит «траур».' },
            { value: 'morninig', reasonCode: 'spelling_invalid', why: 'Перепутаны буквы.' },
            { value: 'mornings', reasonCode: 'wrong_word_form', why: 'В приветствии единственное число.' },
            { value: 'moring', reasonCode: 'spelling_invalid', why: 'Пропущена буква n.' },
            { value: 'evening', reasonCode: 'meaning_mismatch', why: 'Evening — «вечер».' },
          ],
        },
      ],
      features: ['fixed_expression', 'greeting', 'time_of_day', 'spoken_production'],
    },
    {
      id: 'e01-s05-please',
      english: 'Please',
      russian: 'Пожалуйста',
      explanation:
        'Одно слово превращает просьбу в вежливую. Ударение падает на весь слог целиком: «плиз», звук l — мягкий, кончик языка касается нёба сразу за зубами.',
      words: [
        {
          correct: 'Please',
          category: 'politeness',
          distractors: [
            { value: 'Pleas', reasonCode: 'spelling_invalid', why: 'Пропущена буква e: правильно please.' },
            { value: 'Plese', reasonCode: 'spelling_invalid', why: 'Ошибка в написании.' },
            { value: 'Pleased', reasonCode: 'wrong_word_form', why: 'Pleased — «доволен», уже другое слово.' },
            { value: 'Plies', reasonCode: 'near_homophone_confusion', why: 'Plies — «слои», не про вежливость.' },
            { value: 'Peace', reasonCode: 'near_homophone_confusion', why: 'Peace — «мир».' },
          ],
        },
      ],
      features: ['fixed_expression', 'politeness', 'spoken_production'],
    },
    {
      id: 'e01-s05-sorry',
      english: 'Sorry',
      russian: 'Извините',
      explanation:
        'Короткое извинение на каждый день. Первый звук — не русское «с», а между «с» и «ш»: язык чуть дальше от зубов, чем в русском.',
      words: [
        {
          correct: 'Sorry',
          category: 'politeness',
          distractors: [
            { value: 'Sory', reasonCode: 'spelling_invalid', why: 'Пропущена буква r: правильно sorry.' },
            { value: 'Sorri', reasonCode: 'spelling_invalid', why: 'Ошибка в написании.' },
            { value: 'Sore', reasonCode: 'near_homophone_confusion', why: 'Sore — «болезненный».' },
            { value: 'Story', reasonCode: 'near_homophone_confusion', why: 'Story — «история».' },
            { value: 'Sorrow', reasonCode: 'wrong_word_class', why: 'Sorrow — «печаль», существительное, а не извинение.' },
          ],
        },
      ],
      features: ['fixed_expression', 'politeness', 'spoken_production'],
    },
    {
      id: 'e01-s05-sorry-im-late',
      english: 'Sorry, I’m late',
      russian: 'Извините, я опоздал',
      explanation:
        'Живая фраза: короткое извинение плюс сокращение I’m, которое вы уже произносили. Сначала извинение — потом причина, порядок фиксированный.',
      words: [
        {
          correct: 'Sorry',
          category: 'politeness',
          distractors: [
            { value: 'Sory', reasonCode: 'spelling_invalid', why: 'Пропущена буква r.' },
            { value: 'Please', reasonCode: 'not_target_word', why: 'Please — просьба, а здесь нужно извинение.' },
            { value: 'Sore', reasonCode: 'near_homophone_confusion', why: 'Sore — «болезненный».' },
            { value: 'Story', reasonCode: 'near_homophone_confusion', why: 'Story — «история».' },
            { value: 'Sorrow', reasonCode: 'wrong_word_class', why: 'Sorrow — «печаль», существительное.' },
          ],
        },
        {
          correct: 'I’m',
          category: 'contraction',
          distractors: [
            { value: 'I am', reasonCode: 'not_contracted', why: 'По смыслу верно, но здесь нужна короткая форма I’m.' },
            { value: 'Im', reasonCode: 'missing_apostrophe', why: 'Без апострофа это не сокращение.' },
            { value: 'You’re', reasonCode: 'person_mismatch', why: 'You’re — сокращение для you are.' },
            { value: 'I’s', reasonCode: 'contraction_malformed', why: 'Такого сокращения не существует.' },
            { value: 'I’ll', reasonCode: 'wrong_contraction', why: 'I’ll — это «I will», другое сокращение.' },
          ],
        },
        {
          correct: 'late',
          category: 'adjective',
          distractors: [
            { value: 'later', reasonCode: 'wrong_word_form', why: 'Later — «позже».' },
            { value: 'lately', reasonCode: 'wrong_word_class', why: 'Lately — «в последнее время».' },
            { value: 'latest', reasonCode: 'wrong_word_form', why: 'Latest — «самый последний».' },
            { value: 'let', reasonCode: 'near_homophone_confusion', why: 'Let — «позволить».' },
            { value: 'light', reasonCode: 'meaning_mismatch', why: 'Light — «свет».' },
          ],
        },
      ],
      features: ['fixed_expression', 'politeness', 'copula_be', 'contraction_im', 'state_adjective', 'spoken_production'],
    },
  ]);
