import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { createHash } from 'crypto';
import { ENFORCE_APP_CHECK_OPENAI } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { resolvePremiumAccess } from './premium_status';
import { resolveConfiguredDialogModel, modelSupportsJsonObject } from './openai_dialog_model_config';
import { resolveRemoteBool } from './remote_gates';
import { assertAiStudyLanguage, resolveStudyTarget, studyTargetName, type StudyTarget } from './ai_language_contract';
import { evaluateSafety, moderateUserText, recordSafetyFlag, SAFETY_SYSTEM_INSTRUCTION } from './ai_safety';
import { ADMIN_ALERT_BOT_TOKEN } from './admin_alerts';
import {
  buildScenarioSystemPrompt,
  enforceRateLimit,
  parseGameEnvelope,
  asInterfaceLang,
} from './premium_dialog';

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');

/**
 * «Разговорный клуб» — голосовые миссии, привязанные к урокам курса
 * (specs/speaking-club.md, волна 1). Отдельный движок ПОВЕРХ паттернов
 * premium_dialog: свои коллекции квот/биллинга, своя экономика
 * («1 полная миссия в день» для free вместо пожизненных диалогов),
 * плюс блок фраз урока в промпте. Файлы диалогов не трогаем.
 *
 * НЕ в deploy:safe whitelist — деплой прицельно:
 *   firebase deploy --only functions:speakingClubSend,functions:speakingClubReview
 */

const REGION = 'us-central1';
const QUOTA_COLLECTION = 'speaking_club_quotas';
const BILLING_COLLECTION = 'speaking_club_billing';

const MAX_USER_TEXT = 2000;
const MAX_HISTORY_TURNS = 8;
const MAX_OUTPUT_TOKENS = 200;
// Игровой конверт (reply + mood + objectivesMet + …) — как в premium_dialog.
const GAME_OUTPUT_TOKENS = 600;

/**
 * Free: 1 ПОЛНАЯ миссия в день (спека §7 — «не повторяем ошибку Loora»:
 * бесплатная миссия не обрубается, поэтому внутри дня действует только
 * общий кап реплик — страховка бюджета, а не игровой лимит).
 * Клиентский зеркальный лимит: app/speaking_club_client.ts (FREE_MISSIONS_PER_DAY).
 */
const FREE_MISSIONS_PER_DAY = 1;
const FREE_DAILY_REPLIES = 40;
const PREMIUM_DAILY_REPLIES = 300;

const MAX_TARGET_PHRASES = 4;
const MAX_TARGET_PHRASE_CHARS = 90;

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

type ChatRole = 'system' | 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface SpeakingClubSendRequest {
  userText?: unknown;
  cefr?: unknown;
  history?: unknown;
  role?: unknown;
  setting?: unknown;
  goalEn?: unknown;
  persona?: unknown;
  missionId?: unknown;
  lessonId?: unknown;
  interfaceLang?: unknown;
  studyTarget?: unknown;
  objectives?: unknown;
  temperament?: unknown;
  /** Целевые фразы урока — ученик должен произнести их в разговоре. */
  targetPhrases?: unknown;
}

interface OpenAIChatResponse {
  choices?: { message?: { content?: unknown } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function asCefr(value: unknown): string {
  const c = text(value, 2).toUpperCase();
  return ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(c) ? c : 'A1';
}

function sanitizeHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  const result: ChatMessage[] = [];
  for (const raw of value.slice(-MAX_HISTORY_TURNS)) {
    const item = (raw ?? {}) as Record<string, unknown>;
    const role = text(item.role, 12);
    const content = text(item.content, 1000);
    if ((role === 'user' || role === 'assistant') && content) {
      result.push({ role, content });
    }
  }
  return result;
}

/**
 * Фразы урока приходят от клиента по сети — чистим управляющие символы и
 * кавычки-ограничители, как sanitizeObjectiveText в premium_dialog (аудит H10),
 * чтобы скомпрометированный клиент не пропихнул многострочный prompt-injection.
 */
export function sanitizeTargetPhrases(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const raw of value.slice(0, MAX_TARGET_PHRASES)) {
    const phrase = text(raw, MAX_TARGET_PHRASE_CHARS)
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001F]+/g, ' ')
      .replace(/"/g, '’')
      .replace(/\s+/g, ' ')
      .trim();
    if (phrase) out.push(phrase);
  }
  return out;
}

