import { AUTHORED_EPISODE_01_SESSIONS } from '../modules/learning-v2/content/source/authored_sessions_v1';

const LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

const INTERNAL_TAXONOMY = Object.freeze({
  ru: /^(?:Сообщение|Вопрос)(?:;|\.)|(?:^|;)\s*(?:предмет|признак|говорящий|собеседник|владелец|место|возраст)\s*:/iu,
  uk: /^(?:Повідомлення|Питання)(?:;|\.)|(?:^|;)\s*(?:предмет|ознака|мовець|співрозмовник|власник|місце|вік)\s*:/iu,
  es: /^(?:Enunciado|Pregunta)(?:;|\.)|(?:^|;)\s*(?:objeto|rasgo|hablante|interlocutor|propietario|lugar|edad)\s*:/iu,
  'pt-BR': /^(?:Afirmação|Pergunta)(?:;|\.)|(?:^|;)\s*(?:objeto|característica|falante|ouvinte|dono|lugar|idade)\s*:/iu,
  vi: /^(?:Câu kể|Câu hỏi)(?:;|\.)|(?:^|;)\s*(?:đồ vật|đặc điểm|người nói|người nghe|chủ sở hữu|nơi chốn|tuổi)\s*:/iu,
  id: /^(?:Pernyataan|Pertanyaan)(?:;|\.)|(?:^|;)\s*(?:benda|sifat|penutur|lawan bicara|pemilik|tempat|usia)\s*:/iu,
  tr: /^(?:Bildirim|Soru)(?:;|\.)|(?:^|;)\s*(?:nesne|özellik|konuşan|dinleyen|sahip|yer|yaş)\s*:/iu,
  pl: /^(?:Komunikat|Pytanie)(?:;|\.)|(?:^|;)\s*(?:przedmiot|cecha|osoba mówiąca|rozmówca|właściciel|miejsce|wiek)\s*:/iu,
});

function skeleton(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[«“„][^»”]+[»”]/gu, '{quoted}')
    .replace(/\b(?:am|is|are|i|you|he|she|it|we|they|this|that|and|but|too)\b/giu, '{target}')
    .replace(/\s+/gu, ' ')
    .trim();
}

const findings: string[] = [];

for (const source of AUTHORED_EPISODE_01_SESSIONS) {
  for (const phrase of source.phrases) {
    for (const locale of LOCALES) {
      const details = phrase.localizedDetails?.[locale];
      if (!details) {
        findings.push(`missing_details:s${source.requiredSessionOrdinal}:${phrase.id}:${locale}`);
        continue;
      }
      if (INTERNAL_TAXONOMY[locale].test(details.meaning)) {
        findings.push(`internal_taxonomy:s${source.requiredSessionOrdinal}:${phrase.id}:${locale}`);
      }
      if ((details.meaning.match(/;/gu) ?? []).length >= 2) {
        findings.push(`tag_chain:s${source.requiredSessionOrdinal}:${phrase.id}:${locale}`);
      }
    }
  }
}

for (const locale of LOCALES) {
  const bySkeleton = new Map<string, string[]>();
  for (const source of AUTHORED_EPISODE_01_SESSIONS) {
    for (const phrase of source.phrases) {
      const value = phrase.localizedDetails?.[locale]?.explanation ?? '';
      const key = skeleton(value);
      const ids = bySkeleton.get(key) ?? [];
      ids.push(`s${source.requiredSessionOrdinal}:${phrase.id}`);
      bySkeleton.set(key, ids);
    }
  }
  for (const ids of bySkeleton.values()) {
    if (ids.length >= 4) {
      findings.push(`copied_explanation_skeleton:${locale}:${ids.slice(0, 5).join(',')}`);
    }
  }
}

if (findings.length > 0) {
  throw new Error(`LESSON 1 LEARNER COPY GATE: HOLD\n${findings.slice(0, 40).join('\n')}\nfindings=${findings.length}`);
}

process.stdout.write('LESSON 1 LEARNER COPY GATE: PASS\n');
