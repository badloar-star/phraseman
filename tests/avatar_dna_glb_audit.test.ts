import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

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
      const cases: any[] = [["count", (j:any) => { j.accessors[j.meshes[0].primitives[0].attributes.POSITION].count = 3; }, "invalid_base_geometry"], ["material", (j:any) => { j.meshes[0].primitives[0].material = 999; }, "invalid_material"], ["buffer", (j:any) => { j.buffers[0].byteLength = 1; }, "invalid_bin_length"], ["short", (j:any) => { const a=j.accessors[j.meshes[0].primitives[0].targets[0].POSITION]; j.bufferViews[a.bufferView].byteLength=4; }, "invalid_accessor"], ["type", (j:any) => { j.accessors[j.meshes[0].primitives[0].targets[0].POSITION].componentType=5121; }, "invalid_morph_target"], ["names", (j:any) => { j.meshes[0].extras.targetNames.reverse(); }, "missing_required_named_morphs"], ["stride", (j:any) => { const a=j.accessors[j.meshes[0].primitives[0].attributes.POSITION]; j.bufferViews[a.bufferView].byteStride=1; }, "invalid_accessor"]];
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

  it("uses the exported library audit and detects every canonical geometry byte stream", () => {
    const directory = mkdtempSync(path.join(root, ".codex-tmp", "avatar-dna", "test-"));
    try {
      const original = path.join(directory, "original.glb");
      execFileSync(process.execPath, [build, "--output", original], { cwd: root });
      const bytes = readFileSync(original);
      const layout = gltfLayout(bytes);
      const primitive = layout.json.meshes[0].primitives[0];
      const mutateBinary = (accessorIndex: number, mutate: (copy: Buffer, offset: number) => void, name: string) => {
        const copy = Buffer.from(bytes); const accessor = layout.json.accessors[accessorIndex]; const view = layout.json.bufferViews[accessor.bufferView];
        mutate(copy, layout.binOffset + (view.byteOffset || 0) + (accessor.byteOffset || 0));
        const file = path.join(directory, `${name}.glb`); writeFileSync(file, copy); return file;
      };
      const position = mutateBinary(primitive.attributes.POSITION, (copy, offset) => copy.writeFloatLE(copy.readFloatLE(offset + 24) + 0.25, offset + 24), "position");
      const normal = mutateBinary(primitive.attributes.NORMAL, (copy, offset) => copy.writeFloatLE(copy.readFloatLE(offset + 16) + 0.25, offset + 16), "normal");
      const uv = mutateBinary(primitive.attributes.TEXCOORD_0, (copy, offset) => copy.writeFloatLE(copy.readFloatLE(offset + 12) + 0.25, offset + 12), "uv");
      const winding = mutateBinary(primitive.indices, (copy, offset) => { const first = copy.readUInt32LE(offset); copy.writeUInt32LE(copy.readUInt32LE(offset + 4), offset); copy.writeUInt32LE(first, offset + 4); }, "winding");
      const code = `import {auditHumanV2Glb} from 'file:///${audit.replace(/\\/g, "/")}'; const file=process.argv[1]; auditHumanV2Glb(file).then(result=>console.log(JSON.stringify(result)));`;
      const direct = (file: string) => JSON.parse(execFileSync(process.execPath, ["--input-type=module", "--eval", code, file], { encoding: "utf8" }));
      expect(direct(position).errors).toContain("canonical_position_mismatch");
      expect(direct(normal).errors).toContain("canonical_normal_mismatch");
      expect(direct(uv).errors).toContain("canonical_uv_mismatch");
      expect(direct(winding).errors).toContain("canonical_topology_mismatch");
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

  it("rejects malformed scene graph, primitive mode, textures, nonfinite normals, and zeroed morphs", () => {
    const directory = mkdtempSync(path.join(root, ".codex-tmp", "avatar-dna", "test-"));
    try {
      const original = path.join(directory, "original.glb"); execFileSync(process.execPath, [build, "--output", original], { cwd: root });
      const bytes = readFileSync(original); const layout = gltfLayout(bytes); const primitive = layout.json.meshes[0].primitives[0];
      const jsonCases: [string, (json: any) => void, string][] = [
        ["scene", json => { json.scene = 2; }, "invalid_scene_reference"],
        ["node", json => { json.nodes[0].mesh = 3; }, "invalid_node_reference"],
        ["node-transform", json => { json.nodes[0].translation = [0, 0, 0]; }, "invalid_node_transform"],
        ["mode", json => { json.meshes[0].primitives[0].mode = 1; }, "invalid_primitive_mode"],
        ["texture", json => { json.textures = [{ source: 9 }]; }, "invalid_texture_reference"],
        ["color", json => { json.meshes[0].primitives[0].attributes.COLOR_0 = 999; }, "invalid_primitive_attributes"],
        ["position-min", json => { json.accessors[json.meshes[0].primitives[0].attributes.POSITION].min = [-999, -999, -999]; }, "invalid_position_bounds_metadata"],
        ["position-max", json => { json.accessors[json.meshes[0].primitives[0].attributes.POSITION].max = [999, 999, 999]; }, "invalid_position_bounds_metadata"],
        ["external-bin", json => { json.buffers[0].uri = "external.bin"; }, "invalid_bin_length"],
        ["dead-accessor", json => { json.accessors.push({ bufferView: 999, componentType: 5126, count: 1, type: "SCALAR" }); }, "invalid_collection_cardinality"],
        ["dead-view", json => { json.bufferViews.push({ buffer: 999, byteOffset: 0, byteLength: 4 }); }, "invalid_collection_cardinality"],
        ["animation", json => { json.animations = [{ channels: [], samplers: [] }]; }, "unexpected_json_schema"],
        ["skin", json => { json.skins = [{ joints: [] }]; }, "unexpected_json_schema"],
        ["camera", json => { json.cameras = [{ type: "perspective", perspective: { yfov: 1, znear: 0.1 } }]; }, "unexpected_json_schema"],
        ["extension", json => { json.extensionsRequired = ["KHR_materials_unlit"]; }, "unexpected_json_schema"],
        ["generator", json => { json.asset.generator = "tampered"; }, "unexpected_json_schema"],
        ["pbr", json => { json.materials[0].pbrMetallicRoughness.roughnessFactor = 0.1; }, "unexpected_json_schema"],
        ["mesh-extension", json => { json.meshes[0].extensions = { KHR_mesh_quantization: {} }; }, "unexpected_json_schema"],
        ["primitive-extension", json => { json.meshes[0].primitives[0].extensions = { KHR_materials_unlit: {} }; }, "unexpected_json_schema"],
        ["timestamp", json => { json.timestamp = "2026-08-21T00:00:00Z"; }, "unexpected_json_schema"],
      ];
      for (const [name, mutate, expected] of jsonCases) { const file = path.join(directory, `${name}.glb`); writeFileSync(file, rewriteJson(bytes, mutate)); expect(runAudit(file).errors).toContain(expected); }
      const normal = Buffer.from(bytes); const normalAccessor = layout.json.accessors[primitive.attributes.NORMAL]; const normalView = layout.json.bufferViews[normalAccessor.bufferView]; normal.writeFloatLE(Number.NaN, layout.binOffset + (normalView.byteOffset || 0) + (normalAccessor.byteOffset || 0)); const normalFile = path.join(directory, "nan-normal.glb"); writeFileSync(normalFile, normal); expect(runAudit(normalFile).errors).toContain("nonfinite_accessor");
      const zeroed = Buffer.from(bytes);
      for (const target of primitive.targets) { const accessor = layout.json.accessors[target.POSITION]; const view = layout.json.bufferViews[accessor.bufferView]; zeroed.fill(0, layout.binOffset + (view.byteOffset || 0) + (accessor.byteOffset || 0), layout.binOffset + (view.byteOffset || 0) + (accessor.byteOffset || 0) + accessor.count * 12); }
      const zeroedFile = path.join(directory, "zeroed-morphs.glb"); writeFileSync(zeroedFile, zeroed); expect(runAudit(zeroedFile).errors).toContain("morph_signature_mismatch");
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

  it("rejects generic unknown keys at every canonical JSON level", () => {
    const directory = mkdtempSync(path.join(root, ".codex-tmp", "avatar-dna", "test-"));
    try {
      const original = path.join(directory, "original.glb"); execFileSync(process.execPath, [build, "--output", original], { cwd: root }); const bytes = readFileSync(original);
      const cases: [string, (json: any) => void][] = [
        ["asset", json => { json.asset.extra = true; }], ["scene", json => { json.scenes[0].extra = true; }], ["node", json => { json.nodes[0].extra = true; }],
        ["mesh", json => { json.meshes[0].extra = true; }], ["primitive", json => { json.meshes[0].primitives[0].extra = true; }], ["target", json => { json.meshes[0].primitives[0].targets[0].extra = true; }],
        ["material", json => { json.materials[0].extra = true; }], ["pbr", json => { json.materials[0].pbrMetallicRoughness.extra = true; }], ["buffer", json => { json.buffers[0].extra = true; }],
        ["view", json => { json.bufferViews[0].extra = true; }], ["accessor", json => { json.accessors[0].extra = true; }], ["extras", json => { json.meshes[0].extras.extra = true; }],
      ];
      for (const [name, mutate] of cases) { const file = path.join(directory, `${name}.glb`); writeFileSync(file, rewriteJson(bytes, mutate)); expect(runAudit(file).errors).toContain("unexpected_json_schema"); }
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

  it("pins the source manifest and independent geometry oracle", () => {
    const builderModule = build.replace(/\\/g, "/");
    const code = `import {assertCanonicalStreams,assertManifestBytes} from 'file:///${builderModule}'; import {Buffer} from 'node:buffer'; for (const test of [() => assertManifestBytes(Buffer.from('tampered')), () => assertCanonicalStreams([Buffer.alloc(1)])]) { try { test(); console.log('accepted'); } catch { console.log('rejected'); } }`;
    expect(execFileSync(process.execPath, ["--input-type=module", "--eval", code], { encoding: "utf8" }).trim().split(/\s+/)).toEqual(["rejected", "rejected"]);
  });

  it("rejects an isolated junction escape before writing an output", () => {
    const builderModule = build.replace(/\\/g, "/");
    const code = `import {access, mkdtemp, mkdir, rm, symlink} from 'node:fs/promises'; import {tmpdir} from 'node:os'; import path from 'node:path'; import {validateWritableOutputPath} from 'file:///${builderModule}'; const base=await mkdtemp(path.join(tmpdir(),'avatar-dna-safe-')); const outside=await mkdtemp(path.join(tmpdir(),'avatar-dna-out-')); try { const root=path.join(base,'root'); await mkdir(root); await symlink(outside,path.join(root,'jump'),'junction'); try { await validateWritableOutputPath(path.join(root,'jump','new','nested','escape.glb'),root); console.log('accepted'); } catch { console.log('rejected'); } try { await access(path.join(outside,'new')); console.log('created'); } catch { console.log('clean'); } } finally { await rm(base,{recursive:true,force:true}); await rm(outside,{recursive:true,force:true}); }`;
    expect(execFileSync(process.execPath, ["--input-type=module", "--eval", code], { encoding: "utf8" }).trim().split(/\s+/)).toEqual(["rejected", "clean"]);
  });

  it("uses exclusive temporary creation when an adversarial temp link already exists", () => {
    const builderModule = build.replace(/\\/g, "/");
    const code = `import {access, mkdtemp, mkdir, rm, symlink} from 'node:fs/promises'; import {tmpdir} from 'node:os'; import path from 'node:path'; import {buildHumanV2Cc0Glb} from 'file:///${builderModule}'; const base=await mkdtemp(path.join(tmpdir(),'avatar-dna-exclusive-')); const outside=await mkdtemp(path.join(tmpdir(),'avatar-dna-out-')); try { const root=path.join(base,'root'); await mkdir(root); const temp='.out.glb.tmp-fixed'; await symlink(outside,path.join(root,temp),'junction'); try { await buildHumanV2Cc0Glb({output:path.join(root,'out.glb'),allowedOutputRoot:root,temporaryName:temp}); console.log('accepted'); } catch { console.log('rejected'); } try { await access(path.join(outside,'out.glb')); console.log('written'); } catch { console.log('clean'); } } finally { await rm(base,{recursive:true,force:true}); await rm(outside,{recursive:true,force:true}); }`;
    expect(execFileSync(process.execPath, ["--input-type=module", "--eval", code], { cwd: root, encoding: "utf8" }).trim().split(/\s+/)).toEqual(["rejected", "clean"]);
  });
});
