// зачем (Сверка df455f92d, кадр 12; координатор 15.10): подпись этапа интро «СМЫСЛ» переносилась по буквам («СМЫС»/«Л»), потому что делила узкий
// остаток ширины с «1 / 3» между кнопкой закрытия и плашками (сердца, энергия, монеты). Лечим вёрсткой, без сжатия шрифта (adjustsFontSizeToFit запрещён).
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/learning_v2_session_intro.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('интро занятия: подпись этапа не переносится по буквам', () => {
  it('метка в одну строку и не сжимается; счётчик — отдельный элемент под ней', () => {
    expect(src).toMatch(/numberOfLines=\{1\}\n\s+ellipsizeMode="clip"\n\s+style=\{\[sx\.stageLabel,/);
    expect(src).toMatch(/stageMeta: \{\n\s+flex: 1,\n\s+minWidth: 0,\n\s+flexDirection: "column",/);
    expect(src).toMatch(/stageLabel: \{\n\s+flexShrink: 0,/);
    expect(src).toContain('pageCounter: { flexShrink: 0,');
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
