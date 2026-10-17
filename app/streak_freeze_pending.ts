/**
 * Отложенное решение заморозки Plus (D107), когда статус Plus в момент пропуска НЕИЗВЕСТЕН.
 *
 * зачем (координатор 15.10, аудит Optimistic UI, 🔴): при медленной проверке Plus (> 3 с), сбое записи или ещё не
 * поднятом аккаунте серия молча сбрасывалась в 1 — человек, который заплатил, терял серию. Теперь при неизвестном статусе
 * серию НЕ трогаем, а записываем «решение отложено». Каждое следующее засчитывание дня (updateStreakOnActivity) пробует
 * снова: Plus и заморозка есть → заморозка тратится (как обычно); Plus нет / лимит месяца исчерпан → серия считается
 * так, как если бы её сбросили в день пропуска (дни ПОСЛЕ пропуска сохраняются). Статус так и не выяснился за 7 дней —
 * решаем как потерю: бесконечно хранить серию без подтверждения нельзя. Журнал [STREAK-FREEZE].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { actionToastTri, emitAppEvent } from './events';
import type { AutoFreezeResult } from './streak_auto_freeze';

export const STREAK_FREEZE_PENDING_KEY = 'streak_plus_freeze_pending_v1';
/** Сколько дней ждём известного статуса Plus, прежде чем засчитать пропуск как потерю. */
export const STREAK_FREEZE_PENDING_MAX_DAYS = 7;
const LOG = '[STREAK-FREEZE]';

export type StreakFreezePending = Readonly<{
  /** Пропущенный день (lastActive + 1). */
  gapDay: string;
  /** Серия, которую сохранили на время ожидания. */
  keptStreak: number;
  /** День, когда решение отложили (ключ операции заморозки — тот же, что был бы без задержки). */
  createdDay: string;
  /** Почему отложили: причина неизвестного статуса. */
  reason: string;
}>;

/**
 * Plus есть, но месячный лимит заморозок исчерпан — серия сброшена. Тихий тост один раз на событие (ветка потери
 * срабатывает раз в день: после неё last_active_date = сегодня).
 * зачем (координатор 15.10, текст одобрен координатором, на подтверждение владельцу): платящий человек должен понять,
 * почему серия сгорела, хотя у него Plus. «Нет Plus» и истёкшее ожидание — без тоста, как раньше.
 */
export function emitPlusFreezeLimitToast(): void {
  console.log(`${LOG} limit_toast: лимит заморозок Plus исчерпан — показываем тихий тост`);
  emitAppEvent('action_toast', actionToastTri('info', {
    ru: 'Заморозки Plus на этот месяц закончились — серия началась заново',
    uk: 'Заморозки Plus на цей місяць закінчилися — серія почалася заново',
    en: "You've used all Plus streak freezes this month — your streak started over",
    es: 'Se acabaron las congelaciones de Plus de este mes: la racha empezó de nuevo',
    'pt-BR': 'As congelações do Plus deste mês acabaram — a sequência recomeçou',
    vi: 'Đã hết lượt đóng băng Plus của tháng này — chuỗi đã bắt đầu lại',
    id: 'Pembekuan Plus bulan ini sudah habis — rangkaian dimulai dari awal',
    tr: 'Bu ayın Plus dondurmaları bitti — seri yeniden başladı',
    pl: 'Zamrożenia Plus na ten miesiąc się skończyły — seria zaczęła się od nowa',
  }));
}

/** Причины, при которых статус Plus/заморозки НЕ известен — серию сбрасывать нельзя. */
export function isAutoFreezeUndecided(result: AutoFreezeResult | null): boolean {
  return result !== null && !result.applied
    && (result.reason === 'premium_check_timeout' || result.reason === 'premium_unknown'
      || result.reason === 'commit_failed' || result.reason === 'error');
}

function dayIndex(dayKey: string): number {
  const ms = Date.parse(`${dayKey}T00:00:00Z`);
  return Number.isFinite(ms) ? Math.floor(ms / 86_400_000) : NaN;
}

