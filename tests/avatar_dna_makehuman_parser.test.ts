import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(__dirname, '..');
const OBJ_MODULE = path.join(ROOT, 'scripts/avatar-dna/lib/makehuman_obj.mjs').replaceAll('\\', '/');
const TARGET_MODULE = path.join(ROOT, 'scripts/avatar-dna/lib/makehuman_target.mjs').replaceAll('\\', '/');

function invoke(kind: 'obj' | 'target' | 'apply', payload: unknown) {
  const code = `
    import { parseMakeHumanObj } from ${JSON.stringify(`file:///${OBJ_MODULE}`)};
    import { parseMakeHumanTarget, applySignedTargetPair } from ${JSON.stringify(`file:///${TARGET_MODULE}`)};
    const payload = JSON.parse(process.env.PAYLOAD);
    const output = payload.kind === 'obj'
      ? parseMakeHumanObj(payload.text)
      : payload.kind === 'target'
        ? [...parseMakeHumanTarget(payload.text, payload.vertexCount).entries()]
        : applySignedTargetPair(payload.basePositions, payload.sourceVertexIndex, new Map(payload.decrementTarget), new Map(payload.incrementTarget), payload.weight);
    const result = payload.kind === 'apply' ? { output, basePositions: payload.basePositions } : output;
    process.stdout.write(JSON.stringify(result));
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', code], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, PAYLOAD: JSON.stringify({ kind, ...payload as object }) },
  });
  if (result.status !== 0) throw new Error(result.stderr);
  return JSON.parse(result.stdout);
}

function expectFailure(kind: 'obj' | 'target', payload: unknown, line: number) {
  expect(() => invoke(kind, payload)).toThrow(new RegExp(`line ${line}`));
}

test('parses body faces with UV seams, stable fan winding, negative indices, and helper group membership', () => {
  const mesh = invoke('obj', { text: `
# a comment
v 0 0 0
v 1 0 0
v 1 1 0
v 0 1 0
vt 0 0
vt 1 0
vt 1 1
vt 0 1
g joint-l-eye joint-head
f 1 2 3
g body joint-r-eye
f 1/1 2/2 3/3 4/4
f -4/-4 -3/-3 -2/-2
g body
f 1 3/3 4
` });

  expect(mesh.positions).toEqual([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0], [0, 1, 0]]);
  expect(mesh.uvs).toEqual([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0], [0, 0]]);
  expect(mesh.sourceVertexIndex).toEqual([0, 1, 2, 3, 0, 3]);
  expect(mesh.triangles).toEqual([[0, 1, 2], [0, 2, 3], [0, 1, 2], [4, 2, 5]]);
  expect(mesh.groups['joint-l-eye'].sourceVertexIndices).toEqual([0, 1, 2]);
  expect(mesh.groups['joint-r-eye'].sourceVertexIndices).toEqual([0, 1, 2, 3]);
  expect(mesh.groups['joint-head'].sourcePositions).toEqual([[0, 0, 0], [1, 0, 0], [1, 1, 0]]);
  expect(mesh.groups.body.sourceVertexIndices).toEqual([0, 1, 2, 3]);
});

test('rejects malformed required OBJ records with contextual line numbers', () => {
  expectFailure('obj', { text: 'v 0 0 nope' }, 1);
  expectFailure('obj', { text: 'v 0 0 0\nvt 0 nope' }, 2);
  expect(() => invoke('obj', { text: 'v 0 0 0\ng body\nf 0 1 1' })).toThrow('MakeHuman OBJ line 3: position index must not be zero');
  expect(() => invoke('obj', { text: 'v 0 0 0\ng body\nf 2 1 1' })).toThrow('MakeHuman OBJ line 3: position index is out of range');
  expect(() => invoke('obj', { text: 'v 0 0 0\ng body\nf 1// 1 1' })).toThrow('MakeHuman OBJ line 3: face corner is malformed');
  expectFailure('obj', { text: 'v 0 0 0\ng body\nf 1/1/1' }, 3);
  expectFailure('obj', { text: 'v 0 0 0\ng body\nf 1 1' }, 3);
});

