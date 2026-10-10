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
  // зачем (10.10): каталог переписан под V2 (1e2f77929, D111) — старого тела каталога со своим состоянием
  // больше нет, каталог V2 читает снимок по studyTarget. Граница цели остаётся у брифинга.
  expect(fs.readFileSync(path.resolve(__dirname, '../app/ai_dialog_briefing.tsx'), 'utf8'))
    .toContain('<DialogueTargetBoundary target={studyTarget}>');
  expect(fs.readFileSync(path.resolve(__dirname, '../components/DialogsTabContent.tsx'), 'utf8'))
    .not.toContain('<DialogsTabContentBody');
  // зачем (10.10): брифинг v1 стал тонкой обёрткой над AiDialogBriefingScreen — своего openSessionRef в нём нет.
});
