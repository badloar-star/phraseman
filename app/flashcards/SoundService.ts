/**
 * cards-2.0: звуковой сервис раздела «Карточки» (§5 мастер-плана) — КАРКАС (E1).
 * Сразу на `expo-audio` (expo-av deprecated в SDK 54, удаляется в 55 — двойной
 * реализации пула не делаем).
 *
 * зачем 2026-08-30 (рантайм-аудит §R1): сервис больше НЕ трогает глобальную
 * аудио-сессию. Раньше он звал setAudioModeAsync({playsInSilentMode:true})
 * напрямую, мимо audio_session_coordinator, и навсегда перетирал канон
 * приложения (UI-звуки уважают mute-переключатель iPhone; mute пробивает
 * только РЕЧЬ через spoken-лизу). Из-за этого поведение silent-switch
 * зависело от порядка экранов, а кэш audioModeReady считал режим вечным,
 * хотя первая же озвучка урока его сбрасывала. Теперь: SFX карточек уважают
 * mute как весь UI; TTS пробивает mute лизой (инъецированный useAudio().speak
 * делает это сам, фолбэк ниже берёт claimSpokenAudio).
 *
 * Правила:
 * - очередь: SFX (≤400мс) → пауза 120мс → TTS, никогда одновременно;
 * - хаптика дублирует каждый звук; платформенный маппинг §5 (Android деградирует
 *   notification и Medium до impact Light, порог свайпа — selection; web — no-op);
 * - тумблеры: «Звуковые эффекты» — `fc_sfx_on` (дефолт true),
 *   «Автопроизношение» — `fc_autospeak_on` (дефолт true) — E9.
 *
 * Звуки — продакшн-семейство E9 («мягкая маримба», −16 LUFS, пики −6 dBFS),
 * производство: scripts/audio_pipeline.sh (ffmpeg-синтез + pitch-shift комбо).
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import {
  hapticError,
  hapticLightImpact,
  hapticMediumImpact,
  hapticSuccess,
  hapticTap,
} from '../../hooks/use-haptics';
import { FC_SFX_TTS_GAP_MS } from '../../constants/flashcards_motion';
import { claimSpokenAudio } from '../../modules/audio/audio_runtime_arbiter';
import { getSoundSettingsSnapshot } from '../../modules/audio/sound_settings';
import { DebugLogger } from '../debug-logger';

// ── SFX ────────────────────────────────────────────────────────────────────────

/** E9: полный набор событий таблицы §5. */
export type FcSfxName =
  | 'flip' // флип карточки — бумажный flick
  | 'tick' // смена карточки в слушании — тихий tick
  | 'correct' // верный ответ — 2 ноты вверх C5→E5
  | 'incorrect' // неверный ответ — мягкий thud вниз, без buzzer
  | 'swipe_know' // свайп «знаю» — восходящий whoosh+tick
  | 'swipe_learn' // свайп «учу» — нисходящий whoosh
  | 'combo_x3' // комбо ×3 — мотив correct, питч +2 полутона (пре-рендер)
  | 'combo_x5' // комбо ×5 — питч +4
  | 'combo_x10' // комбо ×10 — питч +6
  | 'star' // звезда/сундук — sparkle 400мс
  | 'chest_open' // reveal сундука/пака — арпеджио C5-E5-G5-C6
  | 'session_complete' // финал сессии — арпеджио 5 нот ≤900мс
  | 'riser'; // церемония открытия пака — свелл-чирп ≤1200мс

