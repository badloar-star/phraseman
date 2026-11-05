// зачем (владелец 06.11, Plus/Ultra): уровень подписки доходит до шапки Главной, визитки и аватаров; свой — по продукту магазина, чужой — публичное поле (нет поля → Plus).
import fs from 'node:fs';
import path from 'node:path';

const src = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('Plus/Ultra: проводка C2', () => {
  it('Главная: уровень из useSubscriptionTier идёт в слот аватара, слот — в кольцо', () => {
    const home = src('app/(tabs)/home.tsx');
    expect(home).toContain("const homeSubTier = useSubscriptionTier() ?? 'plus';");
    expect(home).toContain('plusTier={homeSubTier}');
    const slot = src('components/stories/StoryAvatarSlot.tsx');
    expect(slot).toContain('<PlusAvatarRing plus tier={plusTier} size={STORY_RING_SLOT} surface={plusSurface}>');
  });

  it('AvatarView: оба места кольца принимают tier, по умолчанию plus', () => {
    const view = src('components/AvatarView.tsx');
    expect((view.match(/tier=\{plusTier\}/g) ?? []).length).toBe(2);
    expect(view).toContain("plusTier = 'plus'");
  });
});
