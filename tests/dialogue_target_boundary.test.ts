import React, { useState } from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import fs from 'node:fs';
import path from 'node:path';
import DialogueTargetBoundary from '../components/dialogs/DialogueTargetBoundary';

jest.mock('react-native', () => ({
  Text: 'Text',
  View: 'View',
  StyleSheet: { flatten: (style: unknown) => style },
}));

function Probe({ target }: { target: string }) {
  const [owned] = useState(() => `owned:${target}`);
  return React.createElement(Text, { testID: 'owned' }, owned);
}

const tree = (target: string) => React.createElement(
  DialogueTargetBoundary,
  { target },
  React.createElement(Probe, { target }),
);

test('a target switch discards old mounted ownership before the new interactive render', async () => {
  const screen = await render(tree('es'));
  expect(screen.getByTestId('owned').props.children).toBe('owned:es');
  await screen.rerender(tree('fr'));
  expect(screen.getByTestId('owned').props.children).toBe('owned:fr');
  await screen.rerender(tree('de'));
  expect(screen.getByTestId('owned').props.children).toBe('owned:de');
});

test('catalogue and briefing mount their state inside the target boundary', () => {
  for (const file of ['components/DialogsTabContent.tsx', 'app/ai_dialog_briefing.tsx']) {
    expect(fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8')).toContain('<DialogueTargetBoundary target={studyTarget}>');
  }
  const briefing = fs.readFileSync(path.resolve(__dirname, '../app/ai_dialog_briefing.tsx'), 'utf8');
  expect(briefing).toContain('openSessionRef.current = null');
});
