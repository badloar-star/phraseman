import fs from 'fs';
import path from 'path';

describe('weekly review client contract', () => {
  const clientSource = fs.readFileSync(path.join(__dirname, '../app/weekly_review_client.ts'), 'utf8');
  const cardSource = fs.readFileSync(path.join(__dirname, '../app/WeeklyReviewCard.tsx'), 'utf8');
  const serverSource = fs.readFileSync(path.join(__dirname, '../functions/src/weekly_review.ts'), 'utf8');

  it('uses the same 3/7 day generation window as stats insights', () => {
    expect(clientSource).toContain('const PREMIUM_WINDOW_DAYS = 3');
    expect(clientSource).toContain('const FREE_WINDOW_DAYS = 7');
    expect(serverSource).toContain('const PREMIUM_WINDOW_DAYS = 3');
    expect(serverSource).toContain('const FREE_WINDOW_DAYS = 7');
  });

  it('renders collapsed by default and expands only after a tap', () => {
    expect(cardSource).toContain('const [expanded, setExpanded] = useState(false)');
    expect(cardSource).toContain('setExpanded((value) => !value)');
    expect(cardSource).toContain('{expanded &&');
  });

  it('does not show a next-review countdown footer', () => {
    expect(cardSource).not.toContain('nextReviewCopy(');
  });
});
