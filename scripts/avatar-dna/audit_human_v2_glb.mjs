import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMakeHumanObj } from './lib/makehuman_obj.mjs';
import { loadRelativeMorphDeltas, TARGET_ORDER } from './lib/morph_recipe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GLB_MAGIC = 0x46546c67, JSON_CHUNK = 0x4e4f534a, BIN_CHUNK = 0x004e4942;
const COMPONENT_BYTES = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }, TYPE_COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3 };
const VERTICES = 14517, INDICES = 80268, BOUNDS = { min: [-4.9627, -8.1676, -1.0154], max: [4.9627, 8.4913, 3.2147] };
const ROOT_KEYS = ['accessors', 'asset', 'bufferViews', 'buffers', 'materials', 'meshes', 'nodes', 'scene', 'scenes'];
const VIEW_LENGTHS = [174204, 174204, 116136, 321072, ...Array(18).fill(174204)];
const err = (errors, code) => { if (!errors.includes(code)) errors.push(code); };
const isUint = value => Number.isInteger(value) && value >= 0;
const sameArray = (a, b) => Array.isArray(a) && a.length === b.length && a.every((value, index) => value === b[index]);
const hasKeys = (value, keys) => !!value && sameArray(Object.keys(value).sort(), [...keys].sort());

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
  if (gltf.scene !== 0 || gltf.scenes?.length !== 1 || gltf.scenes?.[0]?.name !== 'human_v2_scene' || !sameArray(gltf.scenes?.[0]?.nodes, [0])) err(errors, 'invalid_scene_reference');
  const node = gltf.nodes?.[0];
  if (gltf.nodes?.length !== 1 || !node || node.name !== 'human_v2' || node.mesh !== 0 || 'weights' in node || 'children' in node || 'skin' in node || gltf.nodes.some(entry => !entry || !isUint(entry.mesh) || entry.mesh >= gltf.meshes.length)) err(errors, 'invalid_node_reference');
  if (!node || !sameArray(Object.keys(node).sort(), ['mesh', 'name'])) err(errors, 'invalid_node_transform');
  if (gltf.meshes?.length !== 1 || gltf.materials?.length !== 1 || gltf.textures?.length || gltf.images?.length || gltf.samplers?.length) err(errors, 'invalid_reference_graph');
  if (gltf.buffers?.length !== 1) err(errors, 'invalid_bin_length');
  const material = gltf.materials?.[0];
  if (!material || material.name !== 'material_skin' || material.pbrMetallicRoughness?.baseColorTexture || material.normalTexture || material.occlusionTexture || material.emissiveTexture) err(errors, 'invalid_material');
  for (const texture of gltf.textures || []) if (!isUint(texture?.source) || texture.source >= (gltf.images?.length || 0) || (texture.sampler !== undefined && (!isUint(texture.sampler) || texture.sampler >= (gltf.samplers?.length || 0)))) err(errors, 'invalid_texture_reference');
}
function collectionContract(gltf, bin, errors) {
  const buffers = gltf.buffers || [], views = gltf.bufferViews || [], accessors = gltf.accessors || [];
  if (buffers.length !== 1 || !sameArray(Object.keys(buffers[0] || {}).sort(), ['byteLength']) || buffers[0]?.byteLength !== bin.length) err(errors, 'invalid_bin_length');
  if (views.length !== 22 || accessors.length !== 22) err(errors, 'invalid_collection_cardinality');
  for (let index = 0; index < views.length; index += 1) {
    const view = views[index];
    if (!view || !sameArray(Object.keys(view).sort(), ['buffer', 'byteLength', 'byteOffset']) || view.buffer !== 0 || !isUint(view.byteOffset) || !isUint(view.byteLength) || view.byteOffset + view.byteLength > bin.length) err(errors, 'invalid_buffer_view');
  }
  for (let index = 0; index < accessors.length; index += 1) {
    const accessor = accessors[index]; const expected = index === 0 ? ['bufferView', 'componentType', 'count', 'max', 'min', 'type'] : ['bufferView', 'componentType', 'count', 'type'];
    if (!accessor || !sameArray(Object.keys(accessor).sort(), expected)) err(errors, 'invalid_accessor_metadata');
  }
}
function exactSchema(gltf, bin, errors) {
  const bad = () => err(errors, 'unexpected_json_schema');
  if (!hasKeys(gltf, ROOT_KEYS) || !hasKeys(gltf.asset, ['generator', 'version']) || gltf.asset.version !== '2.0' || gltf.asset.generator !== 'phraseman-avatar-dna-cc0-v1') bad();
  if (!hasKeys(gltf.scenes?.[0], ['name', 'nodes']) || gltf.scenes?.[0]?.name !== 'human_v2_scene' || !sameArray(gltf.scenes?.[0]?.nodes, [0])) bad();
  if (!hasKeys(gltf.nodes?.[0], ['mesh', 'name']) || gltf.nodes?.[0]?.name !== 'human_v2' || gltf.nodes?.[0]?.mesh !== 0) bad();
  const mesh = gltf.meshes?.[0], primitive = mesh?.primitives?.[0];
  if (!hasKeys(mesh, ['extras', 'name', 'primitives', 'weights']) || mesh?.name !== 'avatar_body_base' || !sameArray(mesh?.weights, Array(18).fill(0)) || !hasKeys(mesh?.extras, ['targetNames']) || !sameArray(mesh?.extras?.targetNames, TARGET_ORDER) || mesh?.primitives?.length !== 1) bad();
  if (!hasKeys(primitive, ['attributes', 'indices', 'material', 'targets']) || primitive?.indices !== 3 || primitive?.material !== 0 || !hasKeys(primitive?.attributes, ['NORMAL', 'POSITION', 'TEXCOORD_0']) || primitive?.attributes?.POSITION !== 0 || primitive?.attributes?.NORMAL !== 1 || primitive?.attributes?.TEXCOORD_0 !== 2 || primitive?.targets?.length !== 18) bad();
  for (let index = 0; index < (primitive?.targets?.length || 0); index += 1) if (!hasKeys(primitive.targets[index], ['POSITION']) || primitive.targets[index].POSITION !== 4 + index) bad();
  const material = gltf.materials?.[0], pbr = material?.pbrMetallicRoughness;
  if (!hasKeys(material, ['name', 'pbrMetallicRoughness']) || material?.name !== 'material_skin' || !hasKeys(pbr, ['baseColorFactor', 'metallicFactor', 'roughnessFactor']) || !sameArray(pbr?.baseColorFactor, [0.72, 0.42, 0.28, 1]) || pbr?.metallicFactor !== 0 || pbr?.roughnessFactor !== 0.72) bad();
  if (!hasKeys(gltf.buffers?.[0], ['byteLength']) || gltf.buffers?.[0]?.byteLength !== bin.length || bin.length !== 3921288) bad();
  let offset = 0;
  for (let index = 0; index < (gltf.bufferViews?.length || 0); index += 1) { const view = gltf.bufferViews[index]; if (!hasKeys(view, ['buffer', 'byteLength', 'byteOffset']) || view.buffer !== 0 || view.byteOffset !== offset || view.byteLength !== VIEW_LENGTHS[index]) bad(); offset += VIEW_LENGTHS[index] || 0; }
  for (let index = 0; index < (gltf.accessors?.length || 0); index += 1) {
    const accessor = gltf.accessors[index], expected = index === 0 ? ['bufferView', 'componentType', 'count', 'max', 'min', 'type'] : ['bufferView', 'componentType', 'count', 'type'];
    const componentType = index === 3 ? 5125 : 5126, type = index === 2 ? 'VEC2' : index === 3 ? 'SCALAR' : 'VEC3', count = index === 3 ? INDICES : VERTICES;
    if (!hasKeys(accessor, expected) || accessor?.bufferView !== index || accessor?.componentType !== componentType || accessor?.type !== type || accessor?.count !== count || (index === 0 && (!sameArray(accessor.min, BOUNDS.min) || !sameArray(accessor.max, BOUNDS.max)))) bad();
  }
}

