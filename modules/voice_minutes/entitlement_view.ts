/**
 * entitlement_view.ts — ЕДИНСТВЕННЫЙ расчёт «сколько минут показать человеку».
 *
 * зачем (владелец 2026-09-02, скрин: Главная «20м», раздел уроков «0 минут»):
 * два экрана считали одно и то же число ДВУМЯ разными способами — бейдж Главной
 * по limits/access превью, кольцо уроков по кошельку купленных минут — и на
 * одном аккаунте расходились в разы. Правило владельца: «3 минуты для всех, кто
 * не купил минуты, и точное число, а не рандом». Чтобы цифра совпадала везде,
 * её считает ОДНА чистая функция, а экраны только подставляют входы.
 *
 * Правила (в порядке приоритета):
 *   1. купленные минуты есть (кошелёк ≥ 60с) → кошелёк, остаток БЕЗ вычета
 *      резерва идущего звонка (резерв возвращается — это не трата);
 *   2. сервер уже сказал, что пробник сожжён и минут нет ('none') → 0;
 *   3. пробник доступен ('trial') → кап пробника (сервер шлёт sessionCapSec,
 *      дефолт спеки 180с);
 *   4. про доступ ничего не известно → null: бейдж не рисуется, кольцо
 *      показывает «—». Выдуманная цифра хуже прочерка (тот же класс бага, что
 *      «3 мин → 0 мин красным» и «20м у того, кому положено 3»).
 *
 * 'admin' в доступе больше не приходит (владелец 2026-09-02: админ-пул убран,
 * админы как все), но старый сервер/кэш ещё может его прислать — тогда честнее
 * показать дневной остаток, чем пробниковые 3, которых у него нет.
 *
 * Ноль React/нативных импортов: считается синхронно на первом кадре.
 */

export type VoiceMinutesAccess = 'trial' | 'paid_minutes' | 'admin' | 'none';

/** Спека §3: кап пробного звонка, пока сервер не прислал свой. */
export const VOICE_TRIAL_CAP_SEC_DEFAULT = 180;
/** Кошелёк меньше минуты — звонок не поместится, платным доступ не считаем. */
export const VOICE_PAID_MIN_SEC = 60;

export type VoiceMinutesSource = 'paid' | 'trial' | 'trial_used' | 'day_pool' | 'unknown';

export interface VoiceMinutesView {
  /** Секунды к показу; null — показывать нечего (прочерк / без бейджа). */
  seconds: number | null;
  /** Какое правило решило — печатается в лог, чтобы цифра была объяснима. */
  source: VoiceMinutesSource;
}

export interface VoiceMinutesInputs {
  /** availableSeconds + reservedSeconds кошелька; null — кошелёк ещё не прочитан. */
  walletSec: number | null;
  /** Последний подтверждённый сервером доступ; null — сервер ещё не отвечал. */
  access: VoiceMinutesAccess | null;
  /** limits.sessionCapSec из превью/минта (число или объект по форматам). */
  sessionCapSec?: unknown;
  /** limits.dayRemainingSec — только для устаревшего 'admin'. */
  dayRemainingSec?: unknown;
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Кап пробника из limits: число, объект {trial: n} или дефолт спеки. */
export function trialCapSecFrom(sessionCapSec: unknown): number {
  const direct = finite(sessionCapSec);
  if (direct !== null && direct > 0) return Math.floor(direct);
  if (sessionCapSec !== null && typeof sessionCapSec === 'object') {
    const trial = finite((sessionCapSec as Record<string, unknown>).trial);
    if (trial !== null && trial > 0) return Math.floor(trial);
  }
  return VOICE_TRIAL_CAP_SEC_DEFAULT;
}

export function resolveVoiceMinutesView(inputs: VoiceMinutesInputs): VoiceMinutesView {
  const wallet = finite(inputs.walletSec);
  if (wallet !== null && wallet >= VOICE_PAID_MIN_SEC) {
    return { seconds: Math.floor(wallet), source: 'paid' };
  }
  if (inputs.access === 'paid_minutes') {
    // guard-ok: только ПОКАЗ. Модуль ничего не списывает и не пишет — баланс
    // живёт на сервере (voice_minute_wallets), здесь лишь floor для экрана.
    // Сервер считает доступ платным, а кошелёк ещё не дочитан (или уже пуст):
    // показываем то, что знаем, — ноль честнее пробниковых 3.
    return { seconds: Math.max(0, Math.floor(wallet ?? 0)), source: 'paid' };
  }
  if (inputs.access === 'none') return { seconds: 0, source: 'trial_used' };
  if (inputs.access === 'trial') {
    return { seconds: trialCapSecFrom(inputs.sessionCapSec), source: 'trial' };
  }
  if (inputs.access === 'admin') {
    const day = finite(inputs.dayRemainingSec);
    return day === null
      ? { seconds: null, source: 'unknown' }
      : { seconds: Math.max(0, Math.floor(day)), source: 'day_pool' };
  }
  return { seconds: null, source: 'unknown' };
}

/** Минуты для показа: floor, не меньше нуля; null пробрасывается как есть. */
export function voiceMinutesToDisplay(view: VoiceMinutesView): number | null {
  return view.seconds === null ? null : Math.max(0, Math.floor(view.seconds / 60));
}
