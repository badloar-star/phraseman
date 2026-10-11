// зачем (Карточки 2.0): сервер принимает от автора только A1–C1; мусор не роняет публикацию, а даёт «без уровня».
import { normalizePackLevel } from './community_pack_level';

describe('normalizePackLevel', () => {
  it('принимает A1–C1 в любом регистре', () => {
    expect(normalizePackLevel('a1')).toBe('A1');
    expect(normalizePackLevel(' B2 ')).toBe('B2');
    expect(normalizePackLevel('C1')).toBe('C1');
  });
  it('мусор и отсутствие → null', () => {
    for (const raw of ['C2', 'A0', '', null, undefined, 2, {}]) expect(normalizePackLevel(raw)).toBeNull();
  });
});
