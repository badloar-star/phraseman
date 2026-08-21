import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMakeHumanObj } from './lib/makehuman_obj.mjs';
import { loadRelativeMorphDeltas, TARGET_ORDER } from './lib/morph_recipe.mjs';
import { makeIrisSurface, makeLatLongEllipsoid, makeScleraWithAperture } from './lib/ellipsoid_mesh.mjs';
import { makeHeadProxyFromBody, makeTaperedClumpHair } from './lib/tapered_clump_mesh.mjs';
import { makeAssassinHood, makeFittedTerraGarment } from './lib/fitted_garment_mesh.mjs';
import { assertManifestBytes, CANONICAL_STREAM_SHA256, HAIR_CONFIG_SHA256, MATERIAL_CONFIG_SHA256 } from './build_human_v2_cc0_glb.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GLB_MAGIC = 0x46546c67, JSON_CHUNK = 0x4e4f534a, BIN_CHUNK = 0x004e4942;
const COMPONENT_BYTES = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }, TYPE_COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3 };
const VERTICES = 14517, INDICES = 80268, BOUNDS = { min: [-4.9627, -8.1676, -1.0154], max: [4.9627, 8.4913, 3.2147] };
const ROOT_KEYS = ['accessors', 'asset', 'bufferViews', 'buffers', 'materials', 'meshes', 'nodes', 'scene', 'scenes'];
const REQUIRED_MESHES = ['avatar_body_base','avatar_eye_left_sclera','avatar_eye_left_iris','avatar_eye_left_cornea','avatar_eye_right_sclera','avatar_eye_right_iris','avatar_eye_right_cornea','avatar_hair_wave','avatar_hair_crop','avatar_outfit_terra','avatar_hood_assassin'];
const REQUIRED_MATERIALS = ['material_skin','material_sclera','material_iris','material_pupil','material_cornea','material_hair','material_cloth'];
const IRIS_APERTURE_RADIUS = 0.092;
const err = (errors, code) => { if (!errors.includes(code)) errors.push(code); };
const isUint = value => Number.isInteger(value) && value >= 0;
const sameArray = (a, b) => Array.isArray(a) && a.length === b.length && a.every((value, index) => value === b[index]);
const hasKeys = (value, keys) => !!value && sameArray(Object.keys(value).sort(), [...keys].sort());
const coverageModulo = value => ((value % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
function independentCoverageMargins(proxy, style, clearance) {
  let worstAzimuthMargin = Infinity, worstElevationMargin = Infinity;
  for (const family of style.families) for (let member = 0; member < family.count; member += 1) {
    const fraction = (member + .5) / family.count, azimuth = family.azimuth + (fraction - .5) * family.sweep, elevation = family.elevation, radius = family.rootRadius + clearance, width = coverageModulo(style.coverage.azimuthEnd - style.coverage.azimuthStart), fromStart = coverageModulo(azimuth - style.coverage.azimuthStart), toEnd = coverageModulo(style.coverage.azimuthEnd - azimuth), azimuthMetric = Math.abs(Math.cos(elevation)) * Math.hypot(proxy.radii[0] * Math.sin(azimuth), proxy.radii[2] * Math.cos(azimuth)), elevationMetric = Math.hypot(proxy.radii[0] * Math.sin(elevation) * Math.cos(azimuth), proxy.radii[1] * Math.cos(elevation), proxy.radii[2] * Math.sin(elevation) * Math.sin(azimuth)), azimuthMargin = (fromStart <= width + 1e-10 ? Math.min(fromStart, toEnd) : -Infinity) - Math.asin(Math.min(.95, radius / azimuthMetric)), elevationMargin = Math.min(elevation - style.coverage.elevationMin, style.coverage.elevationMax - elevation) - Math.asin(Math.min(.95, radius / elevationMetric));
    if (!(azimuthMargin >= 0 && elevationMargin >= 0)) return null;
    worstAzimuthMargin = Math.min(worstAzimuthMargin, azimuthMargin); worstElevationMargin = Math.min(worstElevationMargin, elevationMargin);
  }
  return { worstAzimuthMargin, worstElevationMargin };
}

function parseGlb(bytes, errors) {
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== GLB_MAGIC || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) { err(errors, 'invalid_glb_header'); return null; }
  const chunks = []; let offset = 12;
  while (offset + 8 <= bytes.length) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4); offset += 8;
    if (length % 4 || offset + length > bytes.length) { err(errors, 'invalid_glb_chunk'); return null; }
    chunks.push({ type, bytes: bytes.subarray(offset, offset + length) }); offset += length;
  }
  if (offset !== bytes.length || chunks.length !== 2 || chunks[0].type !== JSON_CHUNK || chunks[1].type !== BIN_CHUNK) { err(errors, 'invalid_glb_chunk_order'); return null; }
  try { return { gltf: JSON.parse(chunks[0].bytes.toString('utf8').trim()), bin: chunks[1].bytes }; } catch { err(errors, 'invalid_glb_json'); return null; }
}

function reader(gltf, bin, index, errors) {
  const accessor = gltf.accessors?.[index], view = gltf.bufferViews?.[accessor?.bufferView], componentBytes = COMPONENT_BYTES[accessor?.componentType], width = TYPE_COMPONENTS[accessor?.type];
  const accessorOffset = accessor?.byteOffset ?? 0, viewOffset = view?.byteOffset ?? 0;
  if (!accessor || !view || !isUint(index) || !isUint(accessor.count) || !isUint(accessorOffset) || !isUint(viewOffset) || !componentBytes || !width || accessor.sparse || accessor.normalized || view.buffer !== 0 || !isUint(view.byteLength)) { err(errors, 'invalid_accessor'); return null; }
  const elementBytes = componentBytes * width, stride = view.byteStride ?? elementBytes;
  if (!isUint(stride) || stride < elementBytes || stride % componentBytes || viewOffset % componentBytes || accessorOffset % componentBytes || accessorOffset + (accessor.count ? (accessor.count - 1) * stride + elementBytes : 0) > view.byteLength || viewOffset + view.byteLength > bin.length) { err(errors, 'invalid_accessor'); return null; }
  const read = (element, component) => {
    const at = viewOffset + accessorOffset + element * stride + component * componentBytes;
    if (accessor.componentType === 5121) return bin.readUInt8(at);
    if (accessor.componentType === 5123) return bin.readUInt16LE(at);
    if (accessor.componentType === 5125) return bin.readUInt32LE(at);
    return bin.readFloatLE(at);
  };
  const bytes = () => { const result = Buffer.alloc(accessor.count * elementBytes); for (let row = 0; row < accessor.count; row += 1) bin.copy(result, row * elementBytes, viewOffset + accessorOffset + row * stride, viewOffset + accessorOffset + row * stride + elementBytes); return result; };
  return { accessor, width, read, bytes };
}

