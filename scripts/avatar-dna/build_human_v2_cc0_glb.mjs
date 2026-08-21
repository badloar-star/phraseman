import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMakeHumanObj } from './lib/makehuman_obj.mjs';
import { loadRelativeMorphDeltas, TARGET_ORDER } from './lib/morph_recipe.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
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
function assertOutput(output) {
  const absolute = path.resolve(output); const temporary = absolute.includes(`${path.sep}.codex-tmp${path.sep}`) || absolute.startsWith(path.resolve(path.dirname(process.env.TEMP || process.env.TMP || root)) + path.sep);
  if (!absolute.startsWith(root + path.sep) && !temporary) throw new Error('output must be inside the repository or an explicit temporary directory');
  return absolute;
}
export async function buildHumanV2Cc0Glb(output = path.join(root, '.codex-tmp', 'avatar-dna', 'human_v2_cc0_candidate.glb')) {
  const destination = assertOutput(output);
  const vendor = path.join(root, 'tools', 'avatar-dna', 'vendor', 'makehuman-v1.3.0');
  const body = parseMakeHumanObj(await readFile(path.join(vendor, 'makehuman', 'data', '3dobjs', 'base.obj'), 'utf8'));
  const positions = new Float32Array(body.positions.flat()), uvs = new Float32Array(body.uvs.flat()), normal = normals(body.positions, body.triangles);
  const indices = new Uint32Array(body.triangles.flat()); const morphs = await loadRelativeMorphDeltas({ recipePath:path.join(root,'config','avatar-dna','human_v2_style.v1.json'), targetsRoot:vendor, sourceVertexIndex:body.sourceVertexIndex, sourceVertexCount:body.sourcePositions.length });
  const chunks=[]; const views=[]; const add=(typed) => { const bytes=pad(Buffer.from(typed.buffer,typed.byteOffset,typed.byteLength)); const index=views.length; views.push({buffer:0,byteOffset:chunks.reduce((n,c)=>n+c.length,0),byteLength:typed.byteLength}); chunks.push(bytes); return index; };
  const p=add(positions), n=add(normal), uv=add(uvs), ix=add(indices), morphViews=morphs.map(add); const baseBounds=bounds(body.positions);
  const accessors=[{bufferView:p,componentType:5126,count:body.positions.length,type:'VEC3',min:baseBounds.min,max:baseBounds.max},{bufferView:n,componentType:5126,count:body.positions.length,type:'VEC3'},{bufferView:uv,componentType:5126,count:body.positions.length,type:'VEC2'},{bufferView:ix,componentType:5125,count:indices.length,type:'SCALAR'},...morphViews.map(bufferView=>({bufferView,componentType:5126,count:body.positions.length,type:'VEC3'}))];
  const gltf={asset:{version:'2.0',generator:'phraseman-avatar-dna-cc0-v1'},scene:0,scenes:[{name:'human_v2_scene',nodes:[0]}],nodes:[{name:'human_v2',mesh:0}],meshes:[{name:'avatar_body_base',primitives:[{attributes:{POSITION:0,NORMAL:1,TEXCOORD_0:2},indices:3,material:0,targets:morphViews.map((_,i)=>({POSITION:4+i}))}],weights:Array(18).fill(0),extras:{targetNames:TARGET_ORDER}}],materials:[{name:'material_skin',pbrMetallicRoughness:{baseColorFactor:[0.72,0.42,0.28,1],metallicFactor:0,roughnessFactor:0.72}}],accessors,bufferViews:views,buffers:[{byteLength:chunks.reduce((n,c)=>n+c.length,0)}]};
  const json=pad(Buffer.from(JSON.stringify(gltf),'utf8'),0x20), bin=Buffer.concat(chunks), total=12+8+json.length+8+bin.length, header=Buffer.alloc(12); header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(total,8); const jsonHeader=Buffer.alloc(8);jsonHeader.writeUInt32LE(json.length,0);jsonHeader.writeUInt32LE(0x4e4f534a,4); const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(bin.length,0);binHeader.writeUInt32LE(0x004e4942,4);
  await mkdir(path.dirname(destination),{recursive:true}); await writeFile(destination,Buffer.concat([header,jsonHeader,json,binHeader,bin])); return destination;
}
export default buildHumanV2Cc0Glb;
if (process.argv[1] === fileURLToPath(import.meta.url)) { const at=process.argv.indexOf('--output'); if (at !== -1 && (!process.argv[at+1] || at+2 !== process.argv.length)) throw new Error('usage: --output <path>'); const output=at===-1?undefined:process.argv[at+1]; buildHumanV2Cc0Glb(output).then(file=>process.stdout.write(`${file}\n`)); }
