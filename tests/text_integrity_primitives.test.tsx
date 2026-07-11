import React, { createRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render, screen, userEvent, within } from '@testing-library/react-native';

const mockProbe = jest.fn();
const mockProbeLayout = jest.fn();
let mockFontScale = 1;
let mockLang = 'ru';

jest.unmock('react-native');
jest.mock('expo-router', () => ({ usePathname: () => '/lesson/1' }));
jest.mock('../app/config', () => ({ SPANISH_UI_LOCALE_ENABLED: true }));
jest.mock('../components/LangContext', () => ({ useLang: () => ({ lang: mockLang }) }));
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
  ExpandableText,
  FlowText,
  ScrollableTextRegion,
  analyzeAdaptiveLines,
  computeEffectiveScaledFloor,
  expandableTextLabels,
  buildExpandablePreview,
} from '../components/text-integrity';
// Imports stay below mocks so the real i18n module sees the isolated config boundary.
// eslint-disable-next-line import/first
import { INTERFACE_LANGS } from '../constants/i18n';

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
  mockLang = 'ru';
});

test('ScrollableTextRegion keeps header and footer outside the scroll body', async () => {
  await render(<ScrollableTextRegion testID="region" text="complete body" provenance="external" availableViewport={{ x: 0, y: 0, width: 320, height: 400 }} header={<Text>Header</Text>} footer={<Text>Footer</Text>} />);
  const scroll = screen.getByTestId('region-scroll');
  expect(within(scroll).getByText('complete body')).toBeTruthy();
  expect(within(scroll).queryByText('Header')).toBeNull();
  expect(within(scroll).queryByText('Footer')).toBeNull();
  expect(scroll.props).toEqual(expect.objectContaining({ nestedScrollEnabled: true, showsVerticalScrollIndicator: true, scrollEventThrottle: 16 }));
});

test('ScrollableTextRegion derives bounded body geometry and transition-only insufficiency', async () => {
  const insufficient = jest.fn();
  await render(<ScrollableTextRegion testID="geometry" text="body" provenance="user" availableViewport={{ x: 0, y: 0, width: 300, height: 100 }} header={<Text>H</Text>} footer={<Text>F</Text>} onInsufficientViewport={insufficient} />);
  await fireEvent(screen.getByTestId('geometry-header'), 'layout', { nativeEvent: { layout: { height: 30 } } });
  await fireEvent(screen.getByTestId('geometry-footer'), 'layout', { nativeEvent: { layout: { height: 50 } } });
  expect(screen.getByTestId('geometry-fallback-scroll')).toBeTruthy();
  expect(StyleSheet.flatten(screen.getByTestId('geometry').props.style).height).toBeLessThanOrEqual(100);
  expect(insufficient).toHaveBeenCalledTimes(1);
  await fireEvent(screen.getByTestId('geometry-footer'), 'layout', { nativeEvent: { layout: { height: 50 } } });
  expect(insufficient).toHaveBeenCalledTimes(1);
});

test('ScrollableTextRegion applies protective viewport constraints after hostile caller style', async () => {
  await render(
    <ScrollableTextRegion
      testID="protected-shell"
      text="complete body"
      provenance="external"
      availableViewport={{ x: 0, y: 0, width: 320, height: 320 }}
      style={{ maxHeight: 9999, height: 9999 }}
    />,
  );
  const shellStyle = StyleSheet.flatten(screen.getByTestId('protected-shell').props.style);
  expect(shellStyle.height).toBeLessThanOrEqual(320);
  expect(shellStyle.maxHeight).toBeLessThanOrEqual(320);
});

