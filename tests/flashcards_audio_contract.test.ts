import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');
const audioRoute = fs.readFileSync(path.join(root, 'app', 'flashcards_audio.tsx'), 'utf8');
const hubRoute = fs.readFileSync(path.join(root, 'app', 'flashcards.tsx'), 'utf8');
const collectionRoute = fs.readFileSync(path.join(root, 'app', 'flashcards_collection.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
const appJson = fs.readFileSync(path.join(root, 'app.json'), 'utf8');

describe('flashcards auto-listen route contract', () => {
  it('exposes foreground auto-listen entry points from hub and collection', () => {
    expect(hubRoute).toContain("pathname: '/flashcards_audio'");
    expect(hubRoute).toContain('onAudioPress={openAudioMode}');
    expect(collectionRoute).toContain("pathname: '/flashcards_audio'");
    expect(collectionRoute).toContain('headset-outline');
  });

  it('keeps the route target-aware and source-language aware', () => {
    expect(audioRoute).toContain('useStudyTarget()');
    expect(audioRoute).toContain('flashcardContentLang(lang, studyTarget)');
    expect(audioRoute).toContain('buildTrainingCardsFromSources');
    expect(audioRoute).toContain('speechLanguageForSide');
  });

  it('stays foreground-only without background audio dependencies or config', () => {
    expect(audioRoute).not.toContain('expo-audio');
    expect(audioRoute).not.toContain('expo-av');
    expect(appJson).not.toContain('UIBackgroundModes');
    expect(audioRoute).not.toContain('staysActiveInBackground');
  });
});
