import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { PaywallCBenefits } from '../components/paywall/PaywallCBenefits';
import { PaywallPlanRows, PaywallPlanRowsSkeleton } from '../components/paywall/PaywallPlanRows';
import { PaywallPlusDock, PaywallPlusHeader } from '../components/paywall/PaywallPlus';
import { PaywallServerRefusedDock } from '../components/paywall/PaywallServerRefusedDock';

jest.mock('react-native', () => jest.requireActual('react-native/index.js'));
jest.mock('../hooks/use_reduce_motion', () => ({ useReduceMotion: () => true }));
jest.mock('@expo/vector-icons/Ionicons', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/SkeletonShimmer', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/SafeLinearGradient', () => ({ LinearGradient: ({ children }: { children?: React.ReactNode }) => children ?? null }));
jest.mock('../app/events', () => ({ onAppEvent: () => ({ remove: () => undefined }) }));
jest.mock('../app/open_legal_link', () => ({ openLegalLink: () => undefined }));
jest.mock('../components/v2/V2Pressable', () => ({
  __esModule: true,
  default: ({ children, onPress, testID, accessibilityRole, accessibilityState, disabled, style, outerStyle }: any) => {
    const React = require('react');
    const { Pressable, View } = require('react-native');
    return React.createElement(Pressable, {
      onPress,
      testID,
      accessibilityRole,
      accessibilityState: { ...accessibilityState, disabled: !!disabled },
      disabled,
      style: outerStyle,
    }, React.createElement(View, { style }, children));
  },
}));
jest.mock('react-native-reanimated', () => {
  return {
    __esModule: true,
    default: { View: 'View' },
    cancelAnimation: () => undefined,
    Easing: { bezier: () => undefined },
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withTiming: (value: number) => value,
  };
});

const dark = liquidGlassTokens('graphite', { appearance: 'dark', intensity: 0.5 });
const light = liquidGlassTokens('graphite', { appearance: 'light', intensity: 0.5 });
const longYear = 'R$ 1.299,99'; // deterministic layout fixture, not a claimed live offering
const longMonth = '₺ 12.345,67'; // deterministic layout fixture, not a claimed live offering

