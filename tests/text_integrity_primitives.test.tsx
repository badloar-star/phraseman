import React, { createRef } from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

const mockProbe = jest.fn();
const mockProbeLayout = jest.fn();
let mockFontScale = 1;

jest.unmock('react-native');
jest.mock('expo-router', () => ({ usePathname: () => '/lesson/1' }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: 'en' }) }));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({ width: 390, height: 844, scale: 1, fontScale: mockFontScale }),
}));
jest.mock('../components/text-integrity/use_text_integrity_probe', () => ({
  useTextIntegrityProbe: (input: unknown) => {
    mockProbe(input);
    return { ref: { current: null }, onTextLayout: mockProbeLayout };
  },
}));

// Mocks must be registered before loading the components under test.
// eslint-disable-next-line import/first
import {
  AdaptiveLabel,
  FlowText,
  analyzeAdaptiveLines,
  computeEffectiveScaledFloor,
} from '../components/text-integrity';

const line = (width: number) => ({
  ascender: 10, capHeight: 8, descender: -2, height: 16,
  text: 'line', width, x: 0, xHeight: 6, y: 0,
});
const layout = (...widths: number[]) => ({ nativeEvent: { lines: widths.map(line) } });

beforeEach(() => {
  mockProbe.mockClear();
  mockProbeLayout.mockClear();
  mockProbeLayout.mockImplementation(() => undefined);
  mockFontScale = 1;
});

test('dedicated RNTL config discovers TSX without replacing React Native', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const config = require('../jest.rntl.config.cjs') as {
    testMatch: string[];
    moduleNameMapper?: Record<string, string>;
  };
  expect(config.testMatch).toEqual(['<rootDir>/tests/text_integrity_primitives.test.tsx']);
  expect(config.moduleNameMapper).not.toHaveProperty('^react-native$');
});

test('FlowText keeps complete copy and never forwards unsafe native text props', async () => {
  const copy = 'A deliberately long sentence that must remain complete and wrap naturally.';
  await render(<FlowText testID="flow" provenance="authored">{copy}</FlowText>);
  const host = screen.getByText(copy);
  expect(host.props.children).toBe(copy);
  expect(host.props).not.toHaveProperty('numberOfLines');
  expect(host.props).not.toHaveProperty('ellipsizeMode');
  expect(host.props).not.toHaveProperty('allowFontScaling');

  // @ts-expect-error FlowText deliberately forbids native line caps.
  void <FlowText testID="bad-lines" provenance="authored" numberOfLines={1}>x</FlowText>;
  // @ts-expect-error FlowText deliberately forbids native ellipsis.
  void <FlowText testID="bad-ellipsis" provenance="authored" ellipsizeMode="tail">x</FlowText>;
  // @ts-expect-error FlowText deliberately forbids disabling font scaling.
  void <FlowText testID="bad-scale" provenance="authored" allowFontScaling={false}>x</FlowText>;
  // @ts-expect-error FlowText deliberately forbids native font shrinking.
  void <FlowText testID="bad-fit-flow" provenance="authored" adjustsFontSizeToFit>x</FlowText>;
  // @ts-expect-error FlowText deliberately forbids a native minimum shrink scale.
  void <FlowText testID="bad-min-flow" provenance="authored" minimumFontScale={0.8}>x</FlowText>;
  // @ts-expect-error AdaptiveLabel deliberately forbids native font shrinking.
  void <AdaptiveLabel testID="bad-fit" provenance="authored" availableWidth={100} adjustsFontSizeToFit>x</AdaptiveLabel>;
  // @ts-expect-error AdaptiveLabel deliberately forbids a native minimum shrink scale.
  void <AdaptiveLabel testID="bad-min" provenance="authored" availableWidth={100} minimumFontScale={0.8}>x</AdaptiveLabel>;
});

test('FlowText runtime-strips all unsafe props passed through an untyped spread', async () => {
  const unsafe = {
    numberOfLines: 1,
    ellipsizeMode: 'tail',
    allowFontScaling: false,
    adjustsFontSizeToFit: true,
    minimumFontScale: 0.5,
  } as any;
  await render(<FlowText testID="runtime-flow" provenance="authored" {...unsafe}>complete</FlowText>);
  expect(screen.getByTestId('runtime-flow').props).toEqual(expect.not.objectContaining(unsafe));
});

test('AdaptiveLabel runtime-strips all unsafe props passed through an untyped spread', async () => {
  const unsafe = {
    numberOfLines: 1,
    ellipsizeMode: 'tail',
    allowFontScaling: false,
    adjustsFontSizeToFit: true,
    minimumFontScale: 0.5,
  } as any;
  await render(
    <AdaptiveLabel testID="runtime-adaptive" provenance="authored" availableWidth={100} {...unsafe}>
      complete
    </AdaptiveLabel>,
  );
  expect(screen.getByTestId('runtime-adaptive').props).toEqual(expect.not.objectContaining(unsafe));
});

