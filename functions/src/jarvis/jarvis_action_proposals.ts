import type { Decision } from './decision';
import { decisionTopicKey } from './decision_topic';
import { JARVIS_ACTIONS_MAX_PER_RUN, type ProposedActionInput } from './jarvis_actions';

/**
 * Во что превращается находка, если по ней можно действовать.
 *
 * зачем именно задача, а не пометка на конкретной жалобе (проверено кодом
 * 2026-08-15): ни один департамент не сохраняет id документов — все они
 * работают с агрегатами и `.count()`-выборками, а в `evidence` попадают
 * только идентификатор источника и числа. Пометить конкретную жалобу сегодня
 * физически нечем, и выдумывать id ради красивой демонстрации нельзя.
 *
 * Поэтому первое настоящее действие Джарвиса — завести задачу по находке в
 * собственный буфер `jarvis_github_outbox`. Цель существует, действие
 * обратимо, наружу без токена ничего не уходит.
 *
 * зачем буфер, а не прямая отправка в GitHub: интеграции и токена в проекте
 * нет (проверено поиском). Появится токен — отдельный процесс разберёт буфер;
 * до тех пор задачи копятся видимыми и никуда не пропадают.
 */

const MAX_TITLE_LENGTH = 200;
const OUTBOX_COLLECTION = 'jarvis_github_outbox';

/**
 * Какую пометку ставить на найденные документы.
 *
 * зачем одна из словаря, а не по смыслу находки: тег, выбранный моделью, —
 * это запись произвольного текста в чужую коллекцию, тот же вектор, что
 * инъекция, только через админку. Словарь — в jarvis_actions.ALLOWED_TAGS,
 * валидатор отвергает всё, чего в нём нет.
 */
const REVIEW_TAG = 'jarvis:needs-review';

export interface ProposeActionsForDecisionsInput {
  readonly decisions: readonly Decision[];
  readonly nowMs: number;
}

function truncateTitle(value: string): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length <= MAX_TITLE_LENGTH ? clean : `${clean.slice(0, MAX_TITLE_LENGTH - 1)}…`;
}

/**
 * Тело задачи собирается КОДОМ из полей находки.
 *
 * зачем не отдавать это модели: тело задачи — то, что человек прочитает и
 * по чему будет работать. Пересказ от LLM мог бы незаметно исказить цифру
 * или потерять источник, а провенанс здесь обязателен: задача без ссылки на
 * находку — это работа, которую Джарвис придумал себе сам.
 */
function buildBody(decision: Decision): string {
  return [
    `Департамент: ${decision.department}`,
    '',
    `Что нашлось: ${decision.finding}`,
    `Гипотеза: ${decision.hypothesis}`,
    `Как проверить результат: ${decision.successMetric}`,
    `Риск: ${decision.risk}`,
    '',
    `Источник: находка Джарвиса ${decision.contentHash.slice(0, 12)}`,
  ].join('\n');
}

/**
 * Отбирает находки, по которым можно действовать, и описывает действие.
 *
 * Ничего не применяет и не пишет — только предлагает. Проверку предложения
 * делает `validateAction`, применение — только после согласия владельца.
 */
export function proposeActionsForDecisions(
  input: ProposeActionsForDecisionsInput,
): readonly ProposedActionInput[] {
  const proposals: ProposedActionInput[] = [];

  for (const decision of input.decisions) {
    if (proposals.length >= JARVIS_ACTIONS_MAX_PER_RUN) break;
    // зачем оба условия здесь, а не только в валидаторе: не тратить запись
    // в буфер отказов на то, что заведомо не пройдёт.
    if (decision.actionability !== 'confirmed_action') continue;
    if (decision.status === 'insufficient_evidence') continue;

    proposals.push({
      decision,
      kind: 'github_issue',
      target: { collection: OUTBOX_COLLECTION, docId: decisionTopicKey(decision) },
      payload: {
        title: truncateTitle(decision.recommendation),
        body: buildBody(decision),
      },
      nowMs: input.nowMs,
    });

    // зачем пометки (владелец 2026-08-16): у решения появились адреса
    // конкретных документов — значит появилась цель, по которой можно
    // действовать, а не только считать. Пометка обратима одним кликом
    // и ничего не ломает: она добавляет тег из словаря, не трогая данные.
    for (const target of decision.actionTargets ?? []) {
      if (proposals.length >= JARVIS_ACTIONS_MAX_PER_RUN) break;
      proposals.push({
        decision,
        kind: 'admin_tag',
        target: { collection: target.collection, docId: target.docId },
        payload: { tag: REVIEW_TAG },
        nowMs: input.nowMs,
      });
    }
  }

  return Object.freeze(proposals);
}
