import {
  AVATAR_3D_GLB_MORPH_IDS,
  AVATAR_3D_SIGNED_MORPH_IDS,
  type Avatar3DFacePresetId,
  type Avatar3DGlbMorphWeights,
  type Avatar3DP0DNA,
  type Avatar3DPresentationId,
  type Avatar3DRenderPlan,
  type Avatar3DSignedMorphId,
  type Avatar3DSignedMorphValues,
} from "./contracts";

const HEX_COLOR = /^#[0-9A-F]{6}$/i;
const PRESENTATION_IDS = ["masculine", "feminine"] as const;
const FACE_IDS = ["face.soft", "face.heart", "face.strong"] as const;
const HOOD_HIDDEN_ZONES = Object.freeze(["hair.front", "hair.top"] as const);
type Bounds = Readonly<
  Record<Avatar3DSignedMorphId, Readonly<{ min: number; max: number }>>
>;
type Pair = Readonly<{ decr: readonly string[]; incr: readonly string[] }>;
type Recipe = Readonly<{
  schemaVersion: 1;
  morphContractVersion: "signed-pairs-v1";
  parameterOrder: typeof AVATAR_3D_SIGNED_MORPH_IDS;
  targetOrder: typeof AVATAR_3D_GLB_MORPH_IDS;
  bounds: Bounds;
  base: Avatar3DSignedMorphValues;
  presentations: Readonly<
    Record<Avatar3DPresentationId, Avatar3DSignedMorphValues>
  >;
  faces: Readonly<Record<Avatar3DFacePresetId, Avatar3DSignedMorphValues>>;
  sourcePairs: Readonly<Record<Avatar3DSignedMorphId, Pair>>;
}>;
const EXPECTED_SOURCES: Readonly<Record<Avatar3DSignedMorphId, Pair>> =
  Object.freeze({
    head_width: {
      decr: ["head/head-scale-horiz-decr.target"],
      incr: ["head/head-scale-horiz-incr.target"],
    },
    jaw_width: {
      decr: ["chin/chin-width-decr.target"],
      incr: ["chin/chin-width-incr.target"],
    },
    eye_size: {
      decr: ["eyes/l-eye-scale-decr.target", "eyes/r-eye-scale-decr.target"],
      incr: ["eyes/l-eye-scale-incr.target", "eyes/r-eye-scale-incr.target"],
    },
    eye_spacing: {
      decr: ["eyes/l-eye-trans-in.target", "eyes/r-eye-trans-in.target"],
      incr: ["eyes/l-eye-trans-out.target", "eyes/r-eye-trans-out.target"],
    },
    nose_width: {
      decr: ["nose/nose-scale-horiz-decr.target"],
      incr: ["nose/nose-scale-horiz-incr.target"],
    },
    nose_projection: {
      decr: ["nose/nose-scale-depth-decr.target"],
      incr: ["nose/nose-scale-depth-incr.target"],
    },
    mouth_width: {
      decr: ["mouth/mouth-scale-horiz-decr.target"],
      incr: ["mouth/mouth-scale-horiz-incr.target"],
    },
    upper_lip_volume: {
      decr: ["mouth/mouth-upperlip-volume-decr.target"],
      incr: ["mouth/mouth-upperlip-volume-incr.target"],
    },
    lower_lip_volume: {
      decr: ["mouth/mouth-lowerlip-volume-decr.target"],
      incr: ["mouth/mouth-lowerlip-volume-incr.target"],
    },
  });
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length &&
  Object.keys(value).every((key, index) => key === keys[index]);
const exactStringArray = (value: unknown, expected: readonly string[]) =>
  Array.isArray(value) &&
  value.length === expected.length &&
  value.every(
    (entry, index) => typeof entry === "string" && entry === expected[index],
  );
const invalid = (reason = "root"): never => {
  throw new TypeError(`avatar_3d_style_invalid: ${reason}`);
};
const finite = (value: unknown, path: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) invalid(path);
  return value as number;
};
const dense = (value: unknown, path: string): Avatar3DSignedMorphValues => {
  if (!isRecord(value) || !exactKeys(value, AVATAR_3D_SIGNED_MORPH_IDS))
    invalid(path);
  const vector = value as Record<string, unknown>;
  return Object.freeze({
    head_width: finite(vector.head_width, path),
    jaw_width: finite(vector.jaw_width, path),
    eye_size: finite(vector.eye_size, path),
    eye_spacing: finite(vector.eye_spacing, path),
    nose_width: finite(vector.nose_width, path),
    nose_projection: finite(vector.nose_projection, path),
    mouth_width: finite(vector.mouth_width, path),
    upper_lip_volume: finite(vector.upper_lip_volume, path),
    lower_lip_volume: finite(vector.lower_lip_volume, path),
  });
};
const pair = (value: unknown, expected: Pair, path: string): Pair => {
  if (
    !isRecord(value) ||
    !exactKeys(value, ["decr", "incr"]) ||
    !exactStringArray(value.decr, expected.decr)
  )
    invalid(`${path}.decr`);
  if (!exactStringArray((value as Record<string, unknown>).incr, expected.incr))
    invalid(`${path}.incr`);
  return Object.freeze({
    decr: Object.freeze([...expected.decr]),
    incr: Object.freeze([...expected.incr]),
  });
};

