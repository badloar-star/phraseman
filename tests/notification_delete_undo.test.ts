import {
  hideNotificationIds,
  shouldCommitDeletion,
  stageNotificationDeletion,
  undoNotificationDeletion,
} from '../app/notification_delete_undo';

const rows = [
  { id: 'a', createdAt: 30 },
  { id: 'b', createdAt: 20 },
  { id: 'c', createdAt: 10 },
];

describe('notification deletion undo', () => {
  it('stages exactly one row and restores its original position', () => {
    const pending = stageNotificationDeletion(rows, 'b', 1_000);
    expect(pending.rows.map((row) => row.id)).toEqual(['a', 'c']);
    expect(undoNotificationDeletion(pending.rows, pending.deletion).map((row) => row.id)).toEqual(['a', 'b', 'c']);
  });

  it('commits only after the four-second undo window', () => {
    const pending = stageNotificationDeletion(rows, 'b', 1_000);
    expect(shouldCommitDeletion(pending.deletion, 4_999)).toBe(false);
    expect(shouldCommitDeletion(pending.deletion, 5_000)).toBe(true);
  });

  it('does nothing when the requested row is absent', () => {
    expect(stageNotificationDeletion(rows, 'missing', 1_000)).toEqual({
      rows,
      deletion: null,
    });
  });

  it('does not resurrect a locally hidden row when a remote refresh finishes', () => {
    expect(hideNotificationIds(rows, new Set(['b'])).map((row) => row.id)).toEqual(['a', 'c']);
  });
});
