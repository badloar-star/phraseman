// зачем (владелец 22.10: «раздел выручки ничего не работает»): снимок аналитики падал по памяти, теперь читает из профилей
// только ANALYTICS_USER_FIELDS. Сторож: каждое поле профиля, которое трогает расчёт, обязано быть в этом списке,
// иначе после правки классификации доступа поле молча придёт пустым и цифры станут неверными.
import fs from 'fs';
import path from 'path';
import { ANALYTICS_USER_FIELDS } from './admin_analytics_core';

describe('admin analytics user field projection', () => {
  const core = fs.readFileSync(path.join(__dirname, 'admin_analytics_core.ts'), 'utf8');
  const main = fs.readFileSync(path.join(__dirname, 'admin_analytics.ts'), 'utf8');

  it('selects every progress field the access classification reads', () => {
    const used = new Set([...core.matchAll(/progress\.([a-z_]+)/g)].map((m) => `progress.${m[1]}`));
    const missing = [...used].filter((field) => !ANALYTICS_USER_FIELDS.includes(field));
    expect(missing).toEqual([]);
  });

  it('selects the top-level fields used for consent, hidden identities and freshness', () => {
    for (const field of ['identityHidden', 'analyticsConsent', 'updatedAt', 'last_active_at']) {
      expect(ANALYTICS_USER_FIELDS).toContain(field);
    }
  });

  it('reads users through the projection, not whole documents', () => {
    expect(main).toContain(".select(...ANALYTICS_USER_FIELDS)");
  });
});
