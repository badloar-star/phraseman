import {
  SPIRE_CONFIG_DEFAULTS,
  parseSpireConfigDoc,
} from '../modules/spire/config_contract';

type Row = Record<string, unknown>;

test('client Spire config mirrors the default-off exact-boolean floor record lock', () => {
  expect((SPIRE_CONFIG_DEFAULTS as unknown as Row).floorRecordsEnabled).toBe(false);
  expect((parseSpireConfigDoc({}) as unknown as Row).floorRecordsEnabled).toBe(false);
  expect((parseSpireConfigDoc({ floorRecordsEnabled: 'true' }) as unknown as Row).floorRecordsEnabled).toBe(false);
  expect((parseSpireConfigDoc({ floorRecordsEnabled: true }) as unknown as Row).floorRecordsEnabled).toBe(true);
});
