import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const cardSource = fs.readFileSync(path.join(root, 'components/youtube/YoutubeVideoCard.tsx'), 'utf8');
const heroSource = fs.readFileSync(path.join(root, 'components/youtube/YoutubePremiereHero.tsx'), 'utf8');

describe('YouTube preview layout', () => {
  test('keeps the regular thumbnail free of a play overlay while retaining the card action', () => {
    expect(cardSource).toContain('accessibilityRole="button"');
    expect(cardSource).toContain('onPress={onWatch}');
    expect(cardSource).not.toContain('styles.play');
    expect(cardSource).not.toContain('name="play"');
  });

  test('renders the video state below the thumbnail instead of over it', () => {
    const bodyStart = cardSource.indexOf('<View style={styles.body}>');
    const stateIndex = cardSource.indexOf('styles.state');
    expect(bodyStart).toBeGreaterThan(-1);
    expect(stateIndex).toBeGreaterThan(bodyStart);

    const detailsStart = heroSource.indexOf('testID="youtube-premiere-details"');
    const stateIndexInHero = heroSource.indexOf('testID="youtube-premiere-state"');
    expect(detailsStart).toBeGreaterThan(-1);
    expect(stateIndexInHero).toBeGreaterThan(detailsStart);
  });
});
