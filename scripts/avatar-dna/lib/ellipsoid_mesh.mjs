/** Deterministic, dependency-free eye geometry. Camera faces +Z. */
export const ELLIPSOID_LONGITUDE_SEGMENTS = 16, ELLIPSOID_LATITUDE_SEGMENTS = 10, IRIS_RADIAL_SEGMENTS = 5, IRIS_ANGULAR_SEGMENTS = 16, IRIS_PUPIL_RING = 2;
const finiteVec3 = (value, label) => { if (!Array.isArray(value) || value.length !== 3 || value.some(item => typeof item !== 'number' || !Number.isFinite(item))) throw new Error(`invalid_${label}`); return value; };
const exactSegments = (value, expected, label) => { if (!Number.isSafeInteger(value) || value !== expected) throw new Error(`invalid_${label}`); return value; };
const unit = (x, y, z) => { const length = Math.hypot(x, y, z); if (!Number.isFinite(length) || length <= 0) throw new Error('invalid_normal'); return [x / length, y / length, z / length]; };
const pushPoint = (positions, normals, center, radii, x, y, z) => { positions.push(center[0] + radii[0] * x, center[1] + radii[1] * y, center[2] + radii[2] * z); normals.push(...unit(x / radii[0], y / radii[1], z / radii[2])); };

export function makeLatLongEllipsoid({ center, radii, longitudeSegments = 16, latitudeSegments = 10 }) {
  finiteVec3(center, 'center'); finiteVec3(radii, 'radii'); exactSegments(longitudeSegments, ELLIPSOID_LONGITUDE_SEGMENTS, 'longitude_segments'); exactSegments(latitudeSegments, ELLIPSOID_LATITUDE_SEGMENTS, 'latitude_segments'); if (radii.some(value => !(value > 0))) throw new Error('invalid_ellipsoid_parameters');
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
  finiteVec3(center, 'center'); finiteVec3(radii, 'radii'); exactSegments(radialSegments, IRIS_RADIAL_SEGMENTS, 'iris_radial_segments'); exactSegments(angularSegments, IRIS_ANGULAR_SEGMENTS, 'iris_angular_segments'); exactSegments(pupilRing, IRIS_PUPIL_RING, 'iris_pupil_ring'); if (radii.some(value => !(value > 0))) throw new Error('invalid_iris_partition');
  const positions = [], normals = [], annulus = [], pupil = [], apexOffset = 0.138, apex = [center[0], center[1], center[2] + apexOffset]; positions.push(...apex); normals.push(0, 0, 1);
  for (let ring = 1; ring <= radialSegments; ring += 1) { const radius = ring / radialSegments; for (let angle = 0; angle < angularSegments; angle += 1) { const phi = 2 * Math.PI * angle / angularSegments, x = radius * Math.cos(phi), y = radius * Math.sin(phi), z = apexOffset - radii[2] * (1 - Math.sqrt(Math.max(0, 1 - x * x - y * y))); positions.push(center[0] + radii[0] * x, center[1] + radii[1] * y, center[2] + z); normals.push(...unit(-x / radii[0], -y / radii[1], 1 / radii[2])); } }
  const ringStart = ring => 1 + (ring - 1) * angularSegments;
  for (let ring = 0; ring < radialSegments; ring += 1) for (let angle = 0; angle < angularSegments; angle += 1) { const next = (angle + 1) % angularSegments, target = ring < pupilRing ? pupil : annulus; if (ring === 0) target.push(0, ringStart(1) + angle, ringStart(1) + next); else { const a = ringStart(ring) + angle, b = ringStart(ring + 1) + angle, c = ringStart(ring) + next, d = ringStart(ring + 1) + next; target.push(a, b, c, c, b, d); } }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), annulus: new Uint32Array(annulus), pupil: new Uint32Array(pupil), pupilRing, radialSegments, angularSegments, apexOffset, rimOffset: apexOffset - radii[2] };
}

/** Opaque sclera with a front elliptical aperture; the iris owns the opening. */
export function makeScleraWithAperture({ center, radii, apertureRadii = [0.092, 0.092], apertureOffset = 0.126, angularSegments = ELLIPSOID_LONGITUDE_SEGMENTS }) {
  finiteVec3(center, 'center'); finiteVec3(radii, 'radii'); if (!Array.isArray(apertureRadii) || apertureRadii.length !== 2 || apertureRadii.some(value => typeof value !== 'number' || !Number.isFinite(value) || value <= 0) || typeof apertureOffset !== 'number' || !Number.isFinite(apertureOffset)) throw new Error('invalid_sclera_aperture'); exactSegments(angularSegments, ELLIPSOID_LONGITUDE_SEGMENTS, 'longitude_segments');
  const positions = [], normals = [], indices = [], aperture = [];
  for (let angle = 0; angle < angularSegments; angle += 1) { const phi = 2 * Math.PI * angle / angularSegments, x = apertureRadii[0] * Math.cos(phi), y = apertureRadii[1] * Math.sin(phi); positions.push(center[0] + x, center[1] + y, center[2] + apertureOffset); normals.push(...unit(x / radii[0], y / radii[1], 1)); aperture.push(positions.length / 3 - 1); }
  const equator = positions.length / 3; for (let angle = 0; angle < angularSegments; angle += 1) { const phi = 2 * Math.PI * angle / angularSegments; pushPoint(positions, normals, center, radii, Math.cos(phi), Math.sin(phi), 0); }
  const back = positions.length / 3; pushPoint(positions, normals, center, radii, 0, 0, -1);
  for (let angle = 0; angle < angularSegments; angle += 1) { const next = (angle + 1) % angularSegments; indices.push(aperture[angle], equator + angle, aperture[next], aperture[next], equator + angle, equator + next, equator + angle, back, equator + next); }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint32Array(indices), aperture, apertureRadii, apertureOffset };
}
