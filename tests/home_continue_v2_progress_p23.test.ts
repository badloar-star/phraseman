// зачем (координатор 15.10, поправка 1 к P23): карточка «Продолжить» считает «пройдено / выпущено» при показе из локального
// прогресса курса — только выпущенные занятия своего урока, пройденные из других уроков не в счёт; ошибка склада не прячет карточку.
const mockLoad = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: {} }));
jest.mock('../app/account_owner_change', () => ({ onAccountOwnerChanged: () => undefined }));
jest.mock('../app/learning_v2_visibility_switch', () => ({ LEARNING_V2_HIDDEN: false, logLearningV2Hidden: () => undefined }));
jest.mock('../modules/learning-v2/content/factory_native/factory_native_catalog_v1', () => ({
  factoryNativeLearningV2AvailabilityV1: () => ({
    sessions: [1, 2, 3, 4, 5].map((s) => ({ lessonOrdinal: 1, sessionOrdinal: s, courseSessionId: `l1:s${s}` }))
      .concat([{ lessonOrdinal: 2, sessionOrdinal: 1, courseSessionId: 'l2:s1' }]),
  }),
}));
// выпущены первые 4 занятия урока 1
jest.mock('../app/learning_v2_session_availability_v1', () => ({ isLearningV2SessionReleasedV1: (l: number, s: number) => l === 1 && s <= 4 }));
jest.mock('../modules/learning-v2/progress/course_local_progress_v1', () => ({ createLearningV2CourseLocalProgressStoreV1: () => ({ load: mockLoad }) }));
jest.mock('../modules/learning-v2/progress/progress_account_scope', () => ({ deriveLocalOfflineProgressAccountScopeHash: () => 'scope' }));
jest.mock('../app/stable_id', () => ({ getStableId: () => Promise.resolve('sid') }));
jest.mock('../app/account_generation', () => ({ withAccountTransitionLock: <T,>(work: () => Promise<T>) => work() }));

import { loadHomeContinueV2Progress, peekHomeContinueV2Progress, resetHomeContinueV2ProgressForTests } from '../app/learning_v2_home_continue_route';

describe('P23 · прогресс урока V2 для карточки «Продолжить»', () => {
  beforeEach(() => { resetHomeContinueV2ProgressForTests(); mockLoad.mockReset(); jest.spyOn(console, 'log').mockImplementation(() => undefined); jest.spyOn(console, 'warn').mockImplementation(() => undefined); });

  it('считает только выпущенные занятия своего урока', async () => {
    mockLoad.mockResolvedValue({ completedSessionIds: ['l1:s1', 'l1:s2', 'l1:s5', 'l2:s1'], currentSessionId: 'l1:s3' });
    await expect(loadHomeContinueV2Progress(1)).resolves.toEqual({ lessonOrdinal: 1, done: 2, total: 4 });
    expect(peekHomeContinueV2Progress(1)).toEqual({ lessonOrdinal: 1, done: 2, total: 4 });
  });

  it('после пройденного занятия число свежее (метка не нужна)', async () => {
    mockLoad.mockResolvedValueOnce({ completedSessionIds: ['l1:s1'], currentSessionId: 'l1:s2' });
    await loadHomeContinueV2Progress(1);
    mockLoad.mockResolvedValueOnce({ completedSessionIds: ['l1:s1', 'l1:s2'], currentSessionId: 'l1:s3' });
    await expect(loadHomeContinueV2Progress(1)).resolves.toMatchObject({ done: 2, total: 4 });
  });

  it('склад не прочитался — null и причина в журнале, память не портится', async () => {
    mockLoad.mockRejectedValue(new Error('disk'));
    await expect(loadHomeContinueV2Progress(1)).resolves.toBeNull();
    expect(peekHomeContinueV2Progress(1)).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('[HOME-CONTINUE] progress'));
  });
});

// зачем (R64, координатор 15.10): карточка «Продолжить» V2 стоит заготовкой, пока прогресс не прочитан (continueCardPending). Ожидание обязано
// кончиться: при сбое склада — прошлое значение из памяти, а без него 0/0, иначе человек навсегда остался бы без «Продолжить».
import { act as act64, renderHook as renderHook64 } from '@testing-library/react-native';
import { useHomeContinueV2Progress } from '../app/learning_v2_home_continue_route';

describe('R64 · ожидание прогресса карточки V2 всегда заканчивается', () => {
  beforeEach(() => { resetHomeContinueV2ProgressForTests(); mockLoad.mockReset(); });

  it('склад не прочитался и памяти нет → 0 из 0, карточка появляется', async () => {
    mockLoad.mockRejectedValue(new Error('disk'));
    const hook = await renderHook64(() => useHomeContinueV2Progress(1, 0, true));
    await act64(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(hook.result.current).toEqual({ lessonOrdinal: 1, done: 0, total: 0 });
  });

  it('склад не прочитался, но в памяти есть прошлое значение → оно и остаётся', async () => {
    mockLoad.mockResolvedValueOnce({ completedSessionIds: ['l1:s1'], currentSessionId: 'l1:s2' });
    await loadHomeContinueV2Progress(1);
    mockLoad.mockRejectedValue(new Error('disk'));
    const hook = await renderHook64(() => useHomeContinueV2Progress(1, 1, true));
    await act64(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(hook.result.current).toMatchObject({ done: 1, total: 4 });
  });

  it('заготовка на Главной держит место, пока прогресс V2 читается', () => {
    const home = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'app', '(tabs)', 'home.tsx'), 'utf8') as string;
    expect(home).toContain('const continueCardPending = (!continueResolved || continueV2 !== null) && homeLearnVisible && !priorityCardVisible;');
    expect(home).toContain('const priorityCardVisible = (continueV2 ? continueV2Progress !== null : lastLesson !== null) && homeLearnVisible;');
  });
});