export function validateAvatar3DStyleRecipe(value: unknown): Recipe {
  if (
    !isRecord(value) ||
    !exactKeys(value, [
      "schemaVersion",
      "morphContractVersion",
      "parameterOrder",
      "targetOrder",
      "bounds",
      "base",
      "presentations",
      "faces",
      "sourcePairs",
    ]) ||
    value.schemaVersion !== 1 ||
    value.morphContractVersion !== "signed-pairs-v1"
  )
    invalid("root");
  const root = value as Record<string, unknown>;
  const bounds = root.bounds as Record<string, unknown>;
  if (!exactStringArray(root.parameterOrder, AVATAR_3D_SIGNED_MORPH_IDS))
    invalid("parameterOrder");
  if (!exactStringArray(root.targetOrder, AVATAR_3D_GLB_MORPH_IDS))
    invalid("targetOrder");
  if (
    !isRecord(root.bounds) ||
    !exactKeys(root.bounds, AVATAR_3D_SIGNED_MORPH_IDS)
  )
    invalid("bounds");
  if (
    !isRecord(root.presentations) ||
    !exactKeys(root.presentations, PRESENTATION_IDS)
  )
    invalid("presentations");
  if (!isRecord(root.faces) || !exactKeys(root.faces, FACE_IDS))
    invalid("faces");
  if (
    !isRecord(root.sourcePairs) ||
    !exactKeys(root.sourcePairs, AVATAR_3D_SIGNED_MORPH_IDS)
  )
    invalid("sourcePairs");
  const bound = (id: Avatar3DSignedMorphId) => {
    const path = `bounds.${id}`;
    const candidate = bounds[id] as Record<string, unknown>;
    if (!isRecord(candidate) || !exactKeys(candidate, ["min", "max"]))
      invalid(path);
    const min = finite(candidate.min, path);
    const max = finite(candidate.max, path);
    if (min > 0 || max < 0 || min > max) invalid(path);
    return Object.freeze({ min, max });
  };
  const presentations = root.presentations as Record<string, unknown>;
  const faces = root.faces as Record<string, unknown>;
  const sourcePairs = root.sourcePairs as Record<string, unknown>;
  return Object.freeze({
    schemaVersion: 1,
    morphContractVersion: "signed-pairs-v1",
    parameterOrder: Object.freeze([
      ...AVATAR_3D_SIGNED_MORPH_IDS,
    ]) as typeof AVATAR_3D_SIGNED_MORPH_IDS,
    targetOrder: Object.freeze([
      ...AVATAR_3D_GLB_MORPH_IDS,
    ]) as typeof AVATAR_3D_GLB_MORPH_IDS,
    bounds: Object.freeze({
      head_width: bound("head_width"),
      jaw_width: bound("jaw_width"),
      eye_size: bound("eye_size"),
      eye_spacing: bound("eye_spacing"),
      nose_width: bound("nose_width"),
      nose_projection: bound("nose_projection"),
      mouth_width: bound("mouth_width"),
      upper_lip_volume: bound("upper_lip_volume"),
      lower_lip_volume: bound("lower_lip_volume"),
    }),
    base: dense(root.base, "base"),
    presentations: Object.freeze({
      masculine: dense(presentations.masculine, "presentations.masculine"),
      feminine: dense(presentations.feminine, "presentations.feminine"),
    }),
    faces: Object.freeze({
      "face.soft": dense(faces["face.soft"], "faces.face.soft"),
      "face.heart": dense(faces["face.heart"], "faces.face.heart"),
      "face.strong": dense(faces["face.strong"], "faces.face.strong"),
    }),
    sourcePairs: Object.freeze({
      head_width: pair(
        sourcePairs.head_width,
        EXPECTED_SOURCES.head_width,
        "sourcePairs.head_width",
      ),
      jaw_width: pair(
        sourcePairs.jaw_width,
        EXPECTED_SOURCES.jaw_width,
        "sourcePairs.jaw_width",
      ),
      eye_size: pair(
        sourcePairs.eye_size,
        EXPECTED_SOURCES.eye_size,
        "sourcePairs.eye_size",
      ),
      eye_spacing: pair(
        sourcePairs.eye_spacing,
        EXPECTED_SOURCES.eye_spacing,
        "sourcePairs.eye_spacing",
      ),
      nose_width: pair(
        sourcePairs.nose_width,
        EXPECTED_SOURCES.nose_width,
        "sourcePairs.nose_width",
      ),
      nose_projection: pair(
        sourcePairs.nose_projection,
        EXPECTED_SOURCES.nose_projection,
        "sourcePairs.nose_projection",
      ),
      mouth_width: pair(
        sourcePairs.mouth_width,
        EXPECTED_SOURCES.mouth_width,
        "sourcePairs.mouth_width",
      ),
      upper_lip_volume: pair(
        sourcePairs.upper_lip_volume,
        EXPECTED_SOURCES.upper_lip_volume,
        "sourcePairs.upper_lip_volume",
      ),
      lower_lip_volume: pair(
        sourcePairs.lower_lip_volume,
        EXPECTED_SOURCES.lower_lip_volume,
        "sourcePairs.lower_lip_volume",
      ),
    }),
  });
}
const styleRecipe = validateAvatar3DStyleRecipe(
  require("../../config/avatar-dna/human_v2_style.v1.json") as unknown,
);
const assertP0DNA = (dna: Avatar3DP0DNA): void => {
  if (
    !isRecord(dna) ||
    !FACE_IDS.includes(dna.facePresetId) ||
    !PRESENTATION_IDS.includes(dna.presentationId) ||
    !["hair.wave", "hair.crop"].includes(dna.hairId) ||
    dna.outfitId !== "outfit.terra" ||
    (dna.headwearId !== null && dna.headwearId !== "hood.assassin") ||
    !["portrait", "studio"].includes(dna.camera)
  )
    throw new TypeError("avatar_3d_id_invalid");
  if (
    ![dna.skinTone, dna.hairColor, dna.irisColor].every(
      (color) => typeof color === "string" && HEX_COLOR.test(color),
    )
  )
    throw new TypeError("avatar_3d_color_invalid");
  if (
    !isRecord(dna.userMorphOffsets) ||
    !exactKeys(dna.userMorphOffsets, AVATAR_3D_SIGNED_MORPH_IDS) ||
    AVATAR_3D_SIGNED_MORPH_IDS.some(
      (id) =>
        typeof dna.userMorphOffsets[id] !== "number" ||
        !Number.isFinite(dna.userMorphOffsets[id]),
    )
  )
    throw new TypeError("avatar_3d_user_morph_offsets_invalid");
};
const signed = (id: Avatar3DSignedMorphId, dna: Avatar3DP0DNA): number => {
  const b = styleRecipe.bounds[id];
  return Math.min(
    b.max,
    Math.max(
      b.min,
      styleRecipe.base[id] +
        styleRecipe.presentations[dna.presentationId][id] +
        styleRecipe.faces[dna.facePresetId][id] +
        dna.userMorphOffsets[id],
    ),
  );
};
const weightsFor = (dna: Avatar3DP0DNA): Avatar3DGlbMorphWeights => {
  const head_width = signed("head_width", dna),
    jaw_width = signed("jaw_width", dna),
    eye_size = signed("eye_size", dna),
    eye_spacing = signed("eye_spacing", dna),
    nose_width = signed("nose_width", dna),
    nose_projection = signed("nose_projection", dna),
    mouth_width = signed("mouth_width", dna),
    upper_lip_volume = signed("upper_lip_volume", dna),
    lower_lip_volume = signed("lower_lip_volume", dna);
  const decr = (x: number) => (x < 0 ? -x : 0);
  const incr = (x: number) => (x > 0 ? x : 0);
  return Object.freeze({
    head_width_decr: decr(head_width),
    head_width_incr: incr(head_width),
    jaw_width_decr: decr(jaw_width),
    jaw_width_incr: incr(jaw_width),
    eye_size_decr: decr(eye_size),
    eye_size_incr: incr(eye_size),
    eye_spacing_decr: decr(eye_spacing),
    eye_spacing_incr: incr(eye_spacing),
    nose_width_decr: decr(nose_width),
    nose_width_incr: incr(nose_width),
    nose_projection_decr: decr(nose_projection),
    nose_projection_incr: incr(nose_projection),
    mouth_width_decr: decr(mouth_width),
    mouth_width_incr: incr(mouth_width),
    upper_lip_volume_decr: decr(upper_lip_volume),
    upper_lip_volume_incr: incr(upper_lip_volume),
    lower_lip_volume_decr: decr(lower_lip_volume),
    lower_lip_volume_incr: incr(lower_lip_volume),
  });
};
export const resolveAvatar3DPlan = (dna: Avatar3DP0DNA): Avatar3DRenderPlan => {
  assertP0DNA(dna);
  const hood = dna.headwearId === "hood.assassin";
  const visibleMeshIds = [
    "body.base",
    hood ? `${dna.hairId}.back` : dna.hairId,
    dna.outfitId,
  ];
  if (hood) visibleMeshIds.push("hood.assassin");
  return Object.freeze({
    morphWeights: weightsFor(dna),
    visibleMeshIds: Object.freeze(visibleMeshIds),
    hiddenZones: hood ? HOOD_HIDDEN_ZONES : Object.freeze([]),
    materialParams: Object.freeze({
      skinTone: dna.skinTone,
      hairColor: dna.hairColor,
      irisColor: dna.irisColor,
    }),
    camera: dna.camera,
  });
};
