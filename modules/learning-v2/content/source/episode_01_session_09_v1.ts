/** Dedicated Full B1 source: the first he / she / it + is session. */
import { APPROVED_FIRST_TEN_SESSION_SOURCES_V2 } from './approved_first_ten_source_v2';
import {
  EPISODE_01_SESSION_04_EXACT_INTRO_V2,
  EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2,
  EPISODE_01_SESSION_04_EXACT_PHRASES_SOURCE_V2,
  EPISODE_01_SESSION_04_EXACT_VOCABULARY_V2,
} from './episode_01_session_04_exact_v2';
import { LESSON1_SESSION_09_MODE_NATIVE_PLAN_ID_V2 } from './lesson1_session_choreography_v1';
import type { SessionSource } from './session_shard_from_source_v1';

const previous = APPROVED_FIRST_TEN_SESSION_SOURCES_V2[8]!;
const json = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const replace = <T>(value: T, pairs: readonly (readonly [string, string])[]): T => {
  const visit = (item: unknown): unknown => {
    if (typeof item === 'string') {
      let text = item;
      for (const [from, to] of pairs) text = text.replaceAll(from, to);
      return text;
    }
    if (Array.isArray(item)) return item.map(visit);
    if (item && typeof item === 'object')
      return Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, child]) => [key, visit(child)]));
    return item;
  };
  return visit(value) as T;
};
const L = (ru: string, uk: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string) =>
  ({ ru, uk, es, 'pt-BR': pt, vi, id, tr, pl });

const meanings = {
  tall: L('высокий', 'високий', 'alto', 'alto', 'cao', 'tinggi', 'uzun boylu', 'wysoki'),
  short: L('низкий', 'низький', 'bajo', 'baixo', 'thấp', 'pendek', 'kısa boylu', 'niski'),
  young: L('молодой', 'молодий', 'joven', 'jovem', 'trẻ', 'muda', 'genç', 'młody'),
} as const;
const phraseMeanings: Record<string, ReturnType<typeof L>> = {
  ...meanings,
  ready: L('готов', 'готовий', 'listo', 'pronto', 'sẵn sàng', 'siap', 'hazır', 'gotowy'),
  happy: L('счастлив', 'щасливий', 'feliz', 'feliz', 'vui', 'bahagia', 'mutlu', 'szczęśliwy'),
  fine: L('в порядке', 'у порядку', 'bien', 'bem', 'ổn', 'baik-baik saja', 'iyi', 'w porządku'),
  angry: L('сердит', 'сердитий', 'enfadado', 'zangado', 'giận', 'marah', 'öfkeli', 'zły'),
  scared: L('напуган', 'наляканий', 'asustado', 'assustado', 'sợ', 'takut', 'korkmuş', 'przestraszony'),
};
const vocabulary = ['tall', 'short', 'young'] as const;
const vocab = Object.freeze(vocabulary.map((target, index) => {
  const model = json(EPISODE_01_SESSION_04_EXACT_VOCABULARY_V2[index]! as any);
  const old = ['hungry', 'thirsty', 'sick'][index]!;
  return replace(model, [[old, target], ['state', 'description']]);
}));

const phrasePlan = [
  ['He', 'tall'], ['She', 'short'], ['It', 'young'], ['He', 'ready'],
  ['She', 'happy'], ['It', 'fine'], ['He', 'angry'], ['She', 'scared'],
] as const;
const phraseModel = (index: number, subject: string, ending: string) => {
  const subjectAlternatives: Record<string, readonly string[]> = { He: ['She', 'It', 'You'], She: ['He', 'It', 'I'], It: ['He', 'She', 'You'] };
  const availableEndings = vocabulary.filter((word) => word !== ending).concat(['ready', 'happy', 'fine', 'angry', 'scared'].filter((word) => word !== ending));
  const offset = index % availableEndings.length;
  const endingAlternatives = [...availableEndings.slice(offset), ...availableEndings.slice(0, offset)].slice(0, 3);
  const word = (correct: string, alternatives: readonly string[], category: string) => ({
    correct, category,
    distractors: alternatives.map((value, position) => ({ value, reasonCode: `s09:${correct}:not:${value}:${position}`, trapType: position === 0 ? 'grammar' : 'semantic_neighbor', why: `${value} is not the exact word needed for ${subject} is ${ending}.` })),
  });
  const words = [word(subject, subjectAlternatives[subject]!, 'third_person_pronoun'), word('is', ['am', 'are', 'be'], 'copula'), word(ending, endingAlternatives, 'description')];
  const localizedDetails = Object.fromEntries(Object.entries(phraseMeanings[ending]!).map(([locale, meaning]) => [locale, {
    meaning,
    explanation: `${subject} is ${ending}: ${subject} names the person or thing, and is links it to ${ending}.`,
    words: words.map((entry) => ({ correct: entry.correct, prompt: `Choose ${entry.correct}.`, distractors: entry.distractors.map((trap) => ({ value: trap.value, reason: trap.why, trapType: trap.trapType })) })),
    distractors: words.flatMap((entry) => entry.distractors.map((trap) => ({ value: trap.value, reason: trap.why, trapType: trap.trapType }))),
  }])) as any;
  return { id: `e01-s09-${subject.toLowerCase()}-is-${ending}`, english: `${subject} is ${ending}`, russian: phraseMeanings[ending]!.ru, explanation: `${subject} is ${ending} describes another person or thing. ${subject} identifies who we are talking about; is is the required link before the description, so am and are cannot replace it.`, words, localizedDetails, features: ['copula_be', 'third_person_reference', 'affirmative_third_person'] };
};
const phrases = Object.freeze(phrasePlan.map(([subject, ending], index) => phraseModel(index, subject, ending)));

