/**
 * §136 (04.10): .gen — единственный источник правды уроков 1–16: генераторы, которые затирают .gen устаревшим
 * _source, без явного флага не запускаются.
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

test('lesson .gen generators refuse to run without the explicit overwrite flag', () => {
  for (const tool of ['tools/prompt006_es_phrase_words.ts', 'tools/prompt007_es_phrase_words.ts']) {
    const src = read(tool);
    expect(src).toContain("process.env.PHRASEMAN_ALLOW_GEN_OVERWRITE !== '1'");
    expect(src.indexOf("PHRASEMAN_ALLOW_GEN_OVERWRITE")).toBeLessThan(src.lastIndexOf('main();'));
  }
});
