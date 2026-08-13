import type { ArenaExpansionCopyKey } from './expansion_copy';
import type { ArenaFeatureState } from './expansion_contract';

/**
 * Что показать вместо содержимого, когда содержимого нет.
 *
 * Владелец (D-65): каждый интерфейс Арены продуман до конца. До этого модуля
 * семь экранов расширения решали это каждый по-своему, и все семь совпадали в
 * одной ошибке: НЕУДАЧНАЯ ЗАГРУЗКА показывалась как «Сейчас недоступно». Это
 * разные вещи, и разница видна игроку по последствиям: выключенный раздел
 * значит «уходи, сегодня не будет», отказ сети значит «нажми ещё раз».
 * Прочитав первое вместо второго, игрок уходил там, где достаточно было
 * повторить.
 *
 * Здесь только выбор строк и действия — ни сети, ни React. Экран не считает
 * этого сам: в JSX такую развилку не проверить тестом, а ошибка в ней молчит.
 */

export type ArenaExpansionScreenState =
  | 'loading' | 'ready' | 'empty' | 'unavailable' | 'expired' | 'error';

/** Что делает единственная кнопка карточки. */
export type ArenaExpansionStateAction = 'retry' | 'back' | 'none';

export type ArenaExpansionStateCopy = Readonly<{
  /** Вид карточки: он же выбирает значок и цвет. */
  card: ArenaFeatureState;
  title: ArenaExpansionCopyKey;
  /** Объяснение причины. Есть всегда, кроме загрузки и готовности. */
  body?: ArenaExpansionCopyKey;
  action: ArenaExpansionStateAction;
  actionLabel?: ArenaExpansionCopyKey;
}>;

export type ArenaExpansionStateInput = Readonly<{
  state: ArenaExpansionScreenState;
  /** Экран записи: у него другой смысл истечения срока. */
  ghost?: boolean;
  /** Чем объяснить пустоту именно здесь. Без него пустота молчит. */
  emptyHint?: ArenaExpansionCopyKey;
}>;

export function arenaExpansionStateCopy(input: ArenaExpansionStateInput): ArenaExpansionStateCopy {
  switch (input.state) {
    case 'error':
      // Отказ — единственное состояние, где повтор имеет смысл: данные не
      // потеряны, потерялся ответ.
      return { card: 'error', title: 'loadFailed', body: 'loadFailedHint', action: 'retry', actionLabel: 'retry' };
    case 'unavailable':
      // Выключенный раздел повтором не чинится. Кнопка ведёт назад, чтобы
      // экран не был тупиком: без неё остаётся только системная «назад».
      return { card: 'unavailable', title: 'unavailable', body: 'unavailableHint', action: 'back', actionLabel: 'continueAction' };
    case 'expired':
      return input.ghost
        ? { card: 'expired', title: 'ghostExpired', body: 'ghostExpiredHint', action: 'back', actionLabel: 'continueAction' }
        : { card: 'expired', title: 'expired', body: 'todayNextDay', action: 'back', actionLabel: 'continueAction' };
    case 'empty':
      // Пустота без объяснения читается как поломка. Кнопки здесь нет: делать
      // нечего, и ложная кнопка была бы хуже её отсутствия.
      return { card: 'empty', title: 'empty', ...(input.emptyHint ? { body: input.emptyHint } : {}), action: 'none' };
    case 'loading':
      return { card: 'loading', title: 'loading', action: 'none' };
    default:
      return { card: 'ready', title: 'ready', action: 'none' };
  }
}

/** Состояния, при которых показывать содержимое нельзя. */
export function arenaExpansionShowsState(state: ArenaExpansionScreenState): boolean {
  return state !== 'ready';
}
