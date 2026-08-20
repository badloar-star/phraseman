// зачем: сессия 8 — граница первой главы. По карте это checkpoint: НИКАКИХ новых
// конструкций, только сборка всего, что было в сессиях 1–7. Фразы намеренно
// смешивают лица (I / you / he / she / it / we / they), отрицание, вопрос и
// артикль — человек должен переключаться между ними без подсказки, а не решать
// однотипные примеры подряд.
import type { EpisodeSourcePhrase } from './episode_01_source_v1';

export const EPISODE_01_SESSION_08_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze([
    {
      id: 'e01-s08-i-am-a-student',
      english: 'I am a student',
      russian: 'Я студент',
      explanation:
        'Проверка артикля: перед профессией и занятием обязательно a. Пропустить его — самая частая ошибка русскоязычных.',
      words: [
        {
          correct: 'I',
          category: 'pronoun',
          distractors: [
            { value: 'me', reasonCode: 'object_pronoun_as_subject', why: 'Подлежащее — только I.' },
            { value: 'my', reasonCode: 'possessive_as_subject', why: 'My — «мой», это принадлежность.' },
            { value: 'i', reasonCode: 'capitalization_invalid', why: 'Английское «я» всегда с заглавной.' },
            { value: 'mine', reasonCode: 'possessive_as_subject', why: 'Mine человека не называет.' },
            { value: 'we', reasonCode: 'number_mismatch', why: 'We — «мы», а речь об одном.' },
          ],
        },
        {
          correct: 'am',
          category: 'to-be',
          distractors: [
            { value: 'is', reasonCode: 'agreement_person_mismatch', why: 'Is — к he, she, it.' },
            { value: 'are', reasonCode: 'agreement_person_mismatch', why: 'Are — к you, we, they.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
          ],
        },
        {
          correct: 'a',
          category: 'article',
          distractors: [
            { value: 'an', reasonCode: 'article_form_mismatch', why: 'An нужен перед гласным звуком, student начинается с согласного.' },
            { value: 'the', reasonCode: 'article_definiteness_wrong', why: 'The — про конкретного, известного собеседнику.' },
            { value: 'my', reasonCode: 'possessive_instead_of_article', why: 'My student — «мой студент», другой смысл.' },
            { value: 'one', reasonCode: 'numeral_instead_of_article', why: 'One — число «один».' },
            { value: 'some', reasonCode: 'quantifier_instead_of_article', why: 'Some — «несколько».' },
          ],
        },
        {
          correct: 'student',
          category: 'noun',
          distractors: [
            { value: 'students', reasonCode: 'number_mismatch', why: 'После a всегда единственное число.' },
            { value: 'studen', reasonCode: 'spelling_invalid', why: 'Пропущена буква t.' },
            { value: 'studying', reasonCode: 'wrong_word_class', why: 'Studying — «учёба», нужно название человека.' },
            { value: 'study', reasonCode: 'wrong_word_class', why: 'Study — «учиться», глагол.' },
            { value: 'teacher', reasonCode: 'meaning_mismatch', why: 'Teacher — «учитель», другая роль.' },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'indefinite_article', 'noun_predicate'],
    },
    {
      id: 'e01-s08-she-is-not-busy',
      english: 'She is not busy',
      russian: 'Она не занята',
      explanation:
        'Три вещи сразу: третье лицо, связка is и отрицание. Порядок жёсткий — сначала кто, потом связка, потом not.',
      words: [
        {
          correct: 'She',
          category: 'pronoun',
          distractors: [
            { value: 'Her', reasonCode: 'object_pronoun_as_subject', why: 'Her — форма дополнения, а не подлежащее.' },
            { value: 'He', reasonCode: 'gender_mismatch', why: 'He — «он», а речь о женщине.' },
            { value: 'Hers', reasonCode: 'possessive_as_subject', why: 'Hers заменяет предмет.' },
            { value: 'It', reasonCode: 'animacy_mismatch', why: 'It — про предмет, не про человека.' },
            { value: 'she', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'are', reasonCode: 'agreement_person_mismatch', why: 'Are — к you, we, they.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Busy — признак, do здесь не нужен.' },
            { value: 'doesn’t', reasonCode: 'wrong_auxiliary', why: 'При связке вспомогательный глагол лишний.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
          ],
        },
        {
          correct: 'not',
          category: 'negation',
          distractors: [
            { value: 'no', reasonCode: 'negator_type_mismatch', why: 'Глагол отрицают через not.' },
            { value: 'never', reasonCode: 'meaning_mismatch', why: 'Never — «никогда», это про частоту.' },
            { value: 'doesn’t', reasonCode: 'wrong_auxiliary', why: 'При is do не ставят.' },
            { value: 'nor', reasonCode: 'wrong_word_class', why: 'Nor соединяет два отрицания.' },
            { value: 'note', reasonCode: 'near_homophone_confusion', why: 'Note — «заметка».' },
          ],
        },
        {
          correct: 'busy',
          category: 'adjective',
          distractors: [
            { value: 'busies', reasonCode: 'adjective_pluralized', why: 'Признаки не получают s.' },
            { value: 'bussy', reasonCode: 'spelling_invalid', why: 'Лишняя буква s.' },
            { value: 'business', reasonCode: 'wrong_word_class', why: 'Business — «дело».' },
            { value: 'busily', reasonCode: 'wrong_word_class', why: 'Наречие «деловито».' },
            { value: 'bored', reasonCode: 'meaning_mismatch', why: 'Bored — «скучающий».' },
          ],
        },
      ],
      features: ['copula_be', 'third_person_pronoun', 'negation_not', 'state_adjective'],
    },
    {
      id: 'e01-s08-where-are-you',
      english: 'Where are you?',
      russian: 'Ты где?',
      explanation:
        'Вопросительное слово впереди, потом связка, потом человек. Схема из сессии 4, теперь без подсказки.',
      words: [
        {
          correct: 'Where',
          category: 'question-word',
          distractors: [
            { value: 'What', reasonCode: 'wrong_question_word', why: 'What — «что», а спрашивают о месте.' },
            { value: 'How', reasonCode: 'wrong_question_word', why: 'How — «как», о состоянии.' },
            { value: 'When', reasonCode: 'wrong_question_word', why: 'When — «когда», о времени.' },
            { value: 'Were', reasonCode: 'near_homophone_confusion', why: 'Were — форма глагола, не вопрос.' },
            { value: 'Wear', reasonCode: 'homophone_confusion', why: 'Wear — «носить одежду».' },
          ],
        },
        {
          correct: 'are',
          category: 'to-be',
          distractors: [
            { value: 'is', reasonCode: 'agreement_person_mismatch', why: 'Is — к he, she, it.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'were', reasonCode: 'tense_mismatch', why: 'Were — про прошлое.' },
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
      ],
      features: ['question_word', 'copula_be', 'second_person'],
    },
    {
      id: 'e01-s08-they-are-here-now',
      english: 'They are here now',
      russian: 'Они уже здесь',
      explanation:
        'Множественное число плюс слово о времени в конце. Проверяет и связку are, и порядок слов.',
      words: [
        {
          correct: 'They',
          category: 'pronoun',
          distractors: [
            { value: 'Them', reasonCode: 'object_pronoun_as_subject', why: 'Them — форма дополнения.' },
            { value: 'Their', reasonCode: 'possessive_as_subject', why: 'Their — «их» как принадлежность.' },
            { value: 'He', reasonCode: 'number_mismatch', why: 'He — один человек.' },
            { value: 'We', reasonCode: 'person_mismatch', why: 'We включает говорящего.' },
            { value: 'they', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'are',
          category: 'to-be',
          distractors: [
            { value: 'is', reasonCode: 'agreement_number_mismatch', why: 'Их несколько, значит are.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'were', reasonCode: 'tense_mismatch', why: 'Were — про прошлое.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
          ],
        },
        {
          correct: 'here',
          category: 'adverb',
          distractors: [
            { value: 'hear', reasonCode: 'homophone_confusion', why: 'Hear — «слышать».' },
            { value: 'there', reasonCode: 'deixis_opposite', why: 'There — «там».' },
            { value: 'her', reasonCode: 'wrong_word_class', why: 'Her — «её».' },
            { value: 'where', reasonCode: 'question_word_in_statement', why: 'Where — вопросительное слово.' },
            { value: 'hair', reasonCode: 'near_homophone_confusion', why: 'Hair — «волосы».' },
          ],
        },
        {
          correct: 'now',
          category: 'adverb',
          distractors: [
            { value: 'know', reasonCode: 'homophone_confusion', why: 'Know — «знать», звучит одинаково.' },
            { value: 'no', reasonCode: 'near_homophone_confusion', why: 'No — «нет».' },
            { value: 'new', reasonCode: 'near_homophone_confusion', why: 'New — «новый».' },
            { value: 'nowadays', reasonCode: 'wrong_word_form', why: 'Nowadays — «в наши дни».' },
            { value: 'nov', reasonCode: 'spelling_invalid', why: 'Такого слова нет.' },
          ],
        },
      ],
      features: ['plural_pronoun', 'copula_be', 'adverb_place', 'adverb_time'],
    },
    {
      id: 'e01-s08-is-he-your-friend',
      english: 'Is he your friend?',
      russian: 'Он твой друг?',
      explanation:
        'Вопрос перестановкой плюс слово your перед предметом. Артикля здесь нет — your его заменяет.',
      words: [
        {
          correct: 'Is',
          category: 'to-be',
          distractors: [
            { value: 'Are', reasonCode: 'agreement_person_mismatch', why: 'He — один, значит is.' },
            { value: 'Am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'Do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
            { value: 'Be', reasonCode: 'infinitive_not_finite', why: 'Вопрос так не строят.' },
            { value: 'Was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
          ],
        },
        {
          correct: 'he',
          category: 'pronoun',
          distractors: [
            { value: 'him', reasonCode: 'object_pronoun_as_subject', why: 'Him — форма дополнения.' },
            { value: 'his', reasonCode: 'possessive_as_subject', why: 'His — «его», принадлежность.' },
            { value: 'she', reasonCode: 'gender_mismatch', why: 'She — «она».' },
            { value: 'they', reasonCode: 'number_mismatch', why: 'They — несколько человек.' },
            { value: 'it', reasonCode: 'animacy_mismatch', why: 'It — про предмет.' },
          ],
        },
        {
          correct: 'your',
          category: 'possessive',
          distractors: [
            { value: 'you', reasonCode: 'pronoun_instead_of_possessive', why: 'Перед предметом ставят your.' },
            { value: 'yours', reasonCode: 'possessive_pronoun_before_noun', why: 'Yours стоит без существительного.' },
            { value: 'my', reasonCode: 'wrong_referent', why: 'My — «мой», а спрашивают о собеседнике.' },
            { value: 'a your', reasonCode: 'article_with_possessive', why: 'Артикль и your вместе не ставят.' },
            { value: 'ur', reasonCode: 'chat_abbreviation', why: 'Сокращение из переписки.' },
          ],
        },
        {
          correct: 'friend',
          category: 'noun',
          distractors: [
            { value: 'friends', reasonCode: 'number_mismatch', why: 'Спрашивают про одного человека.' },
            { value: 'freind', reasonCode: 'spelling_invalid', why: 'Переставлены буквы.' },
            { value: 'friendly', reasonCode: 'wrong_word_class', why: 'Friendly — «дружелюбный».' },
            { value: 'frend', reasonCode: 'spelling_invalid', why: 'Пропущена буква i.' },
            { value: 'friendship', reasonCode: 'wrong_word_class', why: 'Friendship — «дружба».' },
          ],
        },
      ],
      features: ['copula_be', 'third_person_pronoun', 'question_inversion', 'possessive_your'],
    },
    {
      id: 'e01-s08-we-are-not-ready',
      english: 'We are not ready',
      russian: 'Мы не готовы',
      explanation:
        'Множественное число с отрицанием. Признак ready остаётся без s — сколько бы вас ни было.',
      words: [
        {
          correct: 'We',
          category: 'pronoun',
          distractors: [
            { value: 'Us', reasonCode: 'object_pronoun_as_subject', why: 'Us не бывает подлежащим.' },
            { value: 'Our', reasonCode: 'possessive_as_subject', why: 'Our — «наш».' },
            { value: 'They', reasonCode: 'person_mismatch', why: 'They не включает говорящего.' },
            { value: 'I', reasonCode: 'number_mismatch', why: 'I — один человек.' },
            { value: 'we', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'are',
          category: 'to-be',
          distractors: [
            { value: 'is', reasonCode: 'agreement_number_mismatch', why: 'Is — для одного.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'При связке do не ставят.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'were', reasonCode: 'tense_mismatch', why: 'Were — про прошлое.' },
          ],
        },
        {
          correct: 'not',
          category: 'negation',
          distractors: [
            { value: 'no', reasonCode: 'negator_type_mismatch', why: 'Глагол отрицают через not.' },
            { value: 'never', reasonCode: 'meaning_mismatch', why: 'Never — «никогда».' },
            { value: 'don’t', reasonCode: 'wrong_auxiliary', why: 'При are do лишний.' },
            { value: 'nor', reasonCode: 'wrong_word_class', why: 'Nor соединяет два отрицания.' },
            { value: 'note', reasonCode: 'near_homophone_confusion', why: 'Note — «заметка».' },
          ],
        },
        {
          correct: 'ready',
          category: 'adjective',
          distractors: [
            { value: 'readys', reasonCode: 'adjective_pluralized', why: 'Признаки не получают s.' },
            { value: 'read', reasonCode: 'near_homophone_confusion', why: 'Read — «читать».' },
            { value: 'red', reasonCode: 'near_homophone_confusion', why: 'Red — «красный».' },
            { value: 'already', reasonCode: 'wrong_word_class', why: 'Already — «уже».' },
            { value: 'readily', reasonCode: 'wrong_word_class', why: 'Наречие «охотно».' },
          ],
        },
      ],
      features: ['plural_pronoun', 'copula_be', 'negation_not', 'state_adjective'],
    },
    {
      id: 'e01-s08-what-is-your-name',
      english: 'What is your name?',
      russian: 'Как тебя зовут?',
      explanation:
        'Главная ловушка первой главы: по-русски «как», по-английски What. Если рука тянется к How — вернитесь к сессии 4.',
      words: [
        {
          correct: 'What',
          category: 'question-word',
          distractors: [
            { value: 'How', reasonCode: 'wrong_question_word', why: 'Дословный перевод с русского. Англичане спрашивают «какое твоё имя».' },
            { value: 'Who', reasonCode: 'wrong_question_word', why: 'Who — «кто», о человеке, а не об имени.' },
            { value: 'Where', reasonCode: 'wrong_question_word', why: 'Where — «где».' },
            { value: 'Which', reasonCode: 'wrong_question_word', why: 'Which нужен при выборе из известных вариантов.' },
            { value: 'Wat', reasonCode: 'spelling_invalid', why: 'Пропущена буква h.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'are', reasonCode: 'agreement_person_mismatch', why: 'Name — один предмет, значит is.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
          ],
        },
        {
          correct: 'your',
          category: 'possessive',
          distractors: [
            { value: 'you', reasonCode: 'pronoun_instead_of_possessive', why: 'Перед предметом ставят your.' },
            { value: 'yours', reasonCode: 'possessive_pronoun_before_noun', why: 'Yours стоит без существительного.' },
            { value: 'my', reasonCode: 'wrong_referent', why: 'My — «мой».' },
            { value: 'ur', reasonCode: 'chat_abbreviation', why: 'Сокращение из переписки.' },
            { value: 'the', reasonCode: 'article_instead_of_possessive', why: 'Спрашивают именно про твоё имя.' },
          ],
        },
        {
          correct: 'name',
          category: 'noun',
          distractors: [
            { value: 'names', reasonCode: 'number_mismatch', why: 'Имя одно, множественное число здесь не нужно.' },
            { value: 'nane', reasonCode: 'spelling_invalid', why: 'Ошибка в написании.' },
            { value: 'named', reasonCode: 'wrong_word_form', why: 'Named — «названный».' },
            { value: 'game', reasonCode: 'near_homophone_confusion', why: 'Game — «игра».' },
            { value: 'nam', reasonCode: 'spelling_invalid', why: 'Пропущена буква e.' },
          ],
        },
      ],
      features: ['question_word', 'copula_be', 'possessive_your', 'third_person_singular'],
    },
    {
      id: 'e01-s08-it-is-not-cold',
      english: 'It is not cold',
      russian: 'Не холодно',
      explanation:
        'О погоде говорят через it — по-русски слова «оно» нет, а по-английски без него фраза не существует.',
      words: [
        {
          correct: 'It',
          category: 'pronoun',
          distractors: [
            { value: 'He', reasonCode: 'animacy_mismatch', why: 'He — про человека.' },
            { value: 'She', reasonCode: 'animacy_mismatch', why: 'She — про женщину.' },
            { value: 'Its', reasonCode: 'possessive_as_subject', why: 'Its — принадлежность.' },
            { value: 'This', reasonCode: 'wrong_word_choice', why: 'О погоде говорят it.' },
            { value: 'it', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'are', reasonCode: 'agreement_person_mismatch', why: 'Are — к you, we, they.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'При связке do не ставят.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
          ],
        },
        {
          correct: 'not',
          category: 'negation',
          distractors: [
            { value: 'no', reasonCode: 'negator_type_mismatch', why: 'Глагол отрицают через not.' },
            { value: 'never', reasonCode: 'meaning_mismatch', why: 'Never — «никогда».' },
            { value: 'doesn’t', reasonCode: 'wrong_auxiliary', why: 'При is do не ставят.' },
            { value: 'nor', reasonCode: 'wrong_word_class', why: 'Nor соединяет два отрицания.' },
            { value: 'note', reasonCode: 'near_homophone_confusion', why: 'Note — «заметка».' },
          ],
        },
        {
          correct: 'cold',
          category: 'adjective',
          distractors: [
            { value: 'cool', reasonCode: 'meaning_mismatch', why: 'Cool — «прохладный».' },
            { value: 'colder', reasonCode: 'wrong_word_form', why: 'Colder — «холоднее».' },
            { value: 'coldly', reasonCode: 'wrong_word_class', why: 'Наречие о манере.' },
            { value: 'called', reasonCode: 'near_homophone_confusion', why: 'Called — «названный».' },
            { value: 'gold', reasonCode: 'near_homophone_confusion', why: 'Gold — «золото».' },
          ],
        },
      ],
      features: ['third_person_pronoun', 'copula_be', 'negation_not', 'state_adjective'],
    },
    {
      id: 'e01-s08-are-you-a-teacher',
      english: 'Are you a teacher?',
      russian: 'Ты учитель?',
      explanation:
        'Вопрос о профессии: перестановка плюс артикль. Оба правила из первой главы работают одновременно.',
      words: [
        {
          correct: 'Are',
          category: 'to-be',
          distractors: [
            { value: 'Is', reasonCode: 'agreement_person_mismatch', why: 'Is — к he, she, it.' },
            { value: 'Am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'Do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
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
          correct: 'a',
          category: 'article',
          distractors: [
            { value: 'an', reasonCode: 'article_form_mismatch', why: 'An — перед гласным звуком.' },
            { value: 'the', reasonCode: 'article_definiteness_wrong', why: 'The — про конкретного, известного.' },
            { value: 'your', reasonCode: 'possessive_instead_of_article', why: 'Your teacher — «твой учитель», другой смысл.' },
            { value: 'one', reasonCode: 'numeral_instead_of_article', why: 'One — число «один».' },
            { value: 'some', reasonCode: 'quantifier_instead_of_article', why: 'Some — «несколько».' },
          ],
        },
        {
          correct: 'teacher',
          category: 'noun',
          distractors: [
            { value: 'teachers', reasonCode: 'number_mismatch', why: 'После a единственное число.' },
            { value: 'teach', reasonCode: 'wrong_word_class', why: 'Teach — «учить», глагол.' },
            { value: 'teaching', reasonCode: 'wrong_word_form', why: 'После артикля нужно существительное.' },
            { value: 'techer', reasonCode: 'spelling_invalid', why: 'Пропущена буква a.' },
            { value: 'student', reasonCode: 'meaning_mismatch', why: 'Student — «студент».' },
          ],
        },
      ],
      features: ['copula_be', 'second_person', 'question_inversion', 'indefinite_article', 'noun_predicate'],
    },
    {
      id: 'e01-s08-he-is-my-brother',
      english: 'He is my brother',
      russian: 'Он мой брат',
      explanation:
        'Третье лицо плюс принадлежность. Артикль не нужен: my уже заняло его место.',
      words: [
        {
          correct: 'He',
          category: 'pronoun',
          distractors: [
            { value: 'Him', reasonCode: 'object_pronoun_as_subject', why: 'Him — форма дополнения.' },
            { value: 'His', reasonCode: 'possessive_as_subject', why: 'His — «его», принадлежность.' },
            { value: 'She', reasonCode: 'gender_mismatch', why: 'She — «она».' },
            { value: 'It', reasonCode: 'animacy_mismatch', why: 'It — про предмет.' },
            { value: 'he', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'are', reasonCode: 'agreement_person_mismatch', why: 'Are — к you, we, they.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'has', reasonCode: 'wrong_auxiliary', why: 'Кто он — говорят через быть.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
          ],
        },
        {
          correct: 'my',
          category: 'possessive',
          distractors: [
            { value: 'mine', reasonCode: 'possessive_pronoun_before_noun', why: 'Mine стоит без существительного.' },
            { value: 'me', reasonCode: 'pronoun_instead_of_possessive', why: 'Me — форма дополнения.' },
            { value: 'I', reasonCode: 'pronoun_instead_of_possessive', why: 'Перед предметом нужно my.' },
            { value: 'a my', reasonCode: 'article_with_possessive', why: 'Артикль и my вместе не ставят.' },
            { value: 'his', reasonCode: 'wrong_referent', why: 'His — «его», а брат ваш.' },
          ],
        },
        {
          correct: 'brother',
          category: 'noun',
          distractors: [
            { value: 'brothers', reasonCode: 'number_mismatch', why: 'Брат один, значит без окончания s.' },
            { value: 'brather', reasonCode: 'spelling_invalid', why: 'Ошибка в написании.' },
            { value: 'bother', reasonCode: 'near_homophone_confusion', why: 'Bother — «беспокоить».' },
            { value: 'brothe', reasonCode: 'spelling_invalid', why: 'Пропущена буква r.' },
            { value: 'sister', reasonCode: 'meaning_mismatch', why: 'Sister — «сестра».' },
          ],
        },
      ],
      features: ['third_person_pronoun', 'copula_be', 'possessive_my', 'noun_predicate'],
    },
    {
      id: 'e01-s08-how-are-you',
      english: 'How are you?',
      russian: 'Как дела?',
      explanation:
        'Здесь как раз How — потому что спрашивают о состоянии, а не об имени. Сравните с фразой про name выше.',
      words: [
        {
          correct: 'How',
          category: 'question-word',
          distractors: [
            { value: 'What', reasonCode: 'wrong_question_word', why: 'What спрашивает об имени или предмете, а тут о состоянии.' },
            { value: 'Where', reasonCode: 'wrong_question_word', why: 'Where — «где».' },
            { value: 'Who', reasonCode: 'wrong_question_word', why: 'Who — «кто».' },
            { value: 'When', reasonCode: 'wrong_question_word', why: 'When — «когда».' },
            { value: 'Hou', reasonCode: 'spelling_invalid', why: 'Ошибка в написании.' },
          ],
        },
        {
          correct: 'are',
          category: 'to-be',
          distractors: [
            { value: 'is', reasonCode: 'agreement_person_mismatch', why: 'Is — к he, she, it.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'were', reasonCode: 'tense_mismatch', why: 'Were — про прошлое.' },
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
      ],
      features: ['question_word', 'copula_be', 'second_person'],
    },
    {
      id: 'e01-s08-yes-i-am-a-student',
      english: 'Yes, I am a student',
      russian: 'Да, я студент',
      explanation:
        'Финальная фраза главы: ответ на вопрос о профессии. Всё вместе — согласие, связка, артикль. Если собрали её сами, первая глава пройдена.',
      words: [
        {
          correct: 'Yes',
          category: 'answer',
          distractors: [
            { value: 'Yeah', reasonCode: 'register_mismatch', why: 'Yeah — очень разговорное.' },
            { value: 'Yess', reasonCode: 'spelling_invalid', why: 'Лишняя буква s.' },
            { value: 'No', reasonCode: 'polarity_inverted', why: 'No — противоположный ответ.' },
            { value: 'Yep', reasonCode: 'register_mismatch', why: 'Yep — небрежно-разговорное.' },
            { value: 'Ye', reasonCode: 'spelling_invalid', why: 'Устаревшая форма.' },
          ],
        },
        {
          correct: 'I',
          category: 'pronoun',
          distractors: [
            { value: 'me', reasonCode: 'object_pronoun_as_subject', why: 'Подлежащее — только I.' },
            { value: 'i', reasonCode: 'capitalization_invalid', why: 'Английское «я» всегда с заглавной.' },
            { value: 'my', reasonCode: 'possessive_as_subject', why: 'My — «мой».' },
            { value: 'you', reasonCode: 'person_mismatch', why: 'Отвечаете о себе.' },
            { value: 'mine', reasonCode: 'possessive_as_subject', why: 'Mine человека не называет.' },
          ],
        },
        {
          correct: 'am',
          category: 'to-be',
          distractors: [
            { value: 'is', reasonCode: 'agreement_person_mismatch', why: 'Is — к he, she, it.' },
            { value: 'are', reasonCode: 'agreement_person_mismatch', why: 'Are — к you, we, they.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
          ],
        },
        {
          correct: 'a',
          category: 'article',
          distractors: [
            { value: 'an', reasonCode: 'article_form_mismatch', why: 'An — перед гласным звуком.' },
            { value: 'the', reasonCode: 'article_definiteness_wrong', why: 'The — про конкретного, известного.' },
            { value: 'my', reasonCode: 'possessive_instead_of_article', why: 'My student — «мой студент».' },
            { value: 'one', reasonCode: 'numeral_instead_of_article', why: 'One — число «один».' },
            { value: 'some', reasonCode: 'quantifier_instead_of_article', why: 'Some — «несколько».' },
          ],
        },
        {
          correct: 'student',
          category: 'noun',
          distractors: [
            { value: 'students', reasonCode: 'number_mismatch', why: 'После a единственное число.' },
            { value: 'studen', reasonCode: 'spelling_invalid', why: 'Пропущена буква t.' },
            { value: 'study', reasonCode: 'wrong_word_class', why: 'Study — «учиться», глагол.' },
            { value: 'studying', reasonCode: 'wrong_word_class', why: 'Studying — «учёба».' },
            { value: 'teacher', reasonCode: 'meaning_mismatch', why: 'Teacher — «учитель».' },
          ],
        },
      ],
      features: [
        'copula_be',
        'first_person_singular',
        'short_answer',
        'indefinite_article',
        'noun_predicate',
      ],
    },

    // ── Ещё повторение: лица вперемешку ───────────────────────────────────
    {
      id: 'e01-s08-we-are-not-late',
      english: 'We are not late',
      russian: 'Мы не опаздываем',
      explanation:
        'Множественное число we с отрицанием — то же правило, что и у одного человека, только связка are вместо am или is.',
      words: [
        {
          correct: 'We',
          category: 'pronoun',
          distractors: [
            { value: 'Us', reasonCode: 'object_pronoun_as_subject', why: 'Us не бывает подлежащим.' },
            { value: 'Our', reasonCode: 'possessive_as_subject', why: 'Our — «наш».' },
            { value: 'They', reasonCode: 'person_mismatch', why: 'They не включает говорящего.' },
            { value: 'I', reasonCode: 'number_mismatch', why: 'I — один человек.' },
            { value: 'we', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'are',
          category: 'to-be',
          distractors: [
            { value: 'is', reasonCode: 'agreement_number_mismatch', why: 'Is — для одного.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'При связке do не ставят.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'were', reasonCode: 'tense_mismatch', why: 'Were — про прошлое.' },
          ],
        },
        {
          correct: 'not',
          category: 'negation',
          distractors: [
            { value: 'no', reasonCode: 'negator_type_mismatch', why: 'Глагол отрицают через not.' },
            { value: 'never', reasonCode: 'meaning_mismatch', why: 'Never — «никогда».' },
            { value: "don't", reasonCode: 'wrong_auxiliary', why: 'При are do лишний.' },
            { value: 'nor', reasonCode: 'wrong_word_class', why: 'Nor соединяет два отрицания.' },
            { value: 'note', reasonCode: 'near_homophone_confusion', why: 'Note — «заметка».' },
          ],
        },
        {
          correct: 'late',
          category: 'adjective',
          distractors: [
            { value: 'later', reasonCode: 'wrong_word_form', why: 'Later — «позже».' },
            { value: 'lates', reasonCode: 'adjective_pluralized', why: 'Признаки не получают s.' },
            { value: 'lately', reasonCode: 'wrong_word_class', why: 'Lately — «в последнее время».' },
            { value: 'latest', reasonCode: 'wrong_word_form', why: 'Latest — «самый последний».' },
            { value: 'let', reasonCode: 'near_homophone_confusion', why: 'Let — «позволить».' },
          ],
        },
      ],
      features: ['plural_pronoun', 'copula_be', 'negation_not', 'state_adjective'],
    },
    {
      id: 'e01-s08-im-not-a-teacher',
      english: "I'm not a teacher",
      russian: 'Я не учитель',
      explanation:
        'Сокращение, отрицание и артикль вместе — три правила первой главы в одной короткой фразе.',
      words: [
        {
          correct: "I'm",
          category: 'to-be',
          distractors: [
            { value: 'Im', reasonCode: 'apostrophe_missing', why: 'Без апострофа это опечатка.' },
            { value: "I'am", reasonCode: 'apostrophe_placement', why: 'Апостроф стоит не на том месте.' },
            { value: "You're", reasonCode: 'person_mismatch', why: "You're относится к «ты»." },
            { value: "He's", reasonCode: 'person_mismatch', why: "He's относится к «он»." },
            { value: 'Am', reasonCode: 'contraction_missing', why: 'Без I это не сокращение.' },
          ],
        },
        {
          correct: 'not',
          category: 'negation',
          distractors: [
            { value: 'no', reasonCode: 'negator_type_mismatch', why: 'Глагол отрицают через not.' },
            { value: 'never', reasonCode: 'meaning_mismatch', why: 'Never — «никогда».' },
            { value: "don't", reasonCode: 'wrong_auxiliary', why: 'При связке be do не ставят.' },
            { value: 'nor', reasonCode: 'wrong_word_class', why: 'Nor соединяет два отрицания.' },
            { value: 'note', reasonCode: 'near_homophone_confusion', why: 'Note — «заметка».' },
          ],
        },
        {
          correct: 'a',
          category: 'article',
          distractors: [
            { value: 'an', reasonCode: 'article_form_mismatch', why: 'An — перед гласным звуком, teacher начинается с согласного.' },
            { value: 'the', reasonCode: 'article_definiteness_wrong', why: 'The — про конкретного, известного.' },
            { value: 'my', reasonCode: 'possessive_instead_of_article', why: 'My teacher — «мой учитель».' },
            { value: 'one', reasonCode: 'numeral_instead_of_article', why: 'One — число «один».' },
            { value: 'some', reasonCode: 'quantifier_instead_of_article', why: 'Some — «несколько».' },
          ],
        },
        {
          correct: 'teacher',
          category: 'noun',
          distractors: [
            { value: 'teachers', reasonCode: 'number_mismatch', why: 'После a единственное число.' },
            { value: 'teach', reasonCode: 'wrong_word_class', why: 'Teach — «учить», глагол.' },
            { value: 'teaching', reasonCode: 'wrong_word_form', why: 'После артикля нужно существительное.' },
            { value: 'techer', reasonCode: 'spelling_invalid', why: 'Пропущена буква a.' },
            { value: 'student', reasonCode: 'meaning_mismatch', why: 'Student — «студент».' },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'negation_not', 'indefinite_article', 'noun_predicate', 'contraction'],
    },
    {
      id: 'e01-s08-they-are-not-busy-now',
      english: 'They are not busy now',
      russian: 'Они сейчас не заняты',
      explanation:
        'Множественное число, отрицание и слово о времени в конце — всё вместе, без новых правил, только сборка старых.',
      words: [
        {
          correct: 'They',
          category: 'pronoun',
          distractors: [
            { value: 'Them', reasonCode: 'object_pronoun_as_subject', why: 'Them — форма дополнения.' },
            { value: 'Their', reasonCode: 'possessive_as_subject', why: 'Their — «их» как принадлежность.' },
            { value: 'We', reasonCode: 'person_mismatch', why: 'We включает говорящего.' },
            { value: 'He', reasonCode: 'number_mismatch', why: 'He — один человек.' },
            { value: 'they', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'are',
          category: 'to-be',
          distractors: [
            { value: 'is', reasonCode: 'agreement_number_mismatch', why: 'Их несколько, значит are.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'were', reasonCode: 'tense_mismatch', why: 'Were — про прошлое.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
          ],
        },
        {
          correct: 'not',
          category: 'negation',
          distractors: [
            { value: 'no', reasonCode: 'negator_type_mismatch', why: 'Глагол отрицают через not.' },
            { value: 'never', reasonCode: 'meaning_mismatch', why: 'Never — «никогда».' },
            { value: "don't", reasonCode: 'wrong_auxiliary', why: 'При are do лишний.' },
            { value: 'nor', reasonCode: 'wrong_word_class', why: 'Nor соединяет два отрицания.' },
            { value: 'note', reasonCode: 'near_homophone_confusion', why: 'Note — «заметка».' },
          ],
        },
        {
          correct: 'busy',
          category: 'adjective',
          distractors: [
            { value: 'busies', reasonCode: 'adjective_pluralized', why: 'Признаки не получают s.' },
            { value: 'bussy', reasonCode: 'spelling_invalid', why: 'Лишняя буква s.' },
            { value: 'business', reasonCode: 'wrong_word_class', why: 'Business — «дело».' },
            { value: 'busily', reasonCode: 'wrong_word_class', why: 'Наречие «деловито».' },
            { value: 'bored', reasonCode: 'meaning_mismatch', why: 'Bored — «скучающий».' },
          ],
        },
        {
          correct: 'now',
          category: 'adverb',
          distractors: [
            { value: 'know', reasonCode: 'homophone_confusion', why: 'Know — «знать», звучит одинаково.' },
            { value: 'no', reasonCode: 'near_homophone_confusion', why: 'No — «нет».' },
            { value: 'new', reasonCode: 'near_homophone_confusion', why: 'New — «новый».' },
            { value: 'nowadays', reasonCode: 'wrong_word_form', why: 'Nowadays — «в наши дни».' },
            { value: 'nov', reasonCode: 'spelling_invalid', why: 'Такого слова нет.' },
          ],
        },
      ],
      features: ['plural_pronoun', 'copula_be', 'negation_not', 'state_adjective', 'adverb_time'],
    },
  ]);