/** Маппинг событие → файл/громкость (§5). Семейство E9 — scripts/audio_pipeline.sh. */
const SFX_DEFS: Record<FcSfxName, { source: () => number; volume: number }> = {
  flip: { source: () => require('../../assets/sounds/fc/fc_flip.mp3'), volume: 0.3 },
  tick: { source: () => require('../../assets/sounds/fc/fc_tick.mp3'), volume: 0.2 },
  correct: { source: () => require('../../assets/sounds/fc/fc_correct.mp3'), volume: 0.55 },
  incorrect: { source: () => require('../../assets/sounds/fc/fc_incorrect.mp3'), volume: 0.4 },
  swipe_know: { source: () => require('../../assets/sounds/fc/fc_swipe_know.mp3'), volume: 0.3 },
  swipe_learn: { source: () => require('../../assets/sounds/fc/fc_swipe_learn.mp3'), volume: 0.3 },
  combo_x3: { source: () => require('../../assets/sounds/fc/fc_combo_x3.mp3'), volume: 0.6 },
  combo_x5: { source: () => require('../../assets/sounds/fc/fc_combo_x5.mp3'), volume: 0.6 },
  combo_x10: { source: () => require('../../assets/sounds/fc/fc_combo_x10.mp3'), volume: 0.6 },
  star: { source: () => require('../../assets/sounds/fc/fc_star.mp3'), volume: 0.5 },
  chest_open: { source: () => require('../../assets/sounds/fc/fc_chest_open.mp3'), volume: 0.6 },
  session_complete: { source: () => require('../../assets/sounds/fc/fc_session_complete.mp3'), volume: 0.7 },
  riser: { source: () => require('../../assets/sounds/fc/fc_riser.mp3'), volume: 0.6 },
};

/** Комбо-серия → SFX (§5: ×3/×5/×10); вне порогов — обычный correct. */
export function comboSfxForStreak(streak: number): FcSfxName {
  if (streak >= 10) return 'combo_x10';
  if (streak >= 5) return 'combo_x5';
  if (streak >= 3) return 'combo_x3';
  return 'correct';
}

const POOL_SIZE = 2; // два плеера на звук — быстрые повторные срабатывания без обрыва хвоста

type PoolEntry = { players: AudioPlayer[]; next: number };
const pool = new Map<FcSfxName, PoolEntry>();

function getPlayer(name: FcSfxName): AudioPlayer | null {
  try {
    let entry = pool.get(name);
    if (!entry) {
      entry = { players: [], next: 0 };
      pool.set(name, entry);
    }
    if (entry.players.length < POOL_SIZE) {
      const p = createAudioPlayer(SFX_DEFS[name].source());
      p.volume = SFX_DEFS[name].volume;
      entry.players.push(p);
      return p;
    }
    const p = entry.players[entry.next];
    entry.next = (entry.next + 1) % entry.players.length;
    return p;
  } catch {
    return null;
  }
}

// ── Тумблер SFX (`fc_sfx_on`, дефолт true) ────────────────────────────────────

const SFX_ON_KEY = 'fc_sfx_on';
let cachedSfxOn: boolean | null = null;

// Прогрев кэша при старте (паттерн use-haptics.ts) — playSfx остаётся синхронным.
AsyncStorage.getItem(SFX_ON_KEY)
  .then((v) => {
    if (cachedSfxOn == null) cachedSfxOn = v !== 'false';
  })
  .catch(() => {});

export function isFcSfxEnabled(): boolean {
  return cachedSfxOn !== false; // null (ещё не загружено) = дефолт true
}

