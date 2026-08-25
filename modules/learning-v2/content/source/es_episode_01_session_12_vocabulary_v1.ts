import type {
  LocalizedSource,
  SessionVocabularyContactSourceV1,
  SessionVocabularySourceV1,
} from './session_shard_from_source_v1';

// зачем этот файл (владелец, 2026-08-25, карта сессий es_episode_01_session_map_v1.ts,
// сессия 12 "Спрашиваю женщину" / confidence_adjective, builtOn: [3, 10],
// recalls: [3, 10]): единственная words_then_phrases-сессия карты с пустым
// teaches была аномалией (проверено research-агентом по всей карте 1-56 —
// все прочие words_then_phrases сессии несут ровно одно новое слово).
// segura/seguro — «уверенная/уверенный», нигде раньше не использовано,
// не пересекается с будущим safety_adjective (сессия 44, там seguro в
// значении «безопасно»). Recalls gender_agreement_full (3) — та же формула
// -o/-a, что и bonito/bonita; recalls question_marks (10) — фразы
// применения задают вопрос о собеседнице.
const L = (value: LocalizedSource): LocalizedSource => value;

const contact = (
  guidance: LocalizedSource,
  distractors: SessionVocabularyContactSourceV1['distractors'],
): SessionVocabularyContactSourceV1 => ({ guidance, distractors });

