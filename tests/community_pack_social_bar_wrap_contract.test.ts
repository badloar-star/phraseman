// зачем (аудит длинных строк 9 языков 13.10): ряд «лайк · N добавили · отклики · В топе» не должен выходить за край экрана на es/pt-BR и крупном шрифте ОС — переносится на вторую строку, а не сжимает шрифт.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/community_packs/CommunityPackSocialBar.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('соц-ряд набора: длинные подписи', () => {
  it('ряд счётчиков переносится (flexWrap) с зазором между строками и не сжимает шрифт', () => {
    // последний вариант ряда (универсальный, с подписями «добавили» и «В топе»); остальные варианты — только значки и числа
    const at = src.lastIndexOf("testID={`pack-like-${pack.id}`}");
    expect(at).toBeGreaterThan(0);
    const rowStart = src.lastIndexOf('<View style={{', at);
    const row = src.slice(rowStart, at);
    expect(row).toContain("flexWrap: 'wrap'");
    expect(row).toContain('columnGap: 12');
    expect(row).toContain('rowGap: 6');
    expect(src).not.toContain('adjustsFontSizeToFit');
  });
});
