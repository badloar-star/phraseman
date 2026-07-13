import fs from 'fs';
import path from 'path';
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react-native';

import { SOFT_UPSELL_ADMIN_PREVIEWS } from '../components/admin_panel/soft_upsell_preview_catalog';
import SoftUpsellPreviewSection from '../components/admin_panel/sections/SoftUpsellPreviewSection';

const qaToast = jest.fn();

jest.mock('react-native', () => {
  const RuntimeReact = jest.requireActual<typeof import('react')>('react');
  return {
    Modal: ({ children, visible }: { children?: React.ReactNode; visible: boolean }) => (
      visible ? RuntimeReact.createElement('Modal', null, children) : null
    ),
    Pressable: 'Pressable',
    ScrollView: 'ScrollView',
    StyleSheet: {
      flatten: (style: unknown) => Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style,
    },
    Text: 'Text',
    View: 'View',
  };
});

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

jest.mock('../components/admin_panel/ui', () => {
  const RuntimeReact = jest.requireActual<typeof import('react')>('react');
  return {
    ADMIN_BORDER_MUTED: '#333',
    ADMIN_SURFACE: '#111',
    ADMIN_TEXT: '#fff',
    AccordionSection: ({ children }: { children: React.ReactNode }) => RuntimeReact.createElement('View', null, children),
    AdminHint: ({ children }: { children: React.ReactNode }) => RuntimeReact.createElement('Text', null, children),
    ButtonRow: ({ label, onPress, testID }: { label: string; onPress: () => void; testID: string }) => (
      RuntimeReact.createElement('Pressable', { accessibilityLabel: label, onPress, testID },
        RuntimeReact.createElement('Text', null, label))
    ),
  };
});

jest.mock('../components/admin_panel/qa_utils', () => ({
  qaToast: (...args: unknown[]) => qaToast(...args),
}));

jest.mock('../components/SoftContextualUpsellCard', () => ({
  __esModule: true,
  default: ({ ctaAccessibilityLabel, onCta, onDismiss, title }: {
    ctaAccessibilityLabel: string;
    onCta: () => void;
    onDismiss: () => void;
    title: string;
  }) => {
    const RuntimeReact = jest.requireActual<typeof import('react')>('react');
    return RuntimeReact.createElement('View', { testID: 'soft-upsell-card' },
      RuntimeReact.createElement('Text', null, title),
      RuntimeReact.createElement('Pressable', { accessibilityLabel: ctaAccessibilityLabel, onPress: onCta }),
      RuntimeReact.createElement('Pressable', { accessibilityLabel: 'Закрыть предложение', onPress: onDismiss }));
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(async () => {
  qaToast.mockClear();
  await cleanup();
});

test('opens every soft upsell independently and closes the local preview', async () => {
  const view = await render(React.createElement(SoftUpsellPreviewSection, { open: true, onToggle: jest.fn() }));

  for (const preview of SOFT_UPSELL_ADMIN_PREVIEWS) {
    await fireEvent.press(view.getByTestId(`admin-soft-upsell-preview-${preview.id}`));
    expect(view.getByTestId('soft-upsell-card')).toBeTruthy();
    expect(view.getByText(preview.title)).toBeTruthy();
    await fireEvent.press(view.getByLabelText('Закрыть предложение'));
    expect(view.queryByTestId('soft-upsell-card')).toBeNull();
  }
});

test('keeps CTA local and reports only QA feedback', async () => {
  const preview = SOFT_UPSELL_ADMIN_PREVIEWS[0];
  const view = await render(React.createElement(SoftUpsellPreviewSection, { open: true, onToggle: jest.fn() }));

  await fireEvent.press(view.getByTestId(`admin-soft-upsell-preview-${preview.id}`));
  await fireEvent.press(view.getByLabelText(preview.ctaLabel));

  expect(qaToast).toHaveBeenCalledWith('info', `QA: ${preview.ctaLabel}`);
  expect(view.getByTestId('soft-upsell-card')).toBeTruthy();
});

test('contains no production state, navigation, persistence, or analytics dependencies', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'components', 'admin_panel', 'sections', 'SoftUpsellPreviewSection.tsx'),
    'utf8',
  );
  expect(source).not.toMatch(/firestore|AsyncStorage|trackSoftUpsell|useSoftUpsellOpportunity|useRouter/);
  expect(source).toContain('accessibilityViewIsModal');
  expect(source).toContain('minHeight: 52');
  expect(source).toContain('maxWidth: 560');
});
