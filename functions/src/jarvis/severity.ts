import type { Decision, Department } from './decision';

/**
 * Классификация важности находок (бриф в203) и склейка повторов (в209).
 *
 * зачем P0-P3, а не просто «срочно/нет»: четыре уровня достаточно, чтобы
 * читать сводку сверху вниз и понимать, за что браться в первую очередь,
 * но не настолько много, чтобы спорить о границах.
 *
 * Модуль чистый: без Firestore и сети, чтобы правила проверялись тестами
 * целиком.
 */

export type Severity = 'P0' | 'P1' | 'P2' | 'P3';

/** От самого срочного к самому терпимому — готовый порядок для сортировки. */
export const SEVERITY_ORDER: readonly Severity[] = ['P0', 'P1', 'P2', 'P3'];

export const SEVERITY_LABEL: Record<Severity, string> = {
  P0: 'критично — человек ждёт прямо сейчас',
  P1: 'важно — кто-то ждёт ответа',
  P2: 'стоит разобрать',
  P3: 'может подождать',
};

/**
 * P0 — платежи и безопасность: за числом стоит конкретный человек, который
 * заплатил и не получил доступ, или ребёнок с неразобранной жалобой.
 * P1 — поддержка: тоже ждущий человек, но не настолько срочно.
 * P2 — качество и деньги (в смысле аналитики выручки, не сбоев): требует
 * разбора, но никто прямо сейчас не заблокирован.
 * P3 — рост, контент, фабрика, удержание: тенденции, а не инциденты.
 */
const SEVERITY_BY_DEPARTMENT: Partial<Record<Department, Severity>> = {
  payments: 'P0',
  safety: 'P0',
  support: 'P1',
  quality: 'P2',
  money: 'P2',
  growth: 'P3',
  content: 'P3',
  factory: 'P3',
  retention: 'P3',
};

export function classifySeverity(decision: Decision): Severity {
  return SEVERITY_BY_DEPARTMENT[decision.department as Department] ?? 'P2';
}

/**
 * Склеивает решения с одинаковым департаментом и текстом находки.
 *
 * зачем именно эту пару полей: одна и та же проблема в одном департаменте
 * почти всегда рождает один и тот же текст находки — крон прогоняется
 * несколько раз в день, и без склейки владелец увидел бы три одинаковых
 * сообщения подряд и научился бы их не читать.
 */
export function dedupeDecisions(decisions: readonly Decision[]): Decision[] {
  const seen = new Set<string>();
  const kept: Decision[] = [];
  for (const decision of decisions) {
    const key = `${decision.department}|${decision.finding}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(decision);
  }
  return kept;
}
