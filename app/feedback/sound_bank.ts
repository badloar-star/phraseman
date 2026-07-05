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
 *
 * Оставлены ТОЛЬКО реально используемые звуки (по решению пользователя):
 *  - correct — новый звук правильного ответа (universfield notification-018);
 *  - crack — 1-я молния (серия ×5), thunder — 2-я молния (серия ×10);
 *  - star_1/2/3 — три звезды на экране завершения урока.
 * Удалены: spark, fizzle, whoosh, pop, tick, medal, chord, вся лесенка
 * ladder_00..10, а также давно не игравшие tap/wrong/rumble/thunder_far.
 */
const SOURCES = {
  correct: require('../../assets/audio/correct_new.mp3'),
  crack: require('../../assets/audio/ui/crack.wav'),
  thunder: require('../../assets/audio/ui/thunder.wav'),
  star_1: require('../../assets/audio/ui/star_1.wav'),
  star_2: require('../../assets/audio/ui/star_2.wav'),
  star_3: require('../../assets/audio/ui/star_3.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

/**
 * Громкости по типам (0..1). Подобраны в духе §2: клики очень тихие, награды/
 * гроза — громче. Значение можно переопределить в play(name, {volume}).
 */
const DEFAULT_VOLUME: Record<SoundName, number> = {
  correct: 0.7,
  // «Первая молния» (вход в уровень на n===5) звучала слишком резко/сильно —
  // приглушаем, чтобы стингер был мягче.
  crack: 0.16,
  thunder: 0.5,
  star_1: 0.3,
  star_2: 0.3,
  star_3: 0.3,
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
