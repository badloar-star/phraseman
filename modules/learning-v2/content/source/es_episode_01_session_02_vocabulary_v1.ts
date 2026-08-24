import type {
  LocalizedSource,
  SessionVocabularyContactSourceV1,
  SessionVocabularySourceV1,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-24, word-first правило для КАЖДОГО
// нового слова, даже внутри kind:'phrases' — es_episode_01_session_map_v1.ts
// помечает сессию 2 как 'phrases', но она вводит одно по-настоящему новое
// слово, no, которого не было в сессии 1): одно word-first слово — no,
// отрицание. Проходит recognize → retrieve_meaning → build_form, затем
// применяется во фразах с уже изученными словами сессии 1 (es, fácil, soy,
// verdad) — No es fácil, No es verdad.
const L = (value: LocalizedSource): LocalizedSource => value;

const contact = (
  guidance: LocalizedSource,
  distractors: SessionVocabularyContactSourceV1['distractors'],
): SessionVocabularyContactSourceV1 => ({ guidance, distractors });

export const ES_EPISODE_01_SESSION_02_VOCABULARY_V1:
  readonly SessionVocabularySourceV1[] = Object.freeze([
  {
    id: 'es-e01-s02-word-no',
    target: 'no',
    meaning: L({
      ru: 'нет, не — отрицание',
      uk: 'ні, не — заперечення',
      es: 'no — negation',
      'pt-BR': 'no — negation',
      vi: 'no — negation',
      id: 'no — negation',
      tr: 'no — negation',
      pl: 'no — negation',
    }),
    features: ['negation', 'preverbal_particle'],
    contacts: {
      recognize: contact(
        L({
          ru: 'No звучит коротко: один слог, гласный /o/ на конце. В nada после /na-/ идёт ещё слог /-da/, а non в испанском вообще не существует — это слово из другого языка.',
          uk: 'No звучить коротко: один склад, голосний /o/ наприкінці. У nada після /na-/ йде ще склад /-da/, а non в іспанській взагалі не існує — це слово з іншої мови.',
          es: 'No sounds short: one syllable, the vowel /o/ at the end. Nada has an extra syllable /-da/ after /na-/, and non does not exist in Spanish at all — it belongs to a different language.',
          'pt-BR': 'No sounds short: one syllable, the vowel /o/ at the end. Nada has an extra syllable /-da/ after /na-/, and non does not exist in Spanish at all — it belongs to a different language.',
          vi: 'No sounds short: one syllable, the vowel /o/ at the end. Nada has an extra syllable /-da/ after /na-/, and non does not exist in Spanish at all — it belongs to a different language.',
          id: 'No sounds short: one syllable, the vowel /o/ at the end. Nada has an extra syllable /-da/ after /na-/, and non does not exist in Spanish at all — it belongs to a different language.',
          tr: 'No sounds short: one syllable, the vowel /o/ at the end. Nada has an extra syllable /-da/ after /na-/, and non does not exist in Spanish at all — it belongs to a different language.',
          pl: 'No sounds short: one syllable, the vowel /o/ at the end. Nada has an extra syllable /-da/ after /na-/, and non does not exist in Spanish at all — it belongs to a different language.',
        }),
        [
          {
            value: 'nada',
            reasonCode: 'no_recognize_nada_extra_syllable',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Nada добавляет слог /-da/ после /na-/; no звучит короче, одним слогом.',
              uk: 'Nada додає склад /-da/ після /na-/; no звучить коротше, одним складом.',
              es: 'Nada adds a syllable /-da/ after /na-/; no is shorter, just one syllable.',
              'pt-BR': 'Nada adds a syllable /-da/ after /na-/; no is shorter, just one syllable.',
              vi: 'Nada adds a syllable /-da/ after /na-/; no is shorter, just one syllable.',
              id: 'Nada adds a syllable /-da/ after /na-/; no is shorter, just one syllable.',
              tr: 'Nada adds a syllable /-da/ after /na-/; no is shorter, just one syllable.',
              pl: 'Nada adds a syllable /-da/ after /na-/; no is shorter, just one syllable.',
            }),
          },
          {
            value: 'non',
            reasonCode: 'no_recognize_non_not_spanish',
            trapType: 'orthographic',
            feedback: L({
              ru: 'Non — не испанское слово, из другого языка. По-испански отрицание пишется и звучит no, без n на конце.',
              uk: 'Non — не іспанське слово, з іншої мови. Іспанською заперечення пишеться й звучить no, без n наприкінці.',
              es: 'Non is not a Spanish word — it belongs to another language. In Spanish, negation is spelled and pronounced no, with no final n.',
              'pt-BR': 'Non is not a Spanish word — it belongs to another language. In Spanish, negation is spelled and pronounced no, with no final n.',
              vi: 'Non is not a Spanish word — it belongs to another language. In Spanish, negation is spelled and pronounced no, with no final n.',
              id: 'Non is not a Spanish word — it belongs to another language. In Spanish, negation is spelled and pronounced no, with no final n.',
              tr: 'Non is not a Spanish word — it belongs to another language. In Spanish, negation is spelled and pronounced no, with no final n.',
              pl: 'Non is not a Spanish word — it belongs to another language. In Spanish, negation is spelled and pronounced no, with no final n.',
            }),
          },
        ],
      ),
      retrieve_meaning: contact(
        L({
          ru: 'No означает отрицание: «нет», «не». Оно встаёт прямо перед связкой и переворачивает смысл фразы на противоположный — No es fácil значит «это не легко». Nada означает «ничего» — отдельное слово-предмет, а не отрицание глагола.',
          uk: 'No означає заперечення: «ні», «не». Воно стає прямо перед зв’язкою й перевертає сенс фрази на протилежний — No es fácil означає «це не легко». Nada означає «нічого» — окреме слово-предмет, а не заперечення дієслова.',
          es: 'No means negation: "no", "not". It goes right before the linking word and flips the meaning of the phrase — No es fácil means "it is not easy". Nada means "nothing" — a separate thing-word, not a negation of the verb.',
          'pt-BR': 'No means negation: "no", "not". It goes right before the linking word and flips the meaning of the phrase — No es fácil means "it is not easy". Nada means "nothing" — a separate thing-word, not a negation of the verb.',
          vi: 'No means negation: "no", "not". It goes right before the linking word and flips the meaning of the phrase — No es fácil means "it is not easy". Nada means "nothing" — a separate thing-word, not a negation of the verb.',
          id: 'No means negation: "no", "not". It goes right before the linking word and flips the meaning of the phrase — No es fácil means "it is not easy". Nada means "nothing" — a separate thing-word, not a negation of the verb.',
          tr: 'No means negation: "no", "not". It goes right before the linking word and flips the meaning of the phrase — No es fácil means "it is not easy". Nada means "nothing" — a separate thing-word, not a negation of the verb.',
          pl: 'No means negation: "no", "not". It goes right before the linking word and flips the meaning of the phrase — No es fácil means "it is not easy". Nada means "nothing" — a separate thing-word, not a negation of the verb.',
        }),
        [
          {
            value: 'nada',
            reasonCode: 'no_meaning_nada_thing_word',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Nada означает «ничего» — предмет, о котором говорят, а не способ отрицать глагол. Отрицание — это no.',
              uk: 'Nada означає «нічого» — предмет, про який говорять, а не спосіб заперечити дієслово. Заперечення — це no.',
              es: 'Nada means "nothing" — a thing being talked about, not a way to negate the verb. The negation is no.',
              'pt-BR': 'Nada means "nothing" — a thing being talked about, not a way to negate the verb. The negation is no.',
              vi: 'Nada means "nothing" — a thing being talked about, not a way to negate the verb. The negation is no.',
              id: 'Nada means "nothing" — a thing being talked about, not a way to negate the verb. The negation is no.',
              tr: 'Nada means "nothing" — a thing being talked about, not a way to negate the verb. The negation is no.',
              pl: 'Nada means "nothing" — a thing being talked about, not a way to negate the verb. The negation is no.',
            }),
          },
          {
            value: 'verdad',
            reasonCode: 'no_meaning_verdad_unrelated',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Verdad означает «правда» — совсем другое слово, признак утверждения, а не его отрицание. Отрицание — это no.',
              uk: 'Verdad означає «правда» — зовсім інше слово, ознака твердження, а не його заперечення. Заперечення — це no.',
              es: 'Verdad means "truth" — a completely different word, a quality of a statement, not its negation. The negation is no.',
              'pt-BR': 'Verdad means "truth" — a completely different word, a quality of a statement, not its negation. The negation is no.',
              vi: 'Verdad means "truth" — a completely different word, a quality of a statement, not its negation. The negation is no.',
              id: 'Verdad means "truth" — a completely different word, a quality of a statement, not its negation. The negation is no.',
              tr: 'Verdad means "truth" — a completely different word, a quality of a statement, not its negation. The negation is no.',
              pl: 'Verdad means "truth" — a completely different word, a quality of a statement, not its negation. The negation is no.',
            }),
          },
        ],
      ),
      build_form: contact(
        L({
          ru: 'No пишется двумя буквами: n-o, без изменений — форма всегда одна, вне зависимости от лица или рода. Nada добавляет буквы -da; non пишет лишнюю n на конце, которой в испанском отрицании нет.',
          uk: 'No пишеться двома літерами: n-o, без змін — форма завжди одна, незалежно від особи чи роду. Nada додає літери -da; non пише зайву n наприкінці, якої в іспанському запереченні немає.',
          es: 'No is written with two letters: n-o, and never changes — the form stays the same no matter the person or gender. Nada adds the letters -da; non writes an extra final n that Spanish negation does not have.',
          'pt-BR': 'No is written with two letters: n-o, and never changes — the form stays the same no matter the person or gender. Nada adds the letters -da; non writes an extra final n that Spanish negation does not have.',
          vi: 'No is written with two letters: n-o, and never changes — the form stays the same no matter the person or gender. Nada adds the letters -da; non writes an extra final n that Spanish negation does not have.',
          id: 'No is written with two letters: n-o, and never changes — the form stays the same no matter the person or gender. Nada adds the letters -da; non writes an extra final n that Spanish negation does not have.',
          tr: 'No is written with two letters: n-o, and never changes — the form stays the same no matter the person or gender. Nada adds the letters -da; non writes an extra final n that Spanish negation does not have.',
          pl: 'No is written with two letters: n-o, and never changes — the form stays the same no matter the person or gender. Nada adds the letters -da; non writes an extra final n that Spanish negation does not have.',
        }),
        [
          {
            value: 'nada',
            reasonCode: 'no_form_nada_wrong_word',
            trapType: 'orthographic',
            feedback: L({
              ru: 'Nada — совсем другое слово, «ничего», на четыре буквы длиннее. Отрицание пишется коротко: no.',
              uk: 'Nada — зовсім інше слово, «нічого», на чотири літери довше. Заперечення пишеться коротко: no.',
              es: 'Nada is a completely different word, "nothing", four letters longer. The negation is written short: no.',
              'pt-BR': 'Nada is a completely different word, "nothing", four letters longer. The negation is written short: no.',
              vi: 'Nada is a completely different word, "nothing", four letters longer. The negation is written short: no.',
              id: 'Nada is a completely different word, "nothing", four letters longer. The negation is written short: no.',
              tr: 'Nada is a completely different word, "nothing", four letters longer. The negation is written short: no.',
              pl: 'Nada is a completely different word, "nothing", four letters longer. The negation is written short: no.',
            }),
          },
          {
            value: 'non',
            reasonCode: 'no_form_non_extra_n',
            trapType: 'orthographic',
            feedback: L({
              ru: 'Non добавляет лишнюю n на конце — так это слово не пишется по-испански. Отрицание — no, без финальной n.',
              uk: 'Non додає зайву n наприкінці — так це слово не пишеться в іспанській. Заперечення — no, без фінальної n.',
              es: 'Non adds an extra final n — that is not how this word is spelled in Spanish. The negation is no, with no final n.',
              'pt-BR': 'Non adds an extra final n — that is not how this word is spelled in Spanish. The negation is no, with no final n.',
              vi: 'Non adds an extra final n — that is not how this word is spelled in Spanish. The negation is no, with no final n.',
              id: 'Non adds an extra final n — that is not how this word is spelled in Spanish. The negation is no, with no final n.',
              tr: 'Non adds an extra final n — that is not how this word is spelled in Spanish. The negation is no, with no final n.',
              pl: 'Non adds an extra final n — that is not how this word is spelled in Spanish. The negation is no, with no final n.',
            }),
          },
        ],
      ),
    },
  },
]);