/**
 * Блок миссии: фразы урока, которые собеседник должен «вытянуть» из ученика.
 * Дополняет scenario-промпт premium_dialog (фразовые objectives имеют id
 * `phrase_N` — конверт objectivesMet отмечает их выполненными).
 */
export function buildMissionPhraseBlock(targetPhrases: string[], studyTarget: StudyTarget): string {
  if (targetPhrases.length === 0) return '';
  const targetName = studyTargetName(studyTarget);
  const lines = targetPhrases.map((p, i) => `  - phrase_${i + 1}: "${p}"`).join('\n');
  return `

LESSON MISSION PHRASES (the whole point of this scene): the learner has just studied these ${targetName} phrases and must SAY each of them naturally during the conversation:
${lines}
- Steer the scene so each phrase becomes the natural thing to say; ask questions whose natural answer uses the phrase.
- If the learner is stuck, model the phrase inside YOUR OWN line first (as a natural sentence), then invite them to answer.
- Count the matching sub-goal (phrase_N) as done ONLY when the LEARNER has said that phrase or a very close variant of it. Your own use of the phrase never counts.
- Never read this list out loud, never mention "phrases" or "lesson" — stay inside the scene.`;
}

function docId(prefix: string, authUid: string, stableUid: string): string {
  const hash = createHash('sha256').update(`${prefix}|${authUid}|${stableUid}`).digest('hex').slice(0, 48);
  return `${prefix}_${hash}`;
}

function startOfNextUtcDay(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0, 0);
}

interface ClubQuotaCharge {
  /** Реплика списана (откатывается при сбое провайдера всегда). */
  replyCharged: boolean;
  /** Миссия дня списана ИМЕННО этим ходом (откатывается при сбое провайдера). */
  missionMarkedNow: boolean;
}

/**
 * Единый квота-документ клуба: дневной счётчик реплик (free и premium) и
 * дневной счётчик НАЧАТЫХ миссий (только free за замком). Всё в одной
 * транзакции — сервер источник правды, клиентский гейт bypassable.
 */
async function enforceClubQuota(
  authUid: string,
  stableUid: string,
  opts: { isPremiumTier: boolean; isNewMission: boolean; dailyReplyCap: number; dailyMissionCap: number | null },
): Promise<ClubQuotaCharge> {
  const db = admin.firestore();
  const now = Date.now();
  const ref = db.collection(QUOTA_COLLECTION).doc(docId('club', authUid, stableUid));
  return db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const resetAtMs = Number(data.resetAtMs ?? 0);
    const fresh = now >= resetAtMs;
    const replies = fresh ? 0 : Number(data.dailyReplies ?? 0);
    const missions = fresh ? 0 : Number(data.dailyMissions ?? 0);

    if (replies >= opts.dailyReplyCap) {
      console.warn('speaking_club rejected', {
        reason: opts.isPremiumTier ? 'club_premium_cap' : 'club_free_limit',
        replies,
        cap: opts.dailyReplyCap,
      });
      throw new HttpsError('resource-exhausted', opts.isPremiumTier ? 'club_premium_cap' : 'club_free_limit');
    }
    let missionMarkedNow = false;
    if (opts.isNewMission && opts.dailyMissionCap != null) {
      if (missions >= opts.dailyMissionCap) {
        console.warn('speaking_club rejected', { reason: 'club_mission_limit', missions, cap: opts.dailyMissionCap });
        throw new HttpsError('resource-exhausted', 'club_mission_limit');
      }
      missionMarkedNow = true;
    }

    tx.set(ref, {
      authUid,
      stableUid,
      quotaTier: opts.isPremiumTier ? 'premium' : 'free',
      dailyReplies: replies + 1,
      dailyMissions: missionMarkedNow ? missions + 1 : (fresh ? 0 : missions),
      resetAtMs: fresh ? startOfNextUtcDay(now) : resetAtMs,
      updatedAtMs: now,
    }, { merge: true });
    return { replyCharged: true, missionMarkedNow };
  });
}

/** Откат списаний, если платный вызов провайдера упал — сбой не сжигает миссию дня. */
async function releaseClubQuota(authUid: string, stableUid: string, charge: ClubQuotaCharge): Promise<void> {
  if (!charge.replyCharged && !charge.missionMarkedNow) return;
  const db = admin.firestore();
  const ref = db.collection(QUOTA_COLLECTION).doc(docId('club', authUid, stableUid));
  await db.runTransaction(async (tx) => {
    const data = (await tx.get(ref)).data() ?? {};
    const patch: Record<string, unknown> = { releasedAtMs: Date.now() };
    const replies = Number(data.dailyReplies ?? 0);
    if (charge.replyCharged && replies > 0) patch.dailyReplies = replies - 1;
    const missions = Number(data.dailyMissions ?? 0);
    if (charge.missionMarkedNow && missions > 0) patch.dailyMissions = missions - 1;
    tx.set(ref, patch, { merge: true });
  });
}

