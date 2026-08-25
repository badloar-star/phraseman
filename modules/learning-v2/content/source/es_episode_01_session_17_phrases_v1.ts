import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_17_LOCALIZED_DETAILS } from './es_episode_01_session_17_localized_details_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 17 "Это так" / third_person_singular, builtOn: [1, 9], recalls: [3],
// открывает Главу 3 "Он, она, оно: предметы и ситуации"): 15 фраз применения
// только с Es — третье лицо единственного числа связки ser, всегда о предмете
// или ситуации, никогда о людях-по-имени (граница главы). Новых слов нет —
// признаки уже word-first-одобрены (fácil/difícil/verdad/así/igual/importante/
// caro/verdadero из сессии 1, bonito/bonita из сессии 3, rápido/rápida из
// сессии 5, único/única из сессии 6). Каждая фраза держит Eres и Soy как
// грамматические дистракторы на позиции связки — это и есть контраст,
// который учит сессия: Es — не Eres (ты) и не Soy (я), а безличная оценка
// предмета/ситуации. Часть фраз повторяет согласование рода (recalls: [3]).
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s17-es-facil',
      english: 'Es fácil',
      russian: 'Это легко',
      explanation:
        'Так оценивают задачу, язык или решение — не человека. Окончание -s в es называет не «ты» и не «я», а безличное «это»: предмет или ситуацию, о которой идёт речь.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — это «ты», обращение к собеседнику. Оценка предмета или ситуации — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Оценка предмета или ситуации — только Es.',
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
              reasonCode: 'wrong_word:fácil',
              why: 'Difícil означает «трудно» — противоположный признак. Нужно fácil.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'importante',
              reasonCode: 'wrong_word:fácil',
              why: 'Importante означает «важно» — другой признак, не про трудность выполнения. Нужно fácil.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'impersonal_subject'],
    },
    {
      id: 'es-e01-s17-es-verdad',
      english: 'Es verdad',
      russian: 'Это правда',
      explanation:
        'Так подтверждают факт или чужие слова — про ситуацию, а не про говорящего. Es здесь нельзя заменить на Soy или Eres: подлежащего-человека в этой фразе просто нет.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Подтверждение факта о ситуации — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнику. Подтверждение факта о ситуации — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'verdad',
          category: 'quality-noun',
          distractors: [
            {
              value: 'igual',
              reasonCode: 'wrong_word:verdad',
              why: 'Igual означает «всё равно» — не подтверждение факта. Нужно verdad.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'así',
              reasonCode: 'wrong_word:verdad',
              why: 'Así означает «так» — описание образа действия, не подтверждение факта. Нужно verdad.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'impersonal_subject'],
    },
    {
      id: 'es-e01-s17-es-asi',
      english: 'Es así',
      russian: 'Это так',
      explanation:
        'Так подтверждают: дело обстоит именно таким образом. Заголовок этой темы взят отсюда — Es así описывает ситуацию целиком, а не одного человека.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнику. Про то, как обстоит дело, — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Про то, как обстоит дело, — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'así',
          category: 'quality-adverb',
          distractors: [
            {
              value: 'verdad',
              reasonCode: 'wrong_word:así',
              why: 'Verdad означает «правда» — подтверждение факта, а не образ действия. Нужно así.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'igual',
              reasonCode: 'wrong_word:así',
              why: 'Igual означает «всё равно» — другой оттенок, не «именно таким образом». Нужно así.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'impersonal_subject'],
    },
    {
      id: 'es-e01-s17-es-igual',
      english: 'Es igual',
      russian: 'Всё равно',
      explanation:
        'Так реагируют на новость, которая не меняет дела, — о ситуации, не о человеке. Форма связки третьего лица не меняется, даже если подлежащее не названо ни одним словом.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Реакция на ситуацию — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнику. Реакция на ситуацию — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'igual',
          category: 'quality-adjective',
          distractors: [
            {
              value: 'fácil',
              reasonCode: 'wrong_word:igual',
              why: 'Fácil означает «легко» — оценка сложности, не безразличие. Нужно igual.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'verdad',
              reasonCode: 'wrong_word:igual',
              why: 'Verdad означает «правда» — подтверждение факта, а не безразличие. Нужно igual.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'impersonal_subject'],
    },
    {
      id: 'es-e01-s17-es-importante',
      english: 'Es importante',
      russian: 'Это важно',
      explanation:
        'Так подчёркивают значимость темы, дела или решения — снова про ситуацию. Es не согласуется ни с «ты», ни с «я»: у безличного подлежащего просто нет своего слова.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнику. Оценка значимости ситуации — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Оценка значимости ситуации — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'importante',
          category: 'quality-adjective',
          distractors: [
            {
              value: 'difícil',
              reasonCode: 'wrong_word:importante',
              why: 'Difícil означает «трудно» — про сложность, а не про значимость. Нужно importante.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'caro',
              reasonCode: 'wrong_word:importante',
              why: 'Caro означает «дорого» — про цену, а не про значимость. Нужно importante.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'impersonal_subject'],
    },
    {
      id: 'es-e01-s17-es-caro',
      english: 'Es caro',
      russian: 'Это дорого',
      explanation:
        'Так оценивают цену вещи или услуги — о предмете, а не о человеке. Признак согласуется с родом самого предмета (по умолчанию — форма на -o), а не с тем, кто говорит.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Оценка цены предмета — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнику. Оценка цены предмета — только Es.',
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
              why: 'Cara — форма женского рода, с -a. По умолчанию, без названного предмета, используется форма на -o: caro.',
              trapType: 'grammar',
            },
            {
              value: 'fácil',
              reasonCode: 'wrong_word:caro',
              why: 'Fácil означает «легко» — совсем другой признак, не про цену. Нужно caro.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'price_context'],
    },
    {
      id: 'es-e01-s17-es-bonito',
      english: 'Es bonito',
      russian: 'Это красиво',
      explanation:
        'Так хвалят вещь, вид или подарок — предмет мужского рода или предмет без явного рода по умолчанию. Признак согласуется с предметом (-o), а связка остаётся es в любом случае.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — это оценка собеседника напрямую. Оценка предмета — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Оценка предмета — только Es.',
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
              why: 'Bonita — форма женского рода, с -a. Для предмета мужского рода или по умолчанию нужна форма на -o: bonito.',
              trapType: 'grammar',
            },
            {
              value: 'único',
              reasonCode: 'wrong_word:bonito',
              why: 'Único означает «единственный» — совсем другой признак, не про внешний вид. Нужно bonito.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full'],
    },
    {
      id: 'es-e01-s17-es-bonita',
      english: 'Es bonita',
      russian: 'Она красивая',
      explanation:
        'Та же похвала, но про вещь или ситуацию женского рода — например, casa (дом) или foto (фото). Связка es не меняется вовсе, меняется только концовка признака: -o становится -a.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Оценка предмета женского рода — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнице напрямую. Оценка предмета — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'bonita',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'bonito',
              reasonCode: 'gender_mismatch:bonita',
              why: 'Bonito — форма мужского рода, с -o. Для предмета женского рода нужна форма на -a: bonita.',
              trapType: 'grammar',
            },
            {
              value: 'única',
              reasonCode: 'wrong_word:bonita',
              why: 'Única означает «единственная» — совсем другой признак, не про внешний вид. Нужно bonita.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full'],
    },
    {
      id: 'es-e01-s17-es-rapido',
      english: 'Es rápido',
      russian: 'Это быстро',
      explanation:
        'Так говорят о темпе процесса, транспорта или интернета — не о человеке. Es остаётся неизменным для любой ситуации, только признак подстраивается под род того, о чём речь.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнику про его темп. Оценка ситуации или предмета — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Оценка ситуации или предмета — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'rápido',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'rápida',
              reasonCode: 'gender_mismatch:rápido',
              why: 'Rápida — форма женского рода, с -a. Для предмета мужского рода или по умолчанию нужна форма на -o: rápido.',
              trapType: 'grammar',
            },
            {
              value: 'verdadero',
              reasonCode: 'wrong_word:rápido',
              why: 'Verdadero означает «истинный» — совсем другой признак, не про скорость. Нужно rápido.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'pace_adjective'],
    },
    {
      id: 'es-e01-s17-es-rapida',
      english: 'Es rápida',
      russian: 'Она быстрая',
      explanation:
        'Та же оценка темпа, но про ситуацию или вещь женского рода — например, conexión (соединение). Признак меняет концовку на -a, связка es остаётся точно такой же.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Оценка темпа предмета — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнице про её темп. Оценка предмета — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'rápida',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'rápido',
              reasonCode: 'gender_mismatch:rápida',
              why: 'Rápido — форма мужского рода, с -o. Для предмета женского рода нужна форма на -a: rápida.',
              trapType: 'grammar',
            },
            {
              value: 'verdadera',
              reasonCode: 'wrong_word:rápida',
              why: 'Verdadera означает «истинная» — совсем другой признак, не про скорость. Нужно rápida.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full', 'pace_adjective'],
    },
    {
      id: 'es-e01-s17-es-unico',
      english: 'Es único',
      russian: 'Это уникально',
      explanation:
        'Так говорят про вещь или момент, которому нет равных, — про предмет мужского рода или по умолчанию. Признак согласуется с тем, о чём речь, а не с тем, кто говорит.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнику. Оценка предмета — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Оценка предмета — только Es.',
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
              why: 'Única — форма женского рода, с -a. Для предмета мужского рода или по умолчанию нужна форма на -o: único.',
              trapType: 'grammar',
            },
            {
              value: 'importante',
              reasonCode: 'wrong_word:único',
              why: 'Importante означает «важно» — другой признак, не про неповторимость. Нужно único.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full'],
    },
    {
      id: 'es-e01-s17-es-unica',
      english: 'Es única',
      russian: 'Она уникальная',
      explanation:
        'Та же оценка неповторимости, но про вещь или возможность женского рода — например, oportunidad (возможность). Меняется только концовка признака, es остаётся неизменным.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Оценка предмета — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнице. Оценка предмета — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'única',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'único',
              reasonCode: 'gender_mismatch:única',
              why: 'Único — форма мужского рода, с -o. Для предмета женского рода нужна форма на -a: única.',
              trapType: 'grammar',
            },
            {
              value: 'cara',
              reasonCode: 'wrong_word:única',
              why: 'Cara означает «дорогая» — другой признак, не про неповторимость. Нужно única.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full'],
    },
    {
      id: 'es-e01-s17-es-verdadero',
      english: 'Es verdadero',
      russian: 'Это истинно',
      explanation:
        'Так подтверждают, что дело обстоит на самом деле именно так, — сильнее простого verdad. Es не спутать с Eres: verdadero описывает факт, а не характер собеседника.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнику. Подтверждение факта — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Подтверждение факта — только Es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'verdadero',
          category: 'quality-adjective-gendered',
          distractors: [
            {
              value: 'verdadera',
              reasonCode: 'gender_mismatch:verdadero',
              why: 'Verdadera — форма женского рода, с -a. По умолчанию, без названного предмета, используется форма на -o: verdadero.',
              trapType: 'grammar',
            },
            {
              value: 'verdad',
              reasonCode: 'wrong_word:verdadero',
              why: 'Verdad — существительное «правда», а не прилагательное. После es нужен признак: verdadero.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'gender_agreement_full'],
    },
    {
      id: 'es-e01-s17-es-dificil',
      english: 'Es difícil',
      russian: 'Это трудно',
      explanation:
        'Так оценивают задачу или ситуацию как сложную — противоположность fácil. Форма es не различает мужской и женский род вовсе, поэтому она одна и та же в любой оценке ситуации.',
      words: [
        {
          correct: 'Es',
          category: 'ser',
          distractors: [
            {
              value: 'Soy',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Soy — про себя. Оценка сложности задачи — только Es.',
              trapType: 'grammar',
            },
            {
              value: 'Eres',
              reasonCode: 'agreement_person_mismatch:Es',
              why: 'Eres — обращение к собеседнику. Оценка сложности задачи — только Es.',
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
              reasonCode: 'wrong_word:difícil',
              why: 'Fácil означает «легко» — противоположный признак. Нужно difícil.',
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
      features: ['ser', 'third_person_singular', 'impersonal_subject'],
    },
    {
      id: 'es-e01-s17-no-es-facil',
      english: 'No es fácil',
      russian: 'Это нелегко',
      explanation:
        'Так возражают на чужую оценку ситуации как простой. No встаёт перед связкой, а не перед признаком, — та же схема отрицания, что и в утверждениях от первого и второго лица, только связка теперь Es.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            {
              value: 'Es',
              reasonCode: 'word_order_invalid:No',
              why: 'No должно стоять первым, перед связкой. Начинать с Es значит потерять отрицание.',
              trapType: 'grammar',
            },
            {
              value: 'Eres',
              reasonCode: 'wrong_word:No',
              why: 'Eres — это связка, а не отрицание. Возражение начинается с No.',
              trapType: 'grammar',
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
              why: 'Eres — обращение к собеседнику. Возражение про ситуацию — только es.',
              trapType: 'grammar',
            },
            {
              value: 'soy',
              reasonCode: 'agreement_person_mismatch:es',
              why: 'Soy — про себя. Возражение про ситуацию — только es.',
              trapType: 'grammar',
            },
          ],
        },
        {
          correct: 'fácil',
          category: 'quality-adjective',
          distractors: [
            {
              value: 'caro',
              reasonCode: 'wrong_word:fácil',
              why: 'Caro означает «дорого» — про цену, а не про сложность выполнения. Нужно fácil.',
              trapType: 'semantic_neighbor',
            },
            {
              value: 'importante',
              reasonCode: 'wrong_word:fácil',
              why: 'Importante означает «важно» — другой признак, не про трудность выполнения. Нужно fácil.',
              trapType: 'semantic_neighbor',
            },
          ],
        },
      ],
      features: ['ser', 'third_person_singular', 'impersonal_subject', 'negation'],
    },
  ]);

export const ES_EPISODE_01_SESSION_17_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_17_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
