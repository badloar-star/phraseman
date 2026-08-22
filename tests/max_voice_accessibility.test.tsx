import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('MAX voice static accessibility release gates', () => {
  const session = read('app/max_call_session.tsx');
  const prestart = read('app/max_call_prestart.tsx');
  const review = read('app/max_voice_review.tsx');
  const memory = read('app/max_memory_settings.tsx');
  const captions = read('app/max_call_live_caption_view.tsx');
  const orb = read('components/max/MaxCallOrb.tsx');

  test('the animated orb is decorative and respects reduced motion', () => {
    expect(orb).toContain('accessible={false}');
    expect(orb).toContain('accessibilityElementsHidden');
    expect(orb).toContain('importantForAccessibility="no-hide-descendants"');
    expect(orb).toContain('useReduceMotion()');
  });

  test('captions announce one completed turn without a competing live region', () => {
    expect(captions).toContain('AccessibilityInfo.announceForAccessibility(`MAX: ${value}`)');
    expect(captions).not.toContain('accessibilityLiveRegion');
    expect(captions).toContain("style={{ minHeight: 132");
    expect(captions).not.toContain('height: 132,');
    expect(captions).not.toContain("overflow: 'hidden'");
    expect(captions).toContain('fontScale >= 1.6 ? 6');
  });

  test('the live call has one polite status owner and explicit terminal focus', () => {
    expect(session.match(/accessibilityLiveRegion="polite"/g)).toHaveLength(1);
    expect(session).toContain('accessibilityLiveRegion="assertive"');
    expect(session).toContain('AccessibilityInfo.setAccessibilityFocus(node)');
    expect(session).toContain('accessibilityLabel={failureActions.retry}');
    expect(session).toContain('accessibilityHint=');
  });

  test('prestart, review, and memory expose named large actions and outcomes', () => {
    expect(prestart).toContain('accessibilityHint={a11y.startHint}');
    expect(prestart).toContain('accessibilityHint={a11y.retryHint}');
    expect(prestart).toContain('minHeight: 52');

    expect(review).toContain('ref={readyTitleRef}');
    expect(review).toContain('AccessibilityInfo.setAccessibilityFocus(node)');
    expect(review).toContain('width: 48, height: 48');
    expect(review).toContain('maxFontSizeMultiplier={2}');

    expect(memory).toContain('accessibilityHint={L(\'clearHint\')}');
    expect(memory).toContain('iconAction: { minWidth: 48, minHeight: 48');
    expect(memory).toContain('accessibilityState={{ selected: active, disabled: busy }}');
  });

  test('physical device matrix is complete and cannot be mistaken for a pass', () => {
    const matrix = read('docs/qa/MAX_VOICE_DEVICE_MATRIX.md');
    const required = [
      'iPhone SE-size device',
      'Standard iPhone',
      'Large iPhone',
      'Small Android phone',
      'Standard Android phone',
      '200% text',
      'VoiceOver',
      'TalkBack',
      'Reduce Motion',
      'Bluetooth headset',
      'background → foreground',
      'Kill iOS app',
      'Finish offline',
      'Network drop with failed recovery',
      'Russian, Ukrainian, Spanish, Brazilian Portuguese, Vietnamese, Indonesian, Turkish, Polish',
      'external keyboard',
    ];
    required.forEach((value) => expect(matrix).toContain(value));
    expect(matrix).toContain('do **not** count as a physical');
    const matrixRows = matrix.split('\n').filter((line) => /^\| (?:IOS|AND|VO|TB|REDUCE|AUDIO|LIFE|KILL|OFFLINE|RECONNECT|LANG|INPUT)-/.test(line));
    expect(matrixRows.length).toBeGreaterThanOrEqual(20);
    matrixRows.forEach((row) => {
      expect(row).toContain('NOT RUN — physical device required');
      expect(row).toMatch(/\| pending \|$/);
    });
  });
});
