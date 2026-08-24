import path from 'node:path';

describe('Babel support for Three.js', () => {
  it('enables static class blocks required by the Three.js CommonJS build', () => {
    const configPath = path.join(process.cwd(), 'babel.config.js');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const createConfig = require(configPath) as (api: { cache: (enabled: boolean) => void }) => {
      plugins?: string[];
    };
    const config = createConfig({ cache: jest.fn() });

    expect(config.plugins).toContain('@babel/plugin-transform-class-static-block');
  });
});
