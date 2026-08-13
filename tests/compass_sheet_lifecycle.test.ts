import {
  IDLE_COMPASS_SHEET,
  beginCompassSheetClose,
  completeCompassSheetClose,
  openCompassSheet,
} from '../app/compass_sheet_lifecycle';

describe('Compass declarative sheet lifecycle', () => {
  it('stays wanted while closing until the matching visual acknowledgement', () => {
    const opened = openCompassSheet('home_control');
    const closing = beginCompassSheetClose(opened, 7);
    expect(closing).toEqual({ phase: 'closing', source: 'home_control', closeId: 7 });
    expect(closing.phase).not.toBe('idle');
    expect(completeCompassSheetClose(closing, 7)).toEqual({ accepted: true, next: IDLE_COMPASS_SHEET });
  });

  it('ignores duplicate and stale close acknowledgements', () => {
    const closing = beginCompassSheetClose(openCompassSheet('auto'), 12);
    expect(completeCompassSheetClose(closing, 11)).toEqual({ accepted: false, next: closing });
    const completed = completeCompassSheetClose(closing, 12);
    expect(completed.accepted).toBe(true);
    expect(completeCompassSheetClose(completed.next, 12).accepted).toBe(false);
  });

  it('first close wins and a new open creates a fresh intent', () => {
    const first = beginCompassSheetClose(openCompassSheet('home_control'), 1);
    expect(beginCompassSheetClose(first, 2)).toBe(first);
    expect(openCompassSheet('expanded_surface')).toEqual({ phase: 'open', source: 'expanded_surface' });
  });
});
