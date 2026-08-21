/** Deterministic Catmull-Rom hair clumps around a MakeHuman-derived ellipsoid. */
export const HAIR_LENGTH_SEGMENTS = 12;
export const HAIR_RADIAL_SEGMENTS = 7;

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = value => { const length = Math.hypot(...value); if (!(length > 1e-9)) throw new Error('hair frame has zero length'); return value.map(item => item / length); };
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, value) => [a[0] * value, a[1] * value, a[2] * value];
const catmullRom = (a, b, c, d, t) => { const t2 = t * t, t3 = t2 * t; return [0, 1, 2].map(axis => .5 * ((2 * b[axis]) + (-a[axis] + c[axis]) * t + (2 * a[axis] - 5 * b[axis] + 4 * c[axis] - d[axis]) * t2 + (-a[axis] + 3 * b[axis] - 3 * c[axis] + d[axis]) * t3)); };
const ellipsoidPoint = (proxy, azimuth, elevation, clearance) => [proxy.center[0] + proxy.radii[0] * Math.cos(elevation) * Math.cos(azimuth), proxy.center[1] + proxy.radii[1] * Math.sin(elevation), proxy.center[2] + proxy.radii[2] * Math.cos(elevation) * Math.sin(azimuth)].map((value, axis) => value + (value - proxy.center[axis]) / proxy.radii[axis] * clearance);
const outward = (proxy, point) => unit([(point[0] - proxy.center[0]) / (proxy.radii[0] ** 2), (point[1] - proxy.center[1]) / (proxy.radii[1] ** 2), (point[2] - proxy.center[2]) / (proxy.radii[2] ** 2)]);

export function makeHeadProxyFromBody(body) {
  const head = body.groups['joint-head']?.sourcePositions, crown = body.groups['joint-head-2']?.sourcePositions, neck = body.groups['joint-neck']?.sourcePositions;
  if (!head?.length || !crown?.length || !neck?.length) throw new Error('MakeHuman head anchors are unavailable');
  const center = [0, 1, 2].map(axis => (Math.min(...head.map(p => p[axis])) + Math.max(...head.map(p => p[axis]))) / 2);
  const top = Math.max(...crown.map(point => point[1])); const base = Math.min(...neck.map(point => point[1]));
  const candidates = body.positions.filter(point => point[1] >= base - .15 && point[1] <= top + .15 && Math.abs(point[0] - center[0]) < 2.8 && point[2] > -1.1);
  const min = [0, 1, 2].map(axis => Math.min(...candidates.map(point => point[axis]))), max = [0, 1, 2].map(axis => Math.max(...candidates.map(point => point[axis])));
  return { center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2], radii: [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2], sourceBounds: { min, max } };
}

export function makeTaperedClumpHair({ proxy, families, minimumScalpClearance, lengthSegments = HAIR_LENGTH_SEGMENTS, radialSegments = HAIR_RADIAL_SEGMENTS }) {
  if (lengthSegments !== HAIR_LENGTH_SEGMENTS || radialSegments !== HAIR_RADIAL_SEGMENTS || !(minimumScalpClearance >= .006)) throw new Error('invalid hair topology');
  const positions = [], normals = [], indices = [], rootPoints = [], tipPoints = [];
  let clump = 0;
  for (const family of families) for (let member = 0; member < family.count; member += 1, clump += 1) {
    const fraction = (member + .5) / family.count, azimuth = family.azimuth + (fraction - .5) * family.sweep;
    const root = ellipsoidPoint(proxy, azimuth, family.elevation, minimumScalpClearance + family.rootRadius);
    const radial = outward(proxy, root), side = unit(cross([0, 1, 0], radial).every(value => Math.abs(value) < 1e-6) ? [1, 0, 0] : cross([0, 1, 0], radial));
    const forward = unit(add(scale(radial, .55), add(scale(side, (fraction - .5) * family.sweep), [0, family.lift, .18])));
    const control = [root, add(root, scale(forward, .42 + family.lift * .24)), add(root, add(scale(forward, .84 + family.lift * .45), scale(side, family.sweep * .2))), add(root, add(scale(forward, 1.18 + family.lift * .6), [0, family.lift * .5, .12]))];
    const curve = Array.from({ length: lengthSegments }, (_, index) => catmullRom(control[0], control[1], control[2], control[3], index / (lengthSegments - 1)));
    const start = positions.length / 3; rootPoints.push(root);
    let normal = unit(cross(curve[1].map((value, axis) => value - curve[0][axis]), side));
    for (let ring = 0; ring < lengthSegments; ring += 1) {
      const tangent = unit(sub(curve[Math.min(lengthSegments - 1, ring + 1)], curve[Math.max(0, ring - 1)]));
      normal = unit(sub(normal, scale(tangent, dot(normal, tangent)))); const binormal = unit(cross(tangent, normal));
      // The final ring remains finite; a single additional centre vertex is the only tip.
      const radius = family.rootRadius * ((lengthSegments - ring) / lengthSegments) ** .72;
      for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
        const angle = Math.PI * 2 * radialIndex / radialSegments, direction = add(scale(normal, Math.cos(angle)), scale(binormal, Math.sin(angle)));
        positions.push(...add(curve[ring], scale(direction, radius))); normals.push(...direction);
      }
    }
    const tip = curve[lengthSegments - 1]; const tipIndex = positions.length / 3; positions.push(...tip); normals.push(...unit(sub(tip, proxy.center))); tipPoints.push(tip);
    for (let ring = 0; ring < lengthSegments - 1; ring += 1) for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) { const next = (radialIndex + 1) % radialSegments, a = start + ring * radialSegments + radialIndex, b = start + (ring + 1) * radialSegments + radialIndex, c = start + ring * radialSegments + next, d = start + (ring + 1) * radialSegments + next; indices.push(a, b, c, c, b, d); }
    const finalRing = start + (lengthSegments - 1) * radialSegments; for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) indices.push(finalRing + radialIndex, tipIndex, finalRing + (radialIndex + 1) % radialSegments);
  }
  // Orient every face to the transported outward normal; this also catches a reversed
  // frame without relying on a renderer's double-sided fallback.
  for (let index = 0; index < indices.length; index += 3) {
    const a = indices[index] * 3, b = indices[index + 1] * 3, c = indices[index + 2] * 3;
    const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2], vx = positions[c] - positions[a], vy = positions[c + 1] - positions[a + 1], vz = positions[c + 2] - positions[a + 2];
    const face = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx], expected = [normals[a] + normals[b] + normals[c], normals[a + 1] + normals[b + 1] + normals[c + 1], normals[a + 2] + normals[b + 2] + normals[c + 2]];
    if (dot(face, expected) < 0) [indices[index + 1], indices[index + 2]] = [indices[index + 2], indices[index + 1]];
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint32Array(indices), rootPoints, tipPoints, clumpCount: clump, lengthSegments, radialSegments };
}
