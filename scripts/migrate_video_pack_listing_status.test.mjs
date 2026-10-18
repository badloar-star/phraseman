import assert from 'node:assert/strict';
import test from 'node:test';
import { isPublishedVideoPack } from './migrate_video_pack_listing_status.mjs';

test('migration selects only exact published video documents', () => {
  const id = 'dQw4w9WgXcQ';
  assert.equal(isPublishedVideoPack(`video_${id}`, { videoId: id, listingStatus: 'published' }), true);
  for (const listingStatus of ['published_video', 'draft', 'admin_removed', 'update_pending']) {
    assert.equal(isPublishedVideoPack(`video_${id}`, { videoId: id, listingStatus }), false);
  }
  assert.equal(isPublishedVideoPack('author-pack', { videoId: id, listingStatus: 'published' }), false);
  assert.equal(isPublishedVideoPack(`video_${id}`, { videoId: 'mismatched1', listingStatus: 'published' }), false);
  assert.equal(isPublishedVideoPack(`video_${id}`, { listingStatus: 'published' }), false);
});
