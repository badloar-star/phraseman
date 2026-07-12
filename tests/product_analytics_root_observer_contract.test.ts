import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('root product analytics observer contract', () => {
  it('mounts the observer once in root layout without depending on onboarding', () => {
    const layout = read('app/_layout.tsx');
    expect(layout).toContain("import { ProductAnalyticsRuntimeObserver } from './product_analytics_runtime_observer'");
    expect(layout.match(/<ProductAnalyticsRuntimeObserver\b/g)).toHaveLength(1);
    expect(layout).toContain('studyTarget={studyTarget}');
  });

  it('uses consent, canonical screens and the tested runtime', () => {
    const observer = read('app/product_analytics_runtime_observer.tsx');
    expect(observer).toContain('subscribeAnalyticsConsent');
    expect(observer).toContain('productAnalyticsScreenId(pathname)');
    expect(observer).toContain('createProductAnalyticsRuntime');
    expect(observer).toContain("trackEvent(event.eventName");
    expect(observer).toContain('setProductAnalyticsSessionId');
    expect(observer).not.toContain('CleanOnboarding');
  });

  it('adds the memory-only product session id to consented Firebase events', () => {
    const firebase = read('app/firebase.ts');
    expect(firebase).toContain('getProductAnalyticsSessionId');
    expect(firebase).toContain('product_session_id');
  });

  it('registers all runtime event names in the analytics facade', () => {
    const analytics = read('app/analytics.ts');
    for (const event of [
      'product_session_start',
      'product_session_resume',
      'product_session_background',
      'product_screen_view',
      'product_screen_leave',
    ]) {
      expect(analytics).toContain(`| '${event}'`);
    }
  });
});
