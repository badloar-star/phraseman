import { DEV_CONTENT_UNLOCK } from './config';

export const LEAGUE_RACE_MIN_PARTICIPANTS = 10;

function isDevBuild(): boolean {
  // DEV_CONTENT_UNLOCK гасится в стор-сборке → в проде требование «≥10 участников» соблюдается.
  return DEV_CONTENT_UNLOCK;
}

export function canPreviewLeagueRaceInDev(userName?: string | null): boolean {
  void userName;
  return isDevBuild();
}

export function shouldShowLeagueRace(participantCount: number, userName?: string | null): boolean {
  return participantCount >= LEAGUE_RACE_MIN_PARTICIPANTS || canPreviewLeagueRaceInDev(userName);
}
