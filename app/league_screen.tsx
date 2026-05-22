import { DeferredRedirect } from '../components/DeferredRedirect';

/** Старый маршрут /league_screen → перенаправление на экран клуба. */
export default function LegacyLeagueScreenRedirect() {
  return <DeferredRedirect href="/club_screen" />;
}
