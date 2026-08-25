import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_21_LOCALIZED_DETAILS } from './es_episode_01_session_21_localized_details_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 21 "Предмет — он или она" / noun_gender, builtOn: [17, 18],
// recalls: [3, 18]): 15 фраз применения. Word-first libro (эта сессия) —
// существительное мужского рода, впервые в курсе стоящее рядом со своим
// артиклем el. Признаки caro/barato (сессия 18) и bonito (сессия 3, сессия
// 17) уже знакомы курсу и здесь согласуются не с абстрактным "по умолчанию",
// а с КОНКРЕТНЫМ родом слова libro — та же формула -o (recall 3), но теперь
// применённая к реальному существительному, а не только к безличной связке.
// El — служебный артикль, вводится как обычный позиционный токен слова (как
// no/de в прошлых сессиях), а не отдельная word-first единица.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s21-el-libro-es-caro',
      english: 'El libro es caro',
      russian: 'Книга дорогая',
      explanation:
        'Так называют конкретный предмет — книгу — и сразу оценивают его цену. El стоит перед libro, потому что libro мужского рода; caro согласуется с этим же родом формой на -o.',
      words: [
        {
          correct: 'El',
          category: 'article',
          distractors: [
            {
              value: 'La',
              reasonCode: 'article_gender_mismatch:El',
              why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен El, а не La.',
              trapType: 'grammar',
            },
            {
              value: 'Es',
              reasonCode: 'wrong_word:El',
              why: 'Es — это связка, она встанет дальше, а не в начале перед словом-предметом. Здесь нужен артикль El.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            {
              value: 'libre',
              reasonCode: 'wrong_word:libro',
              why: 'Libre означает «свободный» — совсем другое слово. Про книгу нужно libro.',
              trapType: 'phonetic',
            },
            {
              value: 'caro',
              reasonCode: 'wrong_word:libro',
              why: 'Caro — это признак «дорого», он не называет сам предмет. Нужно существительное libro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            {
              value: 'eres',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Eres — обращение к собеседнику. Оценка цены книги — только es.',
              trapType: 'grammar',
            },
            {
              value: 'soy',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Soy — про себя. Оценка цены книги — только es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'caro',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'cara',
              reasonCode: 'gender_mismatch:caro',
              why: 'Cara — форма женского рода, с -a. Libro мужского рода, поэтому нужна форма на -o: caro.',
              trapType: 'grammar',
            },
            {
              value: 'barato',
              reasonCode: 'wrong_word:caro',
              why: 'Barato означает «дёшево» — прямая противоположность. Нужно caro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'noun_gender', 'price_adjective'],
    },
    {
      id: 'es-e01-s21-el-libro-es-barato',
      english: 'El libro es barato',
      russian: 'Книга дешёвая',
      explanation:
        'Та же книга, но теперь с низкой ценой. El libro не меняется вовсе — меняется только признак: caro становится barato, оба на -o, потому что libro мужского рода.',
      words: [
        {
          correct: 'El',
          category: 'article',
          distractors: [
            {
              value: 'La',
              reasonCode: 'article_gender_mismatch:El',
              why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен El, а не La.',
              trapType: 'grammar',
            },
            {
              value: 'Los',
              reasonCode: 'article_number_mismatch:El',
              why: 'Los — артикль множественного числа. Здесь говорят об одной книге, нужен El.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            {
              value: 'litro',
              reasonCode: 'wrong_word:libro',
              why: 'Litro означает «литр», меру объёма — звучит похоже, но это другое слово. Про книгу нужно libro.',
              trapType: 'phonetic',
            },
            {
              value: 'barato',
              reasonCode: 'wrong_word:libro',
              why: 'Barato — это признак «дёшево», он не называет сам предмет. Нужно существительное libro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            {
              value: 'soy',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Soy — про себя. Оценка цены книги — только es.',
              trapType: 'grammar',
            },
            {
              value: 'eres',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Eres — обращение к собеседнику. Оценка цены книги — только es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'barato',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'barata',
              reasonCode: 'gender_mismatch:barato',
              why: 'Barata — форма женского рода, с -a. Libro мужского рода, поэтому нужна форма на -o: barato.',
              trapType: 'grammar',
            },
            {
              value: 'caro',
              reasonCode: 'wrong_word:barato',
              why: 'Caro означает «дорого» — прямая противоположность. Нужно barato.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'noun_gender', 'price_adjective'],
    },
    {
      id: 'es-e01-s21-es-caro-el-libro-q',
      english: '¿Es caro el libro?',
      russian: 'Книга дорогая?',
      explanation:
        'Так спрашивают о цене книги напрямую, начиная вопрос со связки. El libro встаёт после признака — обычный порядок для вопроса; знаки ¿...? обрамляют всю фразу.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнику. Вопрос о цене книги — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Вопрос о цене книги — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'caro',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'cara',
              reasonCode: 'gender_mismatch:caro',
              why: 'Cara — форма женского рода, с -a. Libro мужского рода, поэтому нужна форма на -o: caro.',
              trapType: 'grammar',
            },
            {
              value: 'bonito',
              reasonCode: 'wrong_word:caro',
              why: 'Bonito означает «красиво» — другой признак, не про цену. Нужно caro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'el',
          category: 'article',
          distractors: [
            {
              value: 'la',
              reasonCode: 'article_gender_mismatch:el',
              why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен el, а не la.',
              trapType: 'grammar',
            },
            {
              value: 'un',
              reasonCode: 'wrong_word:el',
              why: 'Un — другой тип артикля, здесь курс использует только el/la. Нужно el.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            {
              value: 'libre',
              reasonCode: 'wrong_word:libro',
              why: 'Libre означает «свободный» — совсем другое слово. Про книгу нужно libro.',
              trapType: 'phonetic',
            },
            {
              value: 'verdad',
              reasonCode: 'wrong_word:libro',
              why: 'Verdad означает «правда» — другое существительное, не про книгу. Нужно libro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'noun_gender', 'question_marks', 'price_adjective'],
    },
    {
      id: 'es-e01-s21-es-barato-el-libro-q',
      english: '¿Es barato el libro?',
      russian: 'Книга дешёвая?',
      explanation:
        'Тот же порядок вопроса, но про низкую цену. Es встаёт первым, el libro — в конце; форма barato остаётся на -o, потому что род книги не меняется.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Вопрос о цене книги — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнику. Вопрос о цене книги — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'barato',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'barata',
              reasonCode: 'gender_mismatch:barato',
              why: 'Barata — форма женского рода, с -a. Libro мужского рода, поэтому нужна форма на -o: barato.',
              trapType: 'grammar',
            },
            {
              value: 'fácil',
              reasonCode: 'wrong_word:barato',
              why: 'Fácil означает «легко» — совсем другой признак, не про цену. Нужно barato.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'el',
          category: 'article',
          distractors: [
            {
              value: 'la',
              reasonCode: 'article_gender_mismatch:el',
              why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен el, а не la.',
              trapType: 'grammar',
            },
            {
              value: 'los',
              reasonCode: 'article_number_mismatch:el',
              why: 'Los — артикль множественного числа. Здесь про одну книгу, нужен el.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            {
              value: 'litro',
              reasonCode: 'wrong_word:libro',
              why: 'Litro означает «литр» — звучит похоже, но это другое слово. Про книгу нужно libro.',
              trapType: 'phonetic',
            },
            {
              value: 'igual',
              reasonCode: 'wrong_word:libro',
              why: 'Igual означает «одинаково» — признак, а не предмет. Нужно существительное libro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'noun_gender', 'question_marks', 'price_adjective'],
    },
    {
      id: 'es-e01-s21-el-libro-no-es-caro',
      english: 'El libro no es caro',
      russian: 'Книга не дорогая',
      explanation:
        'Так возражают на чужую оценку цены книги как высокой. No встаёт перед связкой es, El libro остаётся на месте — отрицается только признак, а не сам предмет.',
      words: [
        {
          correct: 'El',
          category: 'article',
          distractors: [
            {
              value: 'La',
              reasonCode: 'article_gender_mismatch:El',
              why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен El, а не La.',
              trapType: 'grammar',
            },
            {
              value: 'No',
              reasonCode: 'word_order_invalid:El',
              why: 'No должно стоять перед связкой, а не в начале вместо артикля. Фраза начинается с El.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            {
              value: 'libre',
              reasonCode: 'wrong_word:libro',
              why: 'Libre означает «свободный» — совсем другое слово. Про книгу нужно libro.',
              trapType: 'phonetic',
            },
            {
              value: 'difícil',
              reasonCode: 'wrong_word:libro',
              why: 'Difícil означает «трудно» — признак, а не предмет. Нужно существительное libro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'no',
          category: 'negation',
          distractors: [
            {
              value: 'nada',
              reasonCode: 'negation_word_mismatch:no',
              why: 'Nada — «ничего», отдельное слово-предмет. Отрицание цены — no.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'non',
              reasonCode: 'orthographic_invalid:no',
              why: 'Non — не испанское слово. В испанском отрицание пишется no.',
              trapType: 'orthographic',
            },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            {
              value: 'eres',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Eres — обращение к собеседнику. Возражение про цену книги — только es.',
              trapType: 'grammar',
            },
            {
              value: 'soy',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Soy — про себя. Возражение про цену книги — только es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'caro',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'cara',
              reasonCode: 'gender_mismatch:caro',
              why: 'Cara — форма женского рода, с -a. Libro мужского рода, поэтому нужна форма на -o: caro.',
              trapType: 'grammar',
            },
            {
              value: 'barato',
              reasonCode: 'wrong_word:caro',
              why: 'Barato означает «дёшево» — прямая противоположность, а тут возражают именно про «дорого». Нужно caro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'noun_gender', 'negation', 'price_adjective'],
    },
    {
      id: 'es-e01-s21-el-libro-es-caro-o-barato-q',
      english: '¿El libro es caro o barato?',
      russian: 'Книга дорогая или дешёвая?',
      explanation:
        'Прямой вопрос о цене книги с выбором из двух признаков. El libro встаёт первым, затем связка и оба признака через союз o — оба на -o, согласуясь с родом libro.',
      words: [
        {
          correct: 'El',
          category: 'article',
          distractors: [
            {
              value: 'La',
              reasonCode: 'article_gender_mismatch:El',
              why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен El, а не La.',
              trapType: 'grammar',
            },
            {
              value: 'Es',
              reasonCode: 'word_order_invalid:El',
              why: 'Es — связка, она встанет дальше, после El libro, а не в начале фразы. Нужен артикль El.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            {
              value: 'litro',
              reasonCode: 'wrong_word:libro',
              why: 'Litro означает «литр» — звучит похоже, но это другое слово. Про книгу нужно libro.',
              trapType: 'phonetic',
            },
            {
              value: 'caro',
              reasonCode: 'wrong_word:libro',
              why: 'Caro — это признак «дорого», он не называет сам предмет. Нужно существительное libro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            {
              value: 'eres',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Eres — обращение к собеседнику. Вопрос о цене книги — только es.',
              trapType: 'grammar',
            },
            {
              value: 'soy',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Soy — про себя. Вопрос о цене книги — только es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'caro',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'cara',
              reasonCode: 'gender_mismatch:caro',
              why: 'Cara — форма женского рода, с -a. Libro мужского рода, поэтому нужна форма на -o: caro.',
              trapType: 'grammar',
            },
            {
              value: 'bonito',
              reasonCode: 'wrong_word:caro',
              why: 'Bonito означает «красиво» — другой признак, не про цену. Нужно caro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'o',
          category: 'conjunction',
          distractors: [
            {
              value: 'y',
              reasonCode: 'wrong_word:o',
              why: 'Y означает «и» — соединяет, а не предлагает выбор. Между двумя противоположными признаками нужно o.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'es',
              reasonCode: 'wrong_word:o',
              why: 'Es — связка, она уже стоит в начале фразы. Между двумя признаками нужен союз выбора o.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'barato',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'barata',
              reasonCode: 'gender_mismatch:barato',
              why: 'Barata — форма женского рода, с -a. Libro мужского рода, поэтому нужна форма на -o: barato.',
              trapType: 'grammar',
            },
            {
              value: 'difícil',
              reasonCode: 'wrong_word:barato',
              why: 'Difícil означает «трудно» — совсем другой признак, не про цену. Нужно barato.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'noun_gender', 'question_marks', 'price_adjective'],
    },
    {
      id: 'es-e01-s21-el-libro-es-bonito',
      english: 'El libro es bonito',
      russian: 'Книга красивая',
      explanation:
        'Так хвалят внешний вид книги — обложку, оформление. Bonito стоит на -o, потому что описывает libro, а не человека; это тот же признак, что уже звучал в прежних темах.',
      words: [
        {
          correct: 'El',
          category: 'article',
          distractors: [
            {
              value: 'La',
              reasonCode: 'article_gender_mismatch:El',
              why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен El, а не La.',
              trapType: 'grammar',
            },
            {
              value: 'Los',
              reasonCode: 'article_number_mismatch:El',
              why: 'Los — артикль множественного числа. Здесь говорят об одной книге, нужен El.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            {
              value: 'libre',
              reasonCode: 'wrong_word:libro',
              why: 'Libre означает «свободный» — совсем другое слово. Про книгу нужно libro.',
              trapType: 'phonetic',
            },
            {
              value: 'bonito',
              reasonCode: 'wrong_word:libro',
              why: 'Bonito — это признак «красиво», он не называет сам предмет. Нужно существительное libro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            {
              value: 'eres',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Eres — обращение к собеседнику. Оценка внешности книги — только es.',
              trapType: 'grammar',
            },
            {
              value: 'soy',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Soy — про себя. Оценка внешности книги — только es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'bonito',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'bonita',
              reasonCode: 'gender_mismatch:bonito',
              why: 'Bonita — форма женского рода, с -a. Libro мужского рода, поэтому нужна форма на -o: bonito.',
              trapType: 'grammar',
            },
            {
              value: 'único',
              reasonCode: 'wrong_word:bonito',
              why: 'Único означает «единственный» — совсем другой признак, не про внешность. Нужно bonito.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'noun_gender'],
    },
    {
      id: 'es-e01-s21-es-bonito-el-libro-q',
      english: '¿Es bonito el libro?',
      russian: 'Книга красивая?',
      explanation:
        'Вопрос о внешности книги, начинающийся со связки. El libro встаёт после признака; форма bonito не меняется — это тот же род, что и в предыдущих фразах.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнику. Вопрос о внешности книги — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Вопрос о внешности книги — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'bonito',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'bonita',
              reasonCode: 'gender_mismatch:bonito',
              why: 'Bonita — форма женского рода, с -a. Libro мужского рода, поэтому нужна форма на -o: bonito.',
              trapType: 'grammar',
            },
            {
              value: 'caro',
              reasonCode: 'wrong_word:bonito',
              why: 'Caro означает «дорого» — про цену, а не про внешность. Нужно bonito.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'el',
          category: 'article',
          distractors: [
            {
              value: 'la',
              reasonCode: 'article_gender_mismatch:el',
              why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен el, а не la.',
              trapType: 'grammar',
            },
            {
              value: 'un',
              reasonCode: 'wrong_word:el',
              why: 'Un — другой тип артикля, этот курс использует только el/la. Нужно el.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            {
              value: 'litro',
              reasonCode: 'wrong_word:libro',
              why: 'Litro означает «литр» — звучит похоже, но это другое слово. Про книгу нужно libro.',
              trapType: 'phonetic',
            },
            {
              value: 'verdad',
              reasonCode: 'wrong_word:libro',
              why: 'Verdad означает «правда» — другое существительное, не про книгу. Нужно libro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'noun_gender', 'question_marks'],
    },
    {
      id: 'es-e01-s21-el-libro-es-facil',
      english: 'El libro es fácil',
      russian: 'Книга простая',
      explanation:
        'Так оценивают саму книгу как несложную — например, для чтения. Признак fácil здесь не меняется по роду (правило сессии 1), но артикль el всё равно называет род самой книги.',
      words: [
        {
          correct: 'El',
          category: 'article',
          distractors: [
            {
              value: 'La',
              reasonCode: 'article_gender_mismatch:El',
              why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен El, а не La.',
              trapType: 'grammar',
            },
            {
              value: 'Es',
              reasonCode: 'wrong_word:El',
              why: 'Es — это связка, она встанет дальше, а не в начале перед словом-предметом. Здесь нужен артикль El.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            {
              value: 'libre',
              reasonCode: 'wrong_word:libro',
              why: 'Libre означает «свободный» — совсем другое слово. Про книгу нужно libro.',
              trapType: 'phonetic',
            },
            {
              value: 'fácil',
              reasonCode: 'wrong_word:libro',
              why: 'Fácil — это признак «легко», он не называет сам предмет. Нужно существительное libro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            {
              value: 'eres',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Eres — обращение к собеседнику. Оценка книги — только es.',
              trapType: 'grammar',
            },
            {
              value: 'soy',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Soy — про себя. Оценка книги — только es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'fácil',
          category: 'quality-adjective',
          distractors: [
            {
              value: 'difícil',
              reasonCode: 'antonym_confusion:fácil',
              why: 'Difícil значит противоположное — «трудно». Нужно fácil.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'caro',
              reasonCode: 'wrong_word:fácil',
              why: 'Caro означает «дорого» — про цену, а не про сложность. Нужно fácil.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'noun_gender'],
    },
    {
      id: 'es-e01-s21-el-libro-no-es-dificil',
      english: 'El libro no es difícil',
      russian: 'Книга не трудная',
      explanation:
        'Так возражают на мнение о сложности книги. No встаёт перед связкой es, El libro остаётся на месте — как и в прежних отрицаниях этого курса.',
      words: [
        {
          correct: 'El',
          category: 'article',
          distractors: [
            {
              value: 'La',
              reasonCode: 'article_gender_mismatch:El',
              why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен El, а не La.',
              trapType: 'grammar',
            },
            {
              value: 'No',
              reasonCode: 'word_order_invalid:El',
              why: 'No должно стоять перед связкой, а не в начале вместо артикля. Фраза начинается с El.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            {
              value: 'litro',
              reasonCode: 'wrong_word:libro',
              why: 'Litro означает «литр» — звучит похоже, но это другое слово. Про книгу нужно libro.',
              trapType: 'phonetic',
            },
            {
              value: 'difícil',
              reasonCode: 'wrong_word:libro',
              why: 'Difícil — это признак «трудно», он не называет сам предмет. Нужно существительное libro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'no',
          category: 'negation',
          distractors: [
            {
              value: 'nada',
              reasonCode: 'negation_word_mismatch:no',
              why: 'Nada — «ничего», отдельное слово-предмет. Отрицание сложности — no.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'non',
              reasonCode: 'orthographic_invalid:no',
              why: 'Non — не испанское слово. В испанском отрицание пишется no.',
              trapType: 'orthographic',
            },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            {
              value: 'eres',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Eres — обращение к собеседнику. Возражение про сложность книги — только es.',
              trapType: 'grammar',
            },
            {
              value: 'soy',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Soy — про себя. Возражение про сложность книги — только es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'difícil',
          category: 'quality-adjective',
          distractors: [
            {
              value: 'fácil',
              reasonCode: 'antonym_confusion:difícil',
              why: 'Fácil значит противоположное — «легко». Здесь возражают именно про сложность: нужно difícil.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'caro',
              reasonCode: 'wrong_word:difícil',
              why: 'Caro означает «дорого» — про цену, а не про сложность. Нужно difícil.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'negation', 'noun_gender'],
    },
    {
      id: 'es-e01-s21-es-verdad-el-libro-es-caro',
      english: '¿Es verdad?; el libro es caro',
      russian: 'Это правда? Книга дорогая',
      explanation:
        'Вопрос об истинности заявления и отдельное подтверждение через конкретный предмет — книгу. Первая часть безлична (Es verdad), вторая называет сам предмет и его цену.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнику напрямую. Вопрос об истинности факта — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Вопрос об истинности факта — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'verdad',
          category: 'quality-noun',
          distractors: [
            {
              value: 'caro',
              reasonCode: 'wrong_word:verdad',
              why: 'Caro уже используется дальше про цену книги. Здесь нужен вопрос об истинности: verdad.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'igual',
              reasonCode: 'wrong_word:verdad',
              why: 'Igual означает безразличие, а не вопрос об истинности. Нужно verdad.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'el',
          category: 'article',
          distractors: [
            {
              value: 'la',
              reasonCode: 'article_gender_mismatch:el',
              why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен el, а не la.',
              trapType: 'grammar',
            },
            {
              value: 'un',
              reasonCode: 'wrong_word:el',
              why: 'Un — другой тип артикля, этот курс использует только el/la. Нужно el.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            {
              value: 'libre',
              reasonCode: 'wrong_word:libro',
              why: 'Libre означает «свободный» — совсем другое слово. Про книгу нужно libro.',
              trapType: 'phonetic',
            },
            {
              value: 'verdad',
              reasonCode: 'wrong_word:libro',
              why: 'Verdad уже стояло выше в вопросе об истинности. Здесь нужно существительное libro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            {
              value: 'eres',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Eres — обращение к собеседнику. Оценка цены книги — только es.',
              trapType: 'grammar',
            },
            {
              value: 'soy',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Soy — про себя. Оценка цены книги — только es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'caro',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'cara',
              reasonCode: 'gender_mismatch:caro',
              why: 'Cara — форма женского рода, с -a. Libro мужского рода, поэтому нужна форма на -o: caro.',
              trapType: 'grammar',
            },
            {
              value: 'barato',
              reasonCode: 'wrong_word:caro',
              why: 'Barato означает «дёшево» — прямая противоположность. Нужно caro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'noun_gender', 'question_marks', 'fact_check', 'price_adjective'],
    },
    {
      id: 'es-e01-s21-de-acuerdo-el-libro-es-bonito',
      english: 'De acuerdo; el libro es bonito',
      russian: 'Согласен, книга красивая',
      explanation:
        'Согласие с чужим мнением, за которым следует отдельное заявление о внешности предмета. De acuerdo не меняется, el libro es bonito — обычное описание книги.',
      words: [
        {
          correct: 'De',
          category: 'agreement-phrase-part',
          distractors: [
            {
              value: 'Es',
              reasonCode: 'wrong_word:De',
              why: 'Es — связка «есть», а не часть формулы согласия. Формула согласия начинается с De.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'No',
              reasonCode: 'wrong_word:De',
              why: 'No отрицает, а тут утверждается согласие. Формула согласия начинается с De.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'acuerdo',
          category: 'agreement-phrase-part',
          distractors: [
            {
              value: 'igual',
              reasonCode: 'wrong_word:acuerdo',
              why: 'Igual означает безразличие, а не согласие. Нужно acuerdo.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'verdad',
              reasonCode: 'wrong_word:acuerdo',
              why: 'Verdad подтверждает факт, а не выражает согласие с мнением. Нужно acuerdo.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'el',
          category: 'article',
          distractors: [
            {
              value: 'la',
              reasonCode: 'article_gender_mismatch:el',
              why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен el, а не la.',
              trapType: 'grammar',
            },
            {
              value: 'los',
              reasonCode: 'article_number_mismatch:el',
              why: 'Los — артикль множественного числа. Здесь про одну книгу, нужен el.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            {
              value: 'litro',
              reasonCode: 'wrong_word:libro',
              why: 'Litro означает «литр» — звучит похоже, но это другое слово. Про книгу нужно libro.',
              trapType: 'phonetic',
            },
            {
              value: 'acuerdo',
              reasonCode: 'wrong_word:libro',
              why: 'Acuerdo уже использовано выше как часть формулы согласия. Здесь нужно существительное libro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            {
              value: 'eres',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Eres — обращение к собеседнику. Оценка внешности книги — только es.',
              trapType: 'grammar',
            },
            {
              value: 'soy',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Soy — про себя. Оценка внешности книги — только es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'bonito',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'bonita',
              reasonCode: 'gender_mismatch:bonito',
              why: 'Bonita — форма женского рода, с -a. Libro мужского рода, поэтому нужна форма на -o: bonito.',
              trapType: 'grammar',
            },
            {
              value: 'caro',
              reasonCode: 'wrong_word:bonito',
              why: 'Caro означает «дорого» — про цену, а не про внешность. Нужно bonito.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'noun_gender', 'agreement_phrase'],
    },
    {
      id: 'es-e01-s21-el-libro-es-importante',
      english: 'El libro es importante',
      russian: 'Книга важная',
      explanation:
        'Так называют значимость конкретной книги — например, для учёбы. Importante — признак без окончания рода (правило прежних тем), но артикль el всё равно называет род самого предмета.',
      words: [
        {
          correct: 'El',
          category: 'article',
          distractors: [
            {
              value: 'La',
              reasonCode: 'article_gender_mismatch:El',
              why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен El, а не La.',
              trapType: 'grammar',
            },
            {
              value: 'Es',
              reasonCode: 'wrong_word:El',
              why: 'Es — это связка, она встанет дальше, а не в начале перед словом-предметом. Здесь нужен артикль El.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            {
              value: 'libre',
              reasonCode: 'wrong_word:libro',
              why: 'Libre означает «свободный» — совсем другое слово. Про книгу нужно libro.',
              trapType: 'phonetic',
            },
            {
              value: 'importante',
              reasonCode: 'wrong_word:libro',
              why: 'Importante — это признак «важно», он не называет сам предмет. Нужно существительное libro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            {
              value: 'eres',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Eres — обращение к собеседнику. Оценка значимости книги — только es.',
              trapType: 'grammar',
            },
            {
              value: 'soy',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Soy — про себя. Оценка значимости книги — только es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'importante',
          category: 'quality-adjective',
          distractors: [
            {
              value: 'bonito',
              reasonCode: 'wrong_word:importante',
              why: 'Bonito означает «красиво» — про внешность, а не про значимость. Нужно importante.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'barato',
              reasonCode: 'wrong_word:importante',
              why: 'Barato означает «дёшево» — про цену, а не про значимость. Нужно importante.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'noun_gender'],
    },
    {
      id: 'es-e01-s21-es-caro-el-libro-no-es-igual-q',
      english: '¿Es caro el libro?; no es igual',
      russian: 'Книга дорогая? Это не всё равно',
      explanation:
        'Вопрос о цене конкретной книги и отдельное возражение против безразличия к ответу — цена книги имеет значение. Обе части используют одну и ту же связку es, потому что речь о предмете, а не о человеке.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнику. Вопрос о цене книги — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Вопрос о цене книги — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'caro',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'cara',
              reasonCode: 'gender_mismatch:caro',
              why: 'Cara — форма женского рода, с -a. Libro мужского рода, поэтому нужна форма на -o: caro.',
              trapType: 'grammar',
            },
            {
              value: 'bonito',
              reasonCode: 'wrong_word:caro',
              why: 'Bonito означает «красиво» — другой признак, не про цену. Нужно caro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'el',
          category: 'article',
          distractors: [
            {
              value: 'la',
              reasonCode: 'article_gender_mismatch:el',
              why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен el, а не la.',
              trapType: 'grammar',
            },
            {
              value: 'un',
              reasonCode: 'wrong_word:el',
              why: 'Un — другой тип артикля, этот курс использует только el/la. Нужно el.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            {
              value: 'litro',
              reasonCode: 'wrong_word:libro',
              why: 'Litro означает «литр» — звучит похоже, но это другое слово. Про книгу нужно libro.',
              trapType: 'phonetic',
            },
            {
              value: 'igual',
              reasonCode: 'wrong_word:libro',
              why: 'Igual уже используется дальше отдельно про безразличие. Здесь нужно существительное libro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'no',
          category: 'negation',
          distractors: [
            {
              value: 'nada',
              reasonCode: 'negation_word_mismatch:no',
              why: 'Nada — «ничего». Отрицание безразличия — no.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'non',
              reasonCode: 'orthographic_invalid:no',
              why: 'Non — не испанское слово. Отрицание пишется no.',
              trapType: 'orthographic',
            },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            {
              value: 'eres',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Eres — обращение к собеседнику. Возражение про безразличие — только es.',
              trapType: 'grammar',
            },
            {
              value: 'soy',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Soy — про себя. Возражение про безразличие — только es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'igual',
          category: 'invariable-adjective',
          distractors: [
            {
              value: 'verdad',
              reasonCode: 'wrong_word:igual',
              why: 'Verdad — про истинность факта, а не про безразличие. Нужно igual.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'iguala',
              reasonCode: 'invariable_adjective_wrongly_inflected:igual',
              why: 'Igual не меняется по роду — формы iguala не существует.',
              trapType: 'grammar',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'noun_gender', 'question_marks', 'negation', 'price_adjective'],
    },
    {
      id: 'es-e01-s21-el-libro-es-unico',
      english: 'El libro es único',
      russian: 'Книга единственная в своём роде',
      explanation:
        'Так подчёркивают неповторимость конкретной книги. Único согласуется с родом libro формой на -o — тем же принципом, что и caro/barato/bonito выше в этой теме.',
      words: [
        {
          correct: 'El',
          category: 'article',
          distractors: [
            {
              value: 'La',
              reasonCode: 'article_gender_mismatch:El',
              why: 'La — артикль женского рода. Libro мужского рода, поэтому нужен El, а не La.',
              trapType: 'grammar',
            },
            {
              value: 'Los',
              reasonCode: 'article_number_mismatch:El',
              why: 'Los — артикль множественного числа. Здесь говорят об одной книге, нужен El.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'libro',
          category: 'noun',
          distractors: [
            {
              value: 'libre',
              reasonCode: 'wrong_word:libro',
              why: 'Libre означает «свободный» — совсем другое слово. Про книгу нужно libro.',
              trapType: 'phonetic',
            },
            {
              value: 'único',
              reasonCode: 'wrong_word:libro',
              why: 'Único — это признак «единственный», он не называет сам предмет. Нужно существительное libro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
        {
          correct: 'es',
          category: 'ser',
          distractors: [
            {
              value: 'eres',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Eres — обращение к собеседнику. Оценка книги — только es.',
              trapType: 'grammar',
            },
            {
              value: 'soy',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Soy — про себя. Оценка книги — только es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'único',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'única',
              reasonCode: 'gender_mismatch:único',
              why: 'Única — форма женского рода, с -a. Libro мужского рода, поэтому нужна форма на -o: único.',
              trapType: 'grammar',
            },
            {
              value: 'unico',
              reasonCode: 'accent_missing:único',
              why: 'Unico без тильды над ú звучал бы и писался бы иначе. Нужна форма único с тильдой.',
              trapType: 'orthographic',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'noun_gender', 'written_accent'],
    },
  ]);

export const ES_EPISODE_01_SESSION_21_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_21_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
