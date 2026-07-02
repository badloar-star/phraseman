import fs from 'fs';
import path from 'path';

describe('weekly review client contract', () => {
  const clientSource = fs.readFileSync(path.join(__dirname, '../app/weekly_review_client.ts'), 'utf8');
  const cardSource = fs.readFileSync(path.join(__dirname, '../app/WeeklyReviewCard.tsx'), 'utf8');
  const serverSource = fs.readFileSync(path.join(__dirname, '../functions/src/weekly_review.ts'), 'utf8');

  it('premium regenerates daily, free — once a week (owner decision 2026-07-02)', () => {
    expect(clientSource).toContain('const PREMIUM_WINDOW_DAYS = 1');
    expect(clientSource).toContain('const FREE_WINDOW_DAYS = 7');
    expect(serverSource).toContain('const PREMIUM_WINDOW_DAYS = 1');
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

  it('does not truncate recommended lesson titles in the work-on list', () => {
    const recommendationTextIndex = cardSource.indexOf('{rec.label}');
    const nearbySource = cardSource.slice(Math.max(0, recommendationTextIndex - 180), recommendationTextIndex + 80);

    expect(recommendationTextIndex).toBeGreaterThan(0);
    expect(nearbySource).not.toContain('numberOfLines={1}');
    expect(cardSource).toContain('recText: { flex: 1, flexShrink: 1');
    expect(cardSource).toContain('recRow: { flexDirection:');
    expect(cardSource).toContain('minHeight: 58');
  });

  it('brands the weekly guidance as Compass instead of an error analysis', () => {
    expect(cardSource).toContain("import { weeklyCompassIconSource } from '../constants/weeklyCompassIcons'");
    expect(cardSource).toContain('function WeeklyCompassIcon({');
    expect(cardSource).toContain('Animated.loop(');
    expect(cardSource).not.toContain('name="compass-outline"');
    expect(cardSource).not.toContain('AI REHBER');
    expect(cardSource).toContain("ru: 'Компас'");
    expect(cardSource).toContain("ru: 'Ежедневный разбор ошибок'");
    expect(cardSource).not.toContain("ru: 'Подсказывает, что потренировать дальше'");
    expect(cardSource).toContain("ru: 'Компас готовит подсказки…'");
    expect(cardSource).not.toContain("ru: 'Разбор ошибок'");
    expect(cardSource).not.toContain("ru: 'Только по тем местам, где ты ошибался'");
    expect(cardSource).not.toContain("ru: 'Готовлю твой разбор ошибок…'");
  });
});
