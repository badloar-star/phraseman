// зачем: владелец попросил провести человека через первое сохранение карточки —
// пульсирующая кнопка на фразе, тост после нажатия, и анимация на главной, где
// карточки собираются в стопку и улетают в раздел. Всё это должно случиться
// ОДИН раз как обучение и не превратиться в вечный шум, поэтому состояние живёт
// здесь, а не размазано по трём экранам.
//
// Firebase-экономия: это чистое UI-состояние обучения (видел подсказку или нет),
// а не данные пользователя. Ни одного чтения и записи в Firestore — только
// локальный AsyncStorage. Синхронизировать между устройствами нечего: на новом
// устройстве человеку не вредно увидеть подсказку ещё раз.
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'saved_cards_first_run_v1';

/**
 * Сколько раз главная проигрывает полёт карточек в раздел.
 *
 * зачем именно 5: владелец выбрал «только первые несколько раз». Полная
 * анимация обучает метафоре «сохранённое копится вон там», а дальше становится
 * задержкой перед первым кадром. После лимита остаётся только тихий пульс плитки.
 */
export const SAVED_CARDS_FLIGHT_LIMIT = 5;

export interface SavedCardsFirstRunState {
  /** Человек уже сохранил хотя бы одну карточку — кнопке больше не нужно пульсировать. */
  readonly hasSavedEver: boolean;
  /** Сколько раз главная уже показывала полёт карточек. */
  readonly flightsPlayed: number;
  /**
   * Сохранений, которые главная ещё не «приняла» анимацией.
   * Обнуляется после проигрыша, поэтому повторный вход не крутит анимацию заново.
   */
  readonly pendingArrivals: number;
}

const EMPTY: SavedCardsFirstRunState = Object.freeze({
  hasSavedEver: false,
  flightsPlayed: 0,
  pendingArrivals: 0,
});

function parse(raw: string | null): SavedCardsFirstRunState {
  if (!raw) return EMPTY;
  try {
    const value = JSON.parse(raw) as Partial<SavedCardsFirstRunState>;
    // зачем: чужая или повреждённая запись не должна ронять экран — при любой
    // неожиданности откатываемся к «человек ещё ничего не сохранял».
    return Object.freeze({
      hasSavedEver: value.hasSavedEver === true,
      flightsPlayed:
        Number.isSafeInteger(value.flightsPlayed) && Number(value.flightsPlayed) >= 0
          ? Number(value.flightsPlayed)
          : 0,
      pendingArrivals:
        Number.isSafeInteger(value.pendingArrivals) && Number(value.pendingArrivals) >= 0
          ? Number(value.pendingArrivals)
          : 0,
    });
  } catch {
    return EMPTY;
  }
}

export async function readSavedCardsFirstRun(): Promise<SavedCardsFirstRunState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
  return parse(raw);
}

async function write(next: SavedCardsFirstRunState): Promise<void> {
  // Промах записи не должен ломать сохранение самой карточки — подсказка вторична.
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
}

/**
 * Человек сохранил карточку. Возвращает состояние ПОСЛЕ обновления, чтобы
 * вызывающий экран сразу знал, показывать ли тост первого сохранения.
 *
 * Optimistic UI: экран красит кнопку и показывает тост немедленно, не дожидаясь
 * этого промиса; запись догоняет фоном.
 */
export async function markCardSaved(): Promise<{
  readonly state: SavedCardsFirstRunState;
  readonly wasFirstEver: boolean;
}> {
  const current = await readSavedCardsFirstRun();
  const wasFirstEver = !current.hasSavedEver;
  const next: SavedCardsFirstRunState = {
    hasSavedEver: true,
    flightsPlayed: current.flightsPlayed,
    pendingArrivals: current.pendingArrivals + 1,
  };
  await write(next);
  return { state: next, wasFirstEver };
}

/** Кнопка сохранения пульсирует, пока человек не сохранил вообще ничего. */
export function shouldPulseSaveButton(state: SavedCardsFirstRunState): boolean {
  return !state.hasSavedEver;
}

/**
 * Что главная должна показать при входе.
 *
 * `flight` — полная анимация: карточки собираются в стопку и улетают в плитку.
 * `pulse` — плитка коротко раздувается и возвращается: сохранённое дошло, но
 * человек уже видел, как это работает.
 */
export function homeArrivalEffect(
  state: SavedCardsFirstRunState,
): 'none' | 'pulse' | 'flight' {
  if (state.pendingArrivals <= 0) return 'none';
  return state.flightsPlayed < SAVED_CARDS_FLIGHT_LIMIT ? 'flight' : 'pulse';
}

/**
 * Главная проиграла эффект. Вызывать ПОСЛЕ анимации, иначе повторный вход
 * покажет её заново.
 */
export async function markHomeArrivalPlayed(
  effect: 'pulse' | 'flight',
): Promise<SavedCardsFirstRunState> {
  const current = await readSavedCardsFirstRun();
  const next: SavedCardsFirstRunState = {
    hasSavedEver: current.hasSavedEver,
    flightsPlayed:
      effect === 'flight' ? current.flightsPlayed + 1 : current.flightsPlayed,
    pendingArrivals: 0,
  };
  await write(next);
  return next;
}

/** Только для дев-инструментов и тестов: вернуть человека в состояние новичка. */
export async function resetSavedCardsFirstRun(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}
