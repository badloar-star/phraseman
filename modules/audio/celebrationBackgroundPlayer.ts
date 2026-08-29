/**
 * celebrationBackgroundPlayer — тёплая фоновая подложка под весь прогон
 * празднования покупки (владелец 2026-08-25: «на фон надо мелодию какую-то»).
 *
 * зачем отдельный плеер, а не soundDirector: тот спроектирован под короткие
 * дискретные сигналы с cooldown/приоритетами (см. modules/audio/sound_director.ts) —
 * фон играет один раз на весь показ (~12 с), должен мягко стартовать и
 * погаснуть при закрытии модалки (в том числе если человек пропустил тапом
 * раньше конца), и не должен участвовать в конкуренции за приоритет с
 * точечными звуками сцен. Именно поэтому громкость (0.13) уже зашита в
 * SOUND_EVENTS['pm.celebration.background_bed'] как справочная точка, а
 * фактическое воспроизведение управляется здесь напрямую через expo-audio.
 *
 * Один файл на все тиры (Plus/Pro/VIP/MAX/промокод) — отдельная мелодия под
 * MAX была бы избыточна, у него уже есть акцентный cel_max_awaken.
 */
import { createAudioPlayer } from 'expo-audio';
import { SOUND_EVENTS } from './sound_events';
import { claimAmbientAudio, type AmbientAudioClaim } from './audio_runtime_arbiter';
import { getSoundSettingsSnapshot, subscribeSoundSettings } from './sound_settings';

type PlayerLike = {
  volume: number;
  play(): void;
  pause(): void;
  remove(): void;
};

const BED_SOURCE = require('../../assets/audio/sfx/v1/celebration/cel_background_bed_v1.m4a');
const TARGET_VOLUME = SOUND_EVENTS['pm.celebration.background_bed'].volume;
const FADE_STEP_MS = 60;
const FADE_IN_MS = 260;
const FADE_OUT_MS = 320;
const NATURAL_FINISH_BUFFER_MS = 400;

type Background = {
  player: PlayerLike;
  fadeTimer: ReturnType<typeof setInterval> | null;
  finishTimer: ReturnType<typeof setTimeout> | null;
  releaseSession: () => void;
};

let active: Background | null = null;
const finishing = new Set<Background>();
const stopping = new Set<Background>();
let ambientClaim: AmbientAudioClaim | null = null;
let sessionUsers = 0;
let sessionGeneration = 0;
let revokeScenePlayers: (() => void) | null = null;

function stopAllBackgrounds(): void {
  const current = active;
  active = null;
  if (current) disposeBackground(current);
  for (const background of [...finishing]) disposeBackground(background);
  for (const background of [...stopping]) disposeBackground(background);
}

function revokeCelebrationAudio(expectedGeneration?: number): void {
  if (expectedGeneration !== undefined && expectedGeneration !== sessionGeneration) return;
  const claim = ambientClaim;
  ambientClaim = null;
  sessionUsers = 0;
  sessionGeneration += 1;
  stopAllBackgrounds();
  revokeScenePlayers?.();
  claim?.release();
}

/** One ambient claim protects the whole celebration, including short scene overlap. */
export function acquireCelebrationAudioSession(): (() => void) | null {
  if (!getSoundSettingsSnapshot().effectsEnabled) return null;
  if (!ambientClaim) {
    const nextGeneration = sessionGeneration + 1;
    ambientClaim = claimAmbientAudio(() => revokeCelebrationAudio(nextGeneration));
    if (!ambientClaim) return null;
    sessionGeneration = nextGeneration;
  }
  const generation = sessionGeneration;
  sessionUsers += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    // A stopped player from an old claim may finish after a fresh celebration
    // has acquired audio. It must never decrement that newer claim's users.
    if (generation !== sessionGeneration) return;
    sessionUsers = Math.max(0, sessionUsers - 1);
    if (sessionUsers === 0) {
      ambientClaim?.release();
      ambientClaim = null;
    }
  };
}

export function registerCelebrationSceneRevoker(revoker: () => void): void {
  revokeScenePlayers = revoker;
}

function clearFade() {
  if (active?.fadeTimer) {
    clearInterval(active.fadeTimer);
    active.fadeTimer = null;
  }
}

