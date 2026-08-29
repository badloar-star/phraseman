/**
 * peek_cache.ts — синхронный «последний известный остаток» купленных минут.
 *
 * зачем (владелец 2026-08-29): «счёт минут должен показываться сразу и
 * корректно, когда вошли в приложение, а то юзеры будут описываться». Экран
 * MAX ждал ответа callable `voiceMinuteWalletMine` и до него считал, что минут
 * нет: показывались пробниковые «3 мин», а через мгновение число прыгало на
 * настоящее. Для платящего это хуже нуля — он видит чужой остаток.
 *
 * Устроено по образцу `app/energy_peek_cache.ts`: отдельный модуль без React и
 * без тяжёлых зависимостей, чтобы холодный старт не тянул за собой провайдеры.
 * В памяти — последнее известное число; на диске — оно же, чтобы переживать
 * перезапуск приложения.
 *
 * Кэш — только для ПЕРВОГО КАДРА. Правда всегда за сервером: как только
 * callable ответит, значение перезаписывается. Поэтому кэш никогда не решает,
 * можно ли звонить, — он лишь избавляет от кадра с выдуманным числом.
 */
import { captureAccountGeneration, subscribeAccountGeneration } from '../../app/account_generation';

/** Секунды, как их видит экран: остаток БЕЗ вычета резерва идущего звонка. */
export type VoiceMinutePeekState = Readonly<{ seconds: number }>;

const STORAGE_KEY = '@phraseman/voice-minutes/peek/v1';

let peekState: VoiceMinutePeekState | null = null;
/**
 * Чей остаток лежит в кэше: ключ на диске общий, а память JS о смене аккаунта
 * сама не узнает. Без владельца новый пользователь увидел бы чужие минуты.
 */
let peekOwnerStableId: string | null = null;

/** Последний известный остаток или `null`, если в этой сессии ещё не читали. */
export function peekVoiceMinutes(): VoiceMinutePeekState | null {
  return peekState;
}

/** Запомнить остаток после ответа сервера (в памяти сразу, на диск — фоном). */
export function writeVoiceMinutePeek(seconds: number): void {
  if (!Number.isFinite(seconds) || seconds < 0) return;
  const value = Math.floor(seconds);
  peekState = Object.freeze({ seconds: value });
  peekOwnerStableId = captureAccountGeneration().stableId?.trim() || null;
  void persist(value);
}

/** Сброс на смене аккаунта и в тестах: чужой остаток показывать нельзя. */
export function resetVoiceMinutePeek(): void {
  peekState = null;
  peekOwnerStableId = null;
}

async function persist(seconds: number): Promise<void> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ seconds }));
  } catch (e) {
      // Диск недоступен — кэш продолжает жить в памяти процесса.
      console.warn('[silent-catch] peek_cache:AsyncStorage', e instanceof Error ? e.message : String(e));
    }
}

// зачем (тот же разбор, что у энергии): сбрасываем ровно тогда, когда прежний
// владелец известен и он ДРУГОЙ. Безусловный сброс был бы багом: событие летит
// и на обычном старте, уже после первого кадра, — и выбросило бы ровно тот
// кадр, ради которого кэш затевался.
subscribeAccountGeneration((token) => {
  const nextOwner = token.stableId?.trim() || null;
  if (nextOwner !== null && nextOwner === peekOwnerStableId) return;
  if (peekOwnerStableId === null && peekState !== null && token.phase === 'active') {
    peekOwnerStableId = nextOwner;
    return;
  }
  resetVoiceMinutePeek();
});

/** Прогреть кэш с диска на старте — до первого рендера экрана MAX. */
export async function primeVoiceMinutePeekFromBoot(): Promise<void> {
  if (peekState) return; // свежее значение этой сессии важнее дискового
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw || peekState) return;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    const seconds = Number((parsed as { seconds?: unknown }).seconds);
    if (!Number.isFinite(seconds) || seconds < 0 || peekState) return;
    peekState = Object.freeze({ seconds: Math.floor(seconds) });
    peekOwnerStableId = captureAccountGeneration().stableId?.trim() || null;
  } catch (e) {
      // Битый JSON или нет доступа — оставляем кэш пустым: экран отработает как // раньше, а не покажет выдуманное число.
      console.warn('[silent-catch] peek_cache:seconds', e instanceof Error ? e.message : String(e));
    }
}

// Прогрев запускается сам при первом импорте: экран MAX может смонтироваться
// раньше любого загрузчика. Обещание намеренно не ожидается — чтение диска не
// должно задерживать импорт.
void primeVoiceMinutePeekFromBoot();
