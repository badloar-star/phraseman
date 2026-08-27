import type {
  LocalizedSource,
  SessionVocabularyContactSourceV1,
  SessionVocabularySourceV1,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-24, карта сессий es_episode_01_session_map_v1.ts,
// сессия 6 "Ударение слышно" / written_accent, builtOn: [1, 5], recalls: [1, 5]):
// único — новое слово с явной родовой парой -o/-a (как bonito/rápido/verdadero
// из сессий 3-5), но с фокусом на письменном ударении: единственное слово
// курса, где тильда над ú меняет само звучание слова, а не просто отмечает
// естественное ударение. Recalls fácil (1) и rápido (5) — оба слова с
// ударением на á первого слога, тот же ритмический рисунок, что у único.
//
// зачем guidance короче, чем в первой (отклонённой) версии этого файла
// (владелец, 2026-08-27, тот же класс правки, что и в сессиях 4/5,
// learning_content_quality_gate_v1.ts MAX_GUIDANCE_CHARS=200): исходная
// формулировка была написана на 400+ знаков на локаль. Переписано под
// потолок 200 без потери фонетических/семантических/орфографических ловушек.
const L = (value: LocalizedSource): LocalizedSource => value;

const contact = (
  guidance: LocalizedSource,
  distractors: SessionVocabularyContactSourceV1['distractors'],
): SessionVocabularyContactSourceV1 => ({ guidance, distractors });

export const ES_EPISODE_01_SESSION_06_VOCABULARY_V1:
  readonly SessionVocabularySourceV1[] = Object.freeze([
  {
    id: 'es-e01-s06-word-unico',
    target: 'único',
    meaning: L({
      ru: 'единственный, уникальный — мужской род признака',
      uk: 'єдиний, унікальний — чоловічий рід ознаки',
      es: 'unique, only one — masculine form of the quality',
      'pt-BR': 'único — forma masculina da qualidade',
      vi: 'duy nhất, độc nhất — dạng giống đực của đặc điểm',
      id: 'unik, satu-satunya — bentuk maskulin dari sifat',
      tr: 'eşsiz, tek — niteliğin eril biçimi',
      pl: 'jedyny, unikalny — męska forma cechy',
    }),
    features: ['quality_adjective', 'gender_agreement_full', 'written_accent'],
    contacts: {
      recognize: contact(
        L({
          ru: 'Único ударен на первом слоге — Ú-ni-co, с сильным ú. Única заканчивается на /a/. Unido звучит совсем иначе — другой согласный.',
          uk: 'Único наголошений на першому складі — Ú-ni-co, з сильним ú. Única закінчується на /a/. Unido звучить зовсім інакше — інший приголосний.',
          es: 'Único is stressed on the first syllable — Ú-ni-co, with a strong ú. Única ends in /a/. Unido sounds completely different — a different consonant.',
          'pt-BR': 'Único é acentuado na primeira sílaba — Ú-ni-co, com um ú forte. Única termina em /a/. Unido soa completamente diferente — outra consoante.',
          vi: 'Único có trọng âm ở âm tiết đầu — Ú-ni-co, với ú mạnh. Única kết thúc bằng /a/. Unido nghe hoàn toàn khác — phụ âm khác.',
          id: 'Único bertekanan di suku kata pertama — Ú-ni-co, dengan ú yang kuat. Única berakhir dengan /a/. Unido terdengar sama sekali berbeda — konsonan berbeda.',
          tr: 'Único ilk hecede vurguludur — Ú-ni-co, güçlü bir ú ile. Única /a/ ile biter. Unido tamamen farklı seslenir — farklı bir ünsüz.',
          pl: 'Único ma akcent na pierwszej sylabie — Ú-ni-co, z mocnym ú. Única kończy się na /a/. Unido brzmi zupełnie inaczej — inna spółgłoska.',
        }),
        [
          {
            value: 'única',
            reasonCode: 'unico_recognize_unica_final_vowel',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Única заканчивается гласным /a/; в único на этом месте звучит /o/.',
              uk: 'Única закінчується голосним /a/; у único на цьому місці звучить /o/.',
              es: 'Única ends in the vowel /a/; único has /o/ in that same spot.',
              'pt-BR': 'Única ends in the vowel /a/; único has /o/ in that same spot.',
              vi: 'Única ends in the vowel /a/; único has /o/ in that same spot.',
              id: 'Única ends in the vowel /a/; único has /o/ in that same spot.',
              tr: 'Única ends in the vowel /a/; único has /o/ in that same spot.',
              pl: 'Única ends in the vowel /a/; único has /o/ in that same spot.',
            }),
          },
          {
            value: 'unido',
            reasonCode: 'unico_recognize_unido_different_stress',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Unido — другое слово, ударенное на другом слоге и с другим согласным в середине. Нужное слово — único, с ударением на первом слоге.',
              uk: 'Unido — інше слово, наголошене на іншому складі й з іншим приголосним усередині. Потрібне слово — único, з наголосом на першому складі.',
              es: 'Unido is a different word, stressed on a different syllable and with a different consonant in the middle. The word here is único, stressed on the first syllable.',
              'pt-BR': 'Unido é uma palavra diferente, acentuada em outra sílaba e com uma consoante diferente no meio. A palavra aqui é único, acentuada na primeira sílaba.',
              vi: 'Unido là một từ khác, được nhấn ở âm tiết khác và có phụ âm khác ở giữa. Từ cần dùng là único, nhấn ở âm tiết đầu tiên.',
              id: 'Unido adalah kata yang berbeda, ditekankan pada suku kata berbeda dan dengan konsonan berbeda di tengah. Kata yang dibutuhkan adalah único, ditekankan pada suku kata pertama.',
              tr: 'Unido farklı bir kelimedir, farklı bir hecede vurgulanır ve ortasında farklı bir ünsüz vardır. Buradaki kelime, ilk hecede vurgulanan único’dur.',
              pl: 'Unido to inne słowo, akcentowane na innej sylabie i z inną spółgłoską w środku. Potrzebne słowo to único, akcentowane na pierwszej sylabie.',
            }),
          },
        ],
      ),
      retrieve_meaning: contact(
        L({
          ru: 'Único означает «единственный». Fácil значит «лёгкий», признак сложности. Rápido — «быстрый», признак темпа, не единственности.',
          uk: 'Único означає «єдиний». Fácil означає «легкий», ознака складності. Rápido — «швидкий», ознака темпу, не єдиності.',
          es: 'Único means "unique". Fácil means "easy", a quality of difficulty. Rápido means "fast", a quality of pace, not uniqueness.',
          'pt-BR': 'Único significa "único". Fácil significa "fácil", uma qualidade de dificuldade. Rápido significa "rápido", uma qualidade de ritmo, não de singularidade.',
          vi: 'Único nghĩa là "duy nhất". Fácil nghĩa là "dễ", đặc điểm về độ khó. Rápido nghĩa là "nhanh", đặc điểm về tốc độ, không phải duy nhất.',
          id: 'Único berarti "unik". Fácil berarti "mudah", sifat kesulitan. Rápido berarti "cepat", sifat kecepatan, bukan keunikan.',
          tr: 'Único "eşsiz" demektir. Fácil "kolay" demektir, zorluk niteliği. Rápido "hızlı" demektir, tempo niteliği, eşsizlik değil.',
          pl: 'Único znaczy „jedyny”. Fácil znaczy „łatwy”, cecha trudności. Rápido znaczy „szybki”, cecha tempa, nie wyjątkowości.',
        }),
        [
          {
            value: 'fácil',
            reasonCode: 'unico_meaning_facil_unrelated',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Fácil означает «лёгкий» — признак сложности, не единственности. «Единственный» — это único.',
              uk: 'Fácil означає «легкий» — ознака складності, не єдиності. «Єдиний» — це único.',
              es: 'Fácil means "easy" — a quality of difficulty, not uniqueness. "Unique" is único.',
              'pt-BR': 'Fácil means "easy" — a quality of difficulty, not uniqueness. "Unique" is único.',
              vi: 'Fácil means "easy" — a quality of difficulty, not uniqueness. "Unique" is único.',
              id: 'Fácil means "easy" — a quality of difficulty, not uniqueness. "Unique" is único.',
              tr: 'Fácil means "easy" — a quality of difficulty, not uniqueness. "Unique" is único.',
              pl: 'Fácil means "easy" — a quality of difficulty, not uniqueness. "Unique" is único.',
            }),
          },
          {
            value: 'rápido',
            reasonCode: 'unico_meaning_rapido_unrelated',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Rápido означает «быстрый» — признак темпа, не единственности. «Единственный» — это único.',
              uk: 'Rápido означає «швидкий» — ознака темпу, не єдиності. «Єдиний» — це único.',
              es: 'Rápido means "fast" — a quality of pace, not uniqueness. "Unique" is único.',
              'pt-BR': 'Rápido means "fast" — a quality of pace, not uniqueness. "Unique" is único.',
              vi: 'Rápido means "fast" — a quality of pace, not uniqueness. "Unique" is único.',
              id: 'Rápido means "fast" — a quality of pace, not uniqueness. "Unique" is único.',
              tr: 'Rápido means "fast" — a quality of pace, not uniqueness. "Unique" is único.',
              pl: 'Rápido means "fast" — a quality of pace, not uniqueness. "Unique" is único.',
            }),
          },
        ],
      ),
      build_form: contact(
        L({
          ru: 'Único пишется с тильдой на первом u: ú-n-i-c-o. Смена -o на -a даёт única, тильда остаётся. Unido пишет d вместо c — другое слово.',
          uk: 'Único пишеться з тильдою на першому u: ú-n-i-c-o. Заміна -o на -a дає única, тильда лишається. Unido пише d замість c — інше слово.',
          es: 'Único is written with a tilde on the first u: ú-n-i-c-o. Changing -o to -a gives única, the tilde stays. Unido writes d instead of c — a different word.',
          'pt-BR': 'Único se escreve com til no primeiro u: ú-n-i-c-o. Trocar -o por -a dá única, o til permanece. Unido escreve d em vez de c — outra palavra.',
          vi: 'Único viết với dấu ngã trên chữ u đầu tiên: ú-n-i-c-o. Đổi -o thành -a cho ra única, dấu ngã vẫn còn. Unido viết d thay vì c — từ khác.',
          id: 'Único ditulis dengan tilde di huruf u pertama: ú-n-i-c-o. Mengubah -o menjadi -a menghasilkan única, tilde tetap ada. Unido menulis d bukan c — kata lain.',
          tr: 'Único ilk u üzerinde tilde ile yazılır: ú-n-i-c-o. -o\'yu -a yapmak única\'yı verir, tilde kalır. Unido c yerine d yazar — başka kelime.',
          pl: 'Único pisze się z tyldą na pierwszym u: ú-n-i-c-o. Zmiana -o na -a daje única, tylda zostaje. Unido pisze d zamiast c — inne słowo.',
        }),
        [
          {
            value: 'única',
            reasonCode: 'unico_form_unica_wrong_gender',
            trapType: 'grammar',
            feedback: L({
              ru: 'Única — форма женского рода, с концовкой -a. Про предмет мужского рода нужна форма único, с -o.',
              uk: 'Única — форма жіночого роду, з закінченням -a. Про предмет чоловічого роду потрібна форма único, з -o.',
              es: 'Única is the feminine form, ending in -a. For a masculine noun, the form is único, ending in -o.',
              'pt-BR': 'Única is the feminine form, ending in -a. For a masculine noun, the form is único, ending in -o.',
              vi: 'Única is the feminine form, ending in -a. For a masculine noun, the form is único, ending in -o.',
              id: 'Única is the feminine form, ending in -a. For a masculine noun, the form is único, ending in -o.',
              tr: 'Única is the feminine form, ending in -a. For a masculine noun, the form is único, ending in -o.',
              pl: 'Única is the feminine form, ending in -a. For a masculine noun, the form is único, ending in -o.',
            }),
          },
          {
            value: 'unico',
            reasonCode: 'unico_form_unico_missing_tilde',
            trapType: 'orthographic',
            feedback: L({
              ru: 'Unico без тильды читалось бы с ударением на другом слоге — u-ni-CO вместо Ú-ni-co. Тильда обязательна: único, не unico.',
              uk: 'Unico без тильди читалося б з наголосом на іншому складі — u-ni-CO замість Ú-ni-co. Тильда обов’язкова: único, не unico.',
              es: 'Unico without the tilde would be read with the stress on a different syllable — u-ni-CO instead of Ú-ni-co. The tilde is required: único, not unico.',
              'pt-BR': 'Unico sem til seria lido com o acento em outra sílaba — u-ni-CO em vez de Ú-ni-co. O til é obrigatório: único, não unico.',
              vi: 'Unico không có dấu ngã sẽ được đọc với trọng âm ở âm tiết khác — u-ni-CO thay vì Ú-ni-co. Dấu ngã là bắt buộc: único, không phải unico.',
              id: 'Unico tanpa tilde akan dibaca dengan tekanan pada suku kata berbeda — u-ni-CO alih-alih Ú-ni-co. Tilde wajib: único, bukan unico.',
              tr: 'Tildesiz unico farklı bir hecede vurguyla okunurdu — Ú-ni-co yerine u-ni-CO. Tilde zorunludur: único, unico değil.',
              pl: 'Unico bez tyldy czytałoby się z akcentem na innej sylabie — u-ni-CO zamiast Ú-ni-co. Tylda jest obowiązkowa: único, nie unico.',
            }),
          },
        ],
      ),
    },
  },
]);
