import fs from 'fs';
import path from 'path';

import {
  buildSafeAreaViewport,
  convertNativeLinesToIntrinsicMetrics,
  convertTextLayoutLinesToIntrinsicMetrics,
  createTextIntegrityRequestCoordinator,
  createTextIntegrityProbeSession,
} from '../components/text-integrity/text_integrity_probe';
import type { TextIntegrityMeasurement } from '../components/text-integrity/types';

const PRIVATE_TEXT = 'my private recovery phrase';

function measurement(overrides: Partial<TextIntegrityMeasurement> = {}): TextIntegrityMeasurement {
  return {
    route: '/lesson',
    testID: 'lesson-title',
    locale: 'ru',
    window: { width: 390, height: 844 },
    fontScale: 1.25,
    semanticMode: 'flow',
    provenance: 'authored',
    rawText: PRIVATE_TEXT,
    intrinsicText: {
      height: 48,
      maxLineWidth: 220,
      lineCount: 2,
      visibleLineCount: 2,
      hasNativeTruncation: false,
    },
    viewport: { x: 0, y: 0, width: 390, height: 844 },
    safeAreaViewport: { x: 0, y: 44, width: 390, height: 766 },
    ...overrides,
  };
}

describe('text integrity probe', () => {
  test('reports clipping with complete privacy-safe metadata', async () => {
    const session = createTextIntegrityProbeSession({ salt: 'session-a', hasher: async () => 'digest' });
    const result = await session.inspect(measurement({
      hostBounds: { x: 20, y: 100, width: 180, height: 30 },
    }));

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      kind: 'local-clipping', route: '/lesson', testID: 'lesson-title', locale: 'ru',
      window: { width: 390, height: 844 }, fontScale: 1.25, semanticMode: 'flow',
      provenance: 'authored', contentLength: PRIVATE_TEXT.length, contentHash: 'digest',
      hostBounds: { x: 20, y: 100, width: 180, height: 30 },
    });
    expect(JSON.stringify(result)).not.toContain(PRIVATE_TEXT);
  });

  test('does not invent clipping when no host was registered', async () => {
    const result = await createTextIntegrityProbeSession({ salt: 'a', hasher: async () => 'h' })
      .inspect(measurement());
    expect(result).toEqual([]);
  });

  test('detects explicit native truncation without a host', async () => {
    const result = await createTextIntegrityProbeSession({ salt: 'a', hasher: async () => 'h' })
      .inspect(measurement({ intrinsicText: {
        height: 20, maxLineWidth: 100, lineCount: 3, visibleLineCount: 2, hasNativeTruncation: false,
      } }));
    expect(result.map((item) => item.kind)).toEqual(['native-truncation']);
  });

  test('reports clipping, off-screen host, and off-screen action together', async () => {
    const result = await createTextIntegrityProbeSession({ salt: 'a', hasher: async () => 'h' })
      .inspect(measurement({
        hostBounds: { x: -2, y: 100, width: 100, height: 20 },
        actionBounds: { x: 350, y: 100, width: 60, height: 40 },
      }));
    expect(result.map((item) => item.kind)).toEqual([
      'local-clipping', 'off-screen-host', 'off-screen-action',
    ]);
  });

  test('safe-area containment honors an inclusive tolerance boundary', async () => {
    const session = createTextIntegrityProbeSession({ salt: 'a', hasher: async () => 'h', tolerance: 1 });
    const within = await session.inspect(measurement({
      hostBounds: { x: -1, y: 43, width: 392, height: 20 },
      intrinsicText: { height: 20, maxLineWidth: 100, lineCount: 1, visibleLineCount: 1, hasNativeTruncation: false },
    }));
    const outside = await session.inspect(measurement({
      testID: 'outside', hostBounds: { x: -1.01, y: 43, width: 100, height: 20 },
      intrinsicText: { height: 20, maxLineWidth: 100, lineCount: 1, visibleLineCount: 1, hasNativeTruncation: false },
    }));
    expect(within).toEqual([]);
    expect(outside.map((item) => item.kind)).toEqual(['off-screen-host']);
  });

  test('session salts change hashes and hasher failure safely omits the hash', async () => {
    const hasher = async (value: string) => `hash:${value}`;
    const a = await createTextIntegrityProbeSession({ salt: 'salt-a', hasher }).inspect(measurement({
      intrinsicText: { height: 1, maxLineWidth: 1, lineCount: 2, visibleLineCount: 1, hasNativeTruncation: true },
    }));
    const b = await createTextIntegrityProbeSession({ salt: 'salt-b', hasher }).inspect(measurement({
      intrinsicText: { height: 1, maxLineWidth: 1, lineCount: 2, visibleLineCount: 1, hasNativeTruncation: true },
    }));
    const failed = await createTextIntegrityProbeSession({
      salt: 'secret-salt', hasher: async () => { throw new Error(PRIVATE_TEXT); },
    }).inspect(measurement({
      intrinsicText: { height: 1, maxLineWidth: 1, lineCount: 2, visibleLineCount: 1, hasNativeTruncation: true },
    }));
    expect(a[0].contentHash).not.toBe(b[0].contentHash);
    expect(failed[0].contentHash).toBeUndefined();
    expect(JSON.stringify(failed)).not.toContain(PRIVATE_TEXT);
  });

  test('deduplicates repeats, bounds FIFO to 200, returns copies, and resets explicitly', async () => {
    const session = createTextIntegrityProbeSession({ salt: 'a', hasher: async () => 'same' });
    const truncated = (testID: string) => measurement({ testID, intrinsicText: {
      height: 1, maxLineWidth: 1, lineCount: 2, visibleLineCount: 1, hasNativeTruncation: true,
    } });
    await session.inspect(truncated('repeat'));
    await session.inspect(truncated('repeat'));
    for (let index = 0; index < 201; index += 1) await session.inspect(truncated(`item-${index}`));
    const firstRead = session.read();
    expect(firstRead).toHaveLength(200);
    expect(firstRead.some((item) => item.testID === 'repeat')).toBe(false);
    firstRead.pop();
    expect(session.read()).toHaveLength(200);
    session.clear();
    expect(session.read()).toEqual([]);
  });

  test('disabled session calls neither hasher nor store', async () => {
    const hasher = jest.fn(async () => 'hash');
    const session = createTextIntegrityProbeSession({ devEnabled: false, salt: 'a', hasher });
    expect(await session.inspect(measurement({ intrinsicText: {
      height: 1, maxLineWidth: 1, lineCount: 2, visibleLineCount: 1, hasNativeTruncation: true,
    } }))).toEqual([]);
    expect(hasher).not.toHaveBeenCalled();
    expect(session.read()).toEqual([]);
  });

  test('geometry-only measurements skip completeness comparison and hashing', async () => {
    const hasher = jest.fn(async () => 'must-not-run');
    const session = createTextIntegrityProbeSession({ salt: 'safe', hasher });
    const result = await session.inspect(measurement({
      rawText: undefined,
      hostBounds: { x: 0, y: 0, width: 20, height: 10 },
      intrinsicText: {
        height: 20,
        maxLineWidth: 40,
        lineCount: 1,
        visibleLineCount: 1,
        hasNativeTruncation: false,
      },
    }));
    expect(result.map((item) => item.kind)).toContain('local-clipping');
    expect(result[0]).toEqual(expect.objectContaining({ contentLength: 0 }));
    expect(result[0]).not.toHaveProperty('contentHash');
    expect(hasher).not.toHaveBeenCalled();
  });

  test('cancellation while hashing prevents a late store mutation', async () => {
    let finishHash: ((hash: string) => void) | undefined;
    const hasher = () => new Promise<string>((resolve) => { finishHash = resolve; });
    const session = createTextIntegrityProbeSession({ salt: 'a', hasher });
    let active = true;
    const pending = session.inspect(measurement({ intrinsicText: {
      height: 1, maxLineWidth: 1, lineCount: 2, visibleLineCount: 1, hasNativeTruncation: true,
    } }), () => active);
    active = false;
    finishHash?.('hash');

    expect(await pending).toEqual([]);
    expect(session.read()).toEqual([]);
  });

  test('records retain neither raw text nor session salt', async () => {
    const session = createTextIntegrityProbeSession({ salt: 'never-store-this', hasher: async () => 'h' });
    await session.inspect(measurement({ intrinsicText: {
      height: 1, maxLineWidth: 1, lineCount: 2, visibleLineCount: 1, hasNativeTruncation: true,
    } }));
    const json = JSON.stringify(session.read());
    expect(json).not.toContain(PRIVATE_TEXT);
    expect(json).not.toContain('never-store-this');
    expect(json).not.toContain('rawText');
  });

  test('pure helpers convert line metrics and derive the safe viewport', () => {
    expect(convertNativeLinesToIntrinsicMetrics([
      { width: 120, height: 18 }, { width: 150, height: 20 },
    ], 1, true)).toEqual({
      height: 38, maxLineWidth: 150, lineCount: 2, visibleLineCount: 1, hasNativeTruncation: true,
    });
    expect(buildSafeAreaViewport({ width: 390, height: 844 }, { top: 44, right: 10, bottom: 34, left: 8 }))
      .toEqual({ x: 8, y: 44, width: 372, height: 766 });
  });

  test('hook-path conversion recognizes complete wrapped text without retaining it', () => {
    const metrics = convertTextLayoutLinesToIntrinsicMetrics([
      { width: 120, height: 18, text: 'A complete' },
      { width: 150, height: 20, text: 'wrapped phrase' },
    ], 'A complete wrapped phrase');

    expect(metrics).toEqual({
      height: 38, maxLineWidth: 150, lineCount: 2, visibleLineCount: 2, hasNativeTruncation: false,
    });
    expect(JSON.stringify(metrics)).not.toContain('complete');
    expect(metrics).not.toHaveProperty('text');
  });

  test('hook-path conversion detects a missing expected tail', () => {
    expect(convertTextLayoutLinesToIntrinsicMetrics([
      { width: 120, height: 18, text: 'A phrase whose tail' },
    ], 'A phrase whose tail is missing').hasNativeTruncation).toBe(true);
  });

  test('literal ellipsis is not truncation when expected and rendered text match', () => {
    expect(convertTextLayoutLinesToIntrinsicMetrics([
      { width: 120, height: 18, text: 'Wait… really?' },
    ], 'Wait… really?').hasNativeTruncation).toBe(false);
  });

  test('whitespace and line wrapping differences do not create false truncation', () => {
    expect(convertTextLayoutLinesToIntrinsicMetrics([
      { width: 100, height: 18, text: 'one   two' },
      { width: 100, height: 18, text: 'three' },
    ], ' one two\n three ').hasNativeTruncation).toBe(false);
  });

  test('single-line missing whitespace is treated as incomplete text', () => {
    expect(convertTextLayoutLinesToIntrinsicMetrics([
      { width: 100, height: 18, text: 'ab' },
    ], 'a b').hasNativeTruncation).toBe(true);
  });

  test('multiline missing internal whitespace is treated as incomplete text', () => {
    expect(convertTextLayoutLinesToIntrinsicMetrics([
      { width: 100, height: 18, text: 'ab' },
      { width: 100, height: 18, text: 'c' },
    ], 'a b c').hasNativeTruncation).toBe(true);
  });

  test('latest request wins when deferred hashes complete out of order', async () => {
    const coordinator = createTextIntegrityRequestCoordinator();
    const resolvers = new Map<string, (hash: string) => void>();
    const hasher = jest.fn((value: string) => new Promise<string>((resolve) => {
      resolvers.set(value.includes('first') ? 'first' : 'second', resolve);
    }));
    const session = createTextIntegrityProbeSession({ salt: 'salt', hasher });
    const first = coordinator.begin();
    const firstPending = session.inspect(measurement({
      testID: 'first', rawText: 'first', intrinsicText: {
        height: 1, maxLineWidth: 1, lineCount: 2, visibleLineCount: 1, hasNativeTruncation: true,
      },
    }), first.isLatest);
    const second = coordinator.begin();
    const secondPending = session.inspect(measurement({
      testID: 'second', rawText: 'second', intrinsicText: {
        height: 1, maxLineWidth: 1, lineCount: 2, visibleLineCount: 1, hasNativeTruncation: true,
      },
    }), second.isLatest);
    resolvers.get('second')?.('second-hash');
    await secondPending;
    resolvers.get('first')?.('first-hash');
    await firstPending;

    expect(session.read().map((item) => item.testID)).toEqual(['second']);
  });

  test('known-stale request never hashes and post-hash cancellation never commits', async () => {
    const coordinator = createTextIntegrityRequestCoordinator();
    const hasher = jest.fn(async () => 'hash');
    const session = createTextIntegrityProbeSession({ salt: 'salt', hasher });
    const stale = coordinator.begin();
    coordinator.invalidate();
    await session.inspect(measurement({ intrinsicText: {
      height: 1, maxLineWidth: 1, lineCount: 2, visibleLineCount: 1, hasNativeTruncation: true,
    } }), stale.isLatest);
    expect(hasher).not.toHaveBeenCalled();

    let resolveHash: ((value: string) => void) | undefined;
    const deferredSession = createTextIntegrityProbeSession({
      salt: 'salt', hasher: () => new Promise((resolve) => { resolveHash = resolve; }),
    });
    const active = coordinator.begin();
    const pending = deferredSession.inspect(measurement({ intrinsicText: {
      height: 1, maxLineWidth: 1, lineCount: 2, visibleLineCount: 1, hasNativeTruncation: true,
    } }), active.isLatest);
    coordinator.invalidate();
    resolveHash?.('hash');
    expect(await pending).toEqual([]);
    expect(deferredSession.read()).toEqual([]);
  });

  test.each([
    ['hostBounds.x', { hostBounds: { x: Number.NaN, y: 0, width: 1, height: 1 } }],
    ['actionBounds.width', { actionBounds: { x: 0, y: 0, width: -1, height: 1 } }],
    ['safeAreaViewport.height', { safeAreaViewport: { x: 0, y: 0, width: 1, height: Number.POSITIVE_INFINITY } }],
    ['intrinsicText.lineCount', { intrinsicText: { height: 1, maxLineWidth: 1, lineCount: -1, visibleLineCount: 0, hasNativeTruncation: false } }],
    ['intrinsicText.visibleLineCount', { intrinsicText: { height: 1, maxLineWidth: 1, lineCount: 1, visibleLineCount: 2, hasNativeTruncation: false } }],
    ['fontScale', { fontScale: Number.NaN }],
    ['window.width', { window: { width: Number.POSITIVE_INFINITY, height: 100 } }],
  ])('fails closed for invalid %s without retaining invalid geometry', async (field, overrides) => {
    const session = createTextIntegrityProbeSession({ salt: 'salt', hasher: async () => 'hash' });
    const result = await session.inspect(measurement(overrides as Partial<TextIntegrityMeasurement>));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ kind: 'invalid-geometry', invalidFields: [field] });
    const json = JSON.stringify(result);
    expect(json).not.toMatch(/NaN|Infinity/);
    expect(json).not.toContain(PRIVATE_TEXT);
  });

  test.each([Number.NaN, Number.POSITIVE_INFINITY, -1])('rejects invalid tolerance %p safely', (tolerance) => {
    expect(() => createTextIntegrityProbeSession({ tolerance })).toThrow('TEXT_INTEGRITY_INVALID_TOLERANCE');
  });

  test('production hook import does not initialize probe or expo crypto', () => {
    const devGlobal = globalThis as typeof globalThis & { __DEV__: boolean };
    const previousDev = devGlobal.__DEV__;
    try {
      devGlobal.__DEV__ = false;
      jest.isolateModules(() => {
        jest.doMock('../components/text-integrity/text_integrity_probe', () => {
          throw new Error('probe initialized');
        });
        jest.doMock('expo-crypto', () => {
          throw new Error('crypto initialized');
        });
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        expect(() => require('../components/text-integrity/use_text_integrity_probe')).not.toThrow();
      });
    } finally {
      devGlobal.__DEV__ = previousDev;
      jest.dontMock('../components/text-integrity/text_integrity_probe');
      jest.dontMock('expo-crypto');
    }
  });

  test('source is ephemeral and production export statically selects a measurement-free noop', () => {
    const root = path.resolve(__dirname, '..', 'components', 'text-integrity');
    const sources = ['types.ts', 'text_integrity_hash.ts', 'text_integrity_probe.ts', 'use_text_integrity_probe.ts']
      .map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
    expect(sources).not.toMatch(/AsyncStorage|Firestore|analytics|console\.|setTimeout|setInterval|addEventListener|onSnapshot/);
    const hook = fs.readFileSync(path.join(root, 'use_text_integrity_probe.ts'), 'utf8');
    expect(hook).toMatch(/export const useTextIntegrityProbe\s*=\s*__DEV__\s*\?/);
    expect(hook).toMatch(/const devDependencies\s*=\s*__DEV__\s*\?\s*require\('\.\/text_integrity_probe'\)\s*:\s*undefined/);
    expect(hook).toMatch(/input\.hostRef,\s*input\.actionRef,/);
    expect(hook).toMatch(/convertTextLayoutLinesToIntrinsicMetrics\(event\.nativeEvent\.lines,\s*input\.text\)/);
    expect(hook).not.toMatch(/event\.nativeEvent\.lines\.map[\s\S]*convertNativeLinesToIntrinsicMetrics\(lines\)/);
    const noop = hook.slice(hook.indexOf('function useNoopTextIntegrityProbe'), hook.indexOf('function useDevTextIntegrityProbe'));
    expect(noop).not.toMatch(/useWindowDimensions|useStableSafeAreaInsets|measureInWindow|\.inspect\(|hash/);
  });
});
