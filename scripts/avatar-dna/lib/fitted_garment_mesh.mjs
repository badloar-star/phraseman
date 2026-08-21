/** Deterministic body-bound clothing; source topology is retained as explicit provenance. */
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
const unit = value => { const length = Math.hypot(...value); return length > 1e-9 ? value.map(item => item / length) : [0, 1, 0]; };
const bounds = values => ({ min: [0,1,2].map(axis => Math.min(...values.map(value => value[axis]))), max: [0,1,2].map(axis => Math.max(...values.map(value => value[axis]))) });
export const GARMENT_SURFACE_OFFSET = .032;
export function makeFittedTerraGarment({ positions, normals, triangles, sourceVertexIndex, offset = GARMENT_SURFACE_OFFSET }) {
  if (offset !== GARMENT_SURFACE_OFFSET) throw new Error('invalid garment offset');
  const selected = triangles.map((triangle, index) => ({ triangle, index })).filter(({ triangle }) => triangle.every(vertex => positions[vertex][1] >= -.55 && positions[vertex][1] <= 5.78 && Math.abs(positions[vertex][0]) <= 4.75 && positions[vertex][2] >= -.95));
  const vertexMap = new Map(), outPositions = [], outNormals = [], outIndices = [], sources = [];
  const translate = vertex => { if (vertexMap.has(vertex)) return vertexMap.get(vertex); const point = positions[vertex], normal = unit([normals[vertex * 3], normals[vertex * 3 + 1], normals[vertex * 3 + 2]]); const index = outPositions.length / 3; vertexMap.set(vertex, index); outPositions.push(point[0] + normal[0] * offset, point[1] + normal[1] * offset, point[2] + normal[2] * offset); outNormals.push(...normal); sources.push(sourceVertexIndex[vertex]); return index; };
  for (const { triangle } of selected) outIndices.push(...triangle.map(translate));
  const provenance = Buffer.from(selected.map(({ index }) => index).join(','));
  return { positions: new Float32Array(outPositions), normals: new Float32Array(outNormals), indices: new Uint32Array(outIndices), sourceTriangleCount: selected.length, sourceTriangleHash: createHash('sha256').update(provenance).digest('hex'), sourceVertexIndices: sources, torsoBounds: bounds(outPositions.reduce((all, _, index) => index % 3 ? all : [...all, outPositions.slice(index, index + 3)], [])), surfaceOffset: offset };
}
export function makeAssassinHood({ proxy, neckAnchor }) {
  const ringSegments = 16, radialSegments = 8, positions = [], normals = [], indices = [];
  const anchor = [neckAnchor[0], neckAnchor[1] + .15, neckAnchor[2] - .12];
  for (let ring = 0; ring < radialSegments; ring += 1) { const t = ring / (radialSegments - 1), y = anchor[1] + t * (proxy.center[1] + proxy.radii[1] * .42 - anchor[1]), rx = .72 + t * (proxy.radii[0] + .34), rz = .50 + t * (proxy.radii[2] + .28); for (let segment = 0; segment < ringSegments; segment += 1) { const angle = Math.PI * 2 * segment / ringSegments, x = anchor[0] + rx * Math.cos(angle), z = anchor[2] + rz * Math.sin(angle) - .24 * Math.max(0, Math.sin(angle)); positions.push(x, y, z); normals.push(...unit([Math.cos(angle), .25, Math.sin(angle)])); } }
  for (let ring = 0; ring < radialSegments - 1; ring += 1) for (let segment = 0; segment < ringSegments; segment += 1) { const next = (segment + 1) % ringSegments, a = ring * ringSegments + segment, b = (ring + 1) * ringSegments + segment, c = ring * ringSegments + next, d = (ring + 1) * ringSegments + next; indices.push(a, c, b, c, d, b); }
  for (let index = 0; index < indices.length; index += 3) { const a=indices[index]*3,b=indices[index+1]*3,c=indices[index+2]*3, ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],uz=positions[b+2]-positions[a+2],vx=positions[c]-positions[a],vy=positions[c+1]-positions[a+1],vz=positions[c+2]-positions[a+2], face=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx], outward=[normals[a]+normals[b]+normals[c],normals[a+1]+normals[b+1]+normals[c+1],normals[a+2]+normals[b+2]+normals[c+2]]; if(face[0]*outward[0]+face[1]*outward[1]+face[2]*outward[2]<0)[indices[index+1],indices[index+2]]=[indices[index+2],indices[index+1]]; }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint32Array(indices), ringSegments, radialSegments, anchor };
}
