// зачем (правило владельца «каждый раздел открывается мгновенно», аудит 04.10): опрос не должен показывать полноэкранный спиннер, если stable id уже в памяти.
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, '..', 'app', 'survey_screen.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('survey screen identity check', () => {
  it('verifies the route scope synchronously from the stable id peek in the first render', () => {
    expect(source).toContain('peekStableId()');
    expect(source).toContain("useState<ScopeIdentityState>(\n    () => syncVerifiedIdentity() ?? { phase: 'checking', key: '' },");
  });

  it('keeps the canonical asynchronous check as the authority that can reject the route', () => {
    expect(source).toContain('void getCanonicalUserId()');
    expect(source).toContain("{ phase: 'rejected', key: routeScopeKey }");
  });

  it('does not reset a synchronously verified identity back to checking on the first effect pass', () => {
    expect(source).toContain("current.key === routeScopeKey && current.phase === 'verified' ? current");
  });
});

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
