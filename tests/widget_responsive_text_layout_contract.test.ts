import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('phrase widget responsive text layout', () => {
  const android = read('modules/phrase-widget/android/src/main/java/app/phraseman/phrasewidget/PhraseGlanceWidget.kt');
  const androidPreview = read('modules/phrase-widget/android/src/main/res/layout/phrase_widget_preview.xml');
  const ios = read('targets/widget/PhraseWidget.swift');

  it('uses a bounded compact Android layout instead of overflowing an 80dp cell', () => {
    expect(android).toContain('val tiny = size.height < 84.dp');
    expect(android).toContain('val compact = size.height < 116.dp');
    expect(android).toContain('horizontal = if (compact) 14.dp else 18.dp');
    expect(android).toContain('tiny -> 6.dp');
    expect(android).toContain('maxLines = if (expanded) 3 else 2');
    expect(android).toContain('showTranscription = size.height >= 190.dp');
    expect(android).toContain('if (!compact && snapshot.canNavigate)');
    expect(android).toContain('actionRunCallback<PreviousPhraseAction>()');
    expect(android).toContain('actionRunCallback<NextPhraseAction>()');
  });

  it('keeps the Android picker preview inside the same compact line budget', () => {
    expect(androidPreview).toContain('android:paddingVertical="8dp"');
    expect(androidPreview).toContain('android:textSize="18sp"');
    expect(androidPreview).toContain('android:maxLines="2"');
    expect(androidPreview).toContain('android:maxLines="1"');
  });

  it('lets iOS constrain text to the widget family height', () => {
    expect(ios).not.toContain('.fixedSize(horizontal: false, vertical: true)');
    expect(ios).toContain('.layoutPriority(2)');
    expect(ios).toContain('.layoutPriority(1)');
    expect(ios.match(/\.lineLimit\(2\)/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('does not reintroduce two-line truncation for long phrases in the small iOS widget', () => {
    const smallStart = ios.indexOf('private var small: some View');
    const smallEnd = ios.indexOf('private var medium: some View', smallStart);
    const small = ios.slice(smallStart, smallEnd);

    expect(small).toContain('Text(entry.payload.english)');
    expect(small).toContain('.lineLimit(3)');
    expect(small).toContain('.minimumScaleFactor(0.55)');
    expect(small).toContain('.layoutPriority(2)');
  });
});
