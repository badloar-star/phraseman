import type {
  LocalizedSource,
  SessionVocabularyContactSourceV1,
  SessionVocabularySourceV1,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-24, карта сессий es_episode_01_session_map_v1.ts,
// сессия 3 "Мужской и женский род" / gender_agreement_full): fácil из сессии 1
// нарочно НЕ меняется по роду (invariable_gender) — на нём нельзя показать
// согласование. Нужно слово с явной парой -o/-a. bonito/bonita ("красивый/
// красивая") — универсальный признак, ещё не занятый другой сессией по карте
// (price — сессия 18, age — сессия 36, quality extended — сессия 33).
// Единственное действительно новое слово здесь — bonito; bonita вводится как
// его женская форма внутри того же word-first блока (build_form-контакт учит
// менять -o на -a), а не как отдельный лексический элемент.
const L = (value: LocalizedSource): LocalizedSource => value;

const contact = (
  guidance: LocalizedSource,
  distractors: SessionVocabularyContactSourceV1['distractors'],
): SessionVocabularyContactSourceV1 => ({ guidance, distractors });

export const ES_EPISODE_01_SESSION_03_VOCABULARY_V1:
  readonly SessionVocabularySourceV1[] = Object.freeze([
  {
    id: 'es-e01-s03-word-bonito',
    target: 'bonito',
    meaning: L({
      ru: 'красивый — мужской род признака',
      uk: 'красивий — чоловічий рід ознаки',
      es: 'pretty, nice-looking — masculine form of the quality',
      'pt-BR': 'pretty, nice-looking — masculine form of the quality',
      vi: 'pretty, nice-looking — masculine form of the quality',
      id: 'pretty, nice-looking — masculine form of the quality',
      tr: 'pretty, nice-looking — masculine form of the quality',
      pl: 'pretty, nice-looking — masculine form of the quality',
    }),
    features: ['quality_adjective', 'gender_agreement_full'],
    contacts: {
      recognize: contact(
        L({
          ru: 'Bonito звучит с ударением на втором слоге — bo-NI-to, три чёткие гласные o-i-o. В bonita последний гласный звучит иначе — /a/, а не /o/. Fácil и вовсе не подходит: другое слово, другой рисунок звука.',
          uk: 'Bonito звучить з наголосом на другому складі — bo-NI-to, три чіткі голосні o-i-o. В bonita останній голосний звучить інакше — /a/, а не /o/. Fácil і зовсім не підходить: інше слово, інший малюнок звуку.',
          es: 'Bonito is stressed on the second syllable — bo-NI-to, three clear vowels o-i-o. Bonita has a different final vowel — /a/, not /o/. Fácil does not fit at all: a different word with a different sound shape.',
          'pt-BR': 'Bonito is stressed on the second syllable — bo-NI-to, three clear vowels o-i-o. Bonita has a different final vowel — /a/, not /o/. Fácil does not fit at all: a different word with a different sound shape.',
          vi: 'Bonito is stressed on the second syllable — bo-NI-to, three clear vowels o-i-o. Bonita has a different final vowel — /a/, not /o/. Fácil does not fit at all: a different word with a different sound shape.',
          id: 'Bonito is stressed on the second syllable — bo-NI-to, three clear vowels o-i-o. Bonita has a different final vowel — /a/, not /o/. Fácil does not fit at all: a different word with a different sound shape.',
          tr: 'Bonito is stressed on the second syllable — bo-NI-to, three clear vowels o-i-o. Bonita has a different final vowel — /a/, not /o/. Fácil does not fit at all: a different word with a different sound shape.',
          pl: 'Bonito is stressed on the second syllable — bo-NI-to, three clear vowels o-i-o. Bonita has a different final vowel — /a/, not /o/. Fácil does not fit at all: a different word with a different sound shape.',
        }),
        [
          {
            value: 'bonita',
            reasonCode: 'bonito_recognize_bonita_final_vowel',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Bonita заканчивается гласным /a/; в bonito на этом месте звучит /o/.',
              uk: 'Bonita закінчується голосним /a/; у bonito на цьому місці звучить /o/.',
              es: 'Bonita ends in the vowel /a/; bonito has /o/ in that same spot.',
              'pt-BR': 'Bonita ends in the vowel /a/; bonito has /o/ in that same spot.',
              vi: 'Bonita ends in the vowel /a/; bonito has /o/ in that same spot.',
              id: 'Bonita ends in the vowel /a/; bonito has /o/ in that same spot.',
              tr: 'Bonita ends in the vowel /a/; bonito has /o/ in that same spot.',
              pl: 'Bonita ends in the vowel /a/; bonito has /o/ in that same spot.',
            }),
          },
          {
            value: 'fácil',
            reasonCode: 'bonito_recognize_facil_different_word',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Fácil — совсем другое слово, звучит на два слога короче и с иным ударением. Нужное слово — bonito.',
              uk: 'Fácil — зовсім інше слово, звучить на два склади коротше й з іншим наголосом. Потрібне слово — bonito.',
              es: 'Fácil is a completely different word, two syllables shorter with different stress. The word here is bonito.',
              'pt-BR': 'Fácil is a completely different word, two syllables shorter with different stress. The word here is bonito.',
              vi: 'Fácil is a completely different word, two syllables shorter with different stress. The word here is bonito.',
              id: 'Fácil is a completely different word, two syllables shorter with different stress. The word here is bonito.',
              tr: 'Fácil is a completely different word, two syllables shorter with different stress. The word here is bonito.',
              pl: 'Fácil is a completely different word, two syllables shorter with different stress. The word here is bonito.',
            }),
          },
        ],
      ),
      retrieve_meaning: contact(
        L({
          ru: 'Bonito означает «красивый» — то же самое качество, что и bonita, но в мужском роде. Fácil значит совсем другое — «лёгкий», признак сложности, а не внешнего вида.',
          uk: 'Bonito означає «красивий» — та сама якість, що й bonita, але в чоловічому роді. Fácil означає зовсім інше — «легкий», ознака складності, а не зовнішнього вигляду.',
          es: 'Bonito means "pretty, nice-looking" — the same quality as bonita, but in the masculine form. Fácil means something completely different — "easy", a quality of difficulty, not appearance.',
          'pt-BR': 'Bonito means "pretty, nice-looking" — the same quality as bonita, but in the masculine form. Fácil means something completely different — "easy", a quality of difficulty, not appearance.',
          vi: 'Bonito means "pretty, nice-looking" — the same quality as bonita, but in the masculine form. Fácil means something completely different — "easy", a quality of difficulty, not appearance.',
          id: 'Bonito means "pretty, nice-looking" — the same quality as bonita, but in the masculine form. Fácil means something completely different — "easy", a quality of difficulty, not appearance.',
          tr: 'Bonito means "pretty, nice-looking" — the same quality as bonita, but in the masculine form. Fácil means something completely different — "easy", a quality of difficulty, not appearance.',
          pl: 'Bonito means "pretty, nice-looking" — the same quality as bonita, but in the masculine form. Fácil means something completely different — "easy", a quality of difficulty, not appearance.',
        }),
        [
          {
            value: 'fácil',
            reasonCode: 'bonito_meaning_facil_unrelated',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Fácil означает «лёгкий» — признак сложности задачи, не внешнего вида. «Красивый» — это bonito.',
              uk: 'Fácil означає «легкий» — ознака складності завдання, не зовнішнього вигляду. «Красивий» — це bonito.',
              es: 'Fácil means "easy" — a quality of difficulty, not appearance. "Pretty" is bonito.',
              'pt-BR': 'Fácil means "easy" — a quality of difficulty, not appearance. "Pretty" is bonito.',
              vi: 'Fácil means "easy" — a quality of difficulty, not appearance. "Pretty" is bonito.',
              id: 'Fácil means "easy" — a quality of difficulty, not appearance. "Pretty" is bonito.',
              tr: 'Fácil means "easy" — a quality of difficulty, not appearance. "Pretty" is bonito.',
              pl: 'Fácil means "easy" — a quality of difficulty, not appearance. "Pretty" is bonito.',
            }),
          },
          {
            value: 'verdad',
            reasonCode: 'bonito_meaning_verdad_unrelated',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Verdad означает «правда» — совсем другое понятие, не про внешний вид. «Красивый» — это bonito.',
              uk: 'Verdad означає «правда» — зовсім інше поняття, не про зовнішній вигляд. «Красивий» — це bonito.',
              es: 'Verdad means "truth" — a completely different idea, not about appearance. "Pretty" is bonito.',
              'pt-BR': 'Verdad means "truth" — a completely different idea, not about appearance. "Pretty" is bonito.',
              vi: 'Verdad means "truth" — a completely different idea, not about appearance. "Pretty" is bonito.',
              id: 'Verdad means "truth" — a completely different idea, not about appearance. "Pretty" is bonito.',
              tr: 'Verdad means "truth" — a completely different idea, not about appearance. "Pretty" is bonito.',
              pl: 'Verdad means "truth" — a completely different idea, not about appearance. "Pretty" is bonito.',
            }),
          },
        ],
      ),
      build_form: contact(
        L({
          ru: 'Bonito пишется с концовкой -o: про предмет или человека мужского рода. Смена всего одной буквы — -o на -a — даёт bonita, форму для женского рода: bonita пишет -a там, где bonito пишет -o.',
          uk: 'Bonito пишеться з закінченням -o: про предмет чи людину чоловічого роду. Зміна лише однієї літери — -o на -a — дає bonita, форму для жіночого роду: bonita пише -a там, де bonito пише -o.',
          es: 'Bonito is written with the ending -o: for a masculine noun or person. Changing just one letter — -o to -a — gives bonita, the feminine form: bonita writes -a where bonito writes -o.',
          'pt-BR': 'Bonito is written with the ending -o: for a masculine noun or person. Changing just one letter — -o to -a — gives bonita, the feminine form: bonita writes -a where bonito writes -o.',
          vi: 'Bonito is written with the ending -o: for a masculine noun or person. Changing just one letter — -o to -a — gives bonita, the feminine form: bonita writes -a where bonito writes -o.',
          id: 'Bonito is written with the ending -o: for a masculine noun or person. Changing just one letter — -o to -a — gives bonita, the feminine form: bonita writes -a where bonito writes -o.',
          tr: 'Bonito is written with the ending -o: for a masculine noun or person. Changing just one letter — -o to -a — gives bonita, the feminine form: bonita writes -a where bonito writes -o.',
          pl: 'Bonito is written with the ending -o: for a masculine noun or person. Changing just one letter — -o to -a — gives bonita, the feminine form: bonita writes -a where bonito writes -o.',
        }),
        [
          {
            value: 'bonita',
            reasonCode: 'bonito_form_bonita_wrong_gender',
            trapType: 'grammar',
            feedback: L({
              ru: 'Bonita — форма женского рода, с концовкой -a. Про предмет или человека мужского рода нужна форма bonito, с -o.',
              uk: 'Bonita — форма жіночого роду, з закінченням -a. Про предмет чи людину чоловічого роду потрібна форма bonito, з -o.',
              es: 'Bonita is the feminine form, ending in -a. For a masculine noun or person, the form is bonito, ending in -o.',
              'pt-BR': 'Bonita is the feminine form, ending in -a. For a masculine noun or person, the form is bonito, ending in -o.',
              vi: 'Bonita is the feminine form, ending in -a. For a masculine noun or person, the form is bonito, ending in -o.',
              id: 'Bonita is the feminine form, ending in -a. For a masculine noun or person, the form is bonito, ending in -o.',
              tr: 'Bonita is the feminine form, ending in -a. For a masculine noun or person, the form is bonito, ending in -o.',
              pl: 'Bonita is the feminine form, ending in -a. For a masculine noun or person, the form is bonito, ending in -o.',
            }),
          },
          {
            value: 'bonitoo',
            reasonCode: 'bonito_form_bonitoo_extra_letter',
            trapType: 'orthographic',
            feedback: L({
              ru: 'Bonitoo повторяет последнюю букву — лишняя o. Правильное написание — bonito, ровно с одной концовкой -o.',
              uk: 'Bonitoo повторює останню літеру — зайва o. Правильне написання — bonito, рівно з одним закінченням -o.',
              es: 'Bonitoo repeats the final letter — an extra o. The correct spelling is bonito, with exactly one ending -o.',
              'pt-BR': 'Bonitoo repeats the final letter — an extra o. The correct spelling is bonito, with exactly one ending -o.',
              vi: 'Bonitoo repeats the final letter — an extra o. The correct spelling is bonito, with exactly one ending -o.',
              id: 'Bonitoo repeats the final letter — an extra o. The correct spelling is bonito, with exactly one ending -o.',
              tr: 'Bonitoo repeats the final letter — an extra o. The correct spelling is bonito, with exactly one ending -o.',
              pl: 'Bonitoo repeats the final letter — an extra o. The correct spelling is bonito, with exactly one ending -o.',
            }),
          },
        ],
      ),
    },
  },
]);
