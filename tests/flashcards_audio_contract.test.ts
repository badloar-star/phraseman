import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');
const audioRoute = fs.readFileSync(path.join(root, 'app', 'flashcards_audio.tsx'), 'utf8');
/**
 * Cards 2.1 §5.2: плитки режимов с хаба убраны — вход в «Слушать» теперь строит
 * нижний таббар раздела (`tabbar_state.buildFcTrainRoute`), иконка — в `FlashcardsTabBar`.
 */
const listenEntryRoute = fs.readFileSync(path.join(root, 'app', 'flashcards', 'tabbar_state.ts'), 'utf8');
const listenEntryUi = fs.readFileSync(path.join(root, 'app', 'flashcards', 'FlashcardsTabBar.tsx'), 'utf8');
const collectionRoute = fs.readFileSync(path.join(root, 'app', 'flashcards_collection.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
const appJson = fs.readFileSync(path.join(root, 'app.json'), 'utf8');

describe('flashcards auto-listen route contract', () => {
  // cards-2.0: режим слушания переехал на собственный экран
  // flashcards_listening_session (E10); старый /flashcards_audio остаётся
  // маршрутом-совместимостью и продолжает проверяться ниже.
  it('exposes foreground auto-listen entry points from section tab bar and collection', () => {
    expect(listenEntryRoute).toContain("pathname: '/flashcards_listening_session'");
    expect(listenEntryUi).toContain('headset-outline');
    expect(collectionRoute).toContain("'/flashcards_listening_session'");
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
