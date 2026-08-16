/**
 * Пора ли пересматривать знание о продукте.
 *
 * зачем этот модуль (владелец, 2026-08-16: «сделай что-то, что раз в месяц
 * надо обновлять описание продукта»): описание продукта устаревает молча.
 * Включили раздел, переименовали тариф — файл продолжает уверенно описывать
 * старое, и Джарвис врёт клиентам с той же интонацией. Неверное знание
 * опаснее отсутствующего: на него опираются без сомнений.
 *
 * зачем дату брать из САМОГО файла, а не из константы в коде: иначе
 * напоминание и содержимое разъезжаются. Владелец правит файл и ставит там
 * новую дату — напоминание обязано следовать за ней, а не за отдельным
 * числом, о котором он не знает.
 *
 * Чистый модуль: ни файловой системы, ни сети, ни часов — время приходит
 * параметром, чтобы правило проверялось тестом целиком.
 */

/** Сколько дней до срока начинать напоминать. */
export const KNOWLEDGE_REVIEW_LEAD_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1_000;

export interface KnowledgeReviewStatus {
  readonly file: string;
  readonly topic: string;
  /** Дата пересмотра из файла, если она там указана. */
  readonly reviewBy: string | null;
  /** Сколько дней осталось; отрицательное — просрочено. */
  readonly daysLeft: number | null;
  readonly due: boolean;
  /** Почему напоминаем — для текста в телеграм. */
  readonly reason: 'overdue' | 'soon' | 'missing_date' | 'ok';
}

function parseIsoDateMs(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const ms = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Оценивает один файл знания.
 *
 * зачем отдельный reason 'missing_date': файл без даты пересмотра — это файл,
 * который никто никогда не перечитает. Формат требует дату (knowledge/README),
 * поэтому её отсутствие само по себе повод напомнить, а не причина молчать.
 */
export function evaluateKnowledgeReview(
  file: { readonly name: string; readonly topic: string; readonly reviewBy: string | null },
  nowMs: number,
): KnowledgeReviewStatus {
  const base = { file: file.name, topic: file.topic, reviewBy: file.reviewBy } as const;
  if (!file.reviewBy) {
    return Object.freeze({ ...base, daysLeft: null, due: true, reason: 'missing_date' });
  }
  const dueMs = parseIsoDateMs(file.reviewBy);
  if (dueMs === null) {
    return Object.freeze({ ...base, daysLeft: null, due: true, reason: 'missing_date' });
  }
  // зачем считать от НАЧАЛА сегодняшнего дня (поймал тест): срок в файле —
  // это дата, а не момент. При сравнении с «сейчас 12:00» вчерашний срок давал
  // −1.5 дня, и Math.floor превращал его в «просрочено на 2 дня». Владелец
  // прочитал бы, что просрочка больше, чем она есть.
  const todayMs = Date.parse(`${new Date(nowMs).toISOString().slice(0, 10)}T00:00:00.000Z`);
  const daysLeft = Math.round((dueMs - todayMs) / DAY_MS);
  if (daysLeft < 0) return Object.freeze({ ...base, daysLeft, due: true, reason: 'overdue' });
  if (daysLeft <= KNOWLEDGE_REVIEW_LEAD_DAYS) {
    return Object.freeze({ ...base, daysLeft, due: true, reason: 'soon' });
  }
  return Object.freeze({ ...base, daysLeft, due: false, reason: 'ok' });
}

/**
 * Отбирает файлы, о которых стоит напомнить, — самые просроченные первыми.
 *
 * зачем сортировка: если напоминание длинное, глаз читает первые строки.
 * Наверху должно быть то, что протухло сильнее всего.
 */
export function selectKnowledgeReviewsDue(
  files: readonly { readonly name: string; readonly topic: string; readonly reviewBy: string | null }[],
  nowMs: number,
): readonly KnowledgeReviewStatus[] {
  const due = files.map((file) => evaluateKnowledgeReview(file, nowMs)).filter((status) => status.due);
  return Object.freeze([...due].sort((a, b) => (a.daysLeft ?? -9_999) - (b.daysLeft ?? -9_999)));
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Текст напоминания в телеграм.
 *
 * зачем называть конкретный файл и срок: напоминание «проверьте знание» без
 * адреса откладывают. Владелец должен видеть, ЧТО открыть и насколько оно
 * просрочено, не заходя никуда.
 */
export function buildKnowledgeReviewNotice(
  statuses: readonly KnowledgeReviewStatus[],
  adminUrl: string,
): string {
  if (statuses.length === 0) return '';
  const lines = statuses.map((status) => {
    const topic = escapeHtml(status.topic || status.file);
    if (status.reason === 'missing_date') return `• <b>${topic}</b> — не указан срок пересмотра`;
    const days = Math.abs(status.daysLeft ?? 0);
    if (status.reason === 'overdue') {
      return `• <b>${topic}</b> — просрочено на ${days} ${pluralDays(days)}`;
    }
    return `• <b>${topic}</b> — пересмотреть через ${days} ${pluralDays(days)}`;
  });
  return [
    '📚 <b>Пора обновить устав Phraseman</b>',
    '',
    ...lines,
    '',
    'Что изменилось в приложении за месяц: новые разделы, переименования,',
    'включённые и выключенные функции, изменения тарифов.',
    '',
    `Открыть: ${escapeHtml(adminUrl)}`,
  ].join('\n');
}

function pluralDays(count: number): string {
  const tail = count % 100;
  if (tail >= 11 && tail <= 14) return 'дней';
  switch (count % 10) {
    case 1: return 'день';
    case 2:
    case 3:
    case 4: return 'дня';
    default: return 'дней';
  }
}
