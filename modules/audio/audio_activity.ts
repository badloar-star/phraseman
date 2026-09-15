import {
  SPEAKING_RECORDING_AUDIO_MODE,
  SPOKEN_AUDIO_MODE,
  UI_SFX_AUDIO_MODE,
} from '@/app/audio_playback_mode';
import { setManagedAudioMode } from '@/app/audio_session_coordinator';

export type AudioActivityKind = 'spoken' | 'recording';

export type AudioActivitySnapshot = Readonly<{
  spokenActive: boolean;
  recordingActive: boolean;
}>;

export type AudioActivityLease = Readonly<{
  release(): void;
}>;

/**
 * Предельный срок жизни одной аренды аудиотракта.
 *
 * зачем (жалобы «пропадает озвучка», аудит 2026-09-15): счётчики ниже —
 * ЕДИНСТВЕННЫЙ источник правды сразу для трёх вещей: нативный режим сессии,
 * глушение эффектов (sound_director → sound_arbiter) и выдача новых претензий
 * (claimSpokenAudio возвращает null, пока идёт запись). Освобождала аренду
 * только вызывающая сторона, вручную. Один пропущенный release() — и счётчик
 * уже никогда не вернётся в ноль: приложение немо до перезапуска процесса.
 * Именно это описывали пользователи.
 *
 * Аренда — ресурс с предельным сроком, а не бессрочная запись. Потолок выбран
 * с большим запасом над любым реальным воспроизведением: самая длинная озвучка
 * фразы и самая длинная запись (MAX_HOLD_MS = 20с в speaking_hold_recorder)
 * укладываются в него многократно, поэтому предохранитель не может оборвать
 * здоровый сценарий. Срабатывание = всегда дефект вызывающей стороны, поэтому
 * оно громко логируется с именем виновника.
 */
const LEASE_MAX_LIFETIME_MS = 90_000;

/**
 * Возраст, начиная с которого аренда считается протухшей при ВОЗВРАТЕ приложения
 * из фона. Здесь порог жёстче: фон почти всегда обрывает воспроизведение и
 * запись (expo-audio сам ставит плееры на паузу), поэтому аренда, пережившая
 * уход в фон, почти наверняка осиротела. Пара секунд отделяет её от честной
 * аренды, взятой прямо в момент возврата.
 */
const LEASE_STALE_ON_RESUME_MS = 2_000;

/** Единый префикс трассы владения аудио: grep AUDIO-LEASE даёт всю цепочку. */
function leaseTrace(step: string, data: Record<string, unknown>): void {
  console.warn('[AUDIO-LEASE]', step, JSON.stringify(data)); // guard-ok: только отказы и срабатывание предохранителя, не в кадре
}

let spokenLeases = 0;
let recordingLeases = 0;
let currentIntent: 'ui' | AudioActivityKind | null = null;
let activityTail: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();
/** Живые аренды: нужны и предохранителю, и диагностике «кто держит звук». */
const liveLeases = new Set<{ kind: AudioActivityKind; owner: string; acquiredAt: number }>();

function snapshot(): AudioActivitySnapshot {
  return {
    spokenActive: spokenLeases > 0,
    recordingActive: recordingLeases > 0,
  };
}

function reconcile(): void {
  const nextIntent = recordingLeases > 0 ? 'recording' : spokenLeases > 0 ? 'spoken' : 'ui';
  if (nextIntent === currentIntent) return;
  currentIntent = nextIntent;
  const mode = nextIntent === 'recording'
    ? SPEAKING_RECORDING_AUDIO_MODE
    : nextIntent === 'spoken'
      ? SPOKEN_AUDIO_MODE
      : UI_SFX_AUDIO_MODE;
  // зачем (2026-09-14, «микрофон ломается после N-й попытки»): смена нативного
  // аудиорежима — единственное место цепочки, где отказ глотался молча. Пишем
  // намерение, счётчики аренд и причину отказа; сам отказ по-прежнему не
  // роняет вызывающего (некоторые нативные драйверы владеют сессией сами).
  const startedAt = Date.now();
  console.log('[SPEAK-MIC] audio-mode', JSON.stringify({ intent: nextIntent, spokenLeases, recordingLeases })); // guard-ok: трасса владельца, ≤3 строк на попытку
  activityTail = setManagedAudioMode(mode).catch((e: unknown) => {
    console.warn('[SPEAK-MIC] audio-mode:failed', JSON.stringify({ intent: nextIntent, tookMs: Date.now() - startedAt, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) })); // guard-ok: трасса владельца
    return undefined;
  });
  listeners.forEach((listener) => listener());
}

