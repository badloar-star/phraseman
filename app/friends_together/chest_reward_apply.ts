/**
 * «Вместе» — применение наград сундука недели на устройстве.
 *
 * зачем (владелец, 2026-08-24): сундук получил две награды, которые сервер может
 * только ОБЪЯВИТЬ, но не начислить, — прямой опыт и полное восстановление шкалы
 * энергии. И то и другое живёт на устройстве (`xp_manager`, `energy_system`),
 * поэтому применяет их клиент, как и с наградами сундука лиги.
 *
 * Побочный плюс: применение локальное, значит мгновенное — модалка уже открыта,
 * а шкала энергии и счётчик опыта обновлены до того, как пользователь дочитает
 * строку награды. Никаких спиннеров и ожидания сети.
 *
 * Гонки и двойной тап: сундук идемпотентен по неделе — повторный клейм сервер
 * отклоняет (`already_claimed`), а здесь дополнительно стоит замок по weekKey,
 * чтобы двойной ответ не начислил опыт дважды.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import type { Lang } from '../../constants/i18n';
import { registerXP } from '../xp_manager';
import { resetEnergyToMax } from '../energy_system';
import { DebugLogger } from '../debug-logger';

export type ChestRewardApplyInput = Readonly<{
  /** ISO-неделя награды — ключ идемпотентности. */
  weekKey: string;
  /** Прямой опыт пачкой (0 — нечего начислять). */
  xpGranted: number;
  /** Полное восстановление шкалы энергии. */
  energyRefilled: boolean;
  userName: string;
  lang: Lang;
}>;

export type ChestRewardApplyResult = Readonly<{
  xpApplied: number;
  energyApplied: boolean;
}>;

const NOTHING: ChestRewardApplyResult = Object.freeze({ xpApplied: 0, energyApplied: false });

/**
 * Недели, для которых награда уже применена.
 *
 * зачем на диске, а не только в памяти (владелец, 2026-08-26 — аудит класса
 * «награду показали, но не начислили»): прежний замок жил в памяти запуска и
 * ставился ДО начисления. Из этого следовали две дыры, каждая теряла опыт
 * НАВСЕГДА, потому что повторный клейм сервер отклоняет как already_claimed:
 *   1) registerXP упал (сеть/ошибка) — замок уже стоял, второй попытки не было;
 *   2) приложение убили между ответом сервера и registerXP — при следующем
 *      заходе приходил alreadyClaimed, и клиент СОЗНАТЕЛЬНО пропускал выдачу.
 * Теперь маркер пишется на диск ТОЛЬКО после успешного начисления, поэтому
 * прерванная выдача честно повторяется, а успешная не дублируется.
 */
const APPLIED_WEEK_KEY_PREFIX = 'friends_chest_reward_applied_';
const appliedWeeks = new Set<string>();

function appliedWeekStorageKey(weekKey: string): string {
  return `${APPLIED_WEEK_KEY_PREFIX}${weekKey.replace(/[^\w.-]/g, '_').slice(0, 60)}`;
}

async function hasAppliedWeek(weekKey: string): Promise<boolean> {
  if (appliedWeeks.has(weekKey)) return true;
  const stored = await AsyncStorage.getItem(appliedWeekStorageKey(weekKey)).catch(() => null);
  if (stored === '1') {
    appliedWeeks.add(weekKey);
    return true;
  }
  return false;
}

async function markAppliedWeek(weekKey: string): Promise<void> {
  appliedWeeks.add(weekKey);
  await AsyncStorage.setItem(appliedWeekStorageKey(weekKey), '1').catch(() => {});
}

/** Только для тестов: сбросить память применённых недель. */
export function __resetChestRewardApplyMemory(): void {
  appliedWeeks.clear();
}

export async function applyChestRewardsLocally(
  input: ChestRewardApplyInput,
): Promise<ChestRewardApplyResult> {
  const weekKey = String(input.weekKey || '').trim();
  if (!weekKey || await hasAppliedWeek(weekKey)) return NOTHING;

  // guard-ok: это НЕ понижение баланса. Math.max(0, …) нормализует объявленную
  // сервером сумму (отрицательное/дробное/NaN → 0), а начисление идёт только
  // через registerXP, который прибавляет. Клиент здесь ничего не списывает.
  const xp = Number.isFinite(input.xpGranted) ? Math.max(0, Math.floor(input.xpGranted)) : 0;
  const wantsEnergy = input.energyRefilled === true;
  if (xp === 0 && !wantsEnergy) return NOTHING;

  // Замок в памяти ставим ДО await — иначе второй вызов проскочит проверку,
  // пока первый ждёт (двойной тап, поздний ответ callable). На диск маркер
  // уйдёт только после успеха: см. комментарий у APPLIED_WEEK_KEY_PREFIX.
  appliedWeeks.add(weekKey);

  let xpApplied = 0;
  let energyApplied = false;
  let xpFailed = false;
  let energyFailed = false;

  if (xp > 0) {
    try {
      // зачем 'bonus_chest': сундук — это и есть бонусный сундук в терминах
      // xp_manager; отдельный источник заводить незачем, а множители клуба/лиги
      // к подарочному опыту применяются ровно так же, как к обычному.
      const result = await registerXP(xp, 'bonus_chest', input.userName, input.lang);
      xpApplied = Math.max(0, Math.floor(result?.finalDelta ?? 0));
    } catch (error) {
      // Награда уже показана в модалке — молча падать нельзя, но и рушить
      // экран из-за опыта тоже: логируем и продолжаем с энергией.
      xpFailed = true;
      DebugLogger.error('chest_reward_apply:xp', error, 'critical');
    }
  }

  if (wantsEnergy) {
    try {
      await resetEnergyToMax();
      energyApplied = true;
      // Шкала в шапке перечитывает состояние по этому событию (EnergyContext).
      DeviceEventEmitter.emit('energy_reload');
    } catch (error) {
      energyFailed = true;
      DebugLogger.error('chest_reward_apply:energy', error, 'critical');
    }
  }

  // зачем: маркер «выдано» пишем на диск ТОЛЬКО когда выдача действительно
  // прошла. Упало — снимаем и замок в памяти, чтобы следующая попытка (новый
  // заход на экран) начислила награду, а не считала её уже выданной. Иначе
  // опыт терялся навсегда: повторный клейм сервер отклоняет как already_claimed.
  if (xpFailed || energyFailed) {
    appliedWeeks.delete(weekKey);
  } else {
    await markAppliedWeek(weekKey);
  }

  return Object.freeze({ xpApplied, energyApplied });
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
