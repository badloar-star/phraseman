// ═══════════════════════════════════════════════════════════════════════════
// spire_load_trace.ts — журнал загрузки экрана Пика [SPIRE-LOAD] и «кэш прошлой загрузки сразу».
//
// зачем (жалоба владельца 17.10 с телефона: «Пик очень долго грузился — людей не видно, кнопка „Играть“ недоступна, потом запустился»;
// координатор: «сперва логи, без догадок», затем экран сразу показывает кэш прошлой загрузки, а сеть догоняет фоном):
// - конфиг: при пустой памяти процесса экран ждал loadSpireConfig, а тот при кэше старше 6 ч ждёт Firestore — скелет до ответа сети;
// - комната (люди, лига → «Играть»): spireSyncRoom при кэше старше 6 ч тоже ждёт сеть, а память процесса на холодном старте пуста.
// Здесь — чтение дисковых копий ЛЮБОГО возраста для первого кадра (сеть освежает их как раньше) и одна строка на каждый шаг загрузки
// с мс от входа на экран. Файлы экрана и хука упираются в лимит 400 строк — поэтому всё вынесено сюда.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react';

import type { SpireConfigDoc } from '../../modules/spire/config_contract';
import { peekSpireConfig, warmSpireConfigFromDisk } from '../spire_config_client';
import { peekSpireRoom, spireReadRoomCache, type SpireRoomLoad } from './spire_room_client';
import { spireCurrentWeekKey } from '../../components/spire/spire_tower_model';
import type { SpireLang } from '../../modules/spire/report_queue';
import { getCanonicalUserId } from '../user_id_policy';
import { asSpireLang } from '../../components/spire/spire_home_week';

let enteredAtMs = Date.now();

/** Одна строка журнала: шаг и мс от входа на экран Пика. */
export function spireLoadMark(step: string, data: Readonly<Record<string, unknown>> = {}): void {
  console.log('[SPIRE]', '[SPIRE-LOAD]', step, JSON.stringify({ sinceEnterMs: Date.now() - enteredAtMs, ...data })); // guard-ok: по строке на шаг загрузки
}

/**
 * Вход на экран. Память пуста → конфиг с диска любого возраста (прогрев PM-214), чтобы не ждать сети.
 * Возвращает конфиг с диска или null; свежесть по-прежнему решает loadSpireConfig фоном.
 */
export async function spireLoadEnter(configInMemory: boolean): Promise<SpireConfigDoc | null> {
  enteredAtMs = Date.now();
  spireLoadMark('screen:enter', { config: configInMemory ? 'memory' : 'none' });
  if (configInMemory) return null;
  const source = await warmSpireConfigFromDisk();
  const disk = peekSpireConfig();
  spireLoadMark('config:disk_first', { source, found: disk !== null, enabled: disk ? disk.enabled === true : null });
  return disk;
}

/**
 * Комната для первого кадра: память → диск (эта неделя, любой возраст) → null. Сеть (spireSyncRoom) затем освежает как раньше.
 * identityMs — сколько читались uid/stableId (подозрение на медленный SecureStore).
 */
export async function spireFirstFrameRoom(uid: string, lang: SpireLang, identityMs: number): Promise<SpireRoomLoad | null> {
  spireLoadMark('identity', { ms: identityMs });
  const memory = peekSpireRoom(uid, lang);
  if (memory) {
    spireLoadMark('room:first_frame', { source: 'memory', members: memory.members.length, tier: memory.tier });
    return { status: 'cache', room: memory, reason: 'memory_peek' };
  }
  const startedAt = Date.now();
  const disk = await spireReadRoomCache(uid, lang);
  const weekId = spireCurrentWeekKey(Date.now());
  if (!disk || disk.weekId !== weekId) {
    spireLoadMark('room:first_frame', { source: 'none', why: disk ? `кэш прошлой недели ${disk.weekId}` : 'кэша на диске нет', readMs: Date.now() - startedAt }); // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
    return null;
  }
  spireLoadMark('room:first_frame', { source: 'disk', ageMs: Date.now() - disk.fetchedAtMs, members: disk.members.length, tier: disk.tier, readMs: Date.now() - startedAt });
  return { status: 'cache', room: disk, reason: 'disk_first_frame' };
}

