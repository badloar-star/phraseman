export type TournamentFlowRouter = {
  dismissTo?: (target: any) => void;
  replace: (target: any) => void;
};

/** Закрыть старый турнирный стек на безопасную релизную главную. */
export function closeTournamentFlow(router: TournamentFlowRouter): void {
  if (typeof router.dismissTo === 'function') {
    router.dismissTo('/(tabs)/home');
    return;
  }
  router.replace('/(tabs)/home');
}
