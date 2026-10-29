// Жалоба Надежды 29.10 («сперва логи»): события [DIALOG-THEME-PROGRESS] проходят белый список журнала обращений; решение «засчитан / нет»
// называет путь закрытия и признак «сервер закончил разговор»; счётчик хаба пишется один раз на смену.
const recorded: Array<Record<string, unknown>> = [];
jest.mock('../app/support_diagnostics', () => ({
  recordSupportDiagnostic: jest.fn(async (event: Record<string, unknown>) => { recorded.push(event); }),
}));

import { sanitizeSupportDiagnosticEvent } from '../app/support_diagnostic_schema';
import {
  dialogDoneDecisionAction,
  dialogHubCounterAction,
  noteDialogDoneDecision,
  noteDialogHubCounter,
  resetDialogThemeProgressDiagnosticsForTests,
} from '../app/dialog_theme_progress_diagnostics';

const passes = (action: string) => sanitizeSupportDiagnosticEvent({ event: 'feature_action', action, atMs: 1 })?.action === action;

beforeEach(() => {
  recorded.length = 0;
  resetDialogThemeProgressDiagnosticsForTests();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test('decision and hub actions pass the support diagnostics whitelist', () => {
  const manualAfterServerEnd = dialogDoneDecisionAction({
    scenarioId: 'everyday_01', endedBy: 'manual', endedByServer: true, learnerTurns: 9, objectiveIndex: 6, objectivesTotal: 6, counted: false,
  });
  expect(manualAfterServerEnd).toBe('dlgprog:summary:skip:manual:srv1:t9:o6of6:everyday_01');
  for (const action of [
    manualAfterServerEnd,
    dialogDoneDecisionAction({ scenarioId: 'work_12', endedBy: 'bot', endedByServer: true, learnerTurns: 120, objectiveIndex: 3, objectivesTotal: 4, counted: true }),
    dialogHubCounterAction(1, 0, 24, false),
    dialogHubCounterAction(3, 3, 24, true),
  ]) {
    expect(passes(action)).toBe(true);
  }
});

test('normalized path shows both values and the action never exceeds the whitelist length', () => {
  const normalized = dialogDoneDecisionAction({
    scenarioId: 'everyday_01', endedBy: 'bot', requestedEndedBy: 'manual', endedByServer: true, learnerTurns: 9, objectiveIndex: 6, objectivesTotal: 6, counted: true,
  });
  expect(normalized).toBe('dlgprog:summary:counted:bot_req_manual:srv1:t9:o6of6:everyday_01');
  const longest = dialogDoneDecisionAction({
    // зачем: длинный, но реалистичный id (куски < 20 знаков) — сплошной кусок 20+ фильтр журнала режет как идентификатор
    scenarioId: 'everyday_ask_for_advice_from_a_neighbour_01', endedBy: 'bot', requestedEndedBy: 'manual', endedByServer: true, learnerTurns: 500, objectiveIndex: 120, objectivesTotal: 120, counted: true,
  });
  expect(longest.length).toBeLessThanOrEqual(80);
  expect(passes(normalized)).toBe(true);
  expect(passes(longest)).toBe(true);
});

test('decision is written as blocked when not counted; hub counter only on change', async () => {
  noteDialogDoneDecision({ scenarioId: 'everyday_01', endedBy: 'manual', endedByServer: true, learnerTurns: 9, objectiveIndex: 6, objectivesTotal: 6, counted: false }, 5);
  noteDialogHubCounter(0, 0, 24, true, 6);
  noteDialogHubCounter(0, 0, 24, true, 7);
  noteDialogHubCounter(1, 1, 24, true, 8);
  await Promise.resolve();
  expect(recorded.map((e) => e.action)).toEqual([
    'dlgprog:summary:skip:manual:srv1:t9:o6of6:everyday_01',
    'dlgprog:hub:ids0:d0of24:disk',
    'dlgprog:hub:ids1:d1of24:disk',
  ]);
  expect(recorded[0]).toMatchObject({ result: 'blocked', screen: '/dialogue_v2_session' });
});
