// ═══════════════════════════════════════════════════════════════════════════
// warm_instance_gauge.ts — шкала «когда можно отключать тёплый инстанс».
//
// зачем: владелец 2026-08-22 платит фикс ~$8/мес за каждый minInstances: 1
// (аудит: project_warm_instances_cost_audit). Тёплый инстанс нужен, только
// пока трафик редкий; когда запросы идут чаще, чем контейнер успевает остыть,
// трафик держит функцию тёплой сам — и фикс можно выключить. Эта callable
// отвечает на вопрос «уже можно?» цифрами, а не ощущениями.
//
// Источник данных — Cloud Monitoring (run.googleapis.com/request_count,
// поминутные суммы). НОЛЬ инструментирования в самих функциях: ни чтений, ни
// записей Firestore, ни миллисекунды к латентности входа. Google уже пишет
// эту статистику бесплатно; мы её только читаем при открытии админки.
//
// Метрика: пауза между запросами ≥ COLD_GAP_MIN минут означает, что контейнер
// остыл бы (Cloud Run держит простаивающий инстанс ~15 минут, без гарантии) —
// значит СЛЕДУЮЩИЙ после паузы запрос поймал бы холодный старт. Считаем такие
// события за сутки; отдельно — только в «активные часы» (Europe/Warsaw,
// 08–24): холодный старт в 4 утра владельца не волнует.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';

/** Пауза (мин), после которой считаем контейнер остывшим. */
export const COLD_GAP_MIN = 15;

/** «Активные часы» по Варшаве: холодные старты вне их не считаем в вердикт. */
const ACTIVE_HOUR_FROM = 8; // включительно

/**
 * Кандидаты на тёплый инстанс. Закрытый whitelist: admin-callable не должна
 * позволять читать метрики произвольных сервисов по имени с клиента.
 * id = имя Cloud Run сервиса gen2-функции (function id в нижнем регистре).
 */
export const WARM_INSTANCE_CANDIDATES = [
  { id: 'authensurestablelink', label: 'Вход · authEnsureStableLink' },
  { id: 'maxvoicemint', label: 'MAX-звонок · maxVoiceMint' },
] as const;

export interface WarmGaugeMinutePoint {
  /** Начало минутного бакета, epoch ms. */
  minuteMs: number;
  count: number;
}

export interface WarmGaugeStats {
  totalRequests: number;
  requestsPerDay: number;
  /** Максимальная тишина между двумя запросами внутри окна, минут. */
  maxGapMin: number;
  /** Сколько раз в сутки запрос приходил после паузы ≥ COLD_GAP_MIN (= ловил бы холодный старт). */
  coldStartsPerDay: number;
  /** То же, но только когда «жертва» пришла в активные часы (Варшава, 08–24). */
  coldStartsPerDayActive: number;
  /** % 15-минутных окон периода, в которых был хотя бы один запрос. */
  coveragePct: number;
  /** 0..100 для шкалы готовности к отключению. */
  readinessPct: number;
  verdict: 'ready' | 'almost' | 'keep' | 'no_data';
}

/**
 * Чистая математика шкалы — без сети и Firebase, покрыта тестом.
 * points: минутные бакеты с count>0 в любом порядке.
 */
export function computeWarmGaugeStats(
  points: WarmGaugeMinutePoint[],
  windowStartMs: number,
  windowEndMs: number,
  localHourOf: (ms: number) => number,
): WarmGaugeStats {
  const days = Math.max((windowEndMs - windowStartMs) / 86_400_000, 1 / 24);
  const traffic = points
    .filter((p) => p.count > 0 && p.minuteMs >= windowStartMs && p.minuteMs <= windowEndMs)
    .sort((a, b) => a.minuteMs - b.minuteMs);

  if (traffic.length === 0) {
    return {
      totalRequests: 0, requestsPerDay: 0, maxGapMin: 0,
      coldStartsPerDay: 0, coldStartsPerDayActive: 0,
      coveragePct: 0, readinessPct: 0, verdict: 'no_data',
    };
  }

  let totalRequests = 0;
  let maxGapMin = 0;
  let coldEvents = 0;
  let coldEventsActive = 0;
  const windows15 = new Set<number>();

  for (let i = 0; i < traffic.length; i++) {
    const p = traffic[i];
    totalRequests += p.count;
    windows15.add(Math.floor((p.minuteMs - windowStartMs) / (15 * 60_000)));
    if (i === 0) continue;
    // Соседние минутные бакеты (diff = 1 мин) — тишины нет; тишина = diff − 1.
    const silentMin = (p.minuteMs - traffic[i - 1].minuteMs) / 60_000 - 1;
    if (silentMin > maxGapMin) maxGapMin = silentMin;
    if (silentMin >= COLD_GAP_MIN) {
      coldEvents += 1;
      const h = localHourOf(p.minuteMs);
      if (h >= ACTIVE_HOUR_FROM) coldEventsActive += 1;
    }
  }

  const totalWindows15 = Math.max(1, Math.ceil((windowEndMs - windowStartMs) / (15 * 60_000)));
  const coveragePct = Math.round((windows15.size / totalWindows15) * 100);
  const coldStartsPerDay = coldEvents / days;
  const coldStartsPerDayActive = coldEventsActive / days;

  // Шкала: 0 холодных в активные часы → 100%; 10+/день → 0%. Вердикты синхронны
  // с ней: ready ≥95 (≤0.5/день), almost ≥70 (≤3/день).
  const readinessPct = Math.max(0, Math.min(100, Math.round(100 - coldStartsPerDayActive * 10)));
  const verdict: WarmGaugeStats['verdict'] =
    coldStartsPerDayActive <= 0.5 ? 'ready'
      : coldStartsPerDayActive <= 3 ? 'almost'
        : 'keep';

  return {
    totalRequests,
    requestsPerDay: Math.round(totalRequests / days),
    maxGapMin: Math.round(maxGapMin),
    coldStartsPerDay: Math.round(coldStartsPerDay * 10) / 10,
    coldStartsPerDayActive: Math.round(coldStartsPerDayActive * 10) / 10,
    coveragePct,
    readinessPct,
    verdict,
  };
}

