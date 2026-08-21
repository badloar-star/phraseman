/** Deterministic, dependency-free lat/long ellipsoid primitives for Avatar DNA. */
const unit = (x, y, z) => {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
};

export function makeLatLongEllipsoid({ center, radii, longitudeSegments = 16, latitudeSegments = 10 }) {
  if (!Array.isArray(center) || !Array.isArray(radii) || center.length !== 3 || radii.length !== 3 || longitudeSegments < 3 || latitudeSegments < 2) throw new Error('invalid_ellipsoid_parameters');
  const positions = [], normals = [], indices = [];
  for (let latitude = 0; latitude <= latitudeSegments; latitude += 1) {
    const theta = Math.PI * latitude / latitudeSegments;
    const sinTheta = Math.sin(theta), cosTheta = Math.cos(theta);
    for (let longitude = 0; longitude <= longitudeSegments; longitude += 1) {
      const phi = 2 * Math.PI * longitude / longitudeSegments;
      const x = sinTheta * Math.cos(phi), y = sinTheta * Math.sin(phi), z = cosTheta;
      positions.push(center[0] + radii[0] * x, center[1] + radii[1] * y, center[2] + radii[2] * z);
      normals.push(...unit(x / radii[0], y / radii[1], z / radii[2]));
    }
  }
  const row = longitudeSegments + 1;
  for (let latitude = 0; latitude < latitudeSegments; latitude += 1) for (let longitude = 0; longitude < longitudeSegments; longitude += 1) {
    const a = latitude * row + longitude, b = a + row;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint32Array(indices) };
}

/* A forward (+Z) curved iris surface, split by ring into annulus and pupil cap. */
export function makeIrisSurface({ center, radii, radialSegments = 5, angularSegments = 16, pupilRing = 2 }) {
  if (pupilRing < 1 || pupilRing >= radialSegments) throw new Error('invalid_iris_partition');
  const positions = [], normals = [], annulus = [], pupil = [];
  for (let ring = 0; ring <= radialSegments; ring += 1) {
    const radius = ring / radialSegments;
    for (let angle = 0; angle <= angularSegments; angle += 1) {
      const phi = 2 * Math.PI * angle / angularSegments;
      const x = radius * Math.cos(phi), y = radius * Math.sin(phi);
      const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
      positions.push(center[0] + radii[0] * x, center[1] + radii[1] * y, center[2] + radii[2] * z);
      normals.push(...unit(x / radii[0], y / radii[1], z / radii[2]));
    }
  }
  const row = angularSegments + 1;
  for (let ring = 0; ring < radialSegments; ring += 1) for (let angle = 0; angle < angularSegments; angle += 1) {
    const a = ring * row + angle, b = a + row, target = ring < pupilRing ? pupil : annulus;
    target.push(a, b, a + 1, a + 1, b, b + 1);
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), annulus: new Uint32Array(annulus), pupil: new Uint32Array(pupil), pupilRing, radialSegments, angularSegments };
}
