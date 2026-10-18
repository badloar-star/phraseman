import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

it('video packs have a dedicated status and query, while direct opening remains supported', () => {
  expect(read('functions/src/video_phrases.ts')).toContain("listingStatus: 'published_video'");
  const client = read('app/community_packs/communityFirestore.ts');
  const videos = client.slice(client.indexOf('async function fetchVideoCatalogFromNetwork('), client.indexOf('async function fetchCommunityCatalogFromNetwork('));
  expect(videos).toContain(".where('listingStatus', '==', 'published_video')");
  const community = client.slice(client.indexOf('async function fetchCommunityCatalogFromNetwork('), client.indexOf('async function fetchCommunityCatalogFromNetwork(') + 2200);
  expect(community).toContain(".where('listingStatus', '==', 'published')");
  expect(community).not.toContain(".where('listingStatus', 'in'");
  expect(client).toContain("st === 'published_video'");
});
