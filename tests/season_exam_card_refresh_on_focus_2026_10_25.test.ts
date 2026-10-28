// Жалоба №17 (координатор 25.10): после сдачи экзамена и возврата на «Сезон» карточка экзамена до перезапуска звала
// «Сдать экзамен» — записи экзаменов читались только при смене урока. Теперь — и при возврате фокуса, из памяти хранилища
// (итог экзамена кладёт запись туда сразу), без сети. Цепочка: запись «сдан» → чтение после фокуса → карточка «done».
import fs from 'node:fs';
import path from 'node:path';

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: (k: string) => Promise.resolve(mockStore.get(k) ?? null),
    setItem: (k: string, v: string) => { mockStore.set(k, v); return Promise.resolve(); },
    multiSet: (pairs: [string, string][]) => { for (const [k, v] of pairs) mockStore.set(k, v); return Promise.resolve(); },
  },
}));
jest.mock('../app/account_owner_change', () => ({ onAccountOwnerChanged: () => undefined }));

import { loadLearningV2ChapterExamRecordsV1, saveLearningV2ChapterExamRecordV1 } from '../app/learning_v2_chapter_exam_store_v1';
import { learningV2PassedChaptersV1 } from '../app/learning_v2_chapter_exam_v1';
import { buildSeasonDeck } from '../components/learning-v2/season/season_course_model';
import type { LearningV2CourseAccordionRowV1 } from '../modules/learning-v2/map/course_accordion_map_model_v1';

const SCOPE = 'd'.repeat(64);
const rows: LearningV2CourseAccordionRowV1[] = Array.from({ length: 16 }, (_, k) => ({
  kind: 'session' as const,
  id: `lesson-1:session:${k + 1}`,
  lessonOrdinal: 1,
  sessionOrdinal: k + 1,
  chapterOrdinal: k < 8 ? 1 : 2,
  positionInChapter: (k % 8) + 1,
  role: 'core' as never,
  state: k < 7 ? 'completed' as const : k === 7 ? 'open' as const : k === 8 ? 'current' as const : 'locked' as const,
}));
const examCard = (passed: ReadonlySet<number>) =>
  buildSeasonDeck(rows, { includeExam: true, examAvailableWhenReached: true, examPassedChapters: passed }).cards.find((c) => c.kind === 'exam' && c.chapterOrdinal === 1);

beforeEach(() => {
  mockStore.clear();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('карточка экзамена в «Сезоне» после возврата с экзамена', () => {
  it('до сдачи — «Сдать экзамен» (current); запись «сдан» читается сразу из памяти — карточка «done» без перезапуска', async () => {
    const before = await loadLearningV2ChapterExamRecordsV1(SCOPE);
    expect(examCard(new Set(learningV2PassedChaptersV1(before, 'en', 1).keys()))?.state).toBe('current');
    // итог экзамена пишет запись (так делает finishLearningV2ChapterExamWithResultV1)
    await saveLearningV2ChapterExamRecordV1(SCOPE, { examKey: 'en:lesson-01:chapter-1', status: 'passed', passedCorrect: 9, lastCorrect: 9, attempts: 1, lastFinishedAtMs: 1, retryAtMs: null });
    // возврат фокуса: эффект «Сезона» читает записи снова — из памяти, мгновенно
    const after = await loadLearningV2ChapterExamRecordsV1(SCOPE);
    expect(examCard(new Set(learningV2PassedChaptersV1(after, 'en', 1).keys()))?.state).toBe('done');
  });

  it('эффект чтения записей перезапускается при возврате фокуса экрана, а не только при смене урока', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components/learning-v2/season/SeasonCourseConnected.tsx'), 'utf8').replace(/\r\n/g, '\n');
    const at = src.indexOf('const examScreenFocused = useIsScreenFocused();');
    expect(at).toBeGreaterThan(0);
    const effect = src.slice(at, src.indexOf('const examPassedChapters', at));
    expect(effect).toContain('if (!examScreenFocused) return undefined;');
    expect(effect).toContain('loadLearningV2ChapterExamRecordsV1(');
    // перепин 28.10 (82cfea233): эффект ещё и выключен для курса без экзаменов (es) — зависимость chapterExamsEnabled
    expect(effect).toContain('if (!chapterExamsEnabled) return undefined;');
    expect(effect).toMatch(/\}, \[chapterExamsEnabled, examScreenFocused, lesson\]\);/);
    expect(effect).not.toMatch(/firebase|getDoc|onSnapshot|fetch\(/);
  });
});