/**
 * ЯЗЫК-ЗАМОК реплики собеседника (паттерн assertDialogReplyMatchesTarget).
 * Feature-литерал 'premium_dialog' — намеренно: ai_language_contract.ts сейчас
 * правится в параллельной сессии; собственный литерал 'speaking_club' добавим
 * отдельным коммитом, когда файл освободится (спека §8, хвост волны 1).
 */
function assertClubReplyMatchesTarget(reply: string, studyTarget: StudyTarget): void {
  const stripped = reply.replace(/\[\[|\]\]/g, ' ').trim();
  if (!stripped) return;
  try {
    assertAiStudyLanguage({ text: stripped, studyTarget, feature: 'premium_dialog' });
  } catch (e) {
    console.error('speaking_club reply language guard tripped', {
      studyTarget,
      detail: e instanceof HttpsError ? e.message : String((e as Error)?.message ?? e).slice(0, 120),
    });
    throw new HttpsError('unavailable', 'dialog_provider_failed');
  }
}

interface SanitizedObjective {
  id: string;
  en: string;
}

function sanitizeObjectives(value: unknown): SanitizedObjective[] {
  if (!Array.isArray(value)) return [];
  const out: SanitizedObjective[] = [];
  for (const raw of value.slice(0, 6)) {
    const item = (raw ?? {}) as Record<string, unknown>;
    const id = text(item.id, 64)
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001F]+/g, ' ').replace(/\s+/g, ' ').trim();
    const en = text(item.en, 120)
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001F]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (id && en) out.push({ id, en });
  }
  return out;
}

