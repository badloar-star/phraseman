// зачем: сессия 10 учит спрашивать о принадлежности (Whose) и отвечать двумя
// способами: апострофом (Anna’s) и самостоятельной формой (mine, hers).
//
// Тип words_then_phrases, а не phrases: агент-новичок прошёл сессию и поймал
// подлог — bag, phone и book появлялись прямо внутри фраз, хотя сессия 9 их не
// давала. «Их приходится угадывать по переводу», и это ровно то, чего быть не
// должно. Три слова теперь идут карточками впереди, как sister и brother.
import type { EpisodeSourcePhrase } from './episode_01_source_v1';

export const EPISODE_01_SESSION_10_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze([
    // ── Слова ──────────────────────────────────────────────────────────────
    {
      id: 'e01-s10-word-bag',
      english: 'Bag',
      russian: 'Сумка',
      explanation:
        'Короткое слово, но гласная в нём особенная: рот открывается шире, чем в русском «э». Не «бэг» и не «бег» — что-то между.',
      words: [
        {
          correct: 'Bag',
          category: 'noun',
          distractors: [
            { value: 'Bug', reasonCode: 'near_homophone_confusion', why: 'Bug — «жук», другая гласная.' },
            { value: 'Big', reasonCode: 'near_homophone_confusion', why: 'Big — «большой».' },
            { value: 'Back', reasonCode: 'near_homophone_confusion', why: 'Back — «спина», «назад».' },
            { value: 'Bags', reasonCode: 'number_mismatch', why: 'Bags — «сумки», несколько.' },
            { value: 'Beg', reasonCode: 'near_homophone_confusion', why: 'Beg — «умолять».' },
          ],
        },
      ],
      features: ['everyday_object_noun'],
    },
    {
      id: 'e01-s10-word-phone',
      english: 'Phone',
      russian: 'Телефон',
      explanation:
        'Пишется через ph, а читается как «ф» — так во всех словах греческого происхождения. Конечное e не произносится.',
      words: [
        {
          correct: 'Phone',
          category: 'noun',
          distractors: [
            { value: 'Fone', reasonCode: 'spelling_invalid', why: 'Звучит верно, но пишется через ph.' },
            { value: 'Phon', reasonCode: 'spelling_invalid', why: 'Пропущена буква e.' },
            { value: 'Bone', reasonCode: 'near_homophone_confusion', why: 'Bone — «кость».' },
            { value: 'Phones', reasonCode: 'number_mismatch', why: 'Phones — «телефоны», несколько.' },
            { value: 'Phoning', reasonCode: 'wrong_word_form', why: 'Phoning — «звонящий», нужно название предмета.' },
          ],
        },
      ],
      features: ['everyday_object_noun'],
    },
    {
      id: 'e01-s10-word-book',
      english: 'Book',
      russian: 'Книга',
      explanation:
        'Две буквы o подряд дают короткий звук, как в русском «бук». Не тяните его — длинное «у» превратит слово в другое.',
      words: [
        {
          correct: 'Book',
          category: 'noun',
          distractors: [
            { value: 'Buk', reasonCode: 'spelling_invalid', why: 'Пишется через две o: book.' },
            { value: 'Boock', reasonCode: 'spelling_invalid', why: 'Лишняя буква c.' },
            { value: 'Look', reasonCode: 'near_homophone_confusion', why: 'Look — «смотреть».' },
            { value: 'Books', reasonCode: 'number_mismatch', why: 'Books — «книги», несколько.' },
            { value: 'Booking', reasonCode: 'wrong_word_form', why: 'Booking — «бронирование».' },
          ],
        },
      ],
      features: ['everyday_object_noun'],
    },

    // ── Фразы ──────────────────────────────────────────────────────────────
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
            { value: 'mine’s', reasonCode: 'apostrophe_misuse', why: 'Апостроф этим словам не нужен никогда.' },
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

    // ── Ты не: You are not ────────────────────────────────────────────────
    {
      id: 'e01-s10-you-are-not-alone',
      english: 'You are not alone',
      russian: 'Ты не один',
      explanation:
        'Отрицание при you строится тем же способом, что и везде: not сразу после are. Признак alone не меняется, кто бы ни был рядом.',
      words: [
        {
          correct: 'You',
          category: 'pronoun',
          distractors: [
            { value: 'Your', reasonCode: 'possessive_as_subject', why: 'Your — «твой».' },
            { value: 'I', reasonCode: 'person_mismatch', why: 'I — «я», а речь о собеседнике.' },
            { value: 'Yours', reasonCode: 'possessive_as_subject', why: 'Yours заменяет предмет.' },
            { value: 'U', reasonCode: 'chat_abbreviation', why: 'Форма из переписки.' },
            { value: 'you', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'are',
          category: 'to-be',
          distractors: [
            { value: 'is', reasonCode: 'agreement_person_mismatch', why: 'Is — к he, she, it.' },
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
          correct: 'alone',
          category: 'adjective',
          distractors: [
            { value: 'alones', reasonCode: 'adjective_pluralized', why: 'Признаки не получают s.' },
            { value: 'along', reasonCode: 'near_homophone_confusion', why: 'Along — «вдоль».' },
            { value: 'lonely', reasonCode: 'meaning_mismatch', why: 'Lonely — «одинокий», про чувство, а не про наличие людей рядом.' },
            { value: 'a lone', reasonCode: 'spelling_invalid', why: 'Пишется одним словом: alone.' },
            { value: 'alon', reasonCode: 'spelling_invalid', why: 'Пропущена буква e.' },
          ],
        },
      ],
      features: ['second_person', 'copula_be', 'negation_not', 'state_adjective'],
    },
    {
      id: 'e01-s10-youre-not-my-teacher',
      english: "You're not my teacher",
      russian: 'Ты не мой учитель',
      explanation:
        'Сокращение you\'re плюс отрицание плюс принадлежность — три знакомых правила подряд. Артикля нет: my опять занимает его место.',
      words: [
        {
          correct: "You're",
          category: 'to-be',
          distractors: [
            { value: 'Your', reasonCode: 'possessive_instead_of_contraction', why: 'Your — «твой», без апострофа это не связка.' },
            { value: 'Youre', reasonCode: 'apostrophe_missing', why: 'Без апострофа это не сокращение.' },
            { value: "I'm", reasonCode: 'person_mismatch', why: "I'm относится к «я»." },
            { value: "They're", reasonCode: 'person_mismatch', why: "They're относится к «они»." },
            { value: "You'r", reasonCode: 'spelling_invalid', why: 'Пропущена буква e.' },
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
          correct: 'my',
          category: 'possessive',
          distractors: [
            { value: 'mine', reasonCode: 'possessive_pronoun_before_noun', why: 'Mine стоит без существительного.' },
            { value: 'me', reasonCode: 'pronoun_instead_of_possessive', why: 'Me — форма дополнения.' },
            { value: 'I', reasonCode: 'pronoun_instead_of_possessive', why: 'Перед предметом нужно my.' },
            { value: 'your', reasonCode: 'wrong_referent', why: 'Your — «твой», а учитель ваш.' },
            { value: 'a my', reasonCode: 'article_with_possessive', why: 'Артикль и my вместе не ставят.' },
          ],
        },
        {
          correct: 'teacher',
          category: 'noun',
          distractors: [
            { value: 'teachers', reasonCode: 'number_mismatch', why: 'Речь про одного человека.' },
            { value: 'teach', reasonCode: 'wrong_word_class', why: 'Teach — «учить», глагол.' },
            { value: 'teaching', reasonCode: 'wrong_word_form', why: 'Нужно название человека, а не действие.' },
            { value: 'techer', reasonCode: 'spelling_invalid', why: 'Пропущена буква a.' },
            { value: 'student', reasonCode: 'meaning_mismatch', why: 'Student — «студент».' },
          ],
        },
      ],
      features: ['second_person', 'copula_be', 'negation_not', 'possessive_my', 'noun_predicate', 'contraction'],
    },
    {
      id: 'e01-s10-you-are-not-here',
      english: 'You are not here',
      russian: 'Тебя здесь нет',
      explanation:
        'Снова разница с русским: мы говорим «тебя нет», англичане — «ты не здесь». Подлежащее you остаётся на месте, отрицается только присутствие.',
      words: [
        {
          correct: 'You',
          category: 'pronoun',
          distractors: [
            { value: 'Your', reasonCode: 'possessive_as_subject', why: 'Your — «твой».' },
            { value: 'I', reasonCode: 'person_mismatch', why: 'I — «я», а речь о собеседнике.' },
            { value: 'Yours', reasonCode: 'possessive_as_subject', why: 'Yours заменяет предмет.' },
            { value: 'He', reasonCode: 'person_mismatch', why: 'He — «он», третье лицо.' },
            { value: 'you', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'are',
          category: 'to-be',
          distractors: [
            { value: 'is', reasonCode: 'agreement_person_mismatch', why: 'Is — к he, she, it.' },
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
      features: ['second_person', 'copula_be', 'negation_not', 'adverb_place'],
    },
  ]);
