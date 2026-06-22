// ════════════════════════════════════════════════════════════════════════════
// welcome_gate.ts — логика «показать приветствие ровно один раз».
//
// Приветствие (знакомство с приложением со спотлайт-подсветкой реальных блоков
// главной) должно:
//   • показаться РОВНО ОДИН РАЗ за всё время — и больше никогда, если человек
//     отказался ('Я сам разберусь') ИЛИ прошёл его до конца;
//   • пережить перезапуск приложения (флаг в AsyncStorage);
//   • не мигать и не показываться дважды при ремаунте главной (смена премиума,
//     cloud refresh) — это закрывает СИНХРОННАЯ защёлка уровня модуля, ровно как
//     в compass_briefing_host (_compassBriefingShownForDay);
//   • не наложиться на онбординг-ввод имени — ждём onboarding_done === '1'.
//
// Здесь только чистая логика решения (тестируемая) + тонкие AsyncStorage-обёртки.
// Сам показ/верстку держит WelcomeSlides, запуск — WelcomeHost.
// ════════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Флаг «приветствие уже показано/закрыто» — постоянный, переживает перезапуск. */
export const WELCOME_SEEN_KEY = 'onboarding_welcome_seen_v1';

/**
 * QA-флаг принудительного запуска из админ-лаборатории. Значение — ветка:
 * 'free' (новичок без плана) | 'plan' (с личным планом). Одноразовый: home.tsx
 * читает и СРАЗУ удаляет его, чтобы запуск не повторялся при следующих заходах.
 */
export const WELCOME_FORCE_KEY = 'onboarding_welcome_force_v1';

export type WelcomeBranch = 'free' | 'plan';

/**
 * СИНХРОННАЯ защёлка уровня модуля: переживает unmount/remount компонента
 * (в отличие от useRef, который пересоздаётся). Гарантирует один показ за
 * запуск процесса даже если AsyncStorage-чтение придёт уже после показа.
 */
let _welcomeShownThisProcess = false;

/** Только для тестов/QA-сброса: снять защёлку процесса. */
export function __resetWelcomeProcessLatch(): void {
  _welcomeShownThisProcess = false;
}

export function isWelcomeLatched(): boolean {
  return _welcomeShownThisProcess;
}

/** Поднять защёлку синхронно — вызывать ровно в момент решения «показываем». */
export function latchWelcomeShown(): void {
  _welcomeShownThisProcess = true;
}

export interface DecideWelcomeInput {
  /** Сырое значение WELCOME_SEEN_KEY из AsyncStorage (null = не показывали). */
  seenRaw: string | null;
  /** Завершён ли базовый онбординг (ввод имени). null = ещё не дочитали. */
  onboardingDone: boolean | null;
  /** Состояние синхронной защёлки процесса. */
  latched: boolean;
  /** Принудительная ветка из админки (одноразовый QA-флаг), если есть. */
  forced?: WelcomeBranch | null;
  /** Есть ли у пользователя премиум-доступ. */
  hasPremiumAccess: boolean;
  /** Есть ли активный личный план. */
  hasActivePlan: boolean;
}

export interface WelcomeDecision {
  show: boolean;
  branch: WelcomeBranch;
}

/**
 * Чистое решение: показывать ли приветствие и в какой ветке.
 *
 * Порядок гардов (важен для отсутствия повторов и лагов):
 *   1) латч процесса → уже показывали в этом запуске, ничего не делаем;
 *   2) принудительный QA-запуск из админки — показываем выбранную ветку
 *      (онбординг-гейт игнорируем: лаборатория доступна только в DEV);
 *   3) онбординг ещё не дочитан/не завершён → ждём;
 *   4) флаг seen уже стоит → больше НИКОГДА не показываем;
 *   5) иначе показываем; ветка = 'plan' если есть план, иначе 'free'.
 */
export function decideShouldShowWelcome(input: DecideWelcomeInput): WelcomeDecision {
  const branchByState: WelcomeBranch = input.hasActivePlan ? 'plan' : 'free';

  if (input.latched) {
    return { show: false, branch: branchByState };
  }

  if (input.forced === 'free' || input.forced === 'plan') {
    return { show: true, branch: input.forced };
  }

  if (input.onboardingDone !== true) {
    return { show: false, branch: branchByState };
  }

  if (input.seenRaw != null) {
    return { show: false, branch: branchByState };
  }

  return { show: true, branch: branchByState };
}

/** Прочитать флаг «уже показано». Ошибку хранилища трактуем как «не показано». */
export async function readWelcomeSeen(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(WELCOME_SEEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Покажется ли приветствие сейчас (для согласования с _layout: подарок 3 дня
 * показываем СТРОГО после компаса). Использует ту же чистую логику, что и WelcomeHost,
 * чтобы оба места приняли одинаковое решение. НЕ латчит и НЕ потребляет forced-флаг
 * (это делает сам WelcomeHost) — только читает состояние и предсказывает результат.
 */
export async function willShowWelcomeNow(
  _hasPremiumAccess: boolean,
  _hasActivePlan: boolean,
): Promise<boolean> {
  // РЕЛИЗ-ФИКС: компас-приветствие теперь показывается КАК ФИНАЛЬНЫЙ ШАГ онбординга
  // (components/onboarding.tsx), а НЕ отдельной модалкой поверх главной (WelcomeHost
  // выключен, WELCOME_ENABLED=false). Поэтому _layout НЕ должен ждать событие
  // welcome_closed для подарка 3 дня — к моменту onDone компас уже закрыт. Всегда false.
  return false;
}

/**
 * Зафиксировать «приветствие закрыто навсегда» — и при отказе, и при прохождении.
 * Защёлку поднимаем СИНХРОННО до await, чтобы параллельный ремаунт не показал
 * приветствие повторно, пока идёт асинхронная запись.
 */
export async function markWelcomeSeen(): Promise<void> {
  latchWelcomeShown();
  try {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, '1');
  } catch {
    /* запись best-effort: латч уже не даст повтор в этом запуске */
  }
}

/** Прочитать и СРАЗУ снять одноразовый QA-флаг принудительного запуска. */
export async function consumeForcedWelcomeBranch(): Promise<WelcomeBranch | null> {
  try {
    const raw = await AsyncStorage.getItem(WELCOME_FORCE_KEY);
    if (raw === 'free' || raw === 'plan') {
      await AsyncStorage.removeItem(WELCOME_FORCE_KEY).catch(() => {});
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

/** Из админки: запросить принудительный запуск ветки на главной. */
export async function requestForcedWelcome(branch: WelcomeBranch): Promise<void> {
  try {
    await AsyncStorage.setItem(WELCOME_FORCE_KEY, branch);
  } catch {
    /* no-op */
  }
}

/** QA-сброс: снова показать приветствие при следующем входе. */
export async function resetWelcomeSeen(): Promise<void> {
  __resetWelcomeProcessLatch();
  try {
    await AsyncStorage.multiRemove([WELCOME_SEEN_KEY, WELCOME_FORCE_KEY]);
  } catch {
    /* no-op */
  }
}
