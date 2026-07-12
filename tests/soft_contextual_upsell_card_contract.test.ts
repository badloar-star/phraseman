import fs from 'fs';
import path from 'path';
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react-native';

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
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(async () => { await cleanup(); });

it('is inline, accessible, and reports a visible layout once', async () => {
  const onImpression = jest.fn();
  const onDismiss = jest.fn();
  const onCta = jest.fn();
  const localized = { dismissLabel: 'Не сейчас', dismissAccessibilityLabel: 'Закрыть предложение', dismissAccessibilityHint: 'Скрывает эту подсказку', ctaAccessibilityLabel: 'Открыть мой план', ctaAccessibilityHint: 'Показывает персональный план' };
  const view = await render(React.createElement(SoftContextualUpsellCard, { title: 'Great result', body: 'Keep learning', ctaLabel: 'Продолжить обучение с очень длинной подписью', ...localized, opportunity, onImpression, onDismiss, onCta }));
  await fireEvent(view.getByTestId('soft-upsell-card'), 'layout', { nativeEvent: { layout: { width: 300, height: 120 } } });
  await fireEvent(view.getByTestId('soft-upsell-card'), 'layout', { nativeEvent: { layout: { width: 300, height: 120 } } });
  await view.rerender(React.createElement(SoftContextualUpsellCard, { title: 'Great result', body: 'Keep learning', ctaLabel: 'Продолжить обучение с очень длинной подписью', ...localized, opportunity, onImpression, onDismiss, onCta }));
  await fireEvent(view.getByTestId('soft-upsell-card'), 'layout', { nativeEvent: { layout: { width: 0, height: 0 } } });
  await fireEvent(view.getByTestId('soft-upsell-card'), 'layout', { nativeEvent: { layout: { width: 300, height: 120 } } });
  expect(onImpression).toHaveBeenCalledTimes(1);
  expect(view.getByText('Great result')).toBeTruthy();
  expect(view.getByText('Keep learning')).toBeTruthy();
  expect(view.getByText('Продолжить обучение с очень длинной подписью')).toBeTruthy();
  expect(view.getByText('Не сейчас')).toBeTruthy();
  await fireEvent.press(view.getByLabelText('Открыть мой план'));
  await fireEvent.press(view.getByLabelText('Закрыть предложение'));
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
  expect(source).toMatch(/flexWrap:\s*'wrap'/);
  expect(source).not.toMatch(/["']Dismiss["']|["']Closes this suggestion["']|["']Opens premium options["']/);
});
