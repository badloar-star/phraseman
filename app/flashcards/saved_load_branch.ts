// saved_load_branch.ts — какую картину показывает раздел «Сохранённые» при пустом списке: скелетон, состояние (пусто / ошибка / «Сейчас недоступно») или список.
//
// зачем (cards-039, Сверка 46232ea76, координатор 18.10; D158): при cards=empty&fail=saved_load экран показывал скелетон больше 12 секунд, а «Сейчас недоступно» + «Попробовать снова» не было.
// Причина в порядке условий: «загрузка идёт» (skeleton) проверялась раньше «загрузка упала» — пока loading true, ошибка не могла выйти на экран. Теперь ОШИБКА ВАЖНЕЕ СКЕЛЕТОНА:
// при loadError и пустом списке ветка всегда `state` — SavedCollectionState сам показывает тихий скелетон на время автоповторов useLoadGate и «Сейчас недоступно» после их исчерпания.
// Модуль без импортов: решение и журнал [CARDS-LOAD] берут одно и то же значение.
export type SavedLoadBranch = 'skeleton' | 'state' | 'list';

export type SavedLoadBranchInput = Readonly<{
  /** Выбрана ли категория «Сохранённые». */
  savedCategory: boolean;
  /** Открыт ли набор по ссылке (?pack=) — тогда «Сохранённые» не рисуют своих состояний. */
  packDeeplink: boolean;
  /** Идёт загрузка (первая без кэша или повтор). */
  loading: boolean;
  /** Загрузка закончилась неудачей (или сработал потолок). */
  loadError: boolean;
  /** Ждут карточки набора (экран ещё не может считаться пустым). */
  packCardsPending: boolean;
  /** Сколько карточек в списке сейчас. */
  listCardsCount: number;
  /** NetInfo: устройство заведомо без сети (хук useSavedLoadOffline). Нужен только для причины в журнале; «Сейчас недоступно» сразу показывает SavedCollectionState. */
  deviceOffline?: boolean;
}>;

/** Ветка и причина — для решения на экране и для строки журнала. */
export function savedLoadBranch(input: SavedLoadBranchInput): { branch: SavedLoadBranch; reason: string } {
  if (!input.savedCategory) return { branch: 'list', reason: 'не категория «Сохранённые»' };
  if (input.packDeeplink) return { branch: 'list', reason: 'открыт набор по ссылке' };
  if (input.listCardsCount > 0) return { branch: 'list', reason: `карточек в списке: ${input.listCardsCount}` };
  // зачем (координатор 18.10 05:47): без сети человек не ждёт 12 с тихого скелетона — «Сейчас недоступно» сразу после первой неудачи, автоповтор идёт фоном
  if (input.loadError && input.deviceOffline) return { branch: 'state', reason: 'offline_first_fail' };
  if (input.loadError) return { branch: 'state', reason: input.loading ? 'ошибка загрузки (идёт повтор): ошибка важнее скелетона' : 'ошибка загрузки' };
  if (input.loading) return { branch: 'skeleton', reason: 'загрузка идёт, ошибки нет' };
  if (input.packCardsPending) return { branch: 'list', reason: 'ждут карточки набора' };
  return { branch: 'state', reason: 'загрузка закончилась, карточек нет (пусто)' };
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
