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
//
// зачем guidance короче, чем в первой (отклонённой) версии этого файла
// (владелец, 2026-08-27, тот же класс правки, что и в сессии 4,
// learning_content_quality_gate_v1.ts MAX_GUIDANCE_CHARS=200): исходная
// формулировка была написана на 450+ знаков на локаль. Переписано под
// потолок 200 без потери фонетических/семантических/орфографических ловушек.
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
      'pt-BR': 'rápido — forma masculina da qualidade de ritmo',
      vi: 'nhanh — dạng giống đực của đặc điểm tốc độ',
      id: 'cepat — bentuk maskulin dari sifat kecepatan',
      tr: 'hızlı — niteliğin eril biçimi',
      pl: 'szybki — męska forma cechy tempa',
    }),
    features: ['quality_adjective', 'gender_agreement_full', 'pace_adjective'],
    contacts: {
      recognize: contact(
        L({
          ru: 'Rápido ударен на первом слоге — RÁ-pi-do, как и fácil. No — совсем короткое слово из одного слога, звучит иначе.',
          uk: 'Rápido наголошений на першому складі — RÁ-pi-do, як і fácil. No — зовсім коротке слово з одного складу, звучить інакше.',
          es: 'Rápido is stressed on the first syllable — RÁ-pi-do, like fácil. No is a very short one-syllable word, sounding different.',
          'pt-BR': 'Rápido é acentuado na primeira sílaba — RÁ-pi-do, como fácil. No é uma palavra curta de uma sílaba, soa diferente.',
          vi: 'Rápido có trọng âm ở âm tiết đầu — RÁ-pi-do, giống fácil. No là từ rất ngắn một âm tiết, nghe khác hẳn.',
          id: 'Rápido bertekanan di suku kata pertama — RÁ-pi-do, seperti fácil. No adalah kata pendek satu suku kata, terdengar berbeda.',
          tr: 'Rápido ilk hecede vurguludur — RÁ-pi-do, fácil gibi. No çok kısa tek heceli bir kelimedir, farklı seslenir.',
          pl: 'Rápido ma akcent na pierwszej sylabie — RÁ-pi-do, jak fácil. No to bardzo krótkie jednosylabowe słowo, brzmi inaczej.',
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
          ru: 'Rápido — признак «быстрый», про скорость. Fácil значит «лёгкий», про сложность, а не скорость. Verdadero про истинность.',
          uk: 'Rápido — ознака «швидкий», про швидкість. Fácil означає «легкий», про складність, а не швидкість. Verdadero про істинність.',
          es: 'Rápido is the quality "fast", about speed. Fácil means "easy", about difficulty, not speed. Verdadero is about truthfulness.',
          'pt-BR': 'Rápido é a qualidade "rápido", sobre velocidade. Fácil significa "fácil", sobre dificuldade, não velocidade. Verdadero é sobre veracidade.',
          vi: 'Rápido là đặc điểm "nhanh", về tốc độ. Fácil nghĩa là "dễ", về độ khó, không phải tốc độ. Verdadero về sự đúng đắn.',
          id: 'Rápido adalah sifat "cepat", tentang kecepatan. Fácil berarti "mudah", tentang kesulitan, bukan kecepatan. Verdadero tentang kebenaran.',
          tr: 'Rápido, "hızlı" niteliğidir, hız hakkındadır. Fácil "kolay" demektir, zorluk hakkında, hız değil. Verdadero doğruluk hakkındadır.',
          pl: 'Rápido to cecha „szybki”, o szybkości. Fácil znaczy „łatwy”, o trudności, nie szybkości. Verdadero dotyczy prawdziwości.',
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
          ru: 'Rápido пишется с á и концовкой -o — мужской род. Смена -o на -a даёт rápida. Rápidamente — наречие, «быстро» при действии.',
          uk: 'Rápido пишеться з á і закінченням -o — чоловічий рід. Заміна -o на -a дає rápida. Rápidamente — прислівник, «швидко» при дії.',
          es: 'Rápido is written with á and the ending -o — masculine. Changing -o to -a gives rápida. Rápidamente is an adverb, "quickly" with an action.',
          'pt-BR': 'Rápido se escreve com á e terminação -o — masculino. Trocar -o por -a dá rápida. Rápidamente é advérbio, "rapidamente" com uma ação.',
          vi: 'Rápido viết với á và đuôi -o — giống đực. Đổi -o thành -a cho ra rápida. Rápidamente là trạng từ, "nhanh chóng" với hành động.',
          id: 'Rápido ditulis dengan á dan akhiran -o — maskulin. Mengubah -o menjadi -a menghasilkan rápida. Rápidamente adalah kata keterangan, "dengan cepat" dengan tindakan.',
          tr: 'Rápido á ile ve -o son ekiyle yazılır — eril. -o\'yu -a yapmak rápida\'yı verir. Rápidamente bir zarftır, bir eylemle "hızlıca".',
          pl: 'Rápido pisze się z á i końcówką -o — rodzaj męski. Zmiana -o na -a daje rápida. Rápidamente to przysłówek, „szybko” przy czynności.',
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
