function fail(lineNumber, message) {
  throw new Error(`MakeHuman target${lineNumber === null ? '' : ` line ${lineNumber}`}: ${message}`);
}

function targetEntry(target, index) {
  if (target instanceof Map) return target.get(index);
  return target?.[index];
}

/** Parses MakeHuman's `index dx dz dy` sparse offset format into canonical XYZ. */
export function parseMakeHumanTarget(text, vertexCount) {
  if (typeof text !== 'string') throw new Error('MakeHuman target text must be a string');
  if (!Number.isInteger(vertexCount) || vertexCount <= 0) throw new Error('MakeHuman target vertexCount must be a positive integer');
  const offsets = new Map();
  for (const [offset, rawLine] of text.split(/\r?\n/).entries()) {
    const lineNumber = offset + 1;
    const line = rawLine.replace(/#.*/, '').trim();
    if (!line) continue;
    const tokens = line.split(/\s+/);
    if (tokens.length !== 4) fail(lineNumber, 'requires exactly index dx dz dy');
    if (!/^[+-]?\d+$/.test(tokens[0])) fail(lineNumber, 'index is malformed');
    const index = Number(tokens[0]);
    if (index < 0 || index >= vertexCount) fail(lineNumber, 'index is out of range');
    if (offsets.has(index)) fail(lineNumber, 'duplicate index');
    const [dx, dz, dy] = tokens.slice(1).map(Number);
    if (![dx, dz, dy].every(Number.isFinite)) fail(lineNumber, 'offset contains a non-finite number');
    offsets.set(index, [dx, -dy, dz]);
  }
  return offsets;
}

/** Returns a new expanded mesh after applying the appropriate signed sparse target. */
export function applySignedTargetPair(basePositions, sourceVertexIndex, decrementTarget, incrementTarget, weight) {
  if (!Array.isArray(basePositions) || !Array.isArray(sourceVertexIndex) || basePositions.length !== sourceVertexIndex.length) {
    throw new Error('MakeHuman target base positions and source indices must be aligned arrays');
  }
  if (!Number.isFinite(weight)) throw new Error('MakeHuman target weight must be finite');
  const target = weight < 0 ? decrementTarget : incrementTarget;
  const multiplier = Math.abs(weight);
  return basePositions.map((position, outputIndex) => {
    if (!Array.isArray(position) || position.length !== 3 || !position.every(Number.isFinite)) {
      throw new Error('MakeHuman target base position must contain three finite values');
    }
    const delta = targetEntry(target, sourceVertexIndex[outputIndex]);
    if (delta === undefined) return [...position];
    if (!Array.isArray(delta) || delta.length !== 3 || !delta.every(Number.isFinite)) {
      throw new Error('MakeHuman target offset must contain three finite values');
    }
    return position.map((value, coordinate) => value + delta[coordinate] * multiplier);
  });
}
