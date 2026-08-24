import type {
  LocalizedSource,
  SessionVocabularyContactSourceV1,
  SessionVocabularySourceV1,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-24, карта сессий es_episode_01_session_map_v1.ts,
// сессия 9 "Ты есть" / second_person_singular, builtOn: [1], recalls: [3]):
// eres — связка для второго лица (собеседник), уже упоминалась как
// дистрактор в сессии 1 (там es_recognize_eres_extra_syllable и т.д.), а
// теперь вводится сама. Recalls gender_agreement_full (3) — признаки после
// eres согласуются по роду точно так же, как после es.
const L = (value: LocalizedSource): LocalizedSource => value;

const contact = (
  guidance: LocalizedSource,
  distractors: SessionVocabularyContactSourceV1['distractors'],
): SessionVocabularyContactSourceV1 => ({ guidance, distractors });

export const ES_EPISODE_01_SESSION_09_VOCABULARY_V1:
  readonly SessionVocabularySourceV1[] = Object.freeze([
  {
    id: 'es-e01-s09-word-eres',
    target: 'eres',
    meaning: L({
      ru: 'ты есть, ты являешься — связка для собеседника',
      uk: 'ти є — зв’язка для співрозмовника',
      es: 'you are — the linking word for the listener',
      'pt-BR': 'you are — the linking word for the listener',
      vi: 'you are — the linking word for the listener',
      id: 'you are — the linking word for the listener',
      tr: 'you are — the linking word for the listener',
      pl: 'you are — the linking word for the listener',
    }),
    features: ['copula_ser', 'second_person_singular'],
    contacts: {
      recognize: contact(
        L({
          ru: 'Eres звучит с двумя слогами и ударением на первом — E-res, /e-res/. Es звучит короче — всего один слог, без /re/ в середине. Soy звучит совсем иначе — с дифтонгом /oi/, вместо ровного /e/ в начале eres.',
          uk: 'Eres звучить двома складами з наголосом на першому — E-res, /e-res/. Es звучить коротше — лише один склад, без /re/ усередині. Soy звучить зовсім інакше — з дифтонгом /oi/, замість рівного /e/ на початку eres.',
          es: 'Eres has two syllables with stress on the first — E-res, /e-res/. Es sounds shorter — just one syllable, with no /re/ in the middle. Soy sounds completely different — with the diphthong /oi/, instead of the level /e/ at the start of eres.',
          'pt-BR': 'Eres has two syllables with stress on the first — E-res, /e-res/. Es sounds shorter — just one syllable, with no /re/ in the middle. Soy sounds completely different — with the diphthong /oi/, instead of the level /e/ at the start of eres.',
          vi: 'Eres has two syllables with stress on the first — E-res, /e-res/. Es sounds shorter — just one syllable, with no /re/ in the middle. Soy sounds completely different — with the diphthong /oi/, instead of the level /e/ at the start of eres.',
          id: 'Eres has two syllables with stress on the first — E-res, /e-res/. Es sounds shorter — just one syllable, with no /re/ in the middle. Soy sounds completely different — with the diphthong /oi/, instead of the level /e/ at the start of eres.',
          tr: 'Eres has two syllables with stress on the first — E-res, /e-res/. Es sounds shorter — just one syllable, with no /re/ in the middle. Soy sounds completely different — with the diphthong /oi/, instead of the level /e/ at the start of eres.',
          pl: 'Eres has two syllables with stress on the first — E-res, /e-res/. Es sounds shorter — just one syllable, with no /re/ in the middle. Soy sounds completely different — with the diphthong /oi/, instead of the level /e/ at the start of eres.',
        }),
        [
          {
            value: 'es',
            reasonCode: 'eres_recognize_es_shorter',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Es звучит короче — один слог, без /re/ в середине. Eres на слог длиннее.',
              uk: 'Es звучить коротше — один склад, без /re/ усередині. Eres на склад довше.',
              es: 'Es sounds shorter — one syllable, with no /re/ in the middle. Eres is one syllable longer.',
              'pt-BR': 'Es sounds shorter — one syllable, with no /re/ in the middle. Eres is one syllable longer.',
              vi: 'Es sounds shorter — one syllable, with no /re/ in the middle. Eres is one syllable longer.',
              id: 'Es sounds shorter — one syllable, with no /re/ in the middle. Eres is one syllable longer.',
              tr: 'Es sounds shorter — one syllable, with no /re/ in the middle. Eres is one syllable longer.',
              pl: 'Es sounds shorter — one syllable, with no /re/ in the middle. Eres is one syllable longer.',
            }),
          },
          {
            value: 'soy',
            reasonCode: 'eres_recognize_soy_diphthong',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Soy звучит с дифтонгом /oi/ — совсем другой гласный. В eres слышится ровное /e/ в начале.',
              uk: 'Soy звучить з дифтонгом /oi/ — зовсім інший голосний. У eres чути рівне /e/ на початку.',
              es: 'Soy has the diphthong /oi/ — a completely different vowel. Eres has a level /e/ at the start.',
              'pt-BR': 'Soy has the diphthong /oi/ — a completely different vowel. Eres has a level /e/ at the start.',
              vi: 'Soy has the diphthong /oi/ — a completely different vowel. Eres has a level /e/ at the start.',
              id: 'Soy has the diphthong /oi/ — a completely different vowel. Eres has a level /e/ at the start.',
              tr: 'Soy has the diphthong /oi/ — a completely different vowel. Eres has a level /e/ at the start.',
              pl: 'Soy has the diphthong /oi/ — a completely different vowel. Eres has a level /e/ at the start.',
            }),
          },
        ],
      ),
      retrieve_meaning: contact(
        L({
          ru: 'Eres связывает собеседника — «ты» — с признаком или оценкой. Es — та же связка, но про предмет или третье лицо, не про собеседника напрямую. Soy — связка для самого говорящего, «я».',
          uk: 'Eres зв’язує співрозмовника — «ти» — з ознакою чи оцінкою. Es — та сама зв’язка, але про предмет чи третю особу, не про співрозмовника напряму. Soy — зв’язка для самого мовця, «я».',
          es: 'Eres links the listener — "you" — to a quality or verdict. Es is the same linking word, but about a thing or a third person, not directly about the listener. Soy is the linking word for the speaker themselves, "I".',
          'pt-BR': 'Eres links the listener — "you" — to a quality or verdict. Es is the same linking word, but about a thing or a third person, not directly about the listener. Soy is the linking word for the speaker themselves, "I".',
          vi: 'Eres links the listener — "you" — to a quality or verdict. Es is the same linking word, but about a thing or a third person, not directly about the listener. Soy is the linking word for the speaker themselves, "I".',
          id: 'Eres links the listener — "you" — to a quality or verdict. Es is the same linking word, but about a thing or a third person, not directly about the listener. Soy is the linking word for the speaker themselves, "I".',
          tr: 'Eres links the listener — "you" — to a quality or verdict. Es is the same linking word, but about a thing or a third person, not directly about the listener. Soy is the linking word for the speaker themselves, "I".',
          pl: 'Eres links the listener — "you" — to a quality or verdict. Es is the same linking word, but about a thing or a third person, not directly about the listener. Soy is the linking word for the speaker themselves, "I".',
        }),
        [
          {
            value: 'es',
            reasonCode: 'eres_meaning_es_third_person',
            trapType: 'grammar',
            feedback: L({
              ru: 'Es говорит про предмет или третье лицо, не про собеседника напрямую. Обращение к «ты» — это eres.',
              uk: 'Es говорить про предмет чи третю особу, не про співрозмовника напряму. Звернення до «ти» — це eres.',
              es: 'Es talks about a thing or a third person, not directly about the listener. Addressing "you" needs eres.',
              'pt-BR': 'Es talks about a thing or a third person, not directly about the listener. Addressing "you" needs eres.',
              vi: 'Es talks about a thing or a third person, not directly about the listener. Addressing "you" needs eres.',
              id: 'Es talks about a thing or a third person, not directly about the listener. Addressing "you" needs eres.',
              tr: 'Es talks about a thing or a third person, not directly about the listener. Addressing "you" needs eres.',
              pl: 'Es talks about a thing or a third person, not directly about the listener. Addressing "you" needs eres.',
            }),
          },
          {
            value: 'soy',
            reasonCode: 'eres_meaning_soy_first_person',
            trapType: 'grammar',
            feedback: L({
              ru: 'Soy говорящий использует про себя, не про собеседника. Обращение к «ты» — это eres.',
              uk: 'Soy мовець використовує про себе, не про співрозмовника. Звернення до «ти» — це eres.',
              es: 'Soy is used by the speaker about themselves, not about the listener. Addressing "you" needs eres.',
              'pt-BR': 'Soy is used by the speaker about themselves, not about the listener. Addressing "you" needs eres.',
              vi: 'Soy is used by the speaker about themselves, not about the listener. Addressing "you" needs eres.',
              id: 'Soy is used by the speaker about themselves, not about the listener. Addressing "you" needs eres.',
              tr: 'Soy is used by the speaker about themselves, not about the listener. Addressing "you" needs eres.',
              pl: 'Soy is used by the speaker about themselves, not about the listener. Addressing "you" needs eres.',
            }),
          },
        ],
      ),
      build_form: contact(
        L({
          ru: 'Eres пишется четырьмя буквами: e-r-e-s, без ударения на письме. Es теряет средний слог -re- и остаётся коротким, es; soy пишет совсем другие буквы, s-o-y.',
          uk: 'Eres пишеться чотирма літерами: e-r-e-s, без наголосу на письмі. Es втрачає середній склад -re- і лишається коротким, es; soy пише зовсім інші літери, s-o-y.',
          es: 'Eres is spelled with four letters: e-r-e-s, no accent mark. Es drops the middle syllable -re- and stays short, es; soy is spelled with completely different letters, s-o-y.',
          'pt-BR': 'Eres is spelled with four letters: e-r-e-s, no accent mark. Es drops the middle syllable -re- and stays short, es; soy is spelled with completely different letters, s-o-y.',
          vi: 'Eres is spelled with four letters: e-r-e-s, no accent mark. Es drops the middle syllable -re- and stays short, es; soy is spelled with completely different letters, s-o-y.',
          id: 'Eres is spelled with four letters: e-r-e-s, no accent mark. Es drops the middle syllable -re- and stays short, es; soy is spelled with completely different letters, s-o-y.',
          tr: 'Eres is spelled with four letters: e-r-e-s, no accent mark. Es drops the middle syllable -re- and stays short, es; soy is spelled with completely different letters, s-o-y.',
          pl: 'Eres is spelled with four letters: e-r-e-s, no accent mark. Es drops the middle syllable -re- and stays short, es; soy is spelled with completely different letters, s-o-y.',
        }),
        [
          {
            value: 'es',
            reasonCode: 'eres_form_es_wrong_person',
            trapType: 'grammar',
            feedback: L({
              ru: 'Es — форма для предмета или третьего лица, короче на слог. Для собеседника нужна форма eres.',
              uk: 'Es — форма для предмета чи третьої особи, коротша на склад. Для співрозмовника потрібна форма eres.',
              es: 'Es is the form for a thing or third person, one syllable shorter. For the listener, the form is eres.',
              'pt-BR': 'Es is the form for a thing or third person, one syllable shorter. For the listener, the form is eres.',
              vi: 'Es is the form for a thing or third person, one syllable shorter. For the listener, the form is eres.',
              id: 'Es is the form for a thing or third person, one syllable shorter. For the listener, the form is eres.',
              tr: 'Es is the form for a thing or third person, one syllable shorter. For the listener, the form is eres.',
              pl: 'Es is the form for a thing or third person, one syllable shorter. For the listener, the form is eres.',
            }),
          },
          {
            value: 'soy',
            reasonCode: 'eres_form_soy_wrong_person',
            trapType: 'grammar',
            feedback: L({
              ru: 'Soy — форма для говорящего, не для собеседника. Для собеседника нужна форма eres.',
              uk: 'Soy — форма для мовця, не для співрозмовника. Для співрозмовника потрібна форма eres.',
              es: 'Soy is the form for the speaker, not for the listener. For the listener, the form is eres.',
              'pt-BR': 'Soy is the form for the speaker, not for the listener. For the listener, the form is eres.',
              vi: 'Soy is the form for the speaker, not for the listener. For the listener, the form is eres.',
              id: 'Soy is the form for the speaker, not for the listener. For the listener, the form is eres.',
              tr: 'Soy is the form for the speaker, not for the listener. For the listener, the form is eres.',
              pl: 'Soy is the form for the speaker, not for the listener. For the listener, the form is eres.',
            }),
          },
        ],
      ),
    },
  },
]);
