/** Full B1 Session 30: listening retrieval with alive, dead, missing. */
import { EPISODE_01_SESSION_29_SOURCE } from './episode_01_session_29_v1';
import { LESSON1_SESSION_30_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const L = (ru: string, uk: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string) => ({ ru, uk, es, 'pt-BR': pt, vi, id, tr, pl });
const replace = <T>(value: T): T => {
  const pairs: readonly (readonly [string, string])[] = [
    ['e01-s29', 'e01-s30'], ['local', 'alive'], ['Local', 'Alive'],
    ['foreign', 'dead'], ['Foreign', 'Dead'], ['online', 'missing'], ['Online', 'Missing'],
  ];
  const visit = (item: unknown): unknown => typeof item === 'string'
    ? pairs.reduce((text, [from, to]) => text.replaceAll(from, to), item)
    : Array.isArray(item) ? item.map(visit)
    : item && typeof item === 'object'
      ? Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)]))
      : item;
  return visit(value) as T;
};

const authored = replace(clone(EPISODE_01_SESSION_29_SOURCE)) as any;
authored.requiredSessionOrdinal = 30;
authored.generationInputFingerprint = 'full-b1-exact-listening-retrieval-e01-s30-v1';
authored.modeNativePlanId = LESSON1_SESSION_30_MODE_NATIVE_PLAN_ID_V2;
authored.reviewConstructIds = ['full_form_choice'];
authored.title = L('Alive, dead, missing', 'Alive, dead, missing', 'Alive, dead, missing', 'Alive, dead, missing', 'Alive, dead, missing', 'Alive, dead, missing', 'Alive, dead, missing', 'Alive, dead, missing');
authored.summary = L('Услышь знакомое слово и выбери точную фразу с be.', 'Почуй знайоме слово й обери точну фразу з be.', 'Escucha una palabra conocida y elige la frase exacta con be.', 'Ouça uma palavra conhecida e escolha a frase exata com be.', 'Nghe từ quen thuộc và chọn câu chính xác với be.', 'Dengarkan kata yang dikenal dan pilih kalimat tepat dengan be.', 'Bilinen sözcüğü dinle ve be ile doğru cümleyi seç.', 'Usłysz znane słowo i wybierz dokładne zdanie z be.');
authored.learningGoal = L('Распознать на слух alive, dead и missing и выбрать точную знакомую фразу.', 'Розпізнати на слух alive, dead і missing та обрати точну знайому фразу.', 'Reconocer alive, dead y missing al oírlas y elegir la frase conocida exacta.', 'Reconhecer alive, dead e missing ao ouvi-las e escolher a frase conhecida exata.', 'Nhận ra alive, dead và missing khi nghe và chọn câu quen thuộc chính xác.', 'Mengenali alive, dead, dan missing saat mendengarnya dan memilih kalimat yang tepat.', 'Alive, dead ve missing sözcüklerini duyunca tanımak ve doğru tanıdık cümleyi seçmek.', 'Rozpoznać ze słuchu alive, dead i missing oraz wybrać dokładne znane zdanie.');
const meanings = [
  L('живой', 'живий', 'vivo', 'vivo', 'còn sống', 'hidup', 'hayatta', 'żywy'),
  L('мёртвый', 'мертвий', 'muerto', 'morto', 'đã chết', 'mati', 'ölü', 'martwy'),
  L('пропавший / отсутствующий', 'зниклий / відсутній', 'desaparecido', 'desaparecido', 'mất tích', 'hilang', 'kayıp', 'zaginiony'),
];
for (const [index, meaning] of meanings.entries()) authored.newVocabulary[index]!.meaning = meaning;
const examples = ['He is alive', 'It is dead', 'She is missing'];
for (const [index, page] of authored.introPages.entries()) {
  const example = examples[index]!;
  for (const locale of Object.keys(page.body)) page.body[locale] = `${String(page.body[locale]).split('.').slice(0, 2).join('.').trim()}. ${example}.`;
  page.question.choices[0] = L(example, example, example, example, example, example, example, example);
  page.question.explanation = page.body;
  page.bodyRuns = Object.fromEntries(Object.entries(page.body).map(([locale, text]) => [locale, [{ text, semantic: 'explanation' }]]));
}

export const EPISODE_01_SESSION_30_SOURCE: SessionSource = Object.freeze(authored);
