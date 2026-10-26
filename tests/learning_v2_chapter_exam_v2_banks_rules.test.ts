// Правила банков экзамена v2 для каждого файла в modules/learning-v2/exam/banks (координатор 25.10): больше 10 заданий (запас на
// пересдачу), на каждую тему ≥ 3 задания и есть эпизоды для повторения, id уникальны, в уроке 1 вопросов нет (знака «?» нет ни в
// репликах, ни в ответах), у каждого задания есть что показать (ситуация / реплика / фраза с ошибкой). Слова эпизодов проверяет
// отдельный сторож owner_locks_exam_episode_words. Подключение — в реестрах banks/registry_*.ts (слово владельца 26.10: все уроки и главы
// в 2.0.3; каждая сессия подключает в своём реестре, когда оба сторожа зелёные). Файл банка без подключения — черновик, правила к нему те же.
import fs from 'node:fs';
import path from 'node:path';
import type { ChapterExamV2Bank } from '../modules/learning-v2/exam/chapter_exam_v2';
import { CHAPTER_EXAM_V2_QUESTION_COUNT, selectChapterExamV2Items } from '../modules/learning-v2/exam/chapter_exam_v2';
import { CHAPTER_EXAM_V2_BANKS, CHAPTER_EXAM_V2_BANK_REGISTRIES } from '../modules/learning-v2/exam/banks';

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
  it('у каждого файла банка своя глава — ключ «урок:глава» не повторяется', () => {
    const keys = banks.map(([, b]) => `${b.lessonOrdinal}:${b.chapterOrdinal}`);
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
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
    const picked = selectChapterExamV2Items(bank, { examKey: `en:lesson-${String(bank.lessonOrdinal).padStart(2, '0')}:chapter-${bank.chapterOrdinal}`, attempt: 1 });
    expect(new Set(picked?.map((i) => i.grammarPoint))).toEqual(new Set(bank.grammarPoints.map((p) => p.id)));
  });

  // слово владельца 26.10: банки всех уроков — в 2.0.3; подключение — в реестрах сессий, общий индекс собирает их
  it('каждый подключённый банк — объект из файла банка в папке, ключи подключённых не повторяются', () => {
    const fileBanks = new Set<ChapterExamV2Bank>(banks.map(([, b]) => b));
    for (const bank of CHAPTER_EXAM_V2_BANKS) expect(fileBanks.has(bank)).toBe(true);
    const keys = CHAPTER_EXAM_V2_BANKS.map((b) => `${b.lessonOrdinal}:${b.chapterOrdinal}`);
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
    expect(keys).toEqual(expect.arrayContaining(['1:1', '1:2', '1:3']));
    // банк лежит в реестре своего диапазона уроков (registry_l04_l07 → уроки 4–7)
    for (const [range, list] of Object.entries(CHAPTER_EXAM_V2_BANK_REGISTRIES)) {
      const [from, to] = range.split('_').map((p) => Number(p.slice(1)));
      for (const b of list) expect(b.lessonOrdinal >= from && b.lessonOrdinal <= to).toBe(true);
    }
  });

  it('индекс собирает все реестры папки, приложение берёт банки из индекса', () => {
    const registries = fs.readdirSync(BANKS_DIR).filter((f) => /^registry_l\d\d_l\d\d\.ts$/.test(f)).map((f) => f.slice('registry_'.length, -3)).sort();
    expect(Object.keys(CHAPTER_EXAM_V2_BANK_REGISTRIES).sort()).toEqual(registries);
    const app = fs.readFileSync(path.join(__dirname, '..', 'app/learning_v2_chapter_exam_v2.ts'), 'utf8');
    expect(app).toContain("import { CHAPTER_EXAM_V2_BANKS } from '../modules/learning-v2/exam/banks';");
    expect(app).not.toContain("from '../modules/learning-v2/exam/banks/chapter_exam_v2_");
  });
});
