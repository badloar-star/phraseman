import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK, ENFORCE_APP_CHECK_SENSITIVE } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { openAiChat } from './explain/explain_provider';

const REGION = 'us-central1';
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const IDEAS_COLLECTION = 'user_ideas';
const RATE_COLLECTION = 'user_idea_rate_limits';
const IDEA_INBOX = 'idea_inbox';
const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * DAY_MS;

/** 1 идея в сутки на пользователя (защита от спама в админ-очереди). */
const MAX_IDEAS_PER_DAY = 1;

type IdeaCategory = 'feature' | 'improvement' | 'monetization' | 'content' | 'other';
const IDEA_CATEGORIES: readonly IdeaCategory[] = ['feature', 'improvement', 'monetization', 'content', 'other'];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function nullableText(value: unknown, max: number): string | null {
  const out = text(value, max);
  return out || null;
}

function enumText<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const out = text(value, 80) as T;
  return allowed.includes(out) ? out : fallback;
}

function numeric(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) Пользователь отправляет идею
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Пользователь присылает креативную идею (4 графы: название, как работает, чем
 * поможет, категория). Пишем в коллекцию user_ideas со status='pending'.
 * Никаких наград при отправке — год полного доступа выдаёт АДМИН при одобрении
 * через adminDecideUserIdea. Паттерн — копия submitClientReport.
 */
