import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../components/ReportReplyHomeBanner.tsx', import.meta.url), 'utf8');
const home = readFileSync(new URL('../app/(tabs)/home.tsx', import.meta.url), 'utf8');

function pressableOpeningTag(content, marker) {
  const tag = (content.match(/<PressableHybrid\b[^>]*>/g) ?? []).find((candidate) => candidate.includes(marker));
  assert.ok(tag, `PressableHybrid opening tag containing ${marker} is present`);
  return tag;
}

function assertCardFeedbackDisabled(tag) {
  assert.match(tag, /variant="card"/, 'whole-banner target remains the card variant');
  assert.match(tag, /onPress=\{open\}/, 'whole-banner target opens the reply');
  assert.match(tag, /withHaptic=\{false\}/, 'whole-banner target does not duplicate callback haptics');
  assert.match(tag, /withSound=\{false\}/, 'whole-banner target does not add a tap sound');
}

function assertCloseFeedbackDisabled(tag) {
  assert.match(tag, /variant="icon"/, 'close target remains the icon variant');
  assert.match(tag, /onPress=\{dismiss\}/, 'close target dismisses without opening');
  assert.match(tag, /withHaptic=\{false\}/, 'close target does not duplicate callback haptics');
  assert.match(tag, /withSound=\{false\}/, 'close target does not add a tap sound');
}

test('ReportReplyHomeBanner uses the active neutral Liquid Glass material without changing reply behavior', () => {
  assert.match(source, /import PressableHybrid from '\.\/PressableHybrid';/, 'banner uses the established hybrid press surface');
  assert.match(source, /import \{ LinearGradient \} from '\.\/SafeLinearGradient';/, 'banner uses the safe gradient material');
  assert.match(source, /import \{ liquidGlassTokens \} from '\.\.\/constants\/liquidGlassThemePalette';/, 'banner reads the 13-theme glass registry');
  assert.match(source, /import \{ TOAST \} from '\.\.\/constants\/motionHybrid';/, 'banner animation durations use shared toast tokens');
  assert.match(source, /const glass = liquidGlassTokens\(liquidGlassThemeId\);/, 'banner resolves active glass tokens');
  assert.match(source, /colors=\{\[glass\.opaqueCard, glass\.selected, glass\.opaqueCard\]\}/, 'neutral glass card material replaces the green background');
  assert.match(source, /borderColor: glass\.glassEdge/, 'glass edge is retained');
  assert.match(source, /backgroundColor: glass\.selected/, 'icon tile uses neutral selected material');
  assert.match(source, /borderRadius: 21/, 'banner uses the approved 21dp radius');
  assert.match(source, /import \{ FONT_SCALE, useTheme \} from '\.\/ThemeContext';/, 'banner imports the existing in-app font preference scale');
  assert.match(source, /const \{ liquidGlassThemeId, fontSize, uiScale \} = useTheme\(\);/, 'banner reads active theme and in-app scale preferences');
  assert.match(source, /const textScale = \(FONT_SCALE\[fontSize\] \/ FONT_SCALE\.medium\) \* uiScale;/, 'banner normalizes the approved 14/19 base against the existing medium preference');
  assert.match(source, /fontSize: 14 \* textScale, lineHeight: 19 \* textScale, fontWeight: '700'/, 'title preserves the approved 14/19 base while honoring in-app preferences');
  assert.match(source, /minHeight: 72/, 'banner minimum height is preserved');
  assert.match(source, /paddingLeft: 14, paddingRight: 74, paddingVertical: 12/, 'banner retains the approved content padding and close clearance');
  assert.match(source, /paddingRight: 74/, 'open target reserves the close hit target');
  assert.match(source, /width: 41, height: 41, borderRadius: 10/, 'icon tile matches the approved 41dp geometry');
  assert.match(source, /name="chatbox-ellipses" size=\{20\}/, 'icon tile uses the approved 20dp icon');
  assert.match(source, /gap: 11/, 'banner uses the approved 11dp content gap');
  assert.match(source, /top: 8, right: 7, width: 48, height: 48/, 'dismiss target is an independent 48dp control');
  const cardTag = pressableOpeningTag(source, 'variant="card"');
  const closeTag = pressableOpeningTag(source, 'testID="home-report-reply-banner-close"');
  assertCardFeedbackDisabled(cardTag);
  assertCloseFeedbackDisabled(closeTag);
  const sourceWithoutCardHaptic = source.replace(cardTag, cardTag.replace('withHaptic={false}', ''));
  const sourceWithoutCardSound = source.replace(cardTag, cardTag.replace('withSound={false}', ''));
  assert.throws(
    () => assertCardFeedbackDisabled(pressableOpeningTag(sourceWithoutCardHaptic, 'variant="card"')),
    /whole-banner target does not duplicate callback haptics/,
    'removing the card haptic opt-out from a source copy fails the card-only check',
  );
  assert.throws(
    () => assertCardFeedbackDisabled(pressableOpeningTag(sourceWithoutCardSound, 'variant="card"')),
    /whole-banner target does not add a tap sound/,
    'removing the card sound opt-out from a source copy fails the card-only check',
  );
  assert.match(source, /const REPORT_REPLY_BANNER_ENTERING = FadeInDown\.duration\(TOAST\.enterMs\);/, 'entry builder is module-scoped and tokenized');
  assert.match(source, /const REPORT_REPLY_BANNER_EXITING = FadeOutUp\.duration\(TOAST\.exitMs\);/, 'exit builder is module-scoped and tokenized');
  assert.match(source, /entering=\{reduceMotion \? undefined : REPORT_REPLY_BANNER_ENTERING\}/, 'entry animation uses the shared builder without springification');
  assert.match(source, /exiting=\{reduceMotion \? undefined : REPORT_REPLY_BANNER_EXITING\}/, 'exit animation uses the shared builder');
  assert.match(source, /persistDismissed\(owner, selected\.id\)/, 'opening still persists dismissal');
  assert.match(source, /onOpen\(selected\)/, 'opening still routes to the existing callback');
  assert.match(source, /persistDismissed\(owner, id\)/, 'dismissing still persists dismissal');
  assert.match(source, /latestUnreadReportReply/, 'unread reply selection remains intact');
  assert.doesNotMatch(source, /numberOfLines|ellipsizeMode/, 'reply label must wrap rather than truncate');
  const lesson = home.indexOf('testID="home-continue-lesson"');
  const banner = home.indexOf('<ReportReplyHomeBanner');
  const followingQueue = home.indexOf('{/* Домашние подсказки', banner);
  assert.ok(lesson >= 0 && banner > lesson && followingQueue > banner, 'banner remains directly after the last lesson before the following queue');
  assert.ok(home.includes('onOpen={handleReportReplyBannerOpen}'), 'home keeps the existing reply-open callback');
});
