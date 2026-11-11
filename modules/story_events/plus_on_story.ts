// ═══════════════════════════════════════════════════════════════════════════
// plus_on_story.ts — поздравление «Plus подключён» кадром истории вместо праздничного окна на Главной.
//
// зачем (владелец 11.11: «никаких модальных окон совсем, всё отображается только в историях»): Главная по-прежнему находит
// «ожидающее поздравление» после покупки или выдачи Plus, но при включённых историях окно не открывает — факт пишется в «Истории».
// Правило Главной «не гасить ожидающее поздравление, пока человек его не увидел» (иначе оно пропадает навсегда) здесь
// соблюдается так: гасим ТОЛЬКО после того, как история записана в журнал — она уже не потеряется и ждёт человека у монеты.
// Не записалась — не гасим: поздравление остаётся ожидающим, следующая загрузка Главной попробует снова.
// Окно ничего не начисляло (подписка выдана раньше), поэтому вместе с показом ничего не теряется.
// Журнал: [PLUS-CELEBRATION].
// ═══════════════════════════════════════════════════════════════════════════
import { DebugLogger } from '../../app/debug-logger';
import { consumeCelebration } from '../../app/premium_celebration_state';
import { consumeVipCelebration } from '../../app/vip_celebration_state';
import { peekPremiumPlan } from '../../app/premium_plan_peek';
import { tierFromPlan, tierFromProductId, type SubscriptionTier } from '../../app/subscription_tier';
import { insteadStoryLanded, recordPlusOnStory, storiesReplaceWindows } from './story_instead_sources';

const LOG = '[PLUS-CELEBRATION]';

export type PlusCelebrationStoryInput = Readonly<{
  /** Отметка события покупки или выдачи; null — отметки нет, ключом служит день. */
  marker: string | null;
  dayKey: string;
}>;

/**
 * Уровень для кадра — тем же правилом, что во всём приложении (use_subscription_tier): продукт точнее плана; плана в памяти нет — Plus.
 * зачем (владелец 11.11: «Pro нету! есть Ультра и Плюс!»): кадр показывает уровень подписки, а не вариант окна (бывший «Pro», VIP).
 */
export function celebrationTier(): SubscriptionTier {
  const peek = peekPremiumPlan();
  if (!peek) return 'plus';
  return peek.productId ? tierFromProductId(peek.productId) : tierFromPlan(peek.plan);
}

/** true — поздравление забрала история, окно открывать не нужно; false — истории выключены, работает окно. */
export async function plusCelebrationAsStory({ marker, dayKey }: PlusCelebrationStoryInput): Promise<boolean> {
  if (!storiesReplaceWindows()) return false; // истории выключены — путь окна
  const tier = celebrationTier();
  const record = await recordPlusOnStory({ key: marker ?? `day:${dayKey}`, tier });
  if (!insteadStoryLanded(record)) {
    DebugLogger.warn(LOG, `история не записана (${record.recorded ? 'ok' : record.reason}) — поздравление остаётся ожидающим`);
    return true;
  }
  DebugLogger.info(LOG, `история вместо окна marker=${marker ?? '—'} уровень=${tier}`);
  await consumeCelebration(marker);
  return true;
}

/** То же для поздравления VIP (выдача командой): кадр уровня, ожидающее поздравление VIP гасится только после записи истории. */
export async function vipCelebrationAsStory({ marker, dayKey }: PlusCelebrationStoryInput): Promise<boolean> {
  if (!storiesReplaceWindows()) return false; // истории выключены — путь окна
  const tier = celebrationTier();
  const record = await recordPlusOnStory({ key: `vip:${marker ?? `day:${dayKey}`}`, tier });
  if (!insteadStoryLanded(record)) {
    DebugLogger.warn(LOG, `VIP: история не записана (${record.recorded ? 'ok' : record.reason}) — поздравление остаётся ожидающим`);
    return true;
  }
  DebugLogger.info(LOG, `VIP: история вместо окна marker=${marker ?? '—'} уровень=${tier}`);
  await consumeVipCelebration(marker);
  return true;
}
