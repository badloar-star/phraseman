// зачем (координатор 13.10, аудит Авторизации a62d6bb0d): окно решения модерации набора показывало русский для en/pt-BR/vi/id/tr/pl (выбирались только ru/uk/es),
// а readAppLang глотал ошибку немым catch. Тест: все 9 языков интерфейса дают СВОЙ текст на каждый результат, кнопку и тело окна; язык берётся через resolveNotificationLang, а сбой чтения языка пишет причину.
import fs from 'node:fs';
import path from 'node:path';

import { moderationBody, moderationOkLabel, moderationTitle } from '../app/community_packs/community_moderation_copy';
import type { Lang } from '../constants/i18n';

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const RESULTS = ['approved', 'rejected', 'revision_requested', 'pack_removed', 'something_else'] as const;
const CYRILLIC = /[А-Яа-яЁёІіЇїЄє]/;

describe('окно решения модерации: 9 языков', () => {
  it.each(RESULTS)('заголовок «%s»: у каждого языка свой текст, не русский для латиницы и вьетнамского', (result) => {
    const titles = LANGS.map((lang) => moderationTitle(result, lang));
    expect(new Set(titles).size).toBe(LANGS.length);
    for (const [i, lang] of LANGS.entries()) {
      expect(titles[i]).not.toHaveLength(0);
      if (lang !== 'ru' && lang !== 'uk') expect(titles[i]).not.toMatch(CYRILLIC);
    }
  });

  it('кнопка закрытия: 9 разных подписей, без кириллицы вне ru/uk', () => {
    const labels = LANGS.map((lang) => moderationOkLabel(lang));
    expect(new Set(labels).size).toBe(LANGS.length);
    for (const [i, lang] of LANGS.entries()) if (lang !== 'ru' && lang !== 'uk') expect(labels[i]).not.toMatch(CYRILLIC);
  });

  it('тело окна: заявка, комментарий модератора и запасные строки — свой текст на каждом языке', () => {
    const base = { titleRu: 'Путешествия', titleUk: 'Подорожі', titleEs: 'Viajes' };
    const cases: ReadonlyArray<Readonly<{ name: string; ev: Record<string, unknown>; stripTitle?: boolean }>> = [
      { name: 'заявка + комментарий', ev: { ...base, result: 'rejected', submissionId: 'sub_1', message: 'Слишком мало примеров' } },
      { name: 'доработка без комментария', ev: { ...base, result: 'revision_requested', submissionId: 'sub_1' } },
      { name: 'одобрено без комментария', ev: { ...base, result: 'approved', submissionId: 'sub_1' } },
      { name: 'отклонено без пояснения', ev: { ...base, result: 'rejected', submissionId: 'sub_1' } },
      { name: 'нет названия и заявки — подсказка про «Карточки»', ev: { result: 'approved', packId: 'p1' }, stripTitle: true },
    ];
    for (const c of cases) {
      const bodies = LANGS.map((lang) => moderationBody(c.ev, lang));
      // название набора (ru/uk/es из события) может совпасть в двух языках — различие проверяем по служебным строкам
      const tails = bodies.map((b, i) => (c.stripTitle ? b : b.split('\n\n').slice(1).join('\n\n') || b) + `|${LANGS[i]}`);
      const service = tails.map((t) => t.replace(/\|.+$/, ''));
      expect(new Set(service).size).toBe(LANGS.length);
      for (const [i, lang] of LANGS.entries()) {
        if (lang === 'ru' || lang === 'uk') continue;
        const withoutPackTitle = bodies[i].replace(/Путешествия|Подорожі|Viajes|Слишком мало примеров/g, '');
        expect(withoutPackTitle).not.toMatch(CYRILLIC);
      }
    }
  });

  it('комментарий модератора доходит как есть, а ярлык «Комментарий» переведён', () => {
    const ev = { result: 'rejected', message: 'Add examples', titleEs: 'Viajes' };
    expect(moderationBody(ev, 'en')).toContain('Comment:\nAdd examples');
    expect(moderationBody(ev, 'pl')).toContain('Komentarz:\nAdd examples');
    expect(moderationBody(ev, 'vi')).toContain('Nhận xét:\nAdd examples');
  });

  it('источник: язык через resolveNotificationLang, ошибка чтения языка пишет причину, узкого разбора ru/uk/es больше нет', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'community_packs', 'communityModerationAlerts.ts'), 'utf8').replace(/\r\n/g, '\n');
    expect(src).toContain("resolveNotificationLang(stored, 'community_moderation_alert')");
    expect(src).toContain('[MOD-ALERT] app_lang не прочитан');
    expect(src).not.toContain("lang.startsWith('uk')");
    expect(src).not.toContain("lang.startsWith('es')");
    expect(src).not.toMatch(/catch \{\s*return 'ru';/);
  });
});
