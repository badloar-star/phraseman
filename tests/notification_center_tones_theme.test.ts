// зачем (закон владельца 22.10 «ЦВЕТА ДОЛЖНЫ БЫТЬ СТРОГО ЦВЕТАМИ И ОТТЕНКАМИ ТЕКУЩЕЙ ТЕМЫ»; координатор → 8 · МОМЕНТЫ, зона «Сообщения»):
// центр уведомлений красит типы событий и награду за жалобу ролями темы (notification_center_tones), а не iOS-цветами и зелёным «брендом».
// Проверяем: подпись зелёной кнопки «Забрать» ≥ 4,5, значки (good / warn / bad) ≥ 3 на карточке и фоне — во всех темах, оформлениях и уровнях.
import * as fs from 'fs';
import * as path from 'path';
import { normalizeEol } from './helpers/read_source';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { paletteContrast } from '../constants/liquidGlassPaletteRoles';
import { notificationTones } from '../components/notification_center_tones';

const VARIANTS = (['dark', 'light'] as const).flatMap((appearance) => (['calm', 'accent', 'max'] as const).map((level) => ({ appearance, level })));
const hex = (c: string) => c.slice(0, 7);

describe('notificationTones', () => {
  it('подпись на зелёной кнопке и значки типов событий читаются во всех темах', () => {
    const bad: string[] = [];
    for (const variant of VARIANTS) {
      for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
        const g = liquidGlassTokens(id as never, variant as never);
        const tones = notificationTones(g);
        const at = `${id} ${variant.appearance}/${variant.level}`;
        const ink = paletteContrast(hex(tones.rewardButtonInk), hex(tones.rewardButton.backgroundColor));
        if (ink < 4.5) bad.push(`${at}: подпись «Забрать» ${ink.toFixed(2)}`);
        for (const [name, color] of [['good', tones.good], ['gold', tones.gold], ['like', tones.like]] as const) {
          for (const surface of [g.opaqueCard, g.bg]) {
            const r = paletteContrast(hex(color), hex(surface));
            if (r < 3) bad.push(`${at}: ${name} на ${hex(surface)} ${r.toFixed(2)}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('центр уведомлений не держит своих цветов — только роли темы', () => {
    const code = normalizeEol(fs.readFileSync(path.resolve(__dirname, '..', 'components', 'NotificationCenterButton.tsx'), 'utf8'))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
    expect(code.match(/(['"`])#(?:[0-9A-Fa-f]{3,8})\1|rgba?\(\s*\d/g) ?? []).toEqual([]);
    expect(code).not.toMatch(/theme-exempt|EXEMPT_COLOR/);
    expect(code).toContain('notificationTones(shadowGlass)');
  });
});
