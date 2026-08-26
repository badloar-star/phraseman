import type { ImageSourcePropType } from 'react-native';

/**
 * Ассет самого СПИНА — права крутнуть рулетку.
 *
 * зачем отдельным модулем, а не в level_spin_reward_assets (владелец,
 * 2026-08-26): спин НЕ приз каталога, а вход в розыгрыш. Реестр призов
 * типизирован по `LevelSpinRewardId` и охраняется тестом на полноту — чужой
 * ключ там сломал бы контракт. Здесь же живёт одна картинка, общая для всех
 * поверхностей, где спин упоминается: кнопка на Главной, награда сундука лиги,
 * раздел «Подарки» и итог матча Арены. Один источник — один узнаваемый образ.
 *
 * Арт-канон тот же, что у призов (docs/superpowers/specs/
 * 2026-08-21-level-spin-reward-icons-design.md): матовый музейный артефакт,
 * порцелановая светлая кромка + обсидиановая тёмная, без текста и цифр,
 * 512×512 RGBA WebP. Семейство собственное — шампань-металл #A68B60,
 * потому что спин не принадлежит ни одному семейству призов.
 */
export const SPIN_TICKET_ACCENT = '#A68B60';

/**
 * Файл появляется после генерации по промпту из
 * docs/SPIN_TICKET_ASSET_DALLE_PROMPT.md. До этого момента `require` бросил бы
 * ошибку сборки, поэтому источник резолвится лениво и мягко: пока файла нет,
 * поверхности показывают прежний запасной значок и ничего не ломается.
 */
let cachedSource: ImageSourcePropType | null | undefined;

export function spinTicketImageSource(): ImageSourcePropType | null {
  if (cachedSource !== undefined) return cachedSource;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    cachedSource = require('../assets/images/spin/spin_ticket.webp') as ImageSourcePropType;
  } catch {
    cachedSource = null;
  }
  return cachedSource;
}

/** Только для тестов: сбросить кэш резолва источника. */
export function __resetSpinTicketAssetCache(): void {
  cachedSource = undefined;
}