export async function setFcSfxEnabled(on: boolean): Promise<void> {
  cachedSfxOn = on;
  try {
    await AsyncStorage.setItem(SFX_ON_KEY, on ? 'true' : 'false');
  } catch (e) {
      DebugLogger.error('SoundService:setFcSfxEnabled', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

// ── Тумблер «Автопроизношение» (`fc_autospeak_on`, дефолт true) — E9 ─────────

const AUTOSPEAK_ON_KEY = 'fc_autospeak_on';
let cachedAutoSpeakOn: boolean | null = null;

AsyncStorage.getItem(AUTOSPEAK_ON_KEY)
  .then((v) => {
    if (cachedAutoSpeakOn == null) cachedAutoSpeakOn = v !== 'false';
  })
  .catch(() => {});

export function isFcAutoSpeakEnabled(): boolean {
  return cachedAutoSpeakOn !== false; // null (ещё не загружено) = дефолт true
}

export async function setFcAutoSpeakEnabled(on: boolean): Promise<void> {
  cachedAutoSpeakOn = on;
  try {
    await AsyncStorage.setItem(AUTOSPEAK_ON_KEY, on ? 'true' : 'false');
  } catch (e) {
      DebugLogger.error('SoundService:setFcAutoSpeakEnabled', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

/** Воспроизвести короткий SFX из пула. Синхронный fire-and-forget, ошибки глотаем. */
export function playSfx(name: FcSfxName): void {
  // зачем 2026-08-30 (§R7): общий тумблер «Звуки» приложения обязан глушить и
  // карточки — раньше они слушали только свой fc_sfx_on и звенели при
  // выключенных звуках. Локальный тумблер остаётся дополнительным фильтром.
  if (!getSoundSettingsSnapshot().effectsEnabled) return;
  if (!isFcSfxEnabled()) return;
  try {
    const p = getPlayer(name);
    if (!p) return;
    // seekTo(0) перед play — плеер из пула мог остановиться в конце файла
    void Promise.resolve(p.seekTo(0))
      .catch(() => {})
      .then(() => {
        try {
          p.play();
        } catch (e) {
      DebugLogger.error('SoundService:p', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      });
  } catch (e) {
      DebugLogger.error('SoundService:p', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

// ── Очередь SFX → пауза → TTS ─────────────────────────────────────────────────

export type FcSpeakOpts = {
  /**
   * SFX перед речью; null — без звука (только TTS). Дефолт — null.
   * Раньше дефолтом был 'flip': по репорту владельца звук переворачивания
   * карточки убран целиком, поэтому «случайно» он больше не подмешивается —
   * нужный SFX экран передаёт явно.
   */
  sfx?: FcSfxName | null;
  /** BCP-47, напр. en-US */
  language?: string;
  rate?: number;
  onDone?: () => void;
};

type TtsSpeakFn = (text: string, rate?: number, opts?: { language?: string; onDone?: () => void }) => void;

/**
 * Инъекция реального TTS: экраны передают `useAudio().speak` (hooks/use-audio) —
 * там уже решены дедуп, stop-settle Android и rate из настроек юзера.
 * Фолбэк (если никто не задал) — прямой expo-speech.
 */
let ttsSpeakFn: TtsSpeakFn | null = null;
export function setFcTtsSpeaker(fn: TtsSpeakFn | null): void {
  ttsSpeakFn = fn;
}

function speakNow(text: string, opts?: FcSpeakOpts): void {
  const fn = ttsSpeakFn;
  if (fn) {
    // Инъецированный useAudio().speak сам берёт spoken-лизу (claimSpokenAudio)
    // → SPOKEN_AUDIO_MODE на время речи: mute-переключатель iOS пробивается
    // штатно, глобальную сессию здесь трогать не нужно.
    fn(text, opts?.rate, { language: opts?.language, onDone: opts?.onDone });
    return;
  }
  try {
    const Speech = require('expo-speech') as typeof import('expo-speech');
    Speech.stop();
    // зачем 2026-08-30 (§R1): фолбэк-речь тоже обязана идти под spoken-лизой —
    // иначе в беззвучном iOS она молчит (канон UI_SFX_AUDIO_MODE это
    // playsInSilentMode:false). null-клейм = голос выключен глобально или идёт
    // запись: молчим и честно зовём onDone, чтобы очередь экрана не зависла.
    const claim = claimSpokenAudio(() => {
      try { Speech.stop(); } catch (e) {
        DebugLogger.error('SoundService:Speech.stop', e instanceof Error ? e : new Error(String(e)), 'warning');
      }
    });
    if (!claim) {
      DebugLogger.info('SoundService:speakNow', 'skip: claimSpokenAudio=null (voice off или запись)');
      opts?.onDone?.();
      return;
    }
    const finish = (): void => {
      claim.release();
      opts?.onDone?.();
    };
    Speech.speak(text, {
      language: opts?.language ?? 'en-US',
      ...(opts?.rate != null ? { rate: opts.rate } : {}),
      volume: 1,
      pitch: 1,
      onDone: finish,
      onStopped: () => claim.release(),
      onError: (e) => {
        DebugLogger.error('SoundService:Speech.speak', e instanceof Error ? e : new Error(String(e)), 'warning');
        finish();
      },
    });
  } catch (e) {
      DebugLogger.error('SoundService:Speech', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

let pendingTtsTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Правило очереди §5: SFX → пауза 120мс → TTS. Никогда одновременно.
 * Повторный вызов отменяет ещё не начавшийся TTS предыдущего (играем новейшее).
 * При выключенных SFX — речь сразу, без искусственной паузы.
 */
export function speakAfterSfx(text: string, opts?: FcSpeakOpts): void {
  const normalized = text?.trim();
  if (!normalized) return;
  if (pendingTtsTimer) {
    clearTimeout(pendingTtsTimer);
    pendingTtsTimer = null;
  }
  const sfxName = opts?.sfx === undefined ? null : opts.sfx;
  const willPlaySfx = sfxName != null && isFcSfxEnabled();
  if (!willPlaySfx) {
    speakNow(normalized, opts);
    return;
  }
  playSfx(sfxName);
  pendingTtsTimer = setTimeout(() => {
    pendingTtsTimer = null;
    speakNow(normalized, opts);
  }, FC_SFX_TTS_GAP_MS);
}

/**
 * E9: автоозвучка после ответа. SFX события играет всегда (при включённых SFX),
 * а TTS добавляет только при включённом «Автопроизношении» (`fc_autospeak_on`).
 * Правило очереди SFX→120мс→TTS — внутри speakAfterSfx.
 */
export function autoSpeakAfterSfx(text: string, opts?: FcSpeakOpts): void {
  if (!isFcAutoSpeakEnabled()) {
    const sfxName = opts?.sfx === undefined ? null : opts.sfx;
    if (sfxName != null) playSfx(sfxName);
    return;
  }
  speakAfterSfx(text, opts);
}

/** Отменить отложенный TTS (выход с экрана и т.п.). Сам Speech.stop — на стороне экрана. */
export function cancelPendingFcTts(): void {
  if (pendingTtsTimer) {
    clearTimeout(pendingTtsTimer);
    pendingTtsTimer = null;
  }
}

// ── Хаптика (единая обёртка, платформенный маппинг §5) ────────────────────────

export type FcHapticKind =
  | 'flip' // на 90° флипа
  | 'swipe_know' // Success / Light
  | 'swipe_learn' // Light / Light — не наказываем
  | 'threshold' // пересечение порога свайпа — selection, 1 раз
  | 'correct' // Success / Light
  | 'wrong' // Error / Light — без buzzer
  | 'combo' // 2×Light шаг 100мс
  | 'star' // Medium / Light
  | 'finish' // 3×Light по 100мс
  | 'tap'; // selection на сегментах/табах

/**
 * §5: iOS — полный набор; Android — notification и Medium деградируют до impact Light,
 * порог свайпа — selection; web — no-op. Глобальный тумблер хаптики (haptics_tap)
 * уважается внутри хелперов use-haptics.
 */
export function fcHaptic(kind: FcHapticKind): void {
  if (Platform.OS === 'web') return;
  const isIOS = Platform.OS === 'ios';
  switch (kind) {
    case 'flip':
    case 'swipe_learn':
      void hapticLightImpact();
      return;
    case 'swipe_know':
    case 'correct':
      if (isIOS) void hapticSuccess();
      else void hapticLightImpact();
      return;
    case 'wrong':
      if (isIOS) void hapticError();
      else void hapticLightImpact();
      return;
    case 'threshold':
    case 'tap':
      void hapticTap();
      return;
    case 'star':
      if (isIOS) void hapticMediumImpact();
      else void hapticLightImpact();
      return;
    case 'combo':
      void hapticLightImpact();
      setTimeout(() => void hapticLightImpact(), 100);
      return;
    case 'finish':
      void hapticLightImpact();
      setTimeout(() => void hapticLightImpact(), 100);
      setTimeout(() => void hapticLightImpact(), 200);
      return;
  }
}

/** Только для юнит-тестов: сброс модульного состояния. */
export function __resetFcSoundServiceForTests(): void {
  cachedSfxOn = null;
  cachedAutoSpeakOn = null;
  ttsSpeakFn = null;
  audioModeReady = null;
  pool.clear();
  cancelPendingFcTts();
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