function expectAccessor(value, expected, errors, code = 'invalid_base_geometry') {
  if (!value || value.accessor.componentType !== expected.componentType || value.accessor.type !== expected.type || value.accessor.count !== expected.count) { err(errors, code); return false; }
  return true;
}
function finite(value, errors) { if (value) for (let row = 0; row < value.accessor.count; row += 1) for (let column = 0; column < value.width; column += 1) if (!Number.isFinite(value.read(row, column))) err(errors, 'nonfinite_accessor'); }

function graph(gltf, errors) {
  if (gltf.asset?.version !== '2.0' || ['scenes', 'nodes', 'meshes', 'materials', 'accessors', 'bufferViews', 'buffers'].some(key => !Array.isArray(gltf[key]))) err(errors, 'invalid_glb_structure');
  if (gltf.scene !== 0 || gltf.scenes?.length !== 1 || gltf.scenes?.[0]?.name !== 'human_v2_scene' || !sameArray(gltf.scenes?.[0]?.nodes, (gltf.nodes || []).map((_, index) => index))) err(errors, 'invalid_scene_reference');
  if (!gltf.nodes?.length || gltf.nodes.some((entry, index) => !entry || !isUint(entry.mesh) || entry.mesh !== index || entry.mesh >= gltf.meshes.length || entry.name !== gltf.meshes[index]?.name || 'weights' in entry || 'children' in entry || 'skin' in entry) || new Set(gltf.nodes.map(node => node?.name)).size !== gltf.nodes.length || new Set(gltf.meshes.map(mesh => mesh?.name)).size !== gltf.meshes.length) err(errors, 'invalid_node_reference');
  if (gltf.nodes?.some(node => !sameArray(Object.keys(node).sort(), ['mesh', 'name']))) err(errors, 'invalid_node_transform');
  if (gltf.meshes?.length !== REQUIRED_MESHES.length || !sameArray((gltf.meshes || []).map(mesh => mesh?.name), REQUIRED_MESHES) || gltf.materials?.length !== REQUIRED_MATERIALS.length || gltf.textures?.length || gltf.images?.length || gltf.samplers?.length) err(errors, 'invalid_reference_graph');
  if (gltf.buffers?.length !== 1) err(errors, 'invalid_bin_length');
  const names = gltf.materials?.map(material => material?.name) || [];
  if (!sameArray(names, REQUIRED_MATERIALS) || new Set(names).size !== REQUIRED_MATERIALS.length || gltf.materials.some(material => !material || material.pbrMetallicRoughness?.baseColorTexture || material.normalTexture || material.occlusionTexture || material.emissiveTexture)) err(errors, 'invalid_material');
  for (const texture of gltf.textures || []) if (!isUint(texture?.source) || texture.source >= (gltf.images?.length || 0) || (texture.sampler !== undefined && (!isUint(texture.sampler) || texture.sampler >= (gltf.samplers?.length || 0)))) err(errors, 'invalid_texture_reference');
}
function collectionContract(gltf, bin, errors) {
  const buffers = gltf.buffers || [], views = gltf.bufferViews || [], accessors = gltf.accessors || [];
  if (buffers.length !== 1 || !sameArray(Object.keys(buffers[0] || {}).sort(), ['byteLength']) || buffers[0]?.byteLength !== bin.length) err(errors, 'invalid_bin_length');
  if (views.length < 22 || accessors.length < 22) err(errors, 'invalid_collection_cardinality');
  for (let index = 0; index < views.length; index += 1) {
    const view = views[index];
    if (!view || !sameArray(Object.keys(view).sort(), ['buffer', 'byteLength', 'byteOffset']) || view.buffer !== 0 || !isUint(view.byteOffset) || !isUint(view.byteLength) || view.byteOffset + view.byteLength > bin.length) err(errors, 'invalid_buffer_view');
  }
  for (const accessor of accessors) if (!accessor || !['bufferView','componentType','count','max','min','type'].every(key => key in accessor || !['bufferView','componentType','count','type'].includes(key)) || Object.keys(accessor).some(key => !['bufferView','componentType','count','max','min','type'].includes(key))) err(errors, 'invalid_accessor_metadata');
  const usedAccessors = new Set();
  for (const mesh of gltf.meshes || []) for (const primitive of mesh?.primitives || []) {
    for (const index of Object.values(primitive.attributes || {})) usedAccessors.add(index);
    usedAccessors.add(primitive.indices); for (const target of primitive.targets || []) for (const index of Object.values(target || {})) usedAccessors.add(index);
  }
  const usedViews = new Set([...usedAccessors].map(index => accessors[index]?.bufferView));
  if (usedAccessors.size !== accessors.length || usedViews.size !== views.length || [...usedAccessors].some(index => !isUint(index) || index >= accessors.length) || [...usedViews].some(index => !isUint(index) || index >= views.length)) err(errors, 'invalid_collection_cardinality');
}
function exactSchema(gltf, bin, errors) {
  const bad = () => err(errors, 'unexpected_json_schema');
  if (!hasKeys(gltf, ROOT_KEYS) || !hasKeys(gltf.asset, ['generator', 'version']) || gltf.asset.version !== '2.0' || gltf.asset.generator !== 'phraseman-avatar-dna-cc0-v1') bad();
  if (!hasKeys(gltf.scenes?.[0], ['name', 'nodes']) || gltf.scenes?.[0]?.name !== 'human_v2_scene') bad();
  if (gltf.nodes?.some(node => !hasKeys(node, ['mesh', 'name']))) bad();
  const mesh = gltf.meshes?.[0], primitive = mesh?.primitives?.[0];
  if (!hasKeys(mesh, ['extras', 'name', 'primitives', 'weights']) || mesh?.name !== 'avatar_body_base' || !sameArray(mesh?.weights, Array(18).fill(0)) || !hasKeys(mesh?.extras, ['targetNames']) || !sameArray(mesh?.extras?.targetNames, TARGET_ORDER) || mesh?.primitives?.length !== 1) bad();
  if (!hasKeys(primitive, ['attributes', 'indices', 'material', 'targets']) || primitive?.indices !== 3 || primitive?.material !== 0 || !hasKeys(primitive?.attributes, ['NORMAL', 'POSITION', 'TEXCOORD_0']) || primitive?.attributes?.POSITION !== 0 || primitive?.attributes?.NORMAL !== 1 || primitive?.attributes?.TEXCOORD_0 !== 2 || primitive?.targets?.length !== 18) bad();
  for (let index = 0; index < (primitive?.targets?.length || 0); index += 1) if (!hasKeys(primitive.targets[index], ['POSITION']) || primitive.targets[index].POSITION !== 4 + index) bad();
  for (let index = 1; index < 7; index += 1) {
    const eye = gltf.meshes[index]; const isIris = eye?.name?.endsWith('_iris');
    const extras = isIris ? ['anchor','angularSegments','apertureRadius','helperBounds','helperGroup','irisOffsetTowardCamera','pupilRing','radialSegments','radii','rimOffset'] : eye?.name?.endsWith('_sclera') ? ['anchor','apertureOffset','apertureRadii','helperBounds','helperGroup','radii'] : ['anchor','helperBounds','helperGroup','radii','surfaceCenter'];
    if (!hasKeys(eye, ['extras','name','primitives']) || !hasKeys(eye?.extras, extras) || eye?.primitives?.length !== (isIris ? 2 : 1)) bad();
    for (const eyePrimitive of eye?.primitives || []) if (!hasKeys(eyePrimitive, ['attributes','indices','material']) || !hasKeys(eyePrimitive.attributes, ['NORMAL','POSITION'])) bad();
  }
  const project = {
    avatar_hair_wave: ['clumpCount','configSha256','coverage','coverageMargin','familyCounts','generator','headProxy','lengthSegments','minScalpClearance','radialSegments','rootRingClearance','scapCapTriangleCount','scapCapVertexCount','style','tubeVertexCount'],
    avatar_hair_crop: ['clumpCount','configSha256','coverage','coverageMargin','familyCounts','generator','headProxy','lengthSegments','minScalpClearance','radialSegments','rootRingClearance','scapCapTriangleCount','scapCapVertexCount','style','tubeVertexCount'],
    avatar_outfit_terra: ['configSha256','generator','inwardTriangleCount','lateralLimit','sourceTriangleCount','sourceTriangleHash','sourceTriangleIndices','sourceVertexIndices','surfaceOffset','torsoBounds'],
    avatar_hood_assassin: ['anchor','configSha256','generator','headProxy','radialSegments','ringSegments'],
  };
  for (const [name, keys] of Object.entries(project)) { const candidate = gltf.meshes?.find(entry => entry?.name === name); if (!hasKeys(candidate, ['extras','name','primitives']) || !hasKeys(candidate?.extras, keys) || candidate?.primitives?.length !== 1 || !hasKeys(candidate?.primitives?.[0], ['attributes','indices','material']) || !hasKeys(candidate?.primitives?.[0]?.attributes, ['NORMAL','POSITION'])) bad(); }
  for (const material of gltf.materials || []) { const extras = material?.name === 'material_cornea' ? ['alphaMode','doubleSided','name','pbrMetallicRoughness'] : ['name','pbrMetallicRoughness']; if (!hasKeys(material, extras) || !hasKeys(material?.pbrMetallicRoughness, ['baseColorFactor','metallicFactor','roughnessFactor'])) bad(); }
  if (!hasKeys(gltf.buffers?.[0], ['byteLength']) || gltf.buffers?.[0]?.byteLength !== bin.length) bad();
  for (const view of gltf.bufferViews || []) if (!hasKeys(view, ['buffer','byteLength','byteOffset'])) bad();
  for (const accessor of gltf.accessors || []) if (!Object.keys(accessor || {}).every(key => ['bufferView','componentType','count','max','min','type'].includes(key))) bad();
}

