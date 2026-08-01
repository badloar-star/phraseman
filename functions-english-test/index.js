/**
 * English Level Test — Cloud Functions
 * Isolated codebase. No mobile app dependencies.
 */

const { onRequest, onCall } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');
const {
  CompletionRateLimitError,
  countCompletion,
  isValidCompletionPayload,
  readCompletedCount,
} = require('./completion_counter');
const {
  getTrustedExternalClientIp,
  requestBodyByteLength,
} = require('./request_security');

initializeApp();
const db = getFirestore();

const ENGLISH_TEST_HMAC_KEY = defineSecret('ENGLISH_TEST_HMAC_KEY');

const ALLOWED_ORIGINS = [
  'https://knowlyapps.com',
  'https://www.knowlyapps.com',
  'https://knowlyapps.web.app',
  'https://phraseman-ea0b3.web.app',
];

const BANK_VERSION = '2026-07-22.4';
const MAX_BODY_BYTES = 32768;
const RATE_LIMIT_WINDOW_MS = 3600000; // 1 hour
const ANALYTICS_RATE_LIMIT = 180;
const ANALYTICS_SHARED_IP_RATE_LIMIT = 1200;
const ATTEMPT_TTL_DAYS = 180;
const CLIENT_TTL_DAYS = 400;
const DAILY_TTL_DAYS = 400;

// ---------- Helpers ----------

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

function timingSafeCompare(a, b) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function isBotUA(ua) {
  if (!ua) return false;
  const botPattern = /bot|crawl|spider|scrape|curl|wget|python|java|httpclient|scrapy/i;
  return botPattern.test(ua);
}

function sanitizeString(str, maxLen = 64) {
  if (typeof str !== 'string') return '';
  return str.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, maxLen);
}

function normalizeBankVersion(value) {
  if (typeof value !== 'string' || value.length > 32) return BANK_VERSION;
  return /^\d{4}-\d{2}-\d{2}\.\d+$/.test(value) ? value : BANK_VERSION;
}

function normalizeCompletedResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null;

  const allowedLevels = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const allowedStopReasons = ['max_questions', 'upper_band_confirmed', 'minimum_evidence'];
  const {
    estimatedLevel,
    correct,
    answered,
    totalQuestions,
    assessmentScope,
    stopReason,
  } = result;
  if (!allowedLevels.includes(estimatedLevel)) return null;
  if (assessmentScope !== 'text-only') return null;
  if (!allowedStopReasons.includes(stopReason)) return null;
  if (![correct, answered, totalQuestions].every(Number.isInteger)) return null;
  if (correct < 0 || totalQuestions > 20) return null;
  if (correct > answered || answered > totalQuestions) return null;

  return {
    estimatedLevel,
    correct,
    answered,
    totalQuestions,
    assessmentScope,
    stopReason,
  };
}

function normalizeQuestionIdentity(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { questionId, position } = value;
  if (typeof questionId !== 'string' || !/^en-(a1|a2|b1|b2|c1|c2)-\d{3}$/.test(questionId)) {
    return null;
  }
  if (!Number.isInteger(position) || position < 1 || position > 20) return null;
  return { questionId, position };
}

function normalizeProgressResponse(response) {
  const identity = normalizeQuestionIdentity(response);
  if (!identity) return null;

  const allowedLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const {
    questionLevel,
    correct,
    targetBefore,
    targetAfter,
    selectedIndex,
    skipped,
    responseTimeMs,
  } = response;
  if (![questionLevel, targetBefore, targetAfter].every((level) => allowedLevels.includes(level))) {
    return null;
  }
  if (typeof correct !== 'boolean' || typeof skipped !== 'boolean') return null;
  if (!Number.isInteger(selectedIndex) || selectedIndex < -1 || selectedIndex > 3) return null;
  if ((skipped && selectedIndex !== -1) || (!skipped && selectedIndex === -1)) return null;
  if (skipped && correct) return null;
  if (typeof responseTimeMs !== 'number' || !Number.isFinite(responseTimeMs)) return null;

  const boundedTimeMs = Math.min(120000, Math.max(0, responseTimeMs));
  const roundedTimeMs = Math.round(boundedTimeMs / 250) * 250;
  return {
    ...identity,
    questionLevel,
    correct,
    targetBefore,
    targetAfter,
    selectedIndex,
    skipped,
    responseTimeMs: roundedTimeMs,
  };
}