interface MonitoringPoint {
  interval?: { endTime?: string };
  value?: { int64Value?: string; doubleValue?: number };
}
interface MonitoringSeries {
  resource?: { labels?: Record<string, string> };
  points?: MonitoringPoint[];
}
interface MonitoringResponse {
  timeSeries?: MonitoringSeries[];
  nextPageToken?: string;
  error?: { message?: string };
}

/** Поминутный request_count по списку Cloud Run сервисов за окно. */
async function fetchMinuteRequestSeries(
  projectId: string,
  accessToken: string,
  serviceIds: readonly string[],
  startMs: number,
  endMs: number,
): Promise<Map<string, WarmGaugeMinutePoint[]>> {
  const byService = new Map<string, WarmGaugeMinutePoint[]>();
  for (const id of serviceIds) byService.set(id, []);

  const serviceFilter = serviceIds
    .map((id) => `resource.labels.service_name="${id}"`)
    .join(' OR ');
  const params = new URLSearchParams({
    filter: `metric.type="run.googleapis.com/request_count" AND resource.type="cloud_run_revision" AND (${serviceFilter})`,
    'interval.startTime': new Date(startMs).toISOString(),
    'interval.endTime': new Date(endMs).toISOString(),
    'aggregation.alignmentPeriod': '60s',
    'aggregation.perSeriesAligner': 'ALIGN_SUM',
    'aggregation.crossSeriesReducer': 'REDUCE_SUM',
    'aggregation.groupByFields': 'resource.labels.service_name',
    view: 'FULL',
  });

  // Пагинация: одна серия может продолжаться на следующей странице —
  // накапливаем точки по service_name, а не по номеру серии.
  let pageToken: string | undefined;
  for (let page = 0; page < 20; page++) {
    if (pageToken) params.set('pageToken', pageToken);
    const url = `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries?${params.toString()}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const body = (await res.json()) as MonitoringResponse;
    if (!res.ok) {
      const msg = body?.error?.message || `monitoring_http_${res.status}`;
      // Типовой случай — у runtime-сервисаккаунта нет roles/monitoring.viewer:
      // отдаём владельцу понятную причину вместо голого 500.
      throw new HttpsError('failed-precondition', `monitoring_read_failed: ${msg}`);
    }
    for (const series of body.timeSeries ?? []) {
      const name = series.resource?.labels?.service_name ?? '';
      const bucket = byService.get(name);
      if (!bucket) continue;
      for (const pt of series.points ?? []) {
        const endTime = pt.interval?.endTime;
        if (!endTime) continue;
        const count = Number(pt.value?.int64Value ?? pt.value?.doubleValue ?? 0);
        if (count > 0) bucket.push({ minuteMs: Date.parse(endTime) - 60_000, count });
      }
    }
    pageToken = body.nextPageToken;
    if (!pageToken) break;
  }
  return byService;
}

export const adminWarmInstanceGauge = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 30,
  memory: '256MiB',
}, async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError('permission-denied', 'Admin only');
  }

  const days = Math.max(1, Math.min(30, Math.round(Number(request.data?.days) || 7)));
  const endMs = Date.now();
  const startMs = endMs - days * 86_400_000;

  const app = admin.app();
  const projectId = app.options.projectId
    || process.env.GCLOUD_PROJECT
    || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) throw new HttpsError('internal', 'project_id_unresolved');

  const credential = app.options.credential ?? admin.credential.applicationDefault();
  const { access_token: accessToken } = await credential.getAccessToken();

  const series = await fetchMinuteRequestSeries(
    projectId,
    accessToken,
    WARM_INSTANCE_CANDIDATES.map((c) => c.id),
    startMs,
    endMs,
  );

  // Час по Варшаве: холодный старт ночью не должен держать деньги включёнными.
  const hourFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Warsaw', hour: '2-digit', hour12: false,
  });
  const localHourOf = (ms: number) => Number(hourFmt.format(new Date(ms)));

  return {
    ok: true,
    days,
    coldGapMin: COLD_GAP_MIN,
    generatedAtMs: endMs,
    services: WARM_INSTANCE_CANDIDATES.map((c) => ({
      id: c.id,
      label: c.label,
      ...computeWarmGaugeStats(series.get(c.id) ?? [], startMs, endMs, localHourOf),
    })),
  };
});
