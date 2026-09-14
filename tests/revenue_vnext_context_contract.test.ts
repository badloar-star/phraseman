import { PREMIUM_CONTEXT_SET } from '../app/premium_context';
import fs from 'fs';
import path from 'path';

const onboarding = fs.readFileSync(path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8');
const season = fs.readFileSync(path.join(process.cwd(), 'app', 'season_pass.tsx'), 'utf8');
const icons = fs.readFileSync(path.join(process.cwd(), 'components', 'paywall', 'PaywallContextIcons.tsx'), 'utf8');

test('Revenue VNext contexts are canonical and retired acquisition context is absent', () => {
  expect(PREMIUM_CONTEXT_SET.has('onboarding_plan' as never)).toBe(true);
  expect(PREMIUM_CONTEXT_SET.has('season_pass_lane' as never)).toBe(true);
  expect(onboarding).toContain("context: 'onboarding_plan'");
  expect(onboarding).not.toContain("context: 'personal_plan'");
  expect(season).toContain("context: 'season_pass_lane'");
});

test('new contexts keep the existing generic paywall icon treatment', () => {
  expect(icons).toContain('onboarding_plan: GENERIC,');
  expect(icons).toContain('season_pass_lane: GENERIC,');
  expect(icons).toContain('generic: GENERIC,');
});