function buildViewUpdate(attemptData, payload) {
  const identity = normalizeQuestionIdentity(payload);
  if (!identity) return null;

  const rawSequence = Array.isArray(attemptData?.questionSequence)
    ? attemptData.questionSequence.slice(0, 20)
    : [];
  const questionSequence = rawSequence.filter((questionId, index) =>
    normalizeQuestionIdentity({ questionId, position: index + 1 }) !== null
  );
  const targetIndex = identity.position - 1;
  if (targetIndex < questionSequence.length) {
    questionSequence[targetIndex] = identity.questionId;
  } else if (targetIndex === questionSequence.length && questionSequence.length < 20) {
    questionSequence.push(identity.questionId);
  } else {
    return null;
  }

  const existingViews = Number.isInteger(attemptData?.views) ? attemptData.views : 0;
  const existingPosition = Number.isInteger(attemptData?.lastPosition) ? attemptData.lastPosition : 0;
  return {
    views: Math.min(20, Math.max(0, existingViews, questionSequence.length)),
    lastPosition: Math.min(20, Math.max(0, existingPosition, identity.position)),
    questionSequence,
  };
}

function mergeProgressResponses(existingResponses, payload) {
  const incoming = normalizeProgressResponse(payload);
  if (!incoming) return null;

  const responses = [];
  const upsert = (response) => {
    const existingIndex = responses.findIndex((item) =>
      item.position === response.position || item.questionId === response.questionId
    );
    if (existingIndex >= 0) {
      responses[existingIndex] = response;
    } else if (responses.length < 20) {
      responses.push(response);
    }
  };

  if (Array.isArray(existingResponses)) {
    for (const existingResponse of existingResponses.slice(0, 20)) {
      const normalized = normalizeProgressResponse(existingResponse);
      if (normalized) upsert(normalized);
    }
  }
  upsert(incoming);
  return responses;
}

function normalizeAnalyticsAction(action, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  switch (action) {
    case 'landing':
    case 'certificate':
      return { action, payload: {} };
    case 'start':
      return { action, payload: { bankVersion: normalizeBankVersion(body.bankVersion) } };
    case 'view': {
      const payload = normalizeQuestionIdentity(body);
      return payload ? { action, payload } : null;
    }
    case 'progress': {
      const payload = normalizeProgressResponse(body);
      return payload ? { action, payload } : null;
    }
    case 'complete': {
      const payload = normalizeCompletedResult(body.result);
      return payload ? { action, payload } : null;
    }
    case 'abandon':
      return Number.isInteger(body.lastPosition) && body.lastPosition >= 0 && body.lastPosition <= 20
        ? { action, payload: { lastPosition: body.lastPosition } }
        : null;
    case 'share': {
      const allowedChannels = ['web_share_api_attempted', 'web_share_api_success', 'clipboard_copy'];
      return allowedChannels.includes(body.channel)
        ? { action, payload: { channel: body.channel } }
        : null;
    }
    // зачем: владельцу нужно видеть, сколько людей пошли скачивать приложение
    // ПОСЛЕ теста и после сертификата. Клиент (knowly-www/english-level-test/app.js)
    // уже слал cta_view/cta_click, но их не было в этом switch — default возвращал
    // null, и события молча отбрасывались с 400. Теперь принимаем и считаем.
    case 'cta_view':
    // cert_reopen — вернулся к сертификату, не скачав его (app.js:1091).
    // Тоже отбрасывался default-ветвью, поэтому «переоткрытий» не было видно.
    case 'cert_reopen':
      return { action, payload: { level: normalizeCtaLevel(body.level) } };
    case 'cta_click':
      return {
        action,
        payload: {
          store: normalizeCtaStore(body.store),
          level: normalizeCtaLevel(body.level),
          // source различает «результат теста» и «окно сертификата» — ровно тот
          // разрез, который нужен в отчёте.
          source: normalizeCtaSource(body.store, body.source),
        },
      };
    default:
      return null;
  }
}

