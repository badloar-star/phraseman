import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

const root = path.resolve(__dirname, "..");
const audit = path.join(root, "scripts/avatar-dna/audit_human_v2_glb.mjs");
const build = path.join(root, "scripts/avatar-dna/build_human_v2_cc0_glb.mjs");
const fixture = path.join(root, "assets/avatar-dna/human_v2/human_v2_base.glb");
const runAudit = (file: string) => JSON.parse(spawnSync(process.execPath, [audit, file], { encoding: "utf8" }).stdout);
const rewriteJson = (source: Buffer, mutate: (json: any) => void) => {
  const jsonLength = source.readUInt32LE(12);
  const json = JSON.parse(source.subarray(20, 20 + jsonLength).toString("utf8").trim());
  mutate(json);
  const raw = Buffer.from(JSON.stringify(json));
  const padded = Buffer.concat([raw, Buffer.alloc((4 - raw.length % 4) % 4, 0x20)]);
  const rest = source.subarray(20 + jsonLength);
  const jsonHeader = Buffer.alloc(8); jsonHeader.writeUInt32LE(padded.length, 0); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const result = Buffer.concat([source.subarray(0, 12), jsonHeader, padded, rest]); result.writeUInt32LE(result.length, 8); return result;
};
const gltfLayout = (source: Buffer) => {
  const jsonLength = source.readUInt32LE(12); const json = JSON.parse(source.subarray(20, 20 + jsonLength).toString("utf8").trim());
  return { json, binOffset: 20 + jsonLength + 8 };
};

