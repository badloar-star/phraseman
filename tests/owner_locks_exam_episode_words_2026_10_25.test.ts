// ЗАМОК ВЛАДЕЛЬЦА 25.10: «в каждом экзамене всегда должны быть слова, которые встречались в эпизодах перед этим экзаменом, и формы
// речи тоже!». Фразы экзамена новые по ситуации, но каждое английское слово реплики, фразы с ошибкой и принятых ответов уже было в
// эпизодах до экзамена (словарь — из выпуска курса). Незнакомое слово → красный с перечнем. Исключения (имена собственные,
// интернациональные слова) — только явным списком ниже, с причиной.
import fs from 'node:fs';
import path from 'node:path';
import type { ChapterExamV2Bank } from '../modules/learning-v2/exam/chapter_exam_v2';
import {
  chapterExamV2LastEpisodeOrdinal,
  collectEpisodeVocabularyV1,
  findChapterExamV2UnknownWords,
} from '../modules/learning-v2/exam/chapter_exam_v2_vocabulary';

const ROOT = path.join(__dirname, '..');
const BANKS_DIR = path.join(ROOT, 'modules/learning-v2/exam/banks');
const RELEASE_DIR = path.join(ROOT, 'content/learning-v2-course/release/en');
// Исключения: слово → причина. Сейчас пусто — в банке главы 2 нет ни имён, ни интернациональных слов.
const EXCEPTIONS: Readonly<Record<string, string>> = {};

function episodeDocs(lessonOrdinal: number, lastEpisode: number): unknown[] {
  const lessonDir = path.join(RELEASE_DIR, `l${String(lessonOrdinal).padStart(2, '0')}`);
  const docs: unknown[] = [];
  for (let episode = 1; episode <= lastEpisode; episode += 1) {
    const dir = path.join(lessonDir, `s${String(episode).padStart(2, '0')}`);
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) docs.push(JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
  }
  return docs;
}

function loadBanks(): { file: string; bank: ChapterExamV2Bank }[] {
  return fs.readdirSync(BANKS_DIR).filter((f) => /^chapter_exam_v2_.*\.ts$/.test(f)).map((file) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(path.join(BANKS_DIR, file)) as Record<string, unknown>;
    const bank = Object.values(mod).find((v): v is ChapterExamV2Bank => !!v && typeof v === 'object' && Array.isArray((v as ChapterExamV2Bank).items));
    if (!bank) throw new Error(`в ${file} нет банка`);
    return { file, bank };
  });
}

describe('замок 25.10: в экзамене только слова из эпизодов до него', () => {
  const banks = loadBanks();

  it('банки есть', () => {
    expect(banks.length).toBeGreaterThan(0);
  });

  it.each(banks.map((b) => [b.file, b.bank] as const))('%s: незнакомых слов нет', (_file, bank) => {
    const lastEpisode = chapterExamV2LastEpisodeOrdinal(bank);
    const known = collectEpisodeVocabularyV1(episodeDocs(bank.lessonOrdinal, lastEpisode));
    expect(known.size).toBeGreaterThan(30); // словарь построился, а не пуст из-за сменившейся схемы выпуска
    const misses = findChapterExamV2UnknownWords(bank, known, new Set(Object.keys(EXCEPTIONS)));
    expect(misses.map((m) => `${m.itemId} ${m.field} «${m.text}»: ${m.words.join(', ')}`)).toEqual([]);
  });

  it('сторож ловит незнакомое слово и чужую форму', () => {
    const known = collectEpisodeVocabularyV1([{ targetPhrase: 'I am ready.' }, { intro: 'Скажи: You are kind.' }]);
    const bank: ChapterExamV2Bank = {
      lessonOrdinal: 1, chapterOrdinal: 2, grammarPoints: [],
      items: [{ id: 'x', type: 'dialogue', grammarPoint: 'p', partnerLine: "You're ready.", accepted: ['I am ready.', 'Yes, I am ready.'] }],
    };
    expect(findChapterExamV2UnknownWords(bank, known)).toEqual([
      expect.objectContaining({ itemId: 'x', field: 'partnerLine', words: ["you're"] }),
      expect.objectContaining({ itemId: 'x', field: 'accepted', words: ['yes'] }),
    ]);
  });

  // урок 3 (a / an): словарь эпизодов не хранит одиночные буквы — «a» в варианте ответа не должно краснеть, а незнакомое слово — должно
  it('«a» в варианте ответа — не незнакомое слово', () => {
    const known = collectEpisodeVocabularyV1([{ targetPhrase: 'It is a key.' }, { targetPhrase: "It's a lock." }]);
    const bank: ChapterExamV2Bank = {
      lessonOrdinal: 3, chapterOrdinal: 1, grammarPoints: [],
      items: [{ id: 'y', type: 'situation', grammarPoint: 'p', accepted: ['It is a key.', "It's a key.", "It's a door."] }],
    };
    expect(findChapterExamV2UnknownWords(bank, known)).toEqual([expect.objectContaining({ itemId: 'y', field: 'accepted', words: ['door'] })]);
  });

  // координатор 26.10 (сигналы Переводчика и Макетов): ложные блокировки сокращений и притяжательного ’s — сторож не ослаблен
  const one = (accepted: string[], partnerLine?: string): ChapterExamV2Bank => ({
    lessonOrdinal: 9, chapterOrdinal: 1, grammarPoints: [], items: [{ id: 'z', type: 'dialogue', grammarPoint: 'p', partnerLine, accepted }],
  });

  it('сокращение в запасном ответе знакомо, если в эпизодах была его полная форма; незнакомая полная форма — красная', () => {
    const known = collectEpisodeVocabularyV1([{ targetPhrase: 'She does not like tea.' }, { targetPhrase: 'You need not wait. You must not run.' }]);
    expect(findChapterExamV2UnknownWords(one(['She does not like tea.', "She doesn't like tea.", "You needn't wait.", "You mustn't run."]), known)).toEqual([]);
    expect(findChapterExamV2UnknownWords(one(['She does not like tea.', "She shouldn't run."]), known))
      .toEqual([expect.objectContaining({ field: 'accepted', words: ["shouldn't"] })]);
  });

  it('эталон — по точной форме: сокращения, которого не было в эпизодах, в эталоне быть не может', () => {
    const known = collectEpisodeVocabularyV1([{ targetPhrase: 'She does not like tea.' }]);
    expect(findChapterExamV2UnknownWords(one(["She doesn't like tea."]), known)).toEqual([expect.objectContaining({ field: 'reference', words: ["doesn't"] })]);
  });

  it('притяжательное ’s знакомо, если были основа и хоть одно притяжательное ’s (или само слово с ’s); it’s — не притяжательное', () => {
    const known = collectEpisodeVocabularyV1([{ targetPhrase: 'This is Tom. It is my sister’s bag.' }]);
    expect(findChapterExamV2UnknownWords(one(['It is Tom’s bag.'], 'Is it Tom’s bag?'), known)).toEqual([]);
    expect(findChapterExamV2UnknownWords(one(['It is Ann’s bag.']), known)).toEqual([expect.objectContaining({ words: ["ann's"] })]);
    const noPossessive = collectEpisodeVocabularyV1([{ targetPhrase: 'This is Tom. It is a bag.' }]);
    expect(findChapterExamV2UnknownWords(one(['It is Tom’s bag.']), noPossessive)).toEqual([expect.objectContaining({ words: ["tom's"] })]);
  });
});
