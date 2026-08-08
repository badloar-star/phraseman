import { buttonForegroundForBackground } from '../constants/color_contrast';

describe('buttonForegroundForBackground', () => {
  it.each(['#40C080', '#4A9EFF', '#E05050'])(
    'uses a dark readable foreground for trainer CTA background %s',
    (background) => {
      expect(buttonForegroundForBackground(background)).toBe('#07110A');
    },
  );

  it('uses a light foreground on a genuinely dark background', () => {
    expect(buttonForegroundForBackground('#111827')).toBe('#FFFFFF');
  });
});
