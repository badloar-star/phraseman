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
  expect(checkChapterExamV2Answer(table, 'The table is going to wobble either.').correct).toBe(true);
  expect(checkChapterExamV2Answer(dialogue(['I am not hungry.']), 'No, I am not hungry either.').correct).toBe(true);
});

test('a wrong core stays wrong whatever the tail or prefix', () => {
  expect(checkChapterExamV2Answer(tom, 'Yes, Tom can dressed too.').correct).toBe(false);
  expect(checkChapterExamV2Answer(hungry, 'Yes, I hungry too.').correct).toBe(false);
  expect(checkChapterExamV2Answer(table, 'No, the table is going to break too.').correct).toBe(false);
  expect(checkChapterExamV2Answer(tom, 'Yes').correct).toBe(false);
  expect(checkChapterExamV2Answer(tom, 'too').correct).toBe(false);
});

test('the tolerance is only for dialogue items', () => {
  const situation = { ...tom, type: 'situation' } as ChapterExamV2Item;
  expect(checkChapterExamV2Answer(situation, 'Yes, Tom can get dressed.').correct).toBe(false);
  const fix = { ...dialogue(['Tom can get dressed.'], 'Tom can gets dressed.'), type: 'fix' } as ChapterExamV2Item;
  expect(checkChapterExamV2Answer(fix, 'Yes, Tom can get dressed.').correct).toBe(false);
});
