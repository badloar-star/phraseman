import { createPracticeRuneEarnings, PRACTICE_RUNE_FULL_AWARD } from './practice_rune_earnings';
import { settlePracticeRuneEarningsToServer } from './practice_rune_settlement';

/**
 * зачем (владелец 19.10 «монеты улетели в счётчик, а счётчик не изменился»): журнал [COINS-AWARD] показал, что награда
 * за занятие Learning V2 проводится (`applied`, 590000 подъединиц), но в КОШЕЛЁК КУРСА. Счётчики Главной и Уроков
 * с 23.08 показывают ОБЩИЙ кошелёк (`readUnifiedLevelSpinStars`), куда кошелёк курса не входит, — монеты были
 * невидимы и их нельзя было потратить. Зачисляем ту же сумму в общий кошелёк через его единственный путь
 * начисления за практику: локальная запись до сети + сервер, идемпотентно по ключу занятия (повтор вызова для
 * того же занятия не начислит второй раз). Активность `lesson` сервер уже принимает.
 */
export async function creditLearningV2SessionRunesToUnifiedWallet(input: Readonly<{
  targetLanguage: string;
  lessonOrdinal: number | string | null | undefined;
  sessionOrdinal: number | string | null | undefined;
  runes: number;
}>): Promise<void> {
  const runes = Math.floor(input.runes);
  // зачем (Ревизор к 40ecaaa65): пустой номер урока/занятия давал ключ с «x» — все такие занятия делили ОДИН ключ и
  // начислялись один раз на всех. Без обоих номеров не начисляем вовсе и пишем причину.
  const ordinalOk = (value: unknown) => (typeof value === 'number' && Number.isFinite(value)) || (typeof value === 'string' && value.trim() !== '');
  if (!ordinalOk(input.lessonOrdinal) || !ordinalOk(input.sessionOrdinal)) {
    console.warn('[COINS-AWARD] unified:skip', JSON.stringify({ reason: 'missing_ordinal', targetLanguage: input.targetLanguage, lessonOrdinal: input.lessonOrdinal ?? null, sessionOrdinal: input.sessionOrdinal ?? null, runes })); // guard-ok: ранний выход с причиной
    return;
  }
  const sessionKey = `lv2_${input.targetLanguage}_${String(input.lessonOrdinal)}_${String(input.sessionOrdinal)}`
    .replace(/[^A-Za-z0-9_-]/gu, '_');
  console.warn('[COINS-AWARD] unified:enter', JSON.stringify({ sessionKey, runes })); // guard-ok: трасса начисления
  if (!Number.isSafeInteger(runes) || runes <= 0) {
    console.warn('[COINS-AWARD] unified:skip_empty', JSON.stringify({ sessionKey, runes })); // guard-ok: ранний выход
    return;
  }
  // Копилка практики проверяет «не больше, чем оплачено элементов × 3»: даём ровно столько элементов, сколько
  // покрывает сумму занятия. Это служебные метки этой копилки, они не уходят в интерфейс.
  const itemCount = Math.ceil(runes / PRACTICE_RUNE_FULL_AWARD);
  const base = createPracticeRuneEarnings({ activity: 'lesson', sessionKey, firstCompletion: true });
  const earnings = Object.freeze({
    ...base,
    creditedItemIds: Object.freeze(Array.from({ length: itemCount }, (_, index) => `${sessionKey}:r${index + 1}`)),
    pendingRunes: runes,
  });
  const result = await settlePracticeRuneEarningsToServer(earnings, 1);
  console.warn('[COINS-AWARD] unified:result', JSON.stringify({ sessionKey, runes, ...result })); // guard-ok: итог начисления
}
