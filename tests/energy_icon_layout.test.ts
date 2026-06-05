import { getAdaptiveEnergyIconLayout } from '../components/energyIconLayout';

describe('adaptive energy icon layout', () => {
  it('keeps the default compact spacing when there is enough room', () => {
    const layout = getAdaptiveEnergyIconLayout({
      slotCount: 5,
      iconSize: 30,
      maxWidth: 200,
    });

    expect(layout.iconSize).toBe(30);
    expect(layout.marginLeft).toBe(-14);
    expect(layout.width).toBeLessThanOrEqual(200);
  });

  it('pulls icons closer together as slot count grows in the same width', () => {
    const fiveSlots = getAdaptiveEnergyIconLayout({
      slotCount: 5,
      iconSize: 30,
      maxWidth: 120,
    });
    const tenSlots = getAdaptiveEnergyIconLayout({
      slotCount: 10,
      iconSize: 30,
      maxWidth: 120,
    });

    expect(tenSlots.marginLeft).toBeLessThan(fiveSlots.marginLeft);
    expect(tenSlots.width).toBeLessThanOrEqual(120);
  });

  it('shrinks only after the minimum visible spacing cannot fit', () => {
    const layout = getAdaptiveEnergyIconLayout({
      slotCount: 14,
      iconSize: 30,
      maxWidth: 112,
      minIconSize: 18,
    });

    expect(layout.iconSize).toBeLessThan(30);
    expect(layout.iconSize).toBeGreaterThanOrEqual(18);
    expect(layout.width).toBeLessThanOrEqual(112);
  });

  it('treats min icon size as preferred when many slots would overflow', () => {
    const layout = getAdaptiveEnergyIconLayout({
      slotCount: 20,
      iconSize: 38,
      maxWidth: 112,
      minIconSize: 22,
    });
    const renderedWidth = layout.iconSize + 19 * (layout.iconSize + layout.marginLeft);

    expect(layout.iconSize).toBeLessThan(22);
    expect(layout.width).toBeLessThanOrEqual(112);
    expect(renderedWidth).toBeLessThanOrEqual(112);
  });
});
