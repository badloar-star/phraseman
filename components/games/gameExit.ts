/**
 * Выход из игры по кнопке «Готово»: если в игре была ошибка — сразу «Минута знаний», иначе обычный «назад».
 * Макет (elevate-games.js, g-minute): «Показывается после игры, только если была ошибка».
 * зачем замена, а не переход вперёд: «назад» из «Минуты» должен вести туда, откуда открыта игра (разминка или Главная),
 * а не обратно в законченную игру. Крестик посреди игры «Минуту» не открывает — человек сам ушёл.
 */
import type { Router } from 'expo-router';

import { markNextNavigationAsReplace, safeRouterBack } from '../../app/navigation_back';

const LOG = '[GAME-EXIT]';

export type GameExitInput = Readonly<{
  /** Сколько ошибок было за игру. */
  misses: number;
  /** Id задания, на котором ошиблись (для «Точного слова» и «Охоты» по нему находится правило); без него — правило дня. */
  itemId?: string | null;
}>;

export function exitGameWithMinute(router: Router, input: GameExitInput): void {
  const misses = Number.isFinite(input.misses) ? input.misses : 0;
  if (misses <= 0) {
    safeRouterBack(router, '/(tabs)/home' as never);
    return;
  }
  const item = typeof input.itemId === 'string' && input.itemId ? `?item=${encodeURIComponent(input.itemId)}` : '';
  console.log(`${LOG} minute ${JSON.stringify({ misses, item: input.itemId ?? null })}`); // guard-ok: одна строка на выход из игры
  try {
    markNextNavigationAsReplace();
    router.replace(`/game_minute${item}` as never);
  } catch (error) {
    // зачем: «Минута» — подсказка, а не обязательный шаг; если переход не удался, человек просто выходит из игры
    console.warn(`${LOG} minute:failed ${error instanceof Error ? error.message : String(error)}`);
    safeRouterBack(router, '/(tabs)/home' as never);
  }
}
