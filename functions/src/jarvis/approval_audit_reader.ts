import { JARVIS_APPROVAL_AUDIT_COLLECTION } from './approval_audit';

/**
 * Чтение последних записей журнала подтверждений для панели (бриф в187:
 * ссылки из решения на аудит; в174: страница Audit).
 *
 * зачем отдельный модуль от approval_audit.ts: тот пишет записи и не должен
 * знать про панель, этот читает и не должен знать про кнопки. Разные
 * направления потока данных — разные файлы.
 */

/** Больше полусотни записей на панели читать бессмысленно — она не журнал. */
export const MAX_AUDIT_ENTRIES = 30;

export interface AuditEntryView {
  readonly department: string;
  readonly action: string;
  readonly outcome: string;
  readonly atMs: number;
  readonly decisionHash: string;
}

function parseEntry(raw: unknown): AuditEntryView | null {
  const data = raw as Record<string, unknown>;
  const department = typeof data.department === 'string' ? data.department : null;
  const action = typeof data.action === 'string' ? data.action : null;
  const outcome = typeof data.outcome === 'string' ? data.outcome : null;
  const atMs = typeof data.atMs === 'number' ? data.atMs : null;
  const decisionHash = typeof data.decisionHash === 'string' ? data.decisionHash : null;
  if (!department || !action || !outcome || atMs === null || decisionHash === null) return null;
  return Object.freeze({ department, action, outcome, atMs, decisionHash });
}

export async function fetchRecentApprovalAudit(
  db: FirebaseFirestore.Firestore,
): Promise<readonly AuditEntryView[]> {
  try {
    const snap = await db
      .collection(JARVIS_APPROVAL_AUDIT_COLLECTION)
      .orderBy('atMs', 'desc')
      .limit(MAX_AUDIT_ENTRIES)
      .get();
    // guard-ok: один .get() выше вернул страницу разом; .map()/.filter() ниже
    // работают с уже полученными документами в памяти.
    return snap.docs.map((doc) => parseEntry(doc.data())).filter((entry): entry is AuditEntryView => entry !== null);
  } catch {
    // Недоступный журнал — панель показывает пусто, а не падает целиком.
    return [];
  }
}