test('FlowText is a direct Text host and remains nestable in native Text', async () => {
  await render(
    <Text testID="outer">before <FlowText testID="inner" provenance="authored">inside</FlowText> after</Text>,
  );
  // This structural assertion is intentionally limited to the no-wrapper contract.
  expect(screen.root?.type).toBe('Text');
  expect(screen.getByTestId('inner').type).toBe('Text');
  expect(screen.toJSON()?.type).toBe('Text');
});

test('FlowText preserves accessibility, press handling, and forwarded refs', async () => {
  const onPress = jest.fn();
  const ref = createRef<Text>();
  await render(
    <FlowText ref={ref} testID="action" provenance="authored" accessibilityRole="button" onPress={onPress} selectable>
      Continue
    </FlowText>,
  );
  await userEvent.setup().press(screen.getByRole('button', { name: 'Continue' }));
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button').props.selectable).toBe(true);
  expect(ref.current).not.toBeNull();
});

test('FlowText composes consumer and probe layout handlers exactly once', async () => {
  const consumer = jest.fn();
  await render(<FlowText testID="flow" provenance="authored" onTextLayout={consumer}>copy</FlowText>);
  const event = layout(80);
  await fireEvent(screen.getByTestId('flow'), 'textLayout', event);
  expect(consumer).toHaveBeenCalledTimes(1);
  expect(mockProbeLayout).toHaveBeenCalledTimes(1);
  expect(mockProbeLayout.mock.invocationCallOrder[0]).toBeLessThan(consumer.mock.invocationCallOrder[0]);
});

test('FlowText attempts probe then consumer and preserves the first thrown error', async () => {
  const probeError = new Error('probe failed');
  const consumerError = new Error('consumer failed');
  const consumer = jest.fn(() => { throw consumerError; });
  mockProbeLayout.mockImplementation(() => { throw probeError; });
  await render(<FlowText testID="throwing-flow" provenance="authored" onTextLayout={consumer}>copy</FlowText>);
  await expect(fireEvent(screen.getByTestId('throwing-flow'), 'textLayout', layout(80))).rejects.toBe(probeError);
  expect(mockProbeLayout).toHaveBeenCalledTimes(1);
  expect(consumer).toHaveBeenCalledTimes(1);
});

test('FlowText extracts only plain children and uses integrityText for complex children', async () => {
  await render(
    <FlowText testID="plain" provenance="authored">a{2}{['b', <React.Fragment key="f">c{3}</React.Fragment>]}</FlowText>,
  );
  expect(mockProbe).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'a2bc3' }));
  const secret = 'must-not-be-traversed';
  await render(<FlowText testID="no-override" provenance="external"><Text data-secret={secret}>visible</Text></FlowText>);
  expect(mockProbe).toHaveBeenLastCalledWith(expect.objectContaining({ text: undefined }));
  await render(
    <FlowText testID="complex" provenance="external" integrityText="safe description">
      <Text data-secret={secret}>visible</Text>
    </FlowText>,
  );
  expect(mockProbe).toHaveBeenLastCalledWith(expect.objectContaining({ text: 'safe description' }));
});

test('Adaptive analysis and callback precede consumer and survive thrown handlers', async () => {
  const order: string[] = [];
  const probeError = new Error('probe first');
  const reflowError = new Error('reflow second');
  mockProbeLayout.mockImplementation(() => { order.push('probe'); throw probeError; });
  const reflow = jest.fn(() => { order.push('reflow'); throw reflowError; });
  const consumer = jest.fn(() => { order.push('consumer'); throw new Error('consumer third'); });
  await render(
    <AdaptiveLabel
      testID="throwing-adaptive"
      provenance="authored"
      availableWidth={100}
      onReflowNeeded={reflow}
      onTextLayout={consumer}
    >copy</AdaptiveLabel>,
  );
  await expect(fireEvent(screen.getByTestId('throwing-adaptive'), 'textLayout', layout(120))).rejects.toBe(probeError);
  expect(order).toEqual(['probe', 'reflow', 'consumer']);
});

test('AdaptiveLabel requests reflow only on fit-to-overflow transitions', async () => {
  const onReflowNeeded = jest.fn();
  await render(
    <AdaptiveLabel testID="adaptive" provenance="authored" availableWidth={100} compactLineLimit={1} onReflowNeeded={onReflowNeeded}>
      Complete accessible copy
    </AdaptiveLabel>,
  );
  const host = screen.getByTestId('adaptive');
  await fireEvent(host, 'textLayout', layout(80));
  expect(onReflowNeeded).not.toHaveBeenCalled();
  await fireEvent(host, 'textLayout', layout(60, 60));
  await fireEvent(host, 'textLayout', layout(120));
  expect(onReflowNeeded).toHaveBeenCalledTimes(1);
  await fireEvent(host, 'textLayout', layout(80));
  await fireEvent(host, 'textLayout', layout(120));
  expect(onReflowNeeded).toHaveBeenCalledTimes(2);
  expect(screen.getByText('Complete accessible copy')).toBeTruthy();
});

