import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { ENFORCE_APP_CHECK } from './callable_options';
import { collectProductManagerEvidence, createFirestorePmSourceReaders, type PmEvidenceBundle } from './admin_pm_evidence';
import { computeProductInsights, type ProductInsights } from './admin_pm_insights';
import { evaluatePmPublicationGate } from './admin_pm_publication_gate';
import { validatePmBrief, type CoverageOnlyPmBrief, type PmBrief } from './admin_pm_contracts';
import { buildPmDecisionAudit, validatePmItemMutation, type PmItemType } from './admin_pm_memory';
import { derivePmRunIds, validatePmIdempotencyKey } from './admin_pm_service';
import { buildPmGenerationRequest, parseAndValidatePmBriefJson } from './admin_pm_generation';
import { ADMIN_PM_CODEX } from './generated/admin_pm_codex';

const REGION = 'us-central1';
const DAY_MS = 24 * 60 * 60 * 1000;
const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const PM_MODEL = 'gpt-4o-mini';

type CallableRequest = {
  auth?: { token?: { admin?: boolean; email?: unknown } };
  data?: unknown;
};

function assertAdmin(request: CallableRequest): string {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  return String(request.auth?.token?.email || 'admin');
}

function objectData(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function safeText(value: unknown, limit: number): string {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function fmtDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

async function resolvePmWindow(db: FirebaseFirestore.Firestore, nowMs: number): Promise<{ startMs: number; endMs: number }> {
  const state = await db.doc('admin_pm_state/latest').get();
  const lastEndMs = Number(state.data()?.window?.endMs || 0);
  const startMs = Number.isFinite(lastEndMs) && lastEndMs > 0 && lastEndMs < nowMs
    ? lastEndMs
    : nowMs - DAY_MS;
  return { startMs, endMs: nowMs };
}

function evidenceIds(bundle: PmEvidenceBundle): Set<string> {
  return new Set(bundle.evidence.map((item) => item.evidenceId));
}

function codexIds(bundle: PmEvidenceBundle): Set<string> {
  return new Set([
    ...bundle.evidence.flatMap((item) => item.codexEntityIds),
    ...(ADMIN_PM_CODEX.goals || []).map((goal) => `goal:${goal.id}`),
  ]);
}

function buildCoverageOnlyBrief(input: {
  bundle: PmEvidenceBundle;
  insights: ProductInsights;
  missingDomains: string[];
}): CoverageOnlyPmBrief {
  const facts = input.insights.facts.slice(0, 8);
  const firstEvidenceId = input.bundle.evidence[0]?.evidenceId;
  const firstCodexId = input.bundle.evidence[0]?.codexEntityIds[0];
  const observationEvidence = facts[0]?.evidenceIds?.length ? facts[0].evidenceIds : (firstEvidenceId ? [firstEvidenceId] : []);
  const observationCodex = firstCodexId ? [firstCodexId] : [];
  const period = `${fmtDate(input.bundle.windows.current.startMs)} — ${fmtDate(input.bundle.windows.current.endMs)}`;
  const lines = facts.length
    ? facts.map((fact) => `- ${fact.metricId}: ${fact.current} сейчас, ${fact.previous} раньше, дельта ${fact.absoluteDelta}.`).join('\n')
    : '- Нет ни одной полностью проверенной метрики за оба сравниваемых периода.';
  const missing = input.missingDomains.length ? input.missingDomains.join(', ') : 'нет';
  return {
    schemaVersion: 1,
    mode: 'coverage_only',
    executiveSummary: `PM-обзор за период ${period}. Полная статья пока закрыта gate-проверкой: не хватает надёжного покрытия доменов ${missing}.`,
    article: [
      `Период анализа: ${period}.`,
      '',
      'Этот запуск работает в безопасном режиме покрытия. Он показывает только проверенные наблюдения и не делает продуктовых причинных выводов, потому что часть базовых доменов данных ещё не имеет полного покрытия текущего и предыдущего периода.',
      '',
      'Проверенные количественные наблюдения:',
      lines,
      '',
      `Слепая зона для полной PM-статьи: ${missing}. После появления покрытия по этим доменам этот же Workspace сможет выпускать полноценные рекомендации, идеи и эксперименты.`,
    ].join('\n'),
    observations: observationEvidence.length && observationCodex.length ? [{
      id: 'obs:coverage-summary',
      text: `Собрано ${input.bundle.evidence.length} доказательных точек и ${facts.length} сравнимых метрик.`,
      evidenceIds: observationEvidence,
      codexEntityIds: observationCodex,
      confidence: facts[0]?.confidence ?? 0.55,
    }] : [],
    risks: observationEvidence.length && observationCodex.length ? [{
      id: 'risk:coverage-gate',
      text: `Полные рекомендации скрыты до восстановления покрытия доменов: ${missing}.`,
      evidenceIds: observationEvidence,
      codexEntityIds: observationCodex,
      confidence: 0.8,
    }] : [],
    questionsForOwner: ['Какие источники считать приоритетными для восстановления полной PM-статьи: RevenueCat, обучение, support/error или activation?'],
    blindSpots: input.missingDomains,
    hypotheses: [],
    recommendations: [],
    ideas: [],
    experiments: [],
  };
}

async function generateFullBriefWithModel(input: {
  apiKey: string;
  bundle: PmEvidenceBundle;
  insights: ProductInsights;
  evidenceIdSet: Set<string>;
  codexIdSet: Set<string>;
}): Promise<PmBrief> {
  const request = buildPmGenerationRequest({
    mode: 'full',
    evidence: {
      windows: input.bundle.windows,
      metrics: input.bundle.metrics,
      coverage: input.bundle.coverage,
      insights: input.insights,
      evidence: input.bundle.evidence,
    },
    codex: ADMIN_PM_CODEX,
    ownerNotes: [],
  });
  const response = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: PM_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: request.messages,
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`openai_pm_brief_failed:${response.status}:${body.slice(0, 240)}`);
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const raw = payload.choices?.[0]?.message?.content || '';
  const parsed = parseAndValidatePmBriefJson(raw, input.evidenceIdSet, input.codexIdSet);
  if (!parsed.ok || !parsed.brief) {
    throw new Error(`openai_pm_brief_invalid:${'errors' in parsed ? parsed.errors.join(',') : 'unknown'}`);
  }
  return parsed.brief;
}

export const adminGenerateProductBrief = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [OPENAI_API_KEY] },
  async (request) => {
    const actorEmail = assertAdmin(request);
    const data = objectData(request.data);
    const idempotencyKey = String(data.idempotencyKey || '');
    const keyValidation = validatePmIdempotencyKey(idempotencyKey);
    if (!keyValidation.ok) throw new HttpsError('invalid-argument', keyValidation.errors.join(','));

    const db = admin.firestore();
    const { runId, briefId } = derivePmRunIds(idempotencyKey);
    const runRef = db.doc(`admin_pm_runs/${runId}`);
    const existingRun = await runRef.get();
    if (existingRun.exists && existingRun.data()?.status === 'succeeded') {
      return { ok: true, runId, briefId: existingRun.data()?.briefId || briefId, reused: true };
    }

    const nowMs = Date.now();
    const window = await resolvePmWindow(db, nowMs);
    await runRef.set({
      schemaVersion: 1,
      runId,
      briefId,
      idempotencyKey,
      status: 'running',
      actorEmail,
      startedAtMs: nowMs,
      window,
    }, { merge: true });

    try {
      const bundle = await collectProductManagerEvidence({
        window,
        readers: createFirestorePmSourceReaders(db),
        pageSize: 500,
        maxPages: 20,
      });
      const insights = computeProductInsights(bundle);
      const gate = evaluatePmPublicationGate(bundle);
      const evidenceIdSet = evidenceIds(bundle);
      const codexIdSet = codexIds(bundle);
      const apiKey = String(OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY || '').trim();
      if (gate.mode === 'full' && !apiKey) throw new HttpsError('failed-precondition', 'OPENAI_API_KEY not configured');
      const brief: PmBrief = gate.mode === 'full'
        ? await generateFullBriefWithModel({ apiKey, bundle, insights, evidenceIdSet, codexIdSet })
        : buildCoverageOnlyBrief({ bundle, insights, missingDomains: gate.missingDomains });
      const validation = validatePmBrief(brief, evidenceIdSet, codexIdSet);
      if (!validation.ok) throw new Error(`pm_brief_validation_failed:${validation.errors.join(',')}`);

      const finishedAtMs = Date.now();
      const writeBatch = db.batch();
      writeBatch.set(db.doc(`admin_pm_briefs/${briefId}`), {
        ...brief,
        briefId,
        runId,
        mode: brief.mode,
        gateMode: gate.mode,
        generatedAtMs: finishedAtMs,
        actorEmail,
        window,
        previousWindow: bundle.windows.previous,
        codexVersion: ADMIN_PM_CODEX.schemaVersion,
      });
      writeBatch.set(db.doc(`admin_pm_evidence_manifests/${briefId}`), {
        schemaVersion: 1,
        briefId,
        runId,
        generatedAtMs: finishedAtMs,
        window,
        previousWindow: bundle.windows.previous,
        metrics: bundle.metrics,
        evidence: bundle.evidence,
        coverage: bundle.coverage,
        insights,
        gate,
      });
      writeBatch.set(db.doc('admin_pm_state/latest'), {
        schemaVersion: 1,
        briefId,
        runId,
        generatedAtMs: finishedAtMs,
        window,
        mode: brief.mode,
      }, { merge: true });
      writeBatch.set(runRef, {
        status: 'succeeded',
        briefId,
        finishedAtMs,
        mode: brief.mode,
      }, { merge: true });
      await writeBatch.commit();
      return { ok: true, runId, briefId, mode: brief.mode, gateMode: gate.mode, reused: false };
    } catch (error) {
      await runRef.set({
        status: 'failed',
        failedAtMs: Date.now(),
        errorMessage: error instanceof Error ? error.message : 'pm_generation_failed',
      }, { merge: true });
      console.error('adminGenerateProductBrief failed', error);
      throw new HttpsError('internal', error instanceof Error ? error.message : 'pm_generation_failed');
    }
  },
);

