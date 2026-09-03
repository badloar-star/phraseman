/** Full B1 Session 25: choose am, is or are in a full affirmative form. */
import { EPISODE_01_SESSION_17_SOURCE } from './episode_01_session_17_v1';
import { LESSON1_SESSION_25_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const L = (ru: string, uk: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string) => ({ ru, uk, es, 'pt-BR': pt, vi, id, tr, pl });
const replace = <T>(value: T): T => {
  const pairs: readonly (readonly [string, string])[] = [['e01-s17', 'e01-s25'], ['welcome', 'proud'], ['Welcome', 'Proud'], ['safe', 'ashamed'], ['Safe', 'Ashamed'], ['right', 'surprised'], ['Right', 'Surprised']];
  const visit = (item: unknown): unknown => typeof item === 'string' ? pairs.reduce((text, [from, to]) => text.replaceAll(from, to), item) : Array.isArray(item) ? item.map(visit) : item && typeof item === 'object' ? Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)])) : item;
  return visit(value) as T;
};
const authored = replace(clone(EPISODE_01_SESSION_17_SOURCE)) as any;
authored.requiredSessionOrdinal = 25;
authored.generationInputFingerprint = 'full-b1-exact-full-form-choice-e01-s25-v1';
authored.modeNativePlanId = LESSON1_SESSION_25_MODE_NATIVE_PLAN_ID_V2;
authored.reviewConstructIds = ['full_form_choice'];
authored.title = L('I am, she is, they are', 'I am, she is, they are', 'I am, she is, they are', 'I am, she is, they are', 'I am, she is, they are', 'I am, she is, they are', 'I am, she is, they are', 'I am, she is, they are');
authored.summary = L('Выбери am, is или are по слову перед ним.', 'Обери am, is або are за словом перед ним.', 'Elige am, is o are según la palabra anterior.', 'Escolha am, is ou are pela palavra anterior.', 'Chọn am, is hoặc are theo từ đứng trước.', 'Pilih am, is, atau are sesuai kata sebelumnya.', 'Önceki sözcüğe göre am, is ya da are seç.', 'Wybierz am, is albo are według poprzedniego słowa.');
authored.learningGoal = L('Составить полную утвердительную фразу с правильной формой be.', 'Скласти повну ствердну фразу з правильною формою be.', 'Formar una frase afirmativa completa con la forma correcta de be.', 'Formar uma frase afirmativa completa com a forma correta de be.', 'Tạo câu khẳng định hoàn chỉnh với dạng be đúng.', 'Membuat kalimat afirmatif lengkap dengan bentuk be yang benar.', 'Doğru be biçimiyle tam bir olumlu cümle kurmak.', 'Ułożyć pełne zdanie twierdzące z właściwą formą be.');
const meanings = [L('горжусь / горды', 'пишаюся / пишаємося', 'orgulloso', 'orgulhoso', 'tự hào', 'bangga', 'gururlu', 'dumny'), L('стыжусь / стыдно', 'соромно', 'avergonzado', 'envergonhado', 'xấu hổ', 'malu', 'utanmış', 'zawstydzony'), L('удивлён / удивлены', 'здивований / здивовані', 'sorprendido', 'surpreso', 'ngạc nhiên', 'terkejut', 'şaşırmış', 'zaskoczony')];
for (const [index, meaning] of meanings.entries()) authored.newVocabulary[index]!.meaning = meaning;
const rows = [['I', 'am', 'proud'], ['She', 'is', 'ashamed'], ['They', 'are', 'surprised'], ['We', 'are', 'proud'], ['He', 'is', 'ashamed'], ['I', 'am', 'surprised'], ['They', 'are', 'proud'], ['She', 'is', 'surprised'], ['We', 'are', 'ashamed']] as const;
const subjectDistractors = [['You', 'She', 'They'], ['I', 'You', 'They'], ['I', 'You', 'She'], ['I', 'She', 'He'], ['I', 'You', 'We'], ['You', 'They', 'We'], ['You', 'We', 'He'], ['I', 'They', 'We'], ['You', 'She', 'He']] as const;
for (const [index, [subject, be, ending]] of rows.entries()) {
  const phrase = authored.phrases[index]!;
  const english = `${subject} ${be} ${ending}`;
  phrase.id = `e01-s25-${subject.toLowerCase()}-${be}-${ending}`;
  phrase.english = english;
  phrase.russian = english;
  phrase.words[0].correct = subject; phrase.words[1].correct = be; phrase.words[2].correct = ending;
  phrase.words[0].distractors = subjectDistractors[index]!.map((value, optionIndex) => ({ value, reasonCode: `s25:${index}:subject:${optionIndex}`, trapType: 'grammar', why: `${value} needs a different form of be; ${subject} is required here.` }));
  phrase.words[1].distractors = ['am', 'is', 'are'].filter((value) => value !== be).concat('be').map((value, optionIndex) => ({ value, reasonCode: `s25:${index}:be:${optionIndex}`, trapType: 'grammar', why: `${value} does not match ${subject}; ${be} is required here.` }));
  phrase.words[2].distractors = ['proud', 'ashamed', 'surprised'].filter((value) => value !== ending).concat(['ready']).map((value, optionIndex) => ({ value, reasonCode: `s25:${index}:meaning:${optionIndex}`, trapType: 'semantic_neighbor', why: `${value} changes the meaning; ${ending} is required here.` }));
  phrase.features = ['full_form_choice'];
}
const examples = ['I am proud', 'She is ashamed', 'They are surprised'];
for (const [index, page] of authored.introPages.entries()) {
  const example = examples[index]!;
  const body = L('Сначала назови человека или людей, затем выбери подходящее am, is или are.', 'Спочатку назви людину або людей, потім обери відповідне am, is або are.', 'Primero nombra a la persona o personas y luego elige am, is o are.', 'Primeiro nomeie a pessoa ou as pessoas e depois escolha am, is ou are.', 'Trước tiên nêu người hoặc những người, rồi chọn am, is hoặc are.', 'Sebutkan orangnya terlebih dahulu, lalu pilih am, is, atau are.', 'Önce kişi ya da kişileri söyle, sonra uygun am, is ya da are biçimini seç.', 'Najpierw nazwij osobę lub osoby, a potem wybierz am, is albo are.');
  for (const locale of Object.keys(body)) page.body[locale] = `${body[locale as keyof typeof body]} ${example}.`;
  page.question.grammarFeatureId = 'full_form_choice';
  page.question.choices[0] = L(example, example, example, example, example, example, example, example);
  page.question.explanation = page.body;
  page.bodyRuns = Object.fromEntries(Object.entries(page.body).map(([locale, text]) => [locale, [{ text, semantic: 'explanation' }]]));
}
export const EPISODE_01_SESSION_25_SOURCE: SessionSource = Object.freeze(authored);
