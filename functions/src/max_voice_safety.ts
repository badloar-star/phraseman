// ═══════════════════════════════════════════════════════════════════════════
// max_voice_safety.ts — сейфти-журнал голосовых уроков/звонков.
//
// зачем: владелец 2026-08-16 — «сохранение всех грубых и опасных разговоров с
// оповещением в Telegram», чтобы у приложения не было судебного кейса,
// удаления из сторов и плохой репутации. Три источника флага по транскрипту:
//   1) учитель сам вызвал инструмент flag_safety во время урока (клиент передал);
//   2) словарный детектор ai_safety.evaluateSafety по каждой реплике ученика;
//   3) OpenAI Moderation по всему тексту ученика (одним вызовом, дёшево).
// Каждая уникальная категория → recordSafetyFlag: запись в safety_flags
// (админка + Джарвис) с ПОЛНЫМ транскриптом и мгновенный Telegram-алерт.
// Никогда не бросает: сбой журнала не должен ломать разбор урока.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import {
  SAFETY_FLAG_RETENTION_MS,
  evaluateSafety,
  moderateUserText,
  recordSafetyFlag,
  type SafetyCategory,
  type SafetyVerdict,
} from './ai_safety';

if (!admin.apps.length) admin.initializeApp();

export const VOICE_SAFETY_TRANSCRIPT_MAX_CHARS = 12_000;

const CLIENT_KINDS: ReadonlySet<SafetyCategory> = new Set<SafetyCategory>([
  'self_harm', 'suicide', 'abuse', 'harassment', 'sexual', 'sexual_minors', 'violence', 'hate', 'illicit', 'minor', 'other',
]);

export interface VoiceSafetyClientFlag {
  kind: string;
  note?: string;
}

export interface VoiceSafetyTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface VoiceSafetyReviewArgs {
  apiKey: string;
  authUid: string;
  stableUid: string;
  /** 'voice_tutor' | 'voice_call' — режим для админки/алерта. */
  mode: string;
  history: readonly VoiceSafetyTurn[];
  /** Флаги, поставленные учителем инструментом flag_safety (клиент собрал за урок). */
  clientFlags?: readonly VoiceSafetyClientFlag[];
  /** Сессия звонка: категории, уже записанные мгновенным репортом, не дублируем. */
  sessionId?: string;
}

export interface VoiceSafetyReviewResult {
  categories: SafetyCategory[];
}

/** Разбор клиентских флагов: только известные категории, дедуп, потолок. */
export function sanitizeClientSafetyFlags(value: unknown): VoiceSafetyClientFlag[] {
  if (!Array.isArray(value)) return [];
  const out: VoiceSafetyClientFlag[] = [];
  for (const raw of value.slice(0, 10)) {
    const item = (raw ?? {}) as Record<string, unknown>;
    const kind = String(item.kind ?? '').trim().slice(0, 24);
    if (!CLIENT_KINDS.has(kind as SafetyCategory)) continue;
    if (out.some((f) => f.kind === kind)) continue;
    out.push({ kind, note: String(item.note ?? '').trim().slice(0, 200) });
  }
  return out;
}

/** Полный транскрипт для журнала (роль: текст), обрезанный сверху по потолку. */
export function renderSafetyTranscript(history: readonly VoiceSafetyTurn[]): string {
  const text = history
    .map((t) => `${t.role === 'user' ? 'Learner' : 'Tutor'}: ${String(t.content ?? '').trim()}`)
    .join('\n');
  return text.length > VOICE_SAFETY_TRANSCRIPT_MAX_CHARS ? text.slice(-VOICE_SAFETY_TRANSCRIPT_MAX_CHARS) : text;
}

/**
 * Собрать вердикты из трёх источников. Чистая часть (без сети): клиентские флаги
 * + словарь; модерация — отдельным шагом в reviewVoiceSafety.
 */
export function collectLocalVoiceVerdicts(
  history: readonly VoiceSafetyTurn[],
  clientFlags: readonly VoiceSafetyClientFlag[],
): Array<{ verdict: SafetyVerdict; source: string; userText: string }> {
  const out: Array<{ verdict: SafetyVerdict; source: string; userText: string }> = [];
  const learnerLines = history.filter((t) => t.role === 'user').map((t) => String(t.content ?? ''));
  for (const flag of clientFlags) {
    out.push({
      verdict: { flagged: true, category: flag.kind as SafetyCategory, matched: 'tutor:flag_safety' },
      source: 'tutor_tool',
      userText: flag.note || learnerLines.slice(-1)[0] || '',
    });
  }
  for (const line of learnerLines) {
    const verdict = evaluateSafety(line);
    if (verdict.flagged) out.push({ verdict, source: 'keywords', userText: line });
  }
  return out;
}

