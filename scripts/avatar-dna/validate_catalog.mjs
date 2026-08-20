import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const valueFor = (name) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const fixtureMode = args.includes('--fixture-mode');
const catalogPath = valueFor('--catalog'); const rigPath = valueFor('--rig');
const fail = (message) => { throw new Error(`avatar_catalog_invalid: ${message}`); };
const slots = new Set(['background','outfit.back','hood.back','hair.back','body','outfit','ears','face','skin.detail','makeup','eyes','iris','brows','nose','mouth','facial.hair','hair.side','hair.front','eyewear','ear.accessory','mask','headwear.front','neck.accessory','outfit.front','aura','frame','foreground.fx']);
const ids = /^[a-z][a-z0-9_.-]{1,79}$/; const fileSafe = /^[a-z0-9][a-z0-9_.-]*\.webp$/;
const anchorNames = ['headTop','templeLeft','templeRight','eyeLineLeft','eyeLineRight','noseBridge','noseTip','mouthCenter','chin','earLeft','earRight','neckCenter','shoulderLeft','shoulderRight','torsoCenter'];
const point = (p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number' && n >= 0 && n <= 1);
const json = (path) => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { fail('invalid json'); } };

export async function validateCatalog(catalog, rig, { fixture = false, root = process.cwd() } = {}) {
  if (!catalog || catalog.catalogVersion !== 1 || catalog.manifestVersion !== 1 || !Array.isArray(catalog.rigIds) || !catalog.rigIds.includes('human_v1')) fail('catalog version or rig');
  if (!rig || rig.rigId !== 'human_v1' || !rig.canvas || rig.canvas.width !== 2048 || rig.canvas.height !== 2048 || !rig.runtime || rig.runtime.width !== 512 || rig.runtime.height !== 512 || !rig.portrait || rig.portrait.width !== 256 || rig.portrait.height !== 256 || !rig.thumbnail || rig.thumbnail.width !== 192 || rig.thumbnail.height !== 192) fail('wrong dimensions');
  if (!rig.anchors || anchorNames.length !== Object.keys(rig.anchors).length || anchorNames.some((name) => !point(rig.anchors[name])) || !rig.safePolygons || !['face.safe','head.safe'].every((name) => Array.isArray(rig.safePolygons[name]) && rig.safePolygons[name].length >= 3 && rig.safePolygons[name].every(point)) || !point(rig.portraitCrop?.slice(0, 2)) || !Array.isArray(rig.portraitCrop) || rig.portraitCrop.length !== 4 || !rig.portraitCrop.every((n) => typeof n === 'number' && n >= 0 && n <= 1) || !Array.isArray(rig.studioCrop) || rig.studioCrop.length !== 4 || !rig.studioCrop.every((n) => typeof n === 'number' && n >= 0 && n <= 1)) fail('invalid rig geometry');
  if (!Array.isArray(catalog.items)) fail('items'); const itemIds = new Set(); const layerIds = new Set();
  for (const item of catalog.items) {
    if (!item || !ids.test(item.id) || itemIds.has(item.id) || !Array.isArray(item.rigIds) || !item.rigIds.includes(rig.rigId) || !item.entitlement || !['starter','purchase','reward'].includes(item.entitlement.kind)) fail('item or entitlement'); itemIds.add(item.id);
    if (!Array.isArray(item.layers) || !Array.isArray(item.occludes) || !Array.isArray(item.conflicts)) fail('item arrays');
    if (item.occludes.some((slot) => !slots.has(slot)) || item.conflicts.some((id) => !ids.test(id))) fail('unknown slot or conflict');
    for (const layer of item.layers) {
      if (!layer || !ids.test(layer.id) || layerIds.has(layer.id) || !slots.has(layer.slot) || !Number.isInteger(layer.z) || layer.z < 0 || layer.z > 179 || typeof layer.file !== 'string' || !fileSafe.test(layer.file) || isAbsolute(layer.file) || layer.file.includes('\\') || layer.file.includes('..') || layer.file.includes('://')) fail('unsafe or invalid layer'); layerIds.add(layer.id);
      if (!fixture) {
        const imagePath = resolve(root, 'assets', 'avatar-dna', layer.file); const assetRoot = resolve(root, 'assets', 'avatar-dna') + sep;
        if (!imagePath.startsWith(assetRoot) || !existsSync(imagePath)) fail('missing runtime file');
        const meta = await sharp(imagePath).metadata(); if (meta.format !== 'webp' || meta.width !== rig.runtime.width || meta.height !== rig.runtime.height) fail('runtime file metadata');
        if (layer.bytes !== undefined && (!Number.isInteger(layer.bytes) || statSync(imagePath).size !== layer.bytes)) fail('file bytes mismatch');
        if (layer.sha256 !== undefined && (typeof layer.sha256 !== 'string' || createHash('sha256').update(readFileSync(imagePath)).digest('hex') !== layer.sha256)) fail('file hash mismatch');
      }
    }
  }
  const edges = new Map(catalog.items.map((item) => [item.id, item.conflicts.filter((id) => itemIds.has(id))])); const visiting = new Set(); const visited = new Set();
  const visit = (id) => { if (visiting.has(id)) fail('avatar_manifest_cycle'); if (visited.has(id)) return; visiting.add(id); for (const next of edges.get(id) ?? []) visit(next); visiting.delete(id); visited.add(id); };
  for (const id of itemIds) visit(id);
}

if (import.meta.url === `file:///${process.argv[1]?.replaceAll('\\', '/')}`) {
  try { if (!catalogPath || !rigPath) fail('missing arguments'); await validateCatalog(json(catalogPath), json(rigPath), { fixture: fixtureMode, root: dirname(resolve(catalogPath, '..', '..')) }); console.log('avatar-dna catalog: PASS'); } catch (error) { console.error(error instanceof Error ? error.message : 'avatar_catalog_invalid'); process.exitCode = 1; }
}
