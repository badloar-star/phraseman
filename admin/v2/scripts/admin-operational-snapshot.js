const STALE_AFTER_MS = 36 * 60 * 60 * 1000;

const STATE_LABELS = Object.freeze({
  idle: 'Не загружено',
  loading: 'Загрузка',
  empty: 'Снимок ещё не создан',
  error: 'Ошибка чтения',
  ready: 'Данные получены',
  partial: 'Данные частичные',
  stale: 'Снимок устарел',
  legacy: 'Старый формат',
});

const SOURCE_STATES = new Set(['ready', 'empty', 'error', 'truncated', 'partial']);

function count(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.floor(number);
}

function sumKnown(...values) {
  if (values.some((value) => value === null)) return null;
  return values.reduce((total, value) => total + value, 0);
}

function sourceCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function timestamp(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function normalizeSource(source) {
  const sourceState = SOURCE_STATES.has(String(source?.state)) ? String(source.state) : 'error';
  return {
    source: String(source?.source || 'unknown').slice(0, 120),
    queryField: String(source?.queryField || '').slice(0, 120),
    state: sourceState,
    count: sourceCount(source?.count),
    checkedAtMs: timestamp(source?.checkedAtMs),
    latestEventAtMs: timestamp(source?.latestEventAtMs),
    limit: sourceCount(source?.limit),
    error: String(source?.error || '').slice(0, 500),
  };
}

export function buildOperationalSnapshot(briefing, nowMs = Date.now()) {
  const requestedState = STATE_LABELS[String(briefing?.state)] ? String(briefing.state) : 'idle';
  const digest = briefing?.digest && typeof briefing.digest === 'object' ? briefing.digest : null;
  const error = String(briefing?.error || '').slice(0, 500);

  if (!digest) {
    return {
      state: requestedState,
      stateLabel: STATE_LABELS[requestedState],
      hasData: false,
      generatedAtMs: 0,
      fetchedAtMs: timestamp(briefing?.fetchedAtMs),
      error,
      metrics: null,
      sources: [],
    };
  }

  const generatedAtMs = timestamp(digest.generatedAtMs);
  const currentTimeMs = timestamp(nowMs) || Date.now();
  const isOld = generatedAtMs > 0 && currentTimeMs - generatedAtMs > STALE_AFTER_MS;
  const isPartial = requestedState === 'partial' || String(digest.generationState) === 'partial';
  const canPromoteToStale = ['ready', 'partial'].includes(requestedState);
  const state = isOld && canPromoteToStale ? 'stale' : requestedState;
  const facts = digest.facts && typeof digest.facts === 'object' ? digest.facts : {};
  const queues = Array.isArray(facts.queues) ? facts.queues : null;
  const sourcesRaw = Array.isArray(digest.sourceHealth) ? digest.sourceHealth : null;
  const sources = (sourcesRaw || []).slice(0, 60).map(normalizeSource);
  const queueTotals = queues ? queues.map((queue) => count(queue?.total)) : [null];
  const reportsOpen = count(facts.reports?.open);
  const metrics = {
    criticalSignals: sumKnown(count(facts.appErrors?.critical), count(facts.safety?.open)),
    packSubmissions24h: count(facts.community?.packSubmissions?.total),
    queueSignals24h: sumKnown(reportsOpen, ...queueTotals),
    appErrors: count(facts.appErrors?.total),
    sourceTotal: sourcesRaw ? sources.length : null,
    sourceErrors: sourcesRaw ? sources.filter((source) => source.state === 'error').length : null,
    sourceTruncated: sourcesRaw ? sources.filter((source) => ['truncated', 'partial'].includes(source.state)).length : null,
  };

  return {
    state,
    stateLabel: STATE_LABELS[state] || STATE_LABELS.ready,
    hasData: true,
    isPartial,
    isStale: isOld,
    generatedAtMs,
    fetchedAtMs: timestamp(briefing?.fetchedAtMs),
    error,
    dayKey: String(digest.dayKey || '').slice(0, 32),
    hasUnknownMetrics: Object.values(metrics).some((value) => value === null),
    metrics,
    sources,
  };
}
