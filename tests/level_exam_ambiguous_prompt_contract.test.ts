const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'level_exam.tsx'), 'utf8');

test('level exam special-question prompt has one unambiguous answer', () => {
  expect(source).toContain("q:'___ is your name?',opts:['Where','How','What','Who'],correct:2");
  expect(source).not.toContain("q:'___ are you?',opts:['Where','How','What','Who'],correct:1");
});
