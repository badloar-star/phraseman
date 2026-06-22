// Weekly Boons — соответствие текстов бонусов Библии Phraseman (Game Voice).
import { getBoonCopy } from '../app/boons/boon_copy';
import { ALL_BOON_IDS } from '../app/boons/boon_types';
import type { Lang } from '../constants/i18n';

const LANGS: Lang[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

function allCopies(lang: Lang) {
  return ALL_BOON_IDS.map((id) => getBoonCopy(id, lang));
}

describe('boon_copy — Библия Phraseman', () => {
  it('все тексты заданы на 8 языках (непустые)', () => {
    for (const lang of LANGS) {
      for (const c of allCopies(lang)) {
        expect(c.title.trim().length).toBeGreaterThan(0);
        expect(c.subtitle.trim().length).toBeGreaterThan(0);
        expect(c.emoji.trim().length).toBeGreaterThan(0);
        // Развёрнутое описание для модалки: минимум 1 непустой абзац на каждом языке.
        expect(c.detail.length).toBeGreaterThan(0);
        for (const paragraph of c.detail) {
          expect(paragraph.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('русские тексты НЕ содержат запрещённых слов Библии', () => {
    // урок→раунд/сессия, ошибка→попытка, статистика→результаты, купить/цена/подписка→открыть,
    // плюс не используем «прощение/грех» (религиозный пафос) и «не упусти/потеряешь» (loss-framing).
    const forbidden = [
      /\bурок/i, /\bошибк/i, /\bстатистик/i, /\bцена\b/i, /\bстоимост/i, /\bкупит/i,
      /\bподписк/i, /\bпрощени/i, /\bгрех/i, /\bне упусти/i, /\bпотеряеш/i, /\bскучали/i,
    ];
    for (const c of allCopies('ru')) {
      // Проверяем и короткие тексты, и развёрнутое описание модалки.
      const fullText = `${c.title} ${c.subtitle} ${c.detail.join(' ')}`;
      for (const pat of forbidden) {
        expect(fullText).not.toMatch(pat);
      }
    }
  });

  it('заголовки короткие (≤4 слова — это названия)', () => {
    for (const c of allCopies('ru')) {
      const words = c.title.split(/\s+/).filter(Boolean).length;
      expect(words).toBeLessThanOrEqual(4);
    }
  });

  it('описания короткие (≤10 слов — когнитивная лёгкость)', () => {
    for (const c of allCopies('ru')) {
      const words = c.subtitle.split(/\s+/).filter(Boolean).length;
      expect(words).toBeLessThanOrEqual(10);
    }
  });

  it('нет восклицаний через слово (не более 1 «!» на текст)', () => {
    for (const lang of LANGS) {
      for (const c of allCopies(lang)) {
        const bangs = (`${c.title} ${c.subtitle}`.match(/!/g) ?? []).length;
        expect(bangs).toBeLessThanOrEqual(1);
      }
    }
  });
});
