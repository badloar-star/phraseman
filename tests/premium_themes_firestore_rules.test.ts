// зачем (координатор 24.10, 🔴): право на тему-достижение пишет только сервер (Admin SDK из callable-функции) — телефон не может записать себе
// premium_theme_entitlements_v1 в users; журнал просмотров видео для темы «Атмосфера» закрыт для клиента и исключён из общего доступа администратора.
// App Check в проекте запломбирован (владелец 17.08) — в комментариях правил его не упоминаем.
import { readSource } from './helpers/read_source';

const rules = readSource('firestore.rules');

describe('правила Firestore: премиум-темы', () => {
  it('поле прав на темы — в списке полей, которые пишет только сервер', () => {
    const at = rules.indexOf("'premium_theme_entitlements_v1',");
    expect(at).toBeGreaterThan(0);
    // стоит в том же списке, что и серверные поля доступа (RevenueCat-признаки)
    const listStart = rules.lastIndexOf("'achievement_access_plus_paid_v1'", at);
    expect(listStart).toBeGreaterThan(0);
    expect(at - listStart).toBeLessThan(600);
  });

  it('журнал просмотров видео закрыт для клиента', () => {
    expect(rules).toMatch(/match \/premium_theme_video_watch\/\{userId\} \{\n\s+allow read, write: if false;\n\s+\}/);
  });

  it('журнал просмотров исключён из общего доступа администратора', () => {
    expect(rules).toContain("&& collection != 'premium_theme_video_watch'");
  });

  it('блок правил премиум-тем не ссылается на App Check', () => {
    const block = rules.slice(rules.indexOf('match /premium_theme_video_watch/') - 300, rules.indexOf('match /premium_theme_video_watch/') + 200);
    expect(block).not.toMatch(/App Check/i);
  });
});
