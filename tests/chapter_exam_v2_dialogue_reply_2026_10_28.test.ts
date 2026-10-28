// Сторож «ответь собеседнику» в экзаменах глав v2 (координатор 28.10, жалоба пользователя): реплика «I am hungry.», задание «Скажи,
// что ты тоже голоден» — эталон был «I am hungry.», а «I'm hungry too» не засчитывался. Правила для каждого задания type: 'dialogue':
// 1) эталон (accepted[0] — его экран показывает как «правильно») не повторяет реплику собеседника дословно;
// 2) если ответ просят со словом «тоже» («Скажи, что ты тоже…»), эталон содержит too / either / also, а «тоже» из фона сцены
//    («Ты тоже хочешь поиграть. Скажи, что…») не в счёт.
import fs from 'node:fs';
import path from 'node:path';
import type { ChapterExamV2Bank } from '../modules/learning-v2/exam/chapter_exam_v2';
import { checkChapterExamV2Answer, normalizeChapterExamV2Answer } from '../modules/learning-v2/exam/chapter_exam_v2';

const BANKS_DIR = path.join(__dirname, '..', 'modules/learning-v2/exam/banks');
const dialogues = fs.readdirSync(BANKS_DIR).filter((f) => /^chapter_exam_v2_.*\.ts$/.test(f)).flatMap((file) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(path.join(BANKS_DIR, file)) as Record<string, unknown>;
  const bank = Object.values(mod).find((v): v is ChapterExamV2Bank => !!v && typeof v === 'object' && Array.isArray((v as ChapterExamV2Bank).items));
  return (bank?.items ?? []).filter((i) => i.type === 'dialogue');
});

// зачем: \b в JS не видит границ кириллических слов — граница задаётся явно; «тоже» считается только в придаточном «, что …»
const TOO_IN_ANSWER_RU = /,\s*что[^.!?]*(?:^|[^а-яё])тоже(?:[^а-яё]|$)/i;
const TOO_EN = /\b(too|also|either|neither)\b/;

describe('экзамен v2, «ответь собеседнику»: эталон отвечает на задание', () => {
  it('диалогов достаточно, чтобы сторож что-то проверял', () => {
    expect(dialogues.length).toBeGreaterThan(500);
  });

  it('эталон не повторяет реплику собеседника дословно', () => {
    const echo = dialogues
      .filter((i) => i.partnerLine && normalizeChapterExamV2Answer(i.accepted[0] ?? '') === normalizeChapterExamV2Answer(i.partnerLine))
      .map((i) => `${i.id}: ${i.partnerLine}`);
    expect(echo).toEqual([]);
  });

  it('«скажи, что ты тоже…» — эталон с too / either', () => {
    const missing = dialogues
      .filter((i) => TOO_IN_ANSWER_RU.test(i.situation?.ru ?? '') && !TOO_EN.test(normalizeChapterExamV2Answer(i.accepted[0] ?? '')))
      .map((i) => `${i.id}: ${i.situation?.ru} → ${i.accepted[0]}`);
    expect(missing).toEqual([]);
  });

  // зачем: too в уроке 1 ещё не было (замок слов 25.10) — задание переписано: друг не голоден, а ты голоден; эхо реплики исчезло
  it('жалоба пользователя: урок 1 — эталон не эхо, «I\'m hungry» засчитывается', () => {
    const item = dialogues.find((i) => i.id === 'l01c1-08');
    expect(item?.partnerLine).toBe('I am not hungry.');
    expect(checkChapterExamV2Answer(item!, "I'm hungry").correct).toBe(true);
  });

  it('где too уже было в уроке — засчитывается и с too, и без', () => {
    const item = dialogues.find((i) => i.id === 'l25c7-10');
    for (const answer of ["I was astonished by the price yesterday too", 'I was astonished by the price yesterday.']) {
      expect(checkChapterExamV2Answer(item!, answer).correct).toBe(true);
    }
  });
});
