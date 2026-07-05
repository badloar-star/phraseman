/**
 * sound_bank — императивный банк UI-звуков FeedbackKit (спек §2 sound_bank, §3).
 *
 * Работает поверх expo-audio (~1.1) через createAudioPlayer ВНЕ React (событийный
 * фасад fk дёргает его синхронно, без ре-рендеров). Плееры создаются ЛЕНИВО и
 * ОДИН раз на имя (не в цикле ответа — Perf Bible §6); повторный play не грузит
 * файл заново, только seekTo(0)+play.
 *
 * ВАЖНО (спек §10.1): здесь НЕ трогаем глобальный аудио-режим — никаких
 * setAudioModeAsync / playsInSilentModeIOS. Приложение уже держит свой
 * LOUD_PLAYBACK_AUDIO_MODE (app/audio_playback_mode.ts) — банк его не меняет.
 * Глушение UI-звуков — исключительно через тумблер uiSounds (проверяется в fk,
 * НЕ здесь: банк — «тупой» проигрыватель).
 *
 * Имена файлов — как в §3, но расширение .wav (временные плейсхолдеры генератора
 * scripts/gen_ui_sounds.cjs; студийный пак заменит файлы дроп-ином без правок кода).
 */
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

/**
 * Статический манифест: имя → require (метро-бандлер требует литеральные пути).
 * ladder_00..ladder_10 — 11 нот пентатоники.
 */
const SOURCES = {
  tap: require('../../assets/audio/ui/tap.wav'),
  pop: require('../../assets/audio/ui/pop.wav'),
  correct: require('../../assets/audio/ui/correct.wav'),
  wrong: require('../../assets/audio/ui/wrong.wav'),
  spark: require('../../assets/audio/ui/spark.wav'),
  crack: require('../../assets/audio/ui/crack.wav'),
  rumble: require('../../assets/audio/ui/rumble.wav'),
  thunder: require('../../assets/audio/ui/thunder.wav'),
  thunder_far: require('../../assets/audio/ui/thunder_far.wav'),
  fizzle: require('../../assets/audio/ui/fizzle.wav'),
  whoosh: require('../../assets/audio/ui/whoosh.wav'),
  star_1: require('../../assets/audio/ui/star_1.wav'),
  star_2: require('../../assets/audio/ui/star_2.wav'),
  star_3: require('../../assets/audio/ui/star_3.wav'),
  medal: require('../../assets/audio/ui/medal.wav'),
  chord: require('../../assets/audio/ui/chord.wav'),
  tick: require('../../assets/audio/ui/tick.wav'),
  ladder_00: require('../../assets/audio/ui/ladder_00.wav'),
  ladder_01: require('../../assets/audio/ui/ladder_01.wav'),
  ladder_02: require('../../assets/audio/ui/ladder_02.wav'),
  ladder_03: require('../../assets/audio/ui/ladder_03.wav'),
  ladder_04: require('../../assets/audio/ui/ladder_04.wav'),
  ladder_05: require('../../assets/audio/ui/ladder_05.wav'),
  ladder_06: require('../../assets/audio/ui/ladder_06.wav'),
  ladder_07: require('../../assets/audio/ui/ladder_07.wav'),
  ladder_08: require('../../assets/audio/ui/ladder_08.wav'),
  ladder_09: require('../../assets/audio/ui/ladder_09.wav'),
  ladder_10: require('../../assets/audio/ui/ladder_10.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

/**
 * Громкости по типам (0..1). Подобраны в духе §2: клики очень тихие, награды/
 * гроза — громче. Значение можно переопределить в play(name, {volume}).
 */
const DEFAULT_VOLUME: Record<SoundName, number> = {
  tap: 0.06,
  pop: 0.12,
  correct: 0.25,
  wrong: 0.2,
  spark: 0.3,
  crack: 0.3,
  rumble: 0.4,
  thunder: 0.5,
  thunder_far: 0.28,
  fizzle: 0.22,
  whoosh: 0.2,
  star_1: 0.3,
  star_2: 0.3,
  star_3: 0.3,
  medal: 0.32,
  chord: 0.35,
  tick: 0.05,
  ladder_00: 0.25,
  ladder_01: 0.25,
  ladder_02: 0.25,
  ladder_03: 0.25,
  ladder_04: 0.25,
  ladder_05: 0.25,
  ladder_06: 0.25,
  ladder_07: 0.25,
  ladder_08: 0.25,
  ladder_09: 0.25,
  ladder_10: 0.25,
};

/** Ленивое хранилище созданных плееров (по одному на имя). */
const players: Partial<Record<SoundName, AudioPlayer>> = {};

/** Создаёт (или возвращает уже созданный) плеер для имени. */
function ensure(name: SoundName): AudioPlayer | null {
  const existing = players[name];
  if (existing) return existing;
  try {
    const player = createAudioPlayer(SOURCES[name]);
    players[name] = player;
    return player;
  } catch {
    return null;
  }
}

export interface PlayOptions {
  /** Переопределить громкость типа (0..1). */
  volume?: number;
}

/**
 * Проиграть звук: seekTo(0) + play. Полифонии как таковой expo-audio на одном
 * плеере не даёт (перезапуск сэмпла с начала) — для UI-кликов этого достаточно и
 * это дёшево. Всё в try/catch: звук — «мягкая» фича, ошибка не должна ломать поток.
 */
export function play(name: SoundName, opts: PlayOptions = {}): void {
  const player = ensure(name);
  if (!player) return;
  try {
    const vol = opts.volume ?? DEFAULT_VOLUME[name];
    player.volume = Math.max(0, Math.min(1, vol));
    player.seekTo(0);
    player.play();
  } catch {}
}

/**
 * Предзагрузка пула (спек §6): создаёт плееры заранее, чтобы в момент ответа/
 * финала не было создания в цикле. Вызывать лениво при входе в сессию экрана.
 * Идемпотентна (ensure возвращает уже созданный плеер).
 */
export function preload(names?: readonly SoundName[]): void {
  const list = names ?? (Object.keys(SOURCES) as SoundName[]);
  for (const name of list) ensure(name);
}

/**
 * Освободить все плееры (memory-warning). В v1 не обязательна, но полезна: после
 * unloadAll банк снова лениво создаст плееры при следующем play.
 */
export function unloadAll(): void {
  for (const name of Object.keys(players) as SoundName[]) {
    const p = players[name];
    if (p) {
      try { p.remove(); } catch {}
      delete players[name];
    }
  }
}

/** Ноты лесенки по индексу серии (0-based): min(idx, 10) → ladder_00..ladder_10. */
export function ladderName(index: number): SoundName {
  const clamped = Math.max(0, Math.min(10, Math.floor(index)));
  return `ladder_${String(clamped).padStart(2, '0')}` as SoundName;
}