type ReadinessInput = Readonly<{
  live: boolean; tier: number | null; rows: readonly unknown[] | null; session: unknown; pending: unknown; roomLoad: SpireRoomLoad | null;
}>;

/** Когда пришли люди и что держит «Играть» выключенной — строка на каждую смену причины (только смены, без дублей). */
export function useSpireLoadReadiness(game: ReadinessInput, preview: boolean): void {
  const lastRef = useRef<string | null>(null);
  const reasons: string[] = [];
  if (!game.live) reasons.push('live=false (конфиг не прочитан или Пик закрыт)'); // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  if (game.tier === null) reasons.push('tier=null (нет комнаты и недели)'); // guard-ok: строка журнала/причины решения, не текст интерфейса (переводчик 17.10)
  if (game.session !== null) reasons.push('session!=null');
  if (game.pending !== null) reasons.push('pending!=null');
  const key = `${reasons.join('|')}#${game.rows ? game.rows.length : 'null'}#${game.roomLoad ? `${game.roomLoad.status}/${game.roomLoad.reason}` : 'none'}`;
  useEffect(() => {
    if (preview || lastRef.current === key) return;
    lastRef.current = key;
    spireLoadMark('ready', {
      play: reasons.length === 0 ? 'enabled' : 'disabled',
      because: reasons.length > 0 ? reasons : null,
      people: game.rows ? game.rows.length : null,
      room: game.roomLoad ? `${game.roomLoad.status}/${game.roomLoad.reason}` : 'none',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: журнал на смену ключа, сами поля входят в ключ
  }, [key, preview]);
}

/**
 * Прогрев комнаты недели с диска в память процесса после первого кадра Главной (рядом с прогревом конфига PM-214).
 * зачем (замер эмулятора 17.10, [SPIRE-LOAD]: чтение копии с диска 1255 мс при входе на Пик — JS-поток занят монтированием вкладки):
 * читаем заранее, пока человек на Главной, — на входе в Пик люди и «Играть» берутся из памяти (room:first_frame source=memory).
 * Только чтение с устройства, без сети; язык без Пика — пропуск.
 */
export async function warmSpireRoomFromDisk(studyTarget: unknown): Promise<'warmed' | 'none' | 'skip'> {
  const lang = asSpireLang(studyTarget);
  if (!lang) {
    console.log('[SPIRE]', '[SPIRE-LOAD]', 'room:warm', JSON.stringify({ result: 'skip', why: `язык ${String(studyTarget)} без Пика` })); // guard-ok: ранний выход
    return 'skip';
  }
  const startedAt = Date.now();
  try {
    const uid = await getCanonicalUserId();
    if (!uid) {
      console.log('[SPIRE]', '[SPIRE-LOAD]', 'room:warm', JSON.stringify({ result: 'skip', why: 'нет uid' })); // guard-ok: ранний выход
      return 'skip';
    }
    const room = await spireReadRoomCache(uid, lang);
    const fresh = room !== null && room.weekId === spireCurrentWeekKey(Date.now());
    console.log('[SPIRE]', '[SPIRE-LOAD]', 'room:warm', JSON.stringify({ result: fresh ? 'warmed' : 'none', lang, weekId: room?.weekId ?? null, members: room?.members.length ?? null, ms: Date.now() - startedAt })); // guard-ok: итог прогрева
    // зачем (вариант (в) плиток Главной, координатор 17.10): бейдж места на плитке «Пик» — из этой же копии, без сети
    if (fresh && room) void import('./spire_home_place').then((m) => m.refreshSpireHomePlace(uid, lang, room));
    return fresh ? 'warmed' : 'none';
  } catch (error: unknown) {
    console.warn('[SPIRE]', '[SPIRE-LOAD]', 'room:warm_failed', error instanceof Error ? error.message : String(error)); // guard-ok: catch пишет причину
    return 'none';
  }
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
