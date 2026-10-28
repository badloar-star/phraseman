import { planHiddenTabRedirect } from '../app/tabs_hidden_route_redirect';

describe('hidden tab route redirect readiness', () => {
  it('does not schedule a redirect before the root navigator has mounted', () => {
    expect(planHiddenTabRedirect({
      rootNavigationReady: false,
      routeIsHidden: true,
    })).toBeNull();
  });

  it('redirects a hidden tab to Home only after the root navigator is ready', () => {
    expect(planHiddenTabRedirect({
      rootNavigationReady: true,
      routeIsHidden: true,
    })).toBe('/(tabs)/home');
  });

  it('leaves visible routes alone', () => {
    expect(planHiddenTabRedirect({
      rootNavigationReady: true,
      routeIsHidden: false,
    })).toBeNull();
  });
});
