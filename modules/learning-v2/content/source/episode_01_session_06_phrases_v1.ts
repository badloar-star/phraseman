// зачем: сессия 6 типа words_then_phrases (владелец: «сессии могут включать в
// себя и отработку слов и сразу фраз с этими словами, так лучше будет»).
// Первые карточки знакомят со словами he / she / it и связкой is, дальше идут
// фразы, собранные из этих же слов — человек не встречает ничего незнакомого.
import type { EpisodeSourcePhrase } from './episode_01_source_v1';

export const EPISODE_01_SESSION_06_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze([
    // ── Слова: сначала узнаём, потом собираем ──────────────────────────────
    {
      id: 'e01-s06-word-he',
      english: 'He',
      russian: 'Он',
      explanation:
        'Слово для мужчины: он. Заменяет имя, когда понятно, о ком речь. Начинается с того же выдоха, что и Hi, но с гласной «и».',
      words: [
        {
          correct: 'He',
          category: 'pronoun',
          distractors: [
            { value: 'She', reasonCode: 'gender_mismatch', why: 'She — «она», для женщины.' },
            { value: 'Hi', reasonCode: 'near_homophone_confusion', why: 'Hi — приветствие, а не местоимение.' },
            { value: 'Her', reasonCode: 'object_pronoun_as_subject', why: 'Her — «её», это форма дополнения.' },
            { value: 'His', reasonCode: 'possessive_as_subject', why: 'His — «его», принадлежность.' },
            { value: 'Him', reasonCode: 'object_pronoun_as_subject', why: 'Him — «его, ему», не подлежащее.' },
          ],
        },
      ],
      features: ['third_person_pronoun'],
    },
    {
      id: 'e01-s06-word-she',
      english: 'She',
      russian: 'Она',
      explanation:
        'Слово для женщины: она. Первый звук — мягкое «ш», как в русском «шея», а не «сь».',
      words: [
        {
          correct: 'She',
          category: 'pronoun',
          distractors: [
            { value: 'He', reasonCode: 'gender_mismatch', why: 'He — «он», для мужчины.' },
            { value: 'Her', reasonCode: 'object_pronoun_as_subject', why: 'Her — «её», форма дополнения.' },
            { value: 'Sea', reasonCode: 'near_homophone_confusion', why: 'Sea — «море».' },
            { value: 'Shi', reasonCode: 'spelling_invalid', why: 'Такого написания нет: she.' },
            { value: 'Hers', reasonCode: 'possessive_as_subject', why: 'Hers — «её» без существительного.' },
          ],
        },
      ],
      features: ['third_person_pronoun'],
    },
    {
      id: 'e01-s06-word-it',
      english: 'It',
      russian: 'Оно',
      explanation:
        'Слово для всего, что не человек: предмет, погода, животное. В русском мы говорим «он» про стол и «она» про сумку — в английском для всего этого одно it.',
      words: [
        {
          correct: 'It',
          category: 'pronoun',
          distractors: [
            { value: 'He', reasonCode: 'animacy_mismatch', why: 'He — только про человека или близкое животное.' },
            { value: 'She', reasonCode: 'animacy_mismatch', why: 'She — про женщину, не про предмет.' },
            { value: 'Its', reasonCode: 'possessive_as_subject', why: 'Its — «его» как принадлежность.' },
            { value: 'It’s', reasonCode: 'contraction_in_wrong_place', why: 'It’s — это «it is», уже со связкой.' },
            { value: 'This', reasonCode: 'wrong_word_class', why: 'This — «этот», указывает на предмет рядом.' },
          ],
        },
      ],
      features: ['third_person_pronoun'],
    },
    {
      id: 'e01-s06-word-is',
      english: 'Is',
      russian: 'Есть (для он, она, оно)',
      explanation:
        'Третья форма связки. Вы знаете am для «я» и are для «ты» — is идёт к he, she, it. Больше форм у неё нет, таблица закончилась.',
      words: [
        {
          correct: 'Is',
          category: 'to-be',
          distractors: [
            { value: 'Am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'Are', reasonCode: 'agreement_person_mismatch', why: 'Are — к you, we, they.' },
            { value: 'Be', reasonCode: 'infinitive_not_finite', why: 'Be — начальная форма.' },
            { value: 'Was', reasonCode: 'tense_mismatch', why: 'Was — прошедшее «был».' },
            { value: 'Iz', reasonCode: 'spelling_invalid', why: 'Пишется через s: is.' },
          ],
        },
      ],
      features: ['third_person_pronoun', 'copula_be'],
    },

    // ── Фразы из этих же слов ──────────────────────────────────────────────
    {
      id: 'e01-s06-he-is-here',
      english: 'He is here',
      russian: 'Он здесь',
      explanation:
        'Первая фраза с новой связкой. Схема знакомая, поменялись только два слова: вместо I am стоит He is.',
      words: [
        {
          correct: 'He',
          category: 'pronoun',
          distractors: [
            { value: 'Him', reasonCode: 'object_pronoun_as_subject', why: 'Him — форма дополнения, подлежащее — He.' },
            { value: 'His', reasonCode: 'possessive_as_subject', why: 'His — «его», принадлежность.' },
            { value: 'She', reasonCode: 'gender_mismatch', why: 'She — «она».' },
            { value: 'he', reasonCode: 'capitalization_invalid', why: 'В начале предложения нужна заглавная.' },
            { value: 'I', reasonCode: 'person_mismatch', why: 'I — «я», а речь о другом человеке.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am идёт только к I.' },
            { value: 'are', reasonCode: 'agreement_person_mismatch', why: 'Are идёт к you, we, they.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Do не соединяет человека с местом.' },
          ],
        },
        {
          correct: 'here',
          category: 'adverb',
          distractors: [
            { value: 'hear', reasonCode: 'homophone_confusion', why: 'Hear — «слышать», звучит одинаково.' },
            { value: 'there', reasonCode: 'deixis_opposite', why: 'There — «там».' },
            { value: 'her', reasonCode: 'wrong_word_class', why: 'Her — «её», места не обозначает.' },
            { value: 'where', reasonCode: 'question_word_in_statement', why: 'Where — вопросительное «где».' },
            { value: 'hair', reasonCode: 'near_homophone_confusion', why: 'Hair — «волосы».' },
          ],
        },
      ],
      features: ['third_person_pronoun', 'copula_be', 'adverb_place'],
    },
    {
      id: 'e01-s06-she-is-busy',
      english: 'She is busy',
      russian: 'Она занята',
      explanation:
        'Признак busy не меняется от того, о ком речь — в английском слова-признаки не имеют рода. Меняется только местоимение.',
      words: [
        {
          correct: 'She',
          category: 'pronoun',
          distractors: [
            { value: 'Her', reasonCode: 'object_pronoun_as_subject', why: 'Her — форма дополнения.' },
            { value: 'Hers', reasonCode: 'possessive_as_subject', why: 'Hers — «её» без существительного.' },
            { value: 'He', reasonCode: 'gender_mismatch', why: 'He — «он», а речь идёт о женщине.' },
            { value: 'she', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
            { value: 'It', reasonCode: 'animacy_mismatch', why: 'It — про предмет, а не про человека.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'are', reasonCode: 'agreement_person_mismatch', why: 'Are — к you, we, they.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Busy — признак, do не нужен.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
          ],
        },
        {
          correct: 'busy',
          category: 'adjective',
          distractors: [
            { value: 'bussy', reasonCode: 'spelling_invalid', why: 'Лишняя буква s: правильно busy.' },
            { value: 'business', reasonCode: 'wrong_word_class', why: 'Business — «дело», существительное.' },
            { value: 'busily', reasonCode: 'wrong_word_class', why: 'Наречие «деловито».' },
            { value: 'buzy', reasonCode: 'spelling_invalid', why: 'Пишется через s.' },
            { value: 'bored', reasonCode: 'meaning_mismatch', why: 'Bored — «скучающий».' },
          ],
        },
      ],
      features: ['third_person_pronoun', 'copula_be', 'state_adjective'],
    },
    {
      id: 'e01-s06-it-is-cold',
      english: 'It is cold',
      russian: 'Холодно',
      explanation:
        'Так говорят о погоде. По-русски мы обходимся одним словом «холодно», в английском обязательно нужно it — подлежащее не может отсутствовать.',
      words: [
        {
          correct: 'It',
          category: 'pronoun',
          distractors: [
            { value: 'He', reasonCode: 'animacy_mismatch', why: 'He — про человека, а не про погоду.' },
            { value: 'She', reasonCode: 'animacy_mismatch', why: 'She — про женщину.' },
            { value: 'Its', reasonCode: 'possessive_as_subject', why: 'Its — «его» как принадлежность.' },
            { value: 'This', reasonCode: 'wrong_word_choice', why: 'О погоде говорят именно it.' },
            { value: 'it', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'are', reasonCode: 'agreement_person_mismatch', why: 'Are — к you, we, they.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
            { value: 'has', reasonCode: 'wrong_auxiliary', why: 'Has — «имеет», погоду так не описывают.' },
          ],
        },
        {
          correct: 'cold',
          category: 'adjective',
          distractors: [
            { value: 'cool', reasonCode: 'meaning_mismatch', why: 'Cool — «прохладный» или «классный».' },
            { value: 'colder', reasonCode: 'wrong_word_form', why: 'Colder — «холоднее», нужно сравнение.' },
            { value: 'coldly', reasonCode: 'wrong_word_class', why: 'Наречие о манере.' },
            { value: 'called', reasonCode: 'near_homophone_confusion', why: 'Called — «названный».' },
            { value: 'gold', reasonCode: 'near_homophone_confusion', why: 'Gold — «золото».' },
          ],
        },
      ],
      features: ['third_person_pronoun', 'copula_be', 'state_adjective'],
    },
    {
      id: 'e01-s06-he-is-not-here',
      english: 'He is not here',
      russian: 'Его здесь нет',
      explanation:
        'Отрицание работает как раньше: not сразу после связки. Заметьте, по-русски мы говорим «его нет», а по-английски — «он не здесь».',
      words: [
        {
          correct: 'He',
          category: 'pronoun',
          distractors: [
            { value: 'Him', reasonCode: 'object_pronoun_as_subject', why: 'Him — форма дополнения.' },
            { value: 'His', reasonCode: 'possessive_as_subject', why: 'His — «его», принадлежность.' },
            { value: 'She', reasonCode: 'gender_mismatch', why: 'She — «она».' },
            { value: 'Not', reasonCode: 'negator_as_subject', why: 'Not — частица, не подлежащее.' },
            { value: 'he', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'are', reasonCode: 'agreement_person_mismatch', why: 'Are — к you, we, they.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'При связке do не ставят.' },
            { value: 'don’t', reasonCode: 'wrong_auxiliary', why: 'Here — место, а не действие.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
          ],
        },
        {
          correct: 'not',
          category: 'negation',
          distractors: [
            { value: 'no', reasonCode: 'negator_type_mismatch', why: 'Глагол отрицают через not.' },
            { value: 'never', reasonCode: 'meaning_mismatch', why: 'Never — «никогда».' },
            { value: 'doesn’t', reasonCode: 'wrong_auxiliary', why: 'При связке is вспомогательный глагол лишний.' },
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
            { value: 'her', reasonCode: 'wrong_word_class', why: 'Her — «её», это форма дополнения, а не подлежащее.' },
            { value: 'where', reasonCode: 'question_word_in_statement', why: 'Where — вопросительное слово.' },
            { value: 'hair', reasonCode: 'near_homophone_confusion', why: 'Hair — «волосы».' },
          ],
        },
      ],
      features: ['third_person_pronoun', 'copula_be', 'negation_not', 'adverb_place'],
    },
    {
      id: 'e01-s06-is-she-ready',
      english: 'Is she ready?',
      russian: 'Она готова?',
      explanation:
        'Вопрос строится той же перестановкой, что вы уже знаете: было She is, стало Is she. Правило одно на все лица.',
      words: [
        {
          correct: 'Is',
          category: 'to-be',
          distractors: [
            { value: 'Are', reasonCode: 'agreement_person_mismatch', why: 'Are — к you, we, they.' },
            { value: 'Am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'Do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
            { value: 'Be', reasonCode: 'infinitive_not_finite', why: 'Вопрос так не строят.' },
            { value: 'Was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
          ],
        },
        {
          correct: 'she',
          category: 'pronoun',
          distractors: [
            { value: 'her', reasonCode: 'object_pronoun_as_subject', why: 'Her — форма дополнения.' },
            { value: 'hers', reasonCode: 'possessive_as_subject', why: 'Hers заменяет предмет.' },
            { value: 'he', reasonCode: 'gender_mismatch', why: 'He — «он», а речь идёт о женщине.' },
            { value: 'it', reasonCode: 'animacy_mismatch', why: 'It — про предмет.' },
            { value: 'you', reasonCode: 'person_mismatch', why: 'Спрашивают о третьем человеке, не о собеседнике.' },
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
            { value: 'reader', reasonCode: 'wrong_word_class', why: 'Reader — «читатель».' },
          ],
        },
      ],
      features: ['third_person_pronoun', 'copula_be', 'question_inversion'],
    },
    {
      id: 'e01-s06-she-is-a-teacher',
      english: 'She is a teacher',
      russian: 'Она учитель',
      explanation:
        'Профессия и здесь требует артикля a — правило не зависит от того, о ком речь. По-русски «она учитель», по-английски обязательно «одна из учителей».',
      words: [
        {
          correct: 'She',
          category: 'pronoun',
          distractors: [
            { value: 'Her', reasonCode: 'object_pronoun_as_subject', why: 'Her — форма дополнения.' },
            { value: 'He', reasonCode: 'gender_mismatch', why: 'He — «он», а речь идёт о женщине.' },
            { value: 'Hers', reasonCode: 'possessive_as_subject', why: 'Hers заменяет предмет.' },
            { value: 'It', reasonCode: 'animacy_mismatch', why: 'It — про предмет.' },
            { value: 'she', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'are', reasonCode: 'agreement_person_mismatch', why: 'Are — к you, we, they.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'have', reasonCode: 'wrong_auxiliary', why: 'Профессию называют через быть.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
          ],
        },
        {
          correct: 'a',
          category: 'article',
          distractors: [
            { value: 'an', reasonCode: 'article_form_mismatch', why: 'An нужен перед гласным звуком.' },
            { value: 'the', reasonCode: 'article_definiteness_wrong', why: 'The — про конкретного, известного.' },
            { value: 'her', reasonCode: 'possessive_instead_of_article', why: 'Her teacher — «её учитель», другой смысл.' },
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
            { value: 'student', reasonCode: 'meaning_mismatch', why: 'Student — «студент», другая профессия.' },
          ],
        },
      ],
      features: ['third_person_pronoun', 'copula_be', 'indefinite_article', 'noun_predicate'],
    },
    {
      id: 'e01-s06-it-is-ok',
      english: 'It is OK',
      russian: 'Всё в порядке',
      explanation:
        'Так успокаивают: ничего страшного, всё нормально. В речи почти всегда сокращают до It’s OK.',
      words: [
        {
          correct: 'It',
          category: 'pronoun',
          distractors: [
            { value: 'He', reasonCode: 'animacy_mismatch', why: 'He — про человека.' },
            { value: 'She', reasonCode: 'animacy_mismatch', why: 'She — про женщину.' },
            { value: 'Its', reasonCode: 'possessive_as_subject', why: 'Its — принадлежность.' },
            { value: 'This', reasonCode: 'wrong_word_choice', why: 'В этой фразе стоит именно it.' },
            { value: 'it', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'are', reasonCode: 'agreement_person_mismatch', why: 'Are — к you, we, they.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
          ],
        },
        {
          correct: 'OK',
          category: 'adjective',
          distractors: [
            { value: 'okey', reasonCode: 'spelling_invalid', why: 'Такого написания нет: OK или okay.' },
            { value: 'oky', reasonCode: 'spelling_invalid', why: 'Ошибка в написании.' },
            { value: 'okays', reasonCode: 'wrong_word_class', why: 'Признак не ставят во множественное число.' },
            { value: 'good', reasonCode: 'not_target_word', why: 'Здесь тренируем именно OK.' },
            { value: 'well', reasonCode: 'wrong_word_class', why: 'Well — наречие «хорошо».' },
          ],
        },
      ],
      features: ['third_person_pronoun', 'copula_be', 'state_adjective'],
    },
    {
      id: 'e01-s06-he-is-my-friend',
      english: 'He is my friend',
      russian: 'Он мой друг',
      explanation:
        'Здесь вместо артикля стоит my — вы уже видели это правило: слово о принадлежности заменяет артикль, вместе они не ставятся.',
      words: [
        {
          correct: 'He',
          category: 'pronoun',
          distractors: [
            { value: 'Him', reasonCode: 'object_pronoun_as_subject', why: 'Him — форма дополнения.' },
            { value: 'His', reasonCode: 'possessive_as_subject', why: 'His — «его», принадлежность.' },
            { value: 'She', reasonCode: 'gender_mismatch', why: 'She — «она».' },
            { value: 'It', reasonCode: 'animacy_mismatch', why: 'It — про предмет, а друг — человек.' },
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
            { value: 'has', reasonCode: 'wrong_auxiliary', why: 'Has — «имеет», а здесь нужно быть.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
          ],
        },
        {
          correct: 'my',
          category: 'possessive',
          distractors: [
            { value: 'I', reasonCode: 'pronoun_instead_of_possessive', why: 'Перед предметом нужно my.' },
            { value: 'me', reasonCode: 'pronoun_instead_of_possessive', why: 'Me — форма дополнения.' },
            { value: 'mine', reasonCode: 'possessive_pronoun_before_noun', why: 'Mine стоит без существительного.' },
            { value: 'a my', reasonCode: 'article_with_possessive', why: 'Артикль и my вместе не ставят.' },
            { value: 'the my', reasonCode: 'article_with_possessive', why: 'Та же ошибка: или the, или my.' },
          ],
        },
        {
          correct: 'friend',
          category: 'noun',
          distractors: [
            { value: 'friends', reasonCode: 'number_mismatch', why: 'Друг один, множественное число не нужно.' },
            { value: 'freind', reasonCode: 'spelling_invalid', why: 'Переставлены буквы: friend.' },
            { value: 'friendly', reasonCode: 'wrong_word_class', why: 'Friendly — «дружелюбный», признак.' },
            { value: 'frend', reasonCode: 'spelling_invalid', why: 'Пропущена буква i.' },
            { value: 'friendship', reasonCode: 'wrong_word_class', why: 'Friendship — «дружба».' },
          ],
        },
      ],
      features: ['third_person_pronoun', 'copula_be', 'possessive_my', 'noun_predicate'],
    },
  ]);
