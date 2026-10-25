// зачем (контраст-гейт OTA Тем 26.10): в плеере V2 значок «прослушать» (на buttonFill) и микрофон у распознанного ответа (на opaqueControl)
// были цвета g.cta — до 1,31 и 1,01: в светлых темах значков не видно. Цвет графики темы g.accentGraphic — ≥ 3,20 и ≥ 4,51 во всех 174 сочетаниях.
import fs from 'node:fs';
import path from 'node:path';

const player = fs.readFileSync(path.join(__dirname, '..', 'app/learning_v2_direct_session_player_v1.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('плеер V2: значки «прослушать» и микрофона — цвет графики темы', () => {
  it('ни один из двух значков не берёт g.cta', () => {
    expect(player).toContain('<Ionicons name="volume-high" size={21} color={g.accentGraphic} />');
    expect(player).toContain('<Ionicons name="mic" size={18} color={g.accentGraphic} />');
    expect(player).not.toContain('<Ionicons name="volume-high" size={21} color={g.cta} />');
    expect(player).not.toContain('<Ionicons name="mic" size={18} color={g.cta} />');
  });
});
