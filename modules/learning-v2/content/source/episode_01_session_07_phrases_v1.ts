// зачем: сессия 7 типа words_then_phrases — слова we / they / plural -s вводятся
// карточками, дальше идут фразы из них. Здесь закрывается последняя дырка в
// связке: человек знает am, is и are для «ты», но ещё не встречал are для «мы»
// и «они». После этой сессии таблица to be закрыта полностью.
import type { EpisodeSourcePhrase } from './episode_01_source_v1';

export const EPISODE_01_SESSION_07_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze([
    // ── Слова ──────────────────────────────────────────────────────────────
    {
      id: 'e01-s07-word-we',
      english: 'We',
      russian: 'Мы',
      explanation:
        'Я и кто-то ещё. Звучит как «уи», а не «ве»: губы вытянуты трубочкой, зубы нижнюю губу не трогают.',
      words: [
        {
          correct: 'We',
          category: 'pronoun',
          distractors: [
            { value: 'Us', reasonCode: 'object_pronoun_as_subject', why: 'Us — форма дополнения, «нас» и «нам».' },
            { value: 'Our', reasonCode: 'possessive_as_subject', why: 'Our — «наш», это принадлежность.' },
            { value: 'They', reasonCode: 'person_mismatch', why: 'They — «они», без говорящего.' },
            { value: 'Ve', reasonCode: 'spelling_invalid', why: 'Такого слова нет: пишется we.' },
            { value: 'I', reasonCode: 'number_mismatch', why: 'I — «я» один, а we это несколько.' },
          ],
        },
      ],
      features: ['plural_pronoun'],
    },
    {
      id: 'e01-s07-word-they',
      english: 'They',
      russian: 'Они',
      explanation:
        'Несколько человек или предметов, о которых говорят со стороны. Начинается со звука th — язык между зубами, как в thank.',
      words: [
        {
          correct: 'They',
          category: 'pronoun',
          distractors: [
            { value: 'Them', reasonCode: 'object_pronoun_as_subject', why: 'Them — форма дополнения, «их» и «им».' },
            { value: 'Their', reasonCode: 'possessive_as_subject', why: 'Their — «их» как принадлежность.' },
            { value: 'We', reasonCode: 'person_mismatch', why: 'We включает говорящего, they — нет.' },
            { value: 'Dey', reasonCode: 'th_substitution', why: 'Так слышится, если язык не между зубами.' },
            { value: 'There', reasonCode: 'near_homophone_confusion', why: 'There — «там», это про место.' },
          ],
        },
      ],
      features: ['plural_pronoun'],
    },
    {
      id: 'e01-s07-word-friends',
      english: 'Friends',
      russian: 'Друзья',
      explanation:
        'Множественное число делается просто: к слову добавляют s. Friend — один, friends — несколько. Это правило работает почти со всеми предметами.',
      words: [
        {
          correct: 'Friends',
          category: 'noun',
          distractors: [
            { value: 'Friend', reasonCode: 'number_mismatch', why: 'Friend — один. Для нескольких нужна s.' },
            { value: 'Friendes', reasonCode: 'spelling_invalid', why: 'Лишняя буква e: friends.' },
            { value: 'Freinds', reasonCode: 'spelling_invalid', why: 'Переставлены буквы.' },
            { value: 'Friendly', reasonCode: 'wrong_word_class', why: 'Friendly — «дружелюбный», признак.' },
            { value: 'Friendship', reasonCode: 'wrong_word_class', why: 'Friendship — «дружба».' },
          ],
        },
      ],
      features: ['plural_noun'],
    },

    // ── Фразы ──────────────────────────────────────────────────────────────
    {
      id: 'e01-s07-we-are-here',
      english: 'We are here',
      russian: 'Мы здесь',
      explanation:
        'К we идёт are — та же форма, что вы знаете по you. Одна форма обслуживает и «ты», и «мы», и «они».',
      words: [
        {
          correct: 'We',
          category: 'pronoun',
          distractors: [
            { value: 'Us', reasonCode: 'object_pronoun_as_subject', why: 'Us не бывает подлежащим.' },
            { value: 'Our', reasonCode: 'possessive_as_subject', why: 'Our — «наш».' },
            { value: 'I', reasonCode: 'number_mismatch', why: 'I — один человек.' },
            { value: 'They', reasonCode: 'person_mismatch', why: 'They не включает говорящего.' },
            { value: 'we', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'are',
          category: 'to-be',
          distractors: [
            { value: 'is', reasonCode: 'agreement_number_mismatch', why: 'Is — для одного: he, she, it.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'were', reasonCode: 'tense_mismatch', why: 'Were — про прошлое.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Do не соединяет людей с местом.' },
          ],
        },
        {
          correct: 'here',
          category: 'adverb',
          distractors: [
            { value: 'hear', reasonCode: 'homophone_confusion', why: 'Hear — «слышать», звучит одинаково.' },
            { value: 'there', reasonCode: 'deixis_opposite', why: 'There — «там».' },
            { value: 'her', reasonCode: 'wrong_word_class', why: 'Her — «её», места не обозначает.' },
            { value: 'where', reasonCode: 'question_word_in_statement', why: 'Where — вопросительное слово.' },
            { value: 'hair', reasonCode: 'near_homophone_confusion', why: 'Hair — «волосы».' },
          ],
        },
      ],
      features: ['plural_pronoun', 'copula_be', 'adverb_place'],
    },
    {
      id: 'e01-s07-they-are-busy',
      english: 'They are busy',
      russian: 'Они заняты',
      explanation:
        'Признак busy остаётся без изменений, сколько бы людей ни было. В английском слова-признаки не получают окончание множественного числа — никогда.',
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
            { value: 'is', reasonCode: 'agreement_number_mismatch', why: 'Is — только для одного.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'were', reasonCode: 'tense_mismatch', why: 'Were — про прошлое.' },
            { value: 'has', reasonCode: 'wrong_auxiliary', why: 'Has — «имеет».' },
          ],
        },
        {
          correct: 'busy',
          category: 'adjective',
          distractors: [
            { value: 'busies', reasonCode: 'adjective_pluralized', why: 'Признаки не получают s, сколько бы людей ни было.' },
            { value: 'busys', reasonCode: 'adjective_pluralized', why: 'Та же ошибка: busy не меняется.' },
            { value: 'bussy', reasonCode: 'spelling_invalid', why: 'Лишняя буква s.' },
            { value: 'business', reasonCode: 'wrong_word_class', why: 'Business — «дело».' },
            { value: 'busily', reasonCode: 'wrong_word_class', why: 'Наречие «деловито».' },
          ],
        },
      ],
      features: ['plural_pronoun', 'copula_be', 'state_adjective'],
    },
    {
      id: 'e01-s07-they-are-my-friends',
      english: 'They are my friends',
      russian: 'Они мои друзья',
      explanation:
        'Здесь множественное число видно дважды: they и friends. Слово my при этом не меняется — оно одинаково для одного друга и для десяти.',
      words: [
        {
          correct: 'They',
          category: 'pronoun',
          distractors: [
            { value: 'Them', reasonCode: 'object_pronoun_as_subject', why: 'Them — форма дополнения.' },
            { value: 'Their', reasonCode: 'possessive_as_subject', why: 'Their — принадлежность.' },
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
            { value: 'have', reasonCode: 'wrong_auxiliary', why: 'Здесь называют, кто они, через быть.' },
          ],
        },
        {
          correct: 'my',
          category: 'possessive',
          distractors: [
            { value: 'mine', reasonCode: 'possessive_pronoun_before_noun', why: 'Mine стоит без существительного.' },
            { value: 'me', reasonCode: 'pronoun_instead_of_possessive', why: 'Me — форма дополнения.' },
            { value: 'I', reasonCode: 'pronoun_instead_of_possessive', why: 'Перед предметом нужно my.' },
            { value: 'mys', reasonCode: 'possessive_pluralized', why: 'My не меняется по числу.' },
            { value: 'our', reasonCode: 'wrong_referent', why: 'Our — «наши», а речь о ваших друзьях.' },
          ],
        },
        {
          correct: 'friends',
          category: 'noun',
          distractors: [
            { value: 'friend', reasonCode: 'number_mismatch', why: 'They — несколько, значит friends.' },
            { value: 'freinds', reasonCode: 'spelling_invalid', why: 'Переставлены буквы.' },
            { value: 'friendes', reasonCode: 'spelling_invalid', why: 'Лишняя буква e.' },
            { value: 'friendly', reasonCode: 'wrong_word_class', why: 'Friendly — «дружелюбный».' },
            { value: 'friendship', reasonCode: 'wrong_word_class', why: 'Friendship — «дружба».' },
          ],
        },
      ],
      features: ['plural_pronoun', 'copula_be', 'plural_noun', 'possessive_my', 'noun_predicate'],
    },
    {
      id: 'e01-s07-we-are-not-late',
      english: 'We are not late',
      russian: 'Мы не опаздываем',
      explanation:
        'Отрицание работает так же, как и раньше: not сразу после связки. Правило одно для всех лиц — вы уже знаете его наизусть.',
      words: [
        {
          correct: 'We',
          category: 'pronoun',
          distractors: [
            { value: 'Us', reasonCode: 'object_pronoun_as_subject', why: 'Us не бывает подлежащим.' },
            { value: 'Our', reasonCode: 'possessive_as_subject', why: 'Our — «наш».' },
            { value: 'They', reasonCode: 'person_mismatch', why: 'They не включает говорящего.' },
            { value: 'I', reasonCode: 'number_mismatch', why: 'I — один человек.' },
            { value: 'Not', reasonCode: 'negator_as_subject', why: 'Not — частица.' },
          ],
        },
        {
          correct: 'are',
          category: 'to-be',
          distractors: [
            { value: 'is', reasonCode: 'agreement_number_mismatch', why: 'Is — для одного.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'При связке do не ставят.' },
            { value: 'don’t', reasonCode: 'wrong_auxiliary', why: 'Late — признак, а не действие.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
          ],
        },
        {
          correct: 'not',
          category: 'negation',
          distractors: [
            { value: 'no', reasonCode: 'negator_type_mismatch', why: 'Глагол отрицают через not.' },
            { value: 'never', reasonCode: 'meaning_mismatch', why: 'Never — «никогда».' },
            { value: 'don’t', reasonCode: 'wrong_auxiliary', why: 'При are вспомогательный do лишний.' },
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
      id: 'e01-s07-are-they-ready',
      english: 'Are they ready?',
      russian: 'Они готовы?',
      explanation:
        'Вопрос строится той же перестановкой. Вы прошли её с you, потом с she — теперь с they. Правило одно на всю таблицу.',
      words: [
        {
          correct: 'Are',
          category: 'to-be',
          distractors: [
            { value: 'Is', reasonCode: 'agreement_number_mismatch', why: 'Is — для одного.' },
            { value: 'Am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'Do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
            { value: 'Be', reasonCode: 'infinitive_not_finite', why: 'Вопрос так не строят.' },
            { value: 'Were', reasonCode: 'tense_mismatch', why: 'Were — про прошлое.' },
          ],
        },
        {
          correct: 'they',
          category: 'pronoun',
          distractors: [
            { value: 'them', reasonCode: 'object_pronoun_as_subject', why: 'Them — форма дополнения.' },
            { value: 'their', reasonCode: 'possessive_as_subject', why: 'Their — принадлежность.' },
            { value: 'he', reasonCode: 'number_mismatch', why: 'He — один человек.' },
            { value: 'we', reasonCode: 'person_mismatch', why: 'Спрашивают о других, не о себе.' },
            { value: 'dey', reasonCode: 'th_substitution', why: 'Так слышится без звука th.' },
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
      features: ['plural_pronoun', 'copula_be', 'question_inversion'],
    },
    {
      id: 'e01-s07-we-are-friends',
      english: 'We are friends',
      russian: 'Мы друзья',
      explanation:
        'Здесь артикля нет вообще. Перед словом во множественном числе a не ставят — a значит «один», а друзей несколько.',
      words: [
        {
          correct: 'We',
          category: 'pronoun',
          distractors: [
            { value: 'Us', reasonCode: 'object_pronoun_as_subject', why: 'Us не бывает подлежащим.' },
            { value: 'Our', reasonCode: 'possessive_as_subject', why: 'Our — «наш».' },
            { value: 'They', reasonCode: 'person_mismatch', why: 'They не включает говорящего.' },
            { value: 'I', reasonCode: 'number_mismatch', why: 'I — один, а друзей двое.' },
            { value: 'we', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'are',
          category: 'to-be',
          distractors: [
            { value: 'is', reasonCode: 'agreement_number_mismatch', why: 'Is — для одного.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'were', reasonCode: 'tense_mismatch', why: 'Were — про прошлое.' },
            { value: 'have', reasonCode: 'wrong_auxiliary', why: 'Кто вы — говорят через быть.' },
          ],
        },
        {
          correct: 'friends',
          category: 'noun',
          distractors: [
            { value: 'a friends', reasonCode: 'article_with_plural', why: 'A значит «один», с множественным числом не сочетается.' },
            { value: 'friend', reasonCode: 'number_mismatch', why: 'Вас несколько, значит friends.' },
            { value: 'a friend', reasonCode: 'number_mismatch', why: 'Один друг не подходит к we.' },
            { value: 'freinds', reasonCode: 'spelling_invalid', why: 'Переставлены буквы.' },
            { value: 'friendly', reasonCode: 'wrong_word_class', why: 'Friendly — «дружелюбный».' },
          ],
        },
      ],
      features: ['plural_pronoun', 'copula_be', 'plural_noun', 'noun_predicate'],
    },
    {
      id: 'e01-s07-they-are-not-here',
      english: 'They are not here',
      russian: 'Их здесь нет',
      explanation:
        'Заметьте разницу с русским: мы говорим «их нет», англичане — «они не здесь». Подлежащее остаётся на месте, исчезает только присутствие.',
      words: [
        {
          correct: 'They',
          category: 'pronoun',
          distractors: [
            { value: 'Them', reasonCode: 'object_pronoun_as_subject', why: 'Them — форма дополнения, хотя по-русски и хочется «их».' },
            { value: 'Their', reasonCode: 'possessive_as_subject', why: 'Their — принадлежность.' },
            { value: 'We', reasonCode: 'person_mismatch', why: 'We включает говорящего.' },
            { value: 'He', reasonCode: 'number_mismatch', why: 'He — один человек.' },
            { value: 'they', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
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
      ],
      features: ['plural_pronoun', 'copula_be', 'negation_not', 'adverb_place'],
    },
    {
      id: 'e01-s07-we-are-ready-now',
      english: 'We are ready now',
      russian: 'Мы теперь готовы',
      explanation:
        'Последняя фраза сессии. Слово now о времени стоит в конце — в английском такие слова обычно замыкают фразу, а не лезут в середину.',
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
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'were', reasonCode: 'tense_mismatch', why: 'Were — про прошлое.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
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
            { value: 'reader', reasonCode: 'wrong_word_class', why: 'Reader — «читатель».' },
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
      features: ['plural_pronoun', 'copula_be', 'state_adjective', 'adverb_time'],
    },
    {
      id: 'e01-s07-they-are-not-my-friends',
      english: 'They are not my friends',
      russian: 'Они мне не друзья',
      explanation:
        'Всё вместе: несколько людей, отрицание, принадлежность и множественное число. Если вы собрали эту фразу — первая глава почти пройдена.',
      words: [
        {
          correct: 'They',
          category: 'pronoun',
          distractors: [
            { value: 'Them', reasonCode: 'object_pronoun_as_subject', why: 'Them — форма дополнения, а нужно подлежащее.' },
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
          correct: 'my',
          category: 'possessive',
          distractors: [
            { value: 'mine', reasonCode: 'possessive_pronoun_before_noun', why: 'Mine стоит без существительного.' },
            { value: 'me', reasonCode: 'pronoun_instead_of_possessive', why: 'Me — форма дополнения.' },
            { value: 'I', reasonCode: 'pronoun_instead_of_possessive', why: 'Перед предметом нужно my.' },
            { value: 'mys', reasonCode: 'possessive_pluralized', why: 'My не меняется по числу.' },
            { value: 'their', reasonCode: 'wrong_referent', why: 'Their — «их», а речь о ваших друзьях.' },
          ],
        },
        {
          correct: 'friends',
          category: 'noun',
          distractors: [
            { value: 'friend', reasonCode: 'number_mismatch', why: 'They — несколько, значит friends.' },
            { value: 'freinds', reasonCode: 'spelling_invalid', why: 'Переставлены буквы.' },
            { value: 'friendes', reasonCode: 'spelling_invalid', why: 'Лишняя буква e.' },
            { value: 'friendly', reasonCode: 'wrong_word_class', why: 'Friendly — «дружелюбный».' },
            { value: 'friendship', reasonCode: 'wrong_word_class', why: 'Friendship — «дружба».' },
          ],
        },
      ],
      features: [
        'plural_pronoun',
        'copula_be',
        'negation_not',
        'plural_noun',
        'possessive_my',
        'noun_predicate',
      ],
    },

    // ── Голосовая тренировка: знакомые фразы вслух ────────────────────────
    {
      id: 'e01-s07-im-ready-now',
      english: "I'm ready now",
      russian: 'Я уже готов',
      explanation:
        'Сокращение I\'m вместо I am — так говорят вслух почти всегда, полная форма звучит слишком официально. Скажите фразу вслух: «айм», слитно, без паузы.',
      words: [
        {
          correct: "I'm",
          category: 'to-be',
          distractors: [
            { value: 'Im', reasonCode: 'apostrophe_missing', why: 'Без апострофа это не сокращение, а опечатка.' },
            { value: "I'am", reasonCode: 'apostrophe_placement', why: 'Апостроф стоит не на том месте: I\'m.' },
            { value: "You're", reasonCode: 'person_mismatch', why: "You're — сокращение для «ты», а не для «я»." },
            { value: "He's", reasonCode: 'person_mismatch', why: "He's — «он есть», не подходит к I." },
            { value: "I'll", reasonCode: 'wrong_word_class', why: "I'll — «я буду», это про будущее." },
          ],
        },
        {
          correct: 'ready',
          category: 'adjective',
          distractors: [
            { value: 'readys', reasonCode: 'adjective_pluralized', why: 'Признаки не получают s.' },
            { value: 'read', reasonCode: 'near_homophone_confusion', why: 'Read — «читать».' },
            { value: 'red', reasonCode: 'near_homophone_confusion', why: 'Red — «красный».' },
            { value: 'already', reasonCode: 'wrong_word_class', why: 'Already — «уже», это наречие.' },
            { value: 'reader', reasonCode: 'wrong_word_class', why: 'Reader — «читатель».' },
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
      features: ['copula_be', 'first_person_singular', 'state_adjective', 'adverb_time', 'contraction'],
    },
    {
      id: 'e01-s07-im-not-sure',
      english: "I'm not sure",
      russian: 'Я не уверен',
      explanation:
        'Отрицание в сокращённой форме: not встаёт сразу после \'m, ничего больше не меняется. Проговорите фразу целиком несколько раз, не разбивая на отдельные слова.',
      words: [
        {
          correct: "I'm",
          category: 'to-be',
          distractors: [
            { value: 'Im', reasonCode: 'apostrophe_missing', why: 'Без апострофа это опечатка.' },
            { value: "I'am", reasonCode: 'apostrophe_placement', why: 'Апостроф стоит не на том месте.' },
            { value: "You're", reasonCode: 'person_mismatch', why: "You're относится к «ты»." },
            { value: "It's", reasonCode: 'person_mismatch', why: "It's — «оно есть», не подходит к I." },
            { value: 'Am', reasonCode: 'contraction_missing', why: 'Без I это не полная связка и не сокращение.' },
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
          correct: 'sure',
          category: 'adjective',
          distractors: [
            { value: 'sured', reasonCode: 'adjective_past_form', why: 'У признаков нет формы прошедшего времени.' },
            { value: 'shure', reasonCode: 'spelling_invalid', why: 'Пишется без h: sure.' },
            { value: 'surely', reasonCode: 'wrong_word_class', why: 'Surely — «конечно», наречие.' },
            { value: 'sure’s', reasonCode: 'apostrophe_misuse', why: 'Апостроф признакам не нужен.' },
            { value: 'sore', reasonCode: 'near_homophone_confusion', why: 'Sore — «болит».' },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'negation_not', 'state_adjective', 'contraction'],
    },
    {
      id: 'e01-s07-im-a-teacher',
      english: "I'm a teacher",
      russian: 'Я учитель',
      explanation:
        'Сокращение плюс артикль перед профессией — оба правила уже знакомы. Проговорите вслух: связка и артикль звучат легко, почти незаметно, а вес фразы — на слове teacher.',
      words: [
        {
          correct: "I'm",
          category: 'to-be',
          distractors: [
            { value: 'Im', reasonCode: 'apostrophe_missing', why: 'Без апострофа это опечатка.' },
            { value: "I'am", reasonCode: 'apostrophe_placement', why: 'Апостроф стоит не на том месте.' },
            { value: "She's", reasonCode: 'person_mismatch', why: "She's относится к «она»." },
            { value: "We're", reasonCode: 'person_mismatch', why: "We're относится к «мы»." },
            { value: 'Am', reasonCode: 'contraction_missing', why: 'Без I это не сокращение.' },
          ],
        },
        {
          correct: 'a',
          category: 'article',
          distractors: [
            { value: 'an', reasonCode: 'article_form_mismatch', why: 'An нужен перед гласным звуком, teacher начинается с согласного.' },
            { value: 'the', reasonCode: 'article_definiteness_wrong', why: 'The — про конкретного, известного собеседнику.' },
            { value: 'my', reasonCode: 'possessive_instead_of_article', why: 'My teacher — «мой учитель», другой смысл.' },
            { value: 'one', reasonCode: 'numeral_instead_of_article', why: 'One — число «один».' },
            { value: 'some', reasonCode: 'quantifier_instead_of_article', why: 'Some — «несколько».' },
          ],
        },
        {
          correct: 'teacher',
          category: 'noun',
          distractors: [
            { value: 'teachers', reasonCode: 'number_mismatch', why: 'После a всегда единственное число.' },
            { value: 'teach', reasonCode: 'wrong_word_class', why: 'Teach — «учить», глагол.' },
            { value: 'teaching', reasonCode: 'wrong_word_form', why: 'После артикля нужно существительное.' },
            { value: 'techer', reasonCode: 'spelling_invalid', why: 'Пропущена буква a.' },
            { value: 'student', reasonCode: 'meaning_mismatch', why: 'Student — «студент», другая роль.' },
          ],
        },
      ],
      features: ['copula_be', 'first_person_singular', 'indefinite_article', 'noun_predicate', 'contraction'],
    },
  ]);
