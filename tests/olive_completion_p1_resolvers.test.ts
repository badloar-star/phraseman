import { oliveDailyTaskChrome, oliveLevelExamChrome, oliveThemeTileA11y } from '../app/olive_completion_chrome';
import fs from 'node:fs';
import path from 'node:path';

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('Olive completion P1 resolvers', () => {
  it('keeps ordinary task structure tonal while preserving the semantic fill', () => {
    expect(oliveDailyTaskChrome('olive', '#34C759', false)).toEqual({
      surface: '#14180F', text: '#F4ECD8', muted: '#E3CC88', border: 'transparent', shadow: true, fill: '#34C75918', claimed: '#1C2217', reroll: '#E3CC88',
    });
    expect(oliveDailyTaskChrome('gold', '#34C759', false)).toBeNull();
  });

  it('uses the same reachable matte shell for legacy French, access, and intro exam states', () => {
    expect(oliveLevelExamChrome('olive')).toEqual({ panel: '#0D0F0B', raised: '#1C2217', ivory: '#F4ECD8', muted: '#E3CC88', cta: '#C9A84C', ctaText: '#050604', border: 'transparent' });
    expect(oliveLevelExamChrome('indigo')).toBeNull();
  });

  it('localizes locked, previewed, and applied theme-tile accessibility state', () => {
    expect(oliveThemeTileA11y('ru', 'locked')).toBe('Требуется Plus');
    expect(oliveThemeTileA11y('es', 'preview')).toBe('Vista previa');
    expect(oliveThemeTileA11y('en', 'applied')).toBe('Applied');
  });

  it('uses Olive-only quest and incoming-gift copy colors without changing mono non-Olive copy', () => {
    const friends = source('app/(tabs)/friends.tsx');
    const completed = friends.slice(friends.indexOf('function FriendQuestCompletedModal'), friends.indexOf('type ActivityFeedSection'));
    expect(completed).toContain("color: themeMode === 'olive' ? modalChrome.text : monoIcon(themeMode, '#21170B', MONO_ICON.onLight)");
    expect(completed).toContain("color: themeMode === 'olive' ? modalChrome.mutedText : monoIcon(themeMode, '#4E3B1D', MONO_ICON.onLight)");
    expect(completed).toContain("backgroundColor: themeMode === 'olive' ? modalChrome.button : '#34C759'");
    expect(friends).toContain("color: isOliveTheme ? OLIVE_RICH.champagneLight : monoIcon(themeMode, '#7A5518', MONO_ICON.onLight)");
    expect(friends).toContain("color: isOliveTheme ? OLIVE_RICH.ivory : monoIcon(themeMode, '#8A641D', MONO_ICON.onLight)");
    expect(friends).toContain("color: isOliveTheme ? OLIVE_RICH.ivory : monoIcon(themeMode, '#3D2B10', MONO_ICON.onLight)");
  });

  it('wires the resolved Olive exam shell into reachable access and legacy controls', () => {
    const exam = source('app/level_exam.tsx');
    const intro = exam.slice(exam.indexOf("if (phase === 'intro')"), exam.indexOf('// ── RESULT'));
    expect(exam).toContain("backgroundColor: oliveExamChrome?.cta ?? LX.gold");
    expect(exam).toContain("color: oliveExamChrome?.ctaText ?? LX.ink");
    expect(intro).toContain("borderBottomColor: oliveExamChrome?.border ?? LX.cardLine");
    expect(intro).toContain("color={oliveExamChrome?.ivory ?? '#FFFFFF'}");
    expect(exam).toContain("color: oliveExamChrome?.ivory ?? 'rgba(255,255,255,0.92)'");
  });

  it('keeps the Olive streak shadow on an unclipped wrapper around the clipped pass surface', () => {
    const streak = source('components/StreakReviveModal.tsx');
    expect(streak).toContain('styles.passShadow');
    expect(streak).toContain('styles.olivePassShadow');
    expect(streak).toContain("overflow: 'hidden'");
  });
});