async function canonical() {
  const vendor = path.join(ROOT, 'tools', 'avatar-dna', 'vendor', 'makehuman-v1.3.0');
  const manifest = await readFile(path.join(ROOT, 'config', 'avatar-dna', 'human_v2_cc0_source.v1.json'));
  assertManifestBytes(manifest);
  const body = parseMakeHumanObj(await readFile(path.join(vendor, 'makehuman', 'data', '3dobjs', 'base.obj'), 'utf8'));
  const positions = new Float32Array(body.positions.flat()), normals = new Float32Array(positions.length);
  for (const [a, b, c] of body.triangles) {
    const p = body.positions[a], q = body.positions[b], r = body.positions[c], ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2], x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
    for (const index of [a, b, c]) { normals[index * 3] += x; normals[index * 3 + 1] += y; normals[index * 3 + 2] += z; }
  }
  for (let index = 0; index < normals.length; index += 3) { const length = Math.hypot(normals[index], normals[index + 1], normals[index + 2]) || 1; normals[index] /= length; normals[index + 1] /= length; normals[index + 2] /= length; }
  const morphs = await loadRelativeMorphDeltas({ recipePath: path.join(ROOT, 'config', 'avatar-dna', 'human_v2_style.v1.json'), targetsRoot: vendor, sourceVertexIndex: body.sourceVertexIndex, sourceVertexCount: body.sourcePositions.length });
  const streams = [Buffer.from(positions.buffer), Buffer.from(normals.buffer), Buffer.from(new Float32Array(body.uvs.flat()).buffer), Buffer.from(new Uint32Array(body.triangles.flat()).buffer), ...morphs.map(value => Buffer.from(value.buffer))];
  if (streams.some((stream, index) => createHash('sha256').update(stream).digest('hex') !== CANONICAL_STREAM_SHA256[index])) throw new Error('canonical geometry oracle mismatch');
  return { positions: streams[0], normals: streams[1], uvs: streams[2], indices: streams[3], morphs: streams.slice(4) };
}

