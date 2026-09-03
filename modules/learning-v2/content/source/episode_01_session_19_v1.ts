/** Full B1 Session 19: affirmative contrast with together, alone, nearby. */
import { EPISODE_01_SESSION_18_SOURCE } from './episode_01_session_18_v1';
import { LESSON1_SESSION_19_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const L = (ru: string, uk: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string) => ({ ru, uk, es, 'pt-BR': pt, vi, id, tr, pl });
const replace = <T>(value: T): T => { const pairs: readonly (readonly [string, string])[] = [['e01-s18', 'e01-s19'], ['wrong', 'together'], ['Wrong', 'Together'], ['early', 'alone'], ['Early', 'Alone'], ['lucky', 'nearby'], ['Lucky', 'Nearby']]; const visit = (item: unknown): unknown => { if (typeof item === 'string') { let text = item; for (const [from, to] of pairs) text = text.replaceAll(from, to); return text; } if (Array.isArray(item)) return item.map(visit); if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)])); return item; }; return visit(value) as T; };
const authored = replace(clone(EPISODE_01_SESSION_18_SOURCE)) as any;
authored.requiredSessionOrdinal = 19;
authored.generationInputFingerprint = 'full-b1-exact-affirmative-contrast-e01-s19-v1';
authored.modeNativePlanId = LESSON1_SESSION_19_MODE_NATIVE_PLAN_ID_V2;
authored.title = L('Вместе или отдельно', 'Разом чи окремо', 'Juntos o separados', 'Juntos ou separados', 'Cùng nhau hay riêng', 'Bersama atau sendiri', 'Birlikte ya da yalnız', 'Razem czy osobno');
authored.summary = L('Сравни together, alone и nearby в знакомых утвердительных фразах.', 'Порівняй together, alone і nearby у знайомих ствердних фразах.', 'Compara together, alone y nearby en frases afirmativas conocidas.', 'Compare together, alone e nearby em frases afirmativas conhecidas.', 'So sánh together, alone và nearby trong câu khẳng định quen thuộc.', 'Bandingkan together, alone, dan nearby dalam kalimat afirmatif yang dikenal.', 'Together, alone ve nearby sözcüklerini bilinen olumlu cümlelerde karşılaştır.', 'Porównaj together, alone i nearby w znanych zdaniach twierdzących.');
authored.learningGoal = L('Точно выбрать описание положения людей.', 'Точно обрати опис положення людей.', 'Elegir con precisión una descripción de la situación de las personas.', 'Escolher com precisão uma descrição da situação das pessoas.', 'Chọn chính xác mô tả vị trí của mọi người.', 'Memilih deskripsi keadaan orang dengan tepat.', 'İnsanların durumunu doğru tanımlamak.', 'Precyzyjnie wybrać opis sytuacji ludzi.');
const meanings = [L('вместе', 'разом', 'juntos', 'juntos', 'cùng nhau', 'bersama', 'birlikte', 'razem'), L('один', 'сам', 'solo', 'sozinho', 'một mình', 'sendiri', 'yalnız', 'sam'), L('рядом', 'поруч', 'cerca', 'perto', 'ở gần', 'di dekat', 'yakında', 'w pobliżu')];
for (const [index, meaning] of meanings.entries()) authored.newVocabulary[index]!.meaning = meaning;
const examples = ['We are together', 'We are alone', 'We are nearby'];
for (const [index, page] of authored.introPages.entries()) { const example = examples[index]!; for (const locale of Object.keys(page.body)) { const opening = String(page.body[locale]).split('.').slice(0, 2).join('.').trim(); page.body[locale] = `${opening}. ${example}.`; } page.question.choices[0] = L(example, example, example, example, example, example, example, example); page.question.explanation = page.body; page.bodyRuns = Object.fromEntries(Object.entries(page.body).map(([locale, text]) => [locale, [{ text, semantic: 'explanation' }]])); }
export const EPISODE_01_SESSION_19_SOURCE: SessionSource = Object.freeze(authored);
