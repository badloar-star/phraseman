/** Full B1 Session 31: spoken production with equal, similar, separate. */
import { EPISODE_01_SESSION_23_SOURCE } from './episode_01_session_23_v1';
import { LESSON1_SESSION_31_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const L = (ru: string, uk: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string) => ({ ru, uk, es, 'pt-BR': pt, vi, id, tr, pl });
const replace = <T>(value: T): T => { const pairs: readonly (readonly [string, string])[] = [['e01-s23', 'e01-s31'], ['married', 'equal'], ['Married', 'Equal'], ['single', 'similar'], ['Single', 'Similar'], ['different', 'separate'], ['Different', 'Separate']]; const visit = (item: unknown): unknown => typeof item === 'string' ? pairs.reduce((text, [from, to]) => text.replaceAll(from, to), item) : Array.isArray(item) ? item.map(visit) : item && typeof item === 'object' ? Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)])) : item; return visit(value) as T; };
const authored = replace(clone(EPISODE_01_SESSION_23_SOURCE)) as any;
authored.requiredSessionOrdinal = 31;
authored.generationInputFingerprint = 'full-b1-exact-spoken-production-e01-s31-v1';
authored.modeNativePlanId = LESSON1_SESSION_31_MODE_NATIVE_PLAN_ID_V2;
authored.reviewConstructIds = ['full_form_choice'];
authored.title = L('Say: equal, similar, separate', 'Скажи: equal, similar, separate', 'Di: equal, similar, separate', 'Diga: equal, similar, separate', 'Nói: equal, similar, separate', 'Ucapkan: equal, similar, separate', 'Söyle: equal, similar, separate', 'Powiedz: equal, similar, separate');
authored.summary = L('Произнеси короткие знакомые фразы с equal, similar и separate.', 'Промов короткі знайомі фрази з equal, similar і separate.', 'Di frases cortas conocidas con equal, similar y separate.', 'Diga frases curtas conhecidas com equal, similar e separate.', 'Nói các câu ngắn quen thuộc với equal, similar và separate.', 'Ucapkan kalimat pendek yang dikenal dengan equal, similar, dan separate.', 'Equal, similar ve separate ile kısa bilinen cümleleri söyle.', 'Powiedz krótkie znane zdania z equal, similar i separate.');
authored.learningGoal = L('Произнести короткую утвердительную фразу с we или they + are.', 'Промовити коротку ствердну фразу з we або they + are.', 'Decir una frase afirmativa corta con we o they + are.', 'Dizer uma frase afirmativa curta com we ou they + are.', 'Nói một câu khẳng định ngắn với we hoặc they + are.', 'Mengucapkan kalimat afirmatif pendek dengan we atau they + are.', 'We ya da they + are ile kısa olumlu bir cümle söylemek.', 'Powiedzieć krótkie zdanie twierdzące z we albo they + are.');
const meanings = [L('равные', 'рівні', 'iguales', 'iguais', 'bằng nhau', 'setara', 'eşit', 'równe'), L('похожие', 'схожі', 'parecidos', 'semelhantes', 'tương tự', 'serupa', 'benzer', 'podobne'), L('отдельные', 'окремі', 'separados', 'separados', 'tách biệt', 'terpisah', 'ayrı', 'oddzielne')];
for (const [index, meaning] of meanings.entries()) authored.newVocabulary[index]!.meaning = meaning;
const canonical = ['They are equal', 'We are similar', 'They are separate'];
for (const [index, page] of authored.introPages.entries()) { const example = canonical[index]!; for (const locale of Object.keys(page.body)) page.body[locale] = `${String(page.body[locale]).split('.').slice(0, 2).join('.').trim()}. ${example}.`; page.question.choices[0] = L(example, example, example, example, example, example, example, example); page.question.explanation = page.body; page.bodyRuns = Object.fromEntries(Object.entries(page.body).map(([locale, text]) => [locale, [{ text, semantic: 'explanation' }]])); }
for (const page of authored.introPages) page.question.grammarFeatureId = 'full_form_choice';
export const EPISODE_01_SESSION_31_SOURCE: SessionSource = Object.freeze(authored);
