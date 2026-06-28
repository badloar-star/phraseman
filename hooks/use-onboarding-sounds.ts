// ════════════════════════════════════════════════════════════════════════════
// use-onboarding-sounds.ts — наградные звуки онбординга (3 пика конверсии).
//
// Зачем: онбординг был полностью «немой» — моменты-победы проходили без
// дофаминовой петли «сделал → награда», из-за чего продукт ощущался дешевле.
// Этот хук даёт три коротких звука награды для ключевых эмоциональных пиков:
//   • playDemoCorrect()    — правильный ответ в демо-упражнении;
//   • playPlanReady()      — кульминация «Твой план готов» (перед пейволом);
//   • playPurchaseSuccess()— успешная оплата / старт триала.
//
// Звуки: Mixkit (free for commercial use, без атрибуции). Громкость 0.1 —
// как в useCorrectSound, чтобы не пугать. Каждый звук стоит дёргать вместе
// с соответствующей хаптикой (hapticSuccess) для полноты петли.
//
// Уважение к настройке звука пользователя — на стороне вызова (как haptics):
// если в проекте есть глобальный флаг «звук выключен», оборачивать вызовы им.
// ════════════════════════════════════════════════════════════════════════════
import { useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect } from 'react';

const SND_DEMO_CORRECT = require('../assets/audio/ob_correct.mp3');
const SND_PLAN_READY = require('../assets/audio/ob_plan_ready.mp3');
const SND_PURCHASE_SUCCESS = require('../assets/audio/ob_purchase_success.mp3');

/** Громкость наградных звуков онбординга (тихо, не агрессивно). */
const ONBOARDING_SFX_VOLUME = 0.1;

export interface OnboardingSounds {
  playDemoCorrect: () => void;
  playPlanReady: () => void;
  playPurchaseSuccess: () => void;
}

/**
 * Три наградных звука для пиков онбординга. Каждый плеер пере-проигрывается
 * с начала (seekTo(0)) и тихо падает при любой ошибке аудио — звук
 * вспомогательный, он никогда не должен ронять флоу.
 */
export function useOnboardingSounds(): OnboardingSounds {
  const demoPlayer = useAudioPlayer(SND_DEMO_CORRECT);
  const planPlayer = useAudioPlayer(SND_PLAN_READY);
  const purchasePlayer = useAudioPlayer(SND_PURCHASE_SUCCESS);

  useEffect(() => {
    return () => {
      try { demoPlayer.remove(); } catch {}
      try { planPlayer.remove(); } catch {}
      try { purchasePlayer.remove(); } catch {}
    };
  }, [demoPlayer, planPlayer, purchasePlayer]);

  const play = useCallback((player: ReturnType<typeof useAudioPlayer>) => {
    try {
      player.volume = ONBOARDING_SFX_VOLUME;
      player.seekTo(0);
      player.play();
    } catch {
      /* аудио best-effort: молча игнорируем сбой */
    }
  }, []);

  const playDemoCorrect = useCallback(() => play(demoPlayer), [play, demoPlayer]);
  const playPlanReady = useCallback(() => play(planPlayer), [play, planPlayer]);
  const playPurchaseSuccess = useCallback(() => play(purchasePlayer), [play, purchasePlayer]);

  return { playDemoCorrect, playPlanReady, playPurchaseSuccess };
}
