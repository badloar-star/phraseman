// ═══════════════════════════════════════════════════════════════════════════
// story_plus_hide_titan_2026_10_29.test.ts — два решения 29.10 по историям:
// 1) владелец (кнопка «Скрывать у Plus»): объявление design=plus человеку с Plus не показывается совсем — фильтр ленты на клиенте по статусу
//    Plus, без новых чтений; скрытое не попадает в истории и в счёт непросмотренных;
// 2) координатор (вариант «а», макет утверждён строго): круг кадра «Новая тема» — «материал» темы, у титана серебро как в макете.
// ═══════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { ANNOUNCEMENT_DESIGNS_HIDDEN_FOR_PLUS, announcementsForViewer } from '../modules/story_events/announcement_plus_filter';
import type { StoryEvent } from '../modules/story_events/story_events_core';
import { themeSphereColors } from '../components/stories/templates/story_theme_sphere';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

const ann = (id: string, design: string | undefined): StoryEvent => ({
  id: `announcement:${id}:1`,
  type: 'announcement',
  payload: { contentJson: JSON.stringify(design === undefined ? { id, revision: 1 } : { id, revision: 1, design }), durationMs: 10000, expiresAtMs: 2 },
  atMs: 1,
  seen: false,
});

describe('объявление Plus у владельца Plus', () => {
  const plus = ann('p1', 'plus');
  const quote = ann('q1', 'quote');
  const legacy = ann('l1', undefined);
  const broken: StoryEvent = { ...ann('b1', 'quote'), payload: { contentJson: '{не json' } };

  it('скрывается только design=plus', () => {
    expect([...ANNOUNCEMENT_DESIGNS_HIDDEN_FOR_PLUS]).toEqual(['plus']);
  });

  it('без Plus — видно всё, скрытых нет', () => {
    const r = announcementsForViewer([plus, quote, legacy], false);
    expect(r.visible).toEqual([plus, quote, legacy]);
    expect(r.hidden).toEqual([]);
  });

  it('с Plus — реклама Plus убрана, остальные на месте; причина скрытия — в ответе для лога', () => {
    const r = announcementsForViewer([plus, quote, legacy], true);
    expect(r.visible).toEqual([quote, legacy]);
    expect(r.hidden).toEqual([{ id: 'announcement:p1:1', design: 'plus' }]);
    expect(r.unreadable).toEqual([]);
  });

  it('нечитаемое объявление не прячем (покажет прежний кадр), но причину отдаём', () => {
    const r = announcementsForViewer([broken], true);
    expect(r.visible).toEqual([broken]);
    expect(r.unreadable).toHaveLength(1);
    expect(r.unreadable[0]).toContain('announcement:b1:1');
  });

  it('лента историй фильтрует объявления по статусу Plus из PremiumContext и пишет причину', () => {
    const src = read('modules/story_events/use_story_events.ts');
    expect(src).toContain('const { hasPremiumAccess } = usePremium();');
    expect(src).toContain('announcementsForViewer(announcements.stories, hasPremiumAccess)');
    expect(src).toContain('[...snapshot.stories,...forViewer.visible]');
    expect(src).toContain('объявления скрыты: у человека Plus');
  });
});

describe('круг кадра «Новая тема» — материал темы', () => {
  it('титан — серебро как в макете (#DDE1E8 → #5E6570): светлая поверхность → середина кружка «Тем»', () => {
    expect(themeSphereColors('grad_full_titanium')).toEqual({ a: '#e0e3e5', b: '#5D636B' });
  });

  it('не особая тема — null (кадр берёт запасные цвета)', () => {
    expect(themeSphereColors('graphite')).toBeNull();
    expect(themeSphereColors('')).toBeNull();
  });

  it('кадр берёт цвета круга из themeSphereColors', () => {
    const src = read('components/stories/templates/frames_recap.tsx');
    expect(src).toContain('themeSphereColors(tpl.themeId) ??');
    expect(src).toContain('<ThemeSwatch colorA={sphere.a} colorB={sphere.b} />');
  });
});
