/** Deterministic, dependency-free ellipsoid meshes with single-vertex poles. */
const unit = (x, y, z) => { const length = Math.hypot(x, y, z) || 1; return [x / length, y / length, z / length]; };
const pushPoint = (positions, normals, center, radii, x, y, z) => { positions.push(center[0] + radii[0] * x, center[1] + radii[1] * y, center[2] + radii[2] * z); normals.push(...unit(x / radii[0], y / radii[1], z / radii[2])); };

export function makeLatLongEllipsoid({ center, radii, longitudeSegments = 16, latitudeSegments = 10 }) {
  if (!Array.isArray(center) || !Array.isArray(radii) || center.length !== 3 || radii.length !== 3 || longitudeSegments < 3 || latitudeSegments < 2 || radii.some(value => !(value > 0))) throw new Error('invalid_ellipsoid_parameters');
  const positions = [], normals = [], indices = []; pushPoint(positions, normals, center, radii, 0, 0, 1);
  for (let latitude = 1; latitude < latitudeSegments; latitude += 1) { const theta = Math.PI * latitude / latitudeSegments; for (let longitude = 0; longitude < longitudeSegments; longitude += 1) { const phi = 2 * Math.PI * longitude / longitudeSegments; pushPoint(positions, normals, center, radii, Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)); } }
  const first = 1, rings = latitudeSegments - 1, south = positions.length / 3; pushPoint(positions, normals, center, radii, 0, 0, -1);
  for (let longitude = 0; longitude < longitudeSegments; longitude += 1) indices.push(0, first + longitude, first + (longitude + 1) % longitudeSegments);
  for (let ring = 0; ring < rings - 1; ring += 1) for (let longitude = 0; longitude < longitudeSegments; longitude += 1) { const next = (longitude + 1) % longitudeSegments, a = first + ring * longitudeSegments + longitude, b = first + (ring + 1) * longitudeSegments + longitude; indices.push(a, b, first + ring * longitudeSegments + next, first + ring * longitudeSegments + next, b, first + (ring + 1) * longitudeSegments + next); }
  const finalRing = first + (rings - 1) * longitudeSegments; for (let longitude = 0; longitude < longitudeSegments; longitude += 1) indices.push(finalRing + longitude, south, finalRing + (longitude + 1) % longitudeSegments);
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint32Array(indices) };
}

/** A forward (+Z) ellipsoid cap: one centre vertex plus closed concentric rings. */
export function makeIrisSurface({ center, radii, radialSegments = 5, angularSegments = 16, pupilRing = 2 }) {
  if (!Array.isArray(center) || !Array.isArray(radii) || center.length !== 3 || radii.length !== 3 || radialSegments < 2 || angularSegments < 3 || pupilRing < 1 || pupilRing >= radialSegments || radii.some(value => !(value > 0))) throw new Error('invalid_iris_partition');
  const positions = [], normals = [], annulus = [], pupil = []; pushPoint(positions, normals, center, radii, 0, 0, 1);
  for (let ring = 1; ring <= radialSegments; ring += 1) { const radius = ring / radialSegments; for (let angle = 0; angle < angularSegments; angle += 1) { const phi = 2 * Math.PI * angle / angularSegments, x = radius * Math.cos(phi), y = radius * Math.sin(phi), z = Math.sqrt(Math.max(0, 1 - x * x - y * y)); pushPoint(positions, normals, center, radii, x, y, z); } }
  const ringStart = ring => 1 + (ring - 1) * angularSegments;
  for (let ring = 0; ring < radialSegments; ring += 1) for (let angle = 0; angle < angularSegments; angle += 1) { const next = (angle + 1) % angularSegments, target = ring < pupilRing ? pupil : annulus; if (ring === 0) target.push(0, ringStart(1) + angle, ringStart(1) + next); else { const a = ringStart(ring) + angle, b = ringStart(ring + 1) + angle, c = ringStart(ring) + next, d = ringStart(ring + 1) + next; target.push(a, b, c, c, b, d); } }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), annulus: new Uint32Array(annulus), pupil: new Uint32Array(pupil), pupilRing, radialSegments, angularSegments };
}
