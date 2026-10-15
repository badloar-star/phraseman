// зачем (Ревизор P17, 15.10): «Позиция выросла» и другие окна m05 не всплывают поверх идущей или готовящейся ступени Пика —
// ждут, пока закрыт итог И нет ступени; экран Пика передаёт stepActive из игры (session / pending).
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { render } from '@testing-library/react-native';

const mockHost = jest.fn();
jest.mock('../components/spire/moments/SpirePositionMomentsHost', () => ({ __esModule: true, default: (props: { blocked: boolean }) => { mockHost(props); return null; } }));
jest.mock('../components/spire/moments/SpireOutcomeMomentHost', () => ({ __esModule: true, default: () => null }));
let mockOwner = 'spire';
let mockFocused = true;
jest.mock('../app/TabContext', () => ({ useTabNav: () => ({ runtimeOwnerId: mockOwner }) }));
jest.mock('../hooks/use_is_screen_focused', () => ({ useIsScreenFocused: () => mockFocused }));
jest.mock('../app/spire/use_spire_position_moments', () => ({ useSpirePositionMoments: () => ({ rise: { key: 'w1:r' }, overtake: null, lastChance: null, consume: jest.fn() }) }));

import SpireMomentsLayer from '../components/spire/moments/SpireMomentsLayer';

const base = { lang: 'ru' as const, outcome: null, coins: {} as never, coinRank: 5, busy: false, onClimb: jest.fn(), onLater: jest.fn() };
const lastBlocked = () => (mockHost.mock.calls[mockHost.mock.calls.length - 1]?.[0] as { blocked: boolean }).blocked;

describe('P17 · окна позиции Пика ждут конца ступени', () => {
  beforeEach(() => { mockHost.mockClear(); mockOwner = 'spire'; mockFocused = true; });
  it('ступень идёт или готовится — окно ждёт', async () => {
    await render(<SpireMomentsLayer {...base} stepActive />);
    expect(lastBlocked()).toBe(true);
  });
  it('старт ступени (busy) — окно ждёт', async () => {
    await render(<SpireMomentsLayer {...base} busy />);
    expect(lastBlocked()).toBe(true);
  });
  it('открыт итог — окно ждёт', async () => {
    await render(<SpireMomentsLayer {...base} outcome={{ kind: 'passed' } as never} />);
    expect(lastBlocked()).toBe(true);
  });
  it('итога нет и ступени нет — окно свободно', async () => {
    await render(<SpireMomentsLayer {...base} />);
    expect(lastBlocked()).toBe(false);
  });
  it('C2: раздел Пика скрыт (другая вкладка) или экран перекрыт — окно ждёт', async () => {
    mockOwner = 'home';
    await render(<SpireMomentsLayer {...base} />);
    expect(lastBlocked()).toBe(true);
    mockOwner = 'spire';
    mockFocused = false;
    await render(<SpireMomentsLayer {...base} />);
    expect(lastBlocked()).toBe(true);
  });
  it('экран Пика передаёт stepActive из session / pending игры', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components', 'spire', 'SpireHomeScreen.tsx'), 'utf8');
    expect(src).toContain('stepActive={game.session !== null || game.pending !== null || (game.outcome !== null && !momentOutcome)}');
  });
});