/** Куда ведёт кнопка. cert_modal шлётся из окна сертификата (app.js:967). */
const CTA_STORES = ['ios', 'android', 'primary', 'cert_modal'];
/** Откуда нажали: экран результата теста или окно сертификата. */
const CTA_SOURCES = ['result', 'certificate'];
const CTA_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function normalizeCtaStore(value) {
  return CTA_STORES.includes(value) ? value : 'unknown';
}

function normalizeCtaLevel(value) {
  return CTA_LEVELS.includes(value) ? value : 'unknown';
}

/**
 * Источник клика. Клиент помечает 'result' только на одной из кнопок, а клик из
 * окна сертификата узнаётся по store==='cert_modal'. Выводим source сами, чтобы
 * отчёт не зависел от того, проставил ли клиент поле.
 */
function normalizeCtaSource(store, value) {
  if (store === 'cert_modal') return 'certificate';
  return CTA_SOURCES.includes(value) ? value : 'result';
}

function coarseBucket(value, buckets) {
  for (const b of buckets) {
    if (value <= b.max) return b.label;
  }
  return buckets[buckets.length - 1].label;
}

function deviceBucket(ua) {
  if (!ua) return 'unknown';
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) return 'mobile';
  return 'desktop';
}

function browserBucket(ua) {
  if (!ua) return 'unknown';
  if (/Chrome/i.test(ua)) return 'chrome';
  if (/Safari/i.test(ua)) return 'safari';
  if (/Firefox/i.test(ua)) return 'firefox';
  if (/Edge/i.test(ua)) return 'edge';
  return 'other';
}

function osBucket(ua) {
  if (!ua) return 'unknown';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Mac OS|Macintosh/i.test(ua)) return 'macos';
  if (/Android/i.test(ua)) return 'android';
  if (/iOS|iPhone|iPad/i.test(ua)) return 'ios';
  if (/Linux/i.test(ua)) return 'linux';
  return 'other';
}

function getExpiresAt(days) {
  return new Date(Date.now() + days * 86400000);
}

// ---------- Rate Limiting ----------

function nextRateLimitState(data, limit, now) {
  const count = Number.isInteger(data?.count) && data.count >= 0 ? data.count : 0;
  const windowStart = Number.isFinite(data?.windowStart) ? data.windowStart : now;
  if (!data || now - windowStart > RATE_LIMIT_WINDOW_MS) {
    return { allowed: true, count: 1, windowStart: now };
  }
  if (count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000)),
    };
  }
  return { allowed: true, count: count + 1, windowStart };
}

async function checkAnalyticsRateLimits({ clientHash, ipAddress, hmacKey }) {
  const clientId = hmac(hmacKey, `analytics-client:${clientHash}`);
  const ipId = hmac(hmacKey, `analytics-ip:${ipAddress}`);
  const clientRef = db.collection('english_test_rate_limits').doc(clientId);
  const ipRef = db.collection('english_test_rate_limits').doc(ipId);
  const now = Date.now();

  return db.runTransaction(async (transaction) => {
    const [clientDoc, ipDoc] = await Promise.all([
      transaction.get(clientRef),
      transaction.get(ipRef),
    ]);
    const clientState = nextRateLimitState(
      clientDoc.exists ? clientDoc.data() : null,
      ANALYTICS_RATE_LIMIT,
      now,
    );
    const ipState = nextRateLimitState(
      ipDoc.exists ? ipDoc.data() : null,
      ANALYTICS_SHARED_IP_RATE_LIMIT,
      now,
    );
    if (!clientState.allowed || !ipState.allowed) {
      return {
        allowed: false,
        retryAfter: Math.max(clientState.retryAfter || 0, ipState.retryAfter || 0),
      };
    }

    const expiresAt = getExpiresAt(1);
    transaction.set(clientRef, {
      count: clientState.count,
      windowStart: clientState.windowStart,
      expiresAt,
    });
    transaction.set(ipRef, {
      count: ipState.count,
      windowStart: ipState.windowStart,
      expiresAt,
    });
    return { allowed: true };
  });
}

// ---------- Attempt Management ----------