test('ScrollableTextRegion uses a bounded accessible outer fallback when chrome exceeds viewport', async () => {
  const insufficient = jest.fn();
  const boundaryChanged = jest.fn();
  await render(
    <ScrollableTextRegion
      testID="fallback"
      text="complete fallback body"
      provenance="external"
      availableViewport={{ x: 0, y: 0, width: 320, height: 160 }}
      header={<Text>Complete header</Text>}
      footer={<Text>Complete two-hundred-percent footer</Text>}
      onInsufficientViewport={insufficient}
      onBodyScrollBoundaryChange={boundaryChanged}
    />,
  );
  await fireEvent(screen.getByTestId('fallback-header'), 'layout', { nativeEvent: { layout: { height: 40 } } });
  await fireEvent(screen.getByTestId('fallback-footer'), 'layout', { nativeEvent: { layout: { height: 320 } } });
  const shellStyle = StyleSheet.flatten(screen.getByTestId('fallback').props.style);
  expect(shellStyle.height).toBeLessThanOrEqual(160);
  expect(shellStyle.maxHeight).toBeLessThanOrEqual(160);
  const fallback = screen.getByTestId('fallback-fallback-scroll');
  expect(fallback.props.nestedScrollEnabled).toBe(true);
  expect(fallback.props.showsVerticalScrollIndicator).toBe(true);
  expect(fallback.props.scrollEventThrottle).toBe(16);
  expect(within(fallback).getByText('Complete header')).toBeTruthy();
  expect(within(fallback).getByText('complete fallback body')).toBeTruthy();
  expect(within(fallback).getByText('Complete two-hundred-percent footer')).toBeTruthy();
  expect(within(screen.getByTestId('fallback-fallback-body')).queryByText('Complete two-hundred-percent footer')).toBeNull();
  expect(screen.queryByTestId('fallback-scroll')).toBeNull();
  expect(insufficient).toHaveBeenCalledTimes(1);
  const send = (y: number) => fireEvent.scroll(fallback, { nativeEvent: { contentOffset: { y }, layoutMeasurement: { height: 100 }, contentSize: { height: 300 } } });
  await send(0); await send(0); await send(100); await send(200); await send(200);
  expect(boundaryChanged.mock.calls.map(([value]) => value)).toEqual([
    { atStart: true, atEnd: false },
    { atStart: false, atEnd: false },
    { atStart: false, atEnd: true },
  ]);
});

test('ScrollableTextRegion reports exact scroll boundary transitions conservatively', async () => {
  const changed = jest.fn();
  await render(<ScrollableTextRegion testID="bounds" text="body" provenance="external" availableViewport={{ x: 0, y: 0, width: 300, height: 200 }} onBodyScrollBoundaryChange={changed} />);
  const scroll = screen.getByTestId('bounds-scroll');
  const send = (y: number, height = 100, contentHeight = 300) => fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { y }, layoutMeasurement: { height }, contentSize: { height: contentHeight } } });
  await send(0); await send(0); await send(100); await send(200); await send(0, 100, 80); await send(Number.NaN);
  expect(changed.mock.calls.map(([value]) => value)).toEqual([
    { atStart: true, atEnd: false }, { atStart: false, atEnd: false }, { atStart: false, atEnd: true }, { atStart: true, atEnd: true },
  ]);
  expect(mockProbe).toHaveBeenCalledWith(expect.objectContaining({ semanticMode: 'scroll', text: 'body' }));
});

test('ScrollableTextRegion publishes valid layout/content boundaries and ignores malformed metrics', async () => {
  const first = jest.fn();
  const second = jest.fn();
  const view = await render(<ScrollableTextRegion testID="metrics" text="short" provenance="external" availableViewport={{ x: 0, y: 0, width: 300, height: 200 }} onBodyScrollBoundaryChange={first} />);
  const scroll = screen.getByTestId('metrics-scroll');
  await fireEvent(scroll, 'layout', { nativeEvent: { layout: { height: 100 } } });
  await fireEvent(scroll, 'contentSizeChange', 300, 80);
  expect(first).toHaveBeenLastCalledWith({ atStart: true, atEnd: true });
  await fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { y: -1 }, layoutMeasurement: { height: 100 }, contentSize: { height: 300 } } });
  expect(first).toHaveBeenLastCalledWith({ atStart: true, atEnd: false });
  const afterRubberBand = first.mock.calls.length;
  await fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { y: Number.NaN }, layoutMeasurement: { height: 100 }, contentSize: { height: 80 } } });
  expect(first).toHaveBeenCalledTimes(afterRubberBand);
  await view.rerender(<ScrollableTextRegion testID="metrics" text="short" provenance="external" availableViewport={{ x: 0, y: 0, width: 300, height: 200 }} onBodyScrollBoundaryChange={second} />);
  expect(second).toHaveBeenLastCalledWith({ atStart: true, atEnd: false });
});

