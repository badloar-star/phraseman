import { createHash } from 'node:crypto';
import type { Decision, Department } from './decision';

/**
 * Что Джарвису разрешено ДЕЛАТЬ, а не только советовать.
 *
 * зачем этот модуль (владелец 2026-08-15, «говорит, а не делает»): до сих пор
 * система умела только писать текст. Кнопка «принять» ставила отметку в
 * журнале и на этом всё заканчивалось — владелец сам шёл и делал руками.
 *
 * зачем перечислимый список, а не «делай, что считаешь нужным»: право должно
 * быть проверяемым кодом. Всё, чего нет в `ALLOWED_ACTION_KINDS`, отвергается
 * валидатором — не промптом, не обещанием модели, а обычной проверкой. Модель
 * не может расширить себе полномочия, как бы её ни уговаривало содержимое
 * чужого письма.
 *
 * зачем именно эти три (решение владельца 2026-08-15): все обратимы одним
 * действием и ни одно не выходит наружу к людям без его участия.
 *  - admin_tag — пометка в админке, снимается кнопкой;
 *  - support_draft — черновик ответа, лежит, пока владелец не отправит сам;
 *  - github_issue — задача в репозитории, закрывается вручную.
 *
 * Чего здесь НЕТ и не будет: банов, рассылок, удалений, денег. Это необратимое,
 * и решение авторов департаментов («баны остаются за владельцем») сохранено.
 */

export const ALLOWED_ACTION_KINDS = Object.freeze(['admin_tag', 'support_draft', 'github_issue'] as const);
export type JarvisActionKind = typeof ALLOWED_ACTION_KINDS[number];

/**
 * Потолок действий за один прогон.
 *
 * зачем: сорвавшийся агент обязан упереться в число, а не в чьё-то внимание.
 * Урок Project Vend — автономия без потолка деградирует тихо.
 */
export const JARVIS_ACTIONS_MAX_PER_RUN = 3;

/**
 * Коллекции, куда вообще разрешено писать.
 *
 * зачем белый список: без него «поставить тег» означало бы право записи в
 * любую коллекцию проекта, включая users и платежи.
 */
const ALLOWED_TARGETS: Readonly<Record<JarvisActionKind, readonly string[]>> = Object.freeze({
  admin_tag: Object.freeze(['user_reports', 'error_reports', 'safety_flags']),
  support_draft: Object.freeze(['support_inbox']),
  github_issue: Object.freeze(['jarvis_github_outbox']),
});

/**
 * Словарь допустимых пометок.
 *
 * зачем словарь, а не свободный текст: тег, придуманный моделью, — это запись
 * произвольной строки в чужую коллекцию. Ровно тот же вектор, что инъекция,
 * только через админку.
 */
export const ALLOWED_TAGS = Object.freeze([
  'jarvis:needs-review',
  'jarvis:recurring',
  'jarvis:likely-duplicate',
  'jarvis:awaiting-user',
]);

const MIN_DRAFT_LENGTH = 10;
const MAX_DRAFT_LENGTH = 2_000;
const MAX_TITLE_LENGTH = 200;

export type JarvisActionStatus = 'proposed' | 'applied' | 'rolled_back' | 'rejected';

export interface JarvisActionTarget {
  readonly collection: string;
  readonly docId: string;
}

export interface JarvisActionRollback {
  readonly kind: 'remove_tag' | 'delete_draft' | 'close_issue';
  readonly target: JarvisActionTarget;
}

export interface ProposedActionInput {
  readonly decision: Decision;
  readonly kind: JarvisActionKind;
  readonly target: JarvisActionTarget;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly nowMs: number;
  /** Текст пришёл из недоверенного источника (жалоба, письмо, веб). */
  readonly untrustedSource?: boolean;
}