function triangles(positions, indices, errors) {
  for (let index = 0; index < indices.accessor.count; index += 3) {
    const vertices = [indices.read(index, 0), indices.read(index + 1, 0), indices.read(index + 2, 0)];
    if (vertices.some(vertex => vertex >= VERTICES)) { err(errors, 'index_out_of_range'); continue; }
    const p = vertices.map(vertex => [positions.read(vertex, 0), positions.read(vertex, 1), positions.read(vertex, 2)]), ux = p[1][0] - p[0][0], uy = p[1][1] - p[0][1], uz = p[1][2] - p[0][2], vx = p[2][0] - p[0][0], vy = p[2][1] - p[0][1], vz = p[2][2] - p[0][2];
    if (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) < 1e-12) err(errors, 'degenerate_triangle');
  }
}
function bounds(positions, errors, summary) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let row = 0; row < positions.accessor.count; row += 1) for (let axis = 0; axis < 3; axis += 1) { const value = positions.read(row, axis); min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value); }
  summary.bounds = { min, max };
  if (min.some((value, index) => Math.abs(value - BOUNDS.min[index]) > 1e-4) || max.some((value, index) => Math.abs(value - BOUNDS.max[index]) > 1e-4)) err(errors, 'neutral_bounds_mismatch');
}
function accessorMetadata(gltf, primitive, errors) {
  const attributes = primitive.attributes || {};
  if (!sameArray(Object.keys(attributes).sort(), ['NORMAL', 'POSITION', 'TEXCOORD_0']) || attributes.POSITION !== 0 || attributes.NORMAL !== 1 || attributes.TEXCOORD_0 !== 2) err(errors, 'invalid_primitive_attributes');
  const position = gltf.accessors?.[attributes.POSITION];
  if (!position || !sameArray(position.min, BOUNDS.min) || !sameArray(position.max, BOUNDS.max)) err(errors, 'invalid_position_bounds_metadata');
  for (const index of [attributes.NORMAL, attributes.TEXCOORD_0, primitive.indices, ...(primitive.targets || []).map(target => target?.POSITION)]) {
    const accessor = gltf.accessors?.[index];
    if (!accessor || 'min' in accessor || 'max' in accessor) err(errors, 'invalid_accessor_metadata');
  }
}

function decodedRange(value) { const min = Array(value.width).fill(Infinity), max = Array(value.width).fill(-Infinity); for (let row = 0; row < value.accessor.count; row += 1) for (let axis = 0; axis < value.width; axis += 1) { const item = value.read(row, axis); min[axis] = Math.min(min[axis], item); max[axis] = Math.max(max[axis], item); } return { min, max }; }
function validatePrimitiveTriangles(position, indices, errors, code) {
  if (!position || !indices || indices.accessor.count % 3) { err(errors, code); return; }
  for (let offset = 0; offset < indices.accessor.count; offset += 3) {
    const triangle = [indices.read(offset, 0), indices.read(offset + 1, 0), indices.read(offset + 2, 0)];
    if (triangle.some(vertex => !Number.isInteger(vertex) || vertex < 0 || vertex >= position.accessor.count)) { err(errors, 'index_out_of_range'); err(errors, code); continue; }
    const a = [position.read(triangle[0], 0), position.read(triangle[0], 1), position.read(triangle[0], 2)], b = [position.read(triangle[1], 0), position.read(triangle[1], 1), position.read(triangle[1], 2)], c = [position.read(triangle[2], 0), position.read(triangle[2], 1), position.read(triangle[2], 2)];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    if (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) <= 1e-12) err(errors, code);
  }
}
function validateScleraTopologyNormals(position, normal, indices, center, errors) {
  if (!position || !normal || !indices) { err(errors, 'invalid_sclera_normals'); return; }
  const accumulated = new Float64Array(position.accessor.count * 3);
  for (let offset = 0; offset < indices.accessor.count; offset += 3) { const ids = [indices.read(offset,0),indices.read(offset+1,0),indices.read(offset+2,0)]; if (ids.some(id => id >= position.accessor.count)) { err(errors, 'invalid_sclera_normals'); continue; } const a = ids[0], b = ids[1], c = ids[2], ux = position.read(b,0)-position.read(a,0), uy=position.read(b,1)-position.read(a,1), uz=position.read(b,2)-position.read(a,2), vx=position.read(c,0)-position.read(a,0), vy=position.read(c,1)-position.read(a,1), vz=position.read(c,2)-position.read(a,2), x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx, outward=x*((position.read(a,0)+position.read(b,0)+position.read(c,0))/3-center[0])+y*((position.read(a,1)+position.read(b,1)+position.read(c,1))/3-center[1])+z*((position.read(a,2)+position.read(b,2)+position.read(c,2))/3-center[2]); if (outward <= 0) err(errors, 'invalid_sclera_winding'); for (const id of ids) { accumulated[id*3]+=x;accumulated[id*3+1]+=y;accumulated[id*3+2]+=z; } }
  let orientation=0; for(let row=0;row<position.accessor.count;row+=1) orientation+=accumulated[row*3]*(position.read(row,0)-center[0])+accumulated[row*3+1]*(position.read(row,1)-center[1])+accumulated[row*3+2]*(position.read(row,2)-center[2]); const sign=orientation<0?-1:1;
  for(let row=0;row<position.accessor.count;row+=1){const x=sign*accumulated[row*3],y=sign*accumulated[row*3+1],z=sign*accumulated[row*3+2],length=Math.hypot(x,y,z),actualLength=Math.hypot(normal.read(row,0),normal.read(row,1),normal.read(row,2)),dot=(normal.read(row,0)*x+normal.read(row,1)*y+normal.read(row,2)*z)/(actualLength*length);if(!Number.isFinite(dot)||Math.abs(actualLength-1)>1e-5||dot<.9999)err(errors,'invalid_sclera_normals');}
}

