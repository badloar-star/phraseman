// зачем (приказ владельца 04–05.11: «убрать любое затемнение низа сцены везде»): у сцены сообщества нет тёмного градиента снизу.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/packs/CommunityScene.tsx'), 'utf8').split('\r\n').join('\n');

describe('сцена сообщества: без затемнения низа', () => {
  it('нет градиента rgba(0,0,0,…) у низа сцены', () => {
    expect(src).not.toContain("'rgba(0,0,0,0.4)'");
    expect(src).not.toMatch(/bottom: 0, height: 300 \}\} \/>/);
  });
});
