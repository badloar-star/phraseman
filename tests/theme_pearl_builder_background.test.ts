type BackgroundTools = {
  connectedLightNeutralBackground: (
    data: Uint8Array,
    width: number,
    height: number,
    channels: number,
  ) => Uint8Array;
};

describe('theme pearl background extraction', () => {
  it('removes only light neutral pixels connected to the edge', () => {
    const { connectedLightNeutralBackground } = require('../scripts/lib/theme_pearl_background.cjs') as BackgroundTools;
    const width = 5;
    const height = 5;
    const channels = 3;
    const data = new Uint8Array(width * height * channels).fill(248);
    const setRgb = (x: number, y: number, rgb: [number, number, number]) => {
      const offset = (y * width + x) * channels;
      data.set(rgb, offset);
    };

    for (let y = 1; y <= 3; y += 1) {
      for (let x = 1; x <= 3; x += 1) setRgb(x, y, [210, 145, 90]);
    }
    setRgb(2, 2, [255, 253, 248]);

    const background = connectedLightNeutralBackground(data, width, height, channels);

    expect(background[0]).toBe(1);
    expect(background[2 * width + 1]).toBe(0);
    expect(background[2 * width + 2]).toBe(0);
  });
});
