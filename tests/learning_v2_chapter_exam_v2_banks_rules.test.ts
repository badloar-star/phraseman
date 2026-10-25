// Правила банков экзамена v2 для каждого файла в modules/learning-v2/exam/banks (координатор 25.10): больше 10 заданий (запас на
// пересдачу), на каждую тему ≥ 3 задания и есть эпизоды для повторения, id уникальны, в уроке 1 вопросов нет (знака «?» нет ни в
// репликах, ни в ответах), у каждого задания есть что показать (ситуация / реплика / фраза с ошибкой). Слова эпизодов проверяет
// отдельный сторож owner_locks_exam_episode_words. Подключение банков к приложению — только по слову координатора.
import fs from 'node:fs';
import path from 'node:path';
import type { ChapterExamV2Bank } from '../modules/learning-v2/exam/chapter_exam_v2';
import { CHAPTER_EXAM_V2_QUESTION_COUNT, selectChapterExamV2Items } from '../modules/learning-v2/exam/chapter_exam_v2';

const BANKS_DIR = path.join(__dirname, '..', 'modules/learning-v2/exam/banks');
const banks = fs.readdirSync(BANKS_DIR).filter((f) => /^chapter_exam_v2_.*\.ts$/.test(f)).map((file) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require(path.join(BANKS_DIR, file)) as Record<string, unknown>;
  const bank = Object.values(mod).find((v): v is ChapterExamV2Bank => !!v && typeof v === 'object' && Array.isArray((v as ChapterExamV2Bank).items));
  if (!bank) throw new Error(`в ${file} нет банка`);
  return [file, bank] as const;
});

beforeAll(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); jest.spyOn(console, 'warn').mockImplementation(() => undefined); });

describe('банки экзамена v2: правила', () => {
  it('банков три: урок 1, главы 1–3', () => {
    expect(banks.map(([, b]) => `${b.lessonOrdinal}:${b.chapterOrdinal}`).sort()).toEqual(['1:1', '1:2', '1:3']);
  });

  it.each(banks)('%s: запас, темы, уникальность, без вопросов, есть что показать', (_file, bank) => {
    expect(bank.items.length).toBeGreaterThan(CHAPTER_EXAM_V2_QUESTION_COUNT);
    expect(new Set(bank.items.map((i) => i.id)).size).toBe(bank.items.length);
    for (const point of bank.grammarPoints) {
      expect(bank.items.filter((i) => i.grammarPoint === point.id).length).toBeGreaterThanOrEqual(3);
      expect(point.episodeOrdinals.length).toBeGreaterThan(0);
      expect(point.label.ru && point.label.uk).toBeTruthy();
    }
    for (const item of bank.items) {
      expect(bank.grammarPoints.some((p) => p.id === item.grammarPoint)).toBe(true);
      expect(item.accepted.length).toBeGreaterThan(0);
      expect(item.partnerLine ?? '').not.toContain('?');
      for (const a of item.accepted) expect(a).not.toContain('?');
      if (item.type === 'situation') expect(item.situation?.ru && item.situation?.uk).toBeTruthy();
      if (item.type === 'dialogue') expect(item.partnerLine && item.situation?.ru && item.situation?.uk).toBeTruthy();
      if (item.type === 'fix') expect(item.wrong).toBeTruthy();
    }
    const picked = selectChapterExamV2Items(bank, { examKey: `en:lesson-01:chapter-${bank.chapterOrdinal}`, attempt: 1 });
    expect(new Set(picked?.map((i) => i.grammarPoint))).toEqual(new Set(bank.grammarPoints.map((p) => p.id)));
  });

  it('в приложении подключена только глава 2 (главы 1 и 3 — на чтение владельцу, до слова координатора)', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app/learning_v2_chapter_exam_v2.ts'), 'utf8');
    const map = src.match(/const BANKS: ReadonlyMap<string, ChapterExamV2Bank> = new Map\(\[([\s\S]*?)\]\);/)?.[1] ?? '';
    expect(map.match(/`\d+:\d+`/g)).toEqual(['`1:2`']);
    expect(src).not.toMatch(/chapter_exam_v2_l01_c1|chapter_exam_v2_l01_c3/);
  });
});
