import { AVATAR_AURAS } from '../constants/avatar_auras';
import { MAX_LEVEL } from '../constants/theme';

describe('avatar aura unlock catalog', () => {
  // зачем: раньше потолок был захардкожен «51» — с переводом арена-аур на уровни 52-55
  // контракт стал честным: ни одна аура не требует уровня, которого нельзя достичь.
  it('does not gate avatar auras behind unreachable levels', () => {
    const overCap = AVATAR_AURAS.filter(
      (aura) => aura.unlockLevel !== undefined && aura.unlockLevel > MAX_LEVEL,
    );

    expect(overCap).toEqual([]);
  });

  it('keeps level-gated aura unlock levels unique', () => {
    const levels = AVATAR_AURAS
      .filter((aura) => aura.unlockLevel !== undefined)
      .map((aura) => aura.unlockLevel);

    expect(new Set(levels).size).toBe(levels.length);
  });
});
