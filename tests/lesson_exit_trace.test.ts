// зачем (§126): запись [LESSON-EXIT] обязана показывать причину и значения, а сбой отправки не должен ронять выход с урока.
const mockTrackActivity = jest.fn();
jest.mock('../app/app_activity', () => ({ trackActivity: (...args: unknown[]) => mockTrackActivity(...args) }));
const mockRecordSupport = jest.fn();
jest.mock('../app/support_diagnostics', () => ({ recordSupportDiagnostic: (...args: unknown[]) => mockRecordSupport(...args) }));

import {
  formatLessonExitTrace, lessonExitSupportAction, resetLessonExitTraceStateForTests, traceLessonExit,
} from '../app/lesson_exit_trace';
import { sanitizeSupportDiagnosticEvent } from '../app/support_diagnostic_schema';

describe('lesson exit trace', () => {
  beforeEach(() => {
    mockTrackActivity.mockReset();
    mockRecordSupport.mockReset();
    mockRecordSupport.mockResolvedValue(undefined);
    mockTrackActivity.mockResolvedValue(undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    resetLessonExitTraceStateForTests();
  });

  // зачем (аудит расходов 11.11): трассы корня (layout:*) срабатывают на КАЖДОМ холодном старте — 3–4 серверных вызова на запуск
  // без единого урока. Уликой они становятся только рядом с выходом из урока; там они обязаны дойти до сервера все.
  describe('трассы корня уходят на сервер только рядом с выходом из урока', () => {
    const sentReasons = () => mockTrackActivity.mock.calls.map((call) => (call[1] as { tags: { reason: string } }).tags.reason);

    it('холодный старт без урока: в консоль и журнал обращений — да, серверной записи — нет', () => {
      traceLessonExit('layout:rootIndex_replace_home', { ready: true });
      traceLessonExit('layout:pathname_root_or_empty', { lastPath: 'null' });
      expect(console.warn).toHaveBeenCalledWith('[LESSON-EXIT] layout:rootIndex_replace_home ready=true');
      expect(mockRecordSupport).toHaveBeenCalledTimes(2);
      expect(mockTrackActivity).not.toHaveBeenCalled();
    });

    it('трасса корня ПЕРЕД выходом из урока досылается вместе с ним, в исходном порядке и с возрастом', () => {
      const now = jest.spyOn(Date, 'now');
      now.mockReturnValue(1_000_000);
      traceLessonExit('layout:pathname_root_or_empty', { lastPath: '/lesson1' });
      now.mockReturnValue(1_000_400);
      traceLessonExit('unmount', { lessonId: 9 });
      expect(sentReasons()).toEqual(['layout:pathname_root_or_empty', 'unmount']);
      expect(mockTrackActivity.mock.calls[0][1]).toEqual(expect.objectContaining({
        writeToFirestore: true,
        tags: { reason: 'layout:pathname_root_or_empty', lastPath: '/lesson1', heldMs: 400 },
      }));
    });

    it('трасса корня сразу ПОСЛЕ выхода из урока уходит без задержки', () => {
      const now = jest.spyOn(Date, 'now');
      now.mockReturnValue(2_000_000);
      traceLessonExit('unmount', { lessonId: 9 });
      now.mockReturnValue(2_030_000);
      traceLessonExit('layout:rootIndex_replace_home', { ready: true });
      expect(sentReasons()).toEqual(['unmount', 'layout:rootIndex_replace_home']);
    });

    it('устаревшие трассы корня (старше окна) с выходом из урока не досылаются', () => {
      const now = jest.spyOn(Date, 'now');
      now.mockReturnValue(3_000_000);
      traceLessonExit('layout:rootIndex_replace_home', { ready: true });
      now.mockReturnValue(3_000_000 + 61_000);
      traceLessonExit('unmount', { lessonId: 9 });
      expect(sentReasons()).toEqual(['unmount']);
    });

    it('придержанных трасс не больше восьми — остаются самые свежие', () => {
      const now = jest.spyOn(Date, 'now');
      now.mockReturnValue(4_000_000);
      for (let i = 0; i < 12; i += 1) traceLessonExit(`layout:step_${i}`, {});
      traceLessonExit('unmount', { lessonId: 9 });
      expect(sentReasons()).toEqual([...Array.from({ length: 8 }, (_, i) => `layout:step_${i + 4}`), 'unmount']);
    });
  });

  it('formats reason and every value that decided the branch', () => {
    expect(formatLessonExitTrace('navigateUp:enter', { lessonId: 9, from: 'lesson_menu', canGoBack: false }))
      .toBe('[LESSON-EXIT] navigateUp:enter lessonId=9 from=lesson_menu canGoBack=false');
  });

  it('writes to console and to activity with the reason in tags', () => {
    traceLessonExit('unmount', { lessonId: 9, cellIndex: 4, exitInFlight: false });
    expect(console.warn).toHaveBeenCalledWith('[LESSON-EXIT] unmount lessonId=9 cellIndex=4 exitInFlight=false');
    expect(mockTrackActivity).toHaveBeenCalledWith('lesson:exit_trace', expect.objectContaining({
      screen: 'lesson1',
      writeToFirestore: true,
      tags: { reason: 'unmount', lessonId: 9, cellIndex: 4, exitInFlight: false },
    }));
  });

  it('a failing activity write is logged and never throws', async () => {
    mockTrackActivity.mockRejectedValueOnce(new Error('offline'));
    expect(() => traceLessonExit('headerBack:exit', { lessonId: 1 })).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    expect(console.warn).toHaveBeenCalledWith('[LESSON-EXIT] trackActivity:catch', 'offline');
  });

  // зачем (жалоба #3, диагностика прод): в журнале обращений была только метка lesson:exit_trace, без причины и id урока
  it('support-журнал получает lesson:exit:<reason>:l<id>: причина и номер урока числом', () => {
    traceLessonExit('headerBack:exit', { lessonId: 12, cellIndex: 3 });
    expect(mockRecordSupport).toHaveBeenCalledWith(expect.objectContaining({
      event: 'feature_action', action: 'lesson:exit:headerBack:exit:l12', screen: '/lesson1', result: 'info', subject: 'app',
    }));
  });

  it('трассы корневого лейаута (layout:*) — экран «/», а не lesson1; без lessonId id в действии нет', () => {
    traceLessonExit('layout:pathname_root_or_empty', { lastPath: '/lesson1' });
    expect(mockRecordSupport).toHaveBeenCalledWith(expect.objectContaining({ action: 'lesson:exit:layout:pathname_root_or_empty', screen: '/' }));
  });

  it('действие всегда проходит белый список сервера и не длиннее 80 знаков, даже с длинной причиной', () => {
    const samples: Array<[string, number | undefined]> = [
      ['unmount', 7], ['navigateUp:enter', 30], ['layout:rootIndex_navigate_home_check', undefined],
      ['layout:deeplink_dev_route_blocked_home', 5], ['a'.repeat(120), 31], ['странная причина с пробелами/и слэшами', 9],
    ];
    for (const [reason, lessonId] of samples) {
      const action = lessonExitSupportAction(reason, lessonId === undefined ? {} : { lessonId });
      expect(action.length).toBeLessThanOrEqual(80);
      expect(/^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$/.test(action)).toBe(true);
      if (lessonId !== undefined) expect(action.endsWith(':l' + lessonId)).toBe(true);
    }
    // клиентский санитайзер повторяет правила сервера: нормальные причины проходят без искажений
    const ok = lessonExitSupportAction('headerBack:exit', { lessonId: 12 });
    expect(sanitizeSupportDiagnosticEvent({ atMs: Date.now(), event: 'feature_action', action: ok, screen: '/lesson1' })?.action).toBe(ok);
  });

  it('сбой записи в журнал обращений не роняет выход и пишет причину', async () => {
    mockRecordSupport.mockRejectedValueOnce(new Error('diag_down'));
    expect(() => traceLessonExit('unmount', { lessonId: 1 })).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    expect(console.warn).toHaveBeenCalledWith('[LESSON-EXIT] supportDiagnostic:catch', 'diag_down');
  });
});