const materialColor = (hex, alpha = 1) => [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255, alpha];
function equalNumbers(actual, expected) { return Array.isArray(actual) && actual.length === expected.length && actual.every((value, index) => typeof value === 'number' && Number.isFinite(value) && typeof expected[index] === 'number' && Number.isFinite(expected[index]) && Math.abs(value - expected[index]) < 1e-7); }
const finiteVec3 = value => Array.isArray(value) && value.length === 3 && value.every(item => typeof item === 'number' && Number.isFinite(item));
async function auditEyesAndMaterials(gltf, bin, errors) {
  let config;
  try { const bytes = await readFile(path.join(ROOT, 'config', 'avatar-dna', 'human_v2_materials.v1.json')); if (createHash('sha256').update(bytes).digest('hex') !== MATERIAL_CONFIG_SHA256) throw new Error(); config = JSON.parse(bytes); } catch { err(errors, 'material_provenance_unavailable'); return; }
  const byName = new Map((gltf.materials || []).map((material, index) => [material.name, { material, index }]));
  for (const expected of config.materials) {
    const found = byName.get(expected.name)?.material, pbr = found?.pbrMetallicRoughness;
    if (!found || !pbr || pbr.metallicFactor !== 0 || pbr.roughnessFactor !== expected.roughness || !equalNumbers(pbr.baseColorFactor, materialColor(expected.color, expected.opacity ?? 1))) { err(errors, 'invalid_material'); if (expected.name !== 'material_cornea') err(errors, 'unexpected_json_schema'); }
    if (expected.name === 'material_cornea' && (found?.alphaMode !== 'BLEND' || found?.doubleSided !== true || pbr?.baseColorFactor?.[3] !== 0.17)) err(errors, 'opaque_cornea');
  }
  const meshes = new Map((gltf.meshes || []).map(mesh => [mesh?.name, mesh]));
  let sourceBody;
  try { sourceBody = parseMakeHumanObj(await readFile(path.join(ROOT, 'tools', 'avatar-dna', 'vendor', 'makehuman-v1.3.0', 'makehuman', 'data', '3dobjs', 'base.obj'), 'utf8')); } catch { err(errors, 'source_provenance_unavailable'); return; }
  for (const side of ['left', 'right']) {
    const helperGroup = `joint-${side === 'left' ? 'l' : 'r'}-eye`;
    const parts = { sclera: meshes.get(`avatar_eye_${side}_sclera`), iris: meshes.get(`avatar_eye_${side}_iris`), cornea: meshes.get(`avatar_eye_${side}_cornea`) };
    if (Object.values(parts).some(value => !value)) { err(errors, 'missing_eye_mesh'); continue; }
    const sourcePositions = sourceBody.groups?.[helperGroup]?.sourcePositions || [], helperMin = [0,1,2].map(axis => Math.min(...sourcePositions.map(position => position[axis]))), helperMax = [0,1,2].map(axis => Math.max(...sourcePositions.map(position => position[axis]))), helperCenter = helperMin.map((value, axis) => (value + helperMax[axis]) / 2);
    const irisExtras = parts.iris.extras, scleraExtras = parts.sclera.extras, corneaExtras = parts.cornea.extras;
    if (!finiteVec3(irisExtras?.radii) || irisExtras?.apertureRadius !== IRIS_APERTURE_RADIUS || irisExtras?.radialSegments !== 5 || irisExtras?.angularSegments !== 16 || irisExtras?.pupilRing !== 2 || irisExtras?.irisOffsetTowardCamera !== 0.138 || irisExtras?.rimOffset !== 0.126 || !finiteVec3(scleraExtras?.radii) || !equalNumbers(scleraExtras?.apertureRadii, [IRIS_APERTURE_RADIUS,IRIS_APERTURE_RADIUS]) || scleraExtras?.apertureOffset !== 0.126 || !finiteVec3(corneaExtras?.surfaceCenter) || !finiteVec3(corneaExtras?.radii) || !equalNumbers(corneaExtras?.surfaceCenter, helperCenter)) { err(errors, 'invalid_eye_metadata'); continue; }
    for (const [part, mesh] of Object.entries(parts)) {
      const expectedRadii = part === 'sclera' ? [0.165,0.175,0.145] : part === 'iris' ? [0.092,0.092,0.012] : [0.168,0.178,0.151];
      const expectedAnchor = helperCenter;
      if (mesh.extras?.helperGroup !== helperGroup || !equalNumbers(mesh.extras?.radii, expectedRadii) || !equalNumbers(mesh.extras?.helperBounds?.min, helperMin) || !equalNumbers(mesh.extras?.helperBounds?.max, helperMax) || !equalNumbers(mesh.extras?.anchor, expectedAnchor)) err(errors, 'invalid_eye_anchor');
      for (const primitive of mesh.primitives || []) {
        const position = reader(gltf, bin, primitive.attributes?.POSITION, errors), normal = reader(gltf, bin, primitive.attributes?.NORMAL, errors), index = reader(gltf, bin, primitive.indices, errors);
        if (!expectAccessor(position,{componentType:5126,type:'VEC3',count:position?.accessor.count},errors,'invalid_eye_geometry') || !expectAccessor(normal,{componentType:5126,type:'VEC3',count:normal?.accessor.count},errors,'invalid_eye_geometry') || !expectAccessor(index,{componentType:5125,type:'SCALAR',count:index?.accessor.count},errors,'invalid_eye_geometry')) continue;
        finite(position, errors); finite(normal, errors); validatePrimitiveTriangles(position, index, errors, 'degenerate_eye_triangle');
        for (const stream of [position, normal, index]) if (!stream || !hasKeys(stream.accessor, ['bufferView','componentType','count','max','min','type']) || !equalNumbers(stream.accessor.min, decodedRange(stream).min) || !equalNumbers(stream.accessor.max, decodedRange(stream).max)) err(errors, 'invalid_eye_accessor_metadata');
        if (part !== 'iris') {
          const expected = part === 'sclera' ? makeScleraWithAperture({ center: expectedAnchor, radii: expectedRadii }) : makeLatLongEllipsoid({ center: mesh.extras.surfaceCenter, radii: expectedRadii });
          if (!position?.bytes().equals(Buffer.from(expected.positions.buffer)) || !normal?.bytes().equals(Buffer.from(expected.normals.buffer)) || !index?.bytes().equals(Buffer.from(expected.indices.buffer))) err(errors, 'invalid_eye_geometry');
        }
      }
    }
    if (parts.sclera.primitives?.[0]?.material !== byName.get('material_sclera')?.index || parts.cornea.primitives?.[0]?.material !== byName.get('material_cornea')?.index) err(errors, 'invalid_eye_material_binding');
    const iris = parts.iris;
    if (iris.primitives?.length !== 2 || iris.primitives[0]?.material !== byName.get('material_iris')?.index || iris.primitives[1]?.material !== byName.get('material_pupil')?.index || iris.primitives[0]?.attributes?.POSITION !== iris.primitives[1]?.attributes?.POSITION || iris.primitives[0]?.attributes?.NORMAL !== iris.primitives[1]?.attributes?.NORMAL) err(errors, 'invalid_iris_partition');
    else {
      const first = reader(gltf, bin, iris.primitives[0].indices, errors), second = reader(gltf, bin, iris.primitives[1].indices, errors);
      const firstTriangles = new Set(), secondTriangles = new Set();
      for (const [source, target] of [[first, firstTriangles], [second, secondTriangles]]) for (let index = 0; source && index < source.accessor.count; index += 3) target.add([source.read(index,0),source.read(index+1,0),source.read(index+2,0)].sort((a,b)=>a-b).join(','));
      if (!firstTriangles.size || !secondTriangles.size || [...firstTriangles].some(key => secondTriangles.has(key))) err(errors, 'invalid_iris_partition');
      const expected = makeIrisSurface({ center: helperCenter, radii: [0.092,0.092,0.012], apertureRadius: iris.extras.apertureRadius, radialSegments: iris.extras.radialSegments, angularSegments: iris.extras.angularSegments, pupilRing: iris.extras.pupilRing });
      const position = reader(gltf, bin, iris.primitives[0].attributes.POSITION, errors), normal = reader(gltf, bin, iris.primitives[0].attributes.NORMAL, errors);
      if (!position?.bytes().equals(Buffer.from(expected.positions.buffer)) || !normal?.bytes().equals(Buffer.from(expected.normals.buffer)) || !first?.bytes().equals(Buffer.from(expected.annulus.buffer)) || !second?.bytes().equals(Buffer.from(expected.pupil.buffer))) err(errors, 'invalid_iris_partition');
      if (iris.extras?.irisOffsetTowardCamera !== 0.138 || iris.extras?.rimOffset !== 0.126 || Math.abs(position?.read(0, 2) - (helperCenter[2] + 0.138)) > 1e-7) err(errors, 'invalid_eye_anchor');
      const corneaPosition = reader(gltf, bin, parts.cornea.primitives?.[0]?.attributes?.POSITION, errors); let clearance = Infinity;
      for (let row = 0; position && row < position.accessor.count; row += 1) { const localX = position.read(row, 0) - helperCenter[0], localY = position.read(row, 1) - helperCenter[1], x = position.read(row, 0) - parts.cornea.extras.surfaceCenter[0], y = position.read(row, 1) - parts.cornea.extras.surfaceCenter[1], z = position.read(row, 2), zSphere = (z - helperCenter[2] - 0.138 + 0.012) / 0.012; const normalized = x*x/(0.168*0.168) + y*y/(0.178*0.178); const surface = parts.cornea.extras.surfaceCenter[2] + 0.151 * Math.sqrt(Math.max(0, 1 - normalized)); clearance = Math.min(clearance, surface - z); const analytic = [localX/(IRIS_APERTURE_RADIUS*IRIS_APERTURE_RADIUS), localY/(IRIS_APERTURE_RADIUS*IRIS_APERTURE_RADIUS), zSphere/0.012], length = Math.hypot(...analytic), dot = (normal.read(row,0)*analytic[0]+normal.read(row,1)*analytic[1]+normal.read(row,2)*analytic[2]) / length; if (normalized > 1 || surface - z <= 1e-5) err(errors, 'iris_cornea_penetration'); if (!Number.isFinite(dot) || dot < 0.9999) err(errors, 'invalid_iris_normals'); }
      if (!Number.isFinite(clearance) || clearance <= 1e-5 || !corneaPosition) err(errors, 'iris_cornea_penetration');
      const scleraPosition = reader(gltf, bin, parts.sclera.primitives?.[0]?.attributes?.POSITION, errors); const aperture = parts.sclera.extras;
      if (!equalNumbers(aperture.apertureRadii, [IRIS_APERTURE_RADIUS,IRIS_APERTURE_RADIUS]) || aperture.apertureOffset !== 0.126 || !scleraPosition || !Array.from({length:16}, (_, index) => index).every(index => Math.abs(scleraPosition.read(index, 2) - (helperCenter[2] + 0.126)) < 1e-7)) err(errors, 'invalid_sclera_aperture');
      const scleraIndices = reader(gltf, bin, parts.sclera.primitives?.[0]?.indices, errors); let maxScleraEdge = 0;
      for (let index = 0; scleraPosition && scleraIndices && index < scleraIndices.accessor.count; index += 3) for (const [left, right] of [[0,1],[1,2],[2,0]]) { const a = scleraIndices.read(index + left, 0), b = scleraIndices.read(index + right, 0), dx = scleraPosition.read(a,0) - scleraPosition.read(b,0), dy = scleraPosition.read(a,1) - scleraPosition.read(b,1), dz = scleraPosition.read(a,2) - scleraPosition.read(b,2); maxScleraEdge = Math.max(maxScleraEdge, Math.hypot(dx,dy,dz)); }
      if (!scleraPosition || !scleraIndices || scleraPosition.accessor.count !== 161 || scleraIndices.accessor.count !== 912 || maxScleraEdge > 0.09) err(errors, 'invalid_sclera_aperture');
      validateScleraTopologyNormals(scleraPosition, reader(gltf, bin, parts.sclera.primitives?.[0]?.attributes?.NORMAL, errors), scleraIndices, helperCenter, errors);
    }
  }
}