async function canonical() {
  const vendor = path.join(ROOT, 'tools', 'avatar-dna', 'vendor', 'makehuman-v1.3.0');
  const body = parseMakeHumanObj(await readFile(path.join(vendor, 'makehuman', 'data', '3dobjs', 'base.obj'), 'utf8'));
  const positions = new Float32Array(body.positions.flat()), normals = new Float32Array(positions.length);
  for (const [a, b, c] of body.triangles) {
    const p = body.positions[a], q = body.positions[b], r = body.positions[c], ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2], x = uy * vz - uz * vy, y = uz * vx - ux * vz, z = ux * vy - uy * vx;
    for (const index of [a, b, c]) { normals[index * 3] += x; normals[index * 3 + 1] += y; normals[index * 3 + 2] += z; }
  }
  for (let index = 0; index < normals.length; index += 3) { const length = Math.hypot(normals[index], normals[index + 1], normals[index + 2]) || 1; normals[index] /= length; normals[index + 1] /= length; normals[index + 2] /= length; }
  const morphs = await loadRelativeMorphDeltas({ recipePath: path.join(ROOT, 'config', 'avatar-dna', 'human_v2_style.v1.json'), targetsRoot: vendor, sourceVertexIndex: body.sourceVertexIndex, sourceVertexCount: body.sourcePositions.length });
  return { positions: Buffer.from(positions.buffer), normals: Buffer.from(normals.buffer), uvs: Buffer.from(new Float32Array(body.uvs.flat()).buffer), indices: Buffer.from(new Uint32Array(body.triangles.flat()).buffer), morphs: morphs.map(value => Buffer.from(value.buffer)) };
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
    if (!mesh || gltf.meshes?.length !== 1 || mesh.name !== 'avatar_body_base' || mesh.primitives?.length !== 1 || !primitive) { err(errors, 'invalid_body_mesh'); err(errors, 'missing_required_named_morphs'); err(errors, 'primitive_fixture_detected'); return { ok: false, errors, summary }; }
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
    const expected = await canonical();
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
    if (summary.maxAbsDelta > 1) err(errors, 'unreasonable_morph_delta');
    return { ok: errors.length === 0, errors, summary };
  } catch { err(errors, 'invalid_glb_structure'); return { ok: false, errors, summary }; }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) auditHumanV2Glb(process.argv[2]).then(result => { process.stdout.write(JSON.stringify(result)); process.exitCode = result.ok ? 0 : 1; });