export const submitUserIdea = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 20,
  },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await resolveStableUidForAuth(db, authUid);
    const payload = asRecord(request.data?.payload ?? request.data);

    const title = text(payload.title, 120);
    const description = text(payload.description, 2000);
    const benefit = text(payload.benefit, 1000);
    const category = enumText(payload.category, IDEA_CATEGORIES, 'other');

    if (title.length < 3) throw new HttpsError('invalid-argument', 'title_required');
    if (description.length < 10) throw new HttpsError('invalid-argument', 'description_required');

    const now = Date.now();
    const rateRef = db.collection(RATE_COLLECTION).doc(stableUid);
    const ideaRef = db.collection(IDEAS_COLLECTION).doc();

    return db.runTransaction(async (tx) => {
      const rateSnap = await tx.get(rateRef);
      const rate = rateSnap.data() || {};
      const windowStartMs = numeric(rate.windowStartMs);
      const sameWindow = now - windowStartMs < DAY_MS;
      const count = sameWindow ? numeric(rate.count) : 0;
      if (count >= MAX_IDEAS_PER_DAY) {
        throw new HttpsError('resource-exhausted', 'rate_limited');
      }

      tx.set(
        rateRef,
        {
          stableUid,
          authUid,
          windowStartMs: sameWindow ? windowStartMs : now,
          count: count + 1,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAtMs: now,
        },
        { merge: true },
      );

      tx.create(ideaRef, {
        uid: stableUid,
        authUid,
        title,
        description,
        benefit,
        category,
        status: 'pending',
        userName: nullableText(payload.userName, 120),
        lang: nullableText(payload.lang, 16),
        platform: text(payload.platform, 40) || 'unknown',
        appVersion: text(payload.appVersion, 80) || 'unknown',
        createdAt: new Date(now).toISOString(),
        createdAtMs: now,
        serverCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { ok: true, id: ideaRef.id };
    });
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 2) Админ принимает решение по идее
// ─────────────────────────────────────────────────────────────────────────────
type IdeaDecision = 'approve' | 'reject';

/**
 * Локализованные дефолтные тексты модалки решения. Админ может переопределить любой
 * текст (titleRu/Uk + messageRu/Uk) — тогда показываем его. По Библии Phraseman:
 * approve = Стиль ИГРА+ИНВЕСТОР («год полного доступа»), reject = Стиль ЧЕЛОВЕК+ТРЕНЕР.
 */
function defaultDecisionTexts(decision: IdeaDecision): {
  titleRu: string;
  titleUk: string;
  titleEs: string;
  messageRu: string;
  messageUk: string;
  messageEs: string;
} {
  if (decision === 'approve') {
    return {
      titleRu: 'Поздравляем — твоя идея принята! 🎉',
      titleUk: 'Вітаємо — твою ідею прийнято! 🎉',
      titleEs: '¡Felicidades! Tu idea ha sido aceptada 🎉',
      messageRu:
        'Твоя идея одобрена и взята в разработку.\n\nВ благодарность мы открываем тебе Premium на целый год. Спасибо, что делаешь Phraseman лучше.',
      messageUk:
        'Твою ідею схвалено та взято в розробку.\n\nНа подяку ми відкриваємо тобі Premium на цілий рік. Дякуємо, що робиш Phraseman кращим.',
      messageEs:
        'Tu idea ha sido aprobada y pasa a desarrollo.\n\nComo agradecimiento, te abrimos Premium durante todo un año. Gracias por ayudar a mejorar Phraseman.',
    };
  }
  return {
    titleRu: 'Спасибо за идею',
    titleUk: 'Дякуємо за ідею',
    titleEs: 'Gracias por la idea',
    messageRu:
      'Мы внимательно прочитали твою идею, но пока не берём её в работу.\n\nЭто не повод останавливаться — присылай ещё. Каждая идея помогает нам расти.',
    messageUk:
      'Ми уважно прочитали твою ідею, але поки не беремо її в роботу.\n\nЦе не привід зупинятися — надсилай ще. Кожна ідея допомагає нам зростати.',
    messageEs:
      'Leímos tu idea con atención, pero por ahora no la vamos a tomar en desarrollo.\n\nNo es motivo para detenerse: envíanos más. Cada idea nos ayuda a crecer.',
  };
}

/**
 * Кладёт в персональный инбокс пользователя документ-решение, который приложение
 * покажет модалкой на следующем открытии (см. app/idea_decision_modals.ts).
 */
function writeIdeaInbox(
  tx: FirebaseFirestore.Transaction,
  db: FirebaseFirestore.Firestore,
  uid: string,
  decision: IdeaDecision,
  texts: { titleRu: string; titleUk: string; titleEs: string; messageRu: string; messageUk: string; messageEs: string },
  ideaId: string,
  now: number,
): void {
  const inboxRef = db.collection('users').doc(uid).collection(IDEA_INBOX).doc();
  tx.set(inboxRef, {
    type: 'idea_decision',
    decision,
    ideaId,
    titleRu: texts.titleRu,
    titleUk: texts.titleUk,
    titleEs: texts.titleEs,
    messageRu: texts.messageRu,
    messageUk: texts.messageUk,
    messageEs: texts.messageEs,
    createdAt: now,
    seen: false,
  });
}

/**
 * Админ: принять (approve) или отклонить (reject) идею.
 * approve → выдаём 1 год полного доступа (VIP-грант с конкретным сроком now+365д,
 *   крон погасит ровно через год) + персональная модалка-поздравление.
 * reject → персональная модалка с объяснением (текст редактируется в админке).
 * Тексты модалки можно переопределить (titleRu/Uk, messageRu/Uk).
 */
export const adminDecideUserIdea = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK_SENSITIVE,
    timeoutSeconds: 20,
    memory: '256MiB',
    maxInstances: 10,
  },
  async (request) => {
    if (!request.auth?.token?.admin) {
      throw new HttpsError('permission-denied', 'Admin only');
    }

    const ideaId = text(request.data?.ideaId, 180);
    const decision = enumText(request.data?.decision, ['approve', 'reject'] as const, 'reject');
    if (!ideaId) throw new HttpsError('invalid-argument', 'ideaId_required');

    const db = admin.firestore();
    const ideaRef = db.collection(IDEAS_COLLECTION).doc(ideaId);
    const now = Date.now();
    const adminEmail = text(request.auth.token.email, 160) || 'admin';

    // Переопределённые тексты модалки (если админ их прислал), иначе дефолт по Библии.
    const def = defaultDecisionTexts(decision);
    const texts = {
      titleRu: text(request.data?.titleRu, 200) || def.titleRu,
      titleUk: text(request.data?.titleUk, 200) || def.titleUk,
      titleEs: text(request.data?.titleEs, 200) || def.titleEs,
      messageRu: text(request.data?.messageRu, 2000) || def.messageRu,
      messageUk: text(request.data?.messageUk, 2000) || def.messageUk,
      messageEs: text(request.data?.messageEs, 2000) || def.messageEs,
    };

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ideaRef);
      if (!snap.exists) throw new HttpsError('not-found', 'idea_not_found');
      const idea = snap.data() as Record<string, unknown>;
      const status = String(idea.status ?? '');
      if (status === 'approved' || status === 'rejected') {
        throw new HttpsError('failed-precondition', 'already_decided');
      }
      const targetUid = text(idea.uid, 180);
      if (!targetUid) throw new HttpsError('failed-precondition', 'idea_missing_uid');

      if (decision === 'approve') {
        // 1 год полного доступа. VIP-грант с конкретным сроком — крон premiumExpiryCron
        // НЕ трогает grant с vip_until>0 раньше времени, но погасит ровно через год.
        const userRef = db.collection('users').doc(targetUid);
        tx.set(
          userRef,
          {
            progress: {
              vip_active: 'true',
              vip_plan: 'idea_reward',
              vip_from: String(now),
              vip_until: String(now + YEAR_MS),
              vip_admin_override: 'true',
              vip_admin_grant_at: String(now),
              vip_admin_grant_reason: 'user_idea_approved',
            },
          },
          { merge: true },
        );
      }

      tx.update(ideaRef, {
        status: decision === 'approve' ? 'approved' : 'rejected',
        decidedAt: now,
        decidedAtIso: new Date(now).toISOString(),
        decidedBy: adminEmail,
        decisionTitleRu: texts.titleRu,
        decisionTitleUk: texts.titleUk,
        decisionMessageRu: texts.messageRu,
        decisionMessageUk: texts.messageUk,
        premiumGranted: decision === 'approve',
        premiumGrantUntilMs: decision === 'approve' ? now + YEAR_MS : null,
      });

      writeIdeaInbox(tx, db, targetUid, decision, texts, ideaId, now);
    });

    return { ok: true };
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// 3) Админ: ИИ-черновик текста модалки решения (СРАЗУ на языке пользователя)
// ─────────────────────────────────────────────────────────────────────────────
/** Человекочитаемое название языка для промпта (чтобы модель точно поняла). */
const IDEA_LANG_NAMES: Record<string, string> = {
  ru: 'Russian',
  uk: 'Ukrainian',
  es: 'Spanish',
  pt: 'Portuguese',
  vi: 'Vietnamese',
  id: 'Indonesian',
  tr: 'Turkish',
  pl: 'Polish',
  en: 'English',
};