async function auditProjectHairAndGarments(gltf, bin, errors) {
  let hairConfig, body;
  try {
    const bytes = await readFile(path.join(ROOT, 'config', 'avatar-dna', 'human_v2_hair.v1.json'));
    if (createHash('sha256').update(bytes).digest('hex') !== HAIR_CONFIG_SHA256) throw new Error('hair config hash');
    hairConfig = JSON.parse(bytes.toString('utf8'));
    body = parseMakeHumanObj(await readFile(path.join(ROOT, 'tools', 'avatar-dna', 'vendor', 'makehuman-v1.3.0', 'makehuman', 'data', '3dobjs', 'base.obj'), 'utf8'));
  } catch { err(errors, 'hair_config_provenance_unavailable'); return; }
  const meshes = new Map((gltf.meshes || []).map(mesh => [mesh?.name, mesh]));
  const materialIndex = new Map((gltf.materials || []).map((material, index) => [material?.name, index]));
  const normal = new Float32Array(body.positions.length * 3);
  for (const [a,b,c] of body.triangles) { const p=body.positions[a],q=body.positions[b],r=body.positions[c], x=(q[1]-p[1])*(r[2]-p[2])-(q[2]-p[2])*(r[1]-p[1]), y=(q[2]-p[2])*(r[0]-p[0])-(q[0]-p[0])*(r[2]-p[2]), z=(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]); for (const index of [a,b,c]) { normal[index*3]+=x; normal[index*3+1]+=y; normal[index*3+2]+=z; } }
  for (let index=0; index<normal.length; index+=3) { const length=Math.hypot(normal[index],normal[index+1],normal[index+2]) || 1; normal[index]/=length; normal[index+1]/=length; normal[index+2]/=length; }
  const proxy = makeHeadProxyFromBody(body);
  const expectSurface = (name, expected, code, material) => {
    const mesh = meshes.get(name), primitive = mesh?.primitives?.[0];
    if (!mesh || !primitive) { err(errors, 'missing_project_mesh'); return; }
    if (primitive.material !== materialIndex.get(material)) err(errors, material === 'material_cloth' ? 'invalid_garment_material' : 'invalid_hair_material');
    const position = reader(gltf, bin, primitive.attributes?.POSITION, errors), normalAccessor = reader(gltf, bin, primitive.attributes?.NORMAL, errors), index = reader(gltf, bin, primitive.indices, errors);
    if (!position || !normalAccessor || !index || position.accessor.count !== expected.positions.length / 3 || normalAccessor.accessor.count !== expected.normals.length / 3 || index.accessor.count !== expected.indices.length) { err(errors, code); return; }
    finite(position, errors); finite(normalAccessor, errors); validatePrimitiveTriangles(position, index, errors, code);
    if (code === 'invalid_hair_geometry' || code === 'invalid_hood_geometry') for (let row = 0; row < index.accessor.count; row += 3) {
      const a = index.read(row, 0), b = index.read(row + 1, 0), c = index.read(row + 2, 0), ux = position.read(b, 0) - position.read(a, 0), uy = position.read(b, 1) - position.read(a, 1), uz = position.read(b, 2) - position.read(a, 2), vx = position.read(c, 0) - position.read(a, 0), vy = position.read(c, 1) - position.read(a, 1), vz = position.read(c, 2) - position.read(a, 2), face = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx], outward = [normalAccessor.read(a, 0) + normalAccessor.read(b, 0) + normalAccessor.read(c, 0), normalAccessor.read(a, 1) + normalAccessor.read(b, 1) + normalAccessor.read(c, 1), normalAccessor.read(a, 2) + normalAccessor.read(b, 2) + normalAccessor.read(c, 2)];
      if (face[0] * outward[0] + face[1] * outward[1] + face[2] * outward[2] <= 0) err(errors, code);
    }
    if (code === 'invalid_hood_geometry') for (let row = 0; row < normalAccessor.accessor.count; row += 1) if (Math.abs(Math.hypot(normalAccessor.read(row, 0), normalAccessor.read(row, 1), normalAccessor.read(row, 2)) - 1) > 1e-5) err(errors, code);
    if (!position.bytes().equals(Buffer.from(expected.positions.buffer)) || !normalAccessor.bytes().equals(Buffer.from(expected.normals.buffer)) || !index.bytes().equals(Buffer.from(expected.indices.buffer))) err(errors, code);
  };
  for (const style of ['wave','crop']) {
    const mesh = meshes.get(`avatar_hair_${style}`), expected = makeTaperedClumpHair({ proxy, families: hairConfig[style].families, coverage: hairConfig[style].coverage, minimumScalpClearance: hairConfig.minimumScalpClearance, lengthSegments: hairConfig.lengthSegments, radialSegments: hairConfig.radialSegments });
    if (!mesh) { err(errors, 'missing_project_mesh'); continue; }
    const coverageMargin = independentCoverageMargins(proxy, hairConfig[style], hairConfig.minimumScalpClearance);
    if (!coverageMargin || mesh.extras?.generator !== hairConfig.generator || mesh.extras?.style !== style || !sameArray(mesh.extras?.familyCounts, hairConfig[style].families.map(family => family.count)) || mesh.extras?.lengthSegments !== 12 || mesh.extras?.radialSegments !== 7 || mesh.extras?.configSha256 !== HAIR_CONFIG_SHA256 || mesh.extras?.minScalpClearance !== hairConfig.minimumScalpClearance || mesh.extras?.clumpCount !== expected.clumpCount || mesh.extras?.tubeVertexCount !== expected.clumpCount * 85 || mesh.extras?.scapCapVertexCount !== expected.cap.vertexCount || mesh.extras?.scapCapTriangleCount !== expected.cap.triangleCount || !equalNumbers([mesh.extras?.coverageMargin?.worstAzimuthMargin, mesh.extras?.coverageMargin?.worstElevationMargin], [coverageMargin?.worstAzimuthMargin, coverageMargin?.worstElevationMargin]) || JSON.stringify(mesh.extras?.coverage) !== JSON.stringify(hairConfig[style].coverage) || JSON.stringify(mesh.extras?.headProxy) !== JSON.stringify(proxy)) err(errors, 'invalid_hair_metadata');
    if (!(mesh.extras?.minScalpClearance >= .006)) err(errors, 'hair_scalp_penetration');
    expectSurface(`avatar_hair_${style}`, expected, 'invalid_hair_geometry', 'material_hair');
    const primitive = mesh.primitives?.[0], position = reader(gltf, bin, primitive?.attributes?.POSITION, errors), rootClearance = { min: Infinity, max: -Infinity };
    for (let clump = 0; position && clump < expected.clumpCount; clump += 1) for (let segment = 0; segment < 7; segment += 1) { const row = clump * 85 + segment, point = [position.read(row, 0), position.read(row, 1), position.read(row, 2)], clearance = (Math.hypot((point[0] - proxy.center[0]) / proxy.radii[0], (point[1] - proxy.center[1]) / proxy.radii[1], (point[2] - proxy.center[2]) / proxy.radii[2]) - 1) * Math.min(...proxy.radii); rootClearance.min = Math.min(rootClearance.min, clearance); rootClearance.max = Math.max(rootClearance.max, clearance); }
    if (!(rootClearance.min >= .006 - 1e-6) || rootClearance.max > .03 || !equalNumbers([mesh.extras?.rootRingClearance?.min, mesh.extras?.rootRingClearance?.max], [expected.rootRingClearance.min, expected.rootRingClearance.max])) err(errors, 'hair_root_clearance_violation');
  }
  const terra = makeFittedTerraGarment({ positions: body.positions, normals: normal, triangles: body.triangles, sourceVertexIndex: body.sourceVertexIndex, groups: body.groups });
  const outfit = meshes.get('avatar_outfit_terra');
  if (!outfit) err(errors, 'missing_project_mesh');
  else if (outfit.extras?.generator !== 'fitted-garment-v1' || outfit.extras?.surfaceOffset !== .032 || outfit.extras?.sourceTriangleCount !== terra.sourceTriangleCount || outfit.extras?.sourceTriangleHash !== terra.sourceTriangleHash || !sameArray(outfit.extras?.sourceTriangleIndices, terra.sourceTriangleIndices) || !sameArray(outfit.extras?.sourceVertexIndices, terra.sourceVertexIndices) || outfit.extras?.lateralLimit !== terra.lateralLimit || outfit.extras?.inwardTriangleCount !== 0 || JSON.stringify(outfit.extras?.torsoBounds) !== JSON.stringify(terra.torsoBounds) || outfit.extras?.configSha256 !== HAIR_CONFIG_SHA256) err(errors, 'invalid_garment_offset');
  expectSurface('avatar_outfit_terra', terra, 'invalid_garment_geometry', 'material_cloth');
  const neck = (() => { const points=body.groups['joint-neck'].sourcePositions, min=[0,1,2].map(axis=>Math.min(...points.map(point=>point[axis]))), max=[0,1,2].map(axis=>Math.max(...points.map(point=>point[axis]))); return min.map((value,axis)=>(value+max[axis])/2); })();
  const hood = makeAssassinHood({ proxy, neckAnchor: neck }), hoodMesh = meshes.get('avatar_hood_assassin');
  if (!hoodMesh) err(errors, 'missing_project_mesh');
  else if (hoodMesh.extras?.generator !== 'hood-swept-rings-v1' || hoodMesh.extras?.ringSegments !== hood.ringSegments || hoodMesh.extras?.radialSegments !== hood.radialSegments || !equalNumbers(hoodMesh.extras?.anchor, hood.anchor) || JSON.stringify(hoodMesh.extras?.headProxy) !== JSON.stringify(proxy) || hoodMesh.extras?.configSha256 !== HAIR_CONFIG_SHA256) err(errors, 'invalid_hood_metadata');
  expectSurface('avatar_hood_assassin', hood, 'invalid_hood_geometry', 'material_cloth');
}

