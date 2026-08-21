import { lstat, mkdir, open, readFile, realpath, rename, unlink } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMakeHumanObj } from './lib/makehuman_obj.mjs';
import { loadRelativeMorphDeltas, TARGET_ORDER } from './lib/morph_recipe.mjs';
import { makeIrisSurface, makeLatLongEllipsoid, makeScleraWithAperture } from './lib/ellipsoid_mesh.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MANIFEST_SHA256 = 'ea7948dd62fbe987cc16fc3751a71c07c17db787db1637d6d7eb5526582545a6';
export const MATERIAL_CONFIG_SHA256 = 'b4739d2fcfc0e44cf1ee6b19890bf62b0706c4a77a5955bda0eb9e9e8d3d75c8';
export const CANONICAL_STREAM_SHA256 = [
  '1a7f3e39d7464e6c27ebf5204f18343c679aa6bd603872db2a9de366040f82a9','c4211b5e56ec96fb4da2c3d5dac23e64057354b07ee5f12c07a8c505a171526e','eea12628449c9583b0193cd3d7534c920dfc6fe8380d7c5b44a19c44edcb91be','4c29f318e20b87a2c0ddce3689fa0ab285ee390fc02e5f3a017736df772a3661',
  'e07e7fb9505a5f5aeceb3e9fde4e14380b0c97a82943f72a16434407084abf8b','251c21e16d8beaa3a0ecf3d365e8add9b733141e07ed59b983e9da1995f436dc','e0da7a3dc92ac4c15fba557bbb9f85c7750462017e64615e66d5df748ce804ca','c750ff8fd52e8c536f5cf678c124f92bd18879437a9351fcf516ab1fa1e97a85','9dcf5c9d351e40d833785992d294deaaf3544282a78dd2edfa65fed22e6a4cd5','589dae00e4a0ccfa7370ba52ea314bc2b4ef514066bc044b776ea15f2ff0da40','00a25f1f4f8322dfb07e325257839bbeddd3191bee6cafb5ec6c538a38a6625e','5686426ce59544732f6efb05365a93f988bf827e884a64ef7eaff6044f33b1e8','8e8685cc83768c8a7d0a8ebf801ed7ae9407537da5051d90cd2972c9d99decb7','d6d8083262ea77f3fa5039e284be9f8a18725d73dd61b516afe5f2dd3370a74e','ffff5fe9a3c6127a3d6af095329a115bbaa6a230d4137f82d2a7c0101e7b2677','943c6533967f3c34b9573477ba0095e06bfbc5ae91006bd3e0f4fcfbd8cd0e9f','e242d5f9f290d54220aafac073dca6e55b23afa9fb55b96550f22e02244072ba','eb4d58b1fb4a89ff266eb6c738f048e45af8d8129318a25515f353598ec6c880','63f58208f0f0dcb0a939e7638fc7ab389158c4a3623180d7d3a2575d1c77b021','42644dc587cbeaeb196541a0f5b8b721607f5c98b9f3d22dc600a882f6475b9c','c978ed6b1c0fe70afa3c27b666c507d06d05c6548f7beabd7f76660db4d3e332','0dc01faa62479647e949fa56b885f720965d7f3953a9059d7b7f826e9a24b5e2',
];
const pad = (bytes, fill = 0) => Buffer.concat([bytes, Buffer.alloc((4 - bytes.length % 4) % 4, fill)]);
const bounds = (values) => {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const value of values) for (let i = 0; i < 3; i += 1) { min[i] = Math.min(min[i], value[i]); max[i] = Math.max(max[i], value[i]); }
  return { min, max };
};
function normals(positions, triangles) {
  const result = new Float32Array(positions.length * 3);
  for (const [a, b, c] of triangles) {
    const p = positions[a], q = positions[b], r = positions[c]; const ux = q[0]-p[0], uy=q[1]-p[1], uz=q[2]-p[2], vx=r[0]-p[0], vy=r[1]-p[1], vz=r[2]-p[2];
    const x=uy*vz-uz*vy, y=uz*vx-ux*vz, z=ux*vy-uy*vx;
    for (const index of [a,b,c]) { result[index*3]+=x; result[index*3+1]+=y; result[index*3+2]+=z; }
  }
  for (let i=0;i<result.length;i+=3) { const d=Math.hypot(result[i],result[i+1],result[i+2]) || 1; result[i]/=d; result[i+1]/=d; result[i+2]/=d; }
  return result;
}
export function validateOutputPath(output, allowedRoot) {
  const absolute = path.resolve(output); const allowed = path.resolve(allowedRoot);
  if (absolute === allowed || !absolute.startsWith(allowed + path.sep)) throw new Error('output must be contained by the explicit allowed output root');
  return absolute;
}
export function assertCanonicalStreams(streams) {
  if (streams.length !== CANONICAL_STREAM_SHA256.length || streams.some((stream, index) => createHash('sha256').update(stream).digest('hex') !== CANONICAL_STREAM_SHA256[index])) throw new Error('canonical geometry oracle mismatch');
}
export function assertManifestBytes(bytes) {
  if (createHash('sha256').update(bytes).digest('hex') !== MANIFEST_SHA256) throw new Error('pinned source manifest provenance mismatch');
}
async function ensureRealDirectory(anchor, directory) {
  const anchorPath = path.resolve(anchor), directoryPath = path.resolve(directory); const anchorStat = await lstat(anchorPath);
  if (!anchorStat.isDirectory() || anchorStat.isSymbolicLink()) throw new Error('trusted output anchor is not a real directory');
  const trusted = await realpath(anchorPath); const relative = path.relative(anchorPath, directoryPath);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('allowed output root escapes trusted anchor');
  let current = anchorPath;
  for (const component of relative.split(path.sep).filter(Boolean)) {
    const next = path.join(current, component);
    try { await lstat(next); } catch (error) { if (error?.code !== 'ENOENT') throw error; await mkdir(next); }
    const stat = await lstat(next); const resolved = await realpath(next);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (resolved !== trusted && !resolved.startsWith(trusted + path.sep))) throw new Error('output path escapes trusted anchor');
    current = next;
  }
  return directoryPath;
}
export async function validateWritableOutputPath(output, allowedRoot, options = {}) {
  const destination = validateOutputPath(output, allowedRoot); const rootPath = path.resolve(allowedRoot);
  if (options.trustedOutputAnchor) await ensureRealDirectory(options.trustedOutputAnchor, rootPath);
  else { const rootStat = await lstat(rootPath); if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('custom allowed output root must already be a real directory'); }
  const allowed = await realpath(rootPath); const relative = path.relative(rootPath, path.dirname(destination));
  let current = rootPath;
  for (const component of relative.split(path.sep).filter(Boolean)) {
    const next = path.join(current, component);
    try { await lstat(next); } catch (error) { if (error?.code !== 'ENOENT') throw error; await mkdir(next); }
    const stat = await lstat(next); const resolved = await realpath(next);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (resolved !== allowed && !resolved.startsWith(allowed + path.sep))) throw new Error('output path escapes allowed root');
    current = next;
  }
  try { const stat = await lstat(destination); if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('output destination is not a regular file'); } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  return destination;
}
async function verifyProvenance(vendor) {
  const manifestBytes = await readFile(path.join(root, 'config', 'avatar-dna', 'human_v2_cc0_source.v1.json'));
  assertManifestBytes(manifestBytes);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const style = await readFile(path.join(root, 'config', 'avatar-dna', 'human_v2_style.v1.json'));
  if (createHash('sha256').update(style).digest('hex') !== '45beb0b962be02b7f0a9cb0c06bf8b248155de5337fd3b495e15217554ef8c54') throw new Error('pinned style provenance mismatch');
  for (const file of manifest.files.filter(file => file.destination !== 'LICENSE.ASSETS.md')) { const bytes = await readFile(path.join(vendor, file.destination)); if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new Error(`pinned source provenance mismatch: ${file.destination}`); }
  const materials = await readFile(path.join(root, 'config', 'avatar-dna', 'human_v2_materials.v1.json'));
  if (createHash('sha256').update(materials).digest('hex') !== MATERIAL_CONFIG_SHA256) throw new Error('pinned material provenance mismatch');
  return JSON.parse(materials.toString('utf8'));
}
const colorFactor = (hex, alpha = 1) => [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255, alpha];
const typedBounds = (typed, width) => { const min = Array(width).fill(Infinity), max = Array(width).fill(-Infinity); for (let index = 0; index < typed.length; index += width) for (let axis = 0; axis < width; axis += 1) { min[axis] = Math.min(min[axis], typed[index + axis]); max[axis] = Math.max(max[axis], typed[index + axis]); } return { min, max }; };
const helperBounds = (group) => {
  const points = group.sourcePositions;
  const min = [0, 1, 2].map(axis => Math.min(...points.map(point => point[axis])));
  const max = [0, 1, 2].map(axis => Math.max(...points.map(point => point[axis])));
  return { min, max, center: min.map((value, axis) => (value + max[axis]) / 2) };
};

