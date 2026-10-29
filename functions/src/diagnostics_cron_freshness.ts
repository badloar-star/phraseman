/** Sunday 06–22 UTC schedule; allow two hours for execution/retry/heartbeat delivery. */
export function latestSpireZoneDueMs(nowMs: number): number {
  const deadline = new Date(nowMs - 2 * 60 * 60 * 1000);
  const sunday = new Date(deadline);
  sunday.setUTCHours(0, 0, 0, 0);
  sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay());
  const hour = deadline.getUTCDay() === 0 ? deadline.getUTCHours() : 22;
  if (hour < 6) sunday.setUTCDate(sunday.getUTCDate() - 7);
  sunday.setUTCHours(hour < 6 ? 22 : Math.min(hour, 22), 0, 0, 0);
  return sunday.getTime();
}

export function isSpireZoneWarningSilent(lastRunAtMs:number,nowMs:number):boolean {
 return lastRunAtMs>0 && lastRunAtMs<latestSpireZoneDueMs(nowMs);
}