test('ScrollableTextRegion replays current states after callbacks detach and reattach', async () => {
  const boundary = jest.fn(); const insufficient = jest.fn();
  const props = { testID: 'reattach', text: 'short', provenance: 'external' as const, availableViewport: { x: 0, y: 0, width: 300, height: 40 } };
  const view = await render(<ScrollableTextRegion {...props} onBodyScrollBoundaryChange={boundary} onInsufficientViewport={insufficient} />);
  const scroll = screen.getByTestId('reattach-fallback-scroll');
  await fireEvent(scroll, 'layout', { nativeEvent: { layout: { height: 40 } } });
  await fireEvent(scroll, 'contentSizeChange', 300, 20);
  expect(boundary).toHaveBeenCalledTimes(1); expect(insufficient).toHaveBeenCalledTimes(1);
  await view.rerender(<ScrollableTextRegion {...props} />);
  await view.rerender(<ScrollableTextRegion {...props} onBodyScrollBoundaryChange={boundary} onInsufficientViewport={insufficient} />);
  expect(boundary).toHaveBeenCalledTimes(2); expect(insufficient).toHaveBeenCalledTimes(2);
});

test('ScrollableTextRegion resets boundary delivery when switching scroll hosts and replays insufficient state to replacement callback', async () => {
  const boundary = jest.fn(); const insufficientA = jest.fn(); const insufficientB = jest.fn();
  const view = await render(<ScrollableTextRegion testID="switch" text="body" provenance="external" availableViewport={{ x: 0, y: 0, width: 300, height: 100 }} header={<Text>H</Text>} footer={<Text>F</Text>} onBodyScrollBoundaryChange={boundary} onInsufficientViewport={insufficientA} />);
  await fireEvent(screen.getByTestId('switch-header'), 'layout', { nativeEvent: { layout: { height: 30 } } });
  await fireEvent(screen.getByTestId('switch-footer'), 'layout', { nativeEvent: { layout: { height: 50 } } });
  expect(insufficientA).toHaveBeenCalledWith(20);
  await view.rerender(<ScrollableTextRegion testID="switch" text="body" provenance="external" availableViewport={{ x: 0, y: 0, width: 300, height: 100 }} header={<Text>H</Text>} footer={<Text>F</Text>} onBodyScrollBoundaryChange={boundary} onInsufficientViewport={insufficientB} />);
  expect(insufficientB).toHaveBeenCalledWith(20);
  const fallback = screen.getByTestId('switch-fallback-scroll');
  await fireEvent(fallback, 'layout', { nativeEvent: { layout: { height: 100 } } });
  await fireEvent(fallback, 'contentSizeChange', 300, 80);
  expect(boundary).toHaveBeenLastCalledWith({ atStart: true, atEnd: true });
});

test('ExpandableText previews at a word boundary and reveals complete localized copy', async () => {
  const text = 'one two three four five';
  await render(<ExpandableText testID="expand" provenance="user" text={text} previewCharacterBudget={13} />);
  const preview = screen.getByTestId('expand-text');
  expect(preview.props.children).toBe('one two three');
  expect(preview.props.children).not.toContain('…');
  expect(preview.props.accessibilityLabel).toBe(text);
  expect(mockProbe).toHaveBeenCalledWith(expect.objectContaining({ semanticMode: 'expand', text: 'one two three' }));
  const control = screen.getByRole('button', { name: expandableTextLabels('ru', false) });
  expect(control.props.accessibilityState).toEqual(expect.objectContaining({ expanded: false }));
  await userEvent.setup().press(control);
  expect(screen.getByTestId('expand-text').props.children).toBe(text);
  expect(screen.getByRole('button', { name: expandableTextLabels('ru', true) })).toBeTruthy();
});

test('ExpandableText handles short, unicode, locale, reset, and provenance guards', async () => {
  const labels = INTERFACE_LANGS.map((lang) => [expandableTextLabels(lang, false), expandableTextLabels(lang, true)]);
  for (const [show, hide] of labels) { expect(show).toBeTruthy(); expect(hide).toBeTruthy(); expect(show).not.toBe(hide); }
  const view = await render(<ExpandableText testID="short" provenance="external" text="short" />);
  expect(screen.queryByRole('button')).toBeNull();
  await view.rerender(<ExpandableText testID="unicode" provenance="external" text="😀😀😀😀" previewCharacterBudget={3} />);
  expect(screen.getByTestId('unicode-text').props.children).toBe('😀😀😀');
  await userEvent.setup().press(screen.getByRole('button'));
  await view.rerender(<ExpandableText testID="unicode" provenance="external" text="new complete value" previewCharacterBudget={3} />);
  expect(screen.getByTestId('unicode-text').props.children).toBe('new');
  await expect(render(<ExpandableText testID="bad" provenance={'authored' as any} text="private copy" />))
    .rejects.toThrow('ExpandableText requires user or external provenance');
  // @ts-expect-error authored instructional copy must never use ExpandableText.
  void <ExpandableText testID="typed-bad" provenance="authored" text="x" />;
});

