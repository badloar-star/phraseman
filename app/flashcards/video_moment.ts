/**
 * «Фраза → момент ролика» в наборах из видео (D131, PM-288).
 *
 * зачем (владелец 2026-09-30): в наборе из видео тап по фразе открывает ролик
 * сразу на секунде, где она звучит. Секунду проставляет админ транскриптом в
 * «Видео-студии», сервер кладёт её в карточку набора полем `videoStartSec`.
 * Без транскрипта поля нет — функция на этом наборе выключена: фразы не
 * выглядят нажимаемыми, ничего не ломается.
 *
 * Чистый модуль без React и сети: решение «можно ли прыгать к моменту»
 * живёт в одном месте и проверяется тестом напрямую.
 */
import { normalizeVideoPhraseStartSec } from '../../shared/video_phrases_contract';
import { isLearningSurfaceReady } from '../learning_language_surface_readiness';
import { LEARNING_LANGUAGE_TARGETS, type LearningLanguageTarget } from '../learning_language_surface_matrix';

const VIDEO_ID_RE = /^[0-9A-Za-z_-]{11}$/;

/**
 * Таймкод из сырой карточки документа набора — или undefined.
 * Мусор не бросает (карточка остаётся обычной), но пишет причину в лог.
 */
export function cardVideoStartSecFromRaw(value: unknown, cardId = '?'): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  try {
    return normalizeVideoPhraseStartSec(value);
  } catch (error) {
    // зачем лог: немой отказ = «на этой фразе нет кнопки», и причину не найти.
    console.warn(`[VIDEO-SEEK] карточка ${cardId}: videoStartSec отброшен (${String(value)}): ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

export type VideoMomentPack = Readonly<{
  videoId?: string;
  videoTitle?: string;
  packLanguage?: string;
}>;

export type VideoMomentCard = Readonly<{ id: string; videoStartSec?: number }>;

export type VideoMoment = Readonly<{ videoId: string; title: string; startSec: number; cardId: string }>;

function isLearningTarget(value: string): value is LearningLanguageTarget {
  return (LEARNING_LANGUAGE_TARGETS as readonly string[]).includes(value);
}

/**
 * Видеоповерхность открыта для языка набора (D129: единая таблица «язык × раздел»).
 * Язык не из таблицы → закрыто (fail-closed) с причиной в логе.
 */
export function isVideoMomentSurfaceReady(packLanguage: string | undefined): boolean {
  const lang = String(packLanguage ?? 'en').trim() || 'en';
  if (!isLearningTarget(lang)) {
    console.warn(`[VIDEO-SEEK] язык набора "${lang}" не из таблицы готовности — прыжок к моменту выключен`);
    return false;
  }
  return isLearningSurfaceReady(lang, 'videos');
}

/** Набор вообще умеет «к моменту»: есть ролик и видеораздел открыт для его языка. */
export function packSupportsVideoMoments(pack: VideoMomentPack | null | undefined): boolean {
  if (!pack) return false;
  const videoId = String(pack.videoId ?? '').trim();
  if (!VIDEO_ID_RE.test(videoId)) return false;
  return isVideoMomentSurfaceReady(pack.packLanguage);
}

/**
 * Момент для открытия плеера — или null (фраза без таймкода / набор не из видео).
 * Каждый null пишет причину: «нажал — ничего» без следа ищут кругами.
 */
export function resolveVideoMoment(pack: VideoMomentPack | null | undefined, card: VideoMomentCard): VideoMoment | null {
  if (!pack || !packSupportsVideoMoments(pack)) {
    console.warn(`[VIDEO-SEEK] карточка ${card.id}: набор без ролика или видеораздел закрыт (videoId="${String(pack?.videoId ?? '')}", язык=${String(pack?.packLanguage ?? '')})`);
    return null;
  }
  const startSec = card.videoStartSec;
  if (typeof startSec !== 'number' || !Number.isFinite(startSec) || startSec < 0) {
    console.warn(`[VIDEO-SEEK] карточка ${card.id}: нет таймкода (значение=${String(startSec)})`);
    return null;
  }
  return {
    videoId: String(pack.videoId).trim(),
    title: String(pack.videoTitle ?? '').trim(),
    startSec,
    cardId: card.id,
  };
}

/** Целая секунда для параметра `start` плеера YouTube (он принимает только целые). */
export function youtubeStartParam(startSec: number | undefined): number | null {
  if (typeof startSec !== 'number' || !Number.isFinite(startSec) || startSec <= 0) return null;
  return Math.floor(startSec);
}

/** «1:05» / «1:02:03» — подпись на кнопке момента. */
export function formatVideoMoment(startSec: number): string {
  const total = Math.max(0, Math.floor(startSec));
  const sec = total % 60;
  const min = Math.floor(total / 60) % 60;
  const hour = Math.floor(total / 3600);
  const ss = String(sec).padStart(2, '0');
  return hour > 0 ? `${hour}:${String(min).padStart(2, '0')}:${ss}` : `${min}:${ss}`;
}

/* expo-router route shim: keeps the pure module out of the route tree. */
export default function __RouteShim() { return null; }