export async function buildHumanV2Cc0Glb(options = {}) {
  const input = typeof options === 'string' ? { output: options } : options;
  const allowedOutputRoot = input.allowedOutputRoot || path.join(root, '.codex-tmp', 'avatar-dna');
  const trustedOutputAnchor = input.trustedOutputAnchor || (input.allowedOutputRoot ? undefined : root);
  const destination = await validateWritableOutputPath(input.output || path.join(allowedOutputRoot, 'human_v2_cc0_candidate.glb'), allowedOutputRoot, { trustedOutputAnchor });
  const vendor = path.join(root, 'tools', 'avatar-dna', 'vendor', 'makehuman-v1.3.0');
  const materialConfig = await verifyProvenance(vendor);
  const body = parseMakeHumanObj(await readFile(path.join(vendor, 'makehuman', 'data', '3dobjs', 'base.obj'), 'utf8'));
  const positions = new Float32Array(body.positions.flat()), uvs = new Float32Array(body.uvs.flat()), normal = normals(body.positions, body.triangles);
  const indices = new Uint32Array(body.triangles.flat()); const morphs = await loadRelativeMorphDeltas({ recipePath:path.join(root,'config','avatar-dna','human_v2_style.v1.json'), targetsRoot:vendor, sourceVertexIndex:body.sourceVertexIndex, sourceVertexCount:body.sourcePositions.length });
  assertCanonicalStreams([Buffer.from(positions.buffer), Buffer.from(normal.buffer), Buffer.from(uvs.buffer), Buffer.from(indices.buffer), ...morphs.map(value => Buffer.from(value.buffer))]);
  const chunks=[]; const views=[]; const accessors=[];
  const add=(typed) => { const bytes=pad(Buffer.from(typed.buffer,typed.byteOffset,typed.byteLength)); const index=views.length; views.push({buffer:0,byteOffset:chunks.reduce((n,c)=>n+c.length,0),byteLength:typed.byteLength}); chunks.push(bytes); return index; };
  const accessor = (typed, componentType, type, minMax = null) => { const entry={bufferView:add(typed),componentType,count:typed.length / (type === 'VEC3' ? 3 : type === 'VEC2' ? 2 : 1),type}; if(minMax) {entry.min=minMax.min;entry.max=minMax.max;} accessors.push(entry); return accessors.length-1; };
  const p=accessor(positions,5126,'VEC3',bounds(body.positions)), n=accessor(normal,5126,'VEC3'), uv=accessor(uvs,5126,'VEC2'), ix=accessor(indices,5125,'SCALAR'); const morphAccessors=morphs.map(value=>accessor(value,5126,'VEC3'));
  const meshes=[{name:'avatar_body_base',primitives:[{attributes:{POSITION:p,NORMAL:n,TEXCOORD_0:uv},indices:ix,material:0,targets:morphAccessors.map(POSITION=>({POSITION}))}],weights:Array(18).fill(0),extras:{targetNames:TARGET_ORDER}}];
  const nodes=[{name:'avatar_body_base',mesh:0}];
  const materialNames = materialConfig.materials.map(material => material.name);
  const materialIndex = Object.fromEntries(materialNames.map((name,index)=>[name,index]));
  const materials = materialConfig.materials.map(material => {
    const pbrMetallicRoughness={baseColorFactor:colorFactor(material.color,material.opacity ?? 1),metallicFactor:0,roughnessFactor:material.roughness};
    const result={name:material.name,pbrMetallicRoughness}; if(material.alphaMode) result.alphaMode=material.alphaMode; if(material.doubleSided) result.doubleSided=true; return result;
  });
  for (const side of ['left','right']) {
    const helperGroup = `joint-${side === 'left' ? 'l' : 'r'}-eye`, anchor = helperBounds(body.groups[helperGroup]);
    const sclera = makeScleraWithAperture({center:anchor.center,radii:[0.165,0.175,0.145]});
    const iris=makeIrisSurface({center:anchor.center,radii:[0.092,0.092,0.012],apertureRadius:sclera.apertureRadii[0]});
    const corneaCenter=anchor.center, cornea = makeLatLongEllipsoid({center:corneaCenter,radii:[0.168,0.178,0.151]});
    const addSurface=(name,surface,material,extras={})=>{const position=accessor(surface.positions,5126,'VEC3',typedBounds(surface.positions,3)),normalAccessor=accessor(surface.normals,5126,'VEC3',typedBounds(surface.normals,3)),index=accessor(surface.indices,5125,'SCALAR',typedBounds(surface.indices,1));meshes.push({name,primitives:[{attributes:{POSITION:position,NORMAL:normalAccessor},indices:index,material}],extras});nodes.push({name,mesh:meshes.length-1});};
    const provenance={helperGroup,helperBounds:{min:anchor.min,max:anchor.max},anchor:anchor.center};
    addSurface(`avatar_eye_${side}_sclera`,sclera,materialIndex.material_sclera,{...provenance,radii:[0.165,0.175,0.145],apertureRadii:sclera.apertureRadii,apertureOffset:sclera.apertureOffset});
    const ip=accessor(iris.positions,5126,'VEC3',typedBounds(iris.positions,3)),inorm=accessor(iris.normals,5126,'VEC3',typedBounds(iris.normals,3)),annulus=accessor(iris.annulus,5125,'SCALAR',typedBounds(iris.annulus,1)),pupil=accessor(iris.pupil,5125,'SCALAR',typedBounds(iris.pupil,1));
    meshes.push({name:`avatar_eye_${side}_iris`,primitives:[{attributes:{POSITION:ip,NORMAL:inorm},indices:annulus,material:materialIndex.material_iris},{attributes:{POSITION:ip,NORMAL:inorm},indices:pupil,material:materialIndex.material_pupil}],extras:{...provenance,radii:[0.092,0.092,0.012],apertureRadius:iris.apertureRadius,irisOffsetTowardCamera:iris.apexOffset,rimOffset:iris.rimOffset,pupilRing:iris.pupilRing,radialSegments:iris.radialSegments,angularSegments:iris.angularSegments}}); nodes.push({name:`avatar_eye_${side}_iris`,mesh:meshes.length-1});
    addSurface(`avatar_eye_${side}_cornea`,cornea,materialIndex.material_cornea,{...provenance,radii:[0.168,0.178,0.151],surfaceCenter:corneaCenter});
  }
  const gltf={asset:{version:'2.0',generator:'phraseman-avatar-dna-cc0-v1'},scene:0,scenes:[{name:'human_v2_scene',nodes:nodes.map((_,index)=>index)}],nodes,meshes,materials,accessors,bufferViews:views,buffers:[{byteLength:chunks.reduce((n,c)=>n+c.length,0)}]};
  const json=pad(Buffer.from(JSON.stringify(gltf),'utf8'),0x20), bin=Buffer.concat(chunks), total=12+8+json.length+8+bin.length, header=Buffer.alloc(12); header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(total,8); const jsonHeader=Buffer.alloc(8);jsonHeader.writeUInt32LE(json.length,0);jsonHeader.writeUInt32LE(0x4e4f534a,4); const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(bin.length,0);binHeader.writeUInt32LE(0x004e4942,4);
  const temporaryName = input.temporaryName || `.${path.basename(destination)}.tmp-${randomBytes(16).toString('hex')}`;
  if (path.basename(temporaryName) !== temporaryName) throw new Error('temporary output name is invalid');
  const temporary = path.join(path.dirname(destination), temporaryName); let handle;
  try { handle = await open(temporary, 'wx'); await handle.writeFile(Buffer.concat([header,jsonHeader,json,binHeader,bin])); await handle.sync(); await handle.close(); handle = null; await validateWritableOutputPath(destination, allowedOutputRoot, { trustedOutputAnchor }); await rename(temporary, destination); return destination; } finally { await handle?.close().catch(() => {}); await unlink(temporary).catch(() => {}); }
}
export default buildHumanV2Cc0Glb;
if (process.argv[1] === fileURLToPath(import.meta.url)) { const at=process.argv.indexOf('--output'); if (at !== -1 && (!process.argv[at+1] || at+2 !== process.argv.length)) { process.stdout.write(JSON.stringify({ok:false,errors:['invalid_cli_arguments']})); process.exitCode=1; } else { const output=at===-1?undefined:process.argv[at+1]; buildHumanV2Cc0Glb({output}).then(file=>process.stdout.write(`${file}\n`)).catch(error=>{process.stdout.write(JSON.stringify({ok:false,errors:['build_failed'],message:error.message}));process.exitCode=1;}); } }
