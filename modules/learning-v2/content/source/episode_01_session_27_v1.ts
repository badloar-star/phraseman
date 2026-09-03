/** Full B1 Session 27: diagnostic full-form contrast with three new words. */
import { EPISODE_01_SESSION_26_SOURCE } from './episode_01_session_26_v1';
import { LESSON1_SESSION_27_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const L = (ru: string, uk: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string) => ({ ru, uk, es, 'pt-BR': pt, vi, id, tr, pl });
const replace = <T>(value: T): T => {
  const pairs: readonly (readonly [string, string])[] = [['e01-s26', 'e01-s27'], ['bored', 'awake'], ['Bored', 'Awake'], ['confused', 'asleep'], ['Confused', 'Asleep'], ['worried', 'available'], ['Worried', 'Available']];
  const visit = (item: unknown): unknown => typeof item === 'string' ? pairs.reduce((text, [from, to]) => text.replaceAll(from, to), item) : Array.isArray(item) ? item.map(visit) : item && typeof item === 'object' ? Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)])) : item;
  return visit(value) as T;
};
const authored = replace(clone(EPISODE_01_SESSION_26_SOURCE)) as any;
authored.requiredSessionOrdinal = 27;
authored.generationInputFingerprint = 'full-b1-exact-diagnostic-full-form-e01-s27-v1';
authored.modeNativePlanId = LESSON1_SESSION_27_MODE_NATIVE_PLAN_ID_V2;
authored.reviewConstructIds = ['full_form_choice'];
authored.title = L('Awake, asleep, available', 'Awake, asleep, available', 'Awake, asleep, available', 'Awake, asleep, available', 'Awake, asleep, available', 'Awake, asleep, available', 'Awake, asleep, available', 'Awake, asleep, available');
authored.summary = L('Отличи полную форму be в знакомых коротких фразах.', 'Відрізни повну форму be у знайомих коротких фразах.', 'Distingue la forma completa de be en frases cortas conocidas.', 'Diferencie a forma completa de be em frases curtas conhecidas.', 'Phân biệt dạng be đầy đủ trong các câu ngắn quen thuộc.', 'Bedakan bentuk be lengkap dalam kalimat pendek yang dikenal.', 'Bilinen kısa cümlelerde tam be biçimini ayırt et.', 'Rozróżnij pełną formę be w znanych krótkich zdaniach.');
authored.learningGoal = L('Выбрать правильную полную форму и новое описание по одной подсказке.', 'Обрати правильну повну форму й новий опис за однією підказкою.', 'Elegir la forma completa correcta y una descripción nueva con una pista.', 'Escolher a forma completa correta e uma descrição nova com uma pista.', 'Chọn dạng đầy đủ đúng và mô tả mới theo một gợi ý.', 'Memilih bentuk lengkap yang benar dan deskripsi baru dari satu petunjuk.', 'Bir ipucuyla doğru tam biçimi ve yeni tanımı seçmek.', 'Wybrać właściwą pełną formę i nowy opis na podstawie jednej wskazówki.');
const meanings = [L('не сплю / бодрствую', 'не сплю / не сплять', 'despierto', 'acordado', 'thức', 'terjaga', 'uyanık', 'obudzony'), L('сплю', 'сплю', 'dormido', 'dormindo', 'đang ngủ', 'tertidur', 'uykuda', 'śpiący'), L('доступен / доступны', 'доступний / доступні', 'disponible', 'disponível', 'có mặt', 'tersedia', 'müsait', 'dostępny')];
for (const [index, meaning] of meanings.entries()) authored.newVocabulary[index]!.meaning = meaning;
const examples = ['I am awake', 'She is asleep', 'They are available'];
for (const [index, page] of authored.introPages.entries()) {
  const example = examples[index]!;
  for (const locale of Object.keys(page.body)) page.body[locale] = `${String(page.body[locale]).split('.').slice(0, 2).join('.').trim()}. ${example}.`;
  page.question.choices[0] = L(example, example, example, example, example, example, example, example);
  page.question.explanation = page.body;
  page.bodyRuns = Object.fromEntries(Object.entries(page.body).map(([locale, text]) => [locale, [{ text, semantic: 'explanation' }]]));
}
export const EPISODE_01_SESSION_27_SOURCE: SessionSource = Object.freeze(authored);
