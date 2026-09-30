import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

for (const file of ['components/NotificationPermissionModal.tsx', 'components/NotificationPermissionModalHybrid.tsx']) {
  const source = fs.readFileSync(file, 'utf8');
  test(`${file} renders above both system safe areas`, () => {
    assert.match(source, /useStableSafeAreaInsets/);
    assert.match(source, /statusBarTranslucent navigationBarTranslucent/);
    assert.match(source, /insets\.top \+ 12/);
    assert.match(source, /insets\.bottom \+ 12/);
    assert.match(source, /onRequestClose=\{onCancel\}/);
  });
}