async function getOrCreateAttempt(token, clientHash, hmacKey, payload) {
  const tokenHash = sha256(token + hmacKey);
  const docRef = db.collection('english_test_attempts').doc(tokenHash);
  const doc = await docRef.get();

  if (doc.exists) {
    return { docRef, data: doc.data(), isNew: false };
  }

  const now = Date.now();
  const attemptData = {
    createdAtMs: now,
    updatedAtMs: now,
    expiresAt: getExpiresAt(ATTEMPT_TTL_DAYS),
    status: 'active',
    bankVersion: normalizeBankVersion(payload.bankVersion),
    clientHash: hmac(hmacKey, clientHash),
    attemptNumber: await getAttemptNumber(clientHash, hmacKey),
    source: sanitizeString(payload.source, 32),
    medium: sanitizeString(payload.medium, 32),
    campaign: sanitizeString(payload.campaign, 32),
    referrerBucket: sanitizeString(payload.referrerBucket, 32),
    device: deviceBucket(payload.userAgent),
    browser: browserBucket(payload.userAgent),
    os: osBucket(payload.userAgent),
    questionSequence: [],
    views: 0,
    responses: [],
    lastPosition: 0,
    result: null,
    certificateEvent: false,
    shareChannels: [],
  };

  await docRef.set(attemptData);
  return { docRef, data: attemptData, isNew: true };
}

async function getAttemptNumber(clientHash, hmacKey) {
  const clientDocHash = hmac(hmacKey, `client:${clientHash}`);
  const docRef = db.collection('english_test_clients').doc(clientDocHash);
  const doc = await docRef.get();

  if (!doc.exists) {
    await docRef.set({ count: 1, expiresAt: getExpiresAt(CLIENT_TTL_DAYS) });
    return 1;
  }

  const newCount = (doc.data().count || 0) + 1;
  await docRef.update({ count: newCount });
  return newCount;
}

// ---------- API Handler ----------