const intro = replace(
  EPISODE_01_SESSION_04_EXACT_INTRO_V2,
  [['I am hungry', 'He is tall'], ['I am thirsty', 'She is short'], ['I am sick', 'It is young'], ['I am', 'He is'], ['I', 'He'], ['am', 'is'], ['hungry', 'tall'], ['thirsty', 'short'], ['sick', 'young']],
);
// The introductory check uses a different primary answer from every practice
// card; the new-word contact for tall must not repeat an intro target.
(intro as any)[0].question.choices[0] = L('short', 'short', 'short', 'short', 'short', 'short', 'short', 'short');
(intro as any)[0].question.explanation = L('Short — правильный ответ, потому что после he is ставится описание человека.', 'Short — правильна відповідь, бо після he is ставиться опис людини.', 'Short es correcto porque después de he is va una descripción.', 'Short está correto porque depois de he is vem uma descrição.', 'Short đúng vì sau he is là phần mô tả.', 'Short benar karena setelah he is ada keterangan.', 'Short doğrudur; he is sonrasında bir tanım gelir.', 'Short jest poprawne, bo po he is stoi opis.');
(intro as any)[2].question.choices[0] = L('She is young', 'She is young', 'She is young', 'She is young', 'She is young', 'She is young', 'She is young', 'She is young');
(intro as any)[2].body.ru = (intro as any)[2].body.ru.replaceAll('Het is young', 'She is young');
(intro as any)[2].body.uk = (intro as any)[2].body.uk.replaceAll('Het is young', 'She is young');
(intro as any)[2].body.es = (intro as any)[2].body.es.replaceAll('Het is young', 'She is young');
(intro as any)[2].body['pt-BR'] = (intro as any)[2].body['pt-BR'].replaceAll('Het is young', 'She is young');
(intro as any)[2].body.vi = (intro as any)[2].body.vi.replaceAll('Het is young', 'She is young');
(intro as any)[2].body.id = (intro as any)[2].body.id.replaceAll('Het is young', 'She is young');
(intro as any)[2].body.tr = (intro as any)[2].body.tr.replaceAll('Het is young', 'She is young');
(intro as any)[2].body.pl = (intro as any)[2].body.pl.replaceAll('Het is young', 'She is young');
const base = EPISODE_01_SESSION_04_EXACT_MODE_NATIVE_PRACTICE_V2;
const practice = [
  replace(json(base[0]!), [['thirsty', 'tall'], ['sick', 'young'], ['hungry', 'short']]),
  replace(json(base[1]!), [['sick', 'young'], ['hungry', 'tall'], ['thirsty', 'short']]),
  replace(json(base[2]!), [['I am', 'It is'], ['I', 'It'], ['am', 'is'], ['hungry', 'tall'], ['thirsty', 'short'], ['sick', 'young']]),
  replace(json(base[3]!), [['I am', 'He is'], ['I', 'He'], ['am', 'is'], ['here', 'ready']]),
  replace(json(base[4]!), [['hungry', 'tall'], ['thirsty', 'short'], ['sick', 'young'], ['here', 'calm']]),
  replace(json(base[5]!), [['I am', 'She is'], ['I', 'She'], ['am', 'is'], ['ready', 'calm']]),
] as any[];
practice[0].target = { kind: 'vocabulary', sourceIndex: 0 };
practice[1].target = { kind: 'vocabulary', sourceIndex: 2 };
practice[2].target = { kind: 'phrase', sourceIndex: 2 };
practice[3].target = { kind: 'phrase', sourceIndex: 3 };
practice[4].target = { kind: 'phrase', sourceIndex: 4 };
practice[5].target = { kind: 'phrase', sourceIndex: 5 };
for (const [index, family] of [
  'listen_choose', 'scripted_repeat_compare', 'context_gap_grammar',
  'listen_build_dictation', 'speed_match', 'phrase_builder',
].entries()) {
  practice[index]!.family = family;
  practice[index]!.modePayload.family = family;
}

export const EPISODE_01_SESSION_09_SOURCE: SessionSource = Object.freeze({
  ...previous,
  generationInputFingerprint: 'full-b1-exact-he-she-it-is-e01-s09-v2',
  sessionKindOverride: 'words_then_phrases',
  distractorAuthorship: 'manual',
  title: L('He, she, it — is', 'He, she, it — is', 'He, she, it — is', 'He, she, it — is', 'He, she, it — is', 'He, she, it — is', 'He, she, it — is', 'He, she, it — is'),
  summary: L('Опиши другого человека или предмет: he, she, it + is.', 'Опиши іншу людину чи предмет: he, she, it + is.', 'Describe a otra persona u objeto: he, she, it + is.', 'Descreva outra pessoa ou objeto: he, she, it + is.', 'Mô tả người khác hoặc vật: he, she, it + is.', 'Jelaskan orang lain atau benda: he, she, it + is.', 'Başka bir kişiyi ya da nesneyi tanımla: he, she, it + is.', 'Opisz inną osobę lub rzecz: he, she, it + is.'),
  learningGoal: L('Составить утвердительную фразу о другом человеке или предмете.', 'Скласти ствердну фразу про іншу людину чи предмет.', 'Formar una afirmación sobre otra persona u objeto.', 'Formar uma afirmação sobre outra pessoa ou objeto.', 'Tạo câu khẳng định về người khác hoặc vật.', 'Membuat pernyataan tentang orang lain atau benda.', 'Başka biri ya da nesne hakkında olumlu cümle kurmak.', 'Ułożyć twierdzenie o innej osobie lub rzeczy.'),
  introPages: intro as any,
  newVocabulary: vocab as any,
  phrases: phrases as any,
  modeNativePlanId: LESSON1_SESSION_09_MODE_NATIVE_PLAN_ID_V2,
  modeNativePractice: practice as any,
});
