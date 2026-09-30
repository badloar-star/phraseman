import fs from 'fs';
import path from 'path';

describe('Dialogue V2 visual fixture route', () => {
  const routePath = path.join(__dirname, '..', 'app', 'dialogue_v2_visual_fixture.tsx');
  const devRoutesPath = path.join(__dirname, '..', 'constants', 'devRoutes.ts');

  it('is a store-disabled static component fixture with no application transport', () => {
    const source = fs.readFileSync(routePath, 'utf8');

    expect(source).toContain("import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';");
    expect(source).toContain('if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) return <Redirect href="/" />;');
    expect(source).toContain('Компонентная визуальная фикстура · данные статичны');
    expect(source).toContain('Component visual fixture · static data only');
    expect(source).toContain('DialogueV2CatalogueSection');
    expect(source).toContain('DialogueV2BriefingScreen');
    expect(source).toContain('DialogueV2FreeformScreen');
    expect(source).toContain('DialogueV2SessionScreen');
    expect(source).toContain('const fixtureFreeformMessages = Object.freeze([');
    expect(source).toContain('useV2Palette');
    expect(source).toContain('V2_TYPE');
    expect(source).not.toMatch(/dialogue_v2_(catalogue|turn|freeform)_client/);
    expect(source).not.toMatch(/from ['"][^'"]*(dialogue_v2_(catalogue|turn|freeform)_client|firebase|functions)[^'"]*['"]/);
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toContain('release-candidate');
    expect(source).not.toContain('candidate_pending');
  });

  it('registers the route only through the existing dev utility gate', () => {
    const devRoutes = fs.readFileSync(devRoutesPath, 'utf8');

    expect(devRoutes).toContain("export const DIALOGUE_V2_VISUAL_FIXTURE_ROUTE_NAME = routeName('dialogue', 'v2', 'visual', 'fixture');");
    expect(devRoutes).toContain('DIALOGUE_V2_VISUAL_FIXTURE_ROUTE_NAME,');
    expect(devRoutes).toContain('DEV_UTILITY_ROUTE_PATHS');
  });
});
