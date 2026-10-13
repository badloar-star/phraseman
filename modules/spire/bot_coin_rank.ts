/**
 * Ранг монеты бота-жителя комнаты Шпиля — формула, без сети.
 *
 * зачем (владелец 13.10: «аватары игроков = монеты рангов»): в roster ботов ранга монеты нет, а у старых комнат его не будет
 * никогда. Формула детерминирована (тот же бот той же комнаты — та же монета у всех игроков и после перезапуска), зависит от
 * комнаты (uid ботов одинаковы во всех комнатах: resident_<slot>) и чаще даёт низкие ранги — как у живых игроков недели.
 * Чистый модуль: ни React, ни Firebase, ни часов.
 */
export const SPIRE_BOT_COIN_RANK_MAX = 9;

export function spireBotCoinRank(uid: string, groupId = ''): number {
  const key = `${groupId}:${uid}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const u = (h % 10000) / 10000;
  return Math.min(SPIRE_BOT_COIN_RANK_MAX, Math.floor(u * u * (SPIRE_BOT_COIN_RANK_MAX + 1)));
}
