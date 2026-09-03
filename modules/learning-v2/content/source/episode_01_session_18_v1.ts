/** Full B1 Session 18: affirmative retrieval with three new descriptions. */
import { EPISODE_01_SESSION_17_SOURCE } from './episode_01_session_17_v1';
import { LESSON1_SESSION_18_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const L = (ru: string, uk: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string) => ({ ru, uk, es, 'pt-BR': pt, vi, id, tr, pl });
const replace = <T>(value: T): T => {
  const pairs: readonly (readonly [string, string])[] = [['e01-s17', 'e01-s18'], ['welcome', 'wrong'], ['Welcome', 'Wrong'], ['safe', 'early'], ['Safe', 'Early'], ['right', 'lucky'], ['Right', 'Lucky']];
  const visit = (item: unknown): unknown => { if (typeof item === 'string') { let text = item; for (const [from, to] of pairs) text = text.replaceAll(from, to); return text; } if (Array.isArray(item)) return item.map(visit); if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)])); return item; };
  return visit(value) as T;
};
const authored = replace(clone(EPISODE_01_SESSION_17_SOURCE)) as any;
authored.requiredSessionOrdinal = 18;
authored.generationInputFingerprint = 'full-b1-exact-affirmative-retrieval-e01-s18-v1';
authored.modeNativePlanId = LESSON1_SESSION_18_MODE_NATIVE_PLAN_ID_V2;
// Source-level feature ids let the grammar gate verify the three intro pages;
// the exact curriculum packet remains the canonical operation-level record.
authored.reviewConstructIds = ['second_person', 'plural_reference'];
authored.title = L('Ещё три описания', 'Ще три описи', 'Tres descripciones más', 'Mais três descrições', 'Ba mô tả nữa', 'Tiga deskripsi lagi', 'Üç yeni tanım', 'Trzy kolejne opisy');
authored.summary = L('Закрепи знакомые формы am, is и are с новыми описаниями.', 'Закріпи знайомі форми am, is і are з новими описами.', 'Afianza am, is y are con nuevas descripciones.', 'Pratique am, is e are com novas descrições.', 'Củng cố am, is và are với mô tả mới.', 'Mantapkan am, is, dan are dengan deskripsi baru.', 'Yeni tanımlarla am, is ve are biçimlerini pekiştir.', 'Utrwal am, is i are z nowymi opisami.');
authored.learningGoal = L('Выбрать знакомую форму be и новое точное описание.', 'Обрати знайому форму be та новий точний опис.', 'Elegir una forma conocida de be y una descripción nueva exacta.', 'Escolher uma forma conhecida de be e uma descrição nova exata.', 'Chọn dạng be quen thuộc và mô tả mới chính xác.', 'Memilih bentuk be yang dikenal dan deskripsi baru yang tepat.', 'Bilinen be biçimini ve yeni doğru tanımı seçmek.', 'Wybrać znaną formę be i nowy dokładny opis.');
const meanings = [L('неправ', 'не має рації', 'equivocado', 'errado', 'sai', 'salah', 'haksız', 'w błędzie'), L('рано', 'рано', 'temprano', 'cedo', 'sớm', 'lebih awal', 'erken', 'wcześnie'), L('удачлив', 'щасливий', 'afortunado', 'sortudo', 'may mắn', 'beruntung', 'şanslı', 'szczęśliwy')];
for (const [index, meaning] of meanings.entries()) authored.newVocabulary[index]!.meaning = meaning;
for (const [index, page] of authored.introPages.entries()) {
  const examples = ['You are wrong', 'We are early', 'They are lucky'];
  const example = examples[index]!;
  for (const locale of Object.keys(page.body)) page.body[locale] = `${page.body[locale]} ${example}.`;
  page.question.choices[0] = L(example, example, example, example, example, example, example, example);
  page.question.explanation = page.body;
  page.bodyRuns = Object.fromEntries(Object.entries(page.body).map(([locale, text]) => [locale, [{ text, semantic: 'explanation' }]]));
}
export const EPISODE_01_SESSION_18_SOURCE: SessionSource = Object.freeze(authored);