export async function auditHumanV2Glb(input) {
  const errors = []; let bytes;
  try { bytes = Buffer.isBuffer(input) ? input : await readFile(input); } catch { return { ok: false, errors: ['unreadable_input'], summary: null }; }
  const summary = { vertexCount: 0, triangleCount: 0, morphCount: 0, meshNames: [], targetNames: [], maxAbsDelta: 0, bounds: null, sha256: createHash('sha256').update(bytes).digest('hex') };
  try {
    const parsed = parseGlb(bytes, errors); if (!parsed) return { ok: false, errors, summary };
    const { gltf, bin } = parsed; graph(gltf, errors);
    collectionContract(gltf, bin, errors);
    exactSchema(gltf, bin, errors);
    const mesh = gltf.meshes?.[0], primitive = mesh?.primitives?.[0]; summary.meshNames = (gltf.meshes || []).map(value => value?.name);
    if (!mesh || mesh.name !== 'avatar_body_base' || mesh.primitives?.length !== 1 || !primitive) { err(errors, 'invalid_body_mesh'); err(errors, 'missing_required_named_morphs'); err(errors, 'primitive_fixture_detected'); return { ok: false, errors, summary }; }
    if (primitive.mode !== undefined && primitive.mode !== 4) err(errors, 'invalid_primitive_mode');
    if (primitive.material !== 0) err(errors, 'invalid_material');
    accessorMetadata(gltf, primitive, errors);
    const positions = reader(gltf, bin, primitive.attributes?.POSITION, errors), normals = reader(gltf, bin, primitive.attributes?.NORMAL, errors), uvs = reader(gltf, bin, primitive.attributes?.TEXCOORD_0, errors), indices = reader(gltf, bin, primitive.indices, errors);
    const shapeOk = expectAccessor(positions, { componentType: 5126, type: 'VEC3', count: VERTICES }, errors) & expectAccessor(normals, { componentType: 5126, type: 'VEC3', count: VERTICES }, errors) & expectAccessor(uvs, { componentType: 5126, type: 'VEC2', count: VERTICES }, errors) & expectAccessor(indices, { componentType: 5125, type: 'SCALAR', count: INDICES }, errors);
    summary.vertexCount = positions?.accessor.count || 0; summary.triangleCount = (indices?.accessor.count || 0) / 3; finite(positions, errors); finite(normals, errors); finite(uvs, errors);
    if (positions) bounds(positions, errors, summary); if (positions && indices && indices.accessor.count % 3 === 0) triangles(positions, indices, errors);
    const targetNames = mesh.extras?.targetNames; summary.targetNames = Array.isArray(targetNames) ? targetNames : []; summary.morphCount = primitive.targets?.length || 0;
    if (!sameArray(targetNames, TARGET_ORDER) || new Set(targetNames || []).size !== TARGET_ORDER.length) err(errors, 'missing_required_named_morphs');
    if (!Array.isArray(mesh.weights) || mesh.weights.length !== TARGET_ORDER.length || mesh.weights.some(weight => weight !== 0)) err(errors, 'invalid_default_weights');
    if (!Array.isArray(primitive.targets) || primitive.targets.length !== TARGET_ORDER.length) err(errors, 'invalid_morph_target');
    let expected;
    try { expected = await canonical(); } catch { return { ok: false, errors: [...errors, 'source_provenance_unavailable'], message: 'canonical source or provenance is unavailable', summary }; }
    if (shapeOk && positions && !positions.bytes().equals(expected.positions)) err(errors, 'canonical_position_mismatch');
    if (shapeOk && normals && !normals.bytes().equals(expected.normals)) err(errors, 'canonical_normal_mismatch');
    if (shapeOk && uvs && !uvs.bytes().equals(expected.uvs)) err(errors, 'canonical_uv_mismatch');
    if (shapeOk && indices && !indices.bytes().equals(expected.indices)) err(errors, 'canonical_topology_mismatch');
    for (let index = 0; index < TARGET_ORDER.length; index += 1) {
      const target = primitive.targets?.[index]; if (!target || Object.keys(target).length !== 1 || target.POSITION !== 4 + index) { err(errors, 'invalid_morph_target'); continue; }
      const morph = reader(gltf, bin, target.POSITION, errors); if (!expectAccessor(morph, { componentType: 5126, type: 'VEC3', count: VERTICES }, errors, 'invalid_morph_target')) continue;
      finite(morph, errors); for (let row = 0; row < morph.accessor.count; row += 1) for (let column = 0; column < 3; column += 1) summary.maxAbsDelta = Math.max(summary.maxAbsDelta, Math.abs(morph.read(row, column)));
      if (!morph.bytes().equals(expected.morphs[index])) err(errors, 'morph_signature_mismatch');
    }
    await auditEyesAndMaterials(gltf, bin, errors);
    await auditProjectHairAndGarments(gltf, bin, errors);
    if (summary.maxAbsDelta > 1) err(errors, 'unreasonable_morph_delta');
    return { ok: errors.length === 0, errors, summary };
  } catch { err(errors, 'internal_audit_error'); return { ok: false, errors, message: 'internal auditor error', summary }; }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) auditHumanV2Glb(process.argv[2]).then(result => { process.stdout.write(JSON.stringify(result)); process.exitCode = result.ok ? 0 : 1; });
