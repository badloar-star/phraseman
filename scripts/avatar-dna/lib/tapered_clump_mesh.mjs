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
const rodrigues = (vector, axis, sin, cos) => add(add(scale(vector, cos), scale(cross(axis, vector), sin)), scale(axis, dot(axis, vector) * (1 - cos)));
const orthogonal = tangent => unit(Math.abs(tangent[0]) < .8 ? cross(tangent, [1, 0, 0]) : cross(tangent, [0, 1, 0]));
/** Exact minimal rotation from tangentA to tangentB, including the antiparallel case. */
export function parallelTransportFrame(normal, tangentA, tangentB) {
  const a = unit(tangentA), b = unit(tangentB), axisRaw = cross(a, b), sine = Math.hypot(...axisRaw), cosine = Math.max(-1, Math.min(1, dot(a, b)));
  if (sine < 1e-9) return cosine >= 0 ? unit(sub(normal, scale(b, dot(normal, b)))) : unit(rodrigues(normal, orthogonal(a), 0, -1));
  const rotated = rodrigues(normal, scale(axisRaw, 1 / sine), sine, cosine);
  return unit(sub(rotated, scale(b, dot(rotated, b))));
}
const signedClearance = (proxy, point) => (Math.hypot((point[0] - proxy.center[0]) / proxy.radii[0], (point[1] - proxy.center[1]) / proxy.radii[1], (point[2] - proxy.center[2]) / proxy.radii[2]) - 1) * Math.min(...proxy.radii);
const TAU = Math.PI * 2, modulo = value => ((value % TAU) + TAU) % TAU;
const angularMargin = (coverage, angle) => { const width = modulo(coverage.azimuthEnd - coverage.azimuthStart), fromStart = modulo(angle - coverage.azimuthStart), toEnd = modulo(coverage.azimuthEnd - angle); return fromStart <= width + 1e-10 ? Math.min(fromStart, toEnd) : -Infinity; };
/** Ensures every circular root footprint lies within the configured ellipsoid cap, including wrap-around ranges. */
export function assertCoverageContainsRootFootprints(proxy, style, clearance = .006) {
  let worstAzimuthMargin = Infinity, worstElevationMargin = Infinity;
  for (const family of style.families) for (let member = 0; member < family.count; member += 1) {
    const fraction = (member + .5) / family.count, azimuth = family.azimuth + (fraction - .5) * family.sweep, elevation = family.elevation, radius = family.rootRadius + clearance;
    const azimuthMetric = Math.abs(Math.cos(elevation)) * Math.hypot(proxy.radii[0] * Math.sin(azimuth), proxy.radii[2] * Math.cos(azimuth));
    const elevationMetric = Math.hypot(proxy.radii[0] * Math.sin(elevation) * Math.cos(azimuth), proxy.radii[1] * Math.cos(elevation), proxy.radii[2] * Math.sin(elevation) * Math.sin(azimuth));
    const azimuthFootprint = Math.asin(Math.min(.95, radius / azimuthMetric)), elevationFootprint = Math.asin(Math.min(.95, radius / elevationMetric)), azimuthMargin = angularMargin(style.coverage, azimuth) - azimuthFootprint, elevationMargin = Math.min(elevation - style.coverage.elevationMin, style.coverage.elevationMax - elevation) - elevationFootprint;
    if (!(azimuthMargin >= 0 && elevationMargin >= 0)) throw new Error('hair root footprint escapes configured coverage');
    worstAzimuthMargin = Math.min(worstAzimuthMargin, azimuthMargin); worstElevationMargin = Math.min(worstElevationMargin, elevationMargin);
  }
  return { worstAzimuthMargin, worstElevationMargin };
}
function appendScalpCap({ positions, normals, indices, proxy, coverage, clearance }) {
  const start = positions.length / 3, rings = coverage.elevationSegments + 1, segments = coverage.azimuthSegments;
  for (let elevationIndex = 0; elevationIndex < rings; elevationIndex += 1) {
    const elevation = coverage.elevationMin + (coverage.elevationMax - coverage.elevationMin) * elevationIndex / (rings - 1);
    for (let azimuthIndex = 0; azimuthIndex < segments; azimuthIndex += 1) {
      const azimuth = coverage.azimuthStart + (coverage.azimuthEnd - coverage.azimuthStart) * azimuthIndex / (segments - 1);
      const contact = ellipsoidPoint(proxy, azimuth, elevation, 0), normal = outward(proxy, contact); positions.push(...add(contact, scale(normal, clearance))); normals.push(...normal);
    }
  }
  for (let ring = 0; ring < rings - 1; ring += 1) for (let segment = 0; segment < segments - 1; segment += 1) { const a = start + ring * segments + segment, b = a + segments, c = a + 1, d = b + 1; indices.push(a, b, c, c, b, d); }
  return { vertexCount: rings * segments, triangleCount: (rings - 1) * (segments - 1) * 2 };
}

