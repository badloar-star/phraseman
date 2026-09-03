import type { LocalizedSource, SessionVocabularyContactSourceV1, SessionVocabularySourceV1 } from './session_shard_from_source_v1';
import { EPISODE_01_SESSION_03_FULL_B1_CONTENT_V2 } from './episode_01_session_03_content_v2';

const guidance = (target: string, meaning: LocalizedSource): LocalizedSource => ({
  ru: `${target} — «${meaning.ru}». Выберите точное слово.`, uk: `${target} — «${meaning.uk}». Оберіть точне слово.`,
  es: `${target} significa «${meaning.es}». Elige la palabra exacta.`, 'pt-BR': `${target} significa «${meaning['pt-BR']}». Escolha a palavra exata.`,
  vi: `${target} nghĩa là “${meaning.vi}”. Chọn đúng từ.`, id: `${target} berarti “${meaning.id}”. Pilih kata yang tepat.`,
  tr: `${target} “${meaning.tr}” demektir. Tam sözcüğü seçin.`, pl: `${target} znaczy „${meaning.pl}”. Wybierz dokładne słowo.`,
});
const contact = (copy: LocalizedSource, distractors: SessionVocabularyContactSourceV1['distractors']): SessionVocabularyContactSourceV1 => ({ guidance: copy, distractors });

export const EPISODE_01_SESSION_03_VOCABULARY_V1: readonly SessionVocabularySourceV1[] = Object.freeze(
  EPISODE_01_SESSION_03_FULL_B1_CONTENT_V2.vocabulary.map((word) => {
    const distractors = word.distractors.map((entry) => ({ value: entry.value, reasonCode: `${word.target}:${entry.value}`, trapType: 'phonetic' as const, feedback: entry.feedback }));
    const copy = guidance(word.target, word.meaning);
    return { id: word.id, target: word.target, features: ['state_adjective'], meaning: word.meaning, contacts: { recognize: contact(copy, distractors), retrieve_meaning: contact(copy, distractors), build_form: contact(copy, distractors) } };
  }),
);
