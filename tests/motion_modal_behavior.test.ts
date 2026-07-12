import { completeModalClose, nextModalTransition } from '../components/modal_motion_state';

describe('MotionModal presentation behavior', () => {
  test('a completed close hides the presented modal exactly for its run', () => {
    const closing = nextModalTransition({ presented: true, closeRun: 0 }, false);
    expect(closing.kind).toBe('close');
    if (closing.kind !== 'close') throw new Error('expected close');
    expect(completeModalClose(closing.state, closing.run)).toEqual({ presented: false, closeRun: 1 });
  });

  test('quick reopen invalidates an older close completion', () => {
    const closing = nextModalTransition({ presented: true, closeRun: 2 }, false);
    if (closing.kind !== 'close') throw new Error('expected close');
    const reopened = nextModalTransition(closing.state, true).state;
    expect(completeModalClose(reopened, closing.run).presented).toBe(true);
  });
});
