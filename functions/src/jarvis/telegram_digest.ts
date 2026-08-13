import type { AppTier } from './app_tier';
import type { Decision, Department } from './decision';
import { classifySeverity, SEVERITY_ORDER } from './severity';

/**
 * Сборка сводки Джарвиса для Telegram.
 *
 * зачем отдельный слой, а не отправка Decision как есть: сообщение в мессенджере
 * живёт вечно в истории телефона, поэтому наружу уходит МИНИМУМ — только суть
 * находки и что с ней делать. Никаких доказательств, идентификаторов и контактов.
 *
 * Три обязательства этого модуля:
 *  1. HTML экранируется — иначе символ < в тексте урока порвал бы сообщение;
 *  2. контакты вычищаются — даже если департамент случайно принесёт их в тексте;
 *  3. длина ограничена — Telegram режет сообщения длиннее 4096 символов.
 */

/** Больше пяти находок за раз читать невозможно — остальное ждёт панели. */
export const JARVIS_MAX_DECISIONS_IN_DIGEST = 5;

/** Запас до предела Telegram (4096): режем раньше, чем это сделает сервер. */
const MAX_MESSAGE_LEN = 3500;

const DEPARTMENT_LABEL: Record<string, string> = {
  quality: 'Качество',
  money: 'Деньги',
  growth: 'Рост',
  content: 'Контент',
  payments: 'Платежи',
  safety: 'Безопасность',
  support: 'Поддержка',
  factory: 'Фабрика контента',
  retention: 'Удержание',
};

const TIER_LABEL: Record<AppTier, string> = {
  seed: 'Seed', growth: 'Growth', scale: 'Scale', mature: 'Mature',
};

export interface BuildTelegramDigestInput {
  readonly decisions: readonly Decision[];
  readonly appTier: AppTier;
  readonly departmentErrors: readonly Department[];
  /**
   * narrative LLM-обогатителя по contentHash решения. Необязательная
   * надстройка: без карты (или без записи для конкретного решения) вывод
   * не меняется ни на символ — обогатитель может быть отключён, упасть в
   * бюджет или ещё не успеть отработать, и дайджест обязан остаться прежним.
   */
  readonly narrativeByHash?: ReadonlyMap<string, string>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Страховка на случай, если департамент принесёт контакт в тексте находки.
 * зачем: план запрещает PII в Telegram. Департаменты сейчас пишут только
 * количества, но текст находки — свободная строка, и полагаться на дисциплину
 * авторов нельзя: история мессенджера не стирается.
 */
function stripContacts(value: string): string {
  return value
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[скрыто]')
    .replace(/\b[a-zA-Z0-9_-]{16,}\b/g, '[скрыто]')
    .replace(/\buid\s+\S+/gi, '[скрыто]');
}

function clean(value: unknown): string {
  return escapeHtml(stripContacts(String(value ?? '').trim()));
}

/** The keyboard must receive this same ordered, capped set as the rendered digest. */
export function selectTelegramDecisions(decisions: readonly Decision[]): readonly Decision[] {
  return Object.freeze([...decisions]
    .sort((a, b) => SEVERITY_ORDER.indexOf(classifySeverity(a)) - SEVERITY_ORDER.indexOf(classifySeverity(b)))
    .slice(0, JARVIS_MAX_DECISIONS_IN_DIGEST));
}

export function buildTelegramDigest(input: BuildTelegramDigestInput): string {
  const lines: string[] = [];
  const failed = input.departmentErrors.length > 0;

  lines.push(`<b>Джарвис</b> · тир ${TIER_LABEL[input.appTier] ?? input.appTier}`);
  lines.push('');

  if (input.decisions.length === 0 && !failed) {
    lines.push('Материальных изменений нет — вчерашние темы не повторяю.');
    return lines.join('\n');
  }

  lines.push('<b>Что изменилось и какое решение нужно</b>');
  lines.push('');

  // зачем сортировать перед обрезкой: при пяти показанных находках важная
  // P0 не должна потеряться из-за того, что департамент её вернул позже.
  const shown = selectTelegramDecisions(input.decisions);
  const hidden = input.decisions.length - shown.length;

  for (const decision of shown) {
    const label = DEPARTMENT_LABEL[decision.department] ?? decision.department;
    lines.push(`<b>${escapeHtml(label)}</b>`);
    lines.push(clean(decision.finding));
    if (decision.status === 'insufficient_evidence' || decision.actionability === 'evidence_only') {
      lines.push('→ Данные неполны: автоматически ничего не утверждаю и не предлагаю действие.');
    } else {
      const recommendation = clean(decision.recommendation);
      if (recommendation) lines.push(`→ ${recommendation}`);
      const narrative = input.narrativeByHash?.get(decision.contentHash);
      if (narrative) {
        lines.push('<b>План Джарвиса</b>');
        lines.push(clean(narrative));
      }
    }
    lines.push('');
  }

  if (hidden > 0) lines.push(`…и ещё ${hidden} — смотрите в админке.`);

  if (failed) {
    const names = input.departmentErrors.map((d) => DEPARTMENT_LABEL[d] ?? d).join(', ');
    // зачем отдельной строкой: недоступный департамент — это «неизвестно»,
    // и владелец должен видеть, что картина неполная.
    lines.push(`⚠️ Не удалось проверить: ${escapeHtml(names)} — данные недоступны.`);
  }

  const text = lines.join('\n').trim();
  if (text.length <= MAX_MESSAGE_LEN) return text;

  // Режем по границе строки, чтобы не оборвать HTML-тег посередине.
  const cut = text.slice(0, MAX_MESSAGE_LEN);
  const lastBreak = cut.lastIndexOf('\n');
  return `${cut.slice(0, lastBreak > 0 ? lastBreak : MAX_MESSAGE_LEN)}\n\n…продолжение в админке.`;
}
