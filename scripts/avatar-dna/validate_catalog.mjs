import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readFile, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const args = process.argv.slice(2);
const valueFor = (name) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const fixtureMode = args.includes('--fixture-mode');
const catalogPath = valueFor('--catalog'); const rigPath = valueFor('--rig'); const assetsPath = valueFor('--assets');
const fail = (message) => { throw new Error(`avatar_catalog_invalid: ${message}`); };
const INTERNAL_CYCLE = Object.freeze({});
const slots = new Set(['background','outfit.back','hood.back','hair.back','body','outfit','ears','face','skin.detail','makeup','eyes','iris','brows','nose','mouth','facial.hair','hair.side','hair.front','eyewear','ear.accessory','mask','headwear.front','neck.accessory','outfit.front','aura','frame','foreground.fx']);
const ids = /^[a-z][a-z0-9_.-]{1,79}$/; const fileSafe = /^[a-z0-9][a-z0-9_.-]*\.webp$/;
const anchorNames = ['headTop','templeLeft','templeRight','eyeLineLeft','eyeLineRight','noseBridge','noseTip','mouthCenter','chin','earLeft','earRight','neckCenter','shoulderLeft','shoulderRight','torsoCenter'];
const point = (p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number' && n >= 0 && n <= 1);
const polygonArea = (polygon) => Math.abs(polygon.reduce((sum, point, index) => { const next = polygon[(index + 1) % polygon.length]; return sum + point[0] * next[1] - next[0] * point[1]; }, 0)) / 2;
const crop = (value) => Array.isArray(value) && value.length === 4 && value.every((n) => typeof n === 'number' && Number.isFinite(n)) && value[0] >= 0 && value[1] >= 0 && value[2] > 0 && value[3] > 0 && value[0] + value[2] <= 1 && value[1] + value[3] <= 1;
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const json = (path) => { try { return JSON.parse(readFileSync(path, 'utf8')); } catch { fail('invalid json'); } };

async function validateCatalogUnsafe(catalog, rig, { fixture = false, root = process.cwd(), assetsRoot } = {}) {
  if (!exact(catalog, ['catalogVersion','manifestVersion','rigIds','items']) || catalog.catalogVersion !== 1 || catalog.manifestVersion !== 1 || !Array.isArray(catalog.rigIds) || catalog.rigIds.length !== 1 || catalog.rigIds[0] !== 'human_v1') fail('catalog version or rig');
  if (!exact(rig, ['rigId','canvas','runtime','portrait','thumbnail','anchors','safePolygons','portraitCrop','studioCrop']) || rig.rigId !== 'human_v1' || !exact(rig.canvas, ['width','height']) || rig.canvas.width !== 2048 || rig.canvas.height !== 2048 || !exact(rig.runtime, ['width','height']) || rig.runtime.width !== 512 || rig.runtime.height !== 512 || !exact(rig.portrait, ['width','height']) || rig.portrait.width !== 256 || rig.portrait.height !== 256 || !exact(rig.thumbnail, ['width','height']) || rig.thumbnail.width !== 192 || rig.thumbnail.height !== 192) fail('wrong dimensions');
  if (!rig.anchors || anchorNames.length !== Object.keys(rig.anchors).length || anchorNames.some((name) => !point(rig.anchors[name])) || !rig.safePolygons || Object.keys(rig.safePolygons).length !== 2 || !['face.safe','head.safe'].every((name) => Array.isArray(rig.safePolygons[name]) && rig.safePolygons[name].length >= 3 && rig.safePolygons[name].every(point) && polygonArea(rig.safePolygons[name]) > 0) || !crop(rig.portraitCrop) || !crop(rig.studioCrop)) fail('invalid rig geometry');
  if (!Array.isArray(catalog.items)) fail('items'); const itemIds = new Set(); const layerIds = new Set();
  for (const item of catalog.items) {
    const itemKeys = ['id','assetVersion','rigIds','category','entitlement','layers','occludes','conflicts','restoresOnRemove', ...(typeof item?.swatchHex === 'string' ? ['swatchHex'] : [])];
    if (!exact(item, itemKeys) || !ids.test(item.id) || itemIds.has(item.id) || item.assetVersion !== 1 || !Array.isArray(item.rigIds) || item.rigIds.length !== 1 || item.rigIds[0] !== rig.rigId || !['base','face','hair','look','scene'].includes(item.category) || !exact(item.entitlement, typeof item.entitlement?.rarity === 'string' ? ['kind','rarity'] : ['kind']) || !['free','purchase','reward'].includes(item.entitlement.kind) || (item.swatchHex !== undefined && (typeof item.swatchHex !== 'string' || !/^#[a-f0-9]{6}$/i.test(item.swatchHex))) || typeof item.restoresOnRemove !== 'boolean') fail('item or entitlement'); itemIds.add(item.id);
    if (!Array.isArray(item.layers) || !Array.isArray(item.occludes) || !Array.isArray(item.conflicts)) fail('item arrays');
    if (item.occludes.some((slot) => !slots.has(slot)) || item.conflicts.some((id) => !ids.test(id))) fail('unknown slot or conflict');
    for (const layer of item.layers) {
      const layerKeys = ['id','slot','z','file', ...(typeof layer?.clip === 'string' ? ['clip'] : []), ...(typeof layer?.tintFrom === 'string' ? ['tintFrom'] : []), ...(layer?.bytes !== undefined ? ['bytes'] : []), ...(layer?.sha256 !== undefined ? ['sha256'] : [])];
      if (!exact(layer, layerKeys) || !ids.test(layer.id) || layerIds.has(layer.id) || !slots.has(layer.slot) || !Number.isInteger(layer.z) || layer.z < 0 || layer.z > 179 || typeof layer.file !== 'string' || !fileSafe.test(layer.file) || isAbsolute(layer.file) || layer.file.includes('\\') || layer.file.includes('..') || layer.file.includes('://') || (layer.clip !== undefined && !Object.hasOwn(rig.safePolygons, layer.clip)) || (layer.tintFrom !== undefined && layer.tintFrom !== 'skinTone' && layer.tintFrom !== 'hairColor' && layer.tintFrom !== 'irisColor') || (layer.bytes !== undefined && (!Number.isInteger(layer.bytes) || layer.bytes <= 0)) || (layer.sha256 !== undefined && (typeof layer.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(layer.sha256))) || ((layer.bytes === undefined) !== (layer.sha256 === undefined))) fail('unsafe or invalid layer'); layerIds.add(layer.id);
      if (!fixture) {
        if (layer.bytes === undefined || layer.sha256 === undefined) fail('missing runtime metadata');
        const configuredAssetRoot = resolve(assetsRoot ?? resolve(root, 'assets', 'avatar-dna'));
        const imagePath = assetsRoot === undefined
          ? resolve(configuredAssetRoot, layer.file)
          : resolve(configuredAssetRoot, item.id, String(item.assetVersion), layer.file);
        if (!imagePath.startsWith(configuredAssetRoot + sep)) fail('unsafe runtime file');
        const [realAssetRoot, realFile] = await Promise.all([realpath(configuredAssetRoot), realpath(imagePath)]);
        if (!realFile.startsWith(realAssetRoot + sep)) fail('unsafe runtime file');
        if (assetsRoot === undefined) { const realRoot = await realpath(root); if (!realAssetRoot.startsWith(realRoot + sep)) fail('unsafe runtime file'); }
        const buffer = await readFile(realFile); const meta = await sharp(buffer).metadata(); if (meta.format !== 'webp' || meta.width !== rig.runtime.width || meta.height !== rig.runtime.height) fail('runtime file metadata');
        if (buffer.length !== layer.bytes) fail('file bytes mismatch');
        if (createHash('sha256').update(buffer).digest('hex') !== layer.sha256) fail('file hash mismatch');
      }
    }
  }
  const required = ['skin_03','face_01','face_02','body_01','body_02','eyes_01','eyes_02','iris_brown','brows_01','brows_02','nose_01','nose_02','mouth_01','mouth_02','hair_01','hair_02','hair_brown','outfit_01','outfit_02','background_cream','headwear.assassin_hood.01'];
  const cosmetic = (id) => /^(headwear\.|mask\.|eyewear\.|ear_accessory\.|neck_accessory\.)/.test(id);
  if (catalog.items.length !== 83 || required.some((id) => !itemIds.has(id)) || catalog.items.some((item) => cosmetic(item.id) ? item.entitlement.kind === 'free' : item.entitlement.kind !== 'free')) fail('required inventory');
  if (catalog.items.some((item) => item.conflicts.some((id) => !itemIds.has(id)))) fail('conflict reference'); const edges = new Map(catalog.items.map((item) => [item.id, item.conflicts])); const visiting = new Set(); const visited = new Set();
  const visit = (id) => { if (visiting.has(id)) throw INTERNAL_CYCLE; if (visited.has(id)) return; visiting.add(id); for (const next of edges.get(id) ?? []) visit(next); visiting.delete(id); visited.add(id); };
  for (const id of itemIds) visit(id);
}

export async function validateCatalog(catalog, rig, options = {}) {
  try { return await validateCatalogUnsafe(catalog, rig, options); } catch (error) {
    if (error === INTERNAL_CYCLE) throw new Error('avatar_manifest_cycle');
    throw new Error('avatar_catalog_invalid');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { if (!catalogPath || !rigPath) fail('missing arguments'); await validateCatalog(json(catalogPath), json(rigPath), { fixture: fixtureMode, root: dirname(resolve(catalogPath, '..', '..')), assetsRoot: assetsPath }); console.log('avatar-dna catalog: PASS'); } catch (error) { console.error(error instanceof Error ? error.message : 'avatar_catalog_invalid'); process.exitCode = 1; }
}
