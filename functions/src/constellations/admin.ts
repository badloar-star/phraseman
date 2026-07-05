// ════════════════════════════════════════════════════════════════════════════
// constellations/admin.ts — админ-callable управления режимом (спек G1–G5).
//
// Единственная точка, откуда «Пульт» крутит режим ЖИВЬЁМ (config.ts дефолты —
// только fallback). Пишет оверрайды в admin_runtime_config/constellations
// (тот же док, что читает resolveConstellationConfig). Толерантный парсер
// constellationConfigFromData валидирует всё на чтении — сюда кладём сырой merge.
//
// Действия:
//   get           — текущий эффективный конфиг + дефолты + live-статистика
//   setConfig      — глубокий merge оверрайдов конфига (боты/таймеры/квизы/…)
//   listMatches    — активные матчи (сколько с ботами — видно ТОЛЬКО здесь)
//   abortMatch     — аварийно завершить матч (всем — вежливый экран)
//   cacheStats     — счётчики кэша квизов по уровню×языку
//
// Только admin (request.auth.token.admin). Пишет audit-поле updatedBy (email).
// ════════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from '../callable_options';
import {
  CONSTELLATION_DEFAULTS,
  RUNTIME_CONFIG_COLLECTION,
  RUNTIME_CONFIG_DOC,
  constellationConfigFromData,
} from './config';

const REGION = 'us-central1';

interface AdminData {
  action?: unknown;
  config?: unknown;   // сырой объект-оверрайд для setConfig
  matchId?: unknown;  // для abortMatch
}

function asText(v: unknown, max: number): string {
  return String(v ?? '').trim().slice(0, max);
}

/** Глубокий merge оверрайда в существующий док (плоские секции конфига). */
function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
      out[k] = deepMerge(out[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Live-статистика режима для дашборда админки (дёшево — count-запросы). */
async function liveStats(db: FirebaseFirestore.Firestore): Promise<Record<string, number>> {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const [activeSnap, resultsDaySnap, queueSnap] = await Promise.all([
    db.collection('constellation_matches').where('stage', '==', 'active').count().get().catch(() => null),
    db.collection('constellation_results').where('createdAt', '>=', dayAgo).count().get().catch(() => null),
    db.collection('constellation_queue').count().get().catch(() => null),
  ]);
  return {
    activeMatches: activeSnap?.data().count ?? 0,
    resultsLast24h: resultsDaySnap?.data().count ?? 0,
    inQueue: queueSnap?.data().count ?? 0,
  };
}

/** Активные матчи с числом ботов (видно ТОЛЬКО админу, B5). */
async function listActiveMatches(db: FirebaseFirestore.Firestore): Promise<unknown[]> {
  const snap = await db.collection('constellation_matches')
    .where('stage', '==', 'active')
    .orderBy('createdAt', 'desc')
    .limit(40)
    .get();
  const out: unknown[] = [];
  for (const doc of snap.docs) {
    const m = doc.data() as {
      round?: number; roundsTotal?: number; phase?: string; createdAt?: number;
      players?: Array<{ name?: string }>; starfall?: { golden?: boolean }; playerIds?: string[];
    };
    // Число ботов — из серверного дока (закрыт от клиентов).
    const serverSnap = await db.collection('constellation_server').doc(doc.id).get().catch(() => null);
    const bots = (serverSnap?.data() as { bots?: unknown[] } | undefined)?.bots?.length ?? 0;
    out.push({
      matchId: doc.id,
      round: m.round ?? 0,
      roundsTotal: m.roundsTotal ?? 0,
      phase: m.phase ?? '',
      golden: m.starfall?.golden ?? false,
      players: (m.players ?? []).map((p) => p.name ?? '—'),
      bots,
      humans: (m.playerIds?.length ?? 0) - bots,
      createdAt: m.createdAt ?? 0,
    });
  }
  return out;
}

/** Счётчики кэша квизов по уровню (ready/pending/rejected). */
async function cacheStats(db: FirebaseFirestore.Firestore): Promise<Record<string, Record<string, number>>> {
  const levels = ['A1', 'A2', 'B1', 'B2'];
  const statuses = ['ready', 'pending', 'rejected'];
  const out: Record<string, Record<string, number>> = {};
  for (const level of levels) {
    out[level] = {};
    for (const status of statuses) {
      const snap = await db.collection('constellation_quizzes')
        .where('level', '==', level)
        .where('status', '==', status)
        .count().get().catch(() => null);
      out[level][status] = snap?.data().count ?? 0;
    }
  }
  return out;
}

export const constellationAdmin = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const db = admin.firestore();
    const ref = db.collection(RUNTIME_CONFIG_COLLECTION).doc(RUNTIME_CONFIG_DOC);
    const data = (request.data ?? {}) as AdminData;
    const action = asText(data.action, 20) || 'get';

    if (action === 'setConfig') {
      const patch = data.config;
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        throw new HttpsError('invalid-argument', 'bad config patch');
      }
      const prevSnap = await ref.get();
      const prev = (prevSnap.exists ? prevSnap.data() : {}) as Record<string, unknown>;
      const merged = deepMerge(prev, patch as Record<string, unknown>);
      // Валидация: прогоняем через толерантный парсер — если что-то битое,
      // оно просто не применится при чтении, но в док кладём merged как есть
      // (парсер защищает read-path). Проверяем, что парсер не падает.
      constellationConfigFromData(merged);
      await ref.set(
        {
          ...merged,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAtMs: Date.now(),
          updatedBy: asText(request.auth?.token?.email, 200) || 'admin',
        },
        { merge: true },
      );
    } else if (action === 'abortMatch') {
      const matchId = asText(data.matchId, 120);
      if (!matchId) throw new HttpsError('invalid-argument', 'matchId required');
      const mRef = db.collection('constellation_matches').doc(matchId);
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(mRef);
        if (!snap.exists) throw new HttpsError('not-found', 'match not found');
        const m = snap.data() as { stage?: string };
        if (m.stage !== 'active') return;
        // Вежливое завершение: помечаем aborted, клиенты покажут экран и выйдут.
        tx.update(mRef, {
          stage: 'finished',
          abortedByAdmin: true,
          finishedAt: Date.now(),
        });
      });
    } else if (action !== 'get') {
      throw new HttpsError('invalid-argument', `unknown action ${action}`);
    }

    // Всегда возвращаем актуальный конфиг + дефолты + статистику.
    const snap = await ref.get();
    const effective = constellationConfigFromData(snap.exists ? snap.data() : undefined);
    const [stats, matches, cache] = await Promise.all([
      liveStats(db),
      action === 'get' || action === 'setConfig' ? listActiveMatches(db).catch(() => []) : Promise.resolve([]),
      action === 'get' ? cacheStats(db).catch(() => ({})) : Promise.resolve({}),
    ]);

    return {
      ok: true,
      config: effective,
      defaults: CONSTELLATION_DEFAULTS,
      stats,
      matches,
      cache,
      updatedAtMs: Number((snap.data() as { updatedAtMs?: number } | undefined)?.updatedAtMs ?? 0),
      updatedBy: asText((snap.data() as { updatedBy?: string } | undefined)?.updatedBy, 200),
    };
  },
);