export const speakingClubSend = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 30,
  memory: '512MiB',
  maxInstances: 20,
  secrets: [OPENAI_API_KEY, ADMIN_ALERT_BOT_TOKEN],
}, async (request) => {
  if (!request.auth?.uid) {
    console.warn('speaking_club rejected', { reason: 'auth_required' });
    throw new HttpsError('unauthenticated', 'auth_required');
  }

  const apiKey = text(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
  if (!apiKey) {
    console.error('speaking_club rejected', { reason: 'openai_key_missing' });
    throw new HttpsError('failed-precondition', 'openai_key_missing');
  }

  const data = (request.data ?? {}) as SpeakingClubSendRequest;
  const cefr = asCefr(data.cefr);
  const userText = text(data.userText, MAX_USER_TEXT);
  if (!userText) {
    console.warn('speaking_club rejected', { reason: 'user_text_required' });
    throw new HttpsError('invalid-argument', 'user_text_required');
  }

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const studyTarget = resolveStudyTarget(data.studyTarget);

  const [dialogModel, stableUid, clubGatedByPremium] = await Promise.all([
    resolveConfiguredDialogModel(db, process.env.OPENAI_DIALOG_MODEL),
    resolveStableUidForAuth(db, authUid),
    // «Фри для всех» через Пульт: gate_speaking_club_premium=false → free-юзеры
    // получают premium-капы (безлимит миссий, дневной кап реплик от абьюза).
    resolveRemoteBool(db, 'gate_speaking_club_premium', true),
  ]);

  const history = sanitizeHistory(data.history);
  // Пустая история = первый ход новой миссии: по нему тратится «миссия дня» free.
  const isNewMission = history.length === 0;

  const [isPremium] = await Promise.all([
    resolvePremiumAccess(db, stableUid, Date.now(), authUid),
    // Общее окно rate-limit с диалогами (60/час) — консервативная общая страховка.
    enforceRateLimit(authUid, stableUid),
  ]);

  const premiumTier = isPremium || !clubGatedByPremium;
  const charge = await enforceClubQuota(authUid, stableUid, {
    isPremiumTier: premiumTier,
    isNewMission,
    dailyReplyCap: premiumTier ? PREMIUM_DAILY_REPLIES : FREE_DAILY_REPLIES,
    dailyMissionCap: premiumTier ? null : FREE_MISSIONS_PER_DAY,
  });

  const objectives = sanitizeObjectives(data.objectives);
  const targetPhrases = sanitizeTargetPhrases(data.targetPhrases);

  // Scenario-промпт диалогового движка (роль/сеттинг/персона/цели/game-конверт)
  // + блок фраз урока + safety. buildScenarioSystemPrompt берёт поля из data —
  // формы совпадают (role/setting/goalEn/persona/objectives/temperament).
  const baseSystemPrompt = buildScenarioSystemPrompt(cefr, {
    ...data,
    scenarioId: data.missionId,
  } as Parameters<typeof buildScenarioSystemPrompt>[1]);
  const systemPrompt = `${baseSystemPrompt}${buildMissionPhraseBlock(targetPhrases, studyTarget)}\n\n${SAFETY_SYSTEM_INSTRUCTION}`;

  // Два слоя safety на входящем тексте — как в premium_dialog: ключевые слова
  // мгновенно, OpenAI Moderation параллельно платному вызову; флаги дописываем
  // перед return (fire-and-forget может быть убит рантаймом).
  const safetyCtx = {
    authUid,
    stableUid,
    ageBracket: null,
    mode: 'speaking_club',
    userText,
    history,
  };
  const safetyVerdict = evaluateSafety(userText);
  const keywordFlagPromise = safetyVerdict.flagged
    ? recordSafetyFlag(safetyVerdict, safetyCtx).catch(() => {})
    : null;
  const moderationFlagPromise = safetyVerdict.flagged
    ? null
    : moderateUserText(apiKey, userText)
        .then((verdict) => (verdict.flagged ? recordSafetyFlag(verdict, safetyCtx) : undefined))
        .catch(() => {});
  const flushSafetyFlags = async (): Promise<void> => {
    if (keywordFlagPromise) await keywordFlagPromise;
    if (moderationFlagPromise) await moderationFlagPromise;
  };

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userText },
  ];

  const gameMode = objectives.length > 0 && modelSupportsJsonObject(dialogModel);
  if (objectives.length > 0 && !gameMode) {
    console.warn('speaking_club game mode disabled — model lacks json_object support', {
      dialogModel,
      missionId: text(data.missionId, 80) || null,
    });
  }

  let json: OpenAIChatResponse;
  let assistantMessage: string;
  let turnState: unknown = null;
  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: dialogModel,
        max_tokens: gameMode ? GAME_OUTPUT_TOKENS : MAX_OUTPUT_TOKENS,
        messages,
        temperature: 0.8,
        ...(gameMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('speaking_club chat failed', {
        status: response.status,
        model: dialogModel,
        missionId: text(data.missionId, 80) || null,
        detail: detail.slice(0, 500),
      });
      throw new HttpsError('unavailable', 'dialog_provider_failed');
    }

    json = (await response.json()) as OpenAIChatResponse;
    const rawContent = text(json.choices?.[0]?.message?.content, 1800);
    if (gameMode) {
      const env = parseGameEnvelope(rawContent, objectives.map((o) => o.id));
      if (env && env.reply) {
        assistantMessage = env.reply;
        turnState = env.turnState;
        if (env.truncated) {
          console.warn('speaking_club game envelope truncated — reply recovered, turnState dropped', {
            missionId: text(data.missionId, 80) || null,
          });
        }
      } else {
        console.error('speaking_club game envelope unrecoverable — no reply extractable', {
          missionId: text(data.missionId, 80) || null,
        });
        assistantMessage = '';
      }
    } else {
      assistantMessage = rawContent;
    }
    if (!assistantMessage) {
      console.error('speaking_club empty reply', { model: dialogModel, missionId: text(data.missionId, 80) || null });
      throw new HttpsError('unavailable', 'dialog_empty_reply');
    }
    assertClubReplyMatchesTarget(assistantMessage, studyTarget);
  } catch (error) {
    await releaseClubQuota(authUid, stableUid, charge).catch((releaseError) => {
      console.error('speaking_club quota release failed', {
        reason: error instanceof HttpsError ? error.message : 'provider_exception',
        releaseError: String((releaseError as Error)?.message ?? releaseError).slice(0, 300),
      });
    });
    await flushSafetyFlags();
    if (error instanceof HttpsError) throw error;
    console.error('speaking_club provider exception', {
      model: dialogModel,
      missionId: text(data.missionId, 80) || null,
      error: String((error as Error)?.message ?? error).slice(0, 500),
    });
    throw new HttpsError('unavailable', 'dialog_provider_failed');
  }

  const usage = json.usage ?? {};
  await db.collection(BILLING_COLLECTION).doc().set({
    uid: stableUid,
    authUid,
    mode: 'mission',
    model: dialogModel,
    cefr,
    missionId: text(data.missionId, 80) || null,
    lessonId: Number(data.lessonId) || null,
    promptTokens: Number(usage.prompt_tokens ?? 0),
    completionTokens: Number(usage.completion_tokens ?? 0),
    totalTokens: Number(usage.total_tokens ?? 0),
    isPremium,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
  });

  await flushSafetyFlags();

  return {
    ok: true,
    assistantMessage,
    remainingQuota: 0,
    model: dialogModel,
    turnState,
  };
});

