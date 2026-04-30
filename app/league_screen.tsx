import { Redirect } from 'expo-router';

/** Старый маршрут /league_screen → перенаправление на экран клуба. */
export default function LegacyLeagueScreenRedirect() {
  return <Redirect href="/club_screen" />;
}
