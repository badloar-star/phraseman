// ═══════════════════════════════════════════════════════════
// spire_preview_context.tsx — шов для DEV-превью экранов Шпиля на моках.
//
// зачем (координатор 11.10): живую комнату снять нельзя, пока на сервере config.enabled=false. Маршрут /dev_spire_preview
// (только ENABLE_DEV_TOOLS и не стор-релиз) кладёт сюда готовую модель состояния, а SpireHomeScreen берёт её вместо
// конфига, локальной недели и хука игры. В боевом пути контекст всегда null — поведение экрана не меняется.
// Модель — только данные: ни сети, ни записей, ни реальных пользователей.
// ═══════════════════════════════════════════════════════════
import React, { createContext, useContext } from 'react';
import type { SpireConfigDoc } from '../../modules/spire/config_contract';
import type { SpireWeekLocal } from '../../modules/spire/report_queue';
import type { useSpireGame } from '../../app/spire/use_spire_game';

export type SpirePreviewGame = ReturnType<typeof useSpireGame>;

export type SpirePreviewModel = Readonly<{
  config: SpireConfigDoc;
  week: SpireWeekLocal | null;
  game: SpirePreviewGame;
  /** true — тур уже виден/закрыт; false — показать тур поверх экрана. */
  tourSeen: boolean;
  coinRank: number | null;
  /** Показать «Всех участников» сразу. */
  showAll?: boolean;
}>;

const SpirePreviewContext = createContext<SpirePreviewModel | null>(null);

export function SpirePreviewProvider({ model, children }: Readonly<{ model: SpirePreviewModel; children: React.ReactNode }>) {
  return <SpirePreviewContext.Provider value={model}>{children}</SpirePreviewContext.Provider>;
}

/** null — боевой путь. */
export function useSpirePreview(): SpirePreviewModel | null {
  return useContext(SpirePreviewContext);
}
