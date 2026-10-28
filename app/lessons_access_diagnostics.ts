// lessons_access_diagnostics.ts — события журнала обращений для жалоб «уроков нет / курс открывается не полностью / нет доступа к занятию».
//
// зачем (🔴 Ревизора по b65578480, координатор 28.10): babel.config.js в прод-сборке вырезает console.* кроме warn/error — строки
// [CLASSIC-LESSONS] / [FEATURE-INTRO] / [V2-SESSION-SOURCE] у людей с жалобами #1/#3/#11 не появлялись нигде. Пишем СОБЫТИЕМ журнала
// обращений (recordSupportDiagnostic → «Поддержка» → админка), как lessons:leave у Дизайна:
//   classic:shown:<cutBy>:<shown>:u<unlocked>:d<done>:p<0|1>   — показ классического списка; одно событие на смену причины
//   intro:<id>:<outcome>                                        — нажатие на кнопку с вводным окном («Классический курс»)
//   v2session:none:<target>:l<lesson>s<session>                 — занятие не нашлось в бандле, человек увидел «Сессия недоступна»
// Только закрытые значения и счётчики 0–32: ни id пользователя, ни текста поиска. Формат держит белый список сервера
// (^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$, без «слова» из 20+ знаков) — замок tests/lessons_access_diagnostics.test.ts.
import { recordSupportDiagnostic } from './support_diagnostics';

export type ClassicLessonsCutBy = 'none' | 'no_titles' | 'list_not_built' | 'search';
export type FeatureIntroOutcome = 'ignored_inactive' | 'ignored_checking' | 'ignored_pending' | 'dropped' | 'show' | 'open';

export type ClassicLessonsShownInput = Readonly<{
  cutBy: ClassicLessonsCutBy;
  queryActive: boolean;
  shownLessons: number;
  unlocked: number;
  done: number;
  isPremium: boolean;
}>;

const count = (value: number): number => Math.max(0, Math.min(99, Math.round(value)));
const tag = (value: string): string => value.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40);

/** Действие показа. При активном поиске число строк меняется на каждую букву — его не пишем, только «q». */
export function classicLessonsShownAction(input: ClassicLessonsShownInput): string {
  const shown = input.queryActive ? 'q' : `s${count(input.shownLessons)}`;
  return `classic:shown:${input.cutBy}:${shown}:u${count(input.unlocked)}:d${count(input.done)}:p${input.isPremium ? 1 : 0}`;
}

export function featureIntroAction(id: string, outcome: FeatureIntroOutcome): string {
  return `intro:${tag(id)}:${outcome}`;
}

export function v2SessionUnavailableAction(target: string, lesson: number, session: number): string {
  return `v2session:none:${tag(target)}:l${count(lesson)}s${count(session)}`;
}

let lastClassicShown = '';

/** Пишет показ классического списка, только когда сменилась причина или счётчики (не на каждый рендер и не на каждую букву поиска). */
export function noteClassicLessonsShown(input: ClassicLessonsShownInput, nowMs: number = Date.now()): void {
  const action = classicLessonsShownAction(input);
  if (action === lastClassicShown) return; // зачем: тот же итог уже записан — дубль журнал не засоряет
  lastClassicShown = action;
  console.warn('[CLASSIC-LESSONS] shown', action); // guard-ok: одна строка на смену итога; warn — переживает прод-сборку
  void recordSupportDiagnostic({ event: 'feature_action', action, screen: '/lessons', result: input.cutBy === 'none' ? 'info' : 'blocked', subject: 'app', atMs: nowMs });
}

export function noteFeatureIntroRequest(id: string, outcome: FeatureIntroOutcome, nowMs: number = Date.now()): void {
  const action = featureIntroAction(id, outcome);
  console.warn('[FEATURE-INTRO] request', action); // guard-ok: итог нажатия; warn — переживает прод-сборку
  void recordSupportDiagnostic({ event: 'feature_action', action, screen: '/lessons', result: outcome.startsWith('ignored') || outcome === 'dropped' ? 'blocked' : 'info', subject: 'app', atMs: nowMs });
}

export function noteV2SessionUnavailable(target: string, lesson: number, session: number, nowMs: number = Date.now()): void {
  const action = v2SessionUnavailableAction(target, lesson, session);
  void recordSupportDiagnostic({ event: 'feature_action', action, screen: '/learning_v2_session', result: 'blocked', subject: 'app', atMs: nowMs });
}

export function resetLessonsAccessDiagnosticsForTests(): void {
  lastClassicShown = '';
}

export default function __RouteShim() { return null; }
