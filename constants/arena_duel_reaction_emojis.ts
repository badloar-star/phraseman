/** Белый список реакций в дуэли (один графемный кластер на элемент). */
export const ARENA_DUEL_REACTION_EMOJIS = [
  '👋', '🙂', '😊', '🙌', '👍', '👏', '💪', '🔥', '⚡', '✨',
  '🎯', '🧠', '💜', '🤝', '🎉', '🙏', '☺️', '😎', '🤓', '😉',
  '⭐', '🌟', '💯', '🏆', '🥳', '🫶', '🫡', '❤️', '💖', '👀',
] as const;

export type ArenaDuelReactionEmoji = (typeof ARENA_DUEL_REACTION_EMOJIS)[number];

const SET = new Set<string>(ARENA_DUEL_REACTION_EMOJIS);

export function isArenaDuelReactionEmoji(s: string): s is ArenaDuelReactionEmoji {
  return SET.has(s);
}

export function randomArenaDuelReactionEmoji(): ArenaDuelReactionEmoji {
  const i = Math.floor(Math.random() * ARENA_DUEL_REACTION_EMOJIS.length);
  return ARENA_DUEL_REACTION_EMOJIS[i]!;
}
