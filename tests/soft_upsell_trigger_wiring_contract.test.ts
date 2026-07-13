import fs from 'fs';
import path from 'path';

const source = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

test('the shared runtime host is mounted once and opens the real paywall through onCta', () => {
  const layout = source('app/_layout.tsx');
  const host = source('components/GlobalSoftUpsellHost.tsx');
  expect(layout.match(/<GlobalSoftUpsellHost\s*\/>/g)).toHaveLength(1);
  expect(host).toContain('onCta={() =>');
  expect(host).toContain("pathname: '/premium_modal'");
  expect(host).toContain('softUpsellRouteParams(attribution)');
  expect(host).toContain('flow.onNavigationFailure()');
});

test('all four global opportunities are wired to their proven user-success moments', () => {
  expect(source('app/WeeklyReviewCard.tsx')).toMatch(/emitSoftUpsellTrigger\(weeklyReviewCandidate/);
  expect(source('app/(tabs)/home.tsx')).toMatch(/emitSoftUpsellTrigger\(streakCandidate/);
  expect(source('app/trainer_session_report.tsx')).toMatch(/emitSoftUpsellTrigger\(repeatedTrainingCandidate/);

  const dialog = source('app/ai_dialog_session.tsx');
  expect(dialog).toContain('recordSuccessfulDialogCompletion();');
  expect(dialog).toMatch(/emitSoftUpsellTrigger\(aiDialogueCandidate/);
  expect(dialog).toContain('else recordSuccessfulDialogCompletion();');
  expect(dialog).toContain('completedLifetime: result.completedLifetime');
});
