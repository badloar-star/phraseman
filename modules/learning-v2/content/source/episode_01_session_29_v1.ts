/** Full B1 Session 29: diagnostic repair with local, foreign, online. */
import { EPISODE_01_SESSION_28_SOURCE } from './episode_01_session_28_v1';
import { LESSON1_SESSION_29_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const L = (ru: string, uk: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string) => ({ ru, uk, es, 'pt-BR': pt, vi, id, tr, pl });
const replace = <T>(value: T): T => { const pairs: readonly (readonly [string, string])[] = [['e01-s28', 'e01-s29'], ['correct', 'local'], ['Correct', 'Local'], ['certain', 'foreign'], ['Certain', 'Foreign'], ['serious', 'online'], ['Serious', 'Online']]; const visit = (item: unknown): unknown => typeof item === 'string' ? pairs.reduce((text, [from, to]) => text.replaceAll(from, to), item) : Array.isArray(item) ? item.map(visit) : item && typeof item === 'object' ? Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)])) : item; return visit(value) as T; };
const authored = replace(clone(EPISODE_01_SESSION_28_SOURCE)) as any;
authored.requiredSessionOrdinal = 29;
authored.generationInputFingerprint = 'full-b1-exact-diagnostic-repair-e01-s29-v1';
authored.modeNativePlanId = LESSON1_SESSION_29_MODE_NATIVE_PLAN_ID_V2;
authored.reviewConstructIds = ['full_form_choice'];
authored.title = L('Local, foreign, online', 'Local, foreign, online', 'Local, foreign, online', 'Local, foreign, online', 'Local, foreign, online', 'Local, foreign, online', 'Local, foreign, online', 'Local, foreign, online');
authored.summary = L('Найди и исправь форму be в короткой знакомой фразе.', 'Знайди й виправ форму be у короткій знайомій фразі.', 'Encuentra y corrige la forma de be en una frase corta conocida.', 'Encontre e corrija a forma de be em uma frase curta conhecida.', 'Tìm và sửa dạng be trong câu ngắn quen thuộc.', 'Temukan dan perbaiki bentuk be dalam kalimat pendek yang dikenal.', 'Bilinen kısa cümlede be biçimini bul ve düzelt.', 'Znajdź i popraw formę be w znanym krótkim zdaniu.');
authored.learningGoal = L('Распознать ошибку формы be и выбрать правильную фразу.', 'Розпізнати помилку форми be й обрати правильну фразу.', 'Reconocer un error de la forma be y elegir la frase correcta.', 'Reconhecer um erro da forma be e escolher a frase correta.', 'Nhận ra lỗi dạng be và chọn câu đúng.', 'Mengenali kesalahan bentuk be dan memilih kalimat yang benar.', 'Be biçimi hatasını fark edip doğru cümleyi seçmek.', 'Rozpoznać błąd formy be i wybrać poprawne zdanie.');
const meanings = [L('местный', 'місцевий', 'local', 'local', 'địa phương', 'lokal', 'yerel', 'lokalny'), L('иностранный', 'іноземний', 'extranjero', 'estrangeiro', 'nước ngoài', 'asing', 'yabancı', 'zagraniczny'), L('в сети / онлайн', 'онлайн', 'en línea', 'on-line', 'trực tuyến', 'daring', 'çevrimiçi', 'online')];
for (const [index, meaning] of meanings.entries()) authored.newVocabulary[index]!.meaning = meaning;
const examples = ['It is local', 'They are foreign', 'We are online'];
for (const [index, page] of authored.introPages.entries()) { const example = examples[index]!; for (const locale of Object.keys(page.body)) page.body[locale] = `${String(page.body[locale]).split('.').slice(0, 2).join('.').trim()}. ${example}.`; page.question.choices[0] = L(example, example, example, example, example, example, example, example); page.question.explanation = page.body; page.bodyRuns = Object.fromEntries(Object.entries(page.body).map(([locale, text]) => [locale, [{ text, semantic: 'explanation' }]])); }
export const EPISODE_01_SESSION_29_SOURCE: SessionSource = Object.freeze(authored);
