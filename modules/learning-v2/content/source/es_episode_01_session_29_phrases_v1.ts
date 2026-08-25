import type { EpisodeSourcePhrase } from './episode_01_source_v1';
import { ES_SESSION_29_LOCALIZED_DETAILS } from './es_episode_01_session_29_localized_details_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 29 "Мы не, они не" / builtOn: [2, 25, 27], recalls: [2, 19]): 15
// фраз завершают парадигму отрицания связки ser по лицам множественного
// числа — no встаёт перед somos (сессия 25) и son (сессия 27) точно так же,
// как перед soy (сессия 2) и es (сессия 19), а признак после связки не
// меняется от самого факта отрицания вовсе.
//
// зачем именно ЭТИ признаки, а не așí/de acuerdo/verdad, как в 25 и 27:
// проверено вручную grep по всему испанскому корпусу — простые сочетания
// "No somos/No son + así/de acuerdo/fácil/difícil/dos/tres" уже существуют
// дословно как английский текст фраз в сессиях 1, 14, 25, 26, 27, 28
// (No somos iguales — с.1, No somos de acuerdo — с.14, No somos así — с.25,
// No somos difíciles / No somos fáciles, de acuerdo — с.26, No son así /
// No son de acuerdo / No son fáciles — с.27, No somos/son dos/tres — с.28).
// Единственный НЕТРОНУТЫЙ участок парадигмы — отрицание признаков с полным
// согласованием по роду И числу одновременно (rápidos/rápidas, bonitos/
// bonitas, únicos/únicas, caros/caras из сессий 3/5/6/18/26/27): ни одна
// прошлая сессия не поставила no перед somos/son с этими формами. Именно
// сюда и идёт весь материал сессии 29 — признаки уже полностью отработаны
// (согласование само по себе не новое), а негация именно этих форм — да.
//
// зачем двойные диалоговые реплики (somos-утверждение vs no son-отрицание,
// и наоборот): чтобы держать оба лица множественного числа в постоянном
// контрасте на одной карточке, как в прецеденте сессий 26/27 (Es rápido;
// son rápidos). Второй клоз начинается со строчной буквы после "; " —
// правило phrase_not_standalone, впервые найденное на сессиях 26/27.
//
// distractorAuthorship: 'manual' снижает минимум дистракторов с 3 до 2 —
// та же экономия, что и в сессиях 10/14/17/25/26/27/28.
const RAW_PHRASES: readonly Omit<EpisodeSourcePhrase, 'localizedDetails'>[] =
  Object.freeze([
    {
      id: 'es-e01-s29-no-somos-rapidos',
      english: 'No somos rápidos',
      russian: 'Мы не быстрые',
      explanation:
        'Отрицание темпа группы мужского рода или смешанной по умолчанию, включающей говорящего. No встаёт перед somos, признак сохраняет окончание множественного числа -os точно так же, как и в утвердительной форме.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — No.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — somos.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Про группу, включая говорящего, — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápidos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'rápido', reasonCode: 'number_mismatch:rápidos', why: 'Rápido — форма единственного числа. Про группу нужна форма множественного числа: rápidos.', trapType: 'grammar' },
            { value: 'rápidas', reasonCode: 'gender_mismatch:rápidos', why: 'Rápidas — форма женского рода множественного числа. По умолчанию нужна форма на -os: rápidos.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full', 'negation'],
    },
    {
      id: 'es-e01-s29-no-somos-rapidas',
      english: 'No somos rápidas',
      russian: 'Мы не быстрые (о группе женского рода)',
      explanation:
        'Тот же отказ признать темп, но про группу женского рода — например, подруг вместе. No встаёт перед somos, признак сохраняет окончание -as, как и без отрицания.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nunca', reasonCode: 'negation_word_mismatch:No', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание — No.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящей в составе группы. Про себя вместе с кем-то — somos.', trapType: 'grammar' },
            { value: 'eres', reasonCode: 'agreement_person_mismatch:somos', why: 'Eres — обращение к одной собеседнице. Про группу, включая говорящую, — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápidas',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'rápidos', reasonCode: 'gender_mismatch:rápidas', why: 'Rápidos — форма мужского рода множественного числа. Для группы женского рода нужна форма на -as: rápidas.', trapType: 'grammar' },
            { value: 'rápida', reasonCode: 'number_mismatch:rápidas', why: 'Rápida — форма единственного числа. Про группу нужна форма множественного числа: rápidas.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full', 'negation'],
    },
    {
      id: 'es-e01-s29-no-son-rapidos',
      english: 'No son rápidos',
      russian: 'Они не быстрые',
      explanation:
        'Отрицание темпа группы мужского рода или смешанной по умолчанию, без говорящего внутри. No встаёт перед son, признак сохраняет -os, как и в утвердительной форме сессии про son.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — No.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'son',
          category: 'ser',
          distractors: [
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает говорящего в группу. Про «них» без говорящего — son.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одном. Про несколько человек — son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápidos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'rápidas', reasonCode: 'gender_mismatch:rápidos', why: 'Rápidas — форма женского рода множественного числа. По умолчанию нужна форма на -os: rápidos.', trapType: 'grammar' },
            { value: 'rápido', reasonCode: 'number_mismatch:rápidos', why: 'Rápido — форма единственного числа. Про группу нужна форма множественного числа: rápidos.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'plural_agreement', 'gender_agreement_full', 'negation'],
    },
    {
      id: 'es-e01-s29-no-son-rapidas',
      english: 'No son rápidas',
      russian: 'Они не быстрые (о группе женского рода)',
      explanation:
        'Тот же отказ, но про группу женского рода без говорящего внутри. No перед son, признак сохраняет -as вне зависимости от отрицания.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nunca', reasonCode: 'negation_word_mismatch:No', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание — No.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'son',
          category: 'ser',
          distractors: [
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает говорящую в группу. Про «них» без говорящей — son.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одной. Про несколько человек — son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápidas',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'rápidos', reasonCode: 'gender_mismatch:rápidas', why: 'Rápidos — форма мужского рода множественного числа. Для группы женского рода нужна форма на -as: rápidas.', trapType: 'grammar' },
            { value: 'rápida', reasonCode: 'number_mismatch:rápidas', why: 'Rápida — форма единственного числа. Про группу нужна форма множественного числа: rápidas.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'plural_agreement', 'gender_agreement_full', 'negation'],
    },
    {
      id: 'es-e01-s29-no-somos-bonitos',
      english: 'No somos bonitos',
      russian: 'Мы не красивые',
      explanation:
        'Отрицание внешности группы мужского рода или смешанной по умолчанию, включающей говорящего. No встаёт перед somos, bonitos сохраняет окончание -os.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — No.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — somos.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Про группу, включая говорящего, — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'bonitos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'bonitas', reasonCode: 'gender_mismatch:bonitos', why: 'Bonitas — форма женского рода множественного числа. По умолчанию нужна форма на -os: bonitos.', trapType: 'grammar' },
            { value: 'bonito', reasonCode: 'number_mismatch:bonitos', why: 'Bonito — форма единственного числа. Про группу нужна форма множественного числа: bonitos.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full', 'negation'],
    },
    {
      id: 'es-e01-s29-no-somos-bonitas',
      english: 'No somos bonitas',
      russian: 'Мы не красивые (о группе женского рода)',
      explanation:
        'Та же отрицаемая оценка внешности, но про группу женского рода. No перед somos, bonitas сохраняет окончание -as.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nunca', reasonCode: 'negation_word_mismatch:No', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание — No.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящей в составе группы. Про себя вместе с кем-то — somos.', trapType: 'grammar' },
            { value: 'eres', reasonCode: 'agreement_person_mismatch:somos', why: 'Eres — обращение к одной собеседнице. Про группу, включая говорящую, — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'bonitas',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'bonitos', reasonCode: 'gender_mismatch:bonitas', why: 'Bonitos — форма мужского рода множественного числа. Для группы женского рода нужна форма на -as: bonitas.', trapType: 'grammar' },
            { value: 'bonita', reasonCode: 'number_mismatch:bonitas', why: 'Bonita — форма единственного числа. Про группу нужна форма множественного числа: bonitas.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full', 'negation'],
    },
    {
      id: 'es-e01-s29-no-son-bonitos',
      english: 'No son bonitos',
      russian: 'Они не красивые',
      explanation:
        'Отрицание внешности группы мужского рода или смешанной по умолчанию, без говорящего внутри. No встаёт перед son, bonitos сохраняет -os.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — No.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'son',
          category: 'ser',
          distractors: [
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает говорящего в группу. Про «них» без говорящего — son.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одном. Про несколько человек — son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'bonitos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'bonitas', reasonCode: 'gender_mismatch:bonitos', why: 'Bonitas — форма женского рода множественного числа. По умолчанию нужна форма на -os: bonitos.', trapType: 'grammar' },
            { value: 'bonito', reasonCode: 'number_mismatch:bonitos', why: 'Bonito — форма единственного числа. Про группу нужна форма множественного числа: bonitos.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'plural_agreement', 'gender_agreement_full', 'negation'],
    },
    {
      id: 'es-e01-s29-no-son-bonitas',
      english: 'No son bonitas',
      russian: 'Они не красивые (о группе женского рода)',
      explanation:
        'Та же отрицаемая оценка, но про группу женского рода без говорящего внутри. No перед son, bonitas сохраняет -as.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nunca', reasonCode: 'negation_word_mismatch:No', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание — No.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'son',
          category: 'ser',
          distractors: [
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает говорящую в группу. Про «них» без говорящей — son.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одной. Про несколько человек — son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'bonitas',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'bonitos', reasonCode: 'gender_mismatch:bonitas', why: 'Bonitos — форма мужского рода множественного числа. Для группы женского рода нужна форма на -as: bonitas.', trapType: 'grammar' },
            { value: 'bonita', reasonCode: 'number_mismatch:bonitas', why: 'Bonita — форма единственного числа. Про группу нужна форма множественного числа: bonitas.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'plural_agreement', 'gender_agreement_full', 'negation'],
    },
    {
      id: 'es-e01-s29-no-somos-unicos',
      english: 'No somos únicos',
      russian: 'Мы не единственные в своём роде',
      explanation:
        'Скромное признание, что группа, включающая говорящего, не является чем-то неповторимым. No встаёт перед somos, тильда над ú и окончание -os остаются на месте.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — No.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — somos.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Про группу, включая говорящего, — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'únicos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'únicas', reasonCode: 'gender_mismatch:únicos', why: 'Únicas — форма женского рода множественного числа. По умолчанию нужна форма на -os: únicos.', trapType: 'grammar' },
            { value: 'unicos', reasonCode: 'accent_missing:únicos', why: 'Unicos без тильды над ú звучал бы и писался бы иначе. Нужна форма с тильдой: únicos.', trapType: 'orthographic' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full', 'written_accent', 'negation'],
    },
    {
      id: 'es-e01-s29-no-son-unicas',
      english: 'No son únicas',
      russian: 'Они не единственные в своём роде (о группе женского рода)',
      explanation:
        'Отрицание неповторимости группы женского рода без говорящего внутри — например, серийных изделий, ошибочно принятых за редкие. No перед son, únicas сохраняет тильду и окончание -as.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nunca', reasonCode: 'negation_word_mismatch:No', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание — No.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'son',
          category: 'ser',
          distractors: [
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает говорящую в группу. Про «них» без говорящей — son.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одной. Про несколько предметов или людей — son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'únicas',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'únicos', reasonCode: 'gender_mismatch:únicas', why: 'Únicos — форма мужского рода множественного числа. Для группы женского рода нужна форма на -as: únicas.', trapType: 'grammar' },
            { value: 'unicas', reasonCode: 'accent_missing:únicas', why: 'Unicas без тильды над ú звучала бы и писалась бы иначе. Нужна форма с тильдой: únicas.', trapType: 'orthographic' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'plural_agreement', 'gender_agreement_full', 'written_accent', 'negation'],
    },
    {
      id: 'es-e01-s29-no-somos-caros',
      english: 'No somos caros',
      russian: 'Мы не дорогие',
      explanation:
        'Так отвечают о цене услуг собственной группы — например, мастерской, которую сочли дорогой. No встаёт перед somos, caros сохраняет окончание -os.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — No.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — somos.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Про группу, включая говорящего, — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'caros',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'caras', reasonCode: 'gender_mismatch:caros', why: 'Caras — форма женского рода множественного числа. По умолчанию нужна форма на -os: caros.', trapType: 'grammar' },
            { value: 'caro', reasonCode: 'number_mismatch:caros', why: 'Caro — форма единственного числа. Про группу нужна форма множественного числа: caros.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full', 'price_context', 'negation'],
    },
    {
      id: 'es-e01-s29-no-son-caras',
      english: 'No son caras',
      russian: 'Они не дорогие (о вещах женского рода)',
      explanation:
        'Возражение на оценку цены нескольких вещей женского рода — например, camisetas (футболок), которые сочли дорогими. No перед son, caras сохраняет окончание -as.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nunca', reasonCode: 'negation_word_mismatch:No', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание — No.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'son',
          category: 'ser',
          distractors: [
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает говорящего в группу. Про несколько вещей без говорящего внутри — son.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одной вещи. Про несколько — son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'caras',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'caros', reasonCode: 'gender_mismatch:caras', why: 'Caros — форма мужского рода множественного числа. Для вещей женского рода нужна форма на -as: caras.', trapType: 'grammar' },
            { value: 'cara', reasonCode: 'number_mismatch:caras', why: 'Cara — форма единственного числа. Про несколько вещей нужна форма множественного числа: caras.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'third_person_plural', 'plural_agreement', 'gender_agreement_full', 'price_context', 'negation'],
    },
    {
      id: 'es-e01-s29-somos-rapidos-no-son-rapidos',
      english: 'Somos rápidos; no son rápidos',
      russian: 'Мы быстрые; они не быстрые',
      explanation:
        'Диалог из утверждения о своей группе и отказа признать то же качество за другой группой. Recall утвердительной связки somos, ответ — no перед son, признак rápidos не меняется в обеих репликах.',
      words: [
        {
          correct: 'Somos',
          category: 'ser',
          distractors: [
            { value: 'Son', reasonCode: 'agreement_person_mismatch:Somos', why: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — Somos.', trapType: 'grammar' },
            { value: 'Soy', reasonCode: 'number_mismatch:Somos', why: 'Soy — только о себе одном. Про группу, включая говорящего, — Somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápidos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'rápidas', reasonCode: 'gender_mismatch:rápidos', why: 'Rápidas — форма женского рода множественного числа. По умолчанию нужна форма на -os: rápidos.', trapType: 'grammar' },
            { value: 'rápido', reasonCode: 'number_mismatch:rápidos', why: 'Rápido — форма единственного числа. Про группу нужна форма множественного числа: rápidos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'no',
          category: 'negation',
          distractors: [
            { value: 'nada', reasonCode: 'negation_word_mismatch:no', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — no.', trapType: 'semantic_neighbor' },
            { value: 'non', reasonCode: 'orthographic_invalid:no', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'son',
          category: 'ser',
          distractors: [
            { value: 'somos', reasonCode: 'agreement_person_mismatch:son', why: 'Somos включает говорящего в группу. Про другую группу без говорящего — son.', trapType: 'grammar' },
            { value: 'es', reasonCode: 'number_mismatch:son', why: 'Es — только об одном. Про несколько человек — son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'rápidos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'rápidas', reasonCode: 'gender_mismatch:rápidos', why: 'Rápidas — форма женского рода множественного числа. По умолчанию нужна форма на -os: rápidos.', trapType: 'grammar' },
            { value: 'rápido', reasonCode: 'number_mismatch:rápidos', why: 'Rápido — форма единственного числа. Про группу нужна форма множественного числа: rápidos.', trapType: 'grammar' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'third_person_plural', 'plural_agreement', 'gender_agreement_full', 'negation'],
    },
    {
      id: 'es-e01-s29-no-somos-bonitas-verdad-q',
      english: '¿No somos bonitas?; no, verdad',
      russian: 'Мы не красивые? Нет, правда',
      explanation:
        'Вопрос-сомнение о своей группе женского рода и короткое подтверждение отказа. No внутри вопроса отрицает связку, а ответное no — отдельное слово-реакция перед verdad, recall из первой сессии.',
      words: [
        {
          correct: 'No',
          category: 'negation',
          distractors: [
            { value: 'Nada', reasonCode: 'negation_word_mismatch:No', why: 'Nada — «ничего», отдельное слово-предмет. Отрицание связки — No.', trapType: 'semantic_neighbor' },
            { value: 'Non', reasonCode: 'orthographic_invalid:No', why: 'Non — не испанское слово. В испанском отрицание пишется No.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящей в составе группы. Вопрос про себя вместе с кем-то — somos.', trapType: 'grammar' },
            { value: 'eres', reasonCode: 'agreement_person_mismatch:somos', why: 'Eres — обращение к одной собеседнице. Вопрос про группу, включая говорящую, — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'bonitas',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'bonitos', reasonCode: 'gender_mismatch:bonitas', why: 'Bonitos — форма мужского рода множественного числа. Для группы женского рода нужна форма на -as: bonitas.', trapType: 'grammar' },
            { value: 'bonita', reasonCode: 'number_mismatch:bonitas', why: 'Bonita — форма единственного числа. Про группу нужна форма множественного числа: bonitas.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'no',
          category: 'negation-reaction',
          distractors: [
            { value: 'nada', reasonCode: 'negation_word_mismatch:no', why: 'Nada — «ничего», отдельное слово-предмет. Короткая реакция отказа — no.', trapType: 'semantic_neighbor' },
            { value: 'non', reasonCode: 'orthographic_invalid:no', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'verdad',
          category: 'quality-noun',
          distractors: [
            { value: 'acuerdo', reasonCode: 'wrong_word:verdad', why: 'Acuerdo — про согласие с чужим мнением, а не короткое подтверждение вслед за отказом. Нужно verdad.', trapType: 'semantic_neighbor' },
            { value: 'igual', reasonCode: 'wrong_word:verdad', why: 'Igual означает безразличие, а не подтверждение сказанного. Нужно verdad.', trapType: 'semantic_neighbor' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'plural_agreement', 'gender_agreement_full', 'negation', 'question_marks', 'truth_adjective'],
    },
    {
      id: 'es-e01-s29-son-unicos-no-somos-unicos',
      english: 'Son únicos; no somos únicos',
      russian: 'Они единственные в своём роде; мы не единственные в своём роде',
      explanation:
        'Диалог из признания неповторимости другой группы и скромного отказа от такой же оценки для своей. Recall утвердительной связки son, ответ — no перед somos, признак únicos не меняется ни разу.',
      words: [
        {
          correct: 'Son',
          category: 'ser',
          distractors: [
            { value: 'Es', reasonCode: 'number_mismatch:Son', why: 'Es — только об одном. Про нескольких «они» — Son.', trapType: 'grammar' },
            { value: 'Somos', reasonCode: 'agreement_person_mismatch:Son', why: 'Somos включает говорящего в группу. Про «них» без говорящего — Son.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'únicos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'únicas', reasonCode: 'gender_mismatch:únicos', why: 'Únicas — форма женского рода множественного числа. По умолчанию нужна форма на -os: únicos.', trapType: 'grammar' },
            { value: 'unicos', reasonCode: 'accent_missing:únicos', why: 'Unicos без тильды над ú звучал бы и писался бы иначе. Нужна форма с тильдой: únicos.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'no',
          category: 'negation',
          distractors: [
            { value: 'nunca', reasonCode: 'negation_word_mismatch:no', why: 'Nunca — «никогда», про частоту во времени. Простое отрицание — no.', trapType: 'semantic_neighbor' },
            { value: 'non', reasonCode: 'orthographic_invalid:no', why: 'Non — не испанское слово. В испанском отрицание пишется no.', trapType: 'orthographic' },
          ],
        },
        {
          correct: 'somos',
          category: 'ser',
          distractors: [
            { value: 'son', reasonCode: 'agreement_person_mismatch:somos', why: 'Son — «они», без говорящего в составе группы. Про себя вместе с кем-то — somos.', trapType: 'grammar' },
            { value: 'soy', reasonCode: 'number_mismatch:somos', why: 'Soy — только о себе одном. Про группу, включая говорящего, — somos.', trapType: 'grammar' },
          ],
        },
        {
          correct: 'únicos',
          category: 'quality-adjective-gendered-plural',
          distractors: [
            { value: 'únicas', reasonCode: 'gender_mismatch:únicos', why: 'Únicas — форма женского рода множественного числа. По умолчанию нужна форма на -os: únicos.', trapType: 'grammar' },
            { value: 'unicos', reasonCode: 'accent_missing:únicos', why: 'Unicos без тильды над ú звучал бы и писался бы иначе. Нужна форма с тильдой: únicos.', trapType: 'orthographic' },
          ],
        },
      ],
      features: ['ser', 'first_person_plural', 'third_person_plural', 'plural_agreement', 'gender_agreement_full', 'written_accent', 'negation'],
    },
  ]);

export const ES_EPISODE_01_SESSION_29_PHRASES: readonly EpisodeSourcePhrase[] =
  Object.freeze(
    RAW_PHRASES.map((phrase) =>
      Object.freeze({
        ...phrase,
        localizedDetails: ES_SESSION_29_LOCALIZED_DETAILS[phrase.id],
      }),
    ),
  );
