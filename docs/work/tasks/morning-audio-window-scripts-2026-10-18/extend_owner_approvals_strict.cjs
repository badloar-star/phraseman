// Одобрение владельца на звуковые цели перенесённых занятий — СТРОГО (координатор 18.10, прецедент 212b509b9, слово владельца
// 15.10 «звук есть и собирается, нет только квитанции — не блок»). Цель одобряется, только если звук, который реально сыграет
// приложение (выбор голоса как в app/learning_v2_factory_production_audio_v1.ts: назначенный голос задания → 4 голоса →
// первый записанный у всех реплик), лежит в наборе сборки и не числится тихим. Всё читается из снимка HEAD (--snap <папка>).
// Запуск: node extend_owner_approvals_strict.cjs --snap <папка с git archive HEAD> [--dry]
const fs = require("fs");
const path = require("path");
const args = process.argv.slice(2);
const SNAP = args[args.indexOf("--snap") + 1];
const DRY = args.includes("--dry");
const REPO = "C:/appsprojects/phraseman";
const FILE = path.join(REPO, "scripts/learning_v2_owner_approved_audio_evidence.v1.json");
const VOICES = ["ash", "onyx", "nova", "coral"];
const read = (rel) => fs.readFileSync(path.join(SNAP, rel), "utf8");

const silent = new Set(JSON.parse(read("app/learning_v2_factory_silent_audio_v1.json")).entries.map((e) => e.contentHash));
const bundle = new Set([...read("app/learning_v2_bootstrap_audio_assets_v1.generated.ts").matchAll(/contentHash: "([0-9a-f]{64})"/g)].map((m) => m[1]));
// таблица слышимых записей — как factoryAudioTables: манифест главнее, затем записи одного голоса; тихие выкинуты
const byCoord = new Map();
const knownHash = new Set();
for (const e of JSON.parse(read("assets/audio/learning-v2/factory-production-v1/manifest.json")).entries) {
  if (silent.has(e.contentHash)) continue;
  byCoord.set(`${e.transcript}\u0000${e.voiceId}`, e.contentHash);
  knownHash.add(e.contentHash);
}
const sv = read("app/learning_v2_factory_single_voice_v1.generated.ts");
for (const m of sv.matchAll(/transcript: ("(?:[^"\\]|\\.)*"), voiceId: "([a-z]+)" as const, contentHash: "([0-9a-f]{64})"/g)) {
  const [t, v, h] = [JSON.parse(m[1]), m[2], m[3]];
  if (silent.has(h)) continue;
  const c = `${t}\u0000${v}`;
  if (!byCoord.has(c)) byCoord.set(c, h);
  knownHash.add(h);
}
const assignments = new Map();
for (const m of sv.matchAll(/"([^"]+)": Object\.freeze\(\{ voice: "([a-z]+)" as const, clips: Object\.freeze\((\{[^}]*\})\) \}\)/g))
  assignments.set(m[1], { voice: m[2], clips: JSON.parse(m[3]) });
const assignmentKey = (id) => id.replace(/^[a-z]{2}:/u, "").replace(/:session-(\d+)/u, ":session:$1");

// файлы, которые сыграет приложение, по репликам задания (null — общего голоса нет)
function planFiles(interactionId, transcripts) {
  const a = assignments.get(assignmentKey(interactionId)) ?? assignments.get(interactionId);
  if (a && transcripts.every((t) => knownHash.has(a.clips[t] ?? ""))) return { source: "codex_assignment", files: transcripts.map((t) => a.clips[t]) };
  const has = (t, v) => byCoord.has(`${t}\u0000${v}`);
  if (transcripts.every((t) => VOICES.every((v) => has(t, v)))) return { source: "all_four_voices", files: transcripts.flatMap((t) => VOICES.map((v) => byCoord.get(`${t}\u0000${v}`))) };
  const v = VOICES.find((voice) => transcripts.every((t) => has(t, voice)));
  return v ? { source: "assigned_recorded_voice", files: transcripts.map((t) => byCoord.get(`${t}\u0000${v}`)) } : null;
}

