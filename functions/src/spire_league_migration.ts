// ═══════════════════════════════════════════════════════════════════════════
// spire_league_migration.ts — одноразовый перенос места лиги в шпиль (PM-278).
//
// КОГДА: лениво, при ПЕРВОМ входе человека в Шпиль (spireJoinRoom), а не
// кроном по всей базе и не на старте приложения.
// зачем так: (1) Firebase-экономия — одна транзакция на человека один раз в
// жизни, только у тех, кто реально открыл Шпиль; ноль лишних вызовов на старте
// у всех остальных. (2) «Текущий язык» живёт только на устройстве
// (AsyncStorage study_target_v1, в облако не синкается) — сервер узнаёт его
// только из запроса клиента. Массовый крон не знал бы языка вовсе.
// (3) Комната недели подбирается по tier — перенос ОБЯЗАН случиться до
// подбора, иначе человек на неделю сядет в Гранит.
//
// ЧТО ПИШЕТ (одна транзакция):
//   • leaderboard/{uid}.spireTiers = {en, es, fr, de} — текущий язык = место
//     лиги, остальные 0 (уже записанные не трогаются);
//   • leaderboard/{uid}.spireMigration — короткая отметка (leaderboard читают
//     все вошедшие — сюда только цифры);
//   • spire_league_migration/{uid} — полная резервная копия «как было»
//     (закрыта от клиентов правилами), по ней работает откат.
// ЧЕГО НЕ ТРОГАЕТ: leagueId, groupId, league_groups, progress.league_state_v3 —
// Лига живёт как жила, откат не требует её восстановления.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import type { ArenaStudyTarget } from './arena_target_registry';
import {
  SPIRE_LEAGUE_MIGRATION_BACKUP_COLLECTION,
  SPIRE_LEAGUE_MIGRATION_SWITCH_DOC,
  buildMigrationRecords,
  buildSpireTierPlan,
  hasSpireMigrationMarker,
  readSpireTiers,
  resolveLeagueSource,
  spireMigrationModeFrom,
  type SpireTiers,
} from './spire_league_migration_contract';

const LOG = '[SPIRE-MIGRATION]';

export type EnsureSpireMigrationResult =
  | Readonly<{ status: 'already' | 'migrated'; tiers: SpireTiers }>
  | Readonly<{ status: 'paused' }>;

export async function ensureSpireLeagueMigration(
  db: admin.firestore.Firestore,
  input: Readonly<{
    stableUid: string;
    currentLang: ArenaStudyTarget;
    currentLangSource: 'client_current' | 'room_lang';
    currentWeekId: string;
    previousWeekId: string;
    nowMs: number;
  }>,
): Promise<EnsureSpireMigrationResult> {
  const { stableUid, currentLang, nowMs } = input;
  console.log(LOG, JSON.stringify({
    event: 'enter', currentLang, currentLangSource: input.currentLangSource,
    currentWeekId: input.currentWeekId, previousWeekId: input.previousWeekId,
  }));
  const lbRef = db.collection('leaderboard').doc(stableUid); // guard-ok: один документ по id
  const userRef = db.collection('users').doc(stableUid); // guard-ok: один документ по id
  const resultRef = userRef.collection('league_week_results').doc(input.previousWeekId); // guard-ok: один документ по id
  const backupRef = db.collection(SPIRE_LEAGUE_MIGRATION_BACKUP_COLLECTION).doc(stableUid); // guard-ok: один документ по id
  const switchRef = db.collection('config').doc(SPIRE_LEAGUE_MIGRATION_SWITCH_DOC); // guard-ok: один документ по id

  return db.runTransaction(async (tx): Promise<EnsureSpireMigrationResult> => {
    const [lbSnap, userSnap, resultSnap, backupSnap, switchSnap] = await Promise.all([
      tx.get(lbRef), tx.get(userRef), tx.get(resultRef), tx.get(backupRef), tx.get(switchRef),
    ]);
    const lb = lbSnap.data();

    // Повторный вход / параллельный вызов — отметка уже стоит, ничего не пишем.
    if (hasSpireMigrationMarker(lb)) {
      const tiers = readSpireTiers(lb);
      console.log(LOG, JSON.stringify({ event: 'already', tiers }));
      return { status: 'already', tiers };
    }

    const mode = spireMigrationModeFrom(switchSnap.data());
    if (mode === 'paused') {
      console.warn(LOG, JSON.stringify({ event: 'paused', switchExists: switchSnap.exists }));
      return { status: 'paused' };
    }

    const progress = userSnap.data()?.progress;
    const progressLeagueStateRaw = progress && typeof progress === 'object'
      ? (progress as Record<string, unknown>).league_state_v3
      : undefined;
    const resolution = resolveLeagueSource({
      leaderboard: lb,
      previousWeekResult: resultSnap.exists ? resultSnap.data() : undefined,
      progressLeagueStateRaw,
      currentWeekId: input.currentWeekId,
      previousWeekId: input.previousWeekId,
      nowMs,
    });
    if (!resolution.ok) {
      // Итог прошлой недели лиги ещё считается — не переносим устаревшее
      // место. Клиент повторит вход через пару минут (тот же код, что у лиги).
      console.warn(LOG, JSON.stringify({ event: 'reject', reason: resolution.reason, groupWeekId: lb?.groupWeekId ?? null }));
      throw new HttpsError('failed-precondition', resolution.reason);
    }

    const existingTiers = readSpireTiers(lb);
    const plan = buildSpireTierPlan(currentLang, resolution.leagueId, existingTiers);
    const { marker, backup } = buildMigrationRecords({
      uid: stableUid,
      nowMs,
      currentLang,
      currentLangSource: input.currentLangSource,
      resolution,
      plan,
      leaderboard: lb,
      progressLeagueStateRaw,
    });

    // Прежняя копия (после отката) не теряется: кладём её уровнем ниже,
    // без более глубокой истории — документ не растёт бесконечно.
    const prior = backupSnap.exists ? backupSnap.data() : undefined;
    const priorCompact = prior ? { ...prior, previous: null } : null;
    if (prior && prior.rolledBackAtMs == null) {
      // Копия есть, а отметки в leaderboard нет и отката не было — кто-то
      // стёр отметку руками. Не падаем (иначе человек не войдёт в Шпиль),
      // но громко пишем и сохраняем старую копию.
      console.error(LOG, JSON.stringify({ event: 'backup_without_marker', priorMigratedAtMs: prior.migratedAtMs ?? null }));
    }

    tx.set(backupRef, { ...backup, previous: priorCompact });
    // merge: трогаем только два своих поля; остальная строка leaderboard цела.
    tx.set(lbRef, { spireTiers: plan.tiers, spireMigration: marker }, { merge: true });

    console.log(LOG, JSON.stringify({
      event: 'migrated',
      source: resolution.source,
      sourceLeagueId: resolution.leagueId,
      clamped: resolution.clamped,
      conflicts: resolution.conflicts,
      tiers: plan.tiers,
      kept: plan.kept,
      hadBackup: !!prior,
    }));
    return { status: 'migrated', tiers: plan.tiers };
  });
}
