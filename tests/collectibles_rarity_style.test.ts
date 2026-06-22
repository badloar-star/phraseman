/**
 * Контракт визуала по редкости: «чем реже — тем круче». Цвет яруса, монотонный
 * рост «мощности» рамки и включение эффектов (свечение/блик/пульс/искры)
 * проверяются здесь, без React/Reanimated — чистая конфигурация rarity_style.ts.
 */
import { COLLECTIBLE_RARITY_COLORS, COLLECTIBLE_RARITY_ORDER } from '../app/collectibles/catalog';
import {
  COLLECTIBLE_SECRET_GOLD,
  collectibleFrameProfile,
  collectibleTierColor,
  type CollectibleArtTier,
} from '../app/collectibles/rarity_style';

describe('collectible rarity visual contract', () => {
  it('цвет яруса: редкости из палитры, секретка — золото', () => {
    for (const rarity of COLLECTIBLE_RARITY_ORDER) {
      expect(collectibleTierColor(rarity)).toBe(COLLECTIBLE_RARITY_COLORS[rarity]);
    }
    expect(collectibleTierColor('secret')).toBe(COLLECTIBLE_SECRET_GOLD);
  });

  it('power монотонно растёт common → rare → epic → legendary', () => {
    const powers = COLLECTIBLE_RARITY_ORDER.map((r) => collectibleFrameProfile(r).power);
    for (let i = 1; i < powers.length; i += 1) {
      expect(powers[i]).toBeGreaterThan(powers[i - 1]);
    }
  });

  it('свечение/рамка не убывают с ростом редкости', () => {
    let prevGlow = -1;
    let prevBorder = -1;
    for (const r of COLLECTIBLE_RARITY_ORDER) {
      const p = collectibleFrameProfile(r);
      expect(p.glow).toBeGreaterThanOrEqual(prevGlow);
      expect(p.borderWidth).toBeGreaterThanOrEqual(prevBorder);
      prevGlow = p.glow;
      prevBorder = p.borderWidth;
    }
  });

  it('common — без эффектов; искры только у самого редкого яруса', () => {
    const common = collectibleFrameProfile('common');
    expect(common.glow).toBe(0);
    expect(common.sheen).toBe(false);
    expect(common.pulse).toBe(false);
    expect(common.sparkles).toBe(false);

    // Искры — только legendary и secret.
    const withSparkles = (['common', 'rare', 'epic', 'legendary', 'secret'] as CollectibleArtTier[])
      .filter((t) => collectibleFrameProfile(t).sparkles);
    expect(withSparkles.sort()).toEqual(['legendary', 'secret']);
  });

  it('блик включается с rare и выше', () => {
    expect(collectibleFrameProfile('common').sheen).toBe(false);
    expect(collectibleFrameProfile('rare').sheen).toBe(true);
    expect(collectibleFrameProfile('epic').sheen).toBe(true);
    expect(collectibleFrameProfile('legendary').sheen).toBe(true);
  });

  it('секретка не слабее легендарной', () => {
    const legendary = collectibleFrameProfile('legendary');
    const secret = collectibleFrameProfile('secret');
    expect(secret.power).toBe(legendary.power);
    expect(secret.glow).toBeGreaterThanOrEqual(legendary.glow);
    expect(secret.sparkles).toBe(true);
  });
});
