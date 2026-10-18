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
import { tryPlayV2ForFc } from '../../modules/sound_v2/legacy_bridge';
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
import { soundAudit } from '../../modules/audio/sound_audit';
import { DebugLogger } from '../debug-logger';
import { noteSwallowed, noteSwallowedHandler } from '../swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

// ── SFX ────────────────────────────────────────────────────────────────────────

/** E9: полный набор событий таблицы §5. */
export type FcSfxName =
  | 'flip' // флип карточки — бумажный flick
  | 'tick' // смена карточки в слушании — тихий tick
  | 'correct' // верный ответ — 2 ноты вверх C5→E5
  | 'incorrect' // неверный ответ — мягкий thud вниз, без buzzer
  | 'swipe_know' // свайп «знаю» — восходящий whoosh+tick
  | 'swipe_learn' // свайп «учу» — нисходящий whoosh
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
  star: { source: () => require('../../assets/sounds/fc/fc_star.mp3'), volume: 0.5 },
  chest_open: { source: () => require('../../assets/sounds/fc/fc_chest_open.mp3'), volume: 0.6 },
  session_complete: { source: () => require('../../assets/sounds/fc/fc_session_complete.mp3'), volume: 0.7 },
  riser: { source: () => require('../../assets/sounds/fc/fc_riser.mp3'), volume: 0.6 },
};

// зачем (владелец 04.10): комбо Блица убраны вместе с очками — звуков и вибрации комбо больше нет.

const POOL_SIZE = 2; // два плеера на звук — быстрые повторные срабатывания без обрыва хвоста

type PoolEntry = { players: AudioPlayer[]; next: number };
const pool = new Map<FcSfxName, PoolEntry>();
let poolGeneration = 0;

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

/** Освободить нативные players карточек при отключении SFX/сбросе feature. */
function releasePool(): void {
  poolGeneration += 1;
  for (const entry of pool.values()) {
    for (const player of entry.players) {
      try { player.pause(); } catch (swallowedError) { /* already stopped */ noteSwallowed('SoundService:catch_1', swallowedError); }
      try { player.release(); } catch (swallowedError) { /* already released */ noteSwallowed('SoundService:catch_2', swallowedError); }
    }
  }
  pool.clear();
}

// ── Тумблер SFX (`fc_sfx_on`, дефолт true) ────────────────────────────────────

const SFX_ON_KEY = 'fc_sfx_on';
let cachedSfxOn: boolean | null = null;

// Прогрев кэша при старте (паттерн use-haptics.ts) — playSfx остаётся синхронным.
AsyncStorage.getItem(SFX_ON_KEY)
  .then((v) => {
    if (cachedSfxOn == null) cachedSfxOn = v !== 'false';
  })
  .catch(noteSwallowedHandler('SoundService:promise_1'));

export function isFcSfxEnabled(): boolean {
  return cachedSfxOn !== false; // null (ещё не загружено) = дефолт true
}

export async function setFcSfxEnabled(on: boolean): Promise<void> {
  const previous = cachedSfxOn;
  cachedSfxOn = on;
  if (!on) releasePool();
  try {
    await AsyncStorage.setItem(SFX_ON_KEY, on ? 'true' : 'false');
  } catch (e) {
    DebugLogger.error('SoundService:setFcSfxEnabled', e instanceof Error ? e : new Error(String(e)), 'warning');
    // зачем (аудит Optimistic UI «Настроек», 12.10): раньше сбой глотался здесь, и откат переключателя в settings_edu был мёртвым кодом (.catch не срабатывал).
    // Возвращаем кэш (если новым тапом он не менялся) и пробрасываем ошибку — экран откатит тумблер и покажет сообщение.
    if (cachedSfxOn === on) cachedSfxOn = previous;
    throw e;
  }
}

// ── Тумблер «Автопроизношение» (`fc_autospeak_on`, дефолт true) — E9 ─────────

const AUTOSPEAK_ON_KEY = 'fc_autospeak_on';
let cachedAutoSpeakOn: boolean | null = null;

AsyncStorage.getItem(AUTOSPEAK_ON_KEY)
  .then((v) => {
    if (cachedAutoSpeakOn == null) cachedAutoSpeakOn = v !== 'false';
  })
  .catch(noteSwallowedHandler('SoundService:promise_2'));

