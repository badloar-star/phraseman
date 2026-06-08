const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PROJECT_NAME = "ЦЕПИ ЦЕПИ ЦЕПИ (1)";
const PROJECT_DIR = path.join(
  process.env.LOCALAPPDATA || "C:/Users/badlo/AppData/Local",
  "CapCut",
  "User Data",
  "Projects",
  "com.lveditor.draft",
  PROJECT_NAME
);
const BG_DIR = path.join(PROJECT_DIR, "Resources", "cepicepi_next_phrase_backgrounds");
const REPORT_DIR = path.join(process.cwd(), "exports", "chains", "cepicepi_next_chains_a1a2_20260605");
const REPORT_PATH = path.join(REPORT_DIR, "hard_background_rebuild_report.json");

function uuid() {
  return crypto.randomUUID().toUpperCase();
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value), "utf8");
}

function draftPaths() {
  const paths = [
    path.join(PROJECT_DIR, "draft_content.json"),
    path.join(PROJECT_DIR, "template-2.tmp"),
  ];
  const timelinesDir = path.join(PROJECT_DIR, "Timelines");
  if (fs.existsSync(timelinesDir)) {
    for (const entry of fs.readdirSync(timelinesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const p = path.join(timelinesDir, entry.name, "draft_content.json");
      if (fs.existsSync(p)) paths.push(p);
    }
  }
  return paths;
}

function sourceFiles() {
  const files = fs
    .readdirSync(BG_DIR)
    .filter((name) => /^\d{3}_(pexels|pixabay)_.*\.mp4$/i.test(name))
    .sort();
  if (files.length !== 100) {
    throw new Error(`Expected exactly 100 real phrase background mp4 files, found ${files.length}`);
  }
  return files.map((name) => ({
    name,
    absPath: path.join(BG_DIR, name).replace(/\\/g, "/"),
  }));
}

function baseVideoMaterial(content) {
  const videos = content.materials?.videos || [];
  return (
    videos.find((v) => v.type === "video" && v.path && String(v.path).endsWith(".mp4")) ||
    videos.find((v) => v.type === "video") ||
    {}
  );
}

function makeVideoMaterial(template, file, duration) {
  const material = JSON.parse(JSON.stringify(template));
  material.id = uuid();
  material.type = "video";
  material.duration = duration;
  material.path = file.absPath;
  material.media_path = file.absPath;
  material.material_name = file.name;
  material.name = "";
  material.local_id = "";
  material.local_material_id = uuid();
  material.origin_material_id = "";
  material.material_id = "";
  material.material_url = "";
  material.has_audio = false;
  material.width = 1920;
  material.height = 1080;
  material.crop_ratio = "free";
  material.crop_scale = 1;
  material.reverse_path = "";
  material.intensifies_path = "";
  material.reverse_intensifies_path = "";
  material.intensifies_audio_path = "";
  material.cartoon_path = "";
  material.aigc_type = "none";
  material.is_ai_generate_content = false;
  material.local_material_from = "local";
  return material;
}

function makeSegment(template, material, start, duration) {
  const segment = JSON.parse(JSON.stringify(template));
  segment.id = uuid();
  segment.material_id = material.id;
  segment.source_timerange = { start: 0, duration };
  segment.target_timerange = { start, duration };
  segment.render_timerange = { start, duration };
  segment.render_index = 0;
  segment.visible = true;
  segment.extra_material_refs = [];
  segment.keyframe_refs = [];
  segment.common_keyframes = [];
  segment.enable_adjust_mask = false;
  segment.enable_video_mask = false;
  segment.template_id = "";
  segment.template_scene = "default";
  segment.is_placeholder = false;
  segment.clip = segment.clip || {};
  segment.clip.alpha = 1;
  segment.clip.scale = { x: 1, y: 1 };
  segment.clip.transform = { x: 0, y: 0 };
  segment.clip.rotation = 0;
  segment.clip.flip = { vertical: false, horizontal: false };
  segment.uniform_scale = { on: true, value: 1 };
  segment.volume = 0;
  segment.last_nonzero_volume = 0;
  return segment;
}

function hideNonPhraseOverlays(content, starts) {
  let hiddenPresetSegments = 0;
  let hiddenLongTextOverlays = 0;
  const lessonStart = Math.min(...starts);
  const lessonDuration = Math.max(...starts) - lessonStart;
  const videosById = new Map((content.materials?.videos || []).map((v) => [v.id, v]));
  for (const track of content.tracks || []) {
    if (track.type === "video") {
      for (const segment of track.segments || []) {
        const tr = segment.target_timerange;
        if (!tr) continue;
        const video = videosById.get(segment.material_id);
        const name = `${video?.material_name || ""} ${video?.name || ""}`;
        const startsBeforeLesson = Number(tr.start || 0) < lessonStart;
        if ((name.includes("My presets") || name.includes("CHAINS OLD INTRO")) && startsBeforeLesson) {
          segment.visible = false;
          if (segment.clip) segment.clip.alpha = 0;
          hiddenPresetSegments += 1;
        }
      }
    }
    if (track.type === "text") {
      for (const segment of track.segments || []) {
        const tr = segment.target_timerange;
        if (!tr) continue;
        const startsAtLesson = Number(tr.start || 0) <= lessonStart;
        const coversHugeRange = Number(tr.duration || 0) > Math.min(1_000_000_000, lessonDuration / 3);
        if (startsAtLesson && coversHugeRange) {
          segment.visible = false;
          if (segment.clip) segment.clip.alpha = 0;
          hiddenLongTextOverlays += 1;
        }
      }
    }
  }
  return { hiddenPresetSegments, hiddenLongTextOverlays };
}

function rebuild(filePath, files) {
  const content = readJson(filePath);
  const tracks = content.tracks || [];
  const bgTrack = tracks.find((track) => {
    if (track.type !== "video" || !track.segments || track.segments.length < 100) return false;
    const videosById = new Map((content.materials?.videos || []).map((v) => [v.id, v]));
    const names = track.segments
      .slice(0, 20)
      .map((s) => videosById.get(s.material_id)?.material_name || "")
      .join(" ");
    return /pexels|pixabay|background|346527/i.test(names) || track.segments.length === 300;
  });
  if (!bgTrack) throw new Error(`Background track not found in ${filePath}`);
  if (bgTrack.segments.length !== 300) {
    throw new Error(`Expected 300 background slots in ${filePath}, got ${bgTrack.segments.length}`);
  }

  const oldIds = new Set(bgTrack.segments.map((s) => s.material_id));
  const slotTimes = bgTrack.segments.map((segment) => {
    const tr = segment.target_timerange;
    return { start: Number(tr.start), duration: Number(tr.duration) };
  });
  const segmentTemplate = bgTrack.segments[0];
  const materialTemplate = baseVideoMaterial(content);

  content.materials.videos = (content.materials.videos || []).filter((video) => !oldIds.has(video.id));

  bgTrack.segments = slotTimes.map((slot, index) => {
    const file = files[index % 100];
    const material = makeVideoMaterial(materialTemplate, file, slot.duration);
    material.material_name = `${String(index + 1).padStart(3, "0")}_${file.name}`;
    content.materials.videos.push(material);
    return makeSegment(segmentTemplate, material, slot.start, slot.duration);
  });

  const hidden = hideNonPhraseOverlays(content, slotTimes.map((slot) => slot.start));
  writeJson(filePath, content);
  return {
    filePath,
    removedOldMaterials: oldIds.size,
    insertedMaterials: bgTrack.segments.length,
    rebuiltSegments: bgTrack.segments.length,
    ...hidden,
  };
}

function verify() {
  const content = readJson(path.join(PROJECT_DIR, "draft_content.json"));
  const videosById = new Map((content.materials?.videos || []).map((v) => [v.id, v]));
  const bgTrack = (content.tracks || []).find((track) => {
    if (track.type !== "video" || !track.segments || track.segments.length !== 300) return false;
      return track.segments.every((segment) => {
        const video = videosById.get(segment.material_id);
        return /^\d{3}_\d{3}_(pexels|pixabay)_.*\.mp4$/i.test(video?.material_name || "");
      });
  });
  const bad = [];
  if (!bgTrack) {
    bad.push("background_track_not_found");
  } else {
    for (const [index, segment] of bgTrack.segments.entries()) {
      const video = videosById.get(segment.material_id);
      if (!video) bad.push(`missing_material_${index}`);
      const p = video?.path || video?.media_path || "";
      if (!p || !fs.existsSync(p)) bad.push(`missing_file_${index}_${video?.material_name}`);
      if (segment.visible !== true) bad.push(`invisible_segment_${index}`);
      if (segment.clip?.alpha !== 1) bad.push(`non_opaque_segment_${index}`);
      if ((segment.common_keyframes || []).some((kf) => kf.property_type === "KFTypeAlpha")) {
        bad.push(`alpha_keyframe_${index}`);
      }
    }
  }
  return {
    status: bad.length ? "failed" : "ready",
    errors: bad.slice(0, 50),
    backgroundTrackSegments: bgTrack?.segments.length || 0,
    sample: bgTrack
      ? bgTrack.segments.slice(0, 10).map((segment) => {
          const video = videosById.get(segment.material_id);
          return {
            start: segment.target_timerange.start,
            duration: segment.target_timerange.duration,
            material: video.material_name,
            path: video.path,
            exists: fs.existsSync(video.path || ""),
            alpha: segment.clip.alpha,
          };
        })
      : [],
  };
}

const files = sourceFiles();
const paths = draftPaths();
const rootPath = path.join(PROJECT_DIR, "draft_content.json");
const rootUpdate = rebuild(rootPath, files);
const rootBytes = fs.readFileSync(rootPath);
const updates = [rootUpdate];
for (const mirrorPath of paths.filter((p) => p !== rootPath)) {
  fs.writeFileSync(mirrorPath, rootBytes);
  updates.push({
    filePath: mirrorPath,
    copiedFrom: rootPath,
    insertedMaterials: rootUpdate.insertedMaterials,
    rebuiltSegments: rootUpdate.rebuiltSegments,
  });
}
const verification = verify();
fs.mkdirSync(REPORT_DIR, { recursive: true });
const report = { projectDir: PROJECT_DIR, updates, verification };
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));
if (verification.status !== "ready") process.exitCode = 1;
