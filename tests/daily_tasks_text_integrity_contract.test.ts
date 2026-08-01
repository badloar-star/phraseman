import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const screen = fs.readFileSync(path.join(root, 'app/daily_tasks_screen.tsx'), 'utf8');
const componentPath = path.join(root, 'components/daily-tasks/DailyTaskCard.tsx');

test('daily challenge cards use extracted semantic presentation without calculated concealment', () => {
  expect(fs.existsSync(componentPath)).toBe(true);
  const component = fs.readFileSync(componentPath, 'utf8');
  expect(screen).toContain('<DailyTaskCard');
  expect(screen).toContain('<DailyBonusCard');
  expect(screen).not.toContain('if (true) return');
  expect(screen).not.toContain('{false && tasks.length > 0');
  expect(screen).toContain('isGoldTheme ? { borderRadius: 16 }');
  expect(screen).toContain('goldShadow(trioClaimButtonEnabled ? 2 : 1)');
  for (const token of ['expandedDescriptionLines', 'expandedDescriptionBlockHeight', 'expandedCardTargetHeight', 'expandedCardHeight', 'expandedPanelHeight']) {
    expect(screen + component).not.toContain(token);
  }
  expect(component).toContain('minHeight: 92');
  expect(component).toContain('<FlowText');
  expect(component).toContain('<AdaptiveLabel');
  expect(component).not.toMatch(/numberOfLines|ellipsizeMode|adjustsFontSizeToFit|minimumFontScale|allowFontScaling={false}/);
});

test('screen retains every live task capability after removing duplicate renderers', () => {
  // зачем: токен 'handleClaim(task.id' убран — владелец снял кнопку «Забрать» с
  // карточки, XP за вызов дня начисляется автоматически при выполнении
  // (DailyTaskRewardToast). Остальные возможности экрана контракт стережёт как прежде.
  for (const token of ['handleTaskCardPress', 'setRerollConfirm({ task })', 'PlusBadge', 'taskCapsuleFill']) {
    expect(screen).toContain(token);
  }
  // зачем: закрепляем новое правило — на карточке задания не должно появиться
  // кнопки действия, иначе награду снова придётся забирать вручную.
  expect(screen).toContain('action={undefined}');
});

test('task capsule preserves the card vertical padding for multiline copy', () => {
  const component = fs.readFileSync(componentPath, 'utf8');
  const taskCapsuleStyle = screen.match(/taskCapsuleCard:\s*\{([\s\S]*?)\n\s*\},/)?.[1];

  expect(component).toMatch(/card:\s*\{[^}]*paddingVertical:\s*12/);
  expect(taskCapsuleStyle).toBeDefined();
  expect(taskCapsuleStyle).not.toMatch(/paddingVertical:/);
});

test('the compact card does not repeat the full task instruction', () => {
  expect(screen).toContain('description=""');
  expect(screen).toContain('selectedQuest');
});
