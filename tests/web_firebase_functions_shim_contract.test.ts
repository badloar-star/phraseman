import fs from 'fs';
import path from 'path';

describe('web Firebase Functions Metro shim', () => {
  const root = process.cwd();

  it('aliases react-native-firebase functions only on web', () => {
    const source = fs.readFileSync(path.join(root, 'metro.config.js'), 'utf8');

    expect(source).toContain("moduleName === '@react-native-firebase/functions'");
    expect(source).toContain("moduleName.startsWith('@react-native-firebase/functions/')");
    expect(source).toContain("platform === 'web'");
    expect(source).toContain('firebase-functions-web-shim.js');
    expect(source).toContain('context.resolveRequest(context, moduleName, platform)');
  });

  it('provides the modular functions API shape needed by app imports', () => {
    const source = fs.readFileSync(path.join(root, 'web_shims', 'firebase-functions-web-shim.js'), 'utf8');

    expect(source).toContain('function getFunctions');
    expect(source).toContain('function httpsCallable');
    expect(source).toContain('function httpsCallableFromUrl');
    expect(source).toContain('module.exports');
  });

  it('keeps app messages from loading native Firestore in web preview', () => {
    const source = fs.readFileSync(path.join(root, 'app', 'app_messages.ts'), 'utf8');

    expect(source).toContain("import { Platform } from 'react-native'");
    expect(source).toContain("Platform.OS === 'web'");
    expect(source.indexOf("Platform.OS === 'web'")).toBeLessThan(
      source.indexOf("await import('@react-native-firebase/firestore')"),
    );
  });
});