const IDEA_DECISION_MSG_MAX = 900;

const IDEA_DRAFT_SYSTEM_PROMPT = [
  'You write a short in-app modal message for a user of Phraseman, an English-learning app.',
  'The user submitted a product idea. The team has made a decision on it.',
  'Write a warm, human, 2-4 sentence message addressed to the user (informal "you"),',
  'STRICTLY in the language given in the "language" field — do not mix languages.',
  'If decision is "approve": thank them warmly, say the idea is accepted and going into development,',
  'and that as a thank-you we open full Premium access for a whole year. Sound genuinely glad.',
  'If decision is "reject": thank them for the idea, gently say we are not taking it into work for now,',
  'and encourage them to keep sending ideas. No excuses, no blame, no bureaucratic tone.',
  'Speak as the team ("we"). No links, no deadlines, at most one emoji.',
  'Return STRICTLY a JSON object: {"message": "..."} with the message in the target language only.',
].join(' ');

/**
 * adminDraftIdeaDecision — ИИ-черновик текста модалки решения по идее.
 * Пишет текст СРАЗУ на языке пользователя (idea.lang), чтобы админу не нужно
 * было переводить. Админ может отредактировать перед отправкой в adminDecideUserIdea.
 *
 * data: { ideaId: string; decision: 'approve' | 'reject' }
 * Возвращает: { ok: true, message: string, lang: string }
 */
export const adminDraftIdeaDecision = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK_SENSITIVE,
    timeoutSeconds: 30,
    memory: '256MiB',
    maxInstances: 10,
    secrets: [OPENAI_API_KEY],
  },
  async (request) => {
    if (!request.auth?.token?.admin) {
      throw new HttpsError('permission-denied', 'Admin only');
    }

    const ideaId = text(request.data?.ideaId, 180);
    const decision = enumText(request.data?.decision, ['approve', 'reject'] as const, 'reject');
    if (!ideaId) throw new HttpsError('invalid-argument', 'ideaId_required');

    const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
    if (!apiKey) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');

    const db = admin.firestore();
    const snap = await db.collection(IDEAS_COLLECTION).doc(ideaId).get();
    if (!snap.exists) throw new HttpsError('not-found', 'idea_not_found');
    const idea = snap.data() as Record<string, unknown>;

    const langCode = (text(idea.lang, 8) || 'ru').toLowerCase();
    const languageName = IDEA_LANG_NAMES[langCode] || IDEA_LANG_NAMES[langCode.slice(0, 2)] || 'Russian';

    const userPayload = JSON.stringify({
      language: languageName,
      decision,
      idea: {
        title: text(idea.title, 120),
        description: text(idea.description, 1500),
        benefit: text(idea.benefit, 600),
        category: text(idea.category, 40),
      },
    });

    const result = await openAiChat({
      apiKey,
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: IDEA_DRAFT_SYSTEM_PROMPT },
        { role: 'user', content: userPayload },
      ],
      maxTokens: 400,
      temperature: 0.6,
      responseFormat: { type: 'json_object' },
    });

    // Модель может вернуть НЕ JSON, а прозу/отказ. Тогда JSON.parse падает, и раньше
    // админ видел глухое «INTERNAL» без причины. Отдаём понятную ошибку с обрезанным
    // сырым текстом модели, чтобы было видно её ответ (в т.ч. текст отказа), и админ
    // мог написать сообщение вручную.
    const raw = String(result.text || '').trim();
    if (!raw) {
      throw new HttpsError('failed-precondition', 'ИИ вернул пустой ответ — сформулируй сообщение вручную.');
    }
    let message = '';
    try {
      const parsed = JSON.parse(raw) as { message?: unknown };
      message = text(parsed.message, IDEA_DECISION_MSG_MAX);
    } catch {
      throw new HttpsError(
        'failed-precondition',
        `ИИ не вернул черновик (возможно, отказ). Ответ модели: ${raw.slice(0, 300)}`,
      );
    }
    if (!message) {
      throw new HttpsError(
        'failed-precondition',
        `ИИ вернул пустое сообщение. Ответ модели: ${raw.slice(0, 300)}`,
      );
    }

    return { ok: true, message, lang: langCode };
  },
);