export function acquireAudioActivity(
  kind: AudioActivityKind,
  owner = 'unknown',
): AudioActivityLease {
  if (kind === 'recording') recordingLeases += 1;
  else spokenLeases += 1;
  const record = { kind, owner, acquiredAt: Date.now() };
  liveLeases.add(record);
  reconcile();

  let released = false;
  const drop = (reason: 'owner' | 'watchdog'): void => {
    if (released) return;
    released = true;
    if (watchdog != null) clearTimeout(watchdog);
    watchdog = null;
    liveLeases.delete(record);
    if (kind === 'recording') recordingLeases = Math.max(0, recordingLeases - 1);
    else spokenLeases = Math.max(0, spokenLeases - 1);
    if (reason === 'watchdog') {
      // зачем: срабатывание предохранителя ВСЕГДА означает пропущенный release()
      // у вызывающего. Печатаем владельца и счётчики, чтобы дефект чинился в
      // источнике, а не лечился одним предохранителем вечно.
      leaseTrace('watchdog:forced-release', {
        kind,
        owner,
        heldMs: Date.now() - record.acquiredAt,
        spokenLeases,
        recordingLeases,
        stillLive: liveLeases.size,
      });
    }
    reconcile();
  };

  let watchdog: ReturnType<typeof setTimeout> | null = setTimeout(
    () => drop('watchdog'),
    LEASE_MAX_LIFETIME_MS,
  );
  // Таймер предохранителя не должен держать процесс живым (Node/Jest).
  (watchdog as unknown as { unref?: () => void }).unref?.();

  return Object.freeze({ release: () => drop('owner') });
}

/**
 * Привести владение аудио к согласованному состоянию.
 *
 * зачем: аудиослой вообще не реагировал на жизненный цикл приложения. После
 * возврата из фона (звонок, наушники, переключение приложений) счётчик мог
 * остаться поднятым от прерванного воспроизведения — и звук не возвращался.
 * Вызывается при возврате приложения на передний план; в здоровом состоянии
 * (живых аренд нет) не делает ничего и молчит.
 */
export function releaseStaleAudioActivity(reason: string): number {
  if (liveLeases.size === 0) return 0;
  const now = Date.now();
  const stale = [...liveLeases].filter((lease) => now - lease.acquiredAt >= LEASE_STALE_ON_RESUME_MS);
  if (stale.length === 0) return 0;
  leaseTrace('resume:stale-leases', {
    reason,
    count: stale.length,
    owners: stale.map((lease) => `${lease.kind}:${lease.owner}:${now - lease.acquiredAt}ms`),
    spokenLeases,
    recordingLeases,
  });
  for (const lease of stale) {
    liveLeases.delete(lease);
    if (lease.kind === 'recording') recordingLeases = Math.max(0, recordingLeases - 1);
    else spokenLeases = Math.max(0, spokenLeases - 1);
  }
  reconcile();
  return stale.length;
}

/** Диагностика: кто прямо сейчас держит аудиотракт. */
export function describeLiveAudioLeases(): ReadonlyArray<Readonly<{ kind: AudioActivityKind; owner: string; heldMs: number }>> {
  const now = Date.now();
  return [...liveLeases].map((lease) => Object.freeze({
    kind: lease.kind,
    owner: lease.owner,
    heldMs: now - lease.acquiredAt,
  }));
}

export function getAudioActivitySnapshot(): AudioActivitySnapshot {
  return snapshot();
}

export function subscribeAudioActivity(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function whenAudioActivitySettled(): Promise<void> {
  await activityTail;
}

export function resetAudioActivityForTests(): void {
  spokenLeases = 0;
  recordingLeases = 0;
  liveLeases.clear();
  currentIntent = null;
  reconcile();
}

