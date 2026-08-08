import fs from 'fs';
import path from 'path';

import { ONBOARDING_STEP_CATALOG, MANDATORY_ONBOARDING_STEP } from '../app/onboarding_flow';

// зачем: владелец пользуется ТОЛЬКО admin/v2/legacy.html (см. CLAUDE.md), а рабочие
// тумблеры экранов онбординга исторически жили в замороженном admin/v2/scripts/admin-core.js
// и на боевую не попадали. Этот контракт держит раздел живым именно в legacy.html и
// не даёт списку экранов разъехаться с app/onboarding_flow.ts.
const legacy = fs.readFileSync(path.join(process.cwd(), 'admin', 'v2', 'legacy.html'), 'utf8');

function adminCatalogIds(): string[] {
  const start = legacy.indexOf('const ONBOARDING_STEP_CATALOG = [');
  expect(start).toBeGreaterThan(-1);
  const block = legacy.slice(start, legacy.indexOf('];', start));
  return [...block.matchAll(/\['([a-zA-Z]+)',/g)].map((m) => m[1]);
}

describe('Admin legacy onboarding screens section', () => {
  it('is registered as a real tab across every wiring point', () => {
    expect(legacy).toContain("'onboarding-screens',");
    expect(legacy).toContain("'onboarding-screens': 'Onboarding screens'");
    expect(legacy).toContain("'onboarding-screens': 'core'");
    expect(legacy).toContain("switchTab('onboarding-screens')");
    expect(legacy).toContain('id="tab-onboarding-screens"');
    expect(legacy).toContain('window.loadOnboardingScreens');
  });

  it('lists exactly the app catalog, in the same order', () => {
    expect(adminCatalogIds()).toEqual(ONBOARDING_STEP_CATALOG.map(({ id }) => id));
  });

  it('keeps the legally mandatory step permanently enabled', () => {
    expect(legacy).toContain(`const ONBOARDING_MANDATORY_STEP = '${MANDATORY_ONBOARDING_STEP}'`);
    expect(legacy).toContain('const mandatory = id === ONBOARDING_MANDATORY_STEP');
    expect(legacy).toContain("${mandatory ? 'disabled' : ''}");
  });

  it('publishes through the revision-safe shared writer, after an explicit preview', () => {
    expect(legacy).toContain("const ONBOARDING_ENABLED_STEPS_KEY = 'onboarding_enabled_steps_v1'");
    expect(legacy).toContain('window.saveControlPanelTexts({ [ONBOARDING_ENABLED_STEPS_KEY]');
    expect(legacy).toContain('window.previewOnboardingScreens');
    // Правка галочки обязана гасить кнопку публикации, иначе можно опубликовать
    // не то, что показал предпросмотр.
    expect(legacy).toContain('window.onboardingScreensDirty');
  });

  it('reads the exit funnel from the single per-user onboarding_exit event', () => {
    expect(legacy).toContain("r.action === 'onboarding_exit'");
    expect(legacy).toContain("where('createdAtMs', '>=', fromMs)");
    expect(legacy).toContain('limit(3000)');
  });
});