exports.englishTestApi = onRequest({
  region: 'us-central1',
  invoker: 'public',
  secrets: [ENGLISH_TEST_HMAC_KEY],
  maxInstances: 100,
  cors: ALLOWED_ORIGINS,
}, async (req, res) => {
  // CORS
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method === 'GET') {
    res.set('Cache-Control', 'no-store');
    try {
      const completed = await readCompletedCount(db);
      res.json({ ok: true, completed });
    } catch (e) {
      console.error('englishTestApi counter read error:', e.message);
      res.status(500).json({ error: 'Internal error' });
    }
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Body size check
  if (requestBodyByteLength(req) > MAX_BODY_BYTES) {
    res.status(413).json({ error: 'Payload too large' });
    return;
  }

  const body = req.body || {};
  const action = sanitizeString(body.action, 32);
  const hmacKey = ENGLISH_TEST_HMAC_KEY.value();

  if (action === 'count_complete') {
    if (!isValidCompletionPayload(body)) {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }
    try {
      const result = await countCompletion({
        db,
        completionId: body.completionId,
        ipAddress: getTrustedExternalClientIp(req),
        hmacKey,
      });
      res.json({ ok: true, completed: result.completed, duplicate: result.duplicate });
    } catch (e) {
      if (e instanceof CompletionRateLimitError) {
        res.set('Retry-After', String(e.retryAfterSeconds));
        res.status(429).json({ error: 'Rate limited', retryAfter: e.retryAfterSeconds });
      } else {
        console.error('englishTestApi completion counter error:', e.message);
        res.status(500).json({ error: 'Internal error' });
      }
    }
    return;
  }

  // Analytics retains its existing consent-dependent client contract.
  const ua = req.headers['user-agent'] || '';
  if (isBotUA(ua)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const token = sanitizeString(body.attemptToken, 128);
  const clientHash = sanitizeString(body.clientHash, 128);

  if (!action || !token || !clientHash) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  const normalizedAction = normalizeAnalyticsAction(action, body);
  if (!normalizedAction) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  let rate;
  try {
    rate = await checkAnalyticsRateLimits({
      clientHash,
      ipAddress: getTrustedExternalClientIp(req),
      hmacKey,
    });
  } catch (e) {
    console.error('englishTestApi analytics rate limit error:', e.message);
    res.status(500).json({ error: 'Internal error' });
    return;
  }
  if (!rate.allowed) {
    res.status(429).json({ error: 'Rate limited', retryAfter: rate.retryAfter });
    return;
  }

  try {
    const { docRef, data: attemptData } = await getOrCreateAttempt(token, clientHash, hmacKey, {
      ...body,
      userAgent: ua,
    });

    const now = Date.now();
    const update = { updatedAtMs: now };

    switch (action) {
      case 'landing':
        break;
      case 'start':
        update.status = 'active';
        break;
      case 'view':
        const viewUpdate = buildViewUpdate(attemptData, normalizedAction.payload);
        if (viewUpdate) Object.assign(update, viewUpdate);
        break;
      case 'progress':
        const progressResponse = normalizedAction.payload;
        const responses = mergeProgressResponses(attemptData.responses, progressResponse);
        update.responses = responses;
        const previousPosition = Number.isInteger(attemptData.lastPosition)
          ? attemptData.lastPosition
          : 0;
        update.lastPosition = Math.min(20, Math.max(previousPosition, progressResponse.position));
        break;
      case 'complete':
        update.status = 'completed';
        update.result = normalizedAction.payload;
        break;
      case 'abandon':
        update.status = 'abandoned';
        update.lastPosition = normalizedAction.payload.lastPosition;
        break;
      case 'certificate':
        update.certificateEvent = true;
        break;
      case 'share':
        const channels = [...(attemptData.shareChannels || [])];
        const ch = normalizedAction.payload.channel;
        if (ch && !channels.includes(ch)) channels.push(ch);
        update.shareChannels = channels;
        break;
      case 'cta_view':
        update.ctaViewed = true;
        break;
      case 'cert_reopen':
        update.certReopened = true;
        break;
      case 'cta_click': {
        // зачем: флаг на попытке даёт честную конверсию «прошёл тест → пошёл
        // скачивать» по уникальным людям, а не по числу тапов (двойной тап по
        // тем же кнопкам не должен раздувать конверсию).
        const ctaClick = normalizedAction.payload;
        update.ctaClicked = true;
        update.ctaClickSource = ctaClick.source;
        update.ctaClickStore = ctaClick.store;
        if (ctaClick.source === 'certificate') update.ctaClickedFromCertificate = true;
        else update.ctaClickedFromResult = true;
        break;
      }
      default:
        res.status(400).json({ error: 'Unknown action' });
        return;
    }

    await docRef.update(update);

    // Update daily aggregate
    await updateDailyAggregate(action, now, normalizedAction.payload);

    res.json({ ok: true });
  } catch (e) {
    console.error('englishTestApi error:', e.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

async function updateDailyAggregate(action, timestamp, payload) {
  try {
    const date = new Date(timestamp).toISOString().slice(0, 10);
    const docRef = db.collection('english_test_daily').doc(date);
    await docRef.set(
      {
        date,
        expiresAt: getExpiresAt(DAILY_TTL_DAYS),
      },
      { merge: true }
    );
    // зачем: Firebase-экономия — все инкременты дня идут ОДНОЙ записью в тот же
    // документ, а не отдельным update на каждый разрез.
    const increments = { [`events.${action}`]: FieldValue.increment(1) };
    if (action === 'cta_click' && payload) {
      increments[`ctaClicks.bySource.${payload.source}`] = FieldValue.increment(1);
      increments[`ctaClicks.byStore.${payload.store}`] = FieldValue.increment(1);
    }
    await docRef.update(increments);
  } catch (e) {
    // Non-critical
  }
}

// ---------- Admin Callable ----------

exports.adminEnglishTestAnalytics = onCall({
  region: 'us-central1',
  secrets: [ENGLISH_TEST_HMAC_KEY],
  maxInstances: 50,
}, async (request) => {
  const { auth } = request;
  if (!auth || !auth.token) {
    throw new Error('Unauthorized');
  }

  const role = auth.token.role;
  if (!['owner', 'admin', 'analyst'].includes(role)) {
    throw new Error('Forbidden');
  }

  const { period = 28, force = false } = request.data || {};
  const days = [7, 28, 90].includes(period) ? period : 28;

  const cacheKey = `analytics_${days}`;
  const cacheRef = db.collection('english_test_cache').doc(cacheKey);

  if (!force) {
    const cached = await cacheRef.get();
    if (cached.exists) {
      const data = cached.data();
      if (Date.now() - (data.cachedAtMs || 0) < 180000) {
        return sanitizeAnalyticsResponse(data);
      }
    }
  }

  const since = Date.now() - days * 86400000;

  // Aggregate data
  const attemptsSnap = await db
    .collection('english_test_attempts')
    .where('createdAtMs', '>=', since)
    .orderBy('createdAtMs', 'desc')
    .limit(5000)
    .get();

  const attempts = attemptsSnap.docs.map((d) => d.data());

  // Funnel
  const funnel = {
    landing: 0,
    start: 0,
    view1: 0,
    view5: 0,
    view10: 0,
    view15: 0,
    view18: 0,
    complete: 0,
    certificate: 0,
    share: 0,
    // зачем: владелец хочет видеть, сколько людей пошли СКАЧИВАТЬ приложение
    // после теста и после сертификата. Считаем по уникальным попыткам (человек),
    // а не по числу тапов — иначе двойной тап раздувает конверсию.
    ctaView: 0,
    downloadClick: 0,
    downloadAfterTest: 0,
    downloadAfterCertificate: 0,
  };

  for (const a of attempts) {
    funnel.landing++;
    if (a.status === 'active' || a.status === 'completed' || a.status === 'abandoned') funnel.start++;
    if ((a.views || 0) >= 1) funnel.view1++;
    if ((a.views || 0) >= 5) funnel.view5++;
    if ((a.views || 0) >= 10) funnel.view10++;
    if ((a.views || 0) >= 15) funnel.view15++;
    if ((a.views || 0) >= 18) funnel.view18++;
    if (a.status === 'completed') funnel.complete++;
    if (a.certificateEvent) funnel.certificate++;
    if ((a.shareChannels || []).length > 0) funnel.share++;
    if (a.ctaViewed) funnel.ctaView++;
    if (a.ctaClicked) funnel.downloadClick++;
    if (a.ctaClickedFromResult) funnel.downloadAfterTest++;
    if (a.ctaClickedFromCertificate) funnel.downloadAfterCertificate++;
  }

  // Level distribution
  const levels = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
  for (const a of attempts) {
    if (a.result?.estimatedLevel) {
      levels[a.result.estimatedLevel] = (levels[a.result.estimatedLevel] || 0) + 1;
    }
  }

  const result = {
    period: days,
    generatedAtMs: Date.now(),
    cachedAtMs: Date.now(),
    truncated: attempts.length >= 5000,
    funnel,
    levels,
    totalAttempts: attempts.length,
  };

  await cacheRef.set(result);
  return sanitizeAnalyticsResponse(result);
});

function sanitizeAnalyticsResponse(data) {
  // Remove any PII fields before returning
  const safe = { ...data };
  delete safe.clientHash;
  delete safe.tokenHash;
  return safe;
}

// ---------- Scheduled Functions ----------

exports.finalizeStaleEnglishTests = onSchedule({
  schedule: 'every 30 minutes',
  region: 'us-central1',
  maxInstances: 1,
}, async (event) => {
  const staleTime = Date.now() - 45 * 60000; // 45 minutes
  const snap = await db
    .collection('english_test_attempts')
    .where('status', '==', 'active')
    .where('updatedAtMs', '<', staleTime)
    .limit(500)
    .get();

  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, {
      status: 'abandoned',
      updatedAtMs: Date.now(),
    });
  }
  await batch.commit();
  console.log(`Finalized ${snap.docs.length} stale attempts`);
});

exports.cleanupEnglishTestAnalytics = onSchedule({
  schedule: 'every day 03:00',
  region: 'us-central1',
  maxInstances: 1,
}, async (event) => {
  const now = new Date();

  const collections = [
    { name: 'english_test_attempts', field: 'expiresAt' },
    { name: 'english_test_clients', field: 'expiresAt' },
    { name: 'english_test_daily', field: 'expiresAt' },
    { name: 'english_test_rate_limits', field: 'expiresAt' },
    { name: 'english_test_completion_rate_limits', field: 'expiresAt' },
  ];

  for (const { name, field } of collections) {
    const snap = await db.collection(name).where(field, '<', now).limit(500).get();
    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    console.log(`Cleaned up ${snap.docs.length} docs from ${name}`);
  }
});
