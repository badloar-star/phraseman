export type TournamentFlowRouter = {
  dismissTo?: (target: any) => void;
  replace: (target: any) => void;
};

/** Pop stale lobby/round/table routes instead of replacing only the top one. */
export function closeTournamentFlow(router: TournamentFlowRouter): void {
  if (typeof router.dismissTo === 'function') {
    router.dismissTo('/tournaments');
    return;
  }
  router.replace('/tournaments');
}
