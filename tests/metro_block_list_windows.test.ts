import path from 'path';

type MetroConfigWithBlockList = {
  resolver: {
    blockList?: RegExp | RegExp[];
  };
};

describe('Metro root-folder block list on Windows', () => {
  it('excludes service folders without scanning nested worktrees', () => {
    const config = require('../metro.config') as MetroConfigWithBlockList;
    const rules = Array.isArray(config.resolver.blockList)
      ? config.resolver.blockList
      : [config.resolver.blockList].filter((rule): rule is RegExp => Boolean(rule));

    const isBlocked = (folder: string) => {
      const candidate = path.join(process.cwd(), folder, 'nested', 'file.js');

      return rules.some((rule) => {
        rule.lastIndex = 0;
        return rule.test(candidate);
      });
    };

    expect(isBlocked('.git')).toBe(true);
    expect(isBlocked('functions')).toBe(true);
    expect(isBlocked('.worktrees')).toBe(true);
  });

  it('allows runtime avatar assets while keeping the rest of admin blocked', () => {
    const config = require('../metro.config') as MetroConfigWithBlockList;
    const rules = Array.isArray(config.resolver.blockList)
      ? config.resolver.blockList
      : [config.resolver.blockList].filter((rule): rule is RegExp => Boolean(rule));
    const isBlocked = (candidate: string) => rules.some((rule) => {
      rule.lastIndex = 0;
      return rule.test(candidate);
    });

    expect(isBlocked(path.join(process.cwd(), 'admin', 'v2', 'avatars', 'custom-idea-73-black.webp'))).toBe(false);
    expect(isBlocked(path.join(process.cwd(), 'admin', 'v2', 'legacy.html'))).toBe(true);
  });

  it('keeps Jest from indexing nested worktrees', () => {
    const packageJson = require('../package.json') as {
      jest: {
        modulePathIgnorePatterns: string[];
        testPathIgnorePatterns: string[];
        watchPathIgnorePatterns: string[];
      };
    };

    expect(packageJson.jest.modulePathIgnorePatterns).toContain('<rootDir>/.worktrees/');
    expect(packageJson.jest.testPathIgnorePatterns).toContain('<rootDir>/.worktrees/');
    expect(packageJson.jest.watchPathIgnorePatterns).toContain('<rootDir>/.worktrees/');
  });
});