export interface JarvisAction {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly kind: JarvisActionKind;
  readonly department: Department;
  readonly status: JarvisActionStatus;
  readonly target: JarvisActionTarget;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly rollback: JarvisActionRollback;
  readonly sourceDecisionHash: string;
  readonly sourceTopicKey: string;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

export type ValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

function reject(reason: string): ValidationResult {
  return Object.freeze({ ok: false, reason });
}

const OK: ValidationResult = Object.freeze({ ok: true });

/**
 * Пропускать действие или нет. Решает КОД, не модель.
 *
 * Порядок проверок — от самого дешёвого отказа к самому дорогому.
 */
export function validateAction(input: ProposedActionInput): ValidationResult {
  if (!ALLOWED_ACTION_KINDS.includes(input.kind)) {
    return reject(`вид действия "${String(input.kind)}" не разрешён`);
  }

  // зачем требовать решение: «не изобретать себе работу». Без внешнего повода
  // Джарвис начал бы придумывать себе занятия — это отдельный класс отказа.
  const decision = input.decision;
  if (!decision || typeof decision.contentHash !== 'string') {
    return reject('действие без решения-источника');
  }
  if (decision.status === 'insufficient_evidence') {
    return reject('данных недостаточно, чтобы действовать');
  }
  // зачем: evidence_only — это «я только наблюдаю». Действовать по такому
  // решению значит выйти за границу, которую поставил сам департамент.
  if (decision.actionability !== 'confirmed_action') {
    return reject('решение наблюдательное, действие по нему не предусмотрено');
  }

  const allowedCollections = ALLOWED_TARGETS[input.kind];
  if (!input.target || !allowedCollections.includes(input.target.collection)) {
    return reject(`запись в "${input.target?.collection ?? '—'}" не разрешена для ${input.kind}`);
  }
  if (!input.target.docId || typeof input.target.docId !== 'string') {
    return reject('не указан документ');
  }

  // зачем отдельно: недоверенный текст не попадает в поля, которые потом
  // прочитает человек или модель (§NOQUOTE). Пересказ — да, дословно — нет.
  if (input.untrustedSource === true) {
    return reject('текст из недоверенного источника не сохраняется дословно');
  }

  return validatePayload(input);
}

function validatePayload(input: ProposedActionInput): ValidationResult {
  if (input.kind === 'admin_tag') {
    const tag = input.payload.tag;
    if (typeof tag !== 'string' || !ALLOWED_TAGS.includes(tag)) {
      return reject(`пометка "${String(tag)}" вне словаря`);
    }
    return OK;
  }

  if (input.kind === 'support_draft') {
    const draft = input.payload.draft;
    if (typeof draft !== 'string' || draft.trim().length < MIN_DRAFT_LENGTH) {
      return reject('черновик пуст или слишком короткий');
    }
    if (draft.length > MAX_DRAFT_LENGTH) {
      return reject('черновик длиннее допустимого');
    }
    return OK;
  }

  const title = input.payload.title;
  if (typeof title !== 'string' || title.trim().length === 0) {
    return reject('у задачи нет заголовка');
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return reject('заголовок задачи длиннее допустимого');
  }
  return OK;
}

const ROLLBACK_BY_KIND: Readonly<Record<JarvisActionKind, JarvisActionRollback['kind']>> = Object.freeze({
  admin_tag: 'remove_tag',
  support_draft: 'delete_draft',
  github_issue: 'close_issue',
});

/**
 * Собирает предложенное действие. Ещё НЕ применённое — только описание того,
 * что будет сделано, и как это отменить.
 *
 * зачем id от решения и цели, а не от времени: повторный прогон не должен
 * наплодить пять одинаковых пометок на одном документе.
 */
export function buildProposedAction(input: ProposedActionInput): JarvisAction {
  const sourceTopicKey = createHash('sha256')
    .update(`${input.decision.department}|${input.kind}|${input.target.collection}|${input.target.docId}`, 'utf8')
    .digest('hex')
    .slice(0, 16);

  return Object.freeze({
    schemaVersion: 1 as const,
    id: `act:${sourceTopicKey}`,
    kind: input.kind,
    department: input.decision.department,
    status: 'proposed' as const,
    target: Object.freeze({ ...input.target }),
    payload: Object.freeze({ ...input.payload }),
    rollback: Object.freeze({
      kind: ROLLBACK_BY_KIND[input.kind],
      target: Object.freeze({ ...input.target }),
    }),
    sourceDecisionHash: input.decision.contentHash,
    sourceTopicKey,
    createdAtMs: input.nowMs,
    updatedAtMs: input.nowMs,
  });
}
