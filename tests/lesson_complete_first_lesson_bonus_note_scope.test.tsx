import React from 'react';
import { act, render } from '@testing-library/react-native';
import type { Lang } from '../constants/i18n';
import { useFirstLessonBonusNote } from '../hooks/use_first_lesson_bonus_note';
import { maybeGrantFirstLessonBonus, type FirstLessonBonusDeps } from '../app/first_lesson_bonus';

jest.mock('../app/first_lesson_bonus', () => {
  const actual = jest.requireActual('../app/first_lesson_bonus');
  return {
    ...actual,
    peekFirstLessonBonusRecentCoins: () => 500,
    subscribeFirstLessonBonus: () => () => undefined,
  };
});

type BonusNoteHandle = Readonly<{
  note: string | undefined;
  onGranted: (coins: number) => void;
}>;

let latestHandle: BonusNoteHandle | string | undefined;
let latestRenderedNote = '';

function Harness({ lang, scopeKey, current = true }: Readonly<{
  lang: Lang;
  scopeKey: string;
  current?: boolean;
}>) {
  latestHandle = useFirstLessonBonusNote(lang, scopeKey, () => current) as BonusNoteHandle | string | undefined;
  const note = typeof latestHandle === 'string' ? latestHandle : latestHandle?.note;
  latestRenderedNote = note ?? '';
  return null;
}

const concurrentHandles: Partial<Record<'leader' | 'follower', BonusNoteHandle>> = {};
const concurrentNotes: Partial<Record<'leader' | 'follower', string>> = {};

function ConcurrentHarness({ caller }: Readonly<{ caller: 'leader' | 'follower' }>) {
  const handle = useFirstLessonBonusNote('en', `${caller}-attempt|account-generation-1`, () => true);
  concurrentHandles[caller] = handle;
  concurrentNotes[caller] = handle.note ?? '';
  return null;
}

describe('lesson completion first-lesson bonus caption scope', () => {
  test('shows only this mounted caller grant and drops stale attempt/account callbacks', async () => {
    const view = await render(<Harness lang="ru" scopeKey="attempt-a|account-generation-1" />);
    const renderedNote = () => latestRenderedNote;

    // A recent process-global grant belongs to another screen and must not leak into this mount.
    expect(renderedNote()).toBe('');

    const attemptAGrant = (latestHandle as BonusNoteHandle).onGranted;
    await act(async () => attemptAGrant(500));
    expect(renderedNote()).toBe('+500 монет за первое занятие');

    // Losing the captured account immediately hides an already-rendered caption.
    await view.rerender(<Harness lang="en" scopeKey="attempt-a|account-generation-1" current={false} />);
    expect(renderedNote()).toBe('');

    // A new account generation starts empty; the prior account callback stays inert.
    await view.rerender(<Harness lang="en" scopeKey="attempt-a|account-generation-2" />);
    await act(async () => attemptAGrant(500));
    expect(renderedNote()).toBe('');

    const account2Grant = (latestHandle as BonusNoteHandle).onGranted;
    await act(async () => account2Grant(500));
    expect(renderedNote()).toBe('+500 coins for your first lesson');

    // Changing only the attempt also clears the note and rejects the late old-attempt callback.
    await view.rerender(<Harness lang="en" scopeKey="attempt-b|account-generation-2" />);
    expect(renderedNote()).toBe('');
    await act(async () => account2Grant(500));
    expect(renderedNote()).toBe('');

    const attemptBGrant = (latestHandle as BonusNoteHandle).onGranted;
    await act(async () => attemptBGrant(500));
    expect(renderedNote()).toBe('+500 coins for your first lesson');

    await view.unmount();
    const remount = await render(<Harness lang="en" scopeKey="attempt-b|account-generation-2" />);
    const remountedNote = () => latestRenderedNote;
    expect(remountedNote()).toBe('');

    // The old caller may still finish, but its unmounted callback remains inert.
    await act(async () => attemptBGrant(500));
    expect(remountedNote()).toBe('');
    await remount.unmount();
  });

  test('shared in-flight result labels only the caller whose grant actually ran', async () => {
    const view = await render(
      <>
        <ConcurrentHarness caller="leader" />
        <ConcurrentHarness caller="follower" />
      </>,
    );
    const leaderHandle = concurrentHandles.leader as BonusNoteHandle;
    const followerHandle = concurrentHandles.follower as BonusNoteHandle;

    let markGrantStarted!: () => void;
    const grantStarted = new Promise<void>((resolve) => { markGrantStarted = resolve; });
    let releaseGrant!: () => void;
    const grantGate = new Promise<void>((resolve) => { releaseGrant = resolve; });
    const baseDeps: Omit<FirstLessonBonusDeps, 'onGranted'> = {
      gatesEnabled: () => true,
      verdict: async () => ({ isNew: true, reason: 'new' }),
      ownerStableId: async () => 'owner-concurrent',
      sha256Hex: async () => 'a'.repeat(64),
      grant: async () => {
        markGrantStarted();
        await grantGate;
      },
      readFlag: async () => false,
      writeFlag: async () => undefined,
    };

    const leaderCall = maybeGrantFirstLessonBonus({ ...baseDeps, onGranted: leaderHandle.onGranted });
    await grantStarted;
    const followerCall = maybeGrantFirstLessonBonus({ ...baseDeps, onGranted: followerHandle.onGranted });
    expect(followerCall).toBe(leaderCall);

    let results: boolean[] = [];
    await act(async () => {
      releaseGrant();
      results = await Promise.all([leaderCall, followerCall]);
    });

    expect(results).toEqual([true, true]);
    expect(concurrentNotes.leader).toBe('+500 coins for your first lesson');
    expect(concurrentNotes.follower).toBe('');
    await view.unmount();
  });
});
