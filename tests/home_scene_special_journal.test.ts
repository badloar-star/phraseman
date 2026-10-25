/**
 * [HOME-SCENE] Журнал показов особых сцен — локально: память сразу, диск фоном; сбой диска не роняет сцену.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn() } }));

import {
  HOME_SCENE_SPECIAL_JOURNAL_KEY,
  __resetHomeSceneSpecialJournalForTests,
  noteHomeSceneSpecialShown,
  peekHomeSceneSpecialJournal,
  readHomeSceneSpecialJournal,
} from '../components/home/v2/scene/home_scene_special_journal';
import { HOME_SCENE_SPECIAL_EMPTY_JOURNAL } from '../components/home/v2/scene/home_scene_special';

const NOW = new Date(2026, 9, 21, 12);

beforeEach(async () => { __resetHomeSceneSpecialJournalForTests(); await AsyncStorage.clear(); });

describe('[HOME-SCENE] журнал особых сцен', () => {
  it('пустой диск → пустой журнал; показ пишется в память сразу и на диск', async () => {
    expect(peekHomeSceneSpecialJournal()).toBeNull();
    expect(await readHomeSceneSpecialJournal()).toEqual(HOME_SCENE_SPECIAL_EMPTY_JOURNAL);
    const j = noteHomeSceneSpecialShown('words_due', null, NOW);
    expect(peekHomeSceneSpecialJournal()).toBe(j);
    await Promise.resolve();
    const raw = await AsyncStorage.getItem(HOME_SCENE_SPECIAL_JOURNAL_KEY);
    expect(JSON.parse(raw ?? '{}').last).toEqual({ state: 'words_due', day: '2026-10-21', key: null });
  });

  it('после перезапуска журнал читается с диска', async () => {
    noteHomeSceneSpecialShown('mistake_poke', 'm1', NOW);
    await Promise.resolve();
    __resetHomeSceneSpecialJournalForTests();
    const j = await readHomeSceneSpecialJournal();
    expect(j.byKey['mistake_poke:m1']).toBe('2026-10-21');
  });

  it('битый JSON на диске → пустой журнал, без падения', async () => {
    await AsyncStorage.setItem(HOME_SCENE_SPECIAL_JOURNAL_KEY, '{oops');
    expect(await readHomeSceneSpecialJournal()).toEqual(HOME_SCENE_SPECIAL_EMPTY_JOURNAL);
  });
});
