import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

/**
 * зачем: владелец: «открываю раздел — он чуть подпрыгивает, будто ассеты грузятся и
 * занимают чуть больше места; хочу как в Bevel — открыл и статично». Причины были две:
 * (1) иконки разделов и плитки хаба карточек не входили ни в один прогрев, поэтому
 *     декодировались уже во время показа экрана;
 * (2) карточка статистики на главной имела РАЗНУЮ minHeight в состояниях «данные не
 *     готовы» (196) и «готовы» (184) — при готовности она сжималась и весь контент под
 *     ней подскакивал, в том числе при возврате на главную.
 * Тест фиксирует вычищенное состояние.
 */
describe('прогрев ассетов разделов и стабильная высота главной', () => {
  it('прогрев покрывает все иконки разделов с главной', () => {
    const source = read('app/section_asset_preload.ts');
    for (const slot of [
      'menu.lesson', 'menu.cards', 'menu.league', 'menu.test',
      'menu.practice', 'menu.dialogs', 'menu.exam', 'menu.shop', 'menu.heroMap',
    ]) {
      expect(source).toContain(slot);
    }
  });

  it('прогрев покрывает плитки хаба карточек', () => {
    const source = read('app/section_asset_preload.ts');
    for (const slot of ['hub.saved', 'hub.custom', 'hub.training', 'hub.audio', 'hub.collection']) {
      expect(source).toContain(slot);
    }
    expect(source).not.toContain('hub.arena');
  });

  it('греет только активную тему, а не все 12 сразу', () => {
    const source = read('app/section_asset_preload.ts');
    expect(source).toContain('preloadSectionAssets(themeMode: ThemeMode)');
    // Идемпотентность: повторный вызов на той же теме не гоняет декодирование заново.
    expect(source).toContain('warmedThemes');
  });

  it('прогрев запускается после первого кадра и переживает смену темы', () => {
    const source = read('app/_layout.tsx');
    expect(source).toContain('m.preloadSectionAssets(themeMode)');
    const call = source.slice(source.indexOf('m.preloadSectionAssets(themeMode)') - 400);
    expect(call).toContain('InteractionManager.runAfterInteractions');
  });

  it('карточка статистики на главной держит одну высоту в обоих состояниях', () => {
    const source = read('app/(tabs)/home.tsx');
    expect(source).toContain('const HOME_STATS_CARD_MIN_HEIGHT = 196;');
    expect(source).toContain('minHeight: HOME_STATS_CARD_MIN_HEIGHT');
    // Прежняя схлопывающаяся высота не должна вернуться (в комментарии-«зачем» она
    // упомянута намеренно — считаем только реальный код, без строк-комментариев).
    const codeLines = source
      .split('\n')
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line));
    expect(codeLines.some((line) => /minHeight:\s*homeStatsReady\s*\?/.test(line))).toBe(false);
  });

  /**
   * зачем: «Цель лиги», фраза дня и подвал жили под belowFoldReady, который
   * стартовал с false на КАЖДОМ маунте. Возврат с раздела размораживает таб → флаг снова
   * false → блоки исчезали и вставлялись кадром позже, толкая верстку. Отложенный второй
   * проход нужен только первому маунту в сессии (бюджет холодного старта).
   */
  it('нижняя часть главной не пересобирается при каждом возврате', () => {
    const source = read('app/(tabs)/home.tsx');
    expect(source).toContain('let homeBelowFoldReadyOnce = false;');
    expect(source).toContain('useState(homeBelowFoldReadyOnce)');
    expect(source).toContain('homeBelowFoldReadyOnce = true;');
    // Ранний выход: на повторных маунтах отложенный проход не планируется заново.
    expect(source).toContain('if (homeBelowFoldReadyOnce) return undefined;');
    const codeLines = source
      .split('\n')
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line));
    expect(codeLines.some((line) => /useState\(false\)[^\n]*belowFold/i.test(line))).toBe(false);
  });

  it('реестр иконок хаба экспортирован для прогрева', () => {
    expect(read('app/flashcards/FlashcardsCategoryHub.tsx'))
      .toContain('export const FLASHCARDS_MODE_ICON_ASSETS');
  });
});
