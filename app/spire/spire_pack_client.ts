// ═══════════════════════════════════════════════════════════════════════════
// spire_pack_client.ts — пакет недели Шпиля: одно скачивание в неделю, кэш на диске.
//
// зачем (владелец D54, TOWER_CONTRACT §4): ступень играется целиком на устройстве —
// 0 вызовов на ступень, 1 скачивание в неделю на язык × шпиль. Файл собирает
// spirePackWeeklyCron в Storage по точному пути {prefix}/{lang}/{tier}/{weekId}.json;
// правила Storage пускают только вошедшего и только get (листинга нет).
//
// Почему REST, а не SDK Storage: модуля @react-native-firebase/storage в
// приложении нет, а новый нативный модуль = новая сборка. Тот же приём, что у
// озвучки Learning V2 (его транспорт удалён в PM-205, приём тот же): GET
// firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media с заголовком
// «Authorization: Firebase <idToken>». App Check не используется (пломба владельца).
//
// Порядок: память процесса → файл на диске (Paths.document/spire-packs) → сеть.
// Файлы других недель удаляются после успешного скачивания — на диске одна неделя.
// ═══════════════════════════════════════════════════════════════════════════
import { Directory, File, Paths } from 'expo-file-system';

import { spireDecodeWeekPack, type SpireWeekPack } from '../../modules/spire/pack_plan';
import { DebugLogger } from '../debug-logger';
import type { SpireLiveGate } from './spire_live_gate';
import { spireCloudAvailable, spireErrorText, spireIdToken, spireStorageBucket } from './spire_net';

const LOG = '[SPIRE]';
const DIR_NAME = 'spire-packs';
/** Корень пути в Storage — SPIRE_PACK_STORAGE_PREFIX в functions/src/spire_pack_contract.ts. */
const STORAGE_PREFIX = 'spire_packs';
const DOWNLOAD_TIMEOUT_MS = 20_000;

export type SpirePackLoad = Readonly<{
  status: 'ok' | 'offline' | 'missing' | 'invalid' | 'unavailable';
  pack: SpireWeekPack | null;
  source: 'memory' | 'disk' | 'network' | 'none';
  reason: string;
}>;

export type SpirePackKey = Readonly<{ lang: string; tier: number; weekId: string }>;

const memory = new Map<string, SpireWeekPack>();
const inFlight = new Map<string, Promise<SpirePackLoad>>();
// зачем (🔴 владелец 15.10, «Задания этой недели ещё готовятся»; координатор): пакета нет (404) — повторный запрос по тому же ключу не
// раньше чем через 2 мин (прогрев при входе + каждый тап «Подняться» иначе били в Storage подряд). Короткий срок — свежезалитый пакет
// подхватится быстро. Только в памяти процесса.
const MISSING_RECHECK_MS = 2 * 60 * 1000;
const missingAt = new Map<string, number>();

const keyOf = (k: SpirePackKey) => `${k.lang}:${k.tier}:${k.weekId}`;
const fileName = (k: SpirePackKey) => `${k.lang}_t${k.tier}_${k.weekId}.json`.replace(/[^A-Za-z0-9._-]/gu, '_');

function packDir(): Directory {
  return new Directory(Paths.document, DIR_NAME);
}

/** Синхронно: пакет уже в памяти (для мгновенного старта ступени). */
export function peekSpireWeekPack(k: SpirePackKey): SpireWeekPack | null {
  return memory.get(keyOf(k)) ?? null;
}

async function readDisk(k: SpirePackKey): Promise<SpireWeekPack | null> {
  try {
    const file = new File(packDir(), fileName(k));
    if (!file.exists) return null;
    const decoded = spireDecodeWeekPack(JSON.parse(await file.text()), k);
    if (!decoded.ok) {
      DebugLogger.warn(LOG, `pack: файл на диске отвергнут (${decoded.reason}) — удаляем и скачаем заново`);
      file.delete();
      return null;
    }
    return decoded.pack;
  } catch (error) {
    DebugLogger.warn(LOG, `pack: файл на диске не прочитался (${spireErrorText(error)})`);
    return null;
  }
}

function writeDisk(k: SpirePackKey, text: string): void {
  try {
    const dir = packDir();
    if (!dir.exists) dir.create({ intermediates: true });
    new File(dir, fileName(k)).write(text);
    const keep = fileName(k);
    for (const entry of dir.list()) {
      if (entry instanceof File && !entry.uri.endsWith(keep)) {
        try {
          entry.delete();
        } catch (error) {
          DebugLogger.warn(LOG, `pack: старый файл ${entry.uri} не удалился (${spireErrorText(error)})`);
        }
      }
    }
  } catch (error) {
    // Не записали — пакет живёт в памяти процесса, следующий запуск скачает снова.
    DebugLogger.warn(LOG, `pack: запись на диск не удалась (${spireErrorText(error)})`);
  }
}