const evidence = JSON.parse(fs.readFileSync(FILE, "utf8"));
const approved = new Map(evidence.targets.map((t) => [t.audioTargetId, t]));
const before = approved.size;
const added = [];
const rejected = {};
const reject = (reason, id) => { (rejected[reason] ??= []).push(id); };
const seen = new Set();
for (const root of ["content/learning-v2-course/release/en", "modules/learning-v2/content/factory_native/generated_release/en"]) {
  const abs = path.join(SNAP, root);
  for (const lesson of fs.readdirSync(abs).filter((d) => /^l\d\d$/.test(d)).sort())
    for (const session of fs.readdirSync(path.join(abs, lesson)).filter((d) => /^s\d\d$/.test(d)).sort()) {
      const lp = path.join(abs, lesson, session, "learner.json");
      if (!fs.existsSync(lp)) continue;
      for (const it of JSON.parse(fs.readFileSync(lp, "utf8")).interactions ?? []) {
        const targets = (it.audioTargetIds ?? []).filter((t) => typeof t === "string" && t && !approved.has(t) && !seen.has(t));
        if (targets.length === 0) continue;
        targets.forEach((t) => seen.add(t));
        const p = it.modePayload ?? {};
        const refs = p.family === "sound_contrast" ? [p.audioA, p.audioB].filter(Boolean) : p.referenceAudio ? [p.referenceAudio] : [];
        if ((p.family === "sound_contrast" && refs.length !== 2) || (p.family !== "sound_contrast" && refs.length !== 1)) { targets.forEach((t) => reject("reference_audio_missing", t)); continue; }
        const plan = planFiles(it.interactionId, refs.map((r) => r.transcript));
        if (!plan) { targets.forEach((t) => reject("no_common_recorded_voice", t)); continue; }
        const silentFile = plan.files.find((h) => silent.has(h));
        const outside = plan.files.find((h) => !bundle.has(h));
        for (const t of targets) {
          if (silentFile) reject("silent_audio", t);
          else if (outside) reject("audio_not_in_bundle", t);
          else { added.push({ interactionId: it.interactionId, audioTargetId: t, source: plan.source }); }
        }
      }
    }
}
const bySource = added.reduce((acc, a) => ({ ...acc, [a.source]: (acc[a.source] ?? 0) + 1 }), {});
console.log(`[OWNER-APPROVALS] было ${before}, добавляю ${added.length} ${JSON.stringify(bySource)}; отклонено ${JSON.stringify(Object.fromEntries(Object.entries(rejected).map(([k, v]) => [k, v.length])))}`);
for (const [k, v] of Object.entries(rejected)) console.log(`[OWNER-APPROVALS] отклонено ${k}: ${v.slice(0, 8).join(", ")}${v.length > 8 ? ` … ещё ${v.length - 8}` : ""}`);
// разбивка по L05 s17–32 (координатор 02:26): сколько целей уже покрыто звуком и сколько ждёт частей звука
const inRange = (id) => { const m = /lesson-05:session-(\d+)/u.exec(id); return m && Number(m[1]) >= 17 && Number(m[1]) <= 32; };
const rangeAdded = added.filter((a) => inRange(a.audioTargetId)).length;
const rangeRejected = Object.fromEntries(Object.entries(rejected).map(([k, v]) => [k, v.filter(inRange).length]));
const rangeApprovedBefore = [...approved.keys()].filter(inRange).length;
console.log(`[OWNER-APPROVALS] L05 s17–32: уже одобрено ${rangeApprovedBefore}, покрыто звуком сейчас ${rangeAdded}, ждут звука ${JSON.stringify(rangeRejected)}`);
if (DRY) process.exit(0);
// зачем (координатор 02:30): после коммита переноса все цели L05 s17–32 обязаны быть покрыты звуком — иначе стоп, ничего не пишем
const rangeLeft = Object.values(rangeRejected).reduce((sum, n) => sum + n, 0);
if (args.includes("--require-range") && rangeLeft > 0) {
  console.error(`[OWNER-APPROVALS] СТОП: в L05 s17–32 не покрыто звуком ${rangeLeft} целей ${JSON.stringify(rangeRejected)} — файл одобрения не изменён`);
  process.exit(3);
}
for (const a of added) approved.set(a.audioTargetId, { interactionId: a.interactionId, audioTargetId: a.audioTargetId });
const note = " 18.10 (координатор, Ядро): цели переноса L04 s17–56 и L05 s01–16 — строго: звук задания в наборе сборки и не тихий (прецедент 212b509b9).";
const next = {
  ...evidence,
  decision: evidence.decision.includes("18.10 (координатор, Ядро)") ? evidence.decision : evidence.decision + note,
  targets: [...approved.values()].sort((x, y) => x.audioTargetId.localeCompare(y.audioTargetId)),
};
const tmp = `${FILE}.tmp`;
fs.writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`);
fs.renameSync(tmp, FILE);
console.log(`[OWNER-APPROVALS] записано: ${next.targets.length} целей`);
