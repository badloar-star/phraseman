import fs from 'fs';
import path from 'path';
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import SoftContextualUpsellCard from '../components/SoftContextualUpsellCard';

jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', Pressable: 'Pressable',
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
  },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ theme: { bgCard: '#fff', border: '#ddd', textPrimary: '#111', textMuted: '#555', accent: '#b7ff00', correctText: '#07110A' }, f: { body: 16, caption: 13, label: 15 } }) }));

const opportunity = { trigger: 'first_lesson' as const, value: 1, studyTarget: 'en' as const, context: 'first_lesson_success' as const, destination: 'personal_plan' as const, milestoneId: 'first_lesson:1:en' };

it('is inline, accessible, and reports a visible layout once', async () => {
  const onImpression = jest.fn();
  const onDismiss = jest.fn();
  const onCta = jest.fn();
  const view = await render(React.createElement(SoftContextualUpsellCard, { title: 'Great result', body: 'Keep learning', ctaLabel: 'Continue', opportunity, onImpression, onDismiss, onCta }));
  fireEvent(view.getByTestId('soft-upsell-card'), 'layout', { nativeEvent: { layout: { width: 300, height: 120 } } });
  fireEvent(view.getByTestId('soft-upsell-card'), 'layout', { nativeEvent: { layout: { width: 300, height: 120 } } });
  expect(onImpression).toHaveBeenCalledTimes(1);
  fireEvent.press(view.getByLabelText('Continue'));
  fireEvent.press(view.getByLabelText('Dismiss'));
  expect(onCta).toHaveBeenCalledTimes(1);
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

it('has no modal, portal, router, emoji, or animation and enforces touch/contrast tokens', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'components/SoftContextualUpsellCard.tsx'), 'utf8');
  expect(source).not.toMatch(/Modal|Portal|expo-router|useRouter|Animated|[\u{1F300}-\u{1FAFF}]/u);
  expect(source).toMatch(/minHeight:\s*44/);
  expect(source).toMatch(/minWidth:\s*44/);
  expect(source).toMatch(/t\.correctText/);
  expect(source).toMatch(/accessibilityHint/);
});