test('AdaptiveLabel treats invalid geometry conservatively', async () => {
  const callback = jest.fn();
  await render(
    <AdaptiveLabel testID="invalid" provenance="authored" availableWidth={100} onReflowNeeded={callback}>copy</AdaptiveLabel>,
  );
  await fireEvent(screen.getByTestId('invalid'), 'textLayout', layout(Number.NaN));
  expect(callback).toHaveBeenCalledWith(expect.objectContaining({ reason: 'invalid-geometry' }));
  expect(analyzeAdaptiveLines([], 100, 1).reason).toBe('invalid-geometry');
});

test('Adaptive helpers preserve a scaled readability floor and clamp ratios', () => {
  expect(computeEffectiveScaledFloor(16, 2, 0.8)).toBe(25.6);
  expect(computeEffectiveScaledFloor(16, 2, 0.1)).toBe(25.6);
  expect(computeEffectiveScaledFloor(16, 2, 2)).toBe(32);
  expect(analyzeAdaptiveLines([line(101.5)], 100, 1).needsReflow).toBe(false);
  expect(analyzeAdaptiveLines([line(102.1)], 100, 1).reason).toBe('too-wide');
});

test.each([
  [[], 100, 1, 2],
  [[line(Number.NaN)], 100, 1, 2],
  [[line(Number.POSITIVE_INFINITY)], 100, 1, 2],
  [[line(-1)], 100, 1, 2],
  [[line(10)], Number.NaN, 1, 2],
  [[line(10)], 100, 1.5, 2],
  [[line(10)], 100, 0, 2],
  [[line(10)], 100, 1, -1],
  [[line(10)], 100, 1, Number.POSITIVE_INFINITY],
] as const)('Adaptive analysis sanitizes invalid geometry %#', (lines, width, limit, tolerance) => {
  const result = analyzeAdaptiveLines(lines, width, limit, tolerance);
  expect(result.reason).toBe('invalid-geometry');
  expect(result.needsReflow).toBe(true);
  expect(Number.isFinite(result.lineCount)).toBe(true);
  expect(Number.isFinite(result.widestLineWidth)).toBe(true);
});

test('scaled floor sanitizes invalid numeric inputs to finite readable defaults', () => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, 0, -1]) {
    expect(Number.isFinite(computeEffectiveScaledFloor(value, value, value))).toBe(true);
    expect(computeEffectiveScaledFloor(value, value, value)).toBeGreaterThan(0);
  }
});

test('scaled floor and width tolerance saturate finite overflow without limiting normal scaling', () => {
  expect(computeEffectiveScaledFloor(Number.MAX_VALUE, 2, 0.8)).toBe(Number.MAX_VALUE);
  expect(computeEffectiveScaledFloor(16, 3, 1)).toBe(48);
  expect(analyzeAdaptiveLines([line(Number.MAX_VALUE)], Number.MAX_VALUE, 1, Number.MAX_VALUE))
    .toEqual(expect.objectContaining({ needsReflow: false, widestLineWidth: Number.MAX_VALUE }));
});

test('AdaptiveLabel emits only finite geometry for invalid runtime numbers', async () => {
  mockFontScale = Number.NaN;
  const callback = jest.fn();
  await render(
    <AdaptiveLabel
      testID="sanitized-payload"
      provenance="authored"
      availableWidth={Number.NaN}
      baseFontSize={Number.POSITIVE_INFINITY}
      minimumScaleRatio={Number.NaN}
      onReflowNeeded={callback}
    >copy</AdaptiveLabel>,
  );
  await fireEvent(screen.getByTestId('sanitized-payload'), 'textLayout', layout(Number.NaN));
  const geometry = callback.mock.calls[0]?.[0] as Record<string, number | string>;
  expect(geometry.reason).toBe('invalid-geometry');
  for (const [key, value] of Object.entries(geometry)) {
    if (key !== 'reason') expect(Number.isFinite(value as number)).toBe(true);
  }
});

test('AdaptiveLabel uses system font scale, adaptive probe mode, and no shrinking props', async () => {
  mockFontScale = 2;
  await render(
    <AdaptiveLabel testID="scaled" provenance="authored" availableWidth={200} baseFontSize={16} minimumScaleRatio={0.8}>
      Full label
    </AdaptiveLabel>,
  );
  expect(mockProbe).toHaveBeenLastCalledWith(expect.objectContaining({ semanticMode: 'adaptive' }));
  const host = screen.getByTestId('scaled');
  expect(host.props).not.toHaveProperty('numberOfLines');
  expect(host.props).not.toHaveProperty('ellipsizeMode');
  expect(host.props).not.toHaveProperty('allowFontScaling');
  expect(host.props).not.toHaveProperty('adjustsFontSizeToFit');
  expect(host.props).not.toHaveProperty('minimumFontScale');
});
