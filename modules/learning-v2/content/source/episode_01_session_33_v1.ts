/** Full B1 Session 33: affirmative contractions. */
import { EPISODE_01_SESSION_25_SOURCE } from './episode_01_session_25_v1';
import { LESSON1_SESSION_25_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const L = (ru: string, uk: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string) => ({ ru, uk, es, 'pt-BR': pt, vi, id, tr, pl });
const replace = <T>(value: T): T => { const pairs: readonly (readonly [string, string])[] = [['e01-s25', 'e01-s33'], ['proud', 'okay'], ['Proud', 'Okay'], ['ashamed', 'steady'], ['Ashamed', 'Steady'], ['surprised', 'secure'], ['Surprised', 'Secure']]; const visit = (item: unknown): unknown => typeof item === 'string' ? pairs.reduce((text, [from, to]) => text.replaceAll(from, to), item) : Array.isArray(item) ? item.map(visit) : item && typeof item === 'object' ? Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)])) : item; return visit(value) as T; };
const authored = replace(clone(EPISODE_01_SESSION_25_SOURCE)) as any;
authored.requiredSessionOrdinal = 33;
authored.generationInputFingerprint = 'full-b1-exact-affirmative-contractions-e01-s33-v1';
authored.modeNativePlanId = LESSON1_SESSION_25_MODE_NATIVE_PLAN_ID_V2;
authored.reviewConstructIds = ['full_form_choice'];
authored.title = L('I’m — короткая форма', 'I’m — коротка форма', 'I’m — forma corta', 'I’m — forma curta', 'I’m — dạng ngắn', 'I’m — bentuk singkat', 'I’m — kısa biçim', 'I’m — krótka forma');
authored.summary = L('Узнай короткую форму I’m и выбери точное утверждение.', 'Упізнай коротку форму I’m і обери точне твердження.', 'Reconoce la forma corta I’m y elige la afirmación exacta.', 'Reconheça a forma curta I’m e escolha a afirmação exata.', 'Nhận ra dạng ngắn I’m và chọn câu khẳng định chính xác.', 'Kenali bentuk singkat I’m dan pilih pernyataan yang tepat.', 'I’m kısa biçimini tanı ve doğru olumlu cümleyi seç.', 'Rozpoznaj krótką formę I’m i wybierz dokładne twierdzenie.');
authored.learningGoal = L('Распознать I’m как короткую форму I am.', 'Розпізнати I’m як коротку форму I am.', 'Reconocer I’m como la forma corta de I am.', 'Reconhecer I’m como a forma curta de I am.', 'Nhận ra I’m là dạng ngắn của I am.', 'Mengenali I’m sebagai bentuk singkat I am.', 'I’m biçimini I am’in kısa biçimi olarak tanımak.', 'Rozpoznać I’m jako krótką formę I am.');
const meanings = [L('в порядке', 'у порядку', 'bien', 'bem', 'ổn', 'baik-baik saja', 'iyi', 'w porządku'), L('устойчивый', 'стійкий', 'estable', 'estável', 'ổn định', 'stabil', 'istikrarlı', 'stabilny'), L('защищённый', 'захищений', 'seguro', 'seguro', 'an toàn', 'aman', 'güvende', 'bezpieczny')];
for (const [index, meaning] of meanings.entries()) authored.newVocabulary[index]!.meaning = meaning;
const examples = ["I'm okay", "I'm steady", "I'm secure"];
for (const [index, page] of authored.introPages.entries()) { const example = examples[index]!; for (const locale of Object.keys(page.body)) page.body[locale] = `${String(page.body[locale]).split('.').slice(0, 2).join('.').trim()}. ${example}.`; page.question.choices[0] = L(example, example, example, example, example, example, example, example); page.question.explanation = page.body; page.bodyRuns = Object.fromEntries(Object.entries(page.body).map(([locale, text]) => [locale, [{ text, semantic: 'explanation' }]])); }
export const EPISODE_01_SESSION_33_SOURCE: SessionSource = Object.freeze(authored);
