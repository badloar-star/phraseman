import * as fs from 'fs';
import * as path from 'path';

describe('lesson 15 theory common mistakes', () => {
  it('contrasts the invalid standalone determiner with the possessive pronoun', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'app', 'theory_content_lesson15.ts'),
      'utf8',
    );

    expect(source).toContain("{ wrong: 'This is my', right: 'This is mine' }");
    expect(source).not.toContain("{ wrong: 'This is mine', right: 'This is mine' }");
  });
});
