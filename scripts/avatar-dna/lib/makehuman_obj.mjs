function fail(lineNumber, message) {
  throw new Error(`MakeHuman OBJ line ${lineNumber}: ${message}`);
}

const DECIMAL_FLOAT = /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?$/;
const SIGNED_DECIMAL_INTEGER = /^[+-]?\d+$/;

function finiteNumbers(tokens, count, lineNumber, record) {
  if (tokens.length !== count) fail(lineNumber, `${record} requires exactly ${count} numeric values`);
  if (tokens.some(token => !DECIMAL_FLOAT.test(token))) fail(lineNumber, `${record} contains a malformed number`);
  const values = tokens.map(Number);
  if (values.some(value => !Number.isFinite(value))) fail(lineNumber, `${record} contains a non-finite number`);
  return values;
}

function resolveIndex(token, count, lineNumber, label) {
  if (!SIGNED_DECIMAL_INTEGER.test(token)) fail(lineNumber, `${label} index is malformed`);
  const raw = Number(token);
  if (raw === 0) fail(lineNumber, `${label} index must not be zero`);
  const resolved = raw > 0 ? raw - 1 : count + raw;
  if (resolved < 0 || resolved >= count) fail(lineNumber, `${label} index is out of range`);
  return resolved;
}

function parseCorner(token, positionCount, uvCount, lineNumber) {
  const parts = token.split('/');
  if (parts.length > 2 || !parts[0] || (parts.length === 2 && !parts[1])) {
    fail(lineNumber, 'face corner is malformed');
  }
  return {
    positionIndex: resolveIndex(parts[0], positionCount, lineNumber, 'position'),
    uvIndex: parts.length === 2 ? resolveIndex(parts[1], uvCount, lineNumber, 'UV') : null,
  };
}

/** Parses the position/UV subset used by MakeHuman base meshes. */
export function parseMakeHumanObj(text) {
  if (typeof text !== 'string') throw new Error('MakeHuman OBJ text must be a string');

  const sourcePositions = [];
  const sourceUvs = [];
  const groups = Object.create(null);
  const positions = [];
  const uvs = [];
  const sourceVertexIndex = [];
  const triangles = [];
  const expandedVertexBySourceAndUv = new Map();
  let activeGroups = [];

  const group = (name) => {
    if (!groups[name]) groups[name] = { sourceVertexIndices: [], sourcePositions: [] };
    return groups[name];
  };
  const recordGroupVertex = (name, sourceIndex) => {
    const entry = group(name);
    if (!entry.sourceVertexIndices.includes(sourceIndex)) {
      entry.sourceVertexIndices.push(sourceIndex);
      entry.sourcePositions.push(sourcePositions[sourceIndex]);
    }
  };
  const expandedIndex = (corner) => {
    const key = `${corner.positionIndex}/${corner.uvIndex === null ? 'missing' : corner.uvIndex}`;
    const existing = expandedVertexBySourceAndUv.get(key);
    if (existing !== undefined) return existing;
    const index = positions.length;
    expandedVertexBySourceAndUv.set(key, index);
    positions.push(sourcePositions[corner.positionIndex]);
    uvs.push(corner.uvIndex === null ? [0, 0] : sourceUvs[corner.uvIndex]);
    sourceVertexIndex.push(corner.positionIndex);
    return index;
  };

  for (const [offset, rawLine] of text.split(/\r?\n/).entries()) {
    const lineNumber = offset + 1;
    const line = rawLine.replace(/#.*/, '').trim();
    if (!line) continue;
    const tokens = line.split(/\s+/);
    const record = tokens[0];
    const values = tokens.slice(1);

    if (record === 'v') {
      sourcePositions.push(finiteNumbers(values, 3, lineNumber, 'v'));
      continue;
    }
    if (record === 'vt') {
      sourceUvs.push(finiteNumbers(values, 2, lineNumber, 'vt'));
      continue;
    }
    if (record === 'g') {
      if (values.length === 0) fail(lineNumber, 'g requires at least one name');
      activeGroups = [...new Set(values)];
      for (const name of activeGroups) group(name);
      continue;
    }
    if (record === 's') {
      if (values.length !== 1 || (values[0] !== 'off' && !/^\d+$/.test(values[0]))) {
        fail(lineNumber, 's must be exactly "off" or a nonnegative integer');
      }
      continue;
    }
    if (record !== 'f') fail(lineNumber, `unsupported record ${record}`);

    if (values.length < 3) fail(lineNumber, 'face requires at least three corners');
    const corners = values.map(value => parseCorner(value, sourcePositions.length, sourceUvs.length, lineNumber));
    for (const name of activeGroups) for (const corner of corners) recordGroupVertex(name, corner.positionIndex);
    if (!activeGroups.includes('body')) continue;
    const face = corners.map(expandedIndex);
    for (let index = 1; index < face.length - 1; index += 1) triangles.push([face[0], face[index], face[index + 1]]);
  }

  return { positions, uvs, triangles, sourceVertexIndex, groups, sourcePositions };
}
