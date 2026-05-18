import { AVATAR_AURAS } from '../constants/avatar_auras';

describe('avatar aura unlock catalog', () => {
  it('does not expose level-gated avatar auras above level 51', () => {
    const overCap = AVATAR_AURAS.filter(
      (aura) => aura.unlockLevel !== undefined && aura.unlockLevel > 51,
    );

    expect(overCap).toEqual([]);
  });
});