async function download(gate: SpireLiveGate, k: SpirePackKey): Promise<SpirePackLoad> {
  const bucket = spireStorageBucket('pack');
  const token = await spireIdToken(gate, 'pack');
  if (!bucket || !token) return { status: 'unavailable', pack: null, source: 'none', reason: !bucket ? 'no_bucket' : 'no_token' };
  const path = `${STORAGE_PREFIX}/${k.lang}/${k.tier}/${k.weekId}.json`;
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    DebugLogger.info(LOG, `pack: скачиваем ${path}`);
    const res = await fetch(url, { headers: { Authorization: `Firebase ${token}` }, signal: controller.signal });
    if (res.status === 404) {
      DebugLogger.warn(LOG, `pack: ${path} ещё не собран (404) за ${Date.now() - startedAt}мс`);
      return { status: 'missing', pack: null, source: 'none', reason: 'http_404' };
    }
    if (!res.ok) {
      DebugLogger.warn(LOG, `pack: ответ ${res.status} за ${Date.now() - startedAt}мс`);
      return { status: res.status >= 500 ? 'offline' : 'unavailable', pack: null, source: 'none', reason: `http_${res.status}` };
    }
    const text = await res.text();
    const decoded = spireDecodeWeekPack(JSON.parse(text), k);
    if (!decoded.ok) {
      DebugLogger.warn(LOG, `pack: файл сети отвергнут (${decoded.reason}), байт=${text.length}`);
      return { status: 'invalid', pack: null, source: 'none', reason: decoded.reason };
    }
    DebugLogger.info(LOG, `pack: сеть ok hash=${decoded.pack.packHash} этажей=${decoded.pack.floors.length} байт=${text.length} за ${Date.now() - startedAt}мс`);
    writeDisk(k, text);
    return { status: 'ok', pack: decoded.pack, source: 'network', reason: 'ok' };
  } catch (error) {
    const aborted = controller.signal.aborted;
    DebugLogger.warn(LOG, `pack: скачивание упало (${aborted ? 'таймаут' : spireErrorText(error)}) за ${Date.now() - startedAt}мс`);
    return { status: 'offline', pack: null, source: 'none', reason: aborted ? 'timeout' : 'network_error' };
  } finally {
    clearTimeout(timer);
  }
}

/** Пакет недели: память → диск → сеть (одна загрузка на ключ одновременно). */
export function spireEnsureWeekPack(gate: SpireLiveGate, k: SpirePackKey): Promise<SpirePackLoad> {
  const key = keyOf(k);
  const hit = memory.get(key);
  if (hit) return Promise.resolve({ status: 'ok', pack: hit, source: 'memory', reason: 'memory' });
  const running = inFlight.get(key);
  if (running) return running;
  const missedAt = missingAt.get(key);
  if (missedAt !== undefined && Date.now() - missedAt < MISSING_RECHECK_MS) {
    DebugLogger.info(LOG, `pack: ${key} недавно не найден (${Math.round((Date.now() - missedAt) / 1000)} с назад) — повтор позже, сеть не трогаем`);
    return Promise.resolve({ status: 'missing', pack: null, source: 'none', reason: 'recent_404' });
  }
  // язык пакета — язык ОБУЧЕНИЯ (asSpireLang(studyTarget) в SpireHomeScreen), не язык интерфейса; ключ в журнале для проверки
  DebugLogger.info(LOG, `pack: нужен lang=${k.lang} tier=${k.tier} week=${k.weekId}`);
  const task = (async (): Promise<SpirePackLoad> => {
    const disk = await readDisk(k);
    if (disk) {
      memory.set(key, disk);
      DebugLogger.info(LOG, `pack: с диска hash=${disk.packHash}`);
      return { status: 'ok', pack: disk, source: 'disk', reason: 'disk' };
    }
    if (!spireCloudAvailable()) {
      DebugLogger.info(LOG, 'pack: облако выключено — пакета нет');
      return { status: 'unavailable', pack: null, source: 'none', reason: 'cloud_off' };
    }
    const net = await download(gate, k);
    if (net.pack) { memory.set(key, net.pack); missingAt.delete(key); }
    else if (net.status === 'missing') missingAt.set(key, Date.now());
    return net;
  })().finally(() => { inFlight.delete(key); });
  inFlight.set(key, task);
  return task;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
