import { DEV_MODE } from './config';

export const LEAGUE_RACE_MIN_PARTICIPANTS = 10;

function isDevBuild(): boolean {
  return DEV_MODE || (typeof __DEV__ !== 'undefined' && __DEV__);
}

export function canPreviewLeagueRaceInDev(userName?: string | null): boolean {
  void userName;
  return isDevBuild();
}

export function shouldShowLeagueRace(participantCount: number, userName?: string | null): boolean {
  return participantCount >= LEAGUE_RACE_MIN_PARTICIPANTS || canPreviewLeagueRaceInDev(userName);
}