test('ExpandableText previews whole grapheme clusters with and without Intl.Segmenter', () => {
  const samples = ['e\u0301x', '👍🏽x', '🇮🇪x', '👩‍💻x'];
  for (const sample of samples) expect(buildExpandablePreview(sample, 1)).toBe(sample.slice(0, -1));
  const descriptor = Object.getOwnPropertyDescriptor(Intl, 'Segmenter');
  Object.defineProperty(Intl, 'Segmenter', { configurable: true, value: undefined });
  try { for (const sample of samples) expect(buildExpandablePreview(sample, 1)).toBe(sample.slice(0, -1)); }
  finally { if (descriptor) Object.defineProperty(Intl, 'Segmenter', descriptor); }
  expect(buildExpandablePreview('😀'.repeat(100_000), 3)).toBe('😀😀😀');
});

test('ExpandableText collapses synchronously when identity or normalized budget changes', async () => {
  const text = 'one two three four';
  const view = await render(<ExpandableText testID="identity-a" provenance="user" text={text} previewCharacterBudget={3} />);
  await userEvent.setup().press(screen.getByRole('button'));
  expect(screen.getByTestId('identity-a-text').props.children).toBe(text);
  await view.rerender(<ExpandableText testID="identity-b" provenance="user" text={text} previewCharacterBudget={3} />);
  expect(screen.getByTestId('identity-b-text').props.children).toBe('one');
  await userEvent.setup().press(screen.getByRole('button'));
  await view.rerender(<ExpandableText testID="identity-b" provenance="user" text={text} previewCharacterBudget={7} />);
  expect(screen.getByTestId('identity-b-text').props.children).toBe('one two');
  await userEvent.setup().press(screen.getByRole('button'));
  await view.rerender(<ExpandableText testID="identity-a" provenance="user" text={text} previewCharacterBudget={3} />);
  expect(screen.getByTestId('identity-a-text').props.children).toBe('one');
  await userEvent.setup().press(screen.getByRole('button'));
  await view.rerender(<ExpandableText testID="identity-a" provenance="user" text={text} previewCharacterBudget={7} />);
  await view.rerender(<ExpandableText testID="identity-a" provenance="user" text={text} previewCharacterBudget={3} />);
  expect(screen.getByTestId('identity-a-text').props.children).toBe('one');
});

test('ExpandableText follows locale changes and strips unsafe runtime text props', async () => {
  const unsafe = { numberOfLines: 1, ellipsizeMode: 'tail', allowFontScaling: false, adjustsFontSizeToFit: true, minimumFontScale: 0.5 } as any;
  const view = await render(<ExpandableText testID="localized" provenance="user" text="one two three" previewCharacterBudget={3} {...unsafe} />);
  expect(screen.getByRole('button', { name: expandableTextLabels('ru', false) })).toBeTruthy();
  expect(screen.getByTestId('localized-text').props).toEqual(expect.not.objectContaining(unsafe));
  mockLang = 'pl';
  await view.rerender(<ExpandableText testID="localized" provenance="user" text="one two three" previewCharacterBudget={3} {...unsafe} />);
  expect(screen.getByRole('button', { name: expandableTextLabels('pl', false) })).toBeTruthy();
});

test.each(INTERFACE_LANGS)('ExpandableText renders and operates the real localized controls for %s', async (lang) => {
  mockLang = lang;
  const text = 'one two three four';
  await render(<ExpandableText testID={`locale-${lang}`} provenance="external" text={text} previewCharacterBudget={3} />);
  const show = screen.getByRole('button', { name: expandableTextLabels(lang, false) });
  await userEvent.setup().press(show);
  expect(screen.getByTestId(`locale-${lang}-text`).props.children).toBe(text);
  expect(screen.getByRole('button', { name: expandableTextLabels(lang, true) })).toBeTruthy();
});

test('dedicated RNTL config discovers TSX without replacing React Native', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const config = require('../jest.rntl.config.cjs') as {
    testMatch: string[];
    moduleNameMapper?: Record<string, string>;
  };
  expect(config.testMatch).toEqual([
    '<rootDir>/tests/text_integrity_primitives.test.tsx',
    '<rootDir>/tests/daily_tasks_text_integrity_render.test.tsx',
  ]);
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