/** Схлопнуть по категории (первый источник побеждает: инструмент учителя → словарь → модерация). */
export function dedupeVerdicts<T extends { verdict: SafetyVerdict }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const cat = item.verdict.category;
    if (!cat || seen.has(cat)) continue;
    seen.add(cat);
    out.push(item);
  }
  return out;
}

export async function reviewVoiceSafety(args: VoiceSafetyReviewArgs): Promise<VoiceSafetyReviewResult> {
  try {
    const clientFlags = args.clientFlags ?? [];
    const local = collectLocalVoiceVerdicts(args.history, clientFlags);
    const learnerText = args.history.filter((t) => t.role === 'user').map((t) => t.content).join('\n');
    let moderation: SafetyVerdict = { flagged: false, category: null, matched: null };
    try {
      moderation = await moderateUserText(args.apiKey, learnerText);
    } catch {
      // Модерация недоступна — словарь и флаги учителя уже отработали.
    }
    const all = dedupeVerdicts([
      ...local,
      ...(moderation.flagged ? [{ verdict: moderation, source: 'moderation', userText: learnerText.slice(-400) }] : []),
    ]);
    if (all.length === 0) return { categories: [] };
    // Категории этой сессии, уже записанные мгновенным репортом из урока
    // (maxVoiceSafetyReport), — не дублируем. Один маленький запрос, и только
    // когда есть что писать.
    const already = args.sessionId ? await alreadyFlaggedCategories(args.sessionId) : new Set<string>();
    const fresh = all.filter((i) => !already.has(String(i.verdict.category)));
    const transcript = renderSafetyTranscript(args.history);
    const nowMs = Date.now();
    for (const item of fresh) {
      await recordSafetyFlag(item.verdict, {
        authUid: args.authUid,
        stableUid: args.stableUid,
        mode: args.mode,
        userText: item.userText,
        history: args.history,
        transcript,
        source: item.source,
        sessionId: args.sessionId,
        retainUntilMs: nowMs + SAFETY_FLAG_RETENTION_MS,
      });
    }
    return { categories: all.map((i) => i.verdict.category as SafetyCategory) };
  } catch (error) {
    console.error('[max_voice_safety] review failed', error);
    return { categories: [] };
  }
}

async function alreadyFlaggedCategories(sessionId: string): Promise<Set<string>> {
  try {
    const snap = await admin.firestore().collection('safety_flags')
      .where('sessionId', '==', sessionId)
      .limit(20)
      .get();
    return new Set(snap.docs.map((d) => String(d.data()?.category ?? '')));
  } catch {
    return new Set();
  }
}

// ── Мгновенный репорт из урока ──────────────────────────────────────────────

const REGION = 'us-central1';
const REPORT_TURNS_MAX = 40;
const REPORT_TURN_CHARS = 600;

function sanitizeReportHistory(value: unknown): VoiceSafetyTurn[] {
  if (!Array.isArray(value)) return [];
  const out: VoiceSafetyTurn[] = [];
  for (const raw of value.slice(-REPORT_TURNS_MAX)) {
    const item = (raw ?? {}) as Record<string, unknown>;
    const role = item.role === 'user' ? 'user' : item.role === 'assistant' ? 'assistant' : null;
    const content = String(item.content ?? '').trim().slice(0, REPORT_TURN_CHARS);
    if (role && content) out.push({ role, content });
  }
  return out;
}

/**
 * Учитель вызвал flag_safety прямо в уроке → клиент немедленно шлёт сюда:
 * запись в safety_flags (дата, сессия, что говорил ученик, контекст, полный
 * транскрипт на этот момент, срок хранения 2 года) + Telegram сразу, не дожидаясь
 * разбора после урока (владелец 2026-08-16). Разбор потом дописывает только
 * НОВЫЕ категории (дедуп по sessionId).
 */
export const maxVoiceSafetyReport = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 20,
  memory: '256MiB',
  maxInstances: 10,
}, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const data = (request.data ?? {}) as Record<string, unknown>;
  const flags = sanitizeClientSafetyFlags([{ kind: data.kind, note: data.note }]);
  if (flags.length === 0) throw new HttpsError('invalid-argument', 'safety_kind_invalid');
  const sessionId = String(data.sessionId ?? '').trim().slice(0, 80);
  const history = sanitizeReportHistory(data.history);
  const mode = String(data.mode ?? '').trim() === 'voice_call' ? 'voice_call' : 'voice_tutor';
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid);
  const flag = flags[0];
  const learnerLines = history.filter((t) => t.role === 'user');
  await recordSafetyFlag(
    { flagged: true, category: flag.kind as SafetyCategory, matched: 'tutor:flag_safety' },
    {
      authUid,
      stableUid,
      mode,
      userText: flag.note || learnerLines.slice(-1)[0]?.content || '',
      history,
      transcript: renderSafetyTranscript(history),
      source: 'tutor_tool',
      sessionId: sessionId || undefined,
      retainUntilMs: Date.now() + SAFETY_FLAG_RETENTION_MS,
    },
  );
  return { ok: true };
});