describe("human_v2 CC0 GLB", () => {
  it("rejects the old primitive fixture with its required diagnostic codes", () => {
    const result = runAudit(fixture);
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining(["missing_required_named_morphs", "primitive_fixture_detected"]));
  });

  it("builds the neutral MakeHuman body deterministically with the exact morph ABI", () => {
    const directory = mkdtempSync(path.join(root, ".codex-tmp", "avatar-dna", "test-"));
    try {
      const first = path.join(directory, "one.glb");
      const second = path.join(directory, "two.glb");
      execFileSync(process.execPath, [build, "--output", first], { cwd: root });
      execFileSync(process.execPath, [build, "--output", second], { cwd: root });
      const firstBytes = readFileSync(first);
      expect(createHash("sha256").update(firstBytes).digest("hex")).toBe(createHash("sha256").update(readFileSync(second)).digest("hex"));
      const result = runAudit(first);
      expect(result.ok).toBe(true);
      expect(result.summary).toMatchObject({ vertexCount: 14517, triangleCount: 26756, morphCount: 18 });
      expect(result.summary.targetNames).toEqual([
        "head_width_decr", "head_width_incr", "jaw_width_decr", "jaw_width_incr", "eye_size_decr", "eye_size_incr", "eye_spacing_decr", "eye_spacing_incr", "nose_width_decr", "nose_width_incr", "nose_projection_decr", "nose_projection_incr", "mouth_width_decr", "mouth_width_incr", "upper_lip_volume_decr", "upper_lip_volume_incr", "lower_lip_volume_decr", "lower_lip_volume_incr",
      ]);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

  it("rejects malformed headers and nonzero morph defaults from binary GLB data", () => {
    const directory = mkdtempSync(path.join(root, ".codex-tmp", "avatar-dna", "test-"));
    try {
      const original = path.join(directory, "original.glb"); execFileSync(process.execPath, [build, "--output", original], { cwd: root });
      const badHeader = Buffer.from(readFileSync(original)); badHeader.writeUInt32LE(0, 0); const headerFile = path.join(directory, "header.glb"); writeFileSync(headerFile, badHeader);
      expect(runAudit(headerFile).errors).toContain("invalid_glb_header");
      const defaultsFile = path.join(directory, "defaults.glb"); writeFileSync(defaultsFile, rewriteJson(readFileSync(original), json => { json.meshes[0].weights[0] = 1; }));
      expect(runAudit(defaultsFile).errors).toContain("invalid_default_weights");
      const oob = Buffer.from(readFileSync(original)); const layout = gltfLayout(oob); const indexAccessor = layout.json.accessors[layout.json.meshes[0].primitives[0].indices]; const indexView = layout.json.bufferViews[indexAccessor.bufferView]; oob.writeUInt32LE(999999, layout.binOffset + indexView.byteOffset + (indexAccessor.byteOffset || 0)); const oobFile = path.join(directory, "oob.glb"); writeFileSync(oobFile, oob);
      expect(runAudit(oobFile).errors).toContain("index_out_of_range");
      const nan = Buffer.from(readFileSync(original)); const positionAccessor = layout.json.accessors[layout.json.meshes[0].primitives[0].attributes.POSITION]; const positionView = layout.json.bufferViews[positionAccessor.bufferView]; nan.writeFloatLE(Number.NaN, layout.binOffset + positionView.byteOffset + (positionAccessor.byteOffset || 0)); const nanFile = path.join(directory, "nan.glb"); writeFileSync(nanFile, nan);
      expect(runAudit(nanFile).errors).toContain("nonfinite_accessor");
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

  it("rejects canonical GLB metadata tampering with stable codes", () => {
    const directory = mkdtempSync(path.join(root, ".codex-tmp", "avatar-dna", "test-"));
    try { const original=path.join(directory,"o.glb");execFileSync(process.execPath,[build,"--output",original],{cwd:root});const bytes=readFileSync(original);
      const cases: any[] = [["count", (j:any) => { j.accessors[j.meshes[0].primitives[0].attributes.POSITION].count = 3; }, "invalid_glb_structure"], ["material", (j:any) => { j.meshes[0].primitives[0].material = 999; }, "invalid_material"], ["buffer", (j:any) => { j.buffers[0].byteLength = 1; }, "invalid_bin_length"], ["short", (j:any) => { const a=j.accessors[j.meshes[0].primitives[0].targets[0].POSITION]; j.bufferViews[a.bufferView].byteLength=4; }, "invalid_accessor"], ["type", (j:any) => { j.accessors[j.meshes[0].primitives[0].targets[0].POSITION].componentType=5121; }, "invalid_morph_target"], ["names", (j:any) => { j.meshes[0].extras.targetNames.reverse(); }, "missing_required_named_morphs"], ["stride", (j:any) => { const a=j.accessors[j.meshes[0].primitives[0].attributes.POSITION]; j.bufferViews[a.bufferView].byteStride=1; }, "invalid_accessor"]];
      for(const [name,mutate,code] of cases){const file=path.join(directory,`${name}.glb`);writeFileSync(file,rewriteJson(bytes,mutate));expect(runAudit(file).errors).toContain(code)}
    } finally {rmSync(directory,{recursive:true,force:true})}
  });

  it("merges bilateral maps, preserves asymmetric branches, and duplicates seam deltas", () => {
    // Binary mutators live in the preceding auditor test; source-map behavior is independent.
    const recipeModule = path.join(root, "scripts/avatar-dna/lib/morph_recipe.mjs").replace(/\\/g, "/");
    const code = `import {mergeTargetMaps,expandTargetMap} from 'file:///${recipeModule}'; const decrement=expandTargetMap(mergeTargetMaps([new Map([[1,[1,2,3]]])]),[1,0,1]); const increment=expandTargetMap(mergeTargetMaps([new Map([[1,[4,5,6]]]),new Map([[1,[7,8,9]]])]),[1]); console.log(JSON.stringify({decrement:[...decrement],increment:[...increment]}));`;
    const result = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "--eval", code], { encoding: "utf8" }));
    expect(result.decrement).toEqual([1, 2, 3, 0, 0, 0, 1, 2, 3]);
    expect(result.increment).toEqual([11, 13, 15]);
    expect(result.decrement).not.toEqual(result.increment.map((value: number) => -value));
  });

  it("keeps the legacy builder as a delegate without primitive constructors", () => {
    const legacy = readFileSync(path.join(root, "scripts/avatar-dna/build_human_v2_base_glb.mjs"), "utf8");
    expect(legacy).toContain("buildHumanV2Cc0Glb");
    expect(legacy).not.toMatch(/SphereGeometry|CapsuleGeometry|CylinderGeometry|TorusGeometry/);
  });

  it("rejects outputs outside the explicit temporary build root", () => {
    const builderModule = build.replace(/\\/g, "/");
    const code = `import {validateOutputPath} from 'file:///${builderModule}'; for (const output of ['C:/fake/package.json','C:/fake/.codex-tmp/avatar-dna/../escape.glb','C:/fake/.codex-tmp/avatar-dna-ok/file.glb']) { try { validateOutputPath(output,'C:/fake/.codex-tmp/avatar-dna'); console.log('ok'); } catch { console.log('reject'); } }`;
    expect(execFileSync(process.execPath, ["--input-type=module", "--eval", code], { encoding: "utf8" }).trim().split(/\s+/)).toEqual(["reject", "reject", "reject"]);
  });
});
