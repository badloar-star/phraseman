import fs from 'fs';
import path from 'path';

describe('home theo advisor card contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'HomeTheoAdvisorCard.tsx'), 'utf8');

  it('starts collapsed and reveals the advice text on press', () => {
    expect(source).toContain('const [isExpanded, setIsExpanded] = useState(embedded)');
    expect(source).toContain('setIsExpanded(embedded);');
    expect(source).toContain('setIsExpanded(true);');
    expect(source).toContain('accessibilityState={{ expanded: isExpanded }}');
    expect(source).toContain('{isExpanded ? (');
  });

  it('uses Compass as the visible assistant name', () => {
    expect(source).toContain("const title = label ?? '\\u041a\\u043e\\u043c\\u043f\\u0430\\u0441';");
    expect(source).toContain('{title}');
    expect(source).not.toContain('Theo AI');
  });

  it('uses the theme-specific Compass icon asset', () => {
    expect(source).toContain("import { compassIconSource } from '../constants/weeklyCompassIcons';");
    expect(source).toContain('const compassSource = compassIconSource(themeMode);');
    expect(source).toContain('source={compassSource}');
    expect(source).not.toContain('THEO_COMPASS');
  });

  it('keeps the original advisory action available after expansion', () => {
    expect(source).toContain('if (isExpanded) {');
    expect(source).toContain('onAction(advice.action)');
  });
});
