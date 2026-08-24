import { achievementShelfMaterials } from '../components/achievements/achievementShelfMaterials';

const theme = {
  bgPrimary: '#010203',
  bgCard: '#111213',
  bgSurface: '#212223',
  bgSurface2: '#313233',
  textPrimary: '#F1F2F3',
  accent: '#47C870',
  border: 'rgba(255,255,255,0.07)',
  borderHighlight: 'rgba(71,200,112,0.18)',
  cardShadow: 'rgba(0,0,0,0.55)',
  shadowDark: '#000000',
};

test('large shelf materials are derived from the current theme', () => {
  const result = achievementShelfMaterials(theme, true);

  expect(result.stageGradient).toEqual(['#313233', '#111213', '#212223']);
  expect(result.shelfTopEnd).toBe('#313233');
  expect(result.shelfFaceStart).toBe('#313233');
  expect(result.shelfFaceEnd).toBe('#111213');
  expect(result.reflection).toContain('241,242,243');
  expect(result.border).toBe(theme.border);
  expect(result.shelfEdge).toBe(theme.borderHighlight);
});

test('light themes use a quieter shelf reflection', () => {
  expect(achievementShelfMaterials(theme, false).reflection)
    .not.toBe(achievementShelfMaterials(theme, true).reflection);
});
