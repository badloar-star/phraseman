import type { JarvisMode } from './control';

/**
 * Текстовые команды Джарвиса в Telegram (бриф в99, в267).
 *
 * зачем только три: список из тридцати команд никто не запоминает, а
 * забытая команда — это команда, которой нет. `/status` отвечает на вопрос
 * «он вообще жив?», `/stop` — аварийная остановка с телефона.
 *
 * Модуль чистый: без Firestore и сети, чтобы разбор и тексты проверялись
 * тестами целиком.
 */

export type JarvisCommand = 'status' | 'stop' | 'start';

export const JARVIS_COMMANDS: readonly JarvisCommand[] = ['status', 'stop', 'start'];

/**
 * Разбор команды из текста сообщения.
 * Всё, что не совпало точно, — обычный текст, а не команда.
 */
export function parseCommand(raw: unknown): JarvisCommand | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed.startsWith('/')) return null;
  // зачем срезать @botname: в группах Telegram дописывает его к команде,
  // и без этого /status@codex_reportbot не распознался бы.
  const word = trimmed.slice(1).split(/[\s@]/)[0];
  return (JARVIS_COMMANDS as readonly string[]).includes(word) ? (word as JarvisCommand) : null;
}

const MODE_LABEL: Record<JarvisMode, string> = {
  observe: 'наблюдаю',
  quiet: 'слежу молча',
  off: 'выключен',
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** «3 часа назад» читается мгновенно, «1800000000000» — нет. */
function humanAgo(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 1) return 'меньше часа назад';
  if (hours < 24) return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'} назад`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} назад`;
}

export interface BuildStatusTextInput {
  readonly mode: JarvisMode;
  readonly reason: string | null;
  /** null — ещё ни разу не отрабатывал. */
  readonly lastRunAtMs: number | null;
  readonly openDecisions: number;
  readonly nowMs: number;
}

export function buildStatusText(input: BuildStatusTextInput): string {
  const lines: string[] = [`<b>Джарвис</b> · ${MODE_LABEL[input.mode]}`];

  // зачем показывать причину: через неделю «почему он молчит» вспомнить
  // невозможно, а причина записана в момент выключения.
  if (input.mode === 'off' && input.reason) {
    lines.push(`Причина: ${escapeHtml(input.reason)}`);
  }

  lines.push(
    input.lastRunAtMs === null
      ? 'Проверку пока не запускал.'
      : `Последняя проверка — ${humanAgo(input.nowMs - input.lastRunAtMs)}.`,
  );

  if (input.lastRunAtMs !== null) {
    lines.push(
      input.openDecisions === 0
        ? 'Находок не было.'
        : `Находок в последней проверке: ${input.openDecisions}.`,
    );
  }

  return lines.join('\n');
}
