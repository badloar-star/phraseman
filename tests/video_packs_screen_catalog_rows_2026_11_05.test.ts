// Governance-ID: TG-7F92E00E0F57
import fs from 'node:fs';
import path from 'node:path';

// зачем (слово владельца 05.11 через координатора): экран «Из видео» — список строк-карточек как эталон rev7-packs-video
// (стопка cards.webp, название набора, «N карточек · длительность», ›), без обложек и без «Добавить» на списке.
const screen = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards_video_packs.tsx'), 'utf8');
const row = fs.readFileSync(path.join(__dirname, '..', 'app', 'flashcards', 'VideoPackRow.tsx'), 'utf8');
const packRow = fs.readFileSync(path.join(__dirname, '..', 'components', 'packs', 'PackRow.tsx'), 'utf8');

describe('экран «Из видео»: список строк как утверждённый макет', () => {
  test('отдельный экран рисует строки catalog, встроенная вкладка — прежний plain', () => {
    expect(screen).toContain("variant={embedded ? 'plain' : 'catalog'}");
    expect(screen).not.toContain("variant={embedded ? 'plain' : 'card'}");
  });

  test('строка catalog: стопка cards.webp, название, «N карточек · длительность», шеврон, без «Добавить»', () => {
    const catalog = row.slice(row.indexOf("variant === 'catalog'"), row.indexOf("variant === 'catalog'") + 600);
    expect(catalog).toContain('<PackCatalogRow');
    expect(catalog).toContain('duration={duration}');
    expect(catalog).not.toContain('videoAdd');
    expect(packRow).toContain("v2art/dark/cards.webp");
    expect(packRow).toContain('chevron-forward');
  });

  test('язык наборов — текст справа в шапке, меню (язык, поиск, сортировка) сохранено', () => {
    expect(screen).toContain('packLanguageLabel(packLanguage, lang)');
    expect(screen).toContain('testID="fc-video-packs-menu"');
    expect(screen).toContain('fc-video-packs-menu-sheet');
  });

  test('скелет совпадает по геометрии со строкой catalog (86, радиус 18)', () => {
    expect(screen).toMatch(/skeletonRow: \{ height: 86, borderRadius: 18/);
  });

  test('добавление набора живёт на экране набора, а не на списке', () => {
    const watch = fs.readFileSync(path.join(__dirname, '..', 'app', 'lingman_video_watch.tsx'), 'utf8');
    expect(watch).toContain('variant="previewCta"');
  });
});
