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
//
// зачем guidance короче, чем в первой (отклонённой) версии этого файла
// (владелец, 2026-08-27, learning_content_quality_gate_v1.ts MAX_GUIDANCE_CHARS=200):
// исходная формулировка была написана на 500+ знаков на локаль — это уже
// интро-объяснение, а не подсказка внутри задания (Библия текстов, правило 2:
// подсказка читается на бегу, между ответами). Переписано под потолок 200.
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
      'pt-BR': 'verdadeiro — forma masculina da qualidade',
      vi: 'đúng thật — dạng giống đực của đặc điểm',
      id: 'benar, asli — bentuk maskulin dari sifat',
      tr: 'gerçek, hakiki — niteliğin eril biçimi',
      pl: 'prawdziwy — męska forma cechy',
    }),
    features: ['quality_adjective', 'gender_agreement_full', 'truth_adjective'],
    contacts: {
      recognize: contact(
        L({
          ru: 'Verdadero звучит длиннее: ver-da-DE-ro, четыре слога. Verdad короче — всего два, ver-DAD.',
          uk: 'Verdadero звучить довше: ver-da-DE-ro, чотири склади. Verdad коротше — лише два, ver-DAD.',
          es: 'Verdadero sounds longer: ver-da-DE-ro, four syllables. Verdad is shorter — just two, ver-DAD.',
          'pt-BR': 'Verdadero soa mais longo: ver-da-DE-ro, quatro sílabas. Verdad é mais curto — só duas, ver-DAD.',
          vi: 'Verdadero nghe dài hơn: ver-da-DE-ro, bốn âm tiết. Verdad ngắn hơn — chỉ hai, ver-DAD.',
          id: 'Verdadero terdengar lebih panjang: ver-da-DE-ro, empat suku kata. Verdad lebih pendek — hanya dua, ver-DAD.',
          tr: 'Verdadero daha uzun sesli: ver-da-DE-ro, dört hece. Verdad daha kısa — sadece iki, ver-DAD.',
          pl: 'Verdadero brzmi dłużej: ver-da-DE-ro, cztery sylaby. Verdad jest krótsze — tylko dwie, ver-DAD.',
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
          ru: 'Verdadero — признак «истинный». Verdad — предмет «правда», не признак. Mentira значит обратное.',
          uk: 'Verdadero — ознака «істинний». Verdad — предмет «правда», не ознака. Mentira означає протилежне.',
          es: 'Verdadero is the quality "true". Verdad is the thing "truth", not a quality. Mentira means the opposite.',
          'pt-BR': 'Verdadero é a qualidade "verdadeiro". Verdad é a coisa "verdade", não uma qualidade. Mentira é o oposto.',
          vi: 'Verdadero là đặc điểm "đúng". Verdad là sự vật "sự thật", không phải đặc điểm. Mentira nghĩa ngược lại.',
          id: 'Verdadero adalah sifat "benar". Verdad adalah benda "kebenaran", bukan sifat. Mentira berarti kebalikannya.',
          tr: 'Verdadero, "doğru" niteliğidir. Verdad, "doğruluk" şeyidir, nitelik değil. Mentira tam tersi demektir.',
          pl: 'Verdadero to cecha „prawdziwy”. Verdad to rzecz „prawda”, nie cecha. Mentira znaczy przeciwieństwo.',
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
          ru: 'Verdadero пишется с -o: мужской род. Смена -o на -a даёт verdadera. Verdad короче — другое слово.',
          uk: 'Verdadero пишеться з -o: чоловічий рід. Заміна -o на -a дає verdadera. Verdad коротше — інше слово.',
          es: 'Verdadero is written with -o: masculine. Changing -o to -a gives verdadera. Verdad is shorter — a different word.',
          'pt-BR': 'Verdadero se escreve com -o: masculino. Trocar -o por -a dá verdadera. Verdad é mais curto — outra palavra.',
          vi: 'Verdadero viết với -o: giống đực. Đổi -o thành -a cho ra verdadera. Verdad ngắn hơn — từ khác.',
          id: 'Verdadero ditulis dengan -o: maskulin. Mengubah -o menjadi -a menghasilkan verdadera. Verdad lebih pendek — kata lain.',
          tr: 'Verdadero -o ile yazılır: eril. -o\'yu -a yapmak verdadera\'yı verir. Verdad daha kısa — başka bir kelime.',
          pl: 'Verdadero pisze się z -o: rodzaj męski. Zmiana -o na -a daje verdadera. Verdad jest krótsze — inne słowo.',
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
