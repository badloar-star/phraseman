import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 90;
const MAX_DOCS_PER_COLLECTION = 10000;
const PAGE_SIZE = 500;
const VOICE_SPLIT_TEXT_PRICE_DATE = '2026-08-21';
const VOICE_LEGACY_TEXT_PER_M = 0.6;
const VOICE_OUTPUT_TEXT_PER_M = 2.4;

type Price = { input: number; cachedInput?: number; output: number };
type UsageRow = {
  id: string;
  feature: string;
  collection: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number | null;
  uid: string;
  createdAtMs: number;
};

const OPENAI_MODEL_PRICES: Record<string, Price> = {
  'gpt-4.1-nano': { input: 0.10, cachedInput: 0.025, output: 0.40 },
  'gpt-4.1-mini': { input: 0.40, cachedInput: 0.10, output: 1.60 },
  'gpt-4.1': { input: 2.00, cachedInput: 0.50, output: 8.00 },
  'gpt-4o-mini': { input: 0.15, cachedInput: 0.075, output: 0.60 },
};

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function text(value: unknown, max = 120): string {
  return String(value ?? '').trim().slice(0, max);
}

function clampDays(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return 30;
  return Math.max(1, Math.min(MAX_DAYS, n));
}

function createdMs(data: FirebaseFirestore.DocumentData): number {
  const direct = num(data.createdAtMs) || num(data.receivedAtMs);
  if (direct) return direct;
  const ts = data.createdAt;
  if (ts && typeof ts.toMillis === 'function') {
    try { return ts.toMillis(); } catch { return 0; }
  }
  const parsed = Date.parse(String(data.createdAt || data.ts || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function priceFor(model: string): Price | undefined {
  const key=Object.keys(OPENAI_MODEL_PRICES).sort((a,b)=>b.length-a.length).find(key=>model===key || (model.startsWith(key+'-') && /^\d{4}-\d{2}-\d{2}$/.test(model.slice(key.length+1))));
  return key ? OPENAI_MODEL_PRICES[key] : undefined;
}

function costUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const p = priceFor(model);
  if(!p || inputTokens+outputTokens===0) return null;
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}

export function usageFromDoc(
  collectionName: string,
  feature: string,
  snap: FirebaseFirestore.QueryDocumentSnapshot,
): UsageRow {
  const data = snap.data() || {};
  const model = text(data.model, 80) || 'unknown';
  const storedCost=typeof data.estCostUsd==='number' && Number.isFinite(data.estCostUsd) && data.estCostUsd>=0 ? data.estCostUsd : null;

  if (collectionName === 'voice_call_billing') {
    const hasSplitTextFields = Object.prototype.hasOwnProperty.call(data, 'textInputTokens')
      && Object.prototype.hasOwnProperty.call(data, 'textOutputTokens');
    const textInputTokens = num(data.textInputTokens);
    const textOutputTokens = num(data.textOutputTokens);
    const legacyUnsplitTextTokens = Math.max(
      0,
      num(data.textTokens) - textInputTokens - textOutputTokens,
    );
    const inputTokens = num(data.audioInputTokens) + num(data.cachedTokens) + textInputTokens;
    // Для старых unsplit rows направление неизвестно; относим остаток к output,
    // как и серверная консервативная оценка стоимости.
    const outputTokens = num(data.audioOutputTokens) + textOutputTokens + legacyUnsplitTextTokens;
    const storedUsesSplitTextPrices = hasSplitTextFields
      && text(data.priceTableDate, 10) >= VOICE_SPLIT_TEXT_PRICE_DATE;
    // Старый estCostUsd уже содержит эти токены по input-цене $0.60/M.
    // Добавляем только разницу до output-цены, сохраняя его audio/cache/STT части.
    const legacyTextPriceCorrectionUsd = storedUsesSplitTextPrices
      ? 0
      : (legacyUnsplitTextTokens / 1_000_000)
        * (VOICE_OUTPUT_TEXT_PER_M - VOICE_LEGACY_TEXT_PER_M);
    return {
      id: snap.id,
      feature,
      collection: collectionName,
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      // Это all-in сумма: Realtime audio/text + cached + transcription.
      // Пересчёт общей chat-формулой потерял бы почти всю стоимость звонка.
      costUsd: storedCost===null ? null : storedCost + legacyTextPriceCorrectionUsd,
      uid: text(data.uid || data.authUid, 120),
      createdAtMs: createdMs(data),
    };
  }

  if (collectionName === 'ai_operation_billing') {
    // зачем: PM-231 A3 — админские ИИ-вызовы пишут одну общую коллекцию; operation попадает в подпись фичи.
    const inputTokens = num(data.promptTokens);
    const outputTokens = num(data.completionTokens);
    return {
      id: snap.id,
      feature: 'Админ: ' + (text(data.operation, 64) || 'unknown'),
      collection: collectionName,
      model,
      inputTokens,
      outputTokens,
      totalTokens: num(data.totalTokens) || inputTokens + outputTokens,
      costUsd: storedCost ?? (num(data.inputChars)>0 ? null : costUsd(model, inputTokens, outputTokens)),
      uid: text(data.uid, 120),
      createdAtMs: createdMs(data),
    };
  }

  if (collectionName === 'card_tts_billing') {
    // зачем: D128 — TTS считается по символам, а не по chat-токенам; пересчёт
    // общей формулой по цене gpt-4.1-nano занизил бы трату в десятки раз.
    const characters = num(data.characters);
    return {
      id: snap.id,
      feature,
      collection: collectionName,
      model,
      inputTokens: characters,
      outputTokens: 0,
      totalTokens: characters,
      costUsd: storedCost,
      uid: '',
      createdAtMs: createdMs(data),
    };
  }

  // Разные фичи пишут токены в РАЗНЫХ полях. Три схемы:
  //  A) promptTokens/completionTokens        — dialog, weekly, stats, mistake, speaking, league-cron
  //  B) genPromptTokens/genCompletionTokens + judgePromptTokens/judgeCompletionTokens — explain, choice, compass
  // Суммируем все варианты — отсутствующие поля дают 0, поэтому одна формула
  // корректно покрывает обычные chat billing-коллекции; voice разобран выше.
  const inputTokens = num(data.promptTokens) + num(data.genPromptTokens) + num(data.judgePromptTokens);
  const outputTokens = num(data.completionTokens) + num(data.genCompletionTokens) + num(data.judgeCompletionTokens);

  const totalTokens = num(data.totalTokens) || inputTokens + outputTokens;
  return {
    id: snap.id,
    feature,
    collection: collectionName,
    model,
    inputTokens,
    outputTokens,
    totalTokens,
    costUsd: storedCost ?? (num(data.inputChars)>0 ? null : costUsd(model, inputTokens, outputTokens)),
    uid: text(data.uid || data.authUid, 120),
    createdAtMs: createdMs(data),
  };
}

export async function openAiBudgetSafeGetDocs(
  collectionName: string,
  fromMs: number,
  nowMs: number,
): Promise<{ docs: FirebaseFirestore.QueryDocumentSnapshot[]; error?: string; truncated?: boolean; totalCount?: number }> {
  try {
    const timeField=collectionName==='weekly_review_billing'?'receivedAtMs':(['stats_insights_billing','compass_billing'].includes(collectionName)?'createdAt':'createdAtMs');
    const from=timeField==='createdAt'?admin.firestore.Timestamp.fromMillis(fromMs):fromMs;
    const to=timeField==='createdAt'?admin.firestore.Timestamp.fromMillis(nowMs):nowMs;
    const base = admin.firestore()
      .collection(collectionName)
      .where(timeField, '>=', from);
    const bounded=base.where(timeField,'<=',to).orderBy(timeField,'desc');
    const countSnap=await bounded.count().get();
    const totalCount=countSnap.data().count;
    const docs: FirebaseFirestore.QueryDocumentSnapshot[]=[];
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    while(docs.length<Math.min(totalCount,MAX_DOCS_PER_COLLECTION)) {
      let query=bounded.limit(Math.min(PAGE_SIZE,MAX_DOCS_PER_COLLECTION-docs.length));
      if(cursor)query=query.startAfter(cursor);
      const snap=await query.get();
      if(snap.empty)break;
      docs.push(...snap.docs);cursor=snap.docs[snap.docs.length-1];
      if(snap.size<PAGE_SIZE)break;
    }
    return {docs,totalCount,truncated:totalCount>docs.length};
  } catch (e) {
    console.warn('openAiBudgetSafeGetDocs failed', collectionName, e);
    return { docs: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export function aggregate(rows: UsageRow[], rangeDays: number, nowMs = Date.now()) {
  const total = rows.reduce((acc, row) => {
    acc.calls += 1;
    acc.inputTokens += row.inputTokens;
    acc.outputTokens += row.outputTokens;
    acc.totalTokens += row.totalTokens;
    acc.costUsd += row.costUsd ?? 0;
    if (row.uid) acc.uniqueUsers.add(row.uid);
    return acc;
  }, {
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    costUsd: 0,
    uniqueUsers: new Set<string>(),
  });

  const group = (key: 'feature' | 'model') => {
    const map = new Map<string, typeof total>();
    for (const row of rows) {
      const label = row[key] || 'unknown';
      const cur = map.get(label) || {
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        uniqueUsers: new Set<string>(),
      };
      cur.calls += 1;
      cur.inputTokens += row.inputTokens;
      cur.outputTokens += row.outputTokens;
      cur.totalTokens += row.totalTokens;
      cur.costUsd += row.costUsd ?? 0;
      if (row.uid) cur.uniqueUsers.add(row.uid);
      map.set(label, cur);
    }
    return Array.from(map.entries())
      .map(([label, value]) => ({
        label,
        calls: value.calls,
        inputTokens: value.inputTokens,
        outputTokens: value.outputTokens,
        totalTokens: value.totalTokens,
        costUsd: value.costUsd,
        uniqueUsers: value.uniqueUsers.size,
        avgCostUsd: value.calls ? value.costUsd / value.calls : 0,
      }))
      .sort((a, b) => b.costUsd - a.costUsd);
  };

  // Ряд по дням (для графика расходов по периодам). Ключ дня — YYYY-MM-DD в UTC,
  // чтобы бакеты были детерминированными и не зависели от таймзоны сервера.
  const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const seriesMap = new Map<string, { costUsd: number; calls: number; totalTokens: number }>();
  for (const row of rows) {
    const key = dayKey(row.createdAtMs);
    const cur = seriesMap.get(key) || { costUsd: 0, calls: 0, totalTokens: 0 };
    cur.costUsd += row.costUsd ?? 0;
    cur.calls += 1;
    cur.totalTokens += row.totalTokens;
    seriesMap.set(key, cur);
  }
  // Заполняем весь диапазон днями (включая нулевые), чтобы график не «рвался».
  const series: Array<{ date: string; costUsd: number; calls: number; totalTokens: number }> = [];
  const startMs = Math.floor(nowMs / DAY_MS) * DAY_MS - (rangeDays - 1) * DAY_MS;
  for (let i = 0; i < rangeDays; i += 1) {
    const key = dayKey(startMs + i * DAY_MS);
    const v = seriesMap.get(key) || { costUsd: 0, calls: 0, totalTokens: 0 };
    series.push({ date: key, costUsd: v.costUsd, calls: v.calls, totalTokens: v.totalTokens });
  }

  return {
    totals: {
      calls: total.calls,
      unpricedCalls: rows.filter(row=>row.costUsd===null).length,
      inputTokens: total.inputTokens,
      outputTokens: total.outputTokens,
      totalTokens: total.totalTokens,
      costUsd: total.costUsd,
      estimatedMonthUsd: rangeDays > 0 ? (total.costUsd / rangeDays) * 30 : total.costUsd,
      uniqueUsers: total.uniqueUsers.size,
    },
    features: group('feature'),
    models: group('model'),
    series,
  };
}

const budgetCache = new Map<number,{at:number;value:unknown}>();
export const openAiBudgetDashboard = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError('permission-denied', 'Admin only');
  }

  const rangeDays = clampDays(request.data?.rangeDays);
  const now = Date.now();
  const cached=budgetCache.get(rangeDays);
  if(request.data?.force!==true && cached && now-cached.at<60000) return cached.value;
  for(const [key,entry] of budgetCache)if(now-entry.at>=60000)budgetCache.delete(key);
  const fromMs = Math.floor(now / DAY_MS) * DAY_MS - (rangeDays - 1) * DAY_MS;

  // ВСЕ billing-коллекции проекта. Раньше читались только первые 4 — из-за чего
  // дашборд недосчитывал >60% реальных трат (7 фич были не видны). Теперь честно
  // суммируем все 11 источников.
  const SOURCES: Array<{ collection: string; feature: string }> = [
    { collection: 'premium_dialog_billing', feature: 'Компас chat' },
    { collection: 'explain_billing', feature: 'Explain phrase' },
    { collection: 'weekly_review_billing', feature: 'Weekly review legacy' },
    { collection: 'stats_insights_billing', feature: 'Stats insights legacy' },
    { collection: 'compass_billing', feature: 'Компас (daily, legacy)' },
    { collection: 'league_compass_daily_billing', feature: 'Компас лиги (cron)' },
    { collection: 'choice_explain_billing', feature: 'Объяснение выбора' },
    { collection: 'mistake_explain_billing', feature: 'Объяснение ошибки' },
    // PM-231: подсказка хаба «Работа над ошибками» раньше не писала usage вовсе.
    { collection: 'mistake_hub_advice_billing', feature: 'Подсказка хаба ошибок' },
    // ИИ-генератор турнирных заданий (адм. батчи): без регистрации здесь
    // дашборд повторил бы старый баг недосчёта трат.
    { collection: 'tournament_ai_billing', feature: 'Турниры: ИИ-генератор' },
    { collection: 'voice_call_billing', feature: 'MAX voice' },
    // D128: озвучка карточек (OpenAI TTS). Цена — estCostUsd из строки (символы × ставка).
    { collection: 'card_tts_billing', feature: 'Озвучка карточек (TTS)' },
    // PM-231 A3: админские ИИ-вызовы (перевод, дайджесты, ответы на репорты, идеи, фидбэк, разбор документа).
    { collection: 'ai_operation_billing', feature: 'Админ: ИИ-операции' },
  ];

  const fetchedDocs = await Promise.all(
    SOURCES.map((s) => openAiBudgetSafeGetDocs(s.collection, fromMs, now)),
  );
  const fetched = SOURCES.map((s, i) => ({ ...s, ...fetchedDocs[i] }));

  const rows = fetched.flatMap((item) => item.docs.map((snap) => usageFromDoc(item.collection, item.feature, snap)))
    .filter((row) => row.createdAtMs >= fromMs)
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
  const agg = aggregate(rows, rangeDays, now);

  const result = {
    ok: true,
    rangeDays,
    generatedAtMs: now,
    fromMs,
    scope: 'recorded_usage_estimate',
    unpriced: rows.filter(row=>row.costUsd===null).map(row=>({model:row.model,feature:row.feature})).reduce((acc, row)=>{const found=acc.find(x=>x.model===row.model&&x.feature===row.feature);if(found)found.calls++;else acc.push({...row,calls:1});return acc;},[] as Array<{model:string;feature:string;calls:number}>),
    prices: OPENAI_MODEL_PRICES,
    ...agg,
    recent: rows.slice(0, 25),
    errors: fetched
      .filter((item) => item.error)
      .map((item) => ({ collection: item.collection, error: item.error })),
    // зачем: без этого поля срез в MAX_DOCS_PER_COLLECTION молча занижал сумму —
    // владелец видел цифру и не мог понять, полная она или нет.
    truncated: fetched
      .filter((item) => item.truncated)
      .map((item) => ({ collection: item.collection, feature: item.feature, totalCount: item.totalCount ?? null, shownCount: item.docs.length })),
  };
  if(!result.errors.length)budgetCache.set(rangeDays,{at:now,value:result});
  return result;
});
