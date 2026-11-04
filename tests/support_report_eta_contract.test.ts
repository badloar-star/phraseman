// зачем (раунд 2 UX, 05.11): после отправки обращения видно срок ответа «1–2 дня»; строка на 9 языках, ≥15 px, токены.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/support_report.tsx'), 'utf8').split('\r\n').join('\n');

describe('support_report: срок ответа после отправки', () => {
  it('строка «Ответим в течение 1–2 дней» есть на 9 языках и с testID', () => {
    expect(src).toContain('testID="support-sent-eta"');
    expect(src).toContain("L('Ответим в течение 1–2 дней', 'Відповімо протягом 1–2 днів'");
    expect(src).toContain("'Odpowiemy w ciągu 1–2 dni')");
  });
  it('размер текста не меньше 15 px', () => {
    const i = src.indexOf('testID="support-sent-eta"');
    expect(src.slice(i, i + 300)).toContain('fontSize: scaled(15)');
  });
});
