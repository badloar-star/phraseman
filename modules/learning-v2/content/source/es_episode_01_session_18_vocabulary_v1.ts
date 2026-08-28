import type {
  LocalizedSource,
  SessionVocabularyContactSourceV1,
  SessionVocabularySourceV1,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 18 "Дорого или дёшево" / price_adjective, builtOn: [17],
// recalls: [3, 17]): единственное word-first слово — barato/barata,
// «дёшево/дешёвая». Caro/cara НЕ вводится здесь word-first — оно уже
// звучало как обычное слово фразы в сессии 1 (es-e01-s01-es-caro) и в
// сессии 17 (es-e01-s17-es-caro, с cara как дистрактором рода) — сессия 18
// его ПРИПОМИНАЕТ (recalls: [17]), противопоставляя новому barato. Recalls
// gender_agreement_full (3) — та же формула -o/-a, что и caro/cara,
// bonito/bonita, rápido/rápida.
const L = (value: LocalizedSource): LocalizedSource => value;

const contact = (
  guidance: LocalizedSource,
  distractors: SessionVocabularyContactSourceV1['distractors'],
): SessionVocabularyContactSourceV1 => ({ guidance, distractors });

export const ES_EPISODE_01_SESSION_18_VOCABULARY_V1:
  readonly SessionVocabularySourceV1[] = Object.freeze([
  {
    id: 'es-e01-s18-word-barato',
    target: 'barato',
    meaning: L({
      ru: 'дёшево — признак мужского рода или по умолчанию',
      uk: 'дешево — ознака чоловічого роду або за замовчуванням',
      es: 'cheap — the masculine or default form of the quality',
      'pt-BR': 'cheap — the masculine or default form of the quality',
      vi: 'cheap — the masculine or default form of the quality',
      id: 'cheap — the masculine or default form of the quality',
      tr: 'cheap — the masculine or default form of the quality',
      pl: 'cheap — the masculine or default form of the quality',
    }),
    features: ['quality_adjective', 'gender_agreement_full', 'price_adjective'],
    contacts: {
      recognize: contact(
        L({
          ru: 'Barato звучит с ударением на второй слог — ba-RA-to, три слога, длиннее на один слог, чем уже знакомое caro.',
          uk: 'Barato звучить з наголосом на другий склад — ba-RA-to, три склади, довше на один склад за вже знайоме caro.',
          es: 'Barato has three syllables with stress on the second — ba-RA-to — one syllable longer than the already familiar caro.',
          'pt-BR': 'Barato tem três sílabas com acento na segunda — ba-RA-to — uma sílaba mais longa que o já conhecido caro.',
          vi: 'Barato có ba âm tiết với trọng âm ở âm tiết thứ hai — ba-RA-to — dài hơn một âm tiết so với caro đã quen thuộc.',
          id: 'Barato memiliki tiga suku kata dengan tekanan pada suku kata kedua — ba-RA-to — satu suku kata lebih panjang dari caro yang sudah dikenal.',
          tr: 'Barato, ikinci hecede vurgulu üç heceye sahiptir — ba-RA-to — zaten tanıdık olan caro’dan bir hece daha uzundur.',
          pl: 'Barato ma trzy sylaby z akcentem na drugiej — ba-RA-to — o jedną sylabę dłuższe niż już znane caro.',
        }),
        [
          {
            value: 'caro',
            reasonCode: 'barato_recognize_caro_opposite_word',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Caro — противоположное по смыслу слово, короче на один слог и звучит совсем иначе. Barato звучит длиннее: ba-RA-to.',
              uk: 'Caro — протилежне за змістом слово, коротше на один склад і звучить зовсім інакше. Barato звучить довше: ba-RA-to.',
              es: 'Caro is the opposite word, one syllable shorter and sounds completely different. Barato sounds longer: ba-RA-to.',
              'pt-BR': 'Caro is the opposite word, one syllable shorter and sounds completely different. Barato sounds longer: ba-RA-to.',
              vi: 'Caro is the opposite word, one syllable shorter and sounds completely different. Barato sounds longer: ba-RA-to.',
              id: 'Caro is the opposite word, one syllable shorter and sounds completely different. Barato sounds longer: ba-RA-to.',
              tr: 'Caro is the opposite word, one syllable shorter and sounds completely different. Barato sounds longer: ba-RA-to.',
              pl: 'Caro is the opposite word, one syllable shorter and sounds completely different. Barato sounds longer: ba-RA-to.',
            }),
          },
          {
            value: 'barata',
            reasonCode: 'barato_recognize_barata_wrong_gender',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Barata заканчивается на -a, женский род. Слышится другой финальный звук — barato заканчивается на -o.',
              uk: 'Barata закінчується на -a, жіночий рід. Чути інший фінальний звук — barato закінчується на -o.',
              es: 'Barata ends in -a, feminine. A different final sound is heard — barato ends in -o.',
              'pt-BR': 'Barata ends in -a, feminine. A different final sound is heard — barato ends in -o.',
              vi: 'Barata ends in -a, feminine. A different final sound is heard — barato ends in -o.',
              id: 'Barata ends in -a, feminine. A different final sound is heard — barato ends in -o.',
              tr: 'Barata ends in -a, feminine. A different final sound is heard — barato ends in -o.',
              pl: 'Barata ends in -a, feminine. A different final sound is heard — barato ends in -o.',
            }),
          },
        ],
      ),
      retrieve_meaning: contact(
        L({
          ru: 'Barato описывает низкую цену вещи или услуги — прямую противоположность caro. Caro — про дорого, barato — про дёшево, оба про цену, но с разным знаком.',
          uk: 'Barato описує низьку ціну речі чи послуги — пряму протилежність caro. Caro — про дорого, barato — про дешево, обидва про ціну, але з різним знаком.',
          es: 'Barato describes a thing or service\'s low price — the direct opposite of caro. Caro is about expensive, barato is about cheap, both about price but with opposite signs.',
          'pt-BR': 'Barato describes a thing or service\'s low price — the direct opposite of caro. Caro is about expensive, barato is about cheap, both about price but with opposite signs.',
          vi: 'Barato describes a thing or service\'s low price — the direct opposite of caro. Caro is about expensive, barato is about cheap, both about price but with opposite signs.',
          id: 'Barato describes a thing or service\'s low price — the direct opposite of caro. Caro is about expensive, barato is about cheap, both about price but with opposite signs.',
          tr: 'Barato describes a thing or service\'s low price — the direct opposite of caro. Caro is about expensive, barato is about cheap, both about price but with opposite signs.',
          pl: 'Barato describes a thing or service\'s low price — the direct opposite of caro. Caro is about expensive, barato is about cheap, both about price but with opposite signs.',
        }),
        [
          {
            value: 'caro',
            reasonCode: 'barato_meaning_caro_opposite_quality',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Caro означает «дорого» — прямая противоположность. Нужно barato.',
              uk: 'Caro означає «дорого» — пряма протилежність. Потрібно barato.',
              es: 'Caro means "expensive" — the direct opposite. Barato is needed.',
              'pt-BR': 'Caro means "expensive" — the direct opposite. Barato is needed.',
              vi: 'Caro means "expensive" — the direct opposite. Barato is needed.',
              id: 'Caro means "expensive" — the direct opposite. Barato is needed.',
              tr: 'Caro means "expensive" — the direct opposite. Barato is needed.',
              pl: 'Caro means "expensive" — the direct opposite. Barato is needed.',
            }),
          },
          {
            value: 'fácil',
            reasonCode: 'barato_meaning_facil_wrong_quality',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Fácil означает «легко» — про сложность выполнения, а не про цену. Нужно barato.',
              uk: 'Fácil означає «легко» — про складність виконання, а не про ціну. Потрібно barato.',
              es: 'Fácil means "easy" — about difficulty, not price. Barato is needed.',
              'pt-BR': 'Fácil means "easy" — about difficulty, not price. Barato is needed.',
              vi: 'Fácil means "easy" — about difficulty, not price. Barato is needed.',
              id: 'Fácil means "easy" — about difficulty, not price. Barato is needed.',
              tr: 'Fácil means "easy" — about difficulty, not price. Barato is needed.',
              pl: 'Fácil means "easy" — about difficulty, not price. Barato is needed.',
            }),
          },
        ],
      ),
      build_form: contact(
        L({
          ru: 'Barato пишется шестью буквами: b-a-r-a-t-o, без тильды. Barata меняет последнюю букву на -a, женский род.',
          uk: 'Barato пишеться шістьма літерами: b-a-r-a-t-o, без тильди. Barata змінює останню літеру на -a, жіночий рід.',
          es: 'Barato is spelled with six letters: b-a-r-a-t-o, no tilde. Barata changes the last letter to -a, feminine.',
          'pt-BR': 'Barato is spelled with six letters: b-a-r-a-t-o, no tilde. Barata changes the last letter to -a, feminine.',
          vi: 'Barato is spelled with six letters: b-a-r-a-t-o, no tilde. Barata changes the last letter to -a, feminine.',
          id: 'Barato is spelled with six letters: b-a-r-a-t-o, no tilde. Barata changes the last letter to -a, feminine.',
          tr: 'Barato is spelled with six letters: b-a-r-a-t-o, no tilde. Barata changes the last letter to -a, feminine.',
          pl: 'Barato is spelled with six letters: b-a-r-a-t-o, no tilde. Barata changes the last letter to -a, feminine.',
        }),
        [
          {
            value: 'barata',
            reasonCode: 'barato_form_barata_wrong_gender',
            trapType: 'grammar',
            feedback: L({
              ru: 'Barata — форма женского рода, с -a. По умолчанию, без названного предмета, используется форма на -o: barato.',
              uk: 'Barata — форма жіночого роду, з -a. За замовчуванням, без названого предмета, використовується форма на -o: barato.',
              es: 'Barata is the feminine form, with -a. By default, with no named thing, the form with -o is used: barato.',
              'pt-BR': 'Barata is the feminine form, with -a. By default, with no named thing, the form with -o is used: barato.',
              vi: 'Barata is the feminine form, with -a. By default, with no named thing, the form with -o is used: barato.',
              id: 'Barata is the feminine form, with -a. By default, with no named thing, the form with -o is used: barato.',
              tr: 'Barata is the feminine form, with -a. By default, with no named thing, the form with -o is used: barato.',
              pl: 'Barata is the feminine form, with -a. By default, with no named thing, the form with -o is used: barato.',
            }),
          },
          {
            value: 'baratoo',
            reasonCode: 'barato_form_double_letter_typo',
            trapType: 'orthographic',
            feedback: L({
              ru: 'Проверьте написание внимательно: нужна ровно одна буква -o в конце, без удвоения — barato, а не baratoo.',
              uk: 'Перевірте написання уважно: потрібна рівно одна літера -o наприкінці, без подвоєння — barato, а не baratoo.',
              es: 'Check the spelling carefully: exactly one letter -o at the end is needed, no doubling — barato, not baratoo.',
              'pt-BR': 'Check the spelling carefully: exactly one letter -o at the end is needed, no doubling — barato, not baratoo.',
              vi: 'Check the spelling carefully: exactly one letter -o at the end is needed, no doubling — barato, not baratoo.',
              id: 'Check the spelling carefully: exactly one letter -o at the end is needed, no doubling — barato, not baratoo.',
              tr: 'Check the spelling carefully: exactly one letter -o at the end is needed, no doubling — barato, not baratoo.',
              pl: 'Check the spelling carefully: exactly one letter -o at the end is needed, no doubling — barato, not baratoo.',
            }),
          },
        ],
      ),
    },
  },
]);
