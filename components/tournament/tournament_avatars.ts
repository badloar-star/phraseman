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
export function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * зачем (владелец 2026-08-03): боты не выглядят выше 50 уровня. Числовой
 * аватар — это уровневый аватар, его номер читается как уровень. Сервер уже
 * генерит ≤50, но комнаты, созданные ДО деплоя functions, ещё несут 51–60 —
 * клиент детерминированно заворачивает их в 1..50 (у всех зрителей одинаково).
 */
export const TOURNAMENT_BOT_MAX_LEVEL = 50;

/**
 * зачем: единственное место с формулой обёртки уровня 1..50 — раньше она была
 * продублирована здесь и в tournament_bot_card.ts, что грозило рассинхроном
 * при будущей правке капа (аудит 2026-08-03).
 */
export function wrapBotLevel(index: number): number {
  return index <= TOURNAMENT_BOT_MAX_LEVEL
    ? index
    : 1 + ((index - 1) % TOURNAMENT_BOT_MAX_LEVEL);
}

function clampBotLevelAvatar(raw: string): string {
  const index = Number(raw);
  if (!Number.isInteger(index) || index < 1) return raw;
  return index <= TOURNAMENT_BOT_MAX_LEVEL ? raw : String(wrapBotLevel(index));
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
  // Бот с уровневым аватаром — под кап 50; настоящий юзер — как есть.
  if (isAppValue) return player.isBot ? clampBotLevelAvatar(raw) : raw;
  if (!player.isBot) return '1'; // юзер без аватара — базовый, не эмодзи

  const h = fnv1a(player.id);
  if (h % 3 === 0 && CUSTOM_AVATARS.length > 0) {
    const def = CUSTOM_AVATARS[(h >>> 3) % CUSTOM_AVATARS.length];
    const grad = CUSTOM_AVATAR_GRADIENTS[(h >>> 7) % CUSTOM_AVATAR_GRADIENTS.length];
    return makeCustomAvatarValue(def.id, grad.id, (h & 2) === 0 ? 'black' : 'white');
  }
  return String(1 + ((h >>> 2) % Math.min(AVATARS.length, TOURNAMENT_BOT_MAX_LEVEL)));
}

/** Numeric level avatar to use as the first-frame image fallback. */
export function tournamentAvatarLevel(avatar: string | null | undefined): number | undefined {
  if (!avatar || !/^\d+$/.test(avatar)) return undefined;
  const level = Number(avatar);
  return Number.isInteger(level) && level >= 1 && level <= AVATARS.length ? level : undefined;
}
