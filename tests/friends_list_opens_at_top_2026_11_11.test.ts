// зачем (владелец 11.11: «раздел друзья странно открывается где-то на середине скролл»): список «Друзей» не должен
// сам прокручиваться вслед за первой видимой строкой, когда над ней догружаются лента недели и заявки.
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('«Друзья» открываются с верха', () => {
  const src = read('app/(tabs)/friends.tsx');

  it('удержание позиции у списка выключено одной общей настройкой', () => {
    expect(src).toContain('const FRIENDS_LIST_NO_POSITION_HOLD = { disabled: true } as const;');
    const list = src.slice(src.indexOf('testID="friends-list"'), src.indexOf('ListFooterComponent={listFooter}'));
    expect(list).toContain('maintainVisibleContentPosition={FRIENDS_LIST_NO_POSITION_HOLD}');
  });

  it('настройка действительно так называется в установленной версии списка и включена по умолчанию', () => {
    const props = read('node_modules/@shopify/flash-list/src/FlashListProps.ts');
    expect(props).toContain('maintainVisibleContentPosition is enabled by default.');
    expect(props).toMatch(/maintainVisibleContentPosition\?: \{[\s\S]*?disabled\?: boolean;/);
  });
});
