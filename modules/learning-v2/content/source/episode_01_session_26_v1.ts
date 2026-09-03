/** Full B1 Session 26: guided full-form retrieval with three new states. */
import { EPISODE_01_SESSION_25_SOURCE } from './episode_01_session_25_v1';
import { LESSON1_SESSION_26_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const L = (ru: string, uk: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string) => ({ ru, uk, es, 'pt-BR': pt, vi, id, tr, pl });
const replace = <T>(value: T): T => {
  const pairs: readonly (readonly [string, string])[] = [['e01-s25', 'e01-s26'], ['proud', 'bored'], ['Proud', 'Bored'], ['ashamed', 'confused'], ['Ashamed', 'Confused'], ['surprised', 'worried'], ['Surprised', 'Worried']];
  const visit = (item: unknown): unknown => typeof item === 'string' ? pairs.reduce((text, [from, to]) => text.replaceAll(from, to), item) : Array.isArray(item) ? item.map(visit) : item && typeof item === 'object' ? Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)])) : item;
  return visit(value) as T;
};
const authored = replace(clone(EPISODE_01_SESSION_25_SOURCE)) as any;
authored.requiredSessionOrdinal = 26;
authored.generationInputFingerprint = 'full-b1-exact-guided-full-form-e01-s26-v1';
authored.modeNativePlanId = LESSON1_SESSION_26_MODE_NATIVE_PLAN_ID_V2;
authored.reviewConstructIds = ['full_form_choice'];
authored.title = L('Bored, confused, worried', 'Bored, confused, worried', 'Bored, confused, worried', 'Bored, confused, worried', 'Bored, confused, worried', 'Bored, confused, worried', 'Bored, confused, worried', 'Bored, confused, worried');
authored.summary = L('Выбери полную форму be для bored, confused и worried.', 'Обери повну форму be для bored, confused і worried.', 'Elige la forma completa de be con bored, confused y worried.', 'Escolha a forma completa de be com bored, confused e worried.', 'Chọn dạng be đầy đủ với bored, confused và worried.', 'Pilih bentuk be lengkap dengan bored, confused, dan worried.', 'Bored, confused ve worried ile tam be biçimini seç.', 'Wybierz pełną formę be z bored, confused i worried.');
authored.learningGoal = L('Применить знакомую полную форму с новым описанием.', 'Застосувати знайому повну форму з новим описом.', 'Aplicar la forma completa conocida con una descripción nueva.', 'Aplicar a forma completa conhecida com uma nova descrição.', 'Dùng dạng đầy đủ đã biết với một mô tả mới.', 'Menerapkan bentuk lengkap yang dikenal dengan deskripsi baru.', 'Bilinen tam biçimi yeni bir tanımla kullanmak.', 'Zastosować znaną pełną formę z nowym opisem.');
const meanings = [L('скучаю / скучно', 'нудьгую / нудно', 'aburrido', 'entediado', 'chán', 'bosan', 'sıkılmış', 'znudzony'), L('растерян / запутан', 'розгублений', 'confundido', 'confuso', 'bối rối', 'bingung', 'kafası karışık', 'zdezorientowany'), L('волнуюсь / обеспокоены', 'хвилююся / стурбовані', 'preocupado', 'preocupado', 'lo lắng', 'khawatir', 'endişeli', 'zmartwiony')];
for (const [index, meaning] of meanings.entries()) authored.newVocabulary[index]!.meaning = meaning;
const examples = ['You are bored', 'He is confused', 'We are worried'];
for (const [index, page] of authored.introPages.entries()) {
  const example = examples[index]!;
  for (const locale of Object.keys(page.body)) page.body[locale] = `${String(page.body[locale]).split('.').slice(0, 2).join('.').trim()}. ${example}.`;
  page.question.choices[0] = L(example, example, example, example, example, example, example, example);
  page.question.explanation = page.body;
  page.bodyRuns = Object.fromEntries(Object.entries(page.body).map(([locale, text]) => [locale, [{ text, semantic: 'explanation' }]]));
}
export const EPISODE_01_SESSION_26_SOURCE: SessionSource = Object.freeze(authored);
