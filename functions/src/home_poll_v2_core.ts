// ═══ Опросы на Главной 2.0 — чистые правила голоса (без Firebase) ══════════════
// зачем (владелец 18.10, сборка 134): набор = 2–3 вопроса, голос — по одному вопросу, у каждого вопроса свои счётчики.
// Документ набора home_polls_v2/{setId} заводит посев (scripts/polls_v2/seed_home_polls_v2.mjs): тексты, варианты и
// нулевые счётчики. Голос пишет ТОЛЬКО сервер. Документ голоса home_polls_v2/{setId}/votes/{stableUid} хранит лишь то,
// НА КАКИЕ вопросы человек уже ответил (без выбранного варианта) — только чтобы отклонить повтор (privacy, координатор
// 18.10: «возраст и род занятий — только общие счётчики, голос по uid — только против повтора»).
import { HttpsError } from 'firebase-functions/v2/https';

import { HOME_POLLS_V2_SET_COUNT, isHomePollV2SetVotableAt } from '../../shared/home_polls_v2_schedule';

export const HOME_POLLS_V2_COLLECTION = 'home_polls_v2';
export const HOME_POLLS_V2_VOTES_SUBCOLLECTION = 'votes';

const SET_ID_RE = /^p2-\d{3}$/;
const ITEM_ID_RE = /^[a-z0-9_-]{1,24}$/;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

type RecordValue = Record<string, unknown>;

export type HomePollV2VoteInput = Readonly<{
  setId: string;
  questionId: string;
  optionId: string;
  dateKey: string | null;
  stableId: string | null;
}>;

export type HomePollV2Counts = Readonly<Record<string, number>>;

export type HomePollV2VoteDecision =
  | Readonly<{ kind: 'accept'; counts: HomePollV2Counts; voteCount: number }>
  | Readonly<{ kind: 'already_answered'; counts: HomePollV2Counts; voteCount: number }>
  | Readonly<{ kind: 'reject'; code: 'not-found' | 'failed-precondition' | 'invalid-argument'; reason: string }>;

/**
 * The authenticated account resolved under the vote transaction must still be
 * the account that queued the vote. This closes the A→B token-switch window:
 * a queued A payload can never increment B's aggregate or create B's marker.
 */
export function assertHomePollV2StableIdentity(requestedStableId: string | null, resolvedStableId: string): void {
  if (!requestedStableId || requestedStableId !== resolvedStableId) {
    throw new HttpsError('failed-precondition', 'home_poll_account_changed');
  }
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeHomePollV2VoteInput(data: unknown): HomePollV2VoteInput {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'request_object_required');
  const setId = String(data.setId ?? '').trim();
  if (!SET_ID_RE.test(setId)) throw new HttpsError('invalid-argument', 'home_poll_set_id_invalid');
  const questionId = String(data.questionId ?? '').trim();
  if (!ITEM_ID_RE.test(questionId)) throw new HttpsError('invalid-argument', 'home_poll_question_invalid');
  const optionId = String(data.optionId ?? '').trim();
  if (!ITEM_ID_RE.test(optionId)) throw new HttpsError('invalid-argument', 'home_poll_option_invalid');
  const rawDate = String(data.dateKey ?? '').trim();
  const rawStable = typeof data.stableId === 'string' ? data.stableId.trim() : '';
  return {
    setId,
    questionId,
    optionId,
    dateKey: DATE_KEY_RE.test(rawDate) ? rawDate : null,
    stableId: rawStable ? rawStable.slice(0, 160) : null,
  };
}

/** Вопросы набора: id вопроса → id его вариантов (по порядку, без дублей и мусора). */
export function homePollV2QuestionOptions(set: RecordValue | null | undefined): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const question of Array.isArray(set?.questions) ? set?.questions as unknown[] : []) {
    if (!isRecord(question)) continue;
    const qid = String(question.id ?? '').trim();
    if (!ITEM_ID_RE.test(qid) || out.has(qid)) continue;
    const ids: string[] = [];
    for (const option of Array.isArray(question.options) ? question.options : []) {
      const oid = isRecord(option) ? String(option.id ?? '').trim() : '';
      if (ITEM_ID_RE.test(oid) && !ids.includes(oid)) ids.push(oid);
    }
    out.set(qid, ids);
  }
  return out;
}

/** Счётчики одного вопроса только по его вариантам. */
export function homePollV2QuestionCounts(set: RecordValue | null | undefined, questionId: string): Record<string, number> {
  const ids = homePollV2QuestionOptions(set).get(questionId) ?? [];
  const all = isRecord(set?.counts) ? set?.counts as RecordValue : {};
  const raw = isRecord(all[questionId]) ? all[questionId] as RecordValue : {};
  const out: Record<string, number> = {};
  for (const id of ids) {
    const n = Number(raw[id]);
    out[id] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  return out;
}

const sum = (counts: Record<string, number>): number => Object.values(counts).reduce((a, n) => a + n, 0);

/** Ответил ли человек уже на этот вопрос (по документу голоса). */
export function homePollV2AlreadyAnswered(vote: RecordValue | null | undefined, questionId: string): boolean {
  const answered = isRecord(vote?.answered) ? vote?.answered as RecordValue : {};
  return answered[questionId] === true;
}

/**
 * Решение по голосу внутри транзакции (набор и голос уже прочитаны):
 *  - вопрос уже отвечен → already_answered (счётчики не трогаем, второй голос не пишется);
 *  - набора нет / закрыт / не в своём окне расписания / вопрос или вариант не из набора → reject;
 *  - иначе accept со свежими счётчиками вопроса (+1 к выбранному варианту).
 */
export function decideHomePollV2Vote(args: {
  set: RecordValue | null;
  vote: RecordValue | null;
  input: HomePollV2VoteInput;
  nowMs: number;
  setCount?: number;
}): HomePollV2VoteDecision {
  const { set, vote, input, nowMs } = args;
  if (!set) return { kind: 'reject', code: 'not-found', reason: 'home_poll_set_not_found' };
  const options = homePollV2QuestionOptions(set).get(input.questionId);
  if (!options) return { kind: 'reject', code: 'invalid-argument', reason: 'home_poll_question_invalid' };
  const counts = homePollV2QuestionCounts(set, input.questionId);
  if (homePollV2AlreadyAnswered(vote, input.questionId)) {
    return { kind: 'already_answered', counts, voteCount: sum(counts) };
  }
  if (set.status !== 'active') return { kind: 'reject', code: 'failed-precondition', reason: 'home_poll_set_closed' };
  if (!isHomePollV2SetVotableAt(input.setId, nowMs, args.setCount ?? HOME_POLLS_V2_SET_COUNT)) {
    return { kind: 'reject', code: 'failed-precondition', reason: 'home_poll_set_not_votable' };
  }
  if (options.length < 2 || options.length > 4) {
    return { kind: 'reject', code: 'failed-precondition', reason: 'home_poll_options_broken' };
  }
  if (!options.includes(input.optionId)) {
    return { kind: 'reject', code: 'invalid-argument', reason: 'home_poll_option_invalid' };
  }
  const next = { ...counts, [input.optionId]: (counts[input.optionId] ?? 0) + 1 };
  return { kind: 'accept', counts: next, voteCount: sum(next) };
}
