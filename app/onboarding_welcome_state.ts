/**
 * onboarding_welcome_state — «показать приветственную шторку на главной».
 *
 * зачем: владелец (2026-07-27) — «этот модал должен быть не на этом экране, а
 * когда открылся экран главной». Раньше шторка рисовалась ВНУТРИ онбординга и
 * держала onDone до своего закрытия: человек ещё смотрел на последний экран
 * анкеты, поверх которого выезжало «Спасибо». Теперь онбординг только ставит
 * одноразовый флаг и сразу отпускает управление, а поднимает шторку
 * OnboardingWelcomeHost — уже над главной, через OverlayArbiter.
 *
 * Хранилище — только AsyncStorage: ни одного чтения/записи в Firestore, событие
 * одноразовое и локальное для устройства.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Флаг «онбординг закончен, шторку на главной ещё не показали». */
export const ONBOARDING_WELCOME_PENDING_KEY = 'onboarding_welcome_pending_v1';

/** Ставится в конце онбординга — ровно перед тем, как отдать управление приложению. */
export async function markOnboardingWelcomePending(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_WELCOME_PENDING_KEY, '1');
  } catch {
    // best-effort: не показать приветствие не страшно, ронять онбординг — страшно.
  }
}

/** Читает флаг. Хост вызывает это один раз при монтировании. */
export async function isOnboardingWelcomePending(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_WELCOME_PENDING_KEY)) === '1';
  } catch {
    return false;
  }
}

/** Снимает флаг — шторку показали, второй раз не поднимаем. */
export async function clearOnboardingWelcomePending(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_WELCOME_PENDING_KEY);
  } catch {
    // best-effort
  }
}
