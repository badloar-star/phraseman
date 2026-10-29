// зачем (координатор 28.10, отчёт по сборке 147): причина ухода с вкладки «Уроки» и время первого кадра попадают в журнал обращений («Поддержка» →
// админка), а не в console, которой в релизе нет. Здесь: корзины, дедупликация, протухшая метка, и главное — действия проходят белый список сервера.
import fs from 'node:fs';
import path from 'node:path';

const mockRecord = jest.fn(async (_event: unknown) => undefined);
jest.mock('../app/support_diagnostics', () => ({ recordSupportDiagnostic: (event: unknown) => mockRecord(event) }));

import { JS_STARTED_AT_MS } from '../app/cold_start_diagnostics';
import {
  lessonsFirstFrameBucket,
  noteLessonsFirstFrame,
  noteLessonsLeave,
  noteLessonsModuleReady,
  noteLessonsOpenStart,
  noteLessonsStage,
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

  const actions = () => mockRecord.mock.calls.map((call) => (call[0] as { action: string }).action);
  const WARM = JS_STARTED_AT_MS + 10 * 60_000; // тап через 10 минут после старта JS — не холодный

  it('первый кадр: тап → событие с корзиной и durationMs, метка расходуется один раз; тёплый тап без суффикса', () => {
    noteLessonsOpenStart('home_tile', WARM);
    noteLessonsFirstFrame(WARM + 2_500);
    expect(actions()).toEqual(['lessons:open:warm:module_pending', 'lessons:first_frame_ms:1to3s']);
    expect(mockRecord.mock.calls[1]![0]).toMatchObject({ event: 'feature_action', screen: '/lessons', durationMs: 2500 });
    noteLessonsFirstFrame(WARM + 3_000);
    expect(mockRecord).toHaveBeenCalledTimes(2);
  });

  it('холодный старт: тап в первые 45 с жизни JS → open:cold, этапы и first_frame с суффиксом :cold, модуль грузится 4 с', () => {
    const t0 = JS_STARTED_AT_MS + 5_000;
    noteLessonsOpenStart('home_tile', t0);
    noteLessonsModuleReady(t0 + 4_000);
    noteLessonsStage('first_render', t0 + 6_000);
    noteLessonsStage('first_render', t0 + 6_500); // повтор этапа в одном открытии не пишется
    noteLessonsFirstFrame(t0 + 7_500);
    expect(actions()).toEqual([
      'lessons:open:cold:module_pending',
      'lessons:stage:module_ready:3to8s:cold',
      'lessons:stage:first_render:3to8s:cold',
      'lessons:first_frame_ms:3to8s:cold',
    ]);
    expect(mockRecord.mock.calls[1]![0]).toMatchObject({ durationMs: 4_000 });
    // следующий тап при уже загруженном модуле — module_ready
    noteLessonsOpenStart('home_tile', t0 + 20_000);
    expect(actions()[4]).toBe('lessons:open:cold:module_ready');
  });

  it('этап без метки тапа (премаунт в фоне) в журнал обращений не пишется', () => {
    noteLessonsStage('first_render', WARM);
    noteLessonsModuleReady(WARM);
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('без метки тапа или с протухшей меткой события нет, причина в журнале', () => {
    noteLessonsFirstFrame(5_000);
    expect(mockRecord).not.toHaveBeenCalled();
    noteLessonsOpenStart('tab_bar', WARM);
    mockRecord.mockClear(); // само событие open записано; проверяем, что протухший first_frame — нет
    noteLessonsFirstFrame(WARM + 31_000);
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
      ...['lt1s', '1to3s', '3to8s', 'gt8s'].flatMap((b) => [`lessons:first_frame_ms:${b}`, `lessons:first_frame_ms:${b}:cold`, `lessons:stage:module_ready:${b}:cold`, `lessons:stage:first_render:${b}`]),
      ...['cold', 'warm'].flatMap((c) => ['module_ready', 'module_pending'].map((m) => `lessons:open:${c}:${m}`)),
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
    expect(lessons).toContain('noteLessonsModuleReady();');
    expect(lessons).toContain('noteLessonsStage("first_render")');
    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain('noteLessonsOpenStart(source);');
    expect(home).toContain("openLessonsTabFromHome('home_tile')");
  });
});
