// ═══════════════════════════════════════════════════════════════════════════
// position_moments_contract.ts — договор между Ядром (когда показывать) и Дизайном (как показывать) для окон m05 Пика.
//
// зачем (координатор 15.10: «триггеры — логика у Ядра; 0 новых чтений, из данных, которые Пик уже грузит; Plus в LastChance — только общий пейвол D115»): три окна — «Позиция выросла» (подъём через линию топ-5),
// «Тебя обогнали» (тост) и «Последний шанс» (воскресенье) — рисуют готовые решения и ничего не вычисляют. Ядро реализует useSpirePositionMoments() (app/spire/use_spire_position_moments.ts), который по
// уже загруженным данным Пика (комната недели, локальная неделя, энергия) отдаёт ТРИ необязательных решения; Дизайн (SpirePositionMomentsHost) показывает их и один раз сообщает consume(kind, key).
//
// Правила для Ядра:
//   • key — стабильный ключ показа (например `${weekId}:${kind}:${что-то уникальное}`); consume(kind, key) вызывается в момент ПОКАЗА, хук обязан после этого не отдавать то же решение (показ 1 раз;
//     хранение пометки — на усмотрение Ядра, НЕ долг-очередь: непоказанное не копится, решение пересчитывается по текущим данным — «поздравляем фактом»).
//   • Ни одного нового чтения Firestore: только то, что Пик уже держит (peekSpireRoom, локальная неделя, useEnergy).
//   • Одновременно хост показывает одно окно: rise → overtake → lastChance; пока открыт итог ступени (m06/m07) позиция ждёт.
// ═══════════════════════════════════════════════════════════════════════════
import type { MomentRoomRow } from './MomentPromotion';

/** «Позиция выросла»: строки комнаты вокруг игрока, индексы «было → стало» (0-основанные), монеты ступени. */
export type SpirePositionRiseShow = Readonly<{
  key: string;
  rows: readonly MomentRoomRow[];
  fromIndex: number;
  toIndex: number;
  coinsGained: number;
}>;

/** «Тебя обогнали»: кто обогнал и на сколько монет недели. */
export type SpireOvertakeShow = Readonly<{
  key: string;
  rivalName: string;
  rivalCoinRank: number | null;
  gapCoins: number;
}>;

/** «Последний шанс»: конец недели, возврат энергии, сколько не хватает до топ-5 (undefined — границы нет). */
export type SpireLastChanceShow = Readonly<{
  key: string;
  weekEndsAtMs: number;
  energyReadyAtMs: number;
  gapCoins?: number;
}>;

export type SpirePositionMomentKind = 'rise' | 'overtake' | 'lastChance';

export type SpirePositionMoments = Readonly<{
  rise: SpirePositionRiseShow | null;
  overtake: SpireOvertakeShow | null;
  lastChance: SpireLastChanceShow | null;
  /** Окно показано: хук Ядра больше не отдаёт решение с этим key. */
  consume: (kind: SpirePositionMomentKind, key: string) => void;
}>;

export const NO_POSITION_MOMENTS: SpirePositionMoments = Object.freeze({
  rise: null,
  overtake: null,
  lastChance: null,
  consume: () => undefined,
});
