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
          // зачем переписано (владелец, 2026-08-27; Библия текстов, правила
          // 1-3): прошлый текст сравнивал no со словами nada и non, которых в
          // уроке нет и которые никто не путает. Это seductive detail (Mayer):
          // лишнее сравнение вредит новичку, а не помогает. Теперь — только
          // само слово, коротко и по-человечески.
          ru: 'Короткое «но» — и всё, отрицание готово. Один слог, гласный на конце: no.',
          uk: 'Коротке «но» — і все, заперечення готове. Один склад, голосний наприкінці: no.',
          es: 'A short "noh" and the negation is done. One syllable, a vowel at the end: no.',
          'pt-BR': 'Um "nô" curtinho e a negação está pronta. Uma sílaba, vogal no fim: no.',
          vi: 'Chỉ một tiếng "no" ngắn gọn là xong phủ định. Một âm tiết, kết thúc bằng nguyên âm.',
          id: 'Satu suku kata pendek "no" dan penyangkalan selesai. Berakhir dengan huruf vokal.',
          tr: 'Kısacık bir "no" ve olumsuzluk hazır. Tek hece, sonu sesli harf.',
          pl: 'Krótkie „no” i przeczenie gotowe. Jedna sylaba, na końcu samogłoska.',
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
          // зачем короче и без сравнений (Библия текстов, правила 1-2):
          // прошлый текст был длиннее 200 знаков и объяснял через nada —
          // слово, которого ученик в уроке не встречает.
          ru: 'No — это «не». Встаёт перед связкой и переворачивает смысл: No es fácil — «это не легко».',
          uk: 'No — це «не». Стає перед зв’язкою й перевертає сенс: No es fácil — «це не легко».',
          es: 'No means "not". It stands before the link and flips the meaning: No es fácil — "it is not easy".',
          'pt-BR': 'No quer dizer "não". Vem antes da ligação e vira o sentido: No es fácil — "não é fácil".',
          vi: 'No nghĩa là "không". Đứng trước từ nối và đảo ngược ý: No es fácil — "điều này không dễ".',
          id: 'No berarti "tidak". Berdiri sebelum penghubung dan membalik makna: No es fácil — "ini tidak mudah".',
          tr: 'No "değil" demektir. Bağlayıcıdan önce gelir ve anlamı çevirir: No es fácil — "bu kolay değil".',
          pl: 'No znaczy „nie”. Stoi przed łącznikiem i odwraca sens: No es fácil — „to nie jest łatwe”.',
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
          // зачем короче и без сравнений (Библия текстов, правила 1-2).
          ru: 'Две буквы, n и o. Форма всегда одна — no не меняется никогда.',
          uk: 'Дві літери, n і o. Форма завжди одна — no не змінюється ніколи.',
          es: 'Two letters, n and o. One single form — no never changes.',
          'pt-BR': 'Duas letras, n e o. Uma forma só — no nunca muda.',
          vi: 'Hai chữ cái, n và o. Chỉ một dạng duy nhất — no không bao giờ đổi.',
          id: 'Dua huruf, n dan o. Hanya satu bentuk — no tidak pernah berubah.',
          tr: 'İki harf, n ve o. Tek bir biçim — no asla değişmez.',
          pl: 'Dwie litery, n i o. Jedna forma — no nigdy się nie zmienia.',
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
