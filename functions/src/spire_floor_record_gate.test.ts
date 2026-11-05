import { floorRecordServerEnabled } from './spire_floor_record_gate';

test('server records remain closed until explicit rollout approval', () => {
  for (const raw of [undefined, null, {}, { floorRecordsEnabled: false }, { floorRecordsEnabled: true }, { floorRecordsEnabled: 'true' }]) {
    expect(floorRecordServerEnabled(raw)).toBe(false);
  }
});
