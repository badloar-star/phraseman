import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { Buffer } from "node:buffer";
const MAX_PACK = 8 * 1024 * 1024,
  CACHE_MAX = 96 * 1024 * 1024,
  PREFIX = "learning-v2/voice-audio/v1";
const sha = (v) => crypto.createHash("sha256").update(v).digest("hex");
const norm = (v) => String(v).normalize("NFC").trim().replace(/\s+/gu, " ");
const json = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const put = (f, b) => {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, b);
};
const local = (root, target, obj) =>
  path.join(root, ...obj.slice(`${PREFIX}/${target}/`.length).split("/"));
const range = (o) => {
  for (const r of [
    [1, 1],
    [2, 8],
    [9, 16],
    [17, 32],
    [33, 56],
  ])
    if (o >= r[0] && o <= r[1]) return r;
  const s = 57 + Math.floor((o - 57) / 56) * 56;
  return [s, s + 55];
};
function previous(root, target) {
  const packs = new Map(),
    clips = new Map();
  if (!root) return { packs, clips };
  const m = json(path.join(root, "current.json"));
  for (const d of m.lessons) {
    const c = json(local(root, target, d.objectPath));
    for (const p of c.packs) {
      const old = packs.get(p.sha256);
      if (old && JSON.stringify(old) !== JSON.stringify(p))
        throw Error("previous_pack_drift");
      packs.set(p.sha256, p);
      for (const x of p.clips) {
        const known = clips.get(x.sha256);
        if (known && known.pack.sha256 !== p.sha256)
          throw Error("previous_clip_drift");
        clips.set(x.sha256, { clip: x, pack: p });
      }
    }
  }
  return { packs, clips };
}
export function buildLearningV2ProgressiveAudio({
  sourceDir,
  outputDir,
  previousDir = null,
}) {
  const am = json(path.join(sourceDir, "audio-manifest.json")),
    sm = json(path.join(sourceDir, "source-map.json")),
    target = am.languageCode;
  if (!["en", "es"].includes(target) || !Array.isArray(sm))
    throw Error("source_invalid");
  const coords = [...new Set(sm.map((r) => String(r.session)))]
    .map((coordinate) => {
      const m = /^l(\d{2,3})\/s(\d{2,3})$/u.exec(coordinate);
      if (!m) throw Error("session_invalid");
      return { coordinate, lessonOrdinal: +m[1], sessionOrdinal: +m[2] };
    })
    .sort(
      (a, b) =>
        a.lessonOrdinal - b.lessonOrdinal ||
        a.sessionOrdinal - b.sessionOrdinal,
    );
  const ord = new Map(coords.map((r, i) => [r.coordinate, i + 1])),
    clips = new Map(),
    phrases = new Map();
  for (const r of sm) {
    const job = String(r.jobId),
      text = norm(r.text),
      o = ord.get(r.session),
      meta = am.completed?.[job],
      file = path.join(sourceDir, "audio", `${job}.mp3`);
    if (
      !/^[a-f0-9]{64}$/u.test(job) ||
      !text ||
      !o ||
      !meta ||
      !fs.existsSync(file)
    )
      throw Error("source_row_invalid");
    const bytes = fs.readFileSync(file),
      h = sha(bytes);
    if (
      bytes.length < 200 ||
      bytes.length > 512 * 1024 ||
      meta.bytes !== bytes.length ||
      meta.sha256 !== h
    )
      throw Error(`integrity:${job}`);
    const c = clips.get(h);
    if (c) c.earliest = Math.min(c.earliest, o);
    else
      clips.set(h, { sha256: h, bytes, byteSize: bytes.length, earliest: o });
    let s = phrases.get(r.session);
    if (!s) {
      s = new Map();
      phrases.set(r.session, s);
    }
    const prior = s.get(text);
    if (prior && prior !== h)
      throw Error(`text_collision:${r.session}:${text}`);
    s.set(text, h);
  }
  const prev = previous(previousDir, target),
    assign = new Map(),
    reuse = new Set(),
    fresh = [];
  for (const c of clips.values()) {
    const p = prev.clips.get(c.sha256);
    if (p) {
      assign.set(c.sha256, p);
      reuse.add(p.pack.sha256);
    } else fresh.push(c);
  }
  const packs = new Map([...reuse].map((h) => [h, prev.packs.get(h)])),
    groups = new Map();
  for (const c of fresh) {
    const [start, end] = range(c.earliest),
      k = `${start}:${end}`,
      g = groups.get(k) ?? { start, end, clips: [] };
    g.clips.push(c);
    groups.set(k, g);
  }
  let deltas = 0;
  for (const g of [...groups.values()].sort((a, b) => a.start - b.start)) {
    g.clips.sort(
      (a, b) => a.earliest - b.earliest || a.sha256.localeCompare(b.sha256),
    );
    let batch = [],
      size = 0,
      part = 1;
    const flush = () => {
      if (!batch.length) return;
      const bytes = Buffer.concat(batch.map((c) => c.bytes)),
        h = sha(bytes),
        kind = previousDir ? "delta" : "base",
        id = `${kind}-s${String(g.start).padStart(4, "0")}-s${String(g.end).padStart(4, "0")}-p${String(part).padStart(2, "0")}-${h.slice(0, 12)}`,
        objectPath = `${PREFIX}/${target}/packs/${id}-${h}.bin`;
      let offset = 0;
      const ix = batch.map((c) => {
          const x = { sha256: c.sha256, offset, byteSize: c.byteSize };
          offset += c.byteSize;
          return x;
        }),
        p = {
          packId: id,
          sha256: h,
          byteSize: bytes.length,
          objectPath,
          clips: ix,
        };
      put(local(outputDir, target, objectPath), bytes);
      packs.set(h, p);
      for (const c of batch)
        assign.set(c.sha256, {
          clip: ix.find((x) => x.sha256 === c.sha256),
          pack: p,
        });
      if (previousDir) deltas++;
      part++;
      batch = [];
      size = 0;
    };
    for (const c of g.clips) {
      if (batch.length && size + c.byteSize > MAX_PACK) flush();
      batch.push(c);
      size += c.byteSize;
    }
    flush();
  }
  for (const h of reuse) {
    const p = prev.packs.get(h),
      bytes = fs.readFileSync(local(previousDir, target, p.objectPath));
    if (bytes.length !== p.byteSize || sha(bytes) !== h)
      throw Error("previous_pack_integrity");
    put(local(outputDir, target, p.objectPath), bytes);
  }
  const sessions = coords.map((c, i) => ({
    ordinal: i + 1,
    lessonOrdinal: c.lessonOrdinal,
    sessionOrdinal: c.sessionOrdinal,
    phrases: [...(phrases.get(c.coordinate) ?? new Map()).entries()].map(
      ([textKey, clipSha256]) => ({ textKey, clipSha256 }),
    ),
  }));
  for (
    let chapterStart = 1;
    chapterStart <= sessions.length;
    chapterStart += 8
  ) {
    const protectedShas = new Set(
      sessions
        .filter(
          (session) =>
            session.ordinal >= chapterStart &&
            session.ordinal <= chapterStart + 15,
        )
        .flatMap((session) =>
          session.phrases.map((phrase) => phrase.clipSha256),
        ),
    );
    const protectedBytes = [...protectedShas].reduce(
      (sum, clipSha) => sum + clips.get(clipSha).byteSize,
      0,
    );
    if (protectedBytes > CACHE_MAX)
      throw Error(
        `protected_window_too_large:${chapterStart}:${protectedBytes}`,
      );
  }
  const releaseId = sha(
      JSON.stringify({
        target,
        voiceId: am.voiceId,
        modelId: am.modelId,
        outputFormat: am.outputFormat,
        packs: [...packs.values()].map((p) => ({
          sha256: p.sha256,
          byteSize: p.byteSize,
          objectPath: p.objectPath,
        })),
        sessions,
      }),
    ),
    lessonFiles = [],
    descriptors = [];
  for (const lessonOrdinal of [
    ...new Set(coords.map((c) => c.lessonOrdinal)),
  ]) {
    const ss = sessions
        .filter((s) => s.lessonOrdinal === lessonOrdinal)
        .map(({ lessonOrdinal: _drop, ...s }) => s),
      refs = new Set(
        ss.flatMap((s) =>
          s.phrases.map((x) => assign.get(x.clipSha256).pack.sha256),
        ),
      ),
      cat = {
        schemaVersion: "learning-v2-audio-lesson-catalog.v1",
        studyTarget: target,
        releaseId,
        lessonOrdinal,
        startOrdinal: ss[0].ordinal,
        endOrdinal: ss.at(-1).ordinal,
        packs: [...refs].map((h) => packs.get(h)),
        sessions: ss,
      },
      bytes = Buffer.from(JSON.stringify(cat)),
      h = sha(bytes),
      objectPath = `${PREFIX}/${target}/releases/${releaseId}/lessons/l${String(lessonOrdinal).padStart(3, "0")}-${h}.json`,
      file = local(outputDir, target, objectPath);
    put(file, bytes);
    lessonFiles.push(path.relative(outputDir, file));
    descriptors.push({
      lessonOrdinal,
      startOrdinal: cat.startOrdinal,
      endOrdinal: cat.endOrdinal,
      byteSize: bytes.length,
      sha256: h,
      objectPath,
    });
  }
  const manifest = {
    schemaVersion: "learning-v2-audio-release-manifest.v1",
    studyTarget: target,
    releaseId,
    availability: "generated_ready",
    totalSessionCount: coords.length,
    lessons: descriptors,
  };
  put(
    path.join(outputDir, "current.json"),
    Buffer.from(JSON.stringify(manifest)),
  );
  const objects = [...packs.values()].map((p) => ({
    objectPath: p.objectPath,
    localPath: path.relative(outputDir, local(outputDir, target, p.objectPath)),
    sha256: p.sha256,
    byteSize: p.byteSize,
    immutable: true,
  }));
  for (const d of descriptors)
    objects.push({
      objectPath: d.objectPath,
      localPath: path.relative(
        outputDir,
        local(outputDir, target, d.objectPath),
      ),
      sha256: d.sha256,
      byteSize: d.byteSize,
      immutable: true,
    });
  const current = fs.readFileSync(path.join(outputDir, "current.json"));
  objects.push({
    objectPath: `${PREFIX}/${target}/current.json`,
    localPath: "current.json",
    sha256: sha(current),
    byteSize: current.length,
    immutable: false,
  });
  put(
    path.join(outputDir, "publish-manifest.json"),
    Buffer.from(
      JSON.stringify({
        schemaVersion: "learning-v2-audio-publish-plan.v1",
        studyTarget: target,
        releaseId,
        objects,
      }),
    ),
  );
  return {
    studyTarget: target,
    releaseId,
    sessionCount: coords.length,
    uniqueClipCount: clips.size,
    packCount: packs.size,
    reusedPackCount: reuse.size,
    deltaPackCount: deltas,
    lessonFiles,
    totalPackBytes: [...packs.values()].reduce((n, p) => n + p.byteSize, 0),
  };
}
const args = (a) =>
  Object.fromEntries(
    Array.from({ length: Math.ceil(a.length / 2) }, (_, i) => [
      a[i * 2]?.replace(/^--/u, ""),
      a[i * 2 + 1],
    ]),
  );
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const a = args(process.argv.slice(2));
  if (!a.source || !a.out)
    throw Error("usage: --source dir --out dir [--previous dir]");
  console.log(
    JSON.stringify(
      buildLearningV2ProgressiveAudio({
        sourceDir: path.resolve(a.source),
        outputDir: path.resolve(a.out),
        previousDir: a.previous ? path.resolve(a.previous) : null,
      }),
      null,
      2,
    ),
  );
}
