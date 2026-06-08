const fs = require("fs");
const path = require("path");

const draftsRoot = path.join(
  process.env.LOCALAPPDATA,
  "CapCut",
  "User Data",
  "Projects",
  "com.lveditor.draft"
);

const projectDir = fs
  .readdirSync(draftsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("ЦЕПИ ЦЕПИ ЦЕПИ"))
  .map((entry) => path.join(draftsRoot, entry.name))
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];

if (!projectDir) {
  throw new Error("ЦЕПИ project not found");
}

const bgDir = path.join(projectDir, "Resources", "cepicepi_next_phrase_backgrounds");
const bgFiles = new Map(
  fs
    .readdirSync(bgDir)
    .filter((name) => /^\d{3}_(pexels|pixabay)_.*\.mp4$/i.test(name))
    .map((name) => [name, path.join(bgDir, name).replace(/\\/g, "/")])
);

if (bgFiles.size !== 100 && bgFiles.size !== 300) {
  throw new Error(`Expected 100 unique phrase background mp4 files or 300 per-part files, found ${bgFiles.size}`);
}

function capcutJsonPaths() {
  const paths = [
    path.join(projectDir, "draft_content.json"),
    path.join(projectDir, "template-2.tmp"),
  ];
  const timelinesDir = path.join(projectDir, "Timelines");
  if (fs.existsSync(timelinesDir)) {
    for (const dirent of fs.readdirSync(timelinesDir, { withFileTypes: true })) {
      if (!dirent.isDirectory()) continue;
      const timelineDraft = path.join(timelinesDir, dirent.name, "draft_content.json");
      if (fs.existsSync(timelineDraft)) paths.push(timelineDraft);
    }
  }
  return paths;
}

