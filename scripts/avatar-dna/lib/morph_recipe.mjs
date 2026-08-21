import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseMakeHumanTarget } from './makehuman_target.mjs';

export const PARAMETER_ORDER = ['head_width', 'jaw_width', 'eye_size', 'eye_spacing', 'nose_width', 'nose_projection', 'mouth_width', 'upper_lip_volume', 'lower_lip_volume'];
export const TARGET_ORDER = PARAMETER_ORDER.flatMap(name => [`${name}_decr`, `${name}_incr`]);
const EXACT_PAIRS = {
  head_width: [['head/head-scale-horiz-decr.target'], ['head/head-scale-horiz-incr.target']],
  jaw_width: [['chin/chin-width-decr.target'], ['chin/chin-width-incr.target']],
  eye_size: [['eyes/l-eye-scale-decr.target', 'eyes/r-eye-scale-decr.target'], ['eyes/l-eye-scale-incr.target', 'eyes/r-eye-scale-incr.target']],
  eye_spacing: [['eyes/l-eye-trans-in.target', 'eyes/r-eye-trans-in.target'], ['eyes/l-eye-trans-out.target', 'eyes/r-eye-trans-out.target']],
  nose_width: [['nose/nose-scale-horiz-decr.target'], ['nose/nose-scale-horiz-incr.target']],
  nose_projection: [['nose/nose-scale-depth-decr.target'], ['nose/nose-scale-depth-incr.target']],
  mouth_width: [['mouth/mouth-scale-horiz-decr.target'], ['mouth/mouth-scale-horiz-incr.target']],
  upper_lip_volume: [['mouth/mouth-upperlip-volume-decr.target'], ['mouth/mouth-upperlip-volume-incr.target']],
  lower_lip_volume: [['mouth/mouth-lowerlip-volume-decr.target'], ['mouth/mouth-lowerlip-volume-incr.target']],
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export async function loadMorphRecipe(recipePath) {
  const recipe = JSON.parse(await readFile(recipePath, 'utf8'));
  if (recipe?.morphContractVersion !== 'signed-pairs-v1' || !same(recipe.parameterOrder, PARAMETER_ORDER) || !same(recipe.targetOrder, TARGET_ORDER)) throw new Error('human_v2 morph recipe ABI mismatch');
  for (const name of PARAMETER_ORDER) {
    const pair = recipe.sourcePairs?.[name];
    if (!pair || !same(pair.decr, EXACT_PAIRS[name][0]) || !same(pair.incr, EXACT_PAIRS[name][1])) throw new Error(`human_v2 morph recipe source pair mismatch: ${name}`);
  }
  return recipe;
}

export function mergeTargetMaps(maps) {
  const merged = new Map();
  for (const map of maps) for (const [index, delta] of map) {
    const previous = merged.get(index) || [0, 0, 0];
    merged.set(index, [previous[0] + delta[0], previous[1] + delta[1], previous[2] + delta[2]]);
  }
  return merged;
}

export function expandTargetMap(map, sourceVertexIndex) {
  const output = new Float32Array(sourceVertexIndex.length * 3);
  for (let index = 0; index < sourceVertexIndex.length; index += 1) {
    const delta = map.get(sourceVertexIndex[index]);
    if (delta) output.set(delta, index * 3);
  }
  return output;
}

export async function loadRelativeMorphDeltas({ recipePath, targetsRoot, sourceVertexIndex, sourceVertexCount }) {
  const recipe = await loadMorphRecipe(recipePath);
  const result = [];
  for (const parameter of PARAMETER_ORDER) for (const branch of ['decr', 'incr']) {
    const maps = await Promise.all(recipe.sourcePairs[parameter][branch].map(async relative => parseMakeHumanTarget(await readFile(path.join(targetsRoot, relative), 'utf8'), sourceVertexCount)));
    result.push(expandTargetMap(mergeTargetMaps(maps), sourceVertexIndex));
  }
  return result;
}