export const ES_EPISODE_01_SESSION_12_VOCABULARY_V1:
  readonly SessionVocabularySourceV1[] = Object.freeze([
  {
    id: 'es-e01-s12-word-segura',
    target: 'segura',
    meaning: L({
      ru: 'уверенная — признак женского рода',
      uk: 'впевнена — ознака жіночого роду',
      es: 'confident — the feminine form of the quality',
      'pt-BR': 'confident — the feminine form of the quality',
      vi: 'confident — the feminine form of the quality',
      id: 'confident — the feminine form of the quality',
      tr: 'confident — the feminine form of the quality',
      pl: 'confident — the feminine form of the quality',
    }),
    features: ['quality_adjective', 'gender_agreement_full', 'confidence_adjective'],
    contacts: {
      recognize: contact(
        L({
          ru: 'Segura звучит с ударением на второй слог — se-GU-ra, три слога. Она короче, чем rápida, но длиннее, чем bonita по числу гласных перед последней.',
          uk: 'Segura звучить з наголосом на другий склад — se-GU-ra, три склади. Вона коротша за rápida, але довша за bonita за кількістю голосних перед останньою.',
          es: 'Segura has three syllables with stress on the second — se-GU-ra. It is shorter than rápida but longer than bonita in vowels before the last one.',
          'pt-BR': 'Segura has three syllables with stress on the second — se-GU-ra. It is shorter than rápida but longer than bonita in vowels before the last one.',
          vi: 'Segura has three syllables with stress on the second — se-GU-ra. It is shorter than rápida but longer than bonita in vowels before the last one.',
          id: 'Segura has three syllables with stress on the second — se-GU-ra. It is shorter than rápida but longer than bonita in vowels before the last one.',
          tr: 'Segura has three syllables with stress on the second — se-GU-ra. It is shorter than rápida but longer than bonita in vowels before the last one.',
          pl: 'Segura has three syllables with stress on the second — se-GU-ra. It is shorter than rápida but longer than bonita in vowels before the last one.',
        }),
        [
          {
            value: 'rápida',
            reasonCode: 'segura_recognize_rapida_different_word',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Rápida — совсем другое слово, с ударением на первый слог. Segura звучит иначе, ударение на втором слоге.',
              uk: 'Rápida — зовсім інше слово, з наголосом на перший склад. Segura звучить інакше, наголос на другому складі.',
              es: 'Rápida is a completely different word, stressed on the first syllable. Segura sounds different, stress on the second syllable.',
              'pt-BR': 'Rápida is a completely different word, stressed on the first syllable. Segura sounds different, stress on the second syllable.',
              vi: 'Rápida is a completely different word, stressed on the first syllable. Segura sounds different, stress on the second syllable.',
              id: 'Rápida is a completely different word, stressed on the first syllable. Segura sounds different, stress on the second syllable.',
              tr: 'Rápida is a completely different word, stressed on the first syllable. Segura sounds different, stress on the second syllable.',
              pl: 'Rápida is a completely different word, stressed on the first syllable. Segura sounds different, stress on the second syllable.',
            }),
          },
          {
            value: 'seguro',
            reasonCode: 'segura_recognize_seguro_wrong_gender',
            trapType: 'phonetic',
            feedback: L({
              ru: 'Seguro заканчивается на -o, мужской род. Слышится другой финальный звук — segura заканчивается на -a.',
              uk: 'Seguro закінчується на -o, чоловічий рід. Чути інший фінальний звук — segura закінчується на -a.',
              es: 'Seguro ends in -o, masculine. A different final sound is heard — segura ends in -a.',
              'pt-BR': 'Seguro ends in -o, masculine. A different final sound is heard — segura ends in -a.',
              vi: 'Seguro ends in -o, masculine. A different final sound is heard — segura ends in -a.',
              id: 'Seguro ends in -o, masculine. A different final sound is heard — segura ends in -a.',
              tr: 'Seguro ends in -o, masculine. A different final sound is heard — segura ends in -a.',
              pl: 'Seguro ends in -o, masculine. A different final sound is heard — segura ends in -a.',
            }),
          },
        ],
      ),
      retrieve_meaning: contact(
        L({
          ru: 'Segura описывает уверенность человека — качество характера, а не внешность и не темп. Rápida — про скорость, bonita — про внешность, segura — про уверенность в себе.',
          uk: 'Segura описує впевненість людини — якість характеру, а не зовнішність і не темп. Rápida — про швидкість, bonita — про зовнішність, segura — про впевненість у собі.',
          es: 'Segura describes a person\'s confidence — a character quality, not looks or pace. Rápida is about speed, bonita is about looks, segura is about self-confidence.',
          'pt-BR': 'Segura describes a person\'s confidence — a character quality, not looks or pace. Rápida is about speed, bonita is about looks, segura is about self-confidence.',
          vi: 'Segura describes a person\'s confidence — a character quality, not looks or pace. Rápida is about speed, bonita is about looks, segura is about self-confidence.',
          id: 'Segura describes a person\'s confidence — a character quality, not looks or pace. Rápida is about speed, bonita is about looks, segura is about self-confidence.',
          tr: 'Segura describes a person\'s confidence — a character quality, not looks or pace. Rápida is about speed, bonita is about looks, segura is about self-confidence.',
          pl: 'Segura describes a person\'s confidence — a character quality, not looks or pace. Rápida is about speed, bonita is about looks, segura is about self-confidence.',
        }),
        [
          {
            value: 'rápida',
            reasonCode: 'segura_meaning_rapida_wrong_quality',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Rápida означает «быстрая» — про темп, а не про уверенность. Нужно segura.',
              uk: 'Rápida означає «швидка» — про темп, а не про впевненість. Потрібно segura.',
              es: 'Rápida means "fast" — about pace, not confidence. Segura is needed.',
              'pt-BR': 'Rápida means "fast" — about pace, not confidence. Segura is needed.',
              vi: 'Rápida means "fast" — about pace, not confidence. Segura is needed.',
              id: 'Rápida means "fast" — about pace, not confidence. Segura is needed.',
              tr: 'Rápida means "fast" — about pace, not confidence. Segura is needed.',
              pl: 'Rápida means "fast" — about pace, not confidence. Segura is needed.',
            }),
          },
          {
            value: 'bonita',
            reasonCode: 'segura_meaning_bonita_wrong_quality',
            trapType: 'semantic_neighbor',
            feedback: L({
              ru: 'Bonita означает «красивая» — про внешность, а не про уверенность. Нужно segura.',
              uk: 'Bonita означає «красива» — про зовнішність, а не про впевненість. Потрібно segura.',
              es: 'Bonita means "pretty" — about looks, not confidence. Segura is needed.',
              'pt-BR': 'Bonita means "pretty" — about looks, not confidence. Segura is needed.',
              vi: 'Bonita means "pretty" — about looks, not confidence. Segura is needed.',
              id: 'Bonita means "pretty" — about looks, not confidence. Segura is needed.',
              tr: 'Bonita means "pretty" — about looks, not confidence. Segura is needed.',
              pl: 'Bonita means "pretty" — about looks, not confidence. Segura is needed.',
            }),
          },
        ],
      ),
      build_form: contact(
        L({
          ru: 'Segura пишется семью буквами: s-e-g-u-r-a, без тильды. Seguro меняет последнюю букву на -o, мужской род.',
          uk: 'Segura пишеться сімома літерами: s-e-g-u-r-a, без тильди. Seguro змінює останню літеру на -o, чоловічий рід.',
          es: 'Segura is spelled with seven letters: s-e-g-u-r-a, no tilde. Seguro changes the last letter to -o, masculine.',
          'pt-BR': 'Segura is spelled with seven letters: s-e-g-u-r-a, no tilde. Seguro changes the last letter to -o, masculine.',
          vi: 'Segura is spelled with seven letters: s-e-g-u-r-a, no tilde. Seguro changes the last letter to -o, masculine.',
          id: 'Segura is spelled with seven letters: s-e-g-u-r-a, no tilde. Seguro changes the last letter to -o, masculine.',
          tr: 'Segura is spelled with seven letters: s-e-g-u-r-a, no tilde. Seguro changes the last letter to -o, masculine.',
          pl: 'Segura is spelled with seven letters: s-e-g-u-r-a, no tilde. Seguro changes the last letter to -o, masculine.',
        }),
        [
          {
            value: 'seguro',
            reasonCode: 'segura_form_seguro_wrong_gender',
            trapType: 'grammar',
            feedback: L({
              ru: 'Seguro — форма мужского рода, с -o. Про женщину нужна форма segura, с -a.',
              uk: 'Seguro — форма чоловічого роду, з -o. Про жінку потрібна форма segura, з -a.',
              es: 'Seguro is the masculine form, with -o. For a woman, the form segura, with -a, is needed.',
              'pt-BR': 'Seguro is the masculine form, with -o. For a woman, the form segura, with -a, is needed.',
              vi: 'Seguro is the masculine form, with -o. For a woman, the form segura, with -a, is needed.',
              id: 'Seguro is the masculine form, with -o. For a woman, the form segura, with -a, is needed.',
              tr: 'Seguro is the masculine form, with -o. For a woman, the form segura, with -a, is needed.',
              pl: 'Seguro is the masculine form, with -o. For a woman, the form segura, with -a, is needed.',
            }),
          },
          {
            value: 'seguraa',
            reasonCode: 'segura_form_double_letter_typo',
            trapType: 'orthographic',
            feedback: L({
              ru: 'Проверьте написание внимательно: нужна ровно одна буква -a в конце, без удвоения — segura, а не seguraa.',
              uk: 'Перевірте написання уважно: потрібна рівно одна літера -a наприкінці, без подвоєння — segura, а не seguraa.',
              es: 'Check the spelling carefully: exactly one letter -a at the end is needed, no doubling — segura, not seguraa.',
              'pt-BR': 'Check the spelling carefully: exactly one letter -a at the end is needed, no doubling — segura, not seguraa.',
              vi: 'Check the spelling carefully: exactly one letter -a at the end is needed, no doubling — segura, not seguraa.',
              id: 'Check the spelling carefully: exactly one letter -a at the end is needed, no doubling — segura, not seguraa.',
              tr: 'Check the spelling carefully: exactly one letter -a at the end is needed, no doubling — segura, not seguraa.',
              pl: 'Check the spelling carefully: exactly one letter -a at the end is needed, no doubling — segura, not seguraa.',
            }),
          },
        ],
      ),
    },
  },
]);
