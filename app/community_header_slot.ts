import { createContext, useContext, type ReactNode } from 'react';

/**
 * зачем (владелец 04.10, packs-simple.html кадр 1): у вкладки «Сообщество» одна шапка —
 * текстовые вкладки «Шпиль · Друзья · Наборы» слева, а справа кнопки ВИДИМОГО раздела
 * (у «Наборов» — лупа и язык наборов). Состояние этих кнопок живёт в самом разделе,
 * поэтому раздел отдаёт их в шапку через этот слот, а не шапка лезет в раздел.
 */
export type CommunityHeaderSlot = Readonly<{
  /** Кнопки справа от вкладок. */
  right: ReactNode;
  /** Слой поверх всей строки вкладок (раскрытый поиск); null — нет слоя. */
  overlay: ReactNode;
}>;

type CommunityHeaderSlotSetter = (slot: CommunityHeaderSlot | null) => void;

const CommunityHeaderSlotContext = createContext<CommunityHeaderSlotSetter | null>(null);

export const CommunityHeaderSlotProvider = CommunityHeaderSlotContext.Provider;

/** null — раздел открыт не во вкладке «Сообщество» (отдельный экран со своей шапкой). */
export function useCommunityHeaderSlotSetter(): CommunityHeaderSlotSetter | null {
  return useContext(CommunityHeaderSlotContext);
}
