import type {
  LocalizedSource,
  SessionVocabularyContactSourceV1,
  SessionVocabularySourceV1,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-24, карта сессий es_episode_01_session_map_v1.ts,
// сессия 4 "Правда или нет" / truth_adjective, builtOn: [1, 3], recalls: [1, 3]):
// verdad из сессии 1 — существительное «правда», неизменное по роду (это
// вообще не прилагательное). verdadero/verdadera — прилагательное «истинный»,
// уже упоминалось как дистрактор в сессии 1, но не изучалось само. Оно
// естественно соединяет обе предыдущие темы: recalls verdad (1) и
// gender_agreement_full (3) — верное прилагательное меняется -o/-a, как
// bonito/bonita, но новый признак («истинный»), не повтор старого.
const L = (value: LocalizedSource): LocalizedSource => value;

const contact = (
  guidance: LocalizedSource,
  distractors: SessionVocabularyContactSourceV1['distractors'],
): SessionVocabularyContactSourceV1 => ({ guidance, distractors });

export const ES_EPISODE_01_SESSION_04_VOCABULARY_V1:
  readonly SessionVocabularySourceV1[] = Object.freeze([
  {
    id: 'es-e01-s04-word-verdadero',
    target: 'verdadero',
    meaning: L({
      ru: 'истинный, настоящий — мужской род признака',
      uk: 'істинний, справжній — чоловічий рід ознаки',
      es: 'true, genuine — masculine form of the quality',
      'pt-BR': 'true, genuine — masculine form of the quality',
      vi: 'true, genuine — masculine form of the quality',
      id: 'true, genuine — masculine form of the quality',
      tr: 'true, genuine — masculine form of the quality',
      pl: 'true, genuine — masculine form of the quality',
    }),
    features: ['quality_adjective', 'gender_agreement_full', 'truth_adjective'],
    contacts: {
      recognize: contact(
        L({
          ru: 'Verdadero ударен на предпоследнем слоге — ver-da-DE-ro, четыре чёткие гласные. Verdad звучит короче — всего два слога, ver-DAD, с конечным /d/, а не /ro/. Verdadera заканчивается на /a/, а не на /o/.',
          uk: 'Verdadero наголошений на передостанньому складі — ver-da-DE-ro, чотири чіткі голосні. Verdad звучить коротше — лише два склади, ver-DAD, з кінцевим /d/, а не /ro/. Verdadera закінчується на /a/, а не на /o/.',
          es: 'Verdadero is stressed on the second-to-last syllable — ver-da-DE-ro, four clear vowels. Verdad sounds shorter — just two syllables, ver-DAD, ending in /d/, not /ro/. Verdadera ends in /a/, not /o/.',
          'pt-BR': 'Verdadero is stressed on the second-to-last syllable — ver-da-DE-ro, four clear vowels. Verdad sounds shorter — just two syllables, ver-DAD, ending in /d/, not /ro/. Verdadera ends in /a/, not /o/.',
          vi: 'Verdadero is stressed on the second-to-last syllable — ver-da-DE-ro, four clear vowels. Verdad sounds shorter — just two syllables, ver-DAD, ending in /d/, not /ro/. Verdadera ends in /a/, not /o/.',
          id: 'Verdadero is stressed on the second-to-last syllable — ver-da-DE-ro, four clear vowels. Verdad sounds shorter — just two syllables, ver-DAD, ending in /d/, not /ro/. Verdadera ends in /a/, not /o/.',
          tr: 'Verdadero is stressed on the second-to-last syllable — ver-da-DE-ro, four clear vowels. Verdad sounds shorter — just two syllables, ver-DAD, ending in /d/, not /ro/. Verdadera ends in /a/, not /o/.',
          pl: 'Verdadero is stressed on the second-to-last syllable — ver-da-DE-ro, four clear vowels. Verdad sounds shorter — just two syllables, ver-DAD, ending in /d/, not /ro/. Verdadera ends in /a/, not /o/.',
        }),
        [
          {
            value: 'verdad',
            reasonCode: 'verdadero_recognize_verdad_shorter',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Verdad звучит короче — только два слога, заканчивается на /d/. Verdadero на два слога длиннее.',
              uk: 'Verdad звучить коротше — лише два склади, закінчується на /d/. Verdadero на два склади довше.',
              es: 'Verdad sounds shorter — only two syllables, ending in /d/. Verdadero is two syllables longer.',
              'pt-BR': 'Verdad sounds shorter — only two syllables, ending in /d/. Verdadero is two syllables longer.',
              vi: 'Verdad sounds shorter — only two syllables, ending in /d/. Verdadero is two syllables longer.',
              id: 'Verdad sounds shorter — only two syllables, ending in /d/. Verdadero is two syllables longer.',
              tr: 'Verdad sounds shorter — only two syllables, ending in /d/. Verdadero is two syllables longer.',
              pl: 'Verdad sounds shorter — only two syllables, ending in /d/. Verdadero is two syllables longer.',
            }),
          },
          {
            value: 'verdadera',
            reasonCode: 'verdadero_recognize_verdadera_final_vowel',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Verdadera заканчивается гласным /a/; в verdadero на этом месте звучит /o/.',
              uk: 'Verdadera закінчується голосним /a/; у verdadero на цьому місці звучить /o/.',
              es: 'Verdadera ends in the vowel /a/; verdadero has /o/ in that same spot.',
              'pt-BR': 'Verdadera ends in the vowel /a/; verdadero has /o/ in that same spot.',
              vi: 'Verdadera ends in the vowel /a/; verdadero has /o/ in that same spot.',
              id: 'Verdadera ends in the vowel /a/; verdadero has /o/ in that same spot.',
              tr: 'Verdadera ends in the vowel /a/; verdadero has /o/ in that same spot.',
              pl: 'Verdadera ends in the vowel /a/; verdadero has /o/ in that same spot.',
            }),
          },
        ],
      ),
      retrieve_meaning: contact(
        L({
          ru: 'Verdadero означает «истинный, настоящий» — признак предмета или человека мужского рода. Verdad — совсем другое: существительное «правда», предмет, а не признак. Mentira значит прямо противоположное — «ложь».',
          uk: 'Verdadero означає «істинний, справжній» — ознака предмета чи людини чоловічого роду. Verdad — зовсім інше: іменник «правда», предмет, а не ознака. Mentira означає пряму протилежність — «брехня».',
          es: 'Verdadero means "true, genuine" — a quality of a masculine noun or person. Verdad is something completely different: the noun "truth", a thing, not a quality. Mentira means the direct opposite — "lie".',
          'pt-BR': 'Verdadero means "true, genuine" — a quality of a masculine noun or person. Verdad is something completely different: the noun "truth", a thing, not a quality. Mentira means the direct opposite — "lie".',
          vi: 'Verdadero means "true, genuine" — a quality of a masculine noun or person. Verdad is something completely different: the noun "truth", a thing, not a quality. Mentira means the direct opposite — "lie".',
          id: 'Verdadero means "true, genuine" — a quality of a masculine noun or person. Verdad is something completely different: the noun "truth", a thing, not a quality. Mentira means the direct opposite — "lie".',
          tr: 'Verdadero means "true, genuine" — a quality of a masculine noun or person. Verdad is something completely different: the noun "truth", a thing, not a quality. Mentira means the direct opposite — "lie".',
          pl: 'Verdadero means "true, genuine" — a quality of a masculine noun or person. Verdad is something completely different: the noun "truth", a thing, not a quality. Mentira means the direct opposite — "lie".',
        }),
        [
          {
            value: 'verdad',
            reasonCode: 'verdadero_meaning_verdad_noun_not_adjective',
            trapType: 'grammar',
            feedback: L({
              ru: 'Verdad — существительное «правда», предмет. Признак предмета — это verdadero.',
              uk: 'Verdad — іменник «правда», предмет. Ознака предмета — це verdadero.',
              es: 'Verdad is the noun "truth", a thing. A quality of a noun is verdadero.',
              'pt-BR': 'Verdad is the noun "truth", a thing. A quality of a noun is verdadero.',
              vi: 'Verdad is the noun "truth", a thing. A quality of a noun is verdadero.',
              id: 'Verdad is the noun "truth", a thing. A quality of a noun is verdadero.',
              tr: 'Verdad is the noun "truth", a thing. A quality of a noun is verdadero.',
              pl: 'Verdad is the noun "truth", a thing. A quality of a noun is verdadero.',
            }),
          },
          {
            value: 'mentira',
            reasonCode: 'verdadero_meaning_mentira_opposite',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Mentira означает «ложь» — противоположность «истинного». «Истинный» — это verdadero.',
              uk: 'Mentira означає «брехня» — протилежність «істинного». «Істинний» — це verdadero.',
              es: 'Mentira means "lie" — the opposite of "true". "True" is verdadero.',
              'pt-BR': 'Mentira means "lie" — the opposite of "true". "True" is verdadero.',
              vi: 'Mentira means "lie" — the opposite of "true". "True" is verdadero.',
              id: 'Mentira means "lie" — the opposite of "true". "True" is verdadero.',
              tr: 'Mentira means "lie" — the opposite of "true". "True" is verdadero.',
              pl: 'Mentira means "lie" — the opposite of "true". "True" is verdadero.',
            }),
          },
        ],
      ),
      build_form: contact(
        L({
          ru: 'Verdadero пишется с концовкой -o: про предмет или человека мужского рода. Смена одной буквы — -o на -a — даёт verdadera, форму женского рода. Verdad пишется короче, без -ero на конце: это отдельное слово, существительное, а не форма прилагательного.',
          uk: 'Verdadero пишеться з закінченням -o: про предмет чи людину чоловічого роду. Зміна однієї літери — -o на -a — дає verdadera, форму жіночого роду. Verdad пишеться коротше, без -ero наприкінці: це окреме слово, іменник, а не форма прикметника.',
          es: 'Verdadero is written with the ending -o: for a masculine noun or person. Changing one letter — -o to -a — gives verdadera, the feminine form. Verdad is written shorter, with no -ero at the end: it is a separate word, a noun, not a form of the adjective.',
          'pt-BR': 'Verdadero is written with the ending -o: for a masculine noun or person. Changing one letter — -o to -a — gives verdadera, the feminine form. Verdad is written shorter, with no -ero at the end: it is a separate word, a noun, not a form of the adjective.',
          vi: 'Verdadero is written with the ending -o: for a masculine noun or person. Changing one letter — -o to -a — gives verdadera, the feminine form. Verdad is written shorter, with no -ero at the end: it is a separate word, a noun, not a form of the adjective.',
          id: 'Verdadero is written with the ending -o: for a masculine noun or person. Changing one letter — -o to -a — gives verdadera, the feminine form. Verdad is written shorter, with no -ero at the end: it is a separate word, a noun, not a form of the adjective.',
          tr: 'Verdadero is written with the ending -o: for a masculine noun or person. Changing one letter — -o to -a — gives verdadera, the feminine form. Verdad is written shorter, with no -ero at the end: it is a separate word, a noun, not a form of the adjective.',
          pl: 'Verdadero is written with the ending -o: for a masculine noun or person. Changing one letter — -o to -a — gives verdadera, the feminine form. Verdad is written shorter, with no -ero at the end: it is a separate word, a noun, not a form of the adjective.',
        }),
        [
          {
            value: 'verdadera',
            reasonCode: 'verdadero_form_verdadera_wrong_gender',
            trapType: 'grammar',
            feedback: L({
              ru: 'Verdadera — форма женского рода, с концовкой -a. Про предмет мужского рода нужна форма verdadero, с -o.',
              uk: 'Verdadera — форма жіночого роду, з закінченням -a. Про предмет чоловічого роду потрібна форма verdadero, з -o.',
              es: 'Verdadera is the feminine form, ending in -a. For a masculine noun, the form is verdadero, ending in -o.',
              'pt-BR': 'Verdadera is the feminine form, ending in -a. For a masculine noun, the form is verdadero, ending in -o.',
              vi: 'Verdadera is the feminine form, ending in -a. For a masculine noun, the form is verdadero, ending in -o.',
              id: 'Verdadera is the feminine form, ending in -a. For a masculine noun, the form is verdadero, ending in -o.',
              tr: 'Verdadera is the feminine form, ending in -a. For a masculine noun, the form is verdadero, ending in -o.',
              pl: 'Verdadera is the feminine form, ending in -a. For a masculine noun, the form is verdadero, ending in -o.',
            }),
          },
          {
            value: 'verdad',
            reasonCode: 'verdadero_form_verdad_wrong_word',
            trapType: 'orthographic',
            feedback: L({
              ru: 'Verdad — короче на три буквы и другое слово, существительное. Прилагательное «истинный» пишется verdadero.',
              uk: 'Verdad — коротше на три літери й інше слово, іменник. Прикметник «істинний» пишеться verdadero.',
              es: 'Verdad is three letters shorter and a different word, a noun. The adjective "true" is spelled verdadero.',
              'pt-BR': 'Verdad is three letters shorter and a different word, a noun. The adjective "true" is spelled verdadero.',
              vi: 'Verdad is three letters shorter and a different word, a noun. The adjective "true" is spelled verdadero.',
              id: 'Verdad is three letters shorter and a different word, a noun. The adjective "true" is spelled verdadero.',
              tr: 'Verdad is three letters shorter and a different word, a noun. The adjective "true" is spelled verdadero.',
              pl: 'Verdad is three letters shorter and a different word, a noun. The adjective "true" is spelled verdadero.',
            }),
          },
        ],
      ),
    },
  },
]);