export const adminMutateProductItem = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const actorEmail = assertAdmin(request);
    const data = objectData(request.data);
    const briefId = safeText(data.briefId, 120);
    const itemId = safeText(data.itemId, 160);
    const itemType = safeText(data.itemType, 40) as PmItemType;
    const from = safeText(data.from, 40);
    const to = safeText(data.to, 40);
    const comment = safeText(data.comment, 1000);
    const result = safeText(data.result, 2000);
    if (!briefId || !itemId || (itemType !== 'recommendation' && itemType !== 'experiment')) {
      throw new HttpsError('invalid-argument', 'briefId, itemId and itemType are required');
    }
    const validation = validatePmItemMutation({ itemType, from, to, comment, result });
    if (!validation.ok) throw new HttpsError('invalid-argument', validation.errors.join(','));

    const db = admin.firestore();
    const nowMs = Date.now();
    const audit = buildPmDecisionAudit({ briefId, itemId, itemType, from, to, actorEmail, comment, result, nowMs });
    const bundleName = itemType === 'recommendation' ? 'admin_pm_recommendation_bundles' : 'admin_pm_experiment_bundles';
    const bundleRef = db.doc(`${bundleName}/${briefId}`);
    const batch = db.batch();
    batch.set(bundleRef, {
      schemaVersion: 1,
      briefId,
      updatedAtMs: nowMs,
      [`statuses.${itemId}`]: { from, to, comment, result, actorEmail, decidedAtMs: nowMs },
    }, { merge: true });
    batch.set(db.doc(audit.path), audit.data);
    await batch.commit();
    return { ok: true, decisionPath: audit.path };
  },
);
