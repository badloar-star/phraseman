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
 * Недели, для которых награда уже применена в ЭТОМ запуске приложения.
 *
 * зачем именно в памяти, а не на диске: сервер — авторитет идемпотентности
 * (claim-doc по неделе), здесь замок нужен лишь от двойного применения в одной
 * сессии (быстрый повторный тап, поздний ответ callable). Переживать
 * перезапуск ему незачем, а лишняя запись на диск в горячем пути не нужна.
 */
const appliedWeeks = new Set<string>();

/** Только для тестов: сбросить память применённых недель. */
export function __resetChestRewardApplyMemory(): void {
  appliedWeeks.clear();
}

export async function applyChestRewardsLocally(
  input: ChestRewardApplyInput,
): Promise<ChestRewardApplyResult> {
  const weekKey = String(input.weekKey || '').trim();
  if (!weekKey || appliedWeeks.has(weekKey)) return NOTHING;

  // guard-ok: это НЕ понижение баланса. Math.max(0, …) нормализует объявленную
  // сервером сумму (отрицательное/дробное/NaN → 0), а начисление идёт только
  // через registerXP, который прибавляет. Клиент здесь ничего не списывает.
  const xp = Number.isFinite(input.xpGranted) ? Math.max(0, Math.floor(input.xpGranted)) : 0;
  const wantsEnergy = input.energyRefilled === true;
  if (xp === 0 && !wantsEnergy) return NOTHING;

  // Замок ставим ДО await: иначе второй вызов проскочит проверку, пока первый ждёт.
  appliedWeeks.add(weekKey);

  let xpApplied = 0;
  let energyApplied = false;

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
      DebugLogger.error('chest_reward_apply:energy', error, 'critical');
    }
  }

  return Object.freeze({ xpApplied, energyApplied });
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
