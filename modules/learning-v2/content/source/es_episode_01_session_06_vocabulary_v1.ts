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
      'pt-BR': 'unique, only one — masculine form of the quality',
      vi: 'unique, only one — masculine form of the quality',
      id: 'unique, only one — masculine form of the quality',
      tr: 'unique, only one — masculine form of the quality',
      pl: 'unique, only one — masculine form of the quality',
    }),
    features: ['quality_adjective', 'gender_agreement_full', 'written_accent'],
    contacts: {
      recognize: contact(
        L({
          ru: 'Único ударен на первом слоге — Ú-ni-co, с сильным ú. Без тильды над u слово звучало бы иначе — ударение упало бы на другой слог, как в обычных испанских словах без знака. Única заканчивается другим гласным — /a/, а не /o/. Unido звучит совсем иначе — с ударением на другом слоге и другим согласным в середине.',
          uk: 'Único наголошений на першому складі — Ú-ni-co, з сильним ú. Без тильди над u слово звучало б інакше — наголос упав би на інший склад, як у звичайних іспанських словах без знака. Única закінчується іншим голосним — /a/, а не /o/. Unido звучить зовсім інакше — з наголосом на іншому складі й іншим приголосним усередині.',
          es: 'Único is stressed on the first syllable — Ú-ni-co, with a strong ú. Without the tilde over u, the word would sound different — the stress would fall on a different syllable, as in ordinary Spanish words with no mark. Única ends in a different vowel — /a/, not /o/. Unido sounds completely different — stressed on a different syllable, with a different consonant in the middle.',
          'pt-BR': 'Único is stressed on the first syllable — Ú-ni-co, with a strong ú. Without the tilde over u, the word would sound different — the stress would fall on a different syllable, as in ordinary Spanish words with no mark. Única ends in a different vowel — /a/, not /o/. Unido sounds completely different — stressed on a different syllable, with a different consonant in the middle.',
          vi: 'Único is stressed on the first syllable — Ú-ni-co, with a strong ú. Without the tilde over u, the word would sound different — the stress would fall on a different syllable, as in ordinary Spanish words with no mark. Única ends in a different vowel — /a/, not /o/. Unido sounds completely different — stressed on a different syllable, with a different consonant in the middle.',
          id: 'Único is stressed on the first syllable — Ú-ni-co, with a strong ú. Without the tilde over u, the word would sound different — the stress would fall on a different syllable, as in ordinary Spanish words with no mark. Única ends in a different vowel — /a/, not /o/. Unido sounds completely different — stressed on a different syllable, with a different consonant in the middle.',
          tr: 'Único is stressed on the first syllable — Ú-ni-co, with a strong ú. Without the tilde over u, the word would sound different — the stress would fall on a different syllable, as in ordinary Spanish words with no mark. Única ends in a different vowel — /a/, not /o/. Unido sounds completely different — stressed on a different syllable, with a different consonant in the middle.',
          pl: 'Único is stressed on the first syllable — Ú-ni-co, with a strong ú. Without the tilde over u, the word would sound different — the stress would fall on a different syllable, as in ordinary Spanish words with no mark. Única ends in a different vowel — /a/, not /o/. Unido sounds completely different — stressed on a different syllable, with a different consonant in the middle.',
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
          ru: 'Único означает «единственный, уникальный» — признак того, что больше ничего подобного нет. Fácil значит совсем другое — «лёгкий», признак сложности. Rápido тоже другое — «быстрый», признак темпа, а не единственности.',
          uk: 'Único означає «єдиний, унікальний» — ознака того, що більше нічого подібного немає. Fácil означає зовсім інше — «легкий», ознака складності. Rápido теж інше — «швидкий», ознака темпу, а не єдиності.',
          es: 'Único means "unique, only one" — a quality of nothing else being like it. Fácil means something completely different — "easy", a quality of difficulty. Rápido is also different — "fast", a quality of pace, not uniqueness.',
          'pt-BR': 'Único means "unique, only one" — a quality of nothing else being like it. Fácil means something completely different — "easy", a quality of difficulty. Rápido is also different — "fast", a quality of pace, not uniqueness.',
          vi: 'Único means "unique, only one" — a quality of nothing else being like it. Fácil means something completely different — "easy", a quality of difficulty. Rápido is also different — "fast", a quality of pace, not uniqueness.',
          id: 'Único means "unique, only one" — a quality of nothing else being like it. Fácil means something completely different — "easy", a quality of difficulty. Rápido is also different — "fast", a quality of pace, not uniqueness.',
          tr: 'Único means "unique, only one" — a quality of nothing else being like it. Fácil means something completely different — "easy", a quality of difficulty. Rápido is also different — "fast", a quality of pace, not uniqueness.',
          pl: 'Único means "unique, only one" — a quality of nothing else being like it. Fácil means something completely different — "easy", a quality of difficulty. Rápido is also different — "fast", a quality of pace, not uniqueness.',
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
          ru: 'Único пишется с тильдой над первым u: ú-n-i-c-o — без неё слово читалось бы с ударением на другом слоге. Смена концовки -o на -a даёт única, форму женского рода, а тильда над ú остаётся на месте в обеих формах. Unido пишет другую букву в середине — d вместо c — и вообще не связано по значению.',
          uk: 'Único пишеться з тильдою над першим u: ú-n-i-c-o — без неї слово читалося б з наголосом на іншому складі. Зміна закінчення -o на -a дає única, форму жіночого роду, а тильда над ú лишається на місці в обох формах. Unido пише іншу літеру всередині — d замість c — і взагалі не пов’язане за значенням.',
          es: 'Único is written with a tilde over the first u: ú-n-i-c-o — without it, the word would be read with the stress on a different syllable. Changing the ending -o to -a gives única, the feminine form, and the tilde over ú stays in place in both forms. Unido has a different letter in the middle — d instead of c — and is unrelated in meaning.',
          'pt-BR': 'Único is written with a tilde over the first u: ú-n-i-c-o — without it, the word would be read with the stress on a different syllable. Changing the ending -o to -a gives única, the feminine form, and the tilde over ú stays in place in both forms. Unido has a different letter in the middle — d instead of c — and is unrelated in meaning.',
          vi: 'Único is written with a tilde over the first u: ú-n-i-c-o — without it, the word would be read with the stress on a different syllable. Changing the ending -o to -a gives única, the feminine form, and the tilde over ú stays in place in both forms. Unido has a different letter in the middle — d instead of c — and is unrelated in meaning.',
          id: 'Único is written with a tilde over the first u: ú-n-i-c-o — without it, the word would be read with the stress on a different syllable. Changing the ending -o to -a gives única, the feminine form, and the tilde over ú stays in place in both forms. Unido has a different letter in the middle — d instead of c — and is unrelated in meaning.',
          tr: 'Único is written with a tilde over the first u: ú-n-i-c-o — without it, the word would be read with the stress on a different syllable. Changing the ending -o to -a gives única, the feminine form, and the tilde over ú stays in place in both forms. Unido has a different letter in the middle — d instead of c — and is unrelated in meaning.',
          pl: 'Único is written with a tilde over the first u: ú-n-i-c-o — without it, the word would be read with the stress on a different syllable. Changing the ending -o to -a gives única, the feminine form, and the tilde over ú stays in place in both forms. Unido has a different letter in the middle — d instead of c — and is unrelated in meaning.',
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
