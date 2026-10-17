// зачем (Сверка df455f92d, кадр 12; координатор 15.10): подпись этапа интро «СМЫСЛ» переносилась по буквам («СМЫС»/«Л»), потому что делила узкий
// остаток ширины с «1 / 3» между кнопкой закрытия и плашками (сердца, энергия, монеты). Лечим вёрсткой, без сжатия шрифта (adjustsFontSizeToFit запрещён).
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/learning_v2_session_intro.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('интро занятия: подпись этапа не переносится по буквам', () => {
  it('метка в одну строку и не сжимается; счётчик — отдельный элемент под ней', () => {
    // зачем (координатор 17.10, сторож learning_v2_liquid_glass_source_contract): обрезка запрещена — метка не сжимается и не обрезается, место берётся высотой
    expect(src).not.toContain('numberOfLines');
    expect(src).not.toContain('ellipsizeMode');
    expect(src).toMatch(/<Text style=\{\[sx\.stageLabel,/);
    expect(src).toMatch(/stageMeta: \{\n\s+flex: 1,\n\s+minWidth: 0,\n\s+flexDirection: "column",/);
    expect(src).toMatch(/stageLabel: \{\n\s+flexShrink: 0,/);
    expect(src).toContain('pageCounter: { flexShrink: 0,');
  });

  it('в шапке ИНТРО нет плашки монет (макет learning-v2.html: только сердца и энергия); в шапке заданий она остаётся', () => {
    const player = fs.readFileSync(path.join(__dirname, '..', 'app/learning_v2_direct_session_player_v1.tsx'), 'utf8').replace(/\r\n/g, '\n');
    const start = player.indexOf('headerAccessory={');
    const introAccessory = player.slice(start, player.indexOf('</View>', start));
    expect(start).toBeGreaterThan(0);
    expect(introAccessory).toContain('learning-v2-intro-attempts');
    expect(introAccessory).toContain('<EnergyBar glass />');
    expect(introAccessory).not.toContain('runeHud');
    // шапка заданий: плашка монет на месте
    const practiceHeader = player.slice(player.indexOf('<View style={styles.headerActions}>', start + 400));
    expect(practiceHeader.slice(0, 1200)).toContain('{runeHud}');
  });

  it('шрифт не ужимается по ширине', () => {
    expect(src).not.toContain('adjustsFontSizeToFit');
  });

  it('самые длинные названия этапов (9 языков × 3 этапа) не длиннее 9 знаков — иначе нужна проверка на узком экране', () => {
    const block = src.slice(src.indexOf('stageLabels: ['), src.indexOf('] as const'));
    const labels = [...block.matchAll(/(?:ru|uk|en|es|"pt-BR"|vi|id|tr|pl): "([^"]+)"/g)].map((m) => m[1]);
    expect(labels).toHaveLength(27);
    const longest = Math.max(...labels.map((l) => l.length));
    expect(longest).toBeLessThanOrEqual(9);
  });
});
