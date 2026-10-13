// зачем (Макеты, кандидаты 12.10): три сторожа. (1) Шапка набора не ставит свой боковой отступ — он уже есть у сетки (иначе текст стоит на 40 вместо края списка).
// (2) dev-подмена отказа «Устно» снимает loading, иначе вместо панели рисуется скелет. (3) Шаг робота `await:` ждёт элемент и ничего не нажимает.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('R1 кандидаты Макетов: шапка набора, «Устно», офлайн-набор', () => {
  it('PackInfoBlock: стиль info без бокового отступа, сетка держит свой', () => {
    const header = read('app/flashcards/PackHeaderV2.tsx');
    const info = header.match(/^\s*info: \{([^}]*)\}/m);
    expect(info).not.toBeNull();
    expect(info![1]).not.toContain('paddingHorizontal');
    const gallery = read('app/flashcards/CollectionGalleryView.tsx');
    expect(gallery).toMatch(/content: \{ paddingHorizontal: SIDE,/);
  });

  it('«Устно»: ветка fail_speaking снимает loading', () => {
    const src = read('app/flashcards_speaking_session.tsx');
    const at = src.indexOf("if (getDevTrainGate() === 'fail_speaking') {");
    expect(at).toBeGreaterThan(0);
    const branch = src.slice(at, src.indexOf('return undefined;', at));
    expect(branch).toContain('setQuotaUnavailable(true);');
    expect(branch).toContain('setLoading(false);');
  });

  it('шаг await: разбирается как цель без нажатия; cards-gap-034 ждёт тост', () => {
    const mod = path.join(__dirname, '..', 'scripts', 'parity_steps.mjs').split(path.sep).join('/');
    const parse = (raw: string) => spawnSync(process.execPath, ['--input-type=module', '-e', `import * as m from 'file:///${mod}'; try { console.log(JSON.stringify(m.parseSteps(${JSON.stringify(raw)}))); } catch (e) { console.log('ERR:' + e.message); }`], { encoding: 'utf8' }).stdout.trim();
    expect(parse('await:Набор ещё не скачан')).toBe(JSON.stringify([{ op: 'await', value: 'Набор ещё не скачан' }]));
    expect(parse('await')).toBe('ERR:step_no_target:await');
    const py = read('scripts/dev_links_r1_steps.py');
    expect(py).toContain("add('cards-gap-034', ['tap:#flashcards-pack-card-dev_demo_community_2', 'wait:5500', 'await:Набор ещё не скачан']");
  });
});