function disposePlayer(player: PlayerLike): void {
  try { player.pause(); } catch (e) {
      // native player may already be released
      console.warn('[silent-catch] celebrationBackgroundPlayer:disposePlayer', e instanceof Error ? e.message : String(e));
    }
  try { player.remove(); } catch (e) {
      // native player may already be released
      console.warn('[silent-catch] celebrationBackgroundPlayer:disposePlayer', e instanceof Error ? e.message : String(e));
    }
}

function disposeBackground(background: Background): void {
  if (background.fadeTimer) clearInterval(background.fadeTimer);
  if (background.finishTimer) clearTimeout(background.finishTimer);
  finishing.delete(background);
  stopping.delete(background);
  background.releaseSession();
  disposePlayer(background.player);
}

/** Запустить фон с мягким нарастанием громкости. Повторный вызов — no-op. */
export function startCelebrationBackground(): void {
  if (active) return;
  // A prior normal close can still be fading naturally. A new celebration owns
  // the bed exclusively, so clean that bounded tail before starting another.
  for (const background of [...finishing]) disposeBackground(background);
  for (const background of [...stopping]) disposeBackground(background);
  const releaseSession = acquireCelebrationAudioSession();
  if (!releaseSession) return;
  let player: PlayerLike | null = null;
  try {
    player = createAudioPlayer(BED_SOURCE) as unknown as PlayerLike;
    player.volume = 0;
    player.play();
    active = { player, fadeTimer: null, finishTimer: null, releaseSession };
    const steps = Math.max(1, Math.round(FADE_IN_MS / FADE_STEP_MS));
    let i = 0;
    active.fadeTimer = setInterval(() => {
      i += 1;
      const current = active;
      if (!current) return;
      try {
        current.player.volume = Math.min(TARGET_VOLUME, (TARGET_VOLUME * i) / steps);
        if (i >= steps) clearFade();
      } catch {
        if (current.fadeTimer) clearInterval(current.fadeTimer);
        current.fadeTimer = null;
        if (active === current) active = null;
        disposeBackground(current);
      }
    }, FADE_STEP_MS);
  } catch {
    // зачем: фон декоративный — молчаливый сбой безопаснее, чем уронить
    // празднование из-за недоступного аудио-движка.
    if (player) disposePlayer(player);
    releaseSession();
    active = null;
  }
}

/** Остановить фон с коротким затуханием (короче входа — закон «выход быстрее входа»). */
export function stopCelebrationBackground(): void {
  if (!active) return;
  const current = active;
  active = null;
  if (current.fadeTimer) {
    clearInterval(current.fadeTimer);
    current.fadeTimer = null;
  }
  let startVolume: number;
  try {
    startVolume = current.player.volume;
  } catch {
    disposeBackground(current);
    return;
  }
  const steps = Math.max(1, Math.round(FADE_OUT_MS / FADE_STEP_MS));
  let i = 0;
  stopping.add(current);
  current.fadeTimer = setInterval(() => {
    i += 1;
    try {
      current.player.volume = Math.max(0, startVolume * (1 - i / steps));
      if (i >= steps) {
        disposeBackground(current);
      }
    } catch {
      disposeBackground(current);
    }
  }, FADE_STEP_MS);
}

/**
 * зачем (владелец 2026-08-25): «фоновую мелодию оставить доигрывать» — при
 * обычном закрытии модалки (человек досмотрел или нажал CTA) фон не должен
 * обрываться fade-out'ом стоп-функции. Файл сам короче показа (12 с) и уже
 * несёт собственный fade-out на последнюю секунду (см. промпт в
 * docs/design/CELEBRATION_SOUND_PROMPTS.md) — он естественно догорает сам.
 * Файл должен доиграть, но native AudioPlayer не освобождается сборщиком
 * JavaScript-объектов. Поэтому даём ему строго ограниченное время доиграть и
 * затем освобождаем вручную. Использовать ТОЛЬКО для штатного финала; для
 * скипа/ухода с экрана — stopCelebrationBackground().
 */
export function letCelebrationBackgroundFinish(): void {
  clearFade();
  const current = active;
  active = null;
  if (!current) return;
  finishing.add(current);
  current.finishTimer = setTimeout(() => disposeBackground(current), SOUND_EVENTS['pm.celebration.background_bed'].durationMs + NATURAL_FINISH_BUFFER_MS);
}

// Effects are live settings: decorative audio must cease promptly when disabled.
subscribeSoundSettings(() => {
  if (!getSoundSettingsSnapshot().effectsEnabled) revokeCelebrationAudio();
});

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
