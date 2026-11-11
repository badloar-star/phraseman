// зачем (координатор 29.10, п. 3): клиент рекорда без сервера в обновление не уходит — вход выключен по умолчанию; экран Пика берёт слот рекорда у spire_record_slot и сам флага не знает
// (так он остаётся ≤ 400 строк — замок tests/spire_scene_contract).
import fs from 'node:fs';
import path from 'node:path';

import { SPIRE_FLOOR_RECORD_ENABLED } from '../app/spire/spire_floor_record_flag';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
jest.mock('../components/spire/SpireFloorRecord', () => ({ __esModule: true, default: () => null }));

describe('Рекорд этажа: вход за флагом', () => {
  it('даже при source-флаге требует точное remote true и закрыт в preview', () => {
    jest.isolateModules(() => {
      jest.doMock('../app/spire/spire_floor_record_flag', () => ({ SPIRE_FLOOR_RECORD_ENABLED: true }));
      const { spireRecordSlot } = require('../components/spire/spire_record_slot');
      const args = { preview: false, floor: 1, lang: 'ru', stableId: 'me', room: null, config: null, active: true };
      for (const config of [null, {}, { floorRecordsEnabled: false }, { floorRecordsEnabled: 'true' }]) {
        expect(spireRecordSlot({ ...args, config })).toBeUndefined();
      }
      expect(typeof spireRecordSlot({ ...args, config: { floorRecordsEnabled: true } })).toBe('function');
      expect(spireRecordSlot({ ...args, preview: true, config: { floorRecordsEnabled: true } })).toBeUndefined();
    });
    jest.dontMock('../app/spire/spire_floor_record_flag');
  });
  it('флаг выключен по умолчанию (включается коммитом ПОСЛЕ выкладки сервера)', () => {
    expect(SPIRE_FLOOR_RECORD_ENABLED).toBe(false);
  });

  it('экран Пика берёт слот рекорда у spire_record_slot и не знает ни флага, ни карточки', () => {
    const src = read('components/spire/SpireHomeScreen.tsx');
    expect(src).toContain("import { spireRecordSlot } from './spire_record_slot'");
    expect(src).toContain('recordSlot={spireRecordSlot({ preview: !!preview,');
    expect(src).not.toContain('SpireFloorRecord');
    expect(src).not.toContain('SPIRE_FLOOR_RECORD_ENABLED');
    expect(src.split('\n').length).toBeLessThanOrEqual(400);
  });

  it('слот рекорда пуст в превью и при выключенном флаге; карточка создаётся только при включённом', () => {
    const src = read('components/spire/spire_record_slot.tsx');
    expect(src).toContain('if (a.preview || !SPIRE_FLOOR_RECORD_ENABLED) return undefined;');
    expect(src).toContain('<SpireFloorRecord ');
  });

  // владелец 11.11: лист этажа Пика показывал «Временно недоступен», хотя рекорд просто не выпущен
  it('лист этажа Пика при выключенном флаге: в сеть не ходит, статус off, карточки рекорда и ступеней нет', () => {
    const hook = read('components/spire/peak/use_peak_floor_records.ts');
    expect(hook).toContain("import { SPIRE_FLOOR_RECORD_ENABLED } from '../../../app/spire/spire_floor_record_flag';");
    expect(hook).toMatch(/if \(!SPIRE_FLOOR_RECORD_ENABLED\) \{\s*console\.warn\('\[SPIRE-RECORD\] peak_off'/);
    expect(hook).toContain("status: !SPIRE_FLOOR_RECORD_ENABLED ? 'off' as const");
    const sheet = read('components/spire/peak/PeakStepSheet.tsx');
    expect(sheet).toContain("{stepper && recordStatus !== 'off' ? ");
    expect(sheet).toContain("{recordStatus === 'off' ? null : <View style={[s.rec,");
  });
});