function updateDraft(filePath) {
  const draft = JSON.parse(fs.readFileSync(filePath, "utf8"));
  let rebound = 0;
  let hiddenPresetSegments = 0;
  let opaqueBackgroundSegments = 0;
  let hiddenLongBlankTextOverlays = 0;

  const videos = draft.materials?.videos || [];
  const videosById = new Map(videos.map((video) => [video.id, video]));

  for (const video of videos) {
    const materialName = video.material_name || video.name || "";
    const fileName = path.basename(materialName);
    const realPath = bgFiles.get(fileName);
    if (!realPath) continue;

    video.type = "video";
    video.path = realPath;
    video.media_path = realPath;
    video.has_audio = false;
    video.width = 1920;
    video.height = 1080;
    video.local_material_from = "local";
    rebound += 1;
  }

  for (const track of draft.tracks || []) {
    if (track.type === "text") {
      for (const segment of track.segments || []) {
        const target = segment.target_timerange;
        if (!target) continue;
        const startsAtLesson = Number(target.start || 0) <= 31_483_333;
        const coversMostLesson = Number(target.duration || 0) > 1_000_000_000;
        if (startsAtLesson && coversMostLesson) {
          segment.visible = false;
          if (segment.clip) segment.clip.alpha = 0;
          hiddenLongBlankTextOverlays += 1;
        }
      }
      continue;
    }

    if (track.type !== "video") continue;
    for (const segment of track.segments || []) {
      const video = videosById.get(segment.material_id);
      const name = video?.material_name || video?.name || "";
      const target = segment.target_timerange;
      if (!target) continue;

      const startsBeforeLesson = Number(target.start || 0) < 31_483_333;
      const isPreset = name.includes("My presets") || name.includes("CHAINS OLD INTRO");
      const isPhraseBackground = /^\d{3}_(pexels|pixabay)_.*\.mp4$/i.test(name);

      if (isPhraseBackground) {
        segment.visible = true;
        if (segment.clip) segment.clip.alpha = 1;
        segment.common_keyframes = (segment.common_keyframes || []).filter(
          (keyframe) => keyframe.property_type !== "KFTypeAlpha"
        );
        opaqueBackgroundSegments += 1;
      }

      if (isPreset && startsBeforeLesson) {
        segment.visible = false;
        if (segment.clip) segment.clip.alpha = 0;
        hiddenPresetSegments += 1;
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(draft), "utf8");
  return { filePath, rebound, opaqueBackgroundSegments, hiddenPresetSegments, hiddenLongBlankTextOverlays };
}

const updated = capcutJsonPaths().map(updateDraft);

const qaDraft = JSON.parse(fs.readFileSync(path.join(projectDir, "draft_content.json"), "utf8"));
const pexels = (qaDraft.materials?.videos || []).filter((video) =>
  /^\d{3}_(pexels|pixabay)_.*\.mp4$/i.test(video.material_name || video.name || "")
);
function resolveDraftPath(mediaPath) {
  if (!mediaPath) return "";
  return mediaPath.replace(/^##_draftpath_placeholder_[^#]+_##/, projectDir.replace(/\\/g, "/"));
}
const emptyPath = pexels.filter((video) => !video.path && !video.media_path);
const missing = pexels.filter((video) => !fs.existsSync(video.path || resolveDraftPath(video.media_path) || ""));
const presetVisible = [];
const transparentBackgrounds = [];
const longBlankTextOverlays = [];
const videosById = new Map((qaDraft.materials?.videos || []).map((video) => [video.id, video]));
for (const [trackIndex, track] of (qaDraft.tracks || []).entries()) {
  if (track.type === "text") {
    for (const [segmentIndex, segment] of (track.segments || []).entries()) {
      const target = segment.target_timerange;
      if (!target) continue;
      if (
        Number(target.start || 0) <= 31_483_333 &&
        Number(target.duration || 0) > 1_000_000_000 &&
        segment.visible !== false &&
        segment.clip?.alpha !== 0
      ) {
        longBlankTextOverlays.push({ trackIndex, segmentIndex, start: target.start, duration: target.duration });
      }
    }
    continue;
  }
  if (track.type !== "video") continue;
  for (const [segmentIndex, segment] of (track.segments || []).entries()) {
    const target = segment.target_timerange;
    if (!target) continue;
    const video = videosById.get(segment.material_id);
    const name = video?.material_name || video?.name || "";
    if (/^\d{3}_(pexels|pixabay)_.*\.mp4$/i.test(name) && segment.clip?.alpha !== 1) {
      transparentBackgrounds.push({ trackIndex, segmentIndex, name, alpha: segment.clip?.alpha });
    }
    if (
      name.includes("My presets") &&
      Number(target.start || 0) < 31_483_333 &&
      segment.visible !== false &&
      segment.clip?.alpha !== 0
    ) {
      presetVisible.push({ trackIndex, segmentIndex, name, start: target.start, duration: target.duration });
    }
  }
}

const report = {
  status:
    emptyPath.length === 0 &&
    missing.length === 0 &&
    presetVisible.length === 0 &&
    transparentBackgrounds.length === 0 &&
    longBlankTextOverlays.length === 0
      ? "ready"
      : "failed",
  projectDir,
  updated,
  backgroundMaterials: pexels.length,
  emptyPathCount: emptyPath.length,
  missingCount: missing.length,
  presetVisibleCount: presetVisible.length,
  transparentBackgroundCount: transparentBackgrounds.length,
  longBlankTextOverlayCount: longBlankTextOverlays.length,
  sample: pexels.slice(0, 5).map((video) => ({
    material_name: video.material_name,
    path: video.path || resolveDraftPath(video.media_path),
    exists: fs.existsSync(video.path || resolveDraftPath(video.media_path) || ""),
  })),
  presetVisible,
  transparentBackgrounds: transparentBackgrounds.slice(0, 20),
  longBlankTextOverlays,
};

const outDir = path.join(process.cwd(), "exports", "chains", "cepicepi_next_chains_a1a2_20260605");
fs.mkdirSync(outDir, { recursive: true });
const reportPath = path.join(outDir, "real_background_rebind_report.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify(report, null, 2));

if (report.status !== "ready") {
  process.exitCode = 1;
}
