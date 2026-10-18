// зачем (владелец 18.10 08:38 «ИСПРАВЬ КНОПКУ ЦЕНТРИРОВАНИЕ»): «Добавить друга» в пустом состоянии «Друзей» была ~85 % ширины, надпись уезжала вправо.
// PressableHybrid даёт содержимому width '100%' — у кнопки «по центру» на Android процент брался от доступной ширины. Режим hug: ширина по надписи.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('«Друзья»: кнопка пустого состояния по центру и по ширине надписи', () => {
  const kit = read('components/friends/FriendsGlassKit.tsx');
  const empty = read('components/friends/FriendsEmptyState.tsx');

  it('hug: слой содержимого width auto, надпись не сжимается, журнал раскладки', () => {
    expect(kit).toContain("...(hug ? { width: 'auto' as const } : null),");
    expect(kit).toContain('flexShrink: hug ? 0 : 1');
    expect(kit).toContain('[FRIENDS-CTA-LAYOUT] label testID=');
  });

  it('пустое состояние: компактная кнопка в режиме hug, по центру', () => {
    expect(empty).toMatch(/compact\s+hug\s+label=\{add\}/);
    expect(empty).toContain("style={{ marginTop: 20, alignSelf: 'center' }}");
  });

  it('кнопки карточки заявки остаются во всю ширину (hug только у пустого состояния)', () => {
    const card = read('components/friends/FriendsRequestCard.tsx');
    expect(card).not.toContain('hug');
    expect(card).toContain('style={{ flex: 1 }}');
  });
});
