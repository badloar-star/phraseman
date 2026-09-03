/** Full B1 Session 16 checkpoint: retrieval only, no new lexical senses. */
import { EPISODE_01_SESSION_15_SOURCE } from './episode_01_session_15_v1';
import { EPISODE_01_SESSION_08_SOURCE } from './episode_01_session_08_v1';
import { LESSON1_SESSION_16_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const authored = { ...clone(EPISODE_01_SESSION_15_SOURCE), requiredSessionOrdinal: 16, sessionKindOverride: 'checkpoint', generationInputFingerprint: 'full-b1-exact-it-is-checkpoint-e01-s16-v1' } as any;
authored.newVocabulary = [];
authored.reviewConstructIds = ['affirmative_third_person_statement'];
authored.modeNativePlanId = LESSON1_SESSION_16_MODE_NATIVE_PLAN_ID_V2;
// Session 8 is the dedicated checkpoint shape: every scored target is a
// phrase.  Session 15's word-first activity plan is not valid here.
authored.modeNativePractice = clone(EPISODE_01_SESSION_08_SOURCE.modeNativePractice);
for (const page of authored.introPages as any[]) {
  const body = { ru: 'С предметом или животным используйте It, затем is, затем описание.', uk: 'З предметом або твариною використовуйте It, потім is, далі опис.', es: 'Con un objeto o animal usa It, luego is y después la descripción.', 'pt-BR': 'Para um objeto ou animal, use It, depois is e então a descrição.', vi: 'Với đồ vật hoặc con vật, dùng It, rồi is, sau đó là phần mô tả.', id: 'Untuk benda atau hewan, gunakan It, lalu is, kemudian deskripsi.', tr: 'Bir nesne ya da hayvan için It, sonra is, ardından tanım kullanın.', pl: 'Dla rzeczy lub zwierzęcia użyj It, potem is, a następnie opisu.' };
  page.body = body; page.question.explanation = body;
  page.bodyRuns = Object.fromEntries(Object.entries(body).map(([locale, text]) => [locale, [{ text, semantic: 'explanation' }]]));
}
for (const page of authored.introPages as any[]) {
  const correct = page.question.choices[0];
  for (const locale of Object.keys(page.body)) {
    page.body[locale] = correct[locale] + '. ' + page.body[locale];
    page.question.explanation[locale] = correct[locale] + '. ' + page.question.explanation[locale];
  }
  page.bodyRuns = Object.fromEntries(Object.entries(page.body).map(([locale, text]) => [locale, [{ text, semantic: 'explanation' }]]));
}
const checkpointPhrases = ['It is small', 'It is big', 'It is clean', 'It is dirty', 'It is open', 'It is closed', 'It is easy', 'It is difficult', 'It is important', 'It is loud', 'It is friendly', 'It is helpful', 'It is smart', 'It is strong', 'It is quiet'];
while (authored.phrases.length < checkpointPhrases.length) authored.phrases.push(clone(authored.phrases[0]));
for (const [index, english] of checkpointPhrases.entries()) {
  const phrase = authored.phrases[index]!;
  phrase.id = 'e01-s16-' + english.toLowerCase().replaceAll(' ', '-');
  phrase.english = english;
  phrase.words = english.split(' ').map((correct: string, position: number) => ({ ...clone(authored.phrases[0].words[position]), correct }));
}
const endings = checkpointPhrases.map((phrase) => phrase.split(' ')[2]!);
for (const [index, phrase] of (authored.phrases as any[]).entries()) {
  const correct = endings[index]!;
  const choices = [endings[(index + 1) % endings.length]!, endings[(index + 4) % endings.length]!, endings[(index + 8) % endings.length]!];
  phrase.words[2].distractors = choices.map((value, optionIndex) => ({
    value,
    reasonCode: 's16:' + correct + ':not:' + value + ':' + optionIndex,
    trapType: 'semantic_neighbor',
    why: value + ' is a different known description; this retrieval phrase specifically needs ' + correct + ' after is.',
  }));
}
export const EPISODE_01_SESSION_16_SOURCE: SessionSource = Object.freeze(authored);
