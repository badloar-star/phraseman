import { splitTheoryHighlight } from '../components/theory/highlight';

describe('theory highlight splitting', () => {
  it('highlights standalone articles instead of matching inside a word', () => {
    expect(splitTheoryHighlight('I saw a dog.', 'a')).toEqual(['I saw ', 'a', ' dog.']);
  });

  it('highlights standalone prepositions instead of matching inside nearby words', () => {
    expect(splitTheoryHighlight('The phone is on the table.', 'on')).toEqual([
      'The phone is ',
      'on',
      ' the table.',
    ]);
  });

  it('supports multi-word highlights', () => {
    expect(splitTheoryHighlight('She sits next to the window.', 'next to')).toEqual([
      'She sits ',
      'next to',
      ' the window.',
    ]);
  });
});
