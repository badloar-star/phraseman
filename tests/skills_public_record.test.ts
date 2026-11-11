// зачем (владелец 11.11.2026, D207): другим людям уходят только шесть уровней, запись меняется при изменении уровня и не чаще
// раза в сутки; чужая визитка берёт уровни из того же документа, что уже читается, и только при визитке «Про».
jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) },
}));
jest.mock('@react-native-firebase/firestore', () => ({ __esModule: true, default: () => ({}) }));
jest.mock('react-native', () => ({
  InteractionManager: { runAfterInteractions: (fn: () => void) => { fn(); return { cancel: () => undefined }; } },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
}));

import { normalizePublicProfileCard } from '../app/profile_card_public';
import { nextSkillPublicRecord, parseSkillPublicRecord, type SkillPublicRecord } from '../modules/skills/skill_public_record';
import type { SkillLevels } from '../modules/skills/skill_visibility';

const LEVELS: SkillLevels = { listening: 14, speech: 17, vocab: 11, grammar: 12, speed: 8, social: 15 };
const WIRE = [14, 17, 11, 12, 8, 15];
const YESTERDAY: SkillPublicRecord = { v: 1, day: '2026-11-10', levels: WIRE };

describe('запись уровней для других: только при изменении и не чаще раза в сутки', () => {
  it('первая запись создаётся сразу', () => {
    expect(nextSkillPublicRecord(null, LEVELS, '2026-11-11')).toEqual({ record: { v: 1, day: '2026-11-11', levels: WIRE }, changed: true, reason: 'first' });
  });

  it('уровни те же — запись не трогаем, даже на другой день', () => {
    const step = nextSkillPublicRecord(YESTERDAY, LEVELS, '2026-11-11');
    expect(step.changed).toBe(false);
    expect(step.record).toBe(YESTERDAY);
    expect(step.reason).toBe('same_levels');
  });

  it('уровень вырос на следующий день — запись заменяется', () => {
    const step = nextSkillPublicRecord(YESTERDAY, { ...LEVELS, speed: 9 }, '2026-11-11');
    expect(step).toEqual({ record: { v: 1, day: '2026-11-11', levels: [14, 17, 11, 12, 9, 15] }, changed: true, reason: 'levels_changed' });
  });

  it('уровень вырос второй раз за тот же день — ждём завтра, другим остаётся прежняя запись', () => {
    const today: SkillPublicRecord = { v: 1, day: '2026-11-11', levels: WIRE };
    const step = nextSkillPublicRecord(today, { ...LEVELS, speed: 9 }, '2026-11-11');
    expect(step.changed).toBe(false);
    expect(step.record.levels).toEqual(WIRE);
    expect(step.reason).toBe('already_today');
  });

  it('в записи нет ничего, кроме версии, дня и шести уровней', () => {
    const { record } = nextSkillPublicRecord(null, LEVELS, '2026-11-11');
    expect(Object.keys(record).sort()).toEqual(['day', 'levels', 'v']);
  });
});

describe('разбор записи с диска и из облака', () => {
  it('верная запись читается и строкой, и объектом', () => {
    expect(parseSkillPublicRecord(JSON.stringify(YESTERDAY))).toEqual({ record: YESTERDAY, problem: null });
    expect(parseSkillPublicRecord(YESTERDAY)).toEqual({ record: YESTERDAY, problem: null });
  });

  it.each([
    ['пусто', null, 'empty'],
    ['пустая строка', '  ', 'empty'],
    ['не JSON', '{oops', 'not_json'],
    ['массив', '[1,2,3]', 'wrong_shape'],
    ['чужая версия', JSON.stringify({ ...YESTERDAY, v: 2 }), 'wrong_shape'],
    ['день не по форме', JSON.stringify({ ...YESTERDAY, day: '11.11.2026' }), 'wrong_shape'],
    ['уровень выше 30', JSON.stringify({ ...YESTERDAY, levels: [1, 2, 3, 4, 5, 31] }), 'wrong_shape'],
  ])('%s → записи нет, причина названа', (_name, raw, problem) => {
    expect(parseSkillPublicRecord(raw)).toEqual({ record: null, problem });
  });
});

describe('чужая визитка: уровни из того же документа', () => {
  it('у визитки «Про» уровни читаются', () => {
    const card = normalizePublicProfileCard({ profileCardPro: true, profileCardStyle: 'obs', skillLevels: WIRE });
    expect(card.skillLevels).toEqual(LEVELS);
  });

  it('без «Про» уровни в копию не берутся, даже если остались в документе', () => {
    const card = normalizePublicProfileCard({ profileCardPro: false, skillLevels: WIRE });
    expect(card.skillLevels ?? null).toBeNull();
    expect(card).toEqual({ pro: false, style: null, bio: '' });
  });

  it('битая запись уровней не ломает визитку — она остаётся «Про» без блока навыков', () => {
    const card = normalizePublicProfileCard({ profileCardPro: true, profileCardStyle: 'obs', skillLevels: [1, 2, 3] });
    expect(card).toEqual({ pro: true, style: 'obs', bio: '' });
  });

  it('дисковая копия хранит уровни уже разобранными — они читаются обратно', () => {
    const card = normalizePublicProfileCard({ profileCardPro: true, profileCardStyle: 'obs', skillLevels: LEVELS });
    expect(card.skillLevels).toEqual(LEVELS);
  });
});
