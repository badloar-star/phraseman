// зачем (§99 «ядро журнала», 2026-10-03): каталог подарков уровня удалён в 2.0 (D09), но подписанные квитанции
// старых спинов всё ещё читаются в level_spin_local_contract.ts — ему нужна только ФОРМА GiftDef.
// Вынесена сюда отдельно, без рантайм-кода, чтобы удалить level_gift_system.ts целиком.
import type { LevelSpinRewardCatalogEntry } from './level_spin_reward_catalog';

export type GiftRarity = 'common' | 'rare' | 'epic';

export type GiftId = string;

export interface GiftDef {
  id:      GiftId;
  rarity:  GiftRarity;
  icon:    string;
  titleRU: string;
  titleUK: string;
  titleEN?: string;
  /** Если пусто при lang es — показываем titleRU */
  titleES?: string;
  descRU:  string;
  descUK:  string;
  descEN?: string;
  descES?: string;
  weight:  number;
  /** Spin-only presentation tier. Legacy roll rarity remains unchanged. */
  spinTier?: LevelSpinRewardCatalogEntry['tier'];
  /** Choice reward: UI asks the user to pick one of these concrete rewards. */
  choices?: GiftDef[];
  /** Server-owned roll receipt. Persisted with pending inventory for replay. */
  levelGiftReservation?: {
    reservationId: string;
    lane: 'f2p' | 'premium';
    allowedPackId?: string;
  };
  /** Immutable authority for a reward produced by the server level-spin protocol. */
  spinRewardReceipt?: {
    requestId: string;
    lane: 'base' | 'premium';
    giftId: string;
  };
}
