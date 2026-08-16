// зачем: сессия 10 типа phrases — новой лексики нет, строится целиком на
// словах сессии 9. Учит спрашивать о принадлежности (Whose) и отвечать двумя
// способами: апострофом (Anna’s) и самостоятельной формой (mine, hers).
import type { EpisodeSourcePhrase } from './episode_01_source_v1';

export const EPISODE_01_SESSION_10_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze([
    {
      id: 'e01-s10-whose-bag-is-this',
      english: 'Whose bag is this?',
      russian: 'Чья это сумка?',
      explanation:
        'Новое вопросительное слово: whose — «чей». Звучит точно как who’s, но пишется иначе и значит другое. Порядок знакомый: слово-вопрос, предмет, связка.',
      words: [
        {
          correct: 'Whose',
          category: 'question-word',
          distractors: [
            { value: 'Who', reasonCode: 'wrong_question_word', why: 'Who — «кто», спрашивает о человеке, а не о принадлежности.' },
            { value: 'Who’s', reasonCode: 'homophone_confusion', why: 'Звучит одинаково, но who’s это «кто есть».' },
            { value: 'What', reasonCode: 'wrong_question_word', why: 'What — «что», а спрашивают чья.' },
            { value: 'Whos', reasonCode: 'spelling_invalid', why: 'Такого написания нет: whose.' },
            { value: 'House', reasonCode: 'near_homophone_confusion', why: 'House — «дом».' },
          ],
        },
        {
          correct: 'bag',
          category: 'noun',
          distractors: [
            { value: 'bags', reasonCode: 'number_mismatch', why: 'Сумка одна, значит без s.' },
            { value: 'bug', reasonCode: 'near_homophone_confusion', why: 'Bug — «жук».' },
            { value: 'big', reasonCode: 'near_homophone_confusion', why: 'Big — «большой».' },
            { value: 'back', reasonCode: 'near_homophone_confusion', why: 'Back — «спина».' },
            { value: 'beg', reasonCode: 'near_homophone_confusion', why: 'Beg — «умолять».' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'are', reasonCode: 'agreement_number_mismatch', why: 'Сумка одна, значит is.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
          ],
        },
        {
          correct: 'this',
          category: 'demonstrative',
          distractors: [
            { value: 'that', reasonCode: 'deixis_distance', why: 'That — «то», о дальнем предмете.' },
            { value: 'these', reasonCode: 'number_mismatch', why: 'These — «эти», о нескольких.' },
            { value: 'it', reasonCode: 'wrong_word_choice', why: 'Показывая на предмет рядом, говорят this.' },
            { value: 'thes', reasonCode: 'spelling_invalid', why: 'Ошибка в написании.' },
            { value: 'his', reasonCode: 'near_homophone_confusion', why: 'His — «его», это принадлежность.' },
          ],
        },
      ],
      features: ['possessive_question', 'copula_be', 'demonstrative'],
    },
    {
      id: 'e01-s10-it-is-my-sisters-bag',
      english: 'It is my sister’s bag',
      russian: 'Это сумка моей сестры',
      explanation:
        'Главное правило урока: чтобы сказать «сумка сестры», к хозяину добавляют апостроф и s. Sister’s — «сестрин». Порядок обратный русскому: сначала хозяин, потом вещь.',
      words: [
        {
          correct: 'It',
          category: 'pronoun',
          distractors: [
            { value: 'This', reasonCode: 'wrong_word_choice', why: 'В ответе о предмете, о котором уже речь, стоит it.' },
            { value: 'He', reasonCode: 'animacy_mismatch', why: 'He — про человека, а сумка предмет.' },
            { value: 'She', reasonCode: 'animacy_mismatch', why: 'She — про женщину.' },
            { value: 'Its', reasonCode: 'possessive_as_subject', why: 'Its — «его» как принадлежность.' },
            { value: 'it', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'are', reasonCode: 'agreement_number_mismatch', why: 'Сумка одна, значит is.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
            { value: 'has', reasonCode: 'wrong_auxiliary', why: 'Здесь называют, чья вещь, через быть.' },
          ],
        },
        {
          correct: 'my',
          category: 'possessive',
          distractors: [
            { value: 'mine', reasonCode: 'possessive_pronoun_before_noun', why: 'Mine стоит без существительного.' },
            { value: 'me', reasonCode: 'pronoun_instead_of_possessive', why: 'Me — форма дополнения.' },
            { value: 'I', reasonCode: 'pronoun_instead_of_possessive', why: 'Перед предметом нужно my.' },
            { value: 'her', reasonCode: 'wrong_referent', why: 'Her — «её», а сестра ваша.' },
            { value: 'a my', reasonCode: 'article_with_possessive', why: 'Артикль и my вместе не ставят.' },
          ],
        },
        {
          correct: 'sister’s',
          category: 'possessive-apostrophe',
          distractors: [
            { value: 'sister', reasonCode: 'possessive_apostrophe_missing', why: 'Без апострофа получится «сестра сумка» — принадлежность пропала.' },
            { value: 'sisters', reasonCode: 'possessive_apostrophe_missing', why: 'Sisters — «сёстры», а нужен апостроф: sister’s.' },
            { value: 'sisters’', reasonCode: 'possessive_apostrophe_placement', why: 'Апостроф после s значит несколько сестёр.' },
            { value: 'her sister’s', reasonCode: 'redundant_possessive', why: 'Хозяин уже назван словом my, второй раз не нужно.' },
            { value: 'sister of', reasonCode: 'wrong_possessive_form', why: 'О людях так не говорят, для этого есть апостроф.' },
          ],
        },
        {
          correct: 'bag',
          category: 'noun',
          distractors: [
            { value: 'bags', reasonCode: 'number_mismatch', why: 'Сумка одна.' },
            { value: 'bug', reasonCode: 'near_homophone_confusion', why: 'Bug — «жук».' },
            { value: 'big', reasonCode: 'near_homophone_confusion', why: 'Big — «большой».' },
            { value: 'back', reasonCode: 'near_homophone_confusion', why: 'Back — «спина».' },
            { value: 'beg', reasonCode: 'near_homophone_confusion', why: 'Beg — «умолять».' },
          ],
        },
      ],
      features: ['copula_be', 'possessive_my', 'possessive_apostrophe', 'family_noun'],
    },
    {
      id: 'e01-s10-it-is-mine',
      english: 'It is mine',
      russian: 'Это моё',
      explanation:
        'Когда предмет уже назван, повторять его не нужно: вместо my bag говорят просто mine. Слово стоит в конце и заменяет всё сочетание.',
      words: [
        {
          correct: 'It',
          category: 'pronoun',
          distractors: [
            { value: 'This', reasonCode: 'wrong_word_choice', why: 'О предмете, о котором уже речь, говорят it.' },
            { value: 'He', reasonCode: 'animacy_mismatch', why: 'He — про человека.' },
            { value: 'Its', reasonCode: 'possessive_as_subject', why: 'Its — принадлежность.' },
            { value: 'She', reasonCode: 'animacy_mismatch', why: 'She — про женщину.' },
            { value: 'it', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'are', reasonCode: 'agreement_number_mismatch', why: 'Предмет один, значит is.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
          ],
        },
        {
          correct: 'mine',
          category: 'possessive-pronoun',
          distractors: [
            { value: 'my', reasonCode: 'possessive_needs_noun', why: 'My требует предмета после себя: my bag. Без предмета — mine.' },
            { value: 'me', reasonCode: 'pronoun_instead_of_possessive', why: 'Me — форма дополнения.' },
            { value: 'I', reasonCode: 'pronoun_instead_of_possessive', why: 'I — «я», а нужна принадлежность.' },
            { value: 'mines', reasonCode: 'possessive_pluralized', why: 'Такой формы нет: mine не меняется.' },
            { value: 'my one', reasonCode: 'wrong_possessive_form', why: 'Так не говорят, для этого и есть mine.' },
          ],
        },
      ],
      features: ['copula_be', 'possessive_standalone', 'third_person_pronoun'],
    },
    {
      id: 'e01-s10-is-it-yours',
      english: 'Is it yours?',
      russian: 'Это твоё?',
      explanation:
        'Тот же вопрос перестановкой, что вы знаете. Yours работает как mine — стоит без предмета и заменяет «твой + вещь».',
      words: [
        {
          correct: 'Is',
          category: 'to-be',
          distractors: [
            { value: 'Are', reasonCode: 'agreement_number_mismatch', why: 'It — один предмет, значит is.' },
            { value: 'Am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'Do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
            { value: 'Be', reasonCode: 'infinitive_not_finite', why: 'Вопрос так не строят.' },
            { value: 'Was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
          ],
        },
        {
          correct: 'it',
          category: 'pronoun',
          distractors: [
            { value: 'this', reasonCode: 'wrong_word_choice', why: 'В этом вопросе стоит it.' },
            { value: 'he', reasonCode: 'animacy_mismatch', why: 'He — про человека.' },
            { value: 'its', reasonCode: 'possessive_as_subject', why: 'Its — принадлежность.' },
            { value: 'they', reasonCode: 'number_mismatch', why: 'They — о нескольких предметах.' },
            { value: 'she', reasonCode: 'animacy_mismatch', why: 'She — про женщину.' },
          ],
        },
        {
          correct: 'yours',
          category: 'possessive-pronoun',
          distractors: [
            { value: 'your', reasonCode: 'possessive_needs_noun', why: 'Your требует предмета после себя: your bag.' },
            { value: 'you', reasonCode: 'pronoun_instead_of_possessive', why: 'You — «ты», а нужна принадлежность.' },
            { value: 'your’s', reasonCode: 'apostrophe_misuse', why: 'Апостроф здесь не ставят: yours.' },
            { value: 'yourse', reasonCode: 'spelling_invalid', why: 'Такого слова нет.' },
            { value: 'ur', reasonCode: 'chat_abbreviation', why: 'Сокращение из переписки.' },
          ],
        },
      ],
      features: ['copula_be', 'question_inversion', 'possessive_standalone'],
    },
    {
      id: 'e01-s10-no-it-is-hers',
      english: 'No, it is hers',
      russian: 'Нет, это её',
      explanation:
        'Ответ с отрицанием. Hers — та же самостоятельная форма, что mine и yours, только про женщину. Апостроф не нужен ни одной из них.',
      words: [
        {
          correct: 'No',
          category: 'answer',
          distractors: [
            { value: 'Yes', reasonCode: 'polarity_inverted', why: 'Yes — противоположный ответ.' },
            { value: 'Not', reasonCode: 'negator_type_mismatch', why: 'Not отрицает глагол, а как ответ говорят no.' },
            { value: 'Know', reasonCode: 'homophone_confusion', why: 'Know — «знать», звучит одинаково.' },
            { value: 'Nope', reasonCode: 'register_mismatch', why: 'Nope — небрежно-разговорное.' },
            { value: 'Now', reasonCode: 'near_homophone_confusion', why: 'Now — «сейчас».' },
          ],
        },
        {
          correct: 'it',
          category: 'pronoun',
          distractors: [
            { value: 'this', reasonCode: 'wrong_word_choice', why: 'В ответе о названном предмете стоит it.' },
            { value: 'she', reasonCode: 'animacy_mismatch', why: 'She — про женщину, а речь о предмете.' },
            { value: 'its', reasonCode: 'possessive_as_subject', why: 'Its — принадлежность.' },
            { value: 'he', reasonCode: 'animacy_mismatch', why: 'He — про человека.' },
            { value: 'they', reasonCode: 'number_mismatch', why: 'They — о нескольких.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'are', reasonCode: 'agreement_number_mismatch', why: 'Предмет один, значит is.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
          ],
        },
        {
          correct: 'hers',
          category: 'possessive-pronoun',
          distractors: [
            { value: 'her', reasonCode: 'possessive_needs_noun', why: 'Her требует предмета после себя: her bag.' },
            { value: 'her’s', reasonCode: 'apostrophe_misuse', why: 'Апостроф здесь не ставят: hers.' },
            { value: 'she', reasonCode: 'pronoun_instead_of_possessive', why: 'She — «она», а нужна принадлежность.' },
            { value: 'his', reasonCode: 'gender_mismatch', why: 'His — «его», принадлежность мужчине.' },
            { value: 'hims', reasonCode: 'spelling_invalid', why: 'Такого слова нет.' },
          ],
        },
      ],
      features: ['copula_be', 'possessive_standalone', 'short_answer', 'third_person_pronoun'],
    },
    {
      id: 'e01-s10-whose-phone-is-that',
      english: 'Whose phone is that?',
      russian: 'Чей это телефон?',
      explanation:
        'Тот же вопрос, но предмет далеко — поэтому that, а не this. Одно слово решает, где вещь: рядом или в стороне.',
      words: [
        {
          correct: 'Whose',
          category: 'question-word',
          distractors: [
            { value: 'Who’s', reasonCode: 'homophone_confusion', why: 'Who’s это «кто есть», а не «чей».' },
            { value: 'Who', reasonCode: 'wrong_question_word', why: 'Who — «кто», о человеке.' },
            { value: 'What', reasonCode: 'wrong_question_word', why: 'What — «что».' },
            { value: 'Whos', reasonCode: 'spelling_invalid', why: 'Такого написания нет.' },
            { value: 'Which', reasonCode: 'wrong_question_word', why: 'Which — «который», это выбор из известных.' },
          ],
        },
        {
          correct: 'phone',
          category: 'noun',
          distractors: [
            { value: 'phones', reasonCode: 'number_mismatch', why: 'Телефон один.' },
            { value: 'fone', reasonCode: 'spelling_invalid', why: 'Пишется через ph: phone.' },
            { value: 'phon', reasonCode: 'spelling_invalid', why: 'Пропущена буква e.' },
            { value: 'bone', reasonCode: 'near_homophone_confusion', why: 'Bone — «кость».' },
            { value: 'phoning', reasonCode: 'wrong_word_form', why: 'Нужно название предмета.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'are', reasonCode: 'agreement_number_mismatch', why: 'Телефон один, значит is.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
          ],
        },
        {
          correct: 'that',
          category: 'demonstrative',
          distractors: [
            { value: 'this', reasonCode: 'deixis_distance', why: 'This — о предмете рядом, а этот в стороне.' },
            { value: 'those', reasonCode: 'number_mismatch', why: 'Those — «те», о нескольких.' },
            { value: 'it', reasonCode: 'wrong_word_choice', why: 'Показывая на предмет, говорят that.' },
            { value: 'thet', reasonCode: 'spelling_invalid', why: 'Ошибка в написании.' },
            { value: 'these', reasonCode: 'number_mismatch', why: 'These — «эти», о нескольких и рядом.' },
          ],
        },
      ],
      features: ['possessive_question', 'copula_be', 'demonstrative'],
    },
    {
      id: 'e01-s10-it-is-my-brothers-phone',
      english: 'It is my brother’s phone',
      russian: 'Это телефон моего брата',
      explanation:
        'Апостроф работает с любым хозяином-человеком: brother’s, sister’s, Anna’s. Правило одно, слова разные.',
      words: [
        {
          correct: 'It',
          category: 'pronoun',
          distractors: [
            { value: 'This', reasonCode: 'wrong_word_choice', why: 'В ответе о названном предмете стоит it.' },
            { value: 'He', reasonCode: 'animacy_mismatch', why: 'He — про человека, а телефон предмет.' },
            { value: 'Its', reasonCode: 'possessive_as_subject', why: 'Its — принадлежность.' },
            { value: 'She', reasonCode: 'animacy_mismatch', why: 'She — про женщину.' },
            { value: 'it', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'are', reasonCode: 'agreement_number_mismatch', why: 'Телефон один, значит is.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'has', reasonCode: 'wrong_auxiliary', why: 'Чья вещь — говорят через быть.' },
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
            { value: 'his', reasonCode: 'wrong_referent', why: 'His — «его», а брат ваш.' },
            { value: 'a my', reasonCode: 'article_with_possessive', why: 'Артикль и my вместе не ставят.' },
          ],
        },
        {
          correct: 'brother’s',
          category: 'possessive-apostrophe',
          distractors: [
            { value: 'brother', reasonCode: 'possessive_apostrophe_missing', why: 'Без апострофа принадлежность пропадает.' },
            { value: 'brothers', reasonCode: 'possessive_apostrophe_missing', why: 'Brothers — «братья», а нужен апостроф.' },
            { value: 'brothers’', reasonCode: 'possessive_apostrophe_placement', why: 'Апостроф после s значит несколько братьев.' },
            { value: 'brother of', reasonCode: 'wrong_possessive_form', why: 'О людях так не говорят.' },
            { value: 'his brother’s', reasonCode: 'redundant_possessive', why: 'Хозяин уже назван словом my.' },
          ],
        },
        {
          correct: 'phone',
          category: 'noun',
          distractors: [
            { value: 'phones', reasonCode: 'number_mismatch', why: 'Телефон один.' },
            { value: 'fone', reasonCode: 'spelling_invalid', why: 'Пишется через ph.' },
            { value: 'phon', reasonCode: 'spelling_invalid', why: 'Пропущена буква e.' },
            { value: 'bone', reasonCode: 'near_homophone_confusion', why: 'Bone — «кость».' },
            { value: 'phoning', reasonCode: 'wrong_word_form', why: 'Нужно название предмета.' },
          ],
        },
      ],
      features: ['copula_be', 'possessive_my', 'possessive_apostrophe', 'family_noun'],
    },
    {
      id: 'e01-s10-this-is-annas-book',
      english: 'This is Anna’s book',
      russian: 'Это книга Анны',
      explanation:
        'С именами апостроф работает так же: Anna’s. Заметьте порядок — по-русски «книга Анны», по-английски наоборот, сначала хозяйка.',
      words: [
        {
          correct: 'This',
          category: 'demonstrative',
          distractors: [
            { value: 'That', reasonCode: 'deixis_distance', why: 'That — о дальнем предмете.' },
            { value: 'These', reasonCode: 'number_mismatch', why: 'These — «эти», о нескольких.' },
            { value: 'It', reasonCode: 'wrong_word_choice', why: 'Показывая на предмет, говорят this.' },
            { value: 'Thes', reasonCode: 'spelling_invalid', why: 'Ошибка в написании.' },
            { value: 'His', reasonCode: 'near_homophone_confusion', why: 'His — «его».' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'are', reasonCode: 'agreement_number_mismatch', why: 'Книга одна, значит is.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
            { value: 'has', reasonCode: 'wrong_auxiliary', why: 'Чья вещь — говорят через быть.' },
          ],
        },
        {
          correct: 'Anna’s',
          category: 'possessive-apostrophe',
          distractors: [
            { value: 'Anna', reasonCode: 'possessive_apostrophe_missing', why: 'Без апострофа получится «Анна книга».' },
            { value: 'Annas', reasonCode: 'possessive_apostrophe_missing', why: 'Нужен апостроф: Anna’s.' },
            { value: 'Annas’', reasonCode: 'possessive_apostrophe_placement', why: 'Апостроф после s значит несколько Анн.' },
            { value: 'her Anna’s', reasonCode: 'redundant_possessive', why: 'Хозяйка уже названа именем.' },
            { value: 'anna’s', reasonCode: 'capitalization_invalid', why: 'Имена всегда с заглавной буквы.' },
          ],
        },
        {
          correct: 'book',
          category: 'noun',
          distractors: [
            { value: 'books', reasonCode: 'number_mismatch', why: 'Книга одна.' },
            { value: 'buk', reasonCode: 'spelling_invalid', why: 'Ошибка в написании: book.' },
            { value: 'boock', reasonCode: 'spelling_invalid', why: 'Лишняя буква c.' },
            { value: 'look', reasonCode: 'near_homophone_confusion', why: 'Look — «смотреть».' },
            { value: 'booking', reasonCode: 'wrong_word_form', why: 'Booking — «бронирование».' },
          ],
        },
      ],
      features: ['demonstrative', 'copula_be', 'possessive_apostrophe', 'proper_noun'],
    },
    {
      id: 'e01-s10-it-is-not-mine',
      english: 'It is not mine',
      russian: 'Это не моё',
      explanation:
        'Отрицание там же, где всегда — сразу после связки. Полезная фраза: так отказываются от чужой вещи.',
      words: [
        {
          correct: 'It',
          category: 'pronoun',
          distractors: [
            { value: 'This', reasonCode: 'wrong_word_choice', why: 'О названном предмете говорят it.' },
            { value: 'He', reasonCode: 'animacy_mismatch', why: 'He — про человека.' },
            { value: 'Its', reasonCode: 'possessive_as_subject', why: 'Its — принадлежность.' },
            { value: 'Not', reasonCode: 'negator_as_subject', why: 'Not — частица, не подлежащее.' },
            { value: 'it', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'are', reasonCode: 'agreement_number_mismatch', why: 'Предмет один, значит is.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
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
            { value: 'doesn’t', reasonCode: 'wrong_auxiliary', why: 'При is вспомогательный глагол лишний.' },
            { value: 'nor', reasonCode: 'wrong_word_class', why: 'Nor соединяет два отрицания.' },
            { value: 'note', reasonCode: 'near_homophone_confusion', why: 'Note — «заметка».' },
          ],
        },
        {
          correct: 'mine',
          category: 'possessive-pronoun',
          distractors: [
            { value: 'my', reasonCode: 'possessive_needs_noun', why: 'My требует предмета после себя.' },
            { value: 'me', reasonCode: 'pronoun_instead_of_possessive', why: 'Me — форма дополнения.' },
            { value: 'I', reasonCode: 'pronoun_instead_of_possessive', why: 'Нужна принадлежность, а не «я».' },
            { value: 'mines', reasonCode: 'possessive_pluralized', why: 'Mine не меняется по числу.' },
            { value: 'mine’s', reasonCode: 'apostrophe_misuse', why: 'Апостроф здесь не ставят.' },
          ],
        },
      ],
      features: ['copula_be', 'negation_not', 'possessive_standalone', 'third_person_pronoun'],
    },
    {
      id: 'e01-s10-whose-is-it',
      english: 'Whose is it?',
      russian: 'Чьё это?',
      explanation:
        'Короткий вариант, когда предмет уже назван. Whose тут стоит один, без вещи — как mine и yours в ответах.',
      words: [
        {
          correct: 'Whose',
          category: 'question-word',
          distractors: [
            { value: 'Who’s', reasonCode: 'homophone_confusion', why: 'Who’s это «кто есть».' },
            { value: 'Who', reasonCode: 'wrong_question_word', why: 'Who — «кто», о человеке.' },
            { value: 'What', reasonCode: 'wrong_question_word', why: 'What — «что».' },
            { value: 'Whos', reasonCode: 'spelling_invalid', why: 'Такого написания нет.' },
            { value: 'House', reasonCode: 'near_homophone_confusion', why: 'House — «дом».' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'are', reasonCode: 'agreement_number_mismatch', why: 'Предмет один, значит is.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
          ],
        },
        {
          correct: 'it',
          category: 'pronoun',
          distractors: [
            { value: 'this', reasonCode: 'wrong_word_choice', why: 'В этом коротком вопросе стоит it.' },
            { value: 'he', reasonCode: 'animacy_mismatch', why: 'He — про человека.' },
            { value: 'its', reasonCode: 'possessive_as_subject', why: 'Its — принадлежность.' },
            { value: 'they', reasonCode: 'number_mismatch', why: 'They — о нескольких.' },
            { value: 'she', reasonCode: 'animacy_mismatch', why: 'She — про женщину.' },
          ],
        },
      ],
      features: ['possessive_question', 'copula_be', 'third_person_pronoun'],
    },
    {
      id: 'e01-s10-that-is-his-book',
      english: 'That is his book',
      russian: 'Это его книга',
      explanation:
        'Здесь апостроф не нужен: his само по себе значит принадлежность. Апостроф добавляют только к имени или названию человека.',
      words: [
        {
          correct: 'That',
          category: 'demonstrative',
          distractors: [
            { value: 'This', reasonCode: 'deixis_distance', why: 'This — о предмете рядом.' },
            { value: 'Those', reasonCode: 'number_mismatch', why: 'Those — «те», о нескольких.' },
            { value: 'It', reasonCode: 'wrong_word_choice', why: 'Показывая на предмет, говорят that.' },
            { value: 'These', reasonCode: 'number_mismatch', why: 'These — «эти», о нескольких.' },
            { value: 'Thet', reasonCode: 'spelling_invalid', why: 'Ошибка в написании.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'are', reasonCode: 'agreement_number_mismatch', why: 'Книга одна, значит is.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
            { value: 'has', reasonCode: 'wrong_auxiliary', why: 'Чья вещь — говорят через быть.' },
          ],
        },
        {
          correct: 'his',
          category: 'possessive',
          distractors: [
            { value: 'his’s', reasonCode: 'apostrophe_misuse', why: 'His уже значит принадлежность, апостроф лишний.' },
            { value: 'her', reasonCode: 'gender_mismatch', why: 'Her — «её», а книга принадлежит мужчине.' },
            { value: 'he', reasonCode: 'pronoun_instead_of_possessive', why: 'Перед предметом нужно his.' },
            { value: 'him', reasonCode: 'object_pronoun_as_possessive', why: 'Him — форма дополнения.' },
            { value: 'a his', reasonCode: 'article_with_possessive', why: 'Артикль и his вместе не ставят.' },
          ],
        },
        {
          correct: 'book',
          category: 'noun',
          distractors: [
            { value: 'books', reasonCode: 'number_mismatch', why: 'Книга одна.' },
            { value: 'buk', reasonCode: 'spelling_invalid', why: 'Ошибка в написании.' },
            { value: 'boock', reasonCode: 'spelling_invalid', why: 'Лишняя буква c.' },
            { value: 'look', reasonCode: 'near_homophone_confusion', why: 'Look — «смотреть».' },
            { value: 'booking', reasonCode: 'wrong_word_form', why: 'Booking — «бронирование».' },
          ],
        },
      ],
      features: ['demonstrative', 'copula_be', 'possessive_his_her'],
    },
    {
      id: 'e01-s10-is-this-your-sisters-bag',
      english: 'Is this your sister’s bag?',
      russian: 'Это сумка твоей сестры?',
      explanation:
        'Всё вместе: вопрос перестановкой, your перед хозяином и апостроф. Если собрали эту фразу — тема принадлежности пройдена.',
      words: [
        {
          correct: 'Is',
          category: 'to-be',
          distractors: [
            { value: 'Are', reasonCode: 'agreement_number_mismatch', why: 'Сумка одна, значит is.' },
            { value: 'Am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'Do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
            { value: 'Be', reasonCode: 'infinitive_not_finite', why: 'Вопрос так не строят.' },
            { value: 'Was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
          ],
        },
        {
          correct: 'this',
          category: 'demonstrative',
          distractors: [
            { value: 'that', reasonCode: 'deixis_distance', why: 'That — о дальнем предмете.' },
            { value: 'these', reasonCode: 'number_mismatch', why: 'These — о нескольких.' },
            { value: 'it', reasonCode: 'wrong_word_choice', why: 'Показывая на предмет рядом, говорят this.' },
            { value: 'thes', reasonCode: 'spelling_invalid', why: 'Ошибка в написании.' },
            { value: 'his', reasonCode: 'near_homophone_confusion', why: 'His — «его».' },
          ],
        },
        {
          correct: 'your',
          category: 'possessive',
          distractors: [
            { value: 'yours', reasonCode: 'possessive_pronoun_before_noun', why: 'Yours стоит без существительного.' },
            { value: 'you', reasonCode: 'pronoun_instead_of_possessive', why: 'Перед предметом ставят your.' },
            { value: 'her', reasonCode: 'wrong_referent', why: 'Спрашивают о твоей сестре.' },
            { value: 'a your', reasonCode: 'article_with_possessive', why: 'Артикль и your вместе не ставят.' },
            { value: 'ur', reasonCode: 'chat_abbreviation', why: 'Сокращение из переписки.' },
          ],
        },
        {
          correct: 'sister’s',
          category: 'possessive-apostrophe',
          distractors: [
            { value: 'sister', reasonCode: 'possessive_apostrophe_missing', why: 'Без апострофа принадлежность пропадает.' },
            { value: 'sisters', reasonCode: 'possessive_apostrophe_missing', why: 'Sisters — «сёстры», нужен апостроф.' },
            { value: 'sisters’', reasonCode: 'possessive_apostrophe_placement', why: 'Апостроф после s значит несколько сестёр.' },
            { value: 'sister of', reasonCode: 'wrong_possessive_form', why: 'О людях так не говорят.' },
            { value: 'her sister’s', reasonCode: 'redundant_possessive', why: 'Хозяин уже назван словом your.' },
          ],
        },
        {
          correct: 'bag',
          category: 'noun',
          distractors: [
            { value: 'bags', reasonCode: 'number_mismatch', why: 'Сумка одна.' },
            { value: 'bug', reasonCode: 'near_homophone_confusion', why: 'Bug — «жук».' },
            { value: 'big', reasonCode: 'near_homophone_confusion', why: 'Big — «большой».' },
            { value: 'back', reasonCode: 'near_homophone_confusion', why: 'Back — «спина».' },
            { value: 'beg', reasonCode: 'near_homophone_confusion', why: 'Beg — «умолять».' },
          ],
        },
      ],
      features: [
        'copula_be',
        'question_inversion',
        'demonstrative',
        'possessive_your',
        'possessive_apostrophe',
        'family_noun',
      ],
    },
  ]);