export function makeHeadProxyFromBody(body) {
  const head = body.groups['joint-head']?.sourcePositions, crown = body.groups['joint-head-2']?.sourcePositions, neck = body.groups['joint-neck']?.sourcePositions;
  if (!head?.length || !crown?.length || !neck?.length) throw new Error('MakeHuman head anchors are unavailable');
  const center = [0, 1, 2].map(axis => (Math.min(...head.map(p => p[axis])) + Math.max(...head.map(p => p[axis]))) / 2);
  const top = Math.max(...crown.map(point => point[1])); const base = Math.min(...neck.map(point => point[1]));
  const candidates = body.positions.filter(point => point[1] >= base - .15 && point[1] <= top + .15 && Math.abs(point[0] - center[0]) < 2.8 && point[2] > -1.1);
  const min = [0, 1, 2].map(axis => Math.min(...candidates.map(point => point[axis]))), max = [0, 1, 2].map(axis => Math.max(...candidates.map(point => point[axis])));
  return { center: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2], radii: [(max[0] - min[0]) / 2, (max[1] - min[1]) / 2, (max[2] - min[2]) / 2], sourceBounds: { min, max } };
}

export function makeTaperedClumpHair({ proxy, families, coverage, minimumScalpClearance, lengthSegments = HAIR_LENGTH_SEGMENTS, radialSegments = HAIR_RADIAL_SEGMENTS }) {
  if (lengthSegments !== HAIR_LENGTH_SEGMENTS || radialSegments !== HAIR_RADIAL_SEGMENTS || !(minimumScalpClearance >= .006)) throw new Error('invalid hair topology');
  const positions = [], normals = [], indices = [], rootPoints = [], tipPoints = [];
  let clump = 0;
  for (const family of families) for (let member = 0; member < family.count; member += 1, clump += 1) {
    const fraction = (member + .5) / family.count, azimuth = family.azimuth + (fraction - .5) * family.sweep;
    const scalpContact = ellipsoidPoint(proxy, azimuth, family.elevation, 0), radial = outward(proxy, scalpContact), root = add(scalpContact, scale(radial, family.rootRadius + minimumScalpClearance + .002)), side = unit(cross([0, 1, 0], radial).every(value => Math.abs(value) < 1e-6) ? [1, 0, 0] : cross([0, 1, 0], radial));
    const forward = unit(add(scale(radial, .55), add(scale(side, (fraction - .5) * family.sweep), [0, family.lift, .18])));
    const control = [root, root, add(root, scale(forward, .84 + family.lift * .45)), add(root, add(scale(forward, 1.18 + family.lift * .6), [0, family.lift * .5, .12]))];
    const curve = Array.from({ length: lengthSegments }, (_, index) => catmullRom(control[0], control[1], control[2], control[3], index / (lengthSegments - 1)));
    const start = positions.length / 3; rootPoints.push(root);
    let tangent = unit(sub(curve[1], curve[0])), normal = unit(cross(tangent, side));
    for (let ring = 0; ring < lengthSegments; ring += 1) {
      const nextTangent = unit(sub(curve[Math.min(lengthSegments - 1, ring + 1)], curve[Math.max(0, ring - 1)]));
      if (ring) normal = parallelTransportFrame(normal, tangent, nextTangent); tangent = nextTangent; const binormal = unit(cross(tangent, normal));
      // The final ring remains finite; a single additional centre vertex is the only tip.
      const radius = family.rootRadius * ((lengthSegments - ring) / lengthSegments) ** .72;
      for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
        const angle = Math.PI * 2 * radialIndex / radialSegments, direction = add(scale(normal, Math.cos(angle)), scale(binormal, Math.sin(angle)));
        let vertex = add(curve[ring], scale(direction, radius)), vertexNormal = direction;
        // The attached root ring is projected back to the ellipsoid and then lifted by
        // a fixed clearance: physical attachment is tested from decoded GLB bytes.
        if (ring === 0) { const relative = sub(vertex, proxy.center), scaleToSurface = 1 / Math.hypot(relative[0] / proxy.radii[0], relative[1] / proxy.radii[1], relative[2] / proxy.radii[2]), contact = add(proxy.center, scale(relative, scaleToSurface)); vertexNormal = outward(proxy, contact); vertex = add(contact, scale(vertexNormal, minimumScalpClearance + .003)); }
        positions.push(...vertex); normals.push(...vertexNormal);
      }
    }
    const tip = curve[lengthSegments - 1]; const tipIndex = positions.length / 3; positions.push(...tip); normals.push(...unit(sub(tip, proxy.center))); tipPoints.push(tip);
    for (let ring = 0; ring < lengthSegments - 1; ring += 1) for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) { const next = (radialIndex + 1) % radialSegments, a = start + ring * radialSegments + radialIndex, b = start + (ring + 1) * radialSegments + radialIndex, c = start + ring * radialSegments + next, d = start + (ring + 1) * radialSegments + next; indices.push(a, b, c, c, b, d); }
    const finalRing = start + (lengthSegments - 1) * radialSegments; for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) indices.push(finalRing + radialIndex, tipIndex, finalRing + (radialIndex + 1) % radialSegments);
  }
  const cap = appendScalpCap({ positions, normals, indices, proxy, coverage, clearance: minimumScalpClearance + .002 });
  const rootRingClearance = { min: Infinity, max: -Infinity };
  for (let clumpIndex = 0; clumpIndex < clump; clumpIndex += 1) for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) { const offset = (clumpIndex * (lengthSegments * radialSegments + 1) + radialIndex) * 3; const value = signedClearance(proxy, positions.slice(offset, offset + 3)); rootRingClearance.min = Math.min(rootRingClearance.min, value); rootRingClearance.max = Math.max(rootRingClearance.max, value); }
  // Orient every face to the transported outward normal; this also catches a reversed
  // frame without relying on a renderer's double-sided fallback.
  for (let index = 0; index < indices.length; index += 3) {
    const a = indices[index] * 3, b = indices[index + 1] * 3, c = indices[index + 2] * 3;
    const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2], vx = positions[c] - positions[a], vy = positions[c + 1] - positions[a + 1], vz = positions[c + 2] - positions[a + 2];
    const face = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx], expected = [normals[a] + normals[b] + normals[c], normals[a + 1] + normals[b + 1] + normals[c + 1], normals[a + 2] + normals[b + 2] + normals[c + 2]];
    if (dot(face, expected) < 0) [indices[index + 1], indices[index + 2]] = [indices[index + 2], indices[index + 1]];
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint32Array(indices), rootPoints, tipPoints, clumpCount: clump, lengthSegments, radialSegments, cap, rootRingClearance };
}
