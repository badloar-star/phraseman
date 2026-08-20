// зачем: сессия 9 открывает вторую главу — «Люди вокруг меня». Тип
// words_then_phrases: сначала слова родства и притяжательные his / her, потом
// фразы из них. Строится на сессии 6 (he / she / it): человек уже умеет
// говорить о третьем лице, теперь учится называть, кто это.
import type { EpisodeSourcePhrase } from './episode_01_source_v1';

export const EPISODE_01_SESSION_09_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze([
    // ── Слова ──────────────────────────────────────────────────────────────
    {
      id: 'e01-s09-word-sister',
      english: 'Sister',
      russian: 'Сестра',
      explanation:
        'Слово короткое, но с ловушкой: первый звук — обычное «с», а не «ш». И то самое английское r в конце, которое язык не раскатывает.',
      words: [
        {
          correct: 'Sister',
          category: 'family-noun',
          distractors: [
            { value: 'Brother', reasonCode: 'meaning_mismatch', why: 'Brother — «брат», это мужчина.' },
            { value: 'Sisters', reasonCode: 'number_mismatch', why: 'Sisters — «сёстры», несколько.' },
            { value: 'Siter', reasonCode: 'spelling_invalid', why: 'Пропущена буква s.' },
            { value: 'Sistr', reasonCode: 'spelling_invalid', why: 'Пропущена буква e.' },
            { value: 'Sitter', reasonCode: 'near_homophone_confusion', why: 'Sitter — «сиделка», другое слово.' },
          ],
        },
      ],
      features: ['family_noun'],
    },
    {
      id: 'e01-s09-word-brother',
      english: 'Brother',
      russian: 'Брат',
      explanation:
        'В середине звук th — язык между зубами, как в thank. Не «брозер» и не «бразер»: язык должно быть видно.',
      words: [
        {
          correct: 'Brother',
          category: 'family-noun',
          distractors: [
            { value: 'Sister', reasonCode: 'meaning_mismatch', why: 'Sister — «сестра», это женщина.' },
            { value: 'Brothers', reasonCode: 'number_mismatch', why: 'Brothers — «братья», несколько.' },
            { value: 'Brozer', reasonCode: 'th_substitution', why: 'Так слышится, если язык не между зубами.' },
            { value: 'Bother', reasonCode: 'near_homophone_confusion', why: 'Bother — «беспокоить».' },
            { value: 'Brather', reasonCode: 'spelling_invalid', why: 'Ошибка в написании: brother.' },
          ],
        },
      ],
      features: ['family_noun'],
    },
    {
      id: 'e01-s09-word-mother',
      english: 'Mother',
      russian: 'Мама',
      explanation:
        'Тот же звук th, что и в brother. В разговоре чаще говорят mum или mom — так же, как мы говорим «мама», а не «мать».',
      words: [
        {
          correct: 'Mother',
          category: 'family-noun',
          distractors: [
            { value: 'Father', reasonCode: 'meaning_mismatch', why: 'Father — «папа», это мужчина.' },
            { value: 'Mothers', reasonCode: 'number_mismatch', why: 'Мама одна, множественное число не нужно.' },
            { value: 'Mozer', reasonCode: 'th_substitution', why: 'Так слышится без языка между зубами.' },
            { value: 'Mather', reasonCode: 'spelling_invalid', why: 'Ошибка в написании: mother.' },
            { value: 'Mouther', reasonCode: 'spelling_invalid', why: 'Лишняя буква u.' },
          ],
        },
      ],
      features: ['family_noun'],
    },
    {
      id: 'e01-s09-word-his',
      english: 'His',
      russian: 'Его',
      explanation:
        'Слово о принадлежности мужчине. Вы уже знаете my и your — his работает точно так же и ставится перед предметом.',
      words: [
        {
          correct: 'His',
          category: 'possessive',
          distractors: [
            { value: 'Her', reasonCode: 'gender_mismatch', why: 'Her — «её», принадлежность женщине.' },
            { value: 'He', reasonCode: 'pronoun_instead_of_possessive', why: 'He — «он», а перед предметом нужно his.' },
            { value: 'Him', reasonCode: 'object_pronoun_as_possessive', why: 'Him — форма дополнения, не принадлежность.' },
            { value: 'His’s', reasonCode: 'apostrophe_misuse', why: 'Такой формы не существует.' },
            { value: 'Is', reasonCode: 'near_homophone_confusion', why: 'Is — форма связки, а не принадлежность.' },
          ],
        },
      ],
      features: ['possessive_his_her'],
    },
    {
      id: 'e01-s09-word-her',
      english: 'Her',
      russian: 'Её',
      explanation:
        'Принадлежность женщине. Обратите внимание: her — одно слово и для «её сумка», и для «вижу её». Английский тут проще русского.',
      words: [
        {
          correct: 'Her',
          category: 'possessive',
          distractors: [
            { value: 'His', reasonCode: 'gender_mismatch', why: 'His — «его», принадлежность мужчине.' },
            { value: 'She', reasonCode: 'pronoun_instead_of_possessive', why: 'She — «она», а перед предметом нужно her.' },
            { value: 'Hers', reasonCode: 'possessive_pronoun_before_noun', why: 'Hers стоит без существительного.' },
            { value: 'Here', reasonCode: 'near_homophone_confusion', why: 'Here — «здесь», это про место.' },
            { value: 'Hear', reasonCode: 'near_homophone_confusion', why: 'Hear — «слышать».' },
          ],
        },
      ],
      features: ['possessive_his_her'],
    },

    // ── Фразы ──────────────────────────────────────────────────────────────
    {
      id: 'e01-s09-this-is-my-sister',
      english: 'This is my sister',
      russian: 'Это моя сестра',
      explanation:
        'Так представляют человека, показывая на него. Артикля нет — слово my уже заняло его место, вы это правило знаете.',
      words: [
        {
          correct: 'This',
          category: 'demonstrative',
          distractors: [
            { value: 'That', reasonCode: 'deixis_distance', why: 'That — «то», о дальнем. Рядом — this.' },
            { value: 'These', reasonCode: 'number_mismatch', why: 'These — «эти», о нескольких.' },
            { value: 'It', reasonCode: 'wrong_word_choice', why: 'Представляя человека, говорят this.' },
            { value: 'She', reasonCode: 'wrong_word_choice', why: 'В этой формуле знакомства стоит this.' },
            { value: 'Thes', reasonCode: 'spelling_invalid', why: 'Ошибка в написании.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'are', reasonCode: 'agreement_number_mismatch', why: 'Человек один, значит is.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
          ],
        },
        {
          correct: 'my',
          category: 'possessive',
          distractors: [
            { value: 'mine', reasonCode: 'possessive_pronoun_before_noun', why: 'Mine стоит без существительного.' },
            { value: 'I', reasonCode: 'pronoun_instead_of_possessive', why: 'Перед предметом нужно my.' },
            { value: 'me', reasonCode: 'pronoun_instead_of_possessive', why: 'Me — форма дополнения.' },
            { value: 'a my', reasonCode: 'article_with_possessive', why: 'Артикль и my вместе не ставят.' },
            { value: 'her', reasonCode: 'wrong_referent', why: 'Her — «её», а сестра ваша.' },
          ],
        },
        {
          correct: 'sister',
          category: 'family-noun',
          distractors: [
            { value: 'sisters', reasonCode: 'number_mismatch', why: 'Сестра одна.' },
            { value: 'brother', reasonCode: 'meaning_mismatch', why: 'Brother — «брат».' },
            { value: 'siter', reasonCode: 'spelling_invalid', why: 'Пропущена буква s.' },
            { value: 'sitter', reasonCode: 'near_homophone_confusion', why: 'Sitter — «сиделка».' },
            { value: 'sistr', reasonCode: 'spelling_invalid', why: 'Пропущена буква e.' },
          ],
        },
      ],
      features: ['demonstrative', 'copula_be', 'possessive_my', 'family_noun', 'noun_predicate'],
    },
    {
      id: 'e01-s09-he-is-my-brother',
      english: 'He is my brother',
      russian: 'Он мой брат',
      explanation:
        'Когда о человеке уже говорили, вместо this берут he. Разница простая: this показывает пальцем, he продолжает разговор.',
      words: [
        {
          correct: 'He',
          category: 'pronoun',
          distractors: [
            { value: 'Him', reasonCode: 'object_pronoun_as_subject', why: 'Him — форма дополнения.' },
            { value: 'His', reasonCode: 'possessive_as_subject', why: 'His — «его», принадлежность.' },
            { value: 'She', reasonCode: 'gender_mismatch', why: 'She — «она», а брат мужчина.' },
            { value: 'It', reasonCode: 'animacy_mismatch', why: 'It — про предмет, не про человека.' },
            { value: 'he', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'are', reasonCode: 'agreement_number_mismatch', why: 'Он один, значит is.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
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
            { value: 'his', reasonCode: 'wrong_referent', why: 'His — «его», а брат ваш.' },
            { value: 'the my', reasonCode: 'article_with_possessive', why: 'Артикль и my вместе не ставят.' },
          ],
        },
        {
          correct: 'brother',
          category: 'family-noun',
          distractors: [
            { value: 'brothers', reasonCode: 'number_mismatch', why: 'Брат один, значит без окончания s.' },
            { value: 'sister', reasonCode: 'meaning_mismatch', why: 'Sister — «сестра».' },
            { value: 'brozer', reasonCode: 'th_substitution', why: 'Так слышится без звука th.' },
            { value: 'bother', reasonCode: 'near_homophone_confusion', why: 'Bother — «беспокоить».' },
            { value: 'brather', reasonCode: 'spelling_invalid', why: 'Ошибка в написании.' },
          ],
        },
      ],
      features: ['third_person_pronoun', 'copula_be', 'possessive_my', 'family_noun', 'noun_predicate'],
    },
    {
      id: 'e01-s09-her-name-is-anna',
      english: 'Her name is Anna',
      russian: 'Её зовут Анна',
      explanation:
        'Дословно «её имя есть Анна». По-русски мы говорим «её зовут», в английском имя — это предмет, у которого есть хозяйка.',
      words: [
        {
          correct: 'Her',
          category: 'possessive',
          distractors: [
            { value: 'His', reasonCode: 'gender_mismatch', why: 'His — «его», а речь о женщине.' },
            { value: 'She', reasonCode: 'pronoun_instead_of_possessive', why: 'Перед предметом нужно her.' },
            { value: 'Hers', reasonCode: 'possessive_pronoun_before_noun', why: 'Hers стоит без существительного.' },
            { value: 'Here', reasonCode: 'near_homophone_confusion', why: 'Here — «здесь».' },
            { value: 'her', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
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
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'are', reasonCode: 'agreement_number_mismatch', why: 'Name — один предмет, значит is.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
          ],
        },
        {
          correct: 'Anna',
          category: 'name',
          distractors: [
            { value: 'anna', reasonCode: 'capitalization_invalid', why: 'Имена всегда с заглавной буквы.' },
            { value: 'Ana', reasonCode: 'spelling_invalid', why: 'Другое написание — другое имя.' },
            { value: 'Anne', reasonCode: 'spelling_invalid', why: 'Anne — самостоятельное имя.' },
            { value: 'Annas', reasonCode: 'number_mismatch', why: 'Имя не ставят во множественное число.' },
            { value: 'name', reasonCode: 'wrong_word_choice', why: 'Здесь называют само имя.' },
          ],
        },
      ],
      features: ['possessive_his_her', 'copula_be', 'proper_noun', 'noun_predicate'],
    },
    {
      id: 'e01-s09-his-sister-is-a-doctor',
      english: 'His sister is a doctor',
      russian: 'Его сестра врач',
      explanation:
        'Здесь два слова о принадлежности подряд не стоят: his относится к сестре, а перед профессией снова нужен артикль a.',
      words: [
        {
          correct: 'His',
          category: 'possessive',
          distractors: [
            { value: 'Her', reasonCode: 'gender_mismatch', why: 'Her — «её», а сестра принадлежит ему.' },
            { value: 'He', reasonCode: 'pronoun_instead_of_possessive', why: 'Перед предметом нужно his.' },
            { value: 'Him', reasonCode: 'object_pronoun_as_possessive', why: 'Him — форма дополнения.' },
            { value: 'Hers', reasonCode: 'possessive_pronoun_before_noun', why: 'Hers стоит без существительного.' },
            { value: 'his', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'sister',
          category: 'family-noun',
          distractors: [
            { value: 'sisters', reasonCode: 'number_mismatch', why: 'Сестра одна.' },
            { value: 'brother', reasonCode: 'meaning_mismatch', why: 'Brother — «брат».' },
            { value: 'siter', reasonCode: 'spelling_invalid', why: 'Пропущена буква s.' },
            { value: 'sitter', reasonCode: 'near_homophone_confusion', why: 'Sitter — «сиделка».' },
            { value: 'sistr', reasonCode: 'spelling_invalid', why: 'Пропущена буква e.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'are', reasonCode: 'agreement_number_mismatch', why: 'Сестра одна, значит is.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'has', reasonCode: 'wrong_auxiliary', why: 'Профессию называют через быть.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
          ],
        },
        {
          correct: 'a',
          category: 'article',
          distractors: [
            { value: 'an', reasonCode: 'article_form_mismatch', why: 'An — перед гласным звуком, doctor начинается с согласного.' },
            { value: 'the', reasonCode: 'article_definiteness_wrong', why: 'The — про конкретного, известного врача.' },
            { value: 'his', reasonCode: 'possessive_instead_of_article', why: 'His doctor — «его врач», другой смысл.' },
            { value: 'one', reasonCode: 'numeral_instead_of_article', why: 'One — число «один».' },
            { value: 'some', reasonCode: 'quantifier_instead_of_article', why: 'Some — «несколько».' },
          ],
        },
        {
          correct: 'doctor',
          category: 'noun',
          distractors: [
            { value: 'doctors', reasonCode: 'number_mismatch', why: 'После a всегда единственное число.' },
            { value: 'docter', reasonCode: 'spelling_invalid', why: 'Ошибка в написании: doctor.' },
            { value: 'doctoring', reasonCode: 'wrong_word_form', why: 'После артикля нужно существительное.' },
            { value: 'teacher', reasonCode: 'meaning_mismatch', why: 'Teacher — «учитель», другая профессия.' },
            { value: 'doc', reasonCode: 'register_mismatch', why: 'Doc — очень разговорное сокращение.' },
          ],
        },
      ],
      features: ['possessive_his_her', 'family_noun', 'copula_be', 'indefinite_article', 'noun_predicate'],
    },
    {
      id: 'e01-s09-my-mother-is-here',
      english: 'My mother is here',
      russian: 'Моя мама здесь',
      explanation:
        'Знакомая схема из первой главы, только вместо «я» теперь мама. Порядок слов не меняется никогда: кто, связка, где.',
      words: [
        {
          correct: 'My',
          category: 'possessive',
          distractors: [
            { value: 'Mine', reasonCode: 'possessive_pronoun_before_noun', why: 'Mine стоит без существительного.' },
            { value: 'Me', reasonCode: 'pronoun_instead_of_possessive', why: 'Me — форма дополнения.' },
            { value: 'I', reasonCode: 'pronoun_instead_of_possessive', why: 'Перед предметом нужно my.' },
            { value: 'Her', reasonCode: 'wrong_referent', why: 'Her — «её», а мама ваша.' },
            { value: 'my', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
          ],
        },
        {
          correct: 'mother',
          category: 'family-noun',
          distractors: [
            { value: 'mothers', reasonCode: 'number_mismatch', why: 'Мама одна, значит без окончания s.' },
            { value: 'father', reasonCode: 'meaning_mismatch', why: 'Father — «папа».' },
            { value: 'mozer', reasonCode: 'th_substitution', why: 'Так слышится без звука th.' },
            { value: 'mather', reasonCode: 'spelling_invalid', why: 'Ошибка в написании.' },
            { value: 'mouther', reasonCode: 'spelling_invalid', why: 'Лишняя буква u.' },
          ],
        },
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'are', reasonCode: 'agreement_number_mismatch', why: 'Мама одна, значит is.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
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
      features: ['possessive_my', 'family_noun', 'copula_be', 'adverb_place'],
    },
    {
      id: 'e01-s09-is-she-your-sister',
      english: 'Is she your sister?',
      russian: 'Она твоя сестра?',
      explanation:
        'Вопрос знакомой перестановкой. Обратите внимание: your перед предметом, а не you — правило из сессии 4 работает и здесь.',
      words: [
        {
          correct: 'Is',
          category: 'to-be',
          distractors: [
            { value: 'Are', reasonCode: 'agreement_number_mismatch', why: 'She — один человек, значит is.' },
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
            { value: 'he', reasonCode: 'gender_mismatch', why: 'He — «он», а сестра женщина.' },
            { value: 'it', reasonCode: 'animacy_mismatch', why: 'It — про предмет.' },
            { value: 'they', reasonCode: 'number_mismatch', why: 'They — несколько человек.' },
          ],
        },
        {
          correct: 'your',
          category: 'possessive',
          distractors: [
            { value: 'you', reasonCode: 'pronoun_instead_of_possessive', why: 'Перед предметом ставят your.' },
            { value: 'yours', reasonCode: 'possessive_pronoun_before_noun', why: 'Yours стоит без существительного.' },
            { value: 'her', reasonCode: 'wrong_referent', why: 'Спрашивают о вашей сестре, а не о её.' },
            { value: 'a your', reasonCode: 'article_with_possessive', why: 'Артикль и your вместе не ставят.' },
            { value: 'ur', reasonCode: 'chat_abbreviation', why: 'Сокращение из переписки.' },
          ],
        },
        {
          correct: 'sister',
          category: 'family-noun',
          distractors: [
            { value: 'sisters', reasonCode: 'number_mismatch', why: 'Спрашивают про одного человека.' },
            { value: 'brother', reasonCode: 'meaning_mismatch', why: 'Brother — «брат».' },
            { value: 'siter', reasonCode: 'spelling_invalid', why: 'Пропущена буква s.' },
            { value: 'sitter', reasonCode: 'near_homophone_confusion', why: 'Sitter — «сиделка».' },
            { value: 'sistr', reasonCode: 'spelling_invalid', why: 'Пропущена буква e.' },
          ],
        },
      ],
      features: ['copula_be', 'question_inversion', 'possessive_your', 'family_noun', 'third_person_pronoun'],
    },
    {
      id: 'e01-s09-his-name-is-tom',
      english: 'His name is Tom',
      russian: 'Его зовут Том',
      explanation:
        'Та же схема, что и с Анной, только про мужчину. Одна конструкция — и вы называете имя любого человека.',
      words: [
        {
          correct: 'His',
          category: 'possessive',
          distractors: [
            { value: 'Her', reasonCode: 'gender_mismatch', why: 'Her — «её», а речь о мужчине.' },
            { value: 'He', reasonCode: 'pronoun_instead_of_possessive', why: 'Перед предметом нужно his.' },
            { value: 'Him', reasonCode: 'object_pronoun_as_possessive', why: 'Him — форма дополнения.' },
            { value: 'Is', reasonCode: 'near_homophone_confusion', why: 'Is — форма связки.' },
            { value: 'his', reasonCode: 'capitalization_invalid', why: 'В начале предложения заглавная.' },
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
        {
          correct: 'is',
          category: 'to-be',
          distractors: [
            { value: 'are', reasonCode: 'agreement_number_mismatch', why: 'Name — один предмет, значит is.' },
            { value: 'am', reasonCode: 'agreement_person_mismatch', why: 'Am — только к I.' },
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'was', reasonCode: 'tense_mismatch', why: 'Was — про прошлое.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
          ],
        },
        {
          correct: 'Tom',
          category: 'name',
          distractors: [
            { value: 'tom', reasonCode: 'capitalization_invalid', why: 'Имена всегда с заглавной буквы.' },
            { value: 'Tomm', reasonCode: 'spelling_invalid', why: 'Лишняя буква m.' },
            { value: 'Toms', reasonCode: 'number_mismatch', why: 'Имя не ставят во множественное число.' },
            { value: 'Tim', reasonCode: 'spelling_invalid', why: 'Tim — другое имя.' },
            { value: 'name', reasonCode: 'wrong_word_choice', why: 'Здесь называют само имя.' },
          ],
        },
      ],
      features: ['possessive_his_her', 'copula_be', 'proper_noun', 'noun_predicate'],
    },

    // ── Ты есть: You are + признак / место ────────────────────────────────
    {
      id: 'e01-s09-you-are-ready',
      english: 'You are ready',
      russian: 'Ты готов',
      explanation:
        'Связка are обслуживает you точно так же, как we и they. Признак ready опять без изменений — он никогда не подстраивается под того, о ком речь.',
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
      ],
      features: ['second_person', 'copula_be', 'state_adjective'],
    },
    {
      id: 'e01-s09-you-are-my-friend',
      english: 'You are my friend',
      russian: 'Ты мой друг',
      explanation:
        'Здесь you называют, кто есть собеседник, через принадлежность my. Артикль не нужен — my уже занял его место, вы знаете это правило.',
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
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'were', reasonCode: 'tense_mismatch', why: 'Were — про прошлое.' },
            { value: 'have', reasonCode: 'wrong_auxiliary', why: 'Кто ты — говорят через быть.' },
          ],
        },
        {
          correct: 'my',
          category: 'possessive',
          distractors: [
            { value: 'mine', reasonCode: 'possessive_pronoun_before_noun', why: 'Mine стоит без существительного.' },
            { value: 'me', reasonCode: 'pronoun_instead_of_possessive', why: 'Me — форма дополнения.' },
            { value: 'I', reasonCode: 'pronoun_instead_of_possessive', why: 'Перед предметом нужно my.' },
            { value: 'your', reasonCode: 'wrong_referent', why: 'Your — «твой», а друг ваш.' },
            { value: 'a my', reasonCode: 'article_with_possessive', why: 'Артикль и my вместе не ставят.' },
          ],
        },
        {
          correct: 'friend',
          category: 'noun',
          distractors: [
            { value: 'friends', reasonCode: 'number_mismatch', why: 'Речь про одного человека.' },
            { value: 'freind', reasonCode: 'spelling_invalid', why: 'Переставлены буквы.' },
            { value: 'friendly', reasonCode: 'wrong_word_class', why: 'Friendly — «дружелюбный».' },
            { value: 'frend', reasonCode: 'spelling_invalid', why: 'Пропущена буква i.' },
            { value: 'friendship', reasonCode: 'wrong_word_class', why: 'Friendship — «дружба».' },
          ],
        },
      ],
      features: ['second_person', 'copula_be', 'possessive_my', 'noun_predicate'],
    },
    {
      id: 'e01-s09-you-are-here-now',
      english: 'You are here now',
      russian: 'Ты уже здесь',
      explanation:
        'Место и время вместе, оба слова в конце фразы. Порядок тот же, что вы уже видели: сначала место, потом время.',
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
            { value: 'be', reasonCode: 'infinitive_not_finite', why: 'Нужна личная форма.' },
            { value: 'were', reasonCode: 'tense_mismatch', why: 'Were — про прошлое.' },
            { value: 'do', reasonCode: 'wrong_auxiliary', why: 'Со связкой do не ставят.' },
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
      features: ['second_person', 'copula_be', 'adverb_place', 'adverb_time'],
    },
  ]);