test('uses strict decimal grammar and rejects unknown OBJ records', () => {
  expect(invoke('obj', { text: 'v -1 +1.0 .5\nv 0 1. 1e-3\nvt .5 -1e-3\ng body\nf 1/1 2/1 1/1\ns off' }).positions).toHaveLength(2);
  expect(() => invoke('obj', { text: 'v 0x10 0 0' })).toThrow('MakeHuman OBJ line 1: v contains a malformed number');
  expect(() => invoke('obj', { text: 'v 0 0 0\nvt 0b1 0' })).toThrow('MakeHuman OBJ line 2: vt contains a malformed number');
  expect(() => invoke('obj', { text: 'v 1e 0 0' })).toThrow('MakeHuman OBJ line 1: v contains a malformed number');
  expect(() => invoke('obj', { text: 'ff 1 2 3' })).toThrow('MakeHuman OBJ line 1: unsupported record ff');
  expect(() => invoke('obj', { text: 's nonsense extra' })).toThrow('MakeHuman OBJ line 1: s must be exactly "off" or a nonnegative integer');
});

test('parses MakeHuman sparse target offsets and rejects invalid target records', () => {
  expect(invoke('target', { text: '# comment\n\n2 1 3 2\n', vertexCount: 4 })).toEqual([[2, [1, -2, 3]]]);
  expectFailure('target', { text: '2 1 3 2\n2 0 0 0', vertexCount: 4 }, 2);
  expectFailure('target', { text: '4 1 3 2', vertexCount: 4 }, 1);
  expectFailure('target', { text: '-1 1 3 2', vertexCount: 4 }, 1);
  expectFailure('target', { text: '1 1 NaN 2', vertexCount: 4 }, 1);
  expectFailure('target', { text: '1 1 3', vertexCount: 4 }, 1);
  expectFailure('target', { text: '1 1 3 2 extra', vertexCount: 4 }, 1);
  expect(() => invoke('target', { text: '0 0x10 0 0', vertexCount: 4 })).toThrow('MakeHuman target line 1: offset contains a malformed number');
  expect(() => invoke('target', { text: '0 1e 0 0', vertexCount: 4 })).toThrow('MakeHuman target line 1: offset contains a malformed number');
  expect(() => invoke('target', { text: '', vertexCount: 0 })).toThrow(/vertexCount/);
});

test('applies signed target pairs literally without mutation across UV seam duplicates', () => {
  const basePositions = [[0, 0, 0], [1, 1, 1], [2, 2, 2]];
  const payload = {
    basePositions,
    sourceVertexIndex: [0, 1, 0],
    decrementTarget: [[0, [1, 2, 3]]],
    incrementTarget: [[0, [4, 5, 6]]],
  };
  const zero = invoke('apply', { ...payload, weight: 0 });
  expect(zero.output).toEqual(basePositions);
  expect(zero.basePositions).toEqual(basePositions);
  expect(basePositions).toEqual([[0, 0, 0], [1, 1, 1], [2, 2, 2]]);
  const negative = invoke('apply', { ...payload, weight: -0.5 });
  expect(negative.output).toEqual([[0.5, 1, 1.5], [1, 1, 1], [2.5, 3, 3.5]]);
  expect(negative.basePositions).toEqual(basePositions);
  const positive = invoke('apply', { ...payload, weight: 1.25 });
  expect(positive.output).toEqual([[5, 6.25, 7.5], [1, 1, 1], [7, 8.25, 9.5]]);
  expect(positive.basePositions).toEqual(basePositions);
});

test('smoke parses the pinned MakeHuman base and target packet structurally', () => {
  const basePath = path.join(ROOT, 'tools/avatar-dna/vendor/makehuman-v1.3.0/makehuman/data/3dobjs/base.obj');
  const targetPath = path.join(ROOT, 'tools/avatar-dna/vendor/makehuman-v1.3.0/head/head-scale-horiz-decr.target');
  const mesh = invoke('obj', { text: fs.readFileSync(basePath, 'utf8') });
  expect(mesh.positions.length).toBeGreaterThan(0);
  expect(mesh.positions.length).toBe(mesh.uvs.length);
  expect(mesh.positions.length).toBe(mesh.sourceVertexIndex.length);
  expect(mesh.triangles.length).toBeGreaterThan(0);
  for (const group of ['body', 'joint-l-eye', 'joint-r-eye', 'joint-head']) expect(mesh.groups[group].sourceVertexIndices.length).toBeGreaterThan(0);
  for (const triangle of mesh.triangles) for (const index of triangle) expect(index).toBeGreaterThanOrEqual(0), expect(index).toBeLessThan(mesh.positions.length);
  const target = invoke('target', { text: fs.readFileSync(targetPath, 'utf8'), vertexCount: mesh.sourcePositions.length });
  expect(target.length).toBeGreaterThan(0);
  for (const [index] of target) expect(index).toBeLessThan(mesh.sourcePositions.length);
}, 30_000);
