import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');
const audioRoute = fs.readFileSync(path.join(root, 'app', 'flashcards_audio.tsx'), 'utf8');
/** Passive flashcards listening was removed; old deep links redirect safely. */
const listenEntryRoute = fs.readFileSync(path.join(root, 'app', 'flashcards', 'tabbar_state.ts'), 'utf8');
const listenEntryUi = fs.readFileSync(path.join(root, 'app', 'flashcards', 'FlashcardsTabBar.tsx'), 'utf8');
const collectionRoute = fs.readFileSync(path.join(root, 'app', 'flashcards_collection.tsx'), 'utf8');

describe('removed flashcards auto-listen route contract', () => {
  it('does not expose the removed passive listening mode from Cards surfaces', () => {
    expect(listenEntryRoute).not.toContain('flashcards_listening_session');
    expect(listenEntryRoute).not.toContain("option === 'listen'");
    expect(listenEntryUi).not.toContain('headset-outline');
    expect(collectionRoute).not.toContain('flashcards_listening_session');
  });

  it('redirects historical deep links instead of exposing the old workout', () => {
    expect(audioRoute).toContain('<Redirect href="/flashcards" />');
    expect(audioRoute).not.toContain('buildFlashcardAudioDeck');
    expect(audioRoute).not.toContain("useFeatureAccess('flashcards')");
  });
});