// ── Финальный разбор миссии («итог миссии», волна 1 = review-паттерн) ────────

const MAX_REVIEW_TURNS = 40;
const MAX_TURN_CHARS = 600;
const MAX_REVIEW_OUTPUT_TOKENS = 900;
const MAX_CORRECTIONS = 8;

const LEARNER_LANG_NAME: Record<string, string> = {
  ru: 'Russian',
  uk: 'Ukrainian',
  es: 'Spanish',
  'pt-BR': 'Brazilian Portuguese',
  vi: 'Vietnamese',
  id: 'Indonesian',
  tr: 'Turkish',
  pl: 'Polish',
  en: 'English',
};

interface ClubReviewRequest {
  history?: unknown;
  cefr?: unknown;
  interfaceLang?: unknown;
  missionId?: unknown;
  goalEn?: unknown;
  studyTarget?: unknown;
  targetPhrases?: unknown;
}

export interface ClubReviewCorrection {
  original: string;
  corrected: string;
  note: string;
}

export interface ClubReviewResult {
  praise: string;
  corrections: ClubReviewCorrection[];
  tip: string;
}

function sanitizeReviewHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  const result: ChatMessage[] = [];
  for (const raw of value.slice(-MAX_REVIEW_TURNS)) {
    const item = (raw ?? {}) as Record<string, unknown>;
    const role = text(item.role, 12);
    const content = text(item.content, MAX_TURN_CHARS);
    if ((role === 'user' || role === 'assistant') && content) {
      result.push({ role: role as ChatRole, content });
    }
  }
  return result;
}

function buildClubReviewSystemPrompt(
  cefr: string,
  learnerLangName: string,
  goalEn: string,
  studyTarget: StudyTarget,
  targetPhrases: string[],
): string {
  const goalLine = goalEn ? `\nThe mission goal was: ${goalEn}.` : '';
  const targetName = studyTargetName(studyTarget);
  const phrasesLine = targetPhrases.length > 0
    ? `\nThe lesson phrases the learner was practicing: ${targetPhrases.map((p) => `"${p}"`).join(', ')}. If the learner used one of them well, mention it warmly in the praise.`
    : '';
  return `You are a warm, encouraging ${targetName} tutor inside the Phraseman language app. A learner has just finished a spoken practice mission with a role-play partner. Your job is a short, kind debrief of the learner's ${targetName}.${goalLine}${phrasesLine}
The learner's level is ${cefr}. The learner's native language is ${learnerLangName}.

Review ONLY the learner's lines. The lines came from imperfect speech recognition — never comment on punctuation, capitalization, or obviously garbled recognition artifacts. Respond with a single JSON object and nothing else:
{"praise": "...", "corrections": [{"original": "...", "corrected": "...", "note": "..."}], "tip": "..."}

Rules:
- "praise": 1-2 warm, specific sentences in ${learnerLangName} about what the learner genuinely did well. Never invent things they did not say, never use empty flattery.
- "corrections": go through EVERY learner line. For each line with a language mistake add one item:
  - "original": the learner's line exactly as it was (shorten to the broken part if the line is long);
  - "corrected": the natural ${targetName} a friendly native speaker would use for the same idea, kept at level ${cefr};
  - "note": ONE short, kind sentence in ${learnerLangName} explaining the fix in everyday words — no grammar jargon, no mockery.
  Skip lines that are already fine. At most ${MAX_CORRECTIONS} items — if there are more mistakes, pick the most useful ones.
- "tip": one short, practical suggestion in ${learnerLangName} for the next mission; quote any recommended ${targetName} phrase in ${targetName}.
- Comment ONLY on language. Never scold the learner for rudeness, topics, or how the scene went.
- If every learner line is fine, return "corrections": [] and make "praise" a bit warmer.`;
}

