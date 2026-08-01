// ═══════════════════════════════════════════════════════════════════════════
// tournament_avatars.ts — аватары участников турнира.
//
// зачем: владелец 2026-07-26 — «аватарки строго только юзерские из приложения».
// Реальные игроки приходят со своим значением avatar (индекс или custom:...) —
// его рисует штатный AvatarView. Новые боты тоже несут серверный app-avatar;
// хэш по id остаётся только fallback для старых эмодзи-профилей.
// Детерминизм обязателен: у всех зрителей и игроков бот выглядит одинаково.
// ═══════════════════════════════════════════════════════════════════════════

import { AVATARS } from '../../constants/avatars';
import {
  CUSTOM_AVATARS,
  CUSTOM_AVATAR_GRADIENTS,
  isCustomAvatarValue,
  makeCustomAvatarValue,
} from '../../constants/custom_avatars';

/** FNV-1a: стабильный хэш строки → uint32. Без Math.random — воспроизводимо. */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

type TournamentPlayerLike = {
  id: string;
  isBot?: boolean;
  avatar?: string | null;
};

/**
 * Значение для AvatarView. Юзер — как есть (его настоящий аватар).
 * Бот с новым серверным app-avatar — как есть. Для старого эмодзи-профиля
 * остаётся детерминированный fallback из наборов приложения.
 */
export function tournamentAvatarValue(player: TournamentPlayerLike): string {
  const raw = player.avatar ?? '';
  const isAppValue = /^\d+$/.test(raw) || isCustomAvatarValue(raw);
  if (isAppValue) return raw;
  if (!player.isBot) return '1'; // юзер без аватара — базовый, не эмодзи

  const h = fnv1a(player.id);
  if (h % 3 === 0 && CUSTOM_AVATARS.length > 0) {
    const def = CUSTOM_AVATARS[(h >>> 3) % CUSTOM_AVATARS.length];
    const grad = CUSTOM_AVATAR_GRADIENTS[(h >>> 7) % CUSTOM_AVATAR_GRADIENTS.length];
    return makeCustomAvatarValue(def.id, grad.id, (h & 2) === 0 ? 'black' : 'white');
  }
  return String(1 + ((h >>> 2) % AVATARS.length));
}

/** Уровень бота для рамки/материала аватара — стабильный, правдоподобный (3..42). */
export function tournamentBotLevel(botId: string): number {
  return 3 + (fnv1a(botId) % 40);
}
