// зачем (правило владельца «каждый раздел открывается мгновенно», аудит 04.10): опрос не должен показывать полноэкранный спиннер, если stable id уже в памяти.
import fs from 'node:fs';
import path from 'node:path';

describe('mistakes list first frame', () => {
  const read = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
  it('seeds the list from the hub snapshot keyed by account, target and language', () => {
    const hub = read('app/mistakes_hub.tsx');
    const list = read('app/mistakes_list.tsx');
    expect(hub).toContain('export function peekMistakesHubSnapshot(');
    expect(hub).toContain("return `${peekStableId() ?? ''}:${target}:${lang}`;");
    // зачем (11.10): первый кадр по-прежнему из снимка хаба; локально скрытые ошибки из него вычитаются.
    expect(list).toContain('useState<readonly MistakePracticeListItem[] | null>(() => {');
    expect(list).toContain('const peeked = peekMistakesHubSnapshot(target, lang)?.items;');
    expect(list).toContain('return peeked ? withoutLocallyHiddenMistakes(peeked) : null;');
  });
});
