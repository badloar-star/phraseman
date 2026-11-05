// Governance-ID: TG-BF6A8ECE6C57
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  PLUS_TAB_FREE_LABEL,
  PLUS_TAB_HEADLINE,
  PLUS_TAB_ITEMS,
  PLUS_TAB_SUBLINE,
  plusTabItems,
} from '../components/plus-tab/plus_tab_items';

// зачем (слово владельца 05.11, макет plus_tab_approved_2026-11-05.html): сплошной список без заголовков разделов, 16 пунктов («Языки курса» вторым),
// без кольца у аватара и без «Видео и фраз из них»; «Цвет приложения» — только при включённом флаге theme_sliders; тексты на 9 языках.
const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('вкладка Plus: список «Бесплатно / Plus»', () => {
  test('всего 16 пунктов, «Языки курса» — вторым после «Уроки курса»', () => {
    expect(PLUS_TAB_ITEMS).toHaveLength(16);
    expect(PLUS_TAB_ITEMS[0].key).toBe('lessons');
    expect(PLUS_TAB_ITEMS[1].key).toBe('languages');
  });

  test('«Цвет приложения» только при включённом флаге theme_sliders (15 → 16)', () => {
    expect(plusTabItems(false)).toHaveLength(15);
    expect(plusTabItems(false).some((item) => item.key === 'color')).toBe(false);
    expect(plusTabItems(true)).toHaveLength(16);
    expect(plusTabItems(true).some((item) => item.key === 'color')).toBe(true);
  });

  test('нет кольца у аватара и «Видео и фразы из них»', () => {
    const keys = PLUS_TAB_ITEMS.map((item) => item.key);
    expect(keys).not.toContain('ring');
    expect(keys).not.toContain('video_phrases');
    expect(JSON.stringify(PLUS_TAB_ITEMS)).not.toMatch(/Видео и фразы|кольцо|Кольцо/);
  });

  test('все тексты есть на 9 языках интерфейса', () => {
    for (const item of PLUS_TAB_ITEMS) {
      for (const lang of LANGS) {
        expect((item.title as Record<string, string>)[lang]?.trim()).toBeTruthy();
        expect((item.plus as Record<string, string>)[lang]?.trim()).toBeTruthy();
        if (item.free) expect((item.free as Record<string, string>)[lang]?.trim()).toBeTruthy();
      }
    }
    for (const copy of [PLUS_TAB_HEADLINE, PLUS_TAB_SUBLINE, PLUS_TAB_FREE_LABEL]) {
      for (const lang of LANGS) expect((copy as Record<string, string>)[lang]?.trim()).toBeTruthy();
    }
  });

  test('заголовок и подзаголовок — по макету', () => {
    expect(PLUS_TAB_HEADLINE.ru).toBe('Занимайся сколько хочешь');
    expect(PLUS_TAB_SUBLINE.ru).toBe('Всё, что даёт Plus');
  });

  test('ключевые числа совпадают с макетом (уроки 1–3 / все 32, 3 в день, 30 в месяц, 50)', () => {
    const byKey = Object.fromEntries(PLUS_TAB_ITEMS.map((item) => [item.key, item]));
    expect(byKey.lessons.free?.ru).toBe('Уроки 1–3');
    expect(byKey.lessons.plus.ru).toBe('Все 32');
    expect(byKey.speak.free?.ru).toBe('3 в день');
    expect(byKey.dialogs_ai.free?.ru).toBe('30 в месяц');
    expect(byKey.saved.free?.ru).toBe('50');
    expect(byKey.streak_shield.free).toBeNull();
  });

  test('экран берёт цвета из темы и не вводит заголовков разделов', () => {
    const screen = fs.readFileSync(path.join(__dirname, '..', 'components', 'plus-tab', 'PlusTabScreen.tsx'), 'utf8');
    expect(screen).toContain('THEME_SLIDERS_V1_ENABLED');
    expect(screen).toContain('usePaywallPurchase');
    expect(screen).toContain('ULTRA_PALETTE');
    expect(screen).not.toMatch(/section(Title|Header)/i);
  });
});
