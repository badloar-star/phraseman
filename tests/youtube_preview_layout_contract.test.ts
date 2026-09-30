import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const cardSource = fs.readFileSync(path.join(root, 'components/youtube/YoutubeVideoCard.tsx'), 'utf8');
const heroSource = fs.readFileSync(path.join(root, 'components/youtube/YoutubePremiereHero.tsx'), 'utf8');

describe('YouTube preview layout', () => {
  // зачем: макет video.html (Liquid Glass) рисует круглую «play» слева-снизу кадра (`.thumb .pl`) —
  // прежний запрет оверлея заменён на общий бейдж из VideoGlassKit; действие карточки то же.
  test('draws the mockup play badge on the regular thumbnail while retaining the card action', () => {
    expect(cardSource).toContain('accessibilityRole="button"');
    expect(cardSource).toContain('onPress={onWatch}');
    expect(cardSource).toContain('<VideoPlayBadge');
    expect(cardSource).not.toContain('styles.playOverlay');
  });

  test('renders the video state below the thumbnail instead of over it', () => {
    const bodyStart = cardSource.indexOf('<View style={[styles.body');
    const stateIndex = cardSource.indexOf('styles.state');
    expect(bodyStart).toBeGreaterThan(-1);
    expect(stateIndex).toBeGreaterThan(bodyStart);

    // премьера по макету (`.hero .badge`): пилюля состояния лежит НА кадре, слева-сверху
    const thumbStart = heroSource.indexOf('testID="youtube-premiere-thumbnail"');
    const detailsStart = heroSource.indexOf('testID="youtube-premiere-details"');
    const stateIndexInHero = heroSource.indexOf('testID="youtube-premiere-state"');
    expect(detailsStart).toBeGreaterThan(-1);
    expect(stateIndexInHero).toBeGreaterThan(thumbStart);
    expect(stateIndexInHero).toBeLessThan(detailsStart);
  });
});
