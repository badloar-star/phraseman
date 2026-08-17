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

import {
  evaluateSafety,
  moderateUserText,
  recordSafetyFlag,
  type SafetyCategory,
  type SafetyVerdict,
} from './ai_safety';

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
    const transcript = renderSafetyTranscript(args.history);
    for (const item of all) {
      await recordSafetyFlag(item.verdict, {
        authUid: args.authUid,
        stableUid: args.stableUid,
        mode: args.mode,
        userText: item.userText,
        history: args.history,
        transcript,
        source: item.source,
      });
    }
    return { categories: all.map((i) => i.verdict.category as SafetyCategory) };
  } catch (error) {
    console.error('[max_voice_safety] review failed', error);
    return { categories: [] };
  }
}
