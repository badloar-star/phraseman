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
 *
 * зачем (владелец, 2026-08-26): «сделай чтобы все получили — и новый юзер, и
 * все старые кто после обновы откроет приложение тоже». Раньше флаг ставил
 * ТОЛЬКО CleanOnboarding, а он не монтируется у пользователя, который свой
 * онбординг прошёл давно (onboarding_done уже на диске) — такой человек после
 * апдейта никогда бы не получил подарок. raiseWelcomeGiftForExistingUserIfEligible
 * закрывает эту дыру: _layout.tsx зовёт её фоново для всех, кто НЕ идёт через
 * онбординг прямо сейчас, и она поднимает тот же ONBOARDING_WELCOME_PENDING_KEY —
 * дальше отрабатывает уже существующий путь (хост/арбитр/грант) без изменений.
 * Отдельный постоянный маркер (RETRO_OFFERED_KEY) нужен, чтобы после первого
 * показа и закрытия этот путь не поднимал флаг заново на каждом следующем
 * холодном старте — PENDING снимается сразу после показа, а OFFERED остаётся
 * навсегда как «этому устройству подарок уже предлагали».
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';
import { DebugLogger } from './debug-logger';

/** Флаг «онбординг закончен, шторку на главной ещё не показали». */
export const ONBOARDING_WELCOME_PENDING_KEY = 'onboarding_welcome_pending_v1';

/** Постоянный маркер «этому устройству retroactive-подарок уже предложен один раз». */
const RETRO_OFFERED_KEY = 'onboarding_welcome_retro_offered_v1';

/** Ставится в конце онбординга — ровно перед тем, как отдать управление приложению. */
export async function markOnboardingWelcomePending(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_WELCOME_PENDING_KEY, '1');
    // зачем: будит уже смонтированный OnboardingWelcomeHost, если его
    // одноразовый useEffect успел прочитать диск раньше этой записи (гонка
    // старта — см. комментарий у события в app/events.ts).
    emitAppEvent('onboarding_welcome_pending_raised');
  } catch (e) {
      // best-effort: не показать приветствие не страшно, ронять онбординг — страшно.
      DebugLogger.error('onboarding_welcome_state:markOnboardingWelcomePending', e instanceof Error ? e : new Error(String(e)), 'warning');
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
  } catch (e) {
      // best-effort
      DebugLogger.error('onboarding_welcome_state:clearOnboardingWelcomePending', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}

/**
 * Ретроактивно поднимает приветствие+подарок для пользователя, который свой
 * онбординг прошёл ДО того, как эта фича появилась (или в принципе давно).
 *
 * Безопасность вызова — намеренно избыточная, потому что зовётся из общего
 * bootstrap-пути `_layout.tsx` на КАЖДОМ старте и не должна мешать никому:
 *  - once-guard на постоянном ключе — обычным пользователям (уже предложено
 *    или ещё увидят обычный PENDING) это одно чтение AsyncStorage и выход;
 *  - маркер OFFERED пишется СРАЗУ, а не после показа — специально: цель не
 *    «показать гарантированно», а «предложить один раз и не пытаться снова»;
 *    если запись PENDING не удастся (диск/квота), это НЕ крутится в бесконечный
 *    ретрай на каждом следующем старте — тихая потеря показа безопаснее, чем
 *    риск зациклить проверку на миллионах холодных стартов;
 *  - никогда не бросает: любая ошибка проглатывается, вызывающий получает
 *    void и не должен ничего ждать или проверять.
 */
export async function raiseWelcomeGiftForExistingUserIfEligible(): Promise<void> {
  try {
    const alreadyOffered = await AsyncStorage.getItem(RETRO_OFFERED_KEY);
    if (alreadyOffered === '1') return;
    await AsyncStorage.setItem(RETRO_OFFERED_KEY, '1');
    await AsyncStorage.setItem(ONBOARDING_WELCOME_PENDING_KEY, '1');
    // зачем (аудит гонки, владелец 2026-08-26 — «модал появился, но ничего не
    // начислилось»): этот путь пишет флаг ПОЗДНО (после setReady внутри долгого
    // bootstrap), а OnboardingWelcomeHost читает его РАНО, один раз, на
    // монтировании — почти всегда раньше, чем сюда доходит выполнение. Без
    // события хост навсегда остаётся при выводе «показывать нечего», и ни
    // модалка, ни начисление никогда не срабатывают для retro-пути.
    emitAppEvent('onboarding_welcome_pending_raised');
  } catch (e) {
      // best-effort: пропущенный ретро-подарок не блокирует и не портит ничего.
      DebugLogger.error('onboarding_welcome_state:alreadyOffered', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
}
