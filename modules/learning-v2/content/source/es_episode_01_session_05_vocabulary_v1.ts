import type {
  LocalizedSource,
  SessionVocabularyContactSourceV1,
  SessionVocabularySourceV1,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-24, карта сессий es_episode_01_session_map_v1.ts,
// сессия 5 "Быстрый и медленный" / pace_adjective, kind: 'phrases' по карте,
// но word-first правило действует для КАЖДОГО нового слова, как в сессии 2):
// rápido — единственное по-настоящему новое слово, признак темпа. Уже
// упоминалось как соседнее слово (fácilmente vs fácil) в сессии 1, но не
// изучалось само. builtOn: [1] (ser+gender), recalls: [2 (negation), 4
// (truth_adjective, тот же -o/-a паттерн)].
const L = (value: LocalizedSource): LocalizedSource => value;

const contact = (
  guidance: LocalizedSource,
  distractors: SessionVocabularyContactSourceV1['distractors'],
): SessionVocabularyContactSourceV1 => ({ guidance, distractors });

export const ES_EPISODE_01_SESSION_05_VOCABULARY_V1:
  readonly SessionVocabularySourceV1[] = Object.freeze([
  {
    id: 'es-e01-s05-word-rapido',
    target: 'rápido',
    meaning: L({
      ru: 'быстрый — мужской род признака темпа',
      uk: 'швидкий — чоловічий рід ознаки темпу',
      es: 'fast, quick — masculine form of the pace quality',
      'pt-BR': 'fast, quick — masculine form of the pace quality',
      vi: 'fast, quick — masculine form of the pace quality',
      id: 'fast, quick — masculine form of the pace quality',
      tr: 'fast, quick — masculine form of the pace quality',
      pl: 'fast, quick — masculine form of the pace quality',
    }),
    features: ['quality_adjective', 'gender_agreement_full', 'pace_adjective'],
    contacts: {
      recognize: contact(
        L({
          ru: 'Rápido ударен на первом слоге — RÁ-pi-do, с заметным á, как и fácil. В rápida последний гласный звучит /a/, а не /o/. No — совсем короткое слово из одного слога, звучит совершенно иначе.',
          uk: 'Rápido наголошений на першому складі — RÁ-pi-do, з помітним á, як і fácil. У rápida останній голосний звучить /a/, а не /o/. No — зовсім коротке слово з одного складу, звучить зовсім інакше.',
          es: 'Rápido is stressed on the first syllable — RÁ-pi-do, with a clear á, like fácil. Rápida has a different final vowel — /a/, not /o/. No is a very short one-syllable word, sounding completely different.',
          'pt-BR': 'Rápido is stressed on the first syllable — RÁ-pi-do, with a clear á, like fácil. Rápida has a different final vowel — /a/, not /o/. No is a very short one-syllable word, sounding completely different.',
          vi: 'Rápido is stressed on the first syllable — RÁ-pi-do, with a clear á, like fácil. Rápida has a different final vowel — /a/, not /o/. No is a very short one-syllable word, sounding completely different.',
          id: 'Rápido is stressed on the first syllable — RÁ-pi-do, with a clear á, like fácil. Rápida has a different final vowel — /a/, not /o/. No is a very short one-syllable word, sounding completely different.',
          tr: 'Rápido is stressed on the first syllable — RÁ-pi-do, with a clear á, like fácil. Rápida has a different final vowel — /a/, not /o/. No is a very short one-syllable word, sounding completely different.',
          pl: 'Rápido is stressed on the first syllable — RÁ-pi-do, with a clear á, like fácil. Rápida has a different final vowel — /a/, not /o/. No is a very short one-syllable word, sounding completely different.',
        }),
        [
          {
            value: 'rápida',
            reasonCode: 'rapido_recognize_rapida_final_vowel',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Rápida заканчивается гласным /a/; в rápido на этом месте звучит /o/.',
              uk: 'Rápida закінчується голосним /a/; у rápido на цьому місці звучить /o/.',
              es: 'Rápida ends in the vowel /a/; rápido has /o/ in that same spot.',
              'pt-BR': 'Rápida ends in the vowel /a/; rápido has /o/ in that same spot.',
              vi: 'Rápida ends in the vowel /a/; rápido has /o/ in that same spot.',
              id: 'Rápida ends in the vowel /a/; rápido has /o/ in that same spot.',
              tr: 'Rápida ends in the vowel /a/; rápido has /o/ in that same spot.',
              pl: 'Rápida ends in the vowel /a/; rápido has /o/ in that same spot.',
            }),
          },
          {
            value: 'no',
            reasonCode: 'rapido_recognize_no_different_word',
            trapType: 'phonetic',
            feedback: L({
              ru: 'No — совсем другое слово, короче на два слога. Нужное слово — rápido.',
              uk: 'No — зовсім інше слово, коротше на два склади. Потрібне слово — rápido.',
              es: 'No is a completely different word, two syllables shorter. The word here is rápido.',
              'pt-BR': 'No is a completely different word, two syllables shorter. The word here is rápido.',
              vi: 'No is a completely different word, two syllables shorter. The word here is rápido.',
              id: 'No is a completely different word, two syllables shorter. The word here is rápido.',
              tr: 'No is a completely different word, two syllables shorter. The word here is rápido.',
              pl: 'No is a completely different word, two syllables shorter. The word here is rápido.',
            }),
          },
        ],
      ),
      retrieve_meaning: contact(
        L({
          ru: 'Rápido означает «быстрый» — признак темпа, скорости. Fácil значит совсем другое — «лёгкий», признак сложности, а не скорости. Difícil — вообще противоположность fácil, тоже про сложность, а не про темп.',
          uk: 'Rápido означає «швидкий» — ознака темпу, швидкості. Fácil означає зовсім інше — «легкий», ознака складності, а не швидкості. Difícil — узагалі протилежність fácil, теж про складність, а не про темп.',
          es: 'Rápido means "fast" — a quality of pace, speed. Fácil means something completely different — "easy", a quality of difficulty, not speed. Difícil is the opposite of fácil, also about difficulty, not pace.',
          'pt-BR': 'Rápido means "fast" — a quality of pace, speed. Fácil means something completely different — "easy", a quality of difficulty, not speed. Difícil is the opposite of fácil, also about difficulty, not pace.',
          vi: 'Rápido means "fast" — a quality of pace, speed. Fácil means something completely different — "easy", a quality of difficulty, not speed. Difícil is the opposite of fácil, also about difficulty, not pace.',
          id: 'Rápido means "fast" — a quality of pace, speed. Fácil means something completely different — "easy", a quality of difficulty, not speed. Difícil is the opposite of fácil, also about difficulty, not pace.',
          tr: 'Rápido means "fast" — a quality of pace, speed. Fácil means something completely different — "easy", a quality of difficulty, not speed. Difícil is the opposite of fácil, also about difficulty, not pace.',
          pl: 'Rápido means "fast" — a quality of pace, speed. Fácil means something completely different — "easy", a quality of difficulty, not speed. Difícil is the opposite of fácil, also about difficulty, not pace.',
        }),
        [
          {
            value: 'fácil',
            reasonCode: 'rapido_meaning_facil_unrelated',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Fácil означает «лёгкий» — признак сложности, не скорости. «Быстрый» — это rápido.',
              uk: 'Fácil означає «легкий» — ознака складності, не швидкості. «Швидкий» — це rápido.',
              es: 'Fácil means "easy" — a quality of difficulty, not speed. "Fast" is rápido.',
              'pt-BR': 'Fácil means "easy" — a quality of difficulty, not speed. "Fast" is rápido.',
              vi: 'Fácil means "easy" — a quality of difficulty, not speed. "Fast" is rápido.',
              id: 'Fácil means "easy" — a quality of difficulty, not speed. "Fast" is rápido.',
              tr: 'Fácil means "easy" — a quality of difficulty, not speed. "Fast" is rápido.',
              pl: 'Fácil means "easy" — a quality of difficulty, not speed. "Fast" is rápido.',
            }),
          },
          {
            value: 'verdadero',
            reasonCode: 'rapido_meaning_verdadero_unrelated',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Verdadero означает «истинный» — совсем другой признак, не про скорость. «Быстрый» — это rápido.',
              uk: 'Verdadero означає «істинний» — зовсім інша ознака, не про швидкість. «Швидкий» — це rápido.',
              es: 'Verdadero means "true" — a completely different quality, not about speed. "Fast" is rápido.',
              'pt-BR': 'Verdadero means "true" — a completely different quality, not about speed. "Fast" is rápido.',
              vi: 'Verdadero means "true" — a completely different quality, not about speed. "Fast" is rápido.',
              id: 'Verdadero means "true" — a completely different quality, not about speed. "Fast" is rápido.',
              tr: 'Verdadero means "true" — a completely different quality, not about speed. "Fast" is rápido.',
              pl: 'Verdadero means "true" — a completely different quality, not about speed. "Fast" is rápido.',
            }),
          },
        ],
      ),
      build_form: contact(
        L({
          ru: 'Rápido пишется с ударением на á: r-á-p-i-d-o, концовка -o — про предмет мужского рода. Смена одной буквы — -o на -a — даёт rápida, форму женского рода. Rápidamente добавляет ещё -mente и означает «быстро» как наречие при действии, а не признак самой вещи.',
          uk: 'Rápido пишеться з наголосом на á: r-á-p-i-d-o, закінчення -o — про предмет чоловічого роду. Зміна однієї літери — -o на -a — дає rápida, форму жіночого роду. Rápidamente додає ще -mente й означає «швидко» як прислівник при дії, а не ознаку самої речі.',
          es: 'Rápido is written with an accent on á: r-á-p-i-d-o, the ending -o is for a masculine noun. Changing one letter — -o to -a — gives rápida, the feminine form. Rápidamente adds -mente and means "quickly" as an adverb used with an action, not a quality of the thing itself.',
          'pt-BR': 'Rápido is written with an accent on á: r-á-p-i-d-o, the ending -o is for a masculine noun. Changing one letter — -o to -a — gives rápida, the feminine form. Rápidamente adds -mente and means "quickly" as an adverb used with an action, not a quality of the thing itself.',
          vi: 'Rápido is written with an accent on á: r-á-p-i-d-o, the ending -o is for a masculine noun. Changing one letter — -o to -a — gives rápida, the feminine form. Rápidamente adds -mente and means "quickly" as an adverb used with an action, not a quality of the thing itself.',
          id: 'Rápido is written with an accent on á: r-á-p-i-d-o, the ending -o is for a masculine noun. Changing one letter — -o to -a — gives rápida, the feminine form. Rápidamente adds -mente and means "quickly" as an adverb used with an action, not a quality of the thing itself.',
          tr: 'Rápido is written with an accent on á: r-á-p-i-d-o, the ending -o is for a masculine noun. Changing one letter — -o to -a — gives rápida, the feminine form. Rápidamente adds -mente and means "quickly" as an adverb used with an action, not a quality of the thing itself.',
          pl: 'Rápido is written with an accent on á: r-á-p-i-d-o, the ending -o is for a masculine noun. Changing one letter — -o to -a — gives rápida, the feminine form. Rápidamente adds -mente and means "quickly" as an adverb used with an action, not a quality of the thing itself.',
        }),
        [
          {
            value: 'rápida',
            reasonCode: 'rapido_form_rapida_wrong_gender',
            trapType: 'grammar',
            feedback: L({
              ru: 'Rápida — форма женского рода, с концовкой -a. Про предмет мужского рода нужна форма rápido, с -o.',
              uk: 'Rápida — форма жіночого роду, з закінченням -a. Про предмет чоловічого роду потрібна форма rápido, з -o.',
              es: 'Rápida is the feminine form, ending in -a. For a masculine noun, the form is rápido, ending in -o.',
              'pt-BR': 'Rápida is the feminine form, ending in -a. For a masculine noun, the form is rápido, ending in -o.',
              vi: 'Rápida is the feminine form, ending in -a. For a masculine noun, the form is rápido, ending in -o.',
              id: 'Rápida is the feminine form, ending in -a. For a masculine noun, the form is rápido, ending in -o.',
              tr: 'Rápida is the feminine form, ending in -a. For a masculine noun, the form is rápido, ending in -o.',
              pl: 'Rápida is the feminine form, ending in -a. For a masculine noun, the form is rápido, ending in -o.',
            }),
          },
          {
            value: 'rápidamente',
            reasonCode: 'rapido_form_rapidamente_adverb',
            trapType: 'orthographic',
            feedback: L({
              ru: 'Rápidamente — наречие с добавкой -mente, «быстро» при действии. Признак самой вещи — короткое rápido.',
              uk: 'Rápidamente — прислівник з додатком -mente, «швидко» при дії. Ознака самої речі — коротке rápido.',
              es: 'Rápidamente is an adverb with -mente added, "quickly" used with an action. The quality of a thing itself is the short form rápido.',
              'pt-BR': 'Rápidamente is an adverb with -mente added, "quickly" used with an action. The quality of a thing itself is the short form rápido.',
              vi: 'Rápidamente is an adverb with -mente added, "quickly" used with an action. The quality of a thing itself is the short form rápido.',
              id: 'Rápidamente is an adverb with -mente added, "quickly" used with an action. The quality of a thing itself is the short form rápido.',
              tr: 'Rápidamente is an adverb with -mente added, "quickly" used with an action. The quality of a thing itself is the short form rápido.',
              pl: 'Rápidamente is an adverb with -mente added, "quickly" used with an action. The quality of a thing itself is the short form rápido.',
            }),
          },
        ],
      ),
    },
  },
]);
