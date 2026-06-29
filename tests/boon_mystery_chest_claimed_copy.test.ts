// «Сундук недели» (mystery_monday): после того как награда забрана на этой неделе,
// плашка/модалка НЕ должны звать «открой и забери своё» — иначе у юзера ощущение,
// что есть ещё один неоткрытый сундук. Этот контракт фиксирует claimed-копии.

import {
  getBoonCopy,
  getMysteryChestClaimedSubtitle,
  getMysteryChestClaimedDetail,
} from '../app/boons/boon_copy';
import type { Lang } from '../constants/i18n';

// Языки, которые claimed-копии локализуют явно (остальные коды падают на ru через triLang).
const LANGS: readonly Lang[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

describe('mystery_monday — claimed copy (сундок недели уже открыт)', () => {
  it('claimed-подзаголовок отличается от исходного «открой и забери» (все языки)', () => {
    for (const lang of LANGS) {
      const fresh = getBoonCopy('mystery_monday', lang).subtitle;
      const claimed = getMysteryChestClaimedSubtitle(lang);
      expect(claimed.length).toBeGreaterThan(0);
      expect(claimed).not.toBe(fresh);
    }
  });

  it('claimed-подзаголовок не зовёт открывать сундук (ru)', () => {
    const claimed = getMysteryChestClaimedSubtitle('ru');
    // «Открой/открыть» = зов к действию, которого после получения награды быть не должно.
    expect(claimed.toLowerCase()).not.toMatch(/откро[йи]|открыть/);
    // Зато явно сообщает, что награда уже у юзера.
    expect(claimed.toLowerCase()).toMatch(/забрал|забран|следующ/);
  });

  it('claimed-описание модалки — непустые абзацы, отличается от исходного (все языки)', () => {
    for (const lang of LANGS) {
      const fresh = getBoonCopy('mystery_monday', lang).detail;
      const claimed = getMysteryChestClaimedDetail(lang);
      expect(claimed.length).toBeGreaterThan(0);
      for (const p of claimed) {
        expect(typeof p).toBe('string');
        expect(p.length).toBeGreaterThan(0);
      }
      expect(claimed.join('\n')).not.toBe(fresh.join('\n'));
    }
  });

  it('неизвестный язык → fallback на ru (не undefined)', () => {
    // @ts-expect-error — проверяем устойчивость к неподдержанному коду языка
    const sub = getMysteryChestClaimedSubtitle('zz');
    expect(typeof sub).toBe('string');
    expect(sub.length).toBeGreaterThan(0);
    // @ts-expect-error — то же для детального описания
    const det = getMysteryChestClaimedDetail('zz');
    expect(det.length).toBeGreaterThan(0);
  });
});
