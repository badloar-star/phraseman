import { readFileSync } from 'fs';
import path from 'path';

const source = readFileSync(path.join(__dirname, '..', 'components', 'DuoPressable.tsx'), 'utf8');
const popupSource = readFileSync(path.join(__dirname, '..', 'components', 'PopUpActionButton.tsx'), 'utf8');
const trainerReportSource = readFileSync(path.join(__dirname, '..', 'app', 'trainer_session_report.tsx'), 'utf8');

describe('DuoPressable contract', () => {
  it('does not draw a decorative edge or reserve layout space for one', () => {
    expect(source).not.toContain('styles.edge,');
    expect(source).not.toContain('{ top: edgeHeight }');
    expect(source).not.toContain('paddingBottom: edgeHeight');
    expect(source).not.toContain('edgeDefault:');
  });

  it('keeps caller opacity on the wrapper while the surface animates press feedback', () => {
    expect(source).toContain('surfaceOpacityStyle');
    expect(source).toContain('surfaceBaseStyle');
    expect(source).toContain('const { opacity: _opacity, ...restStyle }');
    expect(source).toContain('style={[styles.wrap, surfaceOpacityStyle, wrapStyle]}');
    expect(source).not.toContain('style={[styles.surface, style, gradientColors ? styles.surfaceClip : null, surfaceStyle]}');
  });

  it('uses scale and opacity feedback without a colored outline or layout shift', () => {
    expect(source).toContain('transform: [{ scale: interpolate(depth, [0, 1], [1, 0.97]) }]');
    expect(source).toContain('opacity: interpolate(depth, [0, 1], [1, 0.88])');
    expect(source).not.toContain('translateY: interpolate');
    expect(source).toContain(
      '<Reanimated.View style={[styles.surface, surfaceBaseStyle, gradientColors ? styles.surfaceClip : null, surfaceStyle]}',
    );
  });

  it('uses a dark foreground on bright green bottom actions', () => {
    expect(popupSource).toContain("textColor = '#07110A'");
    expect(trainerReportSource).toContain('buttonForegroundForBackground(accent)');
  });

  it('moves both trainer report actions off the old high-opacity TapScale feedback', () => {
    expect(trainerReportSource).toContain("import DuoPressable from '../components/DuoPressable'");
    expect(trainerReportSource).not.toContain("import TapScale from '../components/TapScale'");
    expect(trainerReportSource).not.toContain('scaleTo={0.96}');
    expect(trainerReportSource.match(/<DuoPressable/g)).toHaveLength(2);
  });
});