describe('native C component rendering', () => {
  it.each([['dark', dark], ['light', light]] as const)('renders exactly three benefit rows in %s theme', async (_name, g) => {
    const view = await render(<PaywallCBenefits lang="en" g={g} leadBenefit="Your course continues" factCaption="12 min · 18 turns" />);
    expect(view.getByTestId('paywall-c-benefits')).toBeTruthy();
    expect(view.getByText('Your course continues')).toBeTruthy();
    expect(view.getByText('12 min · 18 turns')).toBeTruthy();
    expect(view.getAllByText(/Save, build packs, practice|Free: lessons 1–3|Free: 3 a day|12 min/)).toHaveLength(3);
  });

  it('never pairs a contextual lead with the unrelated generic cards caption', async () => {
    const view = await render(<PaywallCBenefits lang="en" g={dark} leadBenefit="Study without waiting" leadCaption="Keep moving through your course." />);
    expect(view.getByText('Study without waiting')).toBeTruthy();
    expect(view.getByText('Keep moving through your course.')).toBeTruthy();
    expect(view.queryByText('Save, build packs, practice')).toBeNull();
  });

  it('passes long fixture prices, plan-specific trials and promo text through unchanged and handles selection', async () => {
    const onSelect = jest.fn();
    const view = await render(
      <PaywallPlanRows
        lang="en" g={dark} selected="yearly" onSelect={onSelect} disabled={false}
        yearlyPrice={longYear} yearlyPerMonth="R$ 108,33" monthlyPrice={longMonth}
        yearlyTrialDays={7} monthlyTrialDays={3}
        yearlyPromo={{ promoPriceString: 'R$ 999,99', standardPriceString: longYear, discountPercent: 23 } as never}
        monthlyPromo={null} yearlyPriceSource="store" monthlyPriceSource="cache" savingsPct={20}
      />,
    );
    expect(view.getByText('R$ 999,99')).toBeTruthy();
    expect(view.getByText(longYear)).toBeTruthy();
    expect(view.getByText(longMonth)).toBeTruthy();
    expect(view.getByTestId('paywall-plan-yearly-trial')).toBeTruthy();
    expect(view.getByTestId('paywall-plan-monthly-trial')).toBeTruthy();
    expect(view.getByTestId('paywall-plan-yearly')).toHaveStyle({ flex: 1, minWidth: 0 });
    expect(view.getByTestId('paywall-plan-monthly')).toHaveStyle({ flex: 1, minWidth: 0 });
    await fireEvent.press(view.getByTestId('paywall-plan-monthly'));
    expect(onSelect).toHaveBeenCalledWith('monthly');
  });

  it('renders the two-column loading state without any purchase side effect', async () => {
    const view = await render(<PaywallPlanRowsSkeleton g={light} />);
    expect(view.getByTestId('paywall-plans-skeleton').props.accessibilityRole).toBe('progressbar');
  });

  it('fires the visible C close, purchase, restore and promo controls', async () => {
    const onClose = jest.fn();
    const header = await render(<PaywallPlusHeader lang="en" g={dark} trialDays={7} closeVisible closeDisabled={false} onClose={onClose} contextTitle="Continue learning" />);
    await fireEvent.press(header.getByTestId('paywall-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    const onPress = jest.fn(); const onRestore = jest.fn(); const onPromo = jest.fn();
    const dock = await render(<PaywallPlusDock lang="en" g={dark} state="error" label="Get Plus" fine="Store disclosure" notice={false}
      purchasing={false} disabled={false} bottomInset={0} onPress={onPress}
      restoring={false} restoreVisible restoreDisabled={false} onRestore={onRestore}
      promoVisible promoDisabled={false} onPromo={onPromo} />);
    await fireEvent.press(dock.getByTestId('paywall-cta'));
    await fireEvent.press(dock.getByTestId('paywall-restore'));
    await fireEvent.press(dock.getByTestId('paywall-promo-code'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onPromo).toHaveBeenCalledTimes(1);
  });

  it('renders server-refused restore first and fires restore, purchase and later separately', async () => {
    const onRestore = jest.fn(); const onPress = jest.fn(); const onLater = jest.fn();
    const view = await render(<PaywallServerRefusedDock lang="en" g={dark} label="Get Plus" purchasing={false} disabled={false} bottomInset={0}
      onPress={onPress} restoring={false} onRestore={onRestore} onLater={onLater} />);
    await fireEvent.press(view.getByTestId('paywall-server-refused-restore'));
    await fireEvent.press(view.getByTestId('paywall-server-refused-purchase'));
    await fireEvent.press(view.getByTestId('paywall-server-refused-later'));
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onLater).toHaveBeenCalledTimes(1);
  });

  it('honors busy locks and remote-control hidden restore/promo controls', async () => {
    const onClose = jest.fn(); const onPress = jest.fn(); const onRestore = jest.fn(); const onPromo = jest.fn();
    const header = await render(<PaywallPlusHeader lang="en" g={dark} trialDays={null} closeVisible closeDisabled onClose={onClose} />);
    await fireEvent.press(header.getByTestId('paywall-close'));
    expect(onClose).not.toHaveBeenCalled();
    const busy = await render(<PaywallPlusDock lang="en" g={dark} state="ready" label="Get Plus" fine="Disclosure" notice={false}
      purchasing disabled bottomInset={0} onPress={onPress} restoring restoreVisible restoreDisabled onRestore={onRestore}
      promoVisible promoDisabled onPromo={onPromo} />);
    await fireEvent.press(busy.getByTestId('paywall-cta'));
    await fireEvent.press(busy.getByTestId('paywall-restore'));
    await fireEvent.press(busy.getByTestId('paywall-promo-code'));
    expect(onPress).not.toHaveBeenCalled(); expect(onRestore).not.toHaveBeenCalled(); expect(onPromo).not.toHaveBeenCalled();
    const hidden = await render(<PaywallPlusDock lang="en" g={dark} state="ready" label="Get Plus" fine="Disclosure" notice={false}
      purchasing={false} disabled={false} bottomInset={0} onPress={onPress} restoring={false} restoreVisible={false} restoreDisabled={false} onRestore={onRestore}
      promoVisible={false} promoDisabled={false} onPromo={onPromo} />);
    expect(hidden.queryByTestId('paywall-restore')).toBeNull();
    expect(hidden.queryByTestId('paywall-promo-code')).toBeNull();
  });
});
