// зачем (решение координатора 25.10, вариант Б; правило владельца theme-colors-only): значок «непрочитано» был постоянным
// #EF4444 с белой цифрой (3,76 при пороге 4,5). Теперь краска — красный текущей темы из одного источника notificationBadgePaint.
// Сторож: (1) кружок отличим от поверхности (≥ 3) и цифра читается (≥ 4,5) во всех 29 темах × светлая/тёмная × уровни —
// отдельно на сцене Главной и на шторке/списке; (2) все места берут один источник, постоянного красного нет.
import { readFileSync } from 'fs';
import { join } from 'path';
import { LIQUID_GLASS_THEME_IDS, liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { colorContrast } from '../constants/color_contrast';
import {
  NOTIFICATION_BADGE_FILL_MIN,
  NOTIFICATION_BADGE_INK_MIN,
  notificationBadgePaintFor,
  notificationBadgeSurfaces,
} from '../components/homeNotificationBadge';

const src = (rel: string): string => readFileSync(join(__dirname, '..', rel), 'utf8');

describe('значок уведомлений — красный темы (25.10)', () => {
  it.each(['scene', 'sheet'] as const)('место %s: кружок ≥ 3 к поверхности, цифра ≥ 4,5 во всех 174', (place) => {
    const bad: string[] = [];
    let n = 0;
    for (const appearance of ['dark', 'light'] as const) for (const level of ['calm', 'accent', 'max'] as const) for (const id of LIQUID_GLASS_THEME_IDS as readonly string[]) {
      const g = liquidGlassTokens(id as never, { level, appearance } as never);
      n++;
      const p = notificationBadgePaintFor(id, g, place);
      for (const s of notificationBadgeSurfaces(id, g, place)) {
        const k = colorContrast(p.fill, s.slice(0, 7));
        if (k < NOTIFICATION_BADGE_FILL_MIN) bad.push(`${appearance}/${id}/${level} кружок ${p.fill} на ${s}: ${k.toFixed(2)}`);
      }
      const ink = colorContrast(p.ink.slice(0, 7), p.fill);
      if (ink < NOTIFICATION_BADGE_INK_MIN) bad.push(`${appearance}/${id}/${level} цифра ${p.ink} на ${p.fill}: ${ink.toFixed(2)}`);
    }
    expect(n).toBe(174);
    expect(bad).toEqual([]);
  });

  it('один источник: конверт, почта, центр уведомлений и демо берут notificationBadgePaint, без постоянного красного', () => {
    const files = [
      'components/AppMessagesInbox.tsx',
      'components/NotificationCenterButton.tsx',
      'components/dev/motion_showcase/sections/press_icons_tabbar.tsx',
    ];
    for (const f of files) {
      const s = src(f);
      const code = s.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\{\/\*)/.test(l)).join('\n');
      expect(s).toContain('notificationBadgePaint(liquidGlassThemeId');
      expect(code).not.toMatch(/HOME_NOTIFICATION_BADGE_(TEXT_)?COLOR|#EF4444/i);
    }
    expect(src('components/AppMessagesInbox.tsx')).toContain("{ color: badgeOnScene.ink }");
    const badgeCode = src('components/homeNotificationBadge.ts').split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n');
    expect(badgeCode).not.toMatch(/#[0-9a-f]{6}\b|rgba?\(/i);
  });
});
