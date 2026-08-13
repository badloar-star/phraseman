import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('personal phrase widget native contract', () => {
  test('Android stores source and cursor per app-widget instance and exposes a configuration activity', () => {
    const widget = read('modules/phrase-widget/android/src/main/java/app/phraseman/phrasewidget/PhraseGlanceWidget.kt');
    const manifest = read('modules/phrase-widget/android/src/main/AndroidManifest.xml');
    const strings = read('modules/phrase-widget/android/src/main/res/values/strings.xml');
    expect(widget).toContain('sourceForWidget');
    expect(widget).toContain('cursorForWidget');
    expect(widget).toContain('actionRunCallback');
    expect(widget).toContain('Personal deck requires Plus');
    expect(widget).toContain('Previous');
    expect(widget).toContain('Next');
    expect(strings).toContain('phrase_widget_kicker');
    expect(strings).not.toContain('ФРАЗА ДНЯ');
    expect(manifest).toContain('PhraseWidgetConfigureActivity');
  });

  test('iOS uses a per-instance WidgetKit configuration and explicit previous/next controls', () => {
    const widget = read('targets/widget/PhraseWidget.swift');
    const payload = read('targets/widget/PhrasePayload.swift');
    expect(widget).toContain('AppIntentConfiguration');
    expect(widget).toContain('WidgetConfigurationIntent');
    expect(widget).toContain('PreviousPhraseIntent');
    expect(widget).toContain('NextPhraseIntent');
    expect(widget).toContain('Personal deck');
    expect(widget).toContain('accessibilityLabel("Previous card")');
    expect(widget).toContain('accessibilityLabel("Next card")');
    expect(payload).toContain('Open Phraseman to use your Plus deck.');
    expect(payload).toContain('var canNavigate: Bool');
    expect(read('targets/widget/PhraseProvider.swift')).toContain('.personalPlaceholder');
    expect(read('targets/widget/PhraseProvider.swift')).toContain('LegacyPhraseProvider');
    expect(read('targets/widget/expo-target.config.js')).toContain("deploymentTarget: '16.0'");
    expect(payload).toContain('decks');
    expect(payload).toContain('access');
  });

  test('deck deep links route to the corresponding card in the collection', () => {
    const intent = read('app/+native-intent.tsx');
    const collection = read('app/flashcards_collection.tsx');
    expect(intent).toContain('deck\\/(saved|created)');
    expect(collection).toContain('widgetCard');
  });
});
