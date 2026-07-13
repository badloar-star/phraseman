export const LEAGUE_CHAT_ENABLED = false as const;

export const LEAGUE_CHAT_ACHIEVEMENT_IDS = new Set<string>([
  'league_chat_first',
  'league_chat_10',
  'league_chat_50',
  'league_chat_100',
]);

export function isLeagueChatAchievementId(id: string): boolean {
  return LEAGUE_CHAT_ACHIEVEMENT_IDS.has(id);
}

export function isLeagueChatAchievementVisible(id: string, unlocked: boolean): boolean {
  return LEAGUE_CHAT_ENABLED || !isLeagueChatAchievementId(id) || unlocked;
}
