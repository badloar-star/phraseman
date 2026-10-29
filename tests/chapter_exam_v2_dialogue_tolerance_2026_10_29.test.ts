// Поблажка ответа собеседнику (Теория через координатора 29.10, примеры из 9c34c1092): «Yes, / No,» в начале и «too / either» в конце
// не штрафуются — но только поверх правильного ядра. Неверное ядро с такой добавкой остаётся неверным; задания других типов не меняются.
import { checkChapterExamV2Answer, type ChapterExamV2Item } from '../modules/learning-v2/exam/chapter_exam_v2';

const dialogue = (accepted: string[], wrong?: string): ChapterExamV2Item => ({
  id: 't', type: 'dialogue', grammarPoint: 'g', partnerLine: 'I can wash my face.',
  situation: { ru: 'Скажи, что Том тоже умеет сам одеваться.', uk: 'Скажи, що Том теж уміє сам одягатися.' },
  accepted, ...(wrong ? { wrong } : {}),
} as unknown as ChapterExamV2Item);

const tom = dialogue(['Tom can get dressed too.', 'Tom can get dressed.']);
const hungry = dialogue(["I'm hungry too.", 'I am hungry.']);
const table = dialogue(['The table is going to wobble too.', 'The table is going to wobble.']);

test('tail too / either and leading Yes, / No, over a correct core are accepted', () => {
  expect(checkChapterExamV2Answer(tom, 'Yes, Tom can get dressed too.').correct).toBe(true);
  expect(checkChapterExamV2Answer(tom, 'Yes, Tom can get dressed.').correct).toBe(true);
  expect(checkChapterExamV2Answer(hungry, 'Yes, I am hungry too!').correct).toBe(true);
  expect(checkChapterExamV2Answer(dialogue(['I am not hungry.']), 'No, I am not hungry either.').correct).toBe(true);
});

test('a wrong core stays wrong whatever the tail or prefix', () => {
  expect(checkChapterExamV2Answer(tom, 'Yes, Tom can dressed too.').correct).toBe(false);
  expect(checkChapterExamV2Answer(hungry, 'Yes, I hungry too.').correct).toBe(false);
  expect(checkChapterExamV2Answer(table, 'No, the table is going to break too.').correct).toBe(false);
  expect(checkChapterExamV2Answer(tom, 'Yes').correct).toBe(false);
  expect(checkChapterExamV2Answer(tom, 'too').correct).toBe(false);
});

// 🟡 Ревизора 29.10: поблажка не должна принимать неграмотное и противоположное
test('too only without negation, either only with it; yes against no is wrong', () => {
  expect(checkChapterExamV2Answer(table, 'The table is going to wobble either.').correct).toBe(false);
  expect(checkChapterExamV2Answer(dialogue(['I am not hungry.']), 'I am not hungry too.').correct).toBe(false);
  expect(checkChapterExamV2Answer(dialogue(['Yes, I am.']), 'No, I am.').correct).toBe(false);
  expect(checkChapterExamV2Answer(dialogue(['No, we are early.']), 'Yes, we are early.').correct).toBe(false);
  expect(checkChapterExamV2Answer(dialogue(['Yes, I am.']), 'Yes, I am.').correct).toBe(true);
  // отрицание — по целым словам: notebook не «not»
  expect(checkChapterExamV2Answer(dialogue(['I like the notebook.']), 'I like the notebook either.').correct).toBe(false);
  expect(checkChapterExamV2Answer(dialogue(['I like the notebook.']), 'I like the notebook too.').correct).toBe(true);
  // «нет» перед утвердительным ответом без yes/no в эталоне — неверно
  expect(checkChapterExamV2Answer(dialogue(['I am hungry.']), 'No, I am hungry too.').correct).toBe(false);
  // жалоба владельца (l01c1-08): «I'm hungry too» засчитывается
  expect(checkChapterExamV2Answer(dialogue(['I am hungry.']), "I'm hungry too").correct).toBe(true);
  expect(checkChapterExamV2Answer(dialogue(['I do not like it.']), "No, I don't like it either.").correct).toBe(true);
});

test('the tolerance is only for dialogue items', () => {
  const situation = { ...tom, type: 'situation' } as ChapterExamV2Item;
  expect(checkChapterExamV2Answer(situation, 'Yes, Tom can get dressed.').correct).toBe(false);
  const fix = { ...dialogue(['Tom can get dressed.'], 'Tom can gets dressed.'), type: 'fix' } as ChapterExamV2Item;
  expect(checkChapterExamV2Answer(fix, 'Yes, Tom can get dressed.').correct).toBe(false);
});
