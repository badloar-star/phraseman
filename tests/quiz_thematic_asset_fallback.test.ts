import { themedQuizAsset } from '../app/quiz_thematic_registry';

describe('thematic quiz visual asset fallback', () => {
  it('keeps plaque backgrounds and logos visible when exact theme keys are absent', () => {
    expect(themedQuizAsset({ dark: 'dark-asset', forest: 'forest-asset' }, 'dark')).toBe('forest-asset');
    expect(themedQuizAsset({ dark: 'dark-asset' }, 'dark')).toBe('dark-asset');
    expect(themedQuizAsset({ forest: 'forest-asset' }, 'dark')).toBe('forest-asset');
    expect(themedQuizAsset({ neonGreen: 'neon-green-asset' }, 'neonGreen')).toBe('neon-green-asset');
    expect(themedQuizAsset({ neonGreen: 'neon-green-asset' }, 'neon-green')).toBe('neon-green-asset');
    expect(themedQuizAsset({ minimalDark: 'minimal-dark-asset' }, 'unknown-theme')).toBe('minimal-dark-asset');
  });
});
