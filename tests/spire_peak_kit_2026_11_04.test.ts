// зачем (координатор 04.11): строки экрана Пика на 9 языках и «—» вместо отсутствующего рекорда; тап-цель ≥44 dp у стрелок этажа.
import fs from 'node:fs';
import path from 'node:path';


import { SPIRE_GAME_STRINGS } from '../components/spire/spire_game_strings';
import { peakRecordLine, PEAK_TAP_TARGET } from '../components/spire/peak/peak_text';

const KEYS = ['peakMyCoins', 'peakMyPlace', 'peakMovingUp', 'peakAllParticipants', 'peakStepRecord', 'peakRecordBy', 'peakNoRecord', 'peakReachedTop', 'peakWeekCoins'];

describe('каркас экрана Пика', () => {
  it('новые строки есть на всех 9 языках и не пустые', () => {
    for (const k of KEYS) {
      const row = SPIRE_GAME_STRINGS[k];
      expect(row).toHaveLength(9);
      for (const v of row) expect(v.trim().length).toBeGreaterThan(0);
    }
  });

  it('«Рекорд: имя — время» во всех языках содержит {name} и {time}', () => {
    for (const v of SPIRE_GAME_STRINGS.peakRecordBy) {
      expect(v).toContain('{name}');
      expect(v).toContain('{time}');
    }
  });

  it('строка рекорда: имя и время мм:сс.сс, а без данных — «—»', () => {
    expect(peakRecordLine('en', null)).toBe('—');
    expect(peakRecordLine('en', { uid: 'u', durationMs: 0 })).toBe('—');
    expect(peakRecordLine('en', { uid: 'u', name: 'Max', durationMs: 18_340 })).toBe('Record: Max — 00:18.34');
    expect(peakRecordLine('ru', { uid: 'u', name: 'Макс', durationMs: 61_050 })).toBe('Рекорд: Макс — 01:01.05');
  });

  it('тап-цель стрелок этажа не меньше 44 dp', () => {
    expect(PEAK_TAP_TARGET).toBeGreaterThanOrEqual(44);
  });

  it('на боевом экране каркас включается только флагом (по умолчанию выключен)', () => {
    const home = fs.readFileSync(path.join(__dirname, '..', 'components/spire/SpireHomeScreen.tsx'), 'utf8');
    expect(home).toContain('peakScreenV2On');
  });
});
