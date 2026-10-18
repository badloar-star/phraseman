import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const cardSource = fs.readFileSync(path.join(root, 'components/youtube/YoutubeVideoCard.tsx'), 'utf8');
const heroSource = fs.readFileSync(path.join(root, 'components/youtube/YoutubePremiereHero.tsx'), 'utf8');
const gridSource = fs.readFileSync(path.join(root, 'components/youtube/YoutubeVideoGridCard.tsx'), 'utf8');

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

    // премьера по макету (`.hero .st`, владелец 18.10 «Да, убрать плашки с обложки»): состояние — строка ПОД обложкой, на кадре только ▶
    const thumbStart = heroSource.indexOf('testID="youtube-premiere-thumbnail"');
    const detailsStart = heroSource.indexOf('testID="youtube-premiere-details"');
    const stateIndexInHero = heroSource.indexOf('testID="youtube-premiere-state"');
    expect(thumbStart).toBeGreaterThan(-1);
    expect(detailsStart).toBeGreaterThan(thumbStart);
    expect(stateIndexInHero).toBeGreaterThan(detailsStart);
    const thumbBlock = heroSource.slice(thumbStart, detailsStart);
    expect(thumbBlock).toContain('<VideoPlayBadge />');
    expect(thumbBlock).not.toContain('copy.upcoming');
    expect(thumbBlock).not.toContain('copy.liveNow');
    // отсчёт — вложенный текст той же строки: «Скоро премьера · через 7 ч 52 мин»
    expect(heroSource).toMatch(/testID="youtube-premiere-state"[\s\S]{0,700}testID="youtube-premiere-countdown"/);
    // «Напомнить» компактная, «Присоединиться» остаётся во всю ширину
    expect(heroSource).toContain('styles.cta, styles.ctaCompact');
    expect(heroSource).toContain("ctaCompact: { alignSelf: 'flex-start', minHeight: 40");
    // Ревизор c3c420861 🟡: читалка получает слова («Через 7 часов 52 минуты»), а не сокращения; подпись — на самой строке состояния
    expect(heroSource).toContain('premiereCountdownSpoken(lang, presentation.days, presentation.hours, presentation.minutes)');
    expect(heroSource).toMatch(/testID="youtube-premiere-state" accessible accessibilityRole="timer" accessibilityLabel={countdownAccessibilityLabel}/);
    // шкала D145: вторичная строка под названием — 13/17 (не 14/19; Макеты 18.10)
    expect(heroSource).toContain("stateText: { flex: 1, fontSize: 13, lineHeight: 17, fontWeight: '600' }");
  });

  // владелец 18.10: закладка карточки сетки ушла с обложки в правый край строки меты (круг 28), на обложке только длительность
  test('grid card keeps the bookmark in the meta row, not on the cover', () => {
    const coverStart = gridSource.indexOf('<View style={[styles.thumb');
    const metaRowStart = gridSource.indexOf('<View style={styles.metaRow}>');
    const saveIndex = gridSource.indexOf('testID={`video-save-${video.id}`}');
    expect(coverStart).toBeGreaterThan(-1);
    expect(metaRowStart).toBeGreaterThan(coverStart);
    expect(saveIndex).toBeGreaterThan(metaRowStart);
    expect(gridSource).toContain('bookmark: { width: 28, height: 28, borderRadius: 14');
    expect(gridSource).not.toContain("position: 'absolute', top: 7, right: 7");
    expect(gridSource).not.toContain('MEDIA_SCRIM');
  });
});
