import AsyncStorage from '@react-native-async-storage/async-storage';

const FROM_WELCOME_KEY = 'from_welcome_first_lesson';

/** In-memory: после онбординга удерживаем тутор энергии, пока не убран CTA «первый урок» или не возврат с урока на главную. */
let deferEnergyOnboardingUntilFirstLessonCtaSettled = false;

export function setDeferEnergyOnboardingForPostOnboardingFirstLesson(v: boolean) {
  deferEnergyOnboardingUntilFirstLessonCtaSettled = v;
}

export function getDeferEnergyOnboardingForPostOnboardingFirstLesson() {
  return deferEnergyOnboardingUntilFirstLessonCtaSettled;
}

/** Пользователь нажал «Поехали» в листе после онбординга — ждём возврата на главную. */
export async function markWentToFirstLessonFromAfterOnboardingSheet() {
  await AsyncStorage.setItem(FROM_WELCOME_KEY, '1');
}

/**
 * С главной: если был переход в первый урок с приветственного листа — снимаем hold и сигналим, что можно показать тутор энергии.
 * @returns true, если сняли hold «ждём возврат с урока»
 */
export async function tryClearAfterOnboardingFirstLessonReturn(): Promise<boolean> {
  const v = await AsyncStorage.getItem(FROM_WELCOME_KEY);
  if (v === '1') {
    await AsyncStorage.removeItem(FROM_WELCOME_KEY);
    deferEnergyOnboardingUntilFirstLessonCtaSettled = false;
    return true;
  }
  return false;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
