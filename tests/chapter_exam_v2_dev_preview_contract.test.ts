// зачем (координатор 25.10, склейка Сверки): dev-ссылка /dev_chapter_exam_v2_preview даёт каждое состояние экзамена v2 главы 1–3 без прохождения
// экзамена на тестовом аккаунте. Сторож: каждое состояние даёт свою фазу и данные из настоящего банка; бой dev-снимок не передаёт и пресеты не
// импортирует; маршрут вне dev уводит на Главную.
import fs from 'node:fs';
import path from 'node:path';

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { CHAPTER_EXAM_V2_DEV_STATES, chapterExamV2DevPreset, isChapterExamV2DevState } from '../components/learning-v2/exam_v2/chapter_exam_v2_dev_presets';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('dev-превью экзамена главы v2', () => {
  it('состояния: известные проходят, чужие — нет', () => {
    expect(isChapterExamV2DevState('result_pass')).toBe(true);
    expect(isChapterExamV2DevState('lobby')).toBe(false);
    expect(isChapterExamV2DevState(undefined)).toBe(false);
  });

  it.each([1, 2, 3])('глава %i: каждое состояние даёт снимок из банка', (chapter) => {
    for (const state of CHAPTER_EXAM_V2_DEV_STATES) {
      const p = chapterExamV2DevPreset(state, chapter);
      expect(p).not.toBeNull();
      expect(p!.bank.chapterOrdinal).toBe(chapter);
    }
    const at = (s: (typeof CHAPTER_EXAM_V2_DEV_STATES)[number]) => chapterExamV2DevPreset(s, chapter)!;
    const current = (s: Parameters<typeof at>[0]) => at(s).attempt!.items[at(s).index]!;

    expect(at('start')).toMatchObject({ phase: 'question', index: 0, answers: [], initialAnswerText: null });
    expect(current('situation').type).toBe('situation');
    expect(at('situation_write').writeMode).toBe(true);
    expect(current('dialogue').type).toBe('dialogue');
    expect(current('fix').type).toBe('fix');
    // прогресс как на середине экзамена: предыдущие вопросы отвечены
    expect(at('fix').answers).toHaveLength(at('fix').index);

    expect(at('answer_correct').initialAnswerText).toBe(current('answer_correct').accepted[0]);
    expect(at('answer_wrong').initialAnswerText).toBe(current('answer_wrong').wrong);
    expect(at('answer_typo').initialAnswerText).not.toBe(current('answer_typo').accepted[0]);

    expect(at('result_pass')).toMatchObject({ phase: 'result', reward: 40, outcome: { result: { correct: 9, total: 10, passed: true }, retryMinutes: null } });
    expect(at('result_pass').outcome!.startEpisode).toBe(chapter * 8 + 1);
    expect(at('result_fail')).toMatchObject({ phase: 'result', reward: null, outcome: { result: { correct: 6, total: 10, passed: false }, retryMinutes: 59 } });
    expect(at('result_fail').outcome!.result.weakPoints.length).toBeGreaterThan(0);
    expect(at('mistakes').phase).toBe('mistakes');
    expect(at('review')).toMatchObject({ phase: 'review' });
    expect(at('review').review!.episodes.length).toBeGreaterThan(0);
    // пауза пересдачи: попытки нет, сразу повтор тем, как prepareChapterExamV2 → cooldown
    expect(at('cooldown')).toMatchObject({ attempt: null, phase: 'review', outcome: { retryMinutes: 59 } });
  });

  it('бой не передаёт dev-снимок и не импортирует пресеты; маршрут вне dev уводит на Главную', () => {
    const live = read('app/learning-v2/chapter-exam.tsx');
    expect(live).not.toMatch(/devPreset|chapter_exam_v2_dev_presets/);
    const run = read('components/learning-v2/exam_v2/ChapterExamV2Run.tsx');
    expect(run).toMatch(/if \(!attempt \|\| phase !== 'question' \|\| devPreset\) return;/);
    expect(run).toMatch(/if \(devPreset\) \{[\s\S]{0,300}return;\s*\}\s*void start\('open'\);/);
    const route = read('app/dev_chapter_exam_v2_preview.tsx');
    expect(route).toContain("if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) return <Redirect href=\"/\" />;");
    expect(path.basename('app/dev_chapter_exam_v2_preview.tsx')).toMatch(/^dev_/);
  });
});
