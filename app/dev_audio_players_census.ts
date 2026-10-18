/*
 * [AUDIO-PLAYERS] перепись нативных звуковых плееров (координатор 18.10, только dev).
 *
 * зачем: на эмуляторе через ~30 мин после холодного старта Native Heap ~1 ГБ при Java heap 84 МБ — растёт нативное.
 * Подозрение — плееры expo-audio, которые создаются и не освобождаются. Сначала лог, потом диагноз: каждое создание
 * и освобождение со счётчиком живых и «кто создал», сводка по владельцам раз в минуту и на пике.
 *
 * Как считаем, не трогая десяток мест создания: и createAudioPlayer, и useAudioPlayer делают
 * `new AudioModule.AudioPlayer(...)` с поиском свойства в момент вызова, а освобождение (ручное и из
 * useReleasingSharedObject при размонтировании) — это `AudioPlayer.prototype.release`. Ставим прокси-конструктор
 * и обёртку release. Ссылки на плееры держим только в WeakSet — перепись сама не должна удерживать память.
 */

type PlayerClass = { new (...args: unknown[]): object; prototype: { release?: (...args: unknown[]) => unknown } };
type AudioModuleLike = { AudioPlayer: PlayerClass };

const LOG = '[AUDIO-PLAYERS]';
const SUMMARY_EVERY_MS = 60_000;

export type AudioPlayersCensusState = {
  created: number;
  released: number;
  peakLive: number;
  liveByOwner: Map<string, number>;
};

export function createAudioPlayersCensusState(): AudioPlayersCensusState {
  return { created: 0, released: 0, peakLive: 0, liveByOwner: new Map() };
}

/** Владелец — первые имена функций стека вне expo-audio и самой переписи (в dev-бандле имён файлов нет). */
export function audioPlayerOwnerFromStack(stack: string | undefined): string {
  if (!stack) return 'unknown';
  const names: string[] = [];
  for (const line of stack.split('\n').slice(1)) {
    const match = /^\s*at\s+([^\s(]+)/u.exec(line);
    const name = match?.[1];
    if (!name || name === 'anonymous' || name === 'construct' || name === 'Reflect.construct') continue;
    if (/^(?:createAudioPlayer|useAudioPlayer|useReleasingSharedObject|AudioPlayer|Proxy|noteCreated)$/u.test(name)) continue;
    names.push(name);
    if (names.length === 2) break;
  }
  return names.length > 0 ? names.join('<') : 'unknown';
}

export function noteAudioPlayerCreated(state: AudioPlayersCensusState, owner: string): number {
  state.created += 1;
  state.liveByOwner.set(owner, (state.liveByOwner.get(owner) ?? 0) + 1);
  const live = state.created - state.released;
  if (live > state.peakLive) state.peakLive = live;
  return live;
}

export function noteAudioPlayerReleased(state: AudioPlayersCensusState, owner: string): number {
  state.released += 1;
  const left = (state.liveByOwner.get(owner) ?? 0) - 1;
  if (left > 0) state.liveByOwner.set(owner, left);
  else state.liveByOwner.delete(owner);
  return state.created - state.released;
}

export function audioPlayersSummary(state: AudioPlayersCensusState): string {
  const byOwner = Object.fromEntries([...state.liveByOwner.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12));
  return JSON.stringify({ live: state.created - state.released, created: state.created, released: state.released, peakLive: state.peakLive, byOwner });
}

/** Ставит перепись. Возвращает причину отказа или null при успехе; ничего не бросает. */
export function installAudioPlayersCensus(audioModule: AudioModuleLike, log: (line: string) => void = console.log): string | null {
  const Original = audioModule?.AudioPlayer;
  if (typeof Original !== 'function') return 'audio_player_class_missing';
  const originalRelease = Original.prototype?.release;
  if (typeof originalRelease !== 'function') return 'release_missing';
  const state = createAudioPlayersCensusState();
  const ownerOf = new WeakMap<object, string>();
  const releasedPlayers = new WeakSet<object>();

  let probing = true;
  const proxy = new Proxy(Original, {
    construct(target, args) {
      const player = Reflect.construct(target, args) as object;
      if (probing) return player;
      try {
        const owner = audioPlayerOwnerFromStack(new Error('census').stack);
        ownerOf.set(player, owner);
        const live = noteAudioPlayerCreated(state, owner);
        log(`${LOG} create owner=${owner} live=${live}`);
      } catch (error) {
        log(`${LOG} create_note_failed reason=${error instanceof Error ? error.message : String(error)}`);
      }
      return player;
    },
  });
  try {
    audioModule.AudioPlayer = proxy;
  } catch (error) {
    return `assign_failed:${error instanceof Error ? error.message : String(error)}`;
  }
  if (audioModule.AudioPlayer !== proxy) return 'assign_ignored';
  // зачем: прокси над нативным классом JSI — непроверенная почва; если конструирование через него ведёт себя иначе,
  // откатываемся к исходному классу, чтобы перепись не сломала звук в dev. Пробный плеер без источника сразу освобождаем.
  try {
    const probe = new proxy(null, 500, false) as { release?: () => void };
    const sane = probe instanceof Original && typeof probe.release === 'function';
    probe.release?.();
    if (!sane) { audioModule.AudioPlayer = Original; return 'probe_not_instance'; }
  } catch (error) {
    audioModule.AudioPlayer = Original;
    return `probe_failed:${error instanceof Error ? error.message : String(error)}`;
  }
  probing = false;

  Original.prototype.release = function releaseWithCensus(this: object, ...args: unknown[]) {
    try {
      const owner = ownerOf.get(this);
      if (owner === undefined) {
        // создан до установки переписи — в счётчик не входил, только отмечаем
        log(`${LOG} release_untracked live=${state.created - state.released}`);
      } else if (!releasedPlayers.has(this)) {
        releasedPlayers.add(this);
        const live = noteAudioPlayerReleased(state, owner);
        log(`${LOG} release owner=${owner} live=${live}`);
      } else {
        log(`${LOG} release_again owner=${owner}`);
      }
    } catch (error) {
      log(`${LOG} release_note_failed reason=${error instanceof Error ? error.message : String(error)}`);
    }
    return originalRelease.apply(this, args);
  };

  setInterval(() => log(`${LOG} summary ${audioPlayersSummary(state)}`), SUMMARY_EVERY_MS);
  return null;
}

/* expo-router route shim: служебный модуль в app/ не должен считаться экраном */
export default function __AudioPlayersCensusRouteShim() { return null; }
