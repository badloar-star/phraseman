import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, '../app/avatar_select.tsx'), 'utf8');

for (const phrase of [
  "'pt-BR': 'Yin, visual preto, pagamento com runas'",
  "vi: 'Yin, diện mạo màu đen, thanh toán bằng rune'",
  "id: 'Yin, tampilan hitam, bayar dengan rune'",
  "tr: 'Yin, siyah görünüm, rünlerle ödeme'",
  "pl: 'Yin, czarny wygląd, płatność runami'",
  "'pt-BR': 'Yang, visual claro, pagamento com pérolas'",
  "vi: 'Yang, diện mạo sáng, thanh toán bằng ngọc trai'",
  "id: 'Yang, tampilan terang, bayar dengan mutiara'",
  "tr: 'Yang, açık görünüm, incilerle ödeme'",
  "pl: 'Yang, jasny wygląd, płatność perłami'",
]) assert.ok(source.includes(phrase), `missing localized Yin/Yang accessibility description: ${phrase}`);

process.stdout.write('AVATAR YIN YANG ACCESSIBILITY GATE: PASS\n');
