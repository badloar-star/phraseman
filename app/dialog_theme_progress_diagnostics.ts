// dialog_theme_progress_diagnostics.ts — [DIALOG-THEME-PROGRESS]: почему пройденный диалог засчитан или нет и что видит хаб «Диалоги».
//
// зачем (жалоба Надежды через координатора 29.10, «сперва логи»): диалог «Спросить совет» пройден 6 из 6, засчитан в серии и заданиях дня,
// а счётчик темы «Повседневное» на экране диалогов = 0. Отметка «пройден» (dialogue_v2_done_store) ставится только при endedBy = 'bot';
// причины пишет [DIALOG-DONE] через console.log, а в релизе он вырезан — у людей следа нет. Здесь те же факты уходят событием журнала
// обращений (feature_action): какой путь закрыл диалог, закончил ли его сервер, сколько целей пройдено, засчитано ли; и что хаб
// взял для счётчика (сколько id в наборе, прочитан ли диск). Только закрытые значения, id сценария из общего каталога и числа.
import { recordSupportDiagnostic } from './support_diagnostics';

export type DialogDoneDecisionInput = Readonly<{
  scenarioId: string;
  endedBy: 'bot' | 'manual' | 'limit';
  /** Путь, которым человек открыл итог (до нормализации «сервер закончил → bot»). */
  requestedEndedBy?: 'bot' | 'manual' | 'limit';
  endedByServer: boolean;
  learnerTurns: number;
  objectiveIndex: number;
  objectivesTotal: number;
  counted: boolean;
}>;

const count = (value: number): number => Math.max(0, Math.min(99, Math.round(value)));
const tag = (value: string): string => value.replace(/[^a-z0-9_]/g, '_').slice(0, 32);

const ACTION_MAX = 80; // белый список журнала: ^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$

export function dialogDoneDecisionAction(input: DialogDoneDecisionInput): string {
  // зачем: если путь нормализован (закрыл вручную после конца от сервера), видно оба значения — «bot_req_manual».
  const ended = input.requestedEndedBy && input.requestedEndedBy !== input.endedBy ? `${input.endedBy}_req_${input.requestedEndedBy}` : input.endedBy;
  return (`dlgprog:summary:${input.counted ? 'counted' : 'skip'}:${ended}:srv${input.endedByServer ? 1 : 0}`
    + `:t${count(input.learnerTurns)}:o${count(input.objectiveIndex)}of${count(input.objectivesTotal)}:${tag(input.scenarioId)}`).slice(0, ACTION_MAX);
}

export function noteDialogDoneDecision(input: DialogDoneDecisionInput, nowMs: number = Date.now()): void {
  const action = dialogDoneDecisionAction(input);
  console.warn('[DIALOG-THEME-PROGRESS] summary', action); // guard-ok: одна строка на закрытие диалога; warn — переживает прод-сборку
  void recordSupportDiagnostic({
    event: 'feature_action', action, screen: '/dialogue_v2_session', result: input.counted ? 'info' : 'blocked', subject: 'app', atMs: nowMs,
  }).catch((error: unknown) => {
    console.warn('[DIALOG-THEME-PROGRESS] запись в журнал не удалась', error instanceof Error ? error.message : String(error));
  });
}

export function dialogHubCounterAction(doneIds: number, doneCount: number, totalCount: number, diskRead: boolean): string {
  return `dlgprog:hub:ids${count(doneIds)}:d${count(doneCount)}of${count(totalCount)}:${diskRead ? 'disk' : 'memory_only'}`;
}

let lastHubAction = '';

/** Что хаб посчитал. Пишется только при смене (модель хаба пересчитывается часто). */
export function noteDialogHubCounter(doneIds: number, doneCount: number, totalCount: number, diskRead: boolean, nowMs: number = Date.now()): void {
  const action = dialogHubCounterAction(doneIds, doneCount, totalCount, diskRead);
  if (action === lastHubAction) return; // зачем: тот же итог уже записан
  lastHubAction = action;
  console.warn('[DIALOG-THEME-PROGRESS] hub', action); // guard-ok: одна строка на смену счётчика
  void recordSupportDiagnostic({ event: 'feature_action', action, screen: '/dialogs', result: 'info', subject: 'app', atMs: nowMs }).catch((error: unknown) => {
    console.warn('[DIALOG-THEME-PROGRESS] запись в журнал не удалась', error instanceof Error ? error.message : String(error));
  });
}

/** Только для тестов. */
export function resetDialogThemeProgressDiagnosticsForTests(): void {
  lastHubAction = '';
}

export default function __RouteShim() { return null; }
