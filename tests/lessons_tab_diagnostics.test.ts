// зачем (координатор 28.10, отчёт по сборке 147): причина ухода с вкладки «Уроки» и время первого кадра попадают в журнал обращений («Поддержка» →
// админка), а не в console, которой в релизе нет. Здесь: корзины, дедупликация, протухшая метка, и главное — действия проходят белый список сервера.
import fs from 'node:fs';
import path from 'node:path';

const mockRecord = jest.fn(async (_event: unknown) => undefined);
jest.mock('../app/support_diagnostics', () => ({ recordSupportDiagnostic: (event: unknown) => mockRecord(event) }));

import {
  lessonsFirstFrameBucket,
  noteLessonsFirstFrame,
  noteLessonsLeave,
  noteLessonsOpenStart,
  resetLessonsTabDiagnosticsForTests,
  type LessonsLeaveReason,
} from '../app/lessons_tab_diagnostics';
import { sanitizeSupportDiagnosticEvent } from '../app/support_diagnostic_schema';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

describe('lessons tab diagnostics', () => {
  let logSpy: jest.SpyInstance;
  beforeEach(() => {
    mockRecord.mockClear();
    resetLessonsTabDiagnosticsForTests();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => logSpy.mockRestore());

  it('корзины первого кадра: <1с, 1–3с, 3–8с, >8с', () => {
    expect(lessonsFirstFrameBucket(0)).toBe('lt1s');
    expect(lessonsFirstFrameBucket(999)).toBe('lt1s');
    expect(lessonsFirstFrameBucket(1000)).toBe('1to3s');
    expect(lessonsFirstFrameBucket(2999)).toBe('1to3s');
    expect(lessonsFirstFrameBucket(3000)).toBe('3to8s');
    expect(lessonsFirstFrameBucket(7999)).toBe('3to8s');
    expect(lessonsFirstFrameBucket(8000)).toBe('gt8s');
    expect(lessonsFirstFrameBucket(30000)).toBe('gt8s');
  });

  it('первый кадр: тап → событие с корзиной и durationMs, метка расходуется один раз', () => {
    noteLessonsOpenStart('home_tile', 10_000);
    noteLessonsFirstFrame(12_500);
    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockRecord.mock.calls[0]![0]).toMatchObject({ event: 'feature_action', action: 'lessons:first_frame_ms:1to3s', screen: '/lessons', durationMs: 2500 });
    noteLessonsFirstFrame(13_000);
    expect(mockRecord).toHaveBeenCalledTimes(1);
  });

  it('без метки тапа или с протухшей меткой события нет, причина в журнале', () => {
    noteLessonsFirstFrame(5_000);
    expect(mockRecord).not.toHaveBeenCalled();
    noteLessonsOpenStart('tab_bar', 1_000);
    noteLessonsFirstFrame(1_000 + 31_000);
    expect(mockRecord).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('метка тапа протухла'), expect.any(String));
  });

  it('уход: явная причина пишется, повтор в секунду и неявный tab_switch следом — нет', () => {
    noteLessonsLeave('back_button', { page: 'v2' }, 50_000);
    noteLessonsLeave('back_button', { page: 'v2' }, 50_400);
    noteLessonsLeave('tab_switch', { visible: false }, 50_600);
    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockRecord.mock.calls[0]![0]).toMatchObject({ event: 'feature_action', action: 'lessons:leave:back_button', screen: '/lessons' });
    noteLessonsLeave('tab_switch', {}, 60_000);
    expect(mockRecord).toHaveBeenCalledTimes(2);
    expect(mockRecord.mock.calls[1]![0]).toMatchObject({ action: 'lessons:leave:tab_switch' });
  });

  it('все действия проходят клиентский санитайзер, а он повторяет белый список сервера safeDiagnosticAction', () => {
    const reasons: LessonsLeaveReason[] = ['hidden_tab_redirect', 'back_button', 'tab_bar_tap', 'route_param', 'tab_switch'];
    const actions = [
      ...reasons.map((r) => `lessons:leave:${r}`),
      ...['lt1s', '1to3s', '3to8s', 'gt8s'].map((b) => `lessons:first_frame_ms:${b}`),
    ];
    for (const action of actions) {
      expect(sanitizeSupportDiagnosticEvent({ atMs: Date.now(), event: 'feature_action', action, screen: '/lessons', result: 'info', subject: 'app' })?.action).toBe(action);
    }
    // правила сервера те же слово в слово (functions/src/client_reports.ts) — если сервер ужесточат, этот замок упадёт
    const server = read('functions/src/client_reports.ts');
    expect(server).toContain("/^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$/.test(out)");
    expect(server).toContain("/(?:^|[:._-])[A-Za-z0-9]{20,}(?:$|[:._-])/.test(out)");
    for (const action of actions) {
      expect(/^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$/.test(action)).toBe(true);
      expect(/(?:^|[:._-])[A-Za-z0-9]{20,}(?:$|[:._-])/.test(action)).toBe(false);
      expect(action.length).toBeLessThanOrEqual(80);
    }
    expect(server).toContain("'feature_action'");
  });

  it('вкладка и плитка подключены: back_button, tab_switch, первый кадр, метка тапа', () => {
    const lessons = read('app/(tabs)/lessons.tsx');
    expect(lessons).toContain('noteLessonsLeave("back_button", { page: "v2" })');
    expect(lessons).toContain('noteLessonsLeave("back_button", { page: "legacy_list" })');
    expect(lessons).toContain('noteLessonsLeave("tab_switch"');
    expect(lessons).toContain('noteLessonsFirstFrame()');
    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain("noteLessonsOpenStart('home_tile');");
  });
});
