import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'ReleaseNotesModal.tsx'),
  'utf8',
);
const announcementBranch = source.slice(source.indexOf('{announcement ? ('), source.indexOf('<DuoPressable', source.indexOf('{announcement ? (')));

const announcementScrollStart = announcementBranch.indexOf('<ScrollView');
const announcementStageIndex = announcementBranch.indexOf('styles.announcementStageOuter');
const announcementTitleIndex = announcementBranch.indexOf('displayTx.title');
const announcementBodyIndex = announcementBranch.indexOf('announcement.body');

assert.match(source, /import \{ liquidGlassTokens \} from '\.\.\/constants\/liquidGlassThemePalette';/);
assert.match(source, /const \{ f, liquidGlassThemeId \} = useTheme\(\);/);
assert.match(source, /const announcementGlass = liquidGlassTokens\(liquidGlassThemeId\);/);
assert.match(announcementBranch, /styles\.announcementStage/);
assert.match(announcementBranch, /styles\.announcementStageOuter/);
assert.match(announcementBranch, /<Ionicons name="chatbubble-ellipses-outline" size=\{28\} color=\{announcementGlass\.lightTint\} \/>/);
assert.match(announcementBranch, /pointerEvents="none"/);
assert.match(announcementBranch, /colors=\{\[announcementGlass\.selected, announcementGlass\.opaqueControl\]\}/);
assert.match(announcementBranch, /colors=\{\[announcementGlass\.lightTint, 'transparent'\]\}/);
assert.match(source, /announcementStageOuter:[\s\S]*width: 108,[\s\S]*height: 108,[\s\S]*borderRadius: 34/);
assert.match(source, /announcementStage:[\s\S]*width: '100%',[\s\S]*height: '100%',[\s\S]*overflow: 'hidden'/);
assert.match(source, /announcementStageRim:[\s\S]*position: 'absolute',[\s\S]*top: 1/);
assert.doesNotMatch(source.slice(source.indexOf('announcementStageOuter:'), source.indexOf('announcementStage:')), /overflow|borderWidth|borderColor/);
assert.doesNotMatch(source.slice(source.indexOf('announcementStage:'), source.indexOf('announcementStageRim:')), /borderWidth|borderColor/);
assert.ok(announcementScrollStart >= 0 && announcementStageIndex > announcementScrollStart, 'stage must scroll with long announcement content');
assert.ok(announcementTitleIndex > announcementScrollStart, 'title must scroll with long announcement content');
assert.ok(announcementBodyIndex > announcementScrollStart, 'body must scroll with long announcement content');
const announcementCardStyles = source.slice(source.indexOf('announcementCard:'), source.indexOf('closeButton:'));
const announcementContentStyles = source.slice(source.indexOf('announcementContent:'), source.indexOf('announcementStageOuter:'));
const announcementScrollStyles = source.slice(source.indexOf('announcementScroll:'), source.indexOf('announcementScrollInner:'));
assert.doesNotMatch(announcementCardStyles, /height:/, 'short announcements must keep content-sized modal geometry');
assert.match(source, /card:[\s\S]*maxHeight: '86%'/);
assert.match(announcementContentStyles, /flexShrink: 1/);
assert.match(announcementScrollStyles, /flexGrow: 0,[\s\S]*flexShrink: 1/);
assert.match(source, /onPress=\{closeOnce\}/);
assert.match(source, /announcement\.body/);
assert.match(source, /accessibilityLabel=\{displayTx\.cta\}/);

console.log('release-notes announcement stage contract: PASS');