export async function readStreakFreezePending(): Promise<StreakFreezePending | null> {
  try {
    const raw = await AsyncStorage.getItem(STREAK_FREEZE_PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<StreakFreezePending>;
    if (typeof p.gapDay !== 'string' || typeof p.createdDay !== 'string' || !Number.isSafeInteger(p.keptStreak)) {
      console.warn(`${LOG} pending:corrupt raw=${raw.slice(0, 120)} — запись отброшена`);
      await AsyncStorage.removeItem(STREAK_FREEZE_PENDING_KEY);
      return null;
    }
    return { gapDay: p.gapDay, keptStreak: Number(p.keptStreak), createdDay: p.createdDay, reason: String(p.reason ?? 'unknown') };
  } catch (error) {
    console.warn(`${LOG} pending:read_failed`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

export async function writeStreakFreezePending(pending: StreakFreezePending): Promise<void> {
  await AsyncStorage.setItem(STREAK_FREEZE_PENDING_KEY, JSON.stringify(pending));
  console.warn(`${LOG} pending:written gapDay=${pending.gapDay} keptStreak=${pending.keptStreak} createdDay=${pending.createdDay} reason=${pending.reason} — серию НЕ сбрасываем, ждём статус Plus`);
}

export type PendingResolution = 'none' | 'saved' | 'lost' | 'still_unknown' | 'expired';

export type PendingResolveDeps = Readonly<{
  tryFreeze: (dayKey: string) => Promise<AutoFreezeResult>;
  readStreak: () => Promise<number>;
  writeStreak: (value: number) => Promise<void>;
  /** Заморозка всё-таки потрачена: звук/тост/отметка недели — как в обычной ветке. */
  onSaved: (pending: StreakFreezePending, streak: number) => Promise<void>;
  /** Пропуск засчитан как потеря: аналитика потери, как в обычной ветке LOST. */
  onLost: (pending: StreakFreezePending, reason: string, corrected: number) => Promise<void>;
}>;

/**
 * Пробует закрыть отложенное решение. Зовётся в начале каждого засчитывания дня — одно чтение AsyncStorage, если записи нет.
 * Потеря: серия = дни ПОСЛЕ пропуска (текущая − сохранённая) + 1 за день пропуска — ровно то, что дала бы ветка LOST тогда.
 */
export async function resolveStreakFreezePending(todayKey: string, deps: PendingResolveDeps): Promise<PendingResolution> {
  const pending = await readStreakFreezePending();
  if (!pending) return 'none';
  const ageDays = dayIndex(todayKey) - dayIndex(pending.createdDay);
  const result = await deps.tryFreeze(pending.createdDay);
  console.log(`${LOG} resolve:try gapDay=${pending.gapDay} keptStreak=${pending.keptStreak} ageDays=${ageDays} result=${result.applied ? 'applied' : result.reason}`);
  if (result.applied) {
    await AsyncStorage.removeItem(STREAK_FREEZE_PENDING_KEY);
    const streak = await deps.readStreak();
    console.log(`${LOG} resolve:saved — заморозка Plus потрачена задним числом, серия цела (${streak})`);
    await deps.onSaved(pending, streak);
    return 'saved';
  }
  const undecided = isAutoFreezeUndecided(result);
  if (undecided && !(ageDays >= STREAK_FREEZE_PENDING_MAX_DAYS)) {
    console.warn(`${LOG} resolve:still_unknown reason=${result.reason} ageDays=${ageDays} — ждём дальше (предел ${STREAK_FREEZE_PENDING_MAX_DAYS} дн.)`);
    return 'still_unknown';
  }
  const reason = undecided ? `expired_${result.reason}` : result.reason;
  const current = await deps.readStreak();
  const corrected = Math.max(1, current - pending.keptStreak + 1);
  await deps.writeStreak(corrected);
  await AsyncStorage.removeItem(STREAK_FREEZE_PENDING_KEY);
  console.warn(`${LOG} resolve:lost reason=${reason} current=${current} keptStreak=${pending.keptStreak} → ${corrected}`);
  await deps.onLost(pending, reason, corrected);
  return undecided ? 'expired' : 'lost';
}

/* expo-router: keep this utility from being treated as a screen */
export default function __StreakFreezePendingRouteShim() {
  return null;
}
