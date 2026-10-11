// зачем (Карточки 2.0 12.10, координатор + Ядро D118): у Free 3 своих набора — «3/3» и «Безлимит с Plus» показываются на ВХОДЕ в «Новый набор»,
// а не сырым тостом после «Создать набор». Сторож держит три части: счётчик наборов, вариант кнопки/пилюли и мягкий отказ сервера.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const src = readFileSync('app/community_pack_create.tsx', 'utf8').replace(/\r\n/g, '\n');

test('limit variant is decided on entry from the Core pack-quota hook (useAuthorPackQuota)', () => {
  assert.ok(src.includes("import { useAuthorPackQuota } from './community_packs/useAuthorPackQuota';"));
  assert.match(src, /const \{ quota: authorPackQuota \} = useAuthorPackQuota\(hasPremiumAccess\);/);
  assert.match(src, /const packLimitReached = !isEditMode && accessResolved && !hasPremiumAccess && !!authorPackQuota\?\.limitReached;/);
  assert.ok(src.includes('testID="ugc-pack-limit-pill"'));
  assert.ok(src.includes("label={packLimitReached ? unlimitedPlusLabel"));
  assert.ok(src.includes('if (packLimitReached) { openPackLimitPaywall(); return; }'));
});

test('a server-side refusal opens the paywall instead of a raw error toast', () => {
  assert.ok(src.includes("msg.includes('free_author_pack_limit_reached')"));
  assert.ok(src.includes("source: 'pack_create_limit'"));
});
