// ═══════════════════════════════════════════════════════════════════════════
// spire_home_week.ts — чтение локальной недели для главного экрана Шпиля (вынесено из SpireHomeScreen.tsx).
//
// зачем (Авторизация №11, координатор 13.10): сторож «каждый файл Шпиля ≤ 400 строк» — экран разросся после нарядов башен и пика недели; функции чтения недели
// вынесены без изменений поведения: те же ветки и те же логи [SPIRE] (нет uid, нет недели, неделя устарела, неделя ок).
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react';

import { useSpireOwnerEpoch } from '../../app/spire/spire_owner_epoch';
import { peekSpireWeekLocal, spireReadWeekLocal } from '../../app/spire_report_client';
import { DebugLogger } from '../../app/debug-logger';
import { getCanonicalUserId } from '../../app/user_id_policy';
import type { SpireLang, SpireWeekLocal } from '../../modules/spire/report_queue';
import { spireCurrentWeekKey } from './spire_tower_model';

const LOG = '[SPIRE]';
export const SPIRE_LANGS: readonly SpireLang[] = ['en', 'es', 'de', 'fr', 'it'];
/** D77: языки Шпиля с пометкой «бета» (первые 2–4 недели после 30.09). */
export const SPIRE_BETA_LANGS: readonly string[] = ['es', 'de', 'fr', 'it'];

export function asSpireLang(value: unknown): SpireLang | null {
  return SPIRE_LANGS.includes(value as SpireLang) ? (value as SpireLang) : null;
}

/**
 * Неделя для ПЕРВОГО кадра из памяти процесса (peek), без чтения диска.
 * зачем (аудит скорости Авторизации 13.10, п.1): без неё маркер «ты здесь» и блок этажа дорисовывались после асинхронного чтения, а выбранный этаж
 * прыгал с 1 на настоящий — экран дёргался. Настоящее чтение ниже подтверждает или заменяет значение.
 */
export function peekFirstFrameWeek(studyTarget: unknown): SpireWeekLocal | null {
  const lang = asSpireLang(studyTarget);
  return lang ? peekSpireWeekLocal(lang) : null;
}

/**
 * Смена владельца (выход, A → B) на живом экране Пика: неделя, выбранный этаж и «все участники» прошлого игрока убираются сразу.
 * Возвращает эпоху владельца — экран ставит её в зависимости чтения недели, и неделя нового игрока перечитывается.
 * зачем (F17, аудит, владелец 11.11): экран Пика не перемонтируется при смене аккаунта, а чтение недели зависело только от языка.
 * При том же языке обучения B видел этаж, ступени и место A, а «Играть» открывала ступень с номером A. Вынесено сюда из-за
 * сторожа «экран Пика ≤ 400 строк».
 */
export function useSpireHomeWeekOwner(reset: () => void): number {
  const ownerEpoch = useSpireOwnerEpoch();
  const seenRef = useRef(ownerEpoch);
  const resetRef = useRef(reset);
  resetRef.current = reset;
  useEffect(() => {
    if (seenRef.current === ownerEpoch) return; // guard-ok: владелец тот же — сбрасывать нечего
    console.log('[SPIRE-TARGET] home: владелец', JSON.stringify({ from: seenRef.current, to: ownerEpoch, reset: 'week+selected+showAll' })); // guard-ok: трассировка сброса при смене владельца
    seenRef.current = ownerEpoch;
    resetRef.current();
  }, [ownerEpoch]);
  return ownerEpoch;
}

/** Локальная неделя текущей ISO-недели или null (чужая/старая неделя — не показываем как свою). */
export async function readCurrentLocalWeek(lang: SpireLang): Promise<SpireWeekLocal | null> {
  const uid = await getCanonicalUserId();
  if (!uid) {
    DebugLogger.info(LOG, 'home: локальная неделя не читается — нет канонического uid (облако выключено)');
    return null;
  }
  const local = await spireReadWeekLocal(uid, lang);
  if (!local) {
    DebugLogger.info(LOG, `home: локальной недели нет (lang=${lang}) — маркер не рисуем`);
    return null;
  }
  const expected = spireCurrentWeekKey(Date.now());
  if (local.weekKey !== expected) {
    DebugLogger.info(LOG, `home: локальная неделя устарела (local=${local.weekKey} сейчас=${expected}) — маркер не рисуем`);
    return null;
  }
  DebugLogger.info(LOG, `home: локальная неделя ok (tier=${local.tier} floor=${local.floor} stepInFloor=${local.stepInFloor} steps=${local.stepsCleared}) из AsyncStorage`);
  return local;
}
