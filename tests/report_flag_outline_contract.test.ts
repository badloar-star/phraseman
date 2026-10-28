// зачем (R1 spire-gap-001/002/004/005, Сверка 12.10): красный флажок «пожаловаться» контурный, как в макетах (kit.js `flag`: древко и волна без заливки).
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/ReportErrorButton.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('флажок «пожаловаться»', () => {
  it('icon-flag рисует контурный Ionicons flag-outline вторичным цветом темы (макет cards.html: var(--sec)), не красным, залитого flag нет', () => {
    expect(src).toContain(`<Ionicons name="flag-outline" size={17} color={flagTone === 'bad' ? t.wrong : glass.secondary} />`);
    expect(src).toContain(`flagTone = 'secondary'`);
    expect(src).not.toContain('<Ionicons name="flag" size={17} ');
    // Шпиль по своему макету (spire-gaps-states.html .sg-rep) остаётся цветом ошибки
    const spire = fs.readFileSync(path.join(__dirname, '..', 'modules/spire/SpireTaskReportButton.tsx'), 'utf8');
    expect(spire).toContain('flagTone="bad"');
  });
});
