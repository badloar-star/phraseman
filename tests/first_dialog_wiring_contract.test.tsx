// зачем (координатор 15.10, m17 «Первый разговор» → итог диалога): решение «первый засчитанный диалог языка», отметка показа (память + диск, 0 обращений к Firestore), окно один раз на язык,
// «Следующий сценарий» СНАЧАЛА закрывает окно, потом зовёт переход; подключение к dialogue_v2_completion — лениво и только при готовом итоге.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  Modal: 'Modal',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => style, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }) },
  NativeModules: {},
}));
const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockStore.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => { mockStore.set(k, v); }),
  },
}));
let mockToken: { phase: string; stableId: string | null; generation: number } = { phase: 'active', stableId: 'uid-1', generation: 1 };
jest.mock('../app/account_generation', () => ({ captureAccountGeneration: () => mockToken }));
let mockDone: ReadonlySet<string> = new Set<string>(['coffee']);
jest.mock('../app/dialogue_v2_done_store', () => ({ peekDialogueV2DoneIds: () => mockDone }));
jest.mock('../hooks/use_my_coin_rank', () => ({ useMyCoinRank: () => 5 }));
jest.mock('../components/dialog_moments/FirstDialogMoment', () => ({
  __esModule: true,
  default: (props: { turns: number; goalsDone: number; goalsTotal: number; onNext: () => void }) => require('react').createElement(
    'Pressable', { testID: 'first-next', onPress: props.onNext }, require('react').createElement('Text', null, `${props.turns}|${props.goalsDone}/${props.goalsTotal}`)),
}));

import FirstDialogHost from '../components/dialog_moments/FirstDialogHost';
import { decideFirstDialogMoment } from '../components/dialog_moments/first_dialog_gate';
import { readFirstDialogShown, markFirstDialogShown, resetFirstDialogShownForTests } from '../components/dialog_moments/first_dialog_shown_store';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const ok = { momentsV3: true, endedBy: 'bot', learnerTurns: 6, scenarioId: 'coffee', doneIds: new Set(['coffee']), goalsTotal: 5, alreadyShown: false } as const;

describe('m17 · решение «первый засчитанный диалог языка»', () => {
  it('показ — только первый засчитанный диалог, итог с целями, момент ещё не показан; причина называется', () => {
    expect(decideFirstDialogMoment(ok).show).toBe(true);
    expect(decideFirstDialogMoment({ ...ok, momentsV3: false }).show).toBe(false);
    expect(decideFirstDialogMoment({ ...ok, endedBy: 'manual' }).reason).toContain('endedBy=manual');
    expect(decideFirstDialogMoment({ ...ok, learnerTurns: 0 }).reason).toContain('реплик 0');
    expect(decideFirstDialogMoment({ ...ok, goalsTotal: 0 }).reason).toContain('без целей');
    expect(decideFirstDialogMoment({ ...ok, doneIds: new Set(['coffee', 'taxi']) }).reason).toContain('не первый');
    expect(decideFirstDialogMoment({ ...ok, doneIds: new Set(['taxi']) }).reason).toContain('не отмечен');
    expect(decideFirstDialogMoment({ ...ok, alreadyShown: null }).reason).toContain('читается');
    expect(decideFirstDialogMoment({ ...ok, alreadyShown: true }).reason).toContain('уже показывали');
  });
});

describe('m17 · отметка показа (память + диск)', () => {
  beforeEach(() => { mockStore.clear(); resetFirstDialogShownForTests(); mockToken = { phase: 'active', stableId: 'uid-1', generation: 1 }; });

  it('пусто → false; после отметки память отвечает сразу, диск получает запись; другой язык и другой аккаунт — отдельно', async () => {
    expect(await readFirstDialogShown('en')).toBe(false);
    markFirstDialogShown('en');
    expect(await readFirstDialogShown('en')).toBe(true);
    await waitFor(() => expect([...mockStore.keys()]).toContain('first_dialog_moment_shown_v1:uid-1:en'));
    expect(await readFirstDialogShown('es')).toBe(false);
    resetFirstDialogShownForTests();
    mockToken = { phase: 'active', stableId: 'uid-2', generation: 1 };
    expect(await readFirstDialogShown('en')).toBe(false);
  });

  it('аккаунт не определён → null (решение откладывается, момент наугад не показываем)', async () => {
    mockToken = { phase: 'transitioning', stableId: null, generation: 2 };
    expect(await readFirstDialogShown('en')).toBeNull();
  });
});

describe('m17 · окно FirstDialogHost', () => {
  beforeEach(() => { mockStore.clear(); resetFirstDialogShownForTests(); mockToken = { phase: 'active', stableId: 'uid-1', generation: 1 }; mockDone = new Set(['coffee']); });
  const props = { lang: 'ru', studyTarget: 'en', scenarioId: 'coffee', endedBy: 'bot', turns: 6, goalsDone: 5, goalsTotal: 5 } as const;

  it('первый диалог: окно появляется с цифрами итога; «Следующий сценарий» закрывает окно и зовёт переход ровно один раз', async () => {
    const onNext = jest.fn();
    await render(<FirstDialogHost {...props} onNext={onNext} />);
    await waitFor(() => expect(screen.getByTestId('first-next')).toBeTruthy());
    expect(screen.getByText('6|5/5')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('first-next'));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('first-next')).toBeNull();
  });

  it('второй раз для того же языка — окна нет (отметка показа)', async () => {
    const first = await render(<FirstDialogHost {...props} onNext={jest.fn()} />);
    await waitFor(() => expect(first.getByTestId('first-next')).toBeTruthy());
    const second = await render(<FirstDialogHost {...props} onNext={jest.fn()} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(second.queryByTestId('first-next')).toBeNull();
  });

  it('не первый диалог (пройдено два сценария) — окна нет', async () => {
    mockDone = new Set(['coffee', 'taxi']);
    await render(<FirstDialogHost {...props} onNext={jest.fn()} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('first-next')).toBeNull();
  });
});

describe('m17 · подключение к dialogue_v2_completion', () => {
  const src = read('app/dialogue_v2_completion.tsx');
  it('окно подключено лениво, только при флаге и готовом итоге с целями; «Следующий сценарий» = переход на хаб (close)', () => {
    expect(src).toMatch(/const FirstDialogHost = lazy\(\(\) => import\('\.\.\/components\/dialog_moments\/FirstDialogHost'\)\);/);
    expect(src).not.toMatch(/^import FirstDialogHost/m);
    expect(src).toContain("momentsV3 && state.kind === 'ready' && goalsTotal > 0");
    expect(src).toContain('onNext={close}');
  });
  it('хост не пишет в Firestore, сеть не зовёт', () => {
    const code = [read('components/dialog_moments/FirstDialogHost.tsx'), read('components/dialog_moments/first_dialog_shown_store.ts')]
      .join(String.fromCharCode(10)).split(String.fromCharCode(10)).filter((l) => !l.trim().startsWith('//')).join(String.fromCharCode(10));
    expect(/firestore|httpsCallable|fetch\(/i.test(code)).toBe(false);
  });
});
