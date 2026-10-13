// зачем (координатор 13.10, Авторизация: системный «Крупный шрифт» ×1,3 ломает заголовки 34/40 pt на 360 dp у pl/es):
// крупные заголовки экранов не растут больше чем в 1,15 раза (перенос по словам остаётся, сжатия шрифта нет).
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

// [файл, фрагмент заголовка, который обязан нести колпак]
const TITLES: ReadonlyArray<readonly [string, string]> = [
  ['components/v2/V2Kit.tsx', 'style={[s.largeTitle,'],
  ['components/cards-grid/CardsKit.tsx', 'style={[styles.title, { color: g.text, lineHeight: lh(46) }]}'],
  ['components/mistakes-panel/PanelKit.tsx', 'style={[styles.title, { color: g.text }]}>{text}'],
  ['app/flashcards/CardsHubV2.tsx', 'style={[styles.title, { color: g.text, lineHeight: lh(46) }]}'],
  ['app/flashcards/CollectionHeaderV2.tsx', 'testID="fc-collection-title"'],
  ['app/flashcards/PackHeaderV2.tsx', 'testID="fc-collection-title"'],
  ['app/flashcards/CommunityPackPreview.tsx', 'testID="pack-preview-title"'],
  ['components/packs/PackScreenKit.tsx', 'style={[styles.title, { color: g.text, lineHeight: lh(40) }]}'],
  ['app/coin_rank.tsx', 'style={[styles.headerTitle,'],
  ['app/coin_rank_catalog.tsx', 'style={[styles.headerTitle,'],
  ['app/runes_wallet.tsx', 'style={[styles.headerTitle,'],
  ['app/settings_themes.tsx', 'style={[styles.title, { color: glass.text,'],
  ['app/flashcards_packs.tsx', "testID={embedded ? 'flashcards-packs-title-embedded'"],
  ['app/(tabs)/settings.tsx', 'fontSize: 40, lineHeight: 46'],
  ['app/account_details.tsx', 'fontSize: 34, lineHeight: 40'],
  ['app/settings_edu.tsx', 'fontSize: 34, lineHeight: 40'],
  ['app/settings_language.tsx', 'fontSize: 34, lineHeight: 40'],
  ['app/settings_notifications.tsx', 'fontSize: 34, lineHeight: 40'],
  ['app/streak_stats.tsx', "fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5, marginTop: embedded ? 0 : 10"],
];

describe('заголовки экранов при крупном системном шрифте', () => {
  it.each(TITLES)('%s: заголовок ограничен maxFontSizeMultiplier={1.15}', (file, anchor) => {
    const src = read(file);
    const at = src.indexOf(anchor);
    expect(at).toBeGreaterThan(0);
    // тег <Text …> / <FlowText …> заголовка: от ближайшего открытия назад до якоря
    const open = Math.max(src.lastIndexOf('<Text', at), src.lastIndexOf('<FlowText', at));
    expect(open).toBeGreaterThanOrEqual(0);
    const tagHead = src.slice(open, at + anchor.length);
    expect(tagHead).toContain('maxFontSizeMultiplier={1.15}');
    expect(tagHead).not.toContain('adjustsFontSizeToFit');
  });
});