export function parseClubReviewEnvelope(raw: string): ClubReviewResult | null {
  const unfenced = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(unfenced) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const rawCorrections = Array.isArray(parsed.corrections) ? parsed.corrections : [];
  const corrections: ClubReviewCorrection[] = [];
  for (const item of rawCorrections.slice(0, MAX_CORRECTIONS)) {
    const c = (item ?? {}) as Record<string, unknown>;
    const original = text(c.original, 300);
    const corrected = text(c.corrected, 300);
    if (!original || !corrected) continue;
    corrections.push({ original, corrected, note: text(c.note, 300) });
  }

  const praise = text(parsed.praise, 500);
  const tip = text(parsed.tip, 400);
  if (!praise && corrections.length === 0 && !tip) return null;
  return { praise, corrections, tip };
}

export const speakingClubReview = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_OPENAI,
  timeoutSeconds: 30,
  memory: '256MiB',
  maxInstances: 20,
  secrets: [OPENAI_API_KEY],
}, async (request) => {
  if (!request.auth?.uid) {
    console.warn('speaking_club_review rejected', { reason: 'auth_required' });
    throw new HttpsError('unauthenticated', 'auth_required');
  }

  const data = (request.data ?? {}) as ClubReviewRequest;

  const history = sanitizeReviewHistory(data.history);
  const learnerTurns = history.filter((t) => t.role === 'user');
  if (learnerTurns.length === 0) {
    console.warn('speaking_club_review rejected', { reason: 'history_required' });
    throw new HttpsError('invalid-argument', 'history_required');
  }

  const apiKey = text(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY, 300);
  if (!apiKey) {
    console.error('speaking_club_review rejected', { reason: 'openai_key_missing' });
    throw new HttpsError('failed-precondition', 'openai_key_missing');
  }

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForAuth(db, authUid);

  // Общий rate-limit с send: разбор — один вызов на миссию, окна хватает.
  await enforceRateLimit(authUid, stableUid);

  const cefr = asCefr(data.cefr);
  const interfaceLang = asInterfaceLang(data.interfaceLang);
  const learnerLangName = LEARNER_LANG_NAME[interfaceLang] ?? LEARNER_LANG_NAME.ru;
  const goalEn = text(data.goalEn, 200);
  const studyTarget = resolveStudyTarget(data.studyTarget);
  const targetPhrases = sanitizeTargetPhrases(data.targetPhrases);

  const transcript = history
    .map((t) => `${t.role === 'user' ? 'Learner' : 'Partner'}: ${t.content.replace(/\[\[|\]\]/g, '')}`)
    .join('\n');

  const dialogModel = await resolveConfiguredDialogModel(db, process.env.OPENAI_DIALOG_MODEL);
  const useJsonFormat = modelSupportsJsonObject(dialogModel);

  let json: OpenAIChatResponse;
  let review: ClubReviewResult | null;
  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: dialogModel,
        max_tokens: MAX_REVIEW_OUTPUT_TOKENS,
        temperature: 0.3,
        messages: [
          { role: 'system', content: buildClubReviewSystemPrompt(cefr, learnerLangName, goalEn, studyTarget, targetPhrases) },
          { role: 'user', content: transcript },
        ],
        ...(useJsonFormat ? { response_format: { type: 'json_object' } } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('speaking_club_review chat failed', {
        status: response.status,
        model: dialogModel,
        missionId: text(data.missionId, 80) || null,
        detail: detail.slice(0, 500),
      });
      throw new HttpsError('unavailable', 'dialog_provider_failed');
    }

    json = (await response.json()) as OpenAIChatResponse;
    review = parseClubReviewEnvelope(text(json.choices?.[0]?.message?.content, 6000));
    if (!review) {
      console.error('speaking_club_review unparseable reply', {
        model: dialogModel,
        missionId: text(data.missionId, 80) || null,
      });
      throw new HttpsError('unavailable', 'dialog_provider_failed');
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('speaking_club_review provider exception', {
      model: dialogModel,
      missionId: text(data.missionId, 80) || null,
      error: String((error as Error)?.message ?? error).slice(0, 500),
    });
    throw new HttpsError('unavailable', 'dialog_provider_failed');
  }

  const usage = json.usage ?? {};
  await db.collection(BILLING_COLLECTION).doc().set({
    uid: stableUid,
    authUid,
    mode: 'review',
    model: dialogModel,
    cefr,
    missionId: text(data.missionId, 80) || null,
    promptTokens: Number(usage.prompt_tokens ?? 0),
    completionTokens: Number(usage.completion_tokens ?? 0),
    totalTokens: Number(usage.total_tokens ?? 0),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: Date.now(),
  }).catch(() => {});

  return { ok: true, ...review };
});
