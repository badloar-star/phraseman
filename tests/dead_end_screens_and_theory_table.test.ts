// зачем (координатор 15.10, три мелких экрана): 1) «Теория» — таблицы на всю ширину карточки (колонка делит контейнер, шрифт не ужимается, узкие колонки — прокрутка);
// 2) mistake_detail без записи — основная кнопка «К ошибкам» (9 языков); 3) «Диалог не найден» — «Назад» на всю ширину через общий вид тупика V2DeadEnd.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('«Теория»: таблица на всю ширину', () => {
  const src = read('components/lesson_help_theory_ui.tsx');

  it('ширина колонки = max(минимум, контейнер / число колонок), общая ширина и индикатор считаются от неё', () => {
    expect(src).toContain('const colW = containerW > 0 ? Math.max(TABLE_COL_MIN_W, containerW / numCols) : TABLE_COL_MIN_W;');
    expect(src).toContain('const contentW = numCols * colW;');
    expect(src).toContain('const canScroll = containerW > 0 && contentW > containerW + 0.5;');
    expect(src).not.toContain('width: TABLE_COL_MIN_W,');
    expect(src.match(/width: colW,/g)?.length).toBe(2); // заголовок и строки
  });

  it('расчёт: 2 колонки на карточке 380 → 190 (вся ширина, а не 264 из 380 «2/3»), 4 колонки на 380 → 132 с прокруткой', () => {
    const MIN = 132;
    const col = (containerW: number, n: number) => Math.max(MIN, containerW / n);
    expect(col(380, 2) * 2).toBe(380);
    expect(col(380, 3) * 3).toBe(396); // 380/3 = 126,7 < минимума 132 — колонки по минимуму, прокрутка на 16 dp
    expect(col(380, 4) * 4).toBe(528);
    expect(col(380, 4) * 4 > 380 + 0.5).toBe(true);
    expect(col(0, 2)).toBe(MIN); // до замера — как раньше
  });

  it('шрифт ячеек не ужимается (adjustsFontSizeToFit нет), длинные ячейки переносятся', () => {
    expect(src).not.toContain('adjustsFontSizeToFit');
  });
});

describe('общий вид тупиковых экранов', () => {
  const dead = read('components/v2/V2DeadEnd.tsx');

  it('основная кнопка на всю ширину блока, 52 dp, заливка и подпись из токенов темы', () => {
    expect(dead).toContain("cta: { alignSelf: 'stretch', borderRadius: 26,");
    expect(dead).toContain('const CTA_MIN_HEIGHT = 52;');
    expect(dead).toContain('backgroundColor: g.cta');
    expect(dead).toContain('color: g.ctaInk');
    expect(dead).toContain("wrap: { width: '100%', maxWidth: 520,");
  });

  it('кегли и высота кнопки — из общей шкалы (f/ds), а не константы: масштаб шрифта и uiScale работают', () => {
    expect(dead).toContain('const { liquidGlassThemeId, f, ds } = useTheme();');
    expect(dead).toContain('fontSize: f.h1');
    expect(dead).toContain('fontSize: f.body');
    expect(dead).toContain('fontSize: f.bodyLg');
    expect(dead).toContain('minHeight: Math.max(CTA_MIN_HEIGHT, ds.buttonHeight)');
    expect(dead).not.toMatch(/fontSize: (22|16),/);
  });

  it('mistake_detail без записи: кнопка «К ошибкам» ведёт назад к списку; ключ есть на всех 9 языках', () => {
    const src = read('app/mistake_detail.tsx');
    expect(src).toContain('<V2DeadEnd testID="mistake-detail-missing" body={copy.noData} actionLabel={copy.toMistakes} onAction={goBack} />');
    for (const lang of ['ru', 'uk', 'en', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl']) {
      const line = src.split('\n').find((l) => l.startsWith(`  ${lang}: { back:`));
      expect([lang, !!line && line.includes(' toMistakes: ')]).toEqual([lang, true]);
    }
    expect(src).toContain("const goBack = useCallback(() => safeRouterBack(router, '/mistakes_list' as never), [router]);");
  });

  it('«Диалог не найден» (RecoveryScreen) рисуется общим V2DeadEnd — «Назад» на всю ширину', () => {
    const src = read('app/ai_dialog_briefing.tsx');
    expect(src).toContain("import V2DeadEnd from '../components/v2/V2DeadEnd';");
    expect(src).toContain('<V2DeadEnd testID="ai-dialog-recovery" icon={icon} title={title} body={body} actionLabel={action} onAction={onBack} />');
    expect(src).not.toContain('minWidth: 180');
  });
});
