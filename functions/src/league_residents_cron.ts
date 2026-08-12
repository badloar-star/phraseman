// ═══════════════════════════════════════════════════════════════════════════
// league_residents_cron.ts — крон, поддерживающий жителей лиг живыми.
//
// зачем (владелец, 2026-08-04): жители должны «жить своей жизнью» — каждые
// Каждый час у них растёт опыт, а вместе с ним уровень и аватар. Опыт — чистая
// функция времени (synthetic_residents.ts), но клиент читает комнату как
// обычный документ Firestore и не пересчитывает соседей. Поэтому крон просто
// материализует текущее состояние жителей в документ комнаты: работает на
// ЛЮБОЙ версии приложения, обновление клиента не требуется.
//
// Firebase-экономия (правило владельца): один запрос на комнаты текущей недели
// с лимитом, одна транзакция на комнату, 24 запуска в сутки. Комнаты, где живых
// уже 15+, пропускаются без записи вовсе — там жители не нужны, и платить за
// них не за что.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  RESIDENT_FILL_THRESHOLD,
  countLiveMembers,
  countVisibleMembers,
  fillRoomWithResidents,
  refreshResidents,
} from './league_residents';

/** Сколько комнат обслуживаем за один запуск — предохранитель по стоимости. */
const ROOMS_PER_RUN = 200;

/** ISO-идентификатор недели, тот же формат, что в league_groups.ts. */
export function currentWeekId(at = new Date()): string {
  const date = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/** Начало текущей ISO-недели (понедельник 00:00 UTC) — база недельных очков. */
export function currentWeekStartMs(nowMs: number): number {
  const now = new Date(nowMs);
  const daysSinceMonday = (now.getUTCDay() + 6) % 7;
  return Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceMonday,
  );
}

export const leagueResidentsTickCron = onSchedule(
  {
    // Keep materialized participant rows aligned with the hourly resident tick.
    schedule: 'every 1 hours',
    timeZone: 'UTC',
    timeoutSeconds: 300,
    memory: '256MiB',
    region: 'us-central1',
  },
  async () => {
    const db = admin.firestore();
    const weekId = currentWeekId();
    const now = Date.now();
    const weekStartMs = currentWeekStartMs(now);

    const snap = await db
      .collection('league_groups')
      .where('weekId', '==', weekId)
      .limit(ROOMS_PER_RUN)
      .get();

    let touched = 0;
    let skipped = 0;

    for (const doc of snap.docs) {
      try {
        await db.runTransaction(async (tx) => {
          const fresh = await tx.get(doc.ref);
          if (!fresh.exists) return;
          const data = fresh.data() || {};
          // Неделя могла смениться между запросом и транзакцией — не трогаем
          // чужую (уже финализируемую) комнату.
          if (data.weekId !== weekId) return;

          const members = (data.members && typeof data.members === 'object'
            ? data.members
            : {}) as Record<string, Record<string, unknown>>;

          const live = countLiveMembers(members);
          const hasResidents = countVisibleMembers(members) > live;
          // Полная живая комната без жителей уже соответствует контракту.
          // Если жители ещё остались после роста комнаты, не пропускаем: ниже
          // fillRoomWithResidents удалит их и синхронизирует memberCount.
          if (live >= RESIDENT_FILL_THRESHOLD && !hasResidents) {
            skipped++;
            return;
          }

          const filled = fillRoomWithResidents(members, doc.id, weekStartMs, now);
          const refreshed = refreshResidents(filled, doc.id, weekStartMs, now);

          tx.set(doc.ref, {
            members: refreshed,
            memberCount: countVisibleMembers(refreshed),
            liveMemberCount: countLiveMembers(refreshed),
            updatedAt: now,
          }, { merge: true });
          touched++;
        });
      } catch (e: unknown) {
        console.warn(JSON.stringify({
          event: 'league_residents_tick_failed',
          groupId: doc.id,
          message: String((e as Error)?.message ?? e).slice(0, 160),
        }));
      }
    }

    console.log(JSON.stringify({
      event: 'league_residents_tick',
      weekId,
      rooms: snap.size,
      touched,
      skipped,
    }));
  },
);
