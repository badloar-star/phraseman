import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('native Aura Lab contract', () => {
  const presetSource = () => read('components/avatar-aura/presets.ts');
  const rendererSource = () => read('components/avatar-aura/AuraRenderer.tsx');

  it('registers exactly five immutable premium directions in the intended order', () => {
    const source = presetSource();
    expect(source).toMatch(/export const AURA_LAB_PRESETS\s*=\s*\[/);
    expect(source.match(/id:\s*'[^']+'/g)).toEqual([
      "id: 'prism-oracle'",
      "id: 'neon-lotus'",
      "id: 'chronosigil'",
      "id: 'velvet-eclipse'",
      "id: 'jade-cathedral'",
    ]);
    expect(source).toMatch(/as const satisfies readonly AuraPreset\[\]/);
  });

  it('keeps the renderer native-safe, fixed-slot, and free from filter primitives', () => {
    const source = `${rendererSource()}\n${read('components/avatar-aura/AuraScenes.tsx')}`;
    expect(source).toMatch(/react-native-svg/);
    expect(source).not.toMatch(/<filter|feGaussianBlur|Skia|Canvas|Image/);
    expect(rendererSource()).toMatch(/width:\s*size[\s\S]*height:\s*size/);
    expect(rendererSource()).toMatch(/position:\s*'absolute'/);
    expect(rendererSource()).toMatch(/pointerEvents="none"/);
  });

  it('gates one shared ambient phase and cancels it back to static on lifecycle changes', () => {
    const source = rendererSource();
    expect(source).toMatch(/useRuntimeActive\(ownerVisible\)/);
    expect(source).toMatch(/useReduceMotion\(\)/);
    expect(source).toMatch(/withRepeat\(/);
    expect(source).toMatch(/cancelAnimation\(phase\)/);
    expect(source).toMatch(/phase\.value\s*=\s*staticPhase/);
    expect(source).toMatch(/motion\s*===\s*'static'/);
    expect(source).toMatch(/detail\s*===\s*'thumbnail'/);
    expect(source).toMatch(/function StaticAuraRenderer/);
    expect(source).toMatch(/function AnimatedAuraRenderer/);
    expect(source).toMatch(/children/);
    const staticPath = source.slice(source.indexOf('function StaticAuraRenderer'), source.indexOf('function AnimatedAuraRenderer'));
    expect(staticPath).not.toMatch(/useSharedValue|useRuntimeActive|useReduceMotion|withRepeat/);
  });

  it('exposes the lab only through a dev gate and leaves production aura files untouched', () => {
    const gate = read('app/aura_lab.tsx');
    const lab = read('app/_aura_lab.tsx');
    const routes = read('constants/devRoutes.ts');
    expect(gate).toMatch(/ENABLE_DEV_TOOLS/);
    expect(gate).toMatch(/require\('\.\/_aura_lab'\)/);
    expect(lab).toMatch(/AuraRenderer/);
    expect(routes).toMatch(/AURA_LAB_ROUTE_NAME/);
    expect(routes).toMatch(/AURA_LAB_ROUTE_NAME,/);
    expect(fs.existsSync(path.join(root, 'components/AvatarAura.tsx'))).toBe(true);
  });
});
