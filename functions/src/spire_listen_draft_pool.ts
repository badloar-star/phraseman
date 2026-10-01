// ═══════════════════════════════════════════════════════════════════════════
// spire_listen_draft_pool.ts — задания Шпиля «на слух» и «диктант» из
// Learning V2 (PM-286) → задания пакета недели.
//
// зачем (координатор 01.10, Q34 (а); D77 — выпуск без носителя разрешён):
// английский черновик (611 заданий: 493 listen_choose + 118 listen_build,
// тексты из УЖЕ опубликованного курса Learning V2, verified:false) идёт в
// недельный пакет английского сразу. es/de/fr — НЕ включаем: их черновиков нет,
// а решение касалось только en. Список языков — одна константа ниже.
//
// Звук — голос телефона (D47): audioUri `device-tts:<lang>:<hash>` разрешает
// клиентский modules/spire/listen_audio.ts. Чужой язык в URI или не-TTS-ссылка
// отбраковываются здесь, чтобы в пакет не попало задание, которое не зазвучит.
//
// «verified» в контракте Арены значит «человек проверил, можно играть».
// Здесь допуск даёт решение владельца/координатора, а не проверка человеком,
// поэтому задание помечается тегом SPIRE_LISTEN_DRAFT_ADMISSION_TAG — по нему
// любое задание черновика находится и снимается одной выборкой.
//
// Модуль чистый: ни сети, ни Firestore. Источник — bundled JSON
// (functions/scripts/copy_generated_assets.js), 0 чтений.
// ═══════════════════════════════════════════════════════════════════════════
import { validateTournamentTask, type TournamentTask } from './tournament_core';

/** Языки, для которых черновик listen/dictate допущен в пакет (Q34 (а) — только en). */
export const SPIRE_LISTEN_DRAFT_RELEASED_LANGS: readonly string[] = Object.freeze(['en']);
export const SPIRE_LISTEN_DRAFT_POOL_TAG = 'pool:spire_listen_v2_draft';
/** Метка допуска без проверки носителем (Q34 (а), D77). */
export const SPIRE_LISTEN_DRAFT_ADMISSION_TAG = 'admission:owner_q34a_d77_unverified';
export const SPIRE_LISTEN_MODES: readonly string[] = Object.freeze(['listen_choose', 'listen_build']);

export type SpireListenDraftRejectReason =
  | 'row_not_object'
  | 'lang_mismatch'
  | 'mode_not_listen'
  | 'not_draft_pool'
  | 'audio_not_device_tts'
  | 'contract_invalid';

export type SpireListenDraftPool = Readonly<{
  tasks: TournamentTask[];
  released: boolean;
  totalRows: number;
  rejected: Readonly<Partial<Record<SpireListenDraftRejectReason, number>>>;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Ключ происхождения в форме контракта `источник:версия:id` (без двоеточий в id).
 * зачем: конвертер пишет `learning-v2:1:en:lesson-03:session-43:i02`, а контракт
 * задания допускает ровно два двоеточия — заменяем хвостовые на «/», связь с
 * исходным упражнением Learning V2 сохраняется.
 */
function contractProvenanceKey(key: string): string {
  const parts = key.split(':');
  if (parts.length <= 3) return key;
  return `${parts[0]}:${parts[1]}:${parts.slice(2).join('/')}`;
}

function rowToTask(row: unknown, lang: string): { task: TournamentTask } | { reason: SpireListenDraftRejectReason } {
  if (!isRecord(row)) return { reason: 'row_not_object' };
  if (row.studyTarget !== lang) return { reason: 'lang_mismatch' };
  if (!SPIRE_LISTEN_MODES.includes(String(row.mode))) return { reason: 'mode_not_listen' };
  const tags = Array.isArray(row.tags) ? row.tags.filter((t): t is string => typeof t === 'string') : [];
  if (!tags.includes(SPIRE_LISTEN_DRAFT_POOL_TAG)) return { reason: 'not_draft_pool' };
  const payload = isRecord(row.payload) ? row.payload : {};
  const audioRe = new RegExp(`^device-tts:${lang}:[0-9a-f]+$`);
  if (typeof payload.audioUri !== 'string' || !audioRe.test(payload.audioUri)) return { reason: 'audio_not_device_tts' };
  // Только поля контракта задания: служебные поля черновика (sourceFile и т.п.) в пакет не идут.
  const task: TournamentTask = {
    taskId: String(row.taskId ?? ''),
    studyTarget: lang,
    mode: String(row.mode),
    isVoice: false,
    difficulty: Number(row.difficulty),
    payload: { ...payload },
    tags: [...tags.filter((t) => t !== SPIRE_LISTEN_DRAFT_ADMISSION_TAG), SPIRE_LISTEN_DRAFT_ADMISSION_TAG],
    ...(Array.isArray(row.provenanceKeys) ? { provenanceKeys: row.provenanceKeys.map((k) => contractProvenanceKey(String(k))) } : {}),
    verified: true,
  };
  if (!validateTournamentTask(task).ok) return { reason: 'contract_invalid' };
  return { task };
}

/**
 * Черновик → задания пакета. Не допущенный язык → пустой пул и released:false
 * (сборщик пишет причину в лог, пакет собирается как раньше).
 */
export function spireListenDraftPool(lang: string, rows: readonly unknown[]): SpireListenDraftPool {
  if (!SPIRE_LISTEN_DRAFT_RELEASED_LANGS.includes(lang)) {
    return { tasks: [], released: false, totalRows: rows.length, rejected: {} };
  }
  const tasks: TournamentTask[] = [];
  const rejected: Partial<Record<SpireListenDraftRejectReason, number>> = {};
  const seen = new Set<string>();
  for (const row of rows) {
    const out = rowToTask(row, lang);
    if ('reason' in out) {
      rejected[out.reason] = (rejected[out.reason] ?? 0) + 1;
      continue;
    }
    if (seen.has(out.task.taskId)) continue;
    seen.add(out.task.taskId);
    tasks.push(out.task);
  }
  return { tasks, released: true, totalRows: rows.length, rejected };
}