export function isFcAutoSpeakEnabled(): boolean {
  return cachedAutoSpeakOn !== false; // null (ещё не загружено) = дефолт true
}

export async function setFcAutoSpeakEnabled(on: boolean): Promise<void> {
  const previous = cachedAutoSpeakOn;
  cachedAutoSpeakOn = on;
  try {
    await AsyncStorage.setItem(AUTOSPEAK_ON_KEY, on ? 'true' : 'false');
  } catch (e) {
    DebugLogger.error('SoundService:setFcAutoSpeakEnabled', e instanceof Error ? e : new Error(String(e)), 'warning');
    // зачем: то же, что у setFcSfxEnabled — сбой записи доходит до экрана (откат тумблера + сообщение)
    if (cachedAutoSpeakOn === on) cachedAutoSpeakOn = previous;
    throw e;
  }
}

/** Воспроизвести короткий SFX из пула. Синхронный fire-and-forget, ошибки глотаем. */
export function playSfx(name: FcSfxName): void {
  // зачем 2026-08-30 (§R7): общий тумблер «Звуки» приложения обязан глушить и
  // карточки — раньше они слушали только свой fc_sfx_on и звенели при
  // выключенных звуках. Локальный тумблер остаётся дополнительным фильтром.
  // зачем (координатор 18.10, «ни одного звука»): СПЕРВА ЛОГИ — каждый ранний выход называет причину ([SOUND-AUDIT] fc)
  if (!getSoundSettingsSnapshot().effectsEnabled) { soundAudit('fc', { sfx: name, played: false, reason: 'ui_sounds_off' }); return; }
  if (!isFcSfxEnabled()) { soundAudit('fc', { sfx: name, played: false, reason: 'fc_sfx_off' }); return; }
  // зачем (координатор 14.10, п.4): sound_v2 включён и у звука карточек есть пара в V2 — играет V2; выключен — прежний путь
  if (tryPlayV2ForFc(name)) { soundAudit('fc', { sfx: name, played: true, path: 'v2' }); return; }
  soundAudit('fc', { sfx: name, path: 'legacy', poolSize: pool.get(name)?.players.length ?? 0 });
  try {
    const p = getPlayer(name);
    if (!p) return;
    const generation = poolGeneration;
    // seekTo(0) перед play — плеер из пула мог остановиться в конце файла
    void Promise.resolve(p.seekTo(0))
      .catch(noteSwallowedHandler('SoundService:promise_3'))
      .then(() => {
        if (generation !== poolGeneration || !isFcSfxEnabled() || !getSoundSettingsSnapshot().effectsEnabled) { soundAudit('fc', { sfx: name, played: false, reason: 'cancelled_after_seek' }); return; }
        try {
          p.play();
          soundAudit('fc', { sfx: name, played: true, path: 'legacy', isLoaded: (p as { isLoaded?: boolean }).isLoaded ?? null, volume: p.volume });
        } catch (e) {
          soundAudit('fc', { sfx: name, played: false, reason: `play_threw:${e instanceof Error ? e.message : String(e)}` });
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
    }, 'flashcards:tts-fallback');
    if (!claim) {
      DebugLogger.info('SoundService:speakNow', 'skip: claimSpokenAudio=null (voice off или запись)');
      opts?.onDone?.();
      return;
    }
    const finish = (): void => {
      claim.release();
      opts?.onDone?.();
    };
    try {
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
      // зачем (аудит 2026-09-15): раньше этот бросок ловил ТОЛЬКО внешний catch,
      // который аренду не освобождал. Синтез речи, упавший до регистрации своих
      // колбэков, оставлял аренду висеть — голосовой канал числился занятым
      // мёртвым владельцем, и следующая озвучка молчала.
      console.warn('[AUDIO-LEASE] flashcards:speak-threw', JSON.stringify({
        error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      })); // guard-ok: только отказ воспроизведения
      DebugLogger.error('SoundService:Speech.speak', e instanceof Error ? e : new Error(String(e)), 'warning');
      finish();
    }
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
  releasePool();
  cancelPendingFcTts();
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
