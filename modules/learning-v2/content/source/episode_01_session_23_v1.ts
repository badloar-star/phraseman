/** Full B1 Session 23: spoken retrieval with married, single, different. */
import { EPISODE_01_SESSION_22_SOURCE } from './episode_01_session_22_v1';
import { LESSON1_SESSION_23_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const L = (ru: string, uk: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string) => ({ ru, uk, es, 'pt-BR': pt, vi, id, tr, pl });
const replace = <T>(value: T): T => {
  const pairs: readonly (readonly [string, string])[] = [['e01-s22', 'e01-s23'], ['rich', 'married'], ['Rich', 'Married'], ['poor', 'single'], ['Poor', 'Single'], ['famous', 'different'], ['Famous', 'Different']];
  const visit = (item: unknown): unknown => {
    if (typeof item === 'string') return pairs.reduce((text, [from, to]) => text.replaceAll(from, to), item);
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)]));
    return item;
  };
  return visit(value) as T;
};

const authored = replace(clone(EPISODE_01_SESSION_22_SOURCE)) as any;
authored.requiredSessionOrdinal = 23;
authored.generationInputFingerprint = 'full-b1-exact-spoken-retrieval-e01-s23-v1';
authored.modeNativePlanId = LESSON1_SESSION_23_MODE_NATIVE_PLAN_ID_V2;
authored.title = L('Скажи: you, we, they', 'Скажи: you, we, they', 'Di: you, we, they', 'Diga: you, we, they', 'Nói: you, we, they', 'Ucapkan: you, we, they', 'Söyle: you, we, they', 'Powiedz: you, we, they');
authored.summary = L('Произнеси знакомые фразы с married, single и different.', 'Промов знайомі фрази з married, single і different.', 'Di frases conocidas con married, single y different.', 'Diga frases conhecidas com married, single e different.', 'Nói các câu quen thuộc với married, single và different.', 'Ucapkan kalimat yang dikenal dengan married, single, dan different.', 'Married, single ve different ile bilinen cümleleri söyle.', 'Powiedz znane zdania z married, single i different.');
authored.learningGoal = L('Произнести короткую утвердительную фразу с you, we или they + are.', 'Промовити коротку ствердну фразу з you, we або they + are.', 'Decir una frase afirmativa corta con you, we o they + are.', 'Dizer uma frase afirmativa curta com you, we ou they + are.', 'Nói một câu khẳng định ngắn với you, we hoặc they + are.', 'Mengucapkan kalimat afirmatif pendek dengan you, we, atau they + are.', 'You, we ya da they + are ile kısa olumlu bir cümle söylemek.', 'Powiedzieć krótkie zdanie twierdzące z you, we albo they + are.');
const meanings = [L('женаты / замужем', 'одружені', 'casados', 'casados', 'đã kết hôn', 'menikah', 'evli', 'w małżeństwie'), L('не женаты / не замужем', 'неодружені', 'solteros', 'solteiros', 'độc thân', 'lajang', 'bekâr', 'samotni'), L('разные', 'різні', 'diferentes', 'diferentes', 'khác nhau', 'berbeda', 'farklı', 'różni')];
for (const [index, meaning] of meanings.entries()) authored.newVocabulary[index]!.meaning = meaning;
const canonical = ['They are married', 'They are single', 'They are different'];
for (const [index, page] of authored.introPages.entries()) {
  const example = canonical[index]!;
  for (const locale of Object.keys(page.body)) {
    const start = String(page.body[locale]).split('.').slice(0, 2).join('.').trim();
    page.body[locale] = `${start}. ${example}.`;
  }
  page.question.choices[0] = L(example, example, example, example, example, example, example, example);
  page.question.explanation = page.body;
  page.bodyRuns = Object.fromEntries(Object.entries(page.body).map(([locale, text]) => [locale, [{ text, semantic: 'explanation' }]]));
}
export const EPISODE_01_SESSION_23_SOURCE: SessionSource = Object.freeze(authored);
