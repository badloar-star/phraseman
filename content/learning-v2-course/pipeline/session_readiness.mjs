import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ownerTasteReceiptIssues, scopedOwnerQualityRequired, sessionIdFromDirectory, shortAnswerConstructionFacts, taskInstructionIssues } from "./owner_quality.mjs";

export const REQUIRED_JUDGES = ["judge_learner", "judge_pedagogy", "judge_nonsense", "judge_reader"];

export function progressionJudgeRequired(sessionId) {
  const match = /^en\/l(\d+)\/s(\d+)$/i.exec(String(sessionId || ""));
  if (!match) return false;
  const lesson = Number(match[1]);
  const session = Number(match[2]);
  return lesson > 3 || (lesson === 3 && session >= 25);
}

export function detailedProgressionEvidenceRequired(sessionId) {
  const match = /^en\/l(\d+)\/s(\d+)$/i.exec(String(sessionId || ""));
  if (!match) return false;
  const lesson = Number(match[1]);
  const session = Number(match[2]);
  return lesson > 3 || (lesson === 3 && session >= 43);
}

export function requiredJudgesForSession(sessionId) {
  const roles = scopedOwnerQualityRequired(sessionId) ? [...REQUIRED_JUDGES, "judge_taste"] : [...REQUIRED_JUDGES];
  if (progressionJudgeRequired(sessionId)) roles.push("judge_progression");
  return roles;
}

export function judgeIssues(verdicts, sessionId = null) {
  return requiredJudgesForSession(sessionId).filter((role) => verdicts?.[role]?.verdict !== "PASS");
}

// Read-only: a filename or an old status cannot establish that a session passed.
export function sessionReadiness(dir, locales = ["uk"]) {
  const issues = [];
  const master = path.join(dir, "final.ru.md");
  if (!fs.existsSync(master)) return { ready: false, issues: ["нет final.ru.md"] };
  const masterTime = fs.statSync(master).mtimeMs;
  const json = (name, minimumTime = masterTime) => {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) { issues.push(`нет ${name}`); return null; }
    if (fs.statSync(file).mtimeMs < minimumTime) issues.push(`${name} старше проверяемого текста`);
    try {
      const value = JSON.parse(fs.readFileSync(file, "utf8"));
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("expected object");
      return value;
    }
    catch { issues.push(`${name} нечитаем`); return null; }
  };
  if (fs.existsSync(path.join(dir, "ЗАБРАКОВАНА.txt"))) issues.push("сессия забракована");
  // зачем: инструкция не должна выдавать ловушку и не должна обещать «без
  // подсказок» рядом с подсказкой (владелец, 2026-09-20). Проверяем мастер
  // всегда — правило действует на весь курс, а не только на поздние сессии.
  issues.push(...taskInstructionIssues(fs.readFileSync(master, "utf8")));
  const sessionId = sessionIdFromDirectory(dir);
  for (const role of requiredJudgesForSession(sessionId).filter((role) => role !== "judge_taste")) {
    const verdict = json(`final.${role}.json`);
    if (verdict?.verdict !== "PASS") issues.push(`${role}: ${verdict?.verdict ?? "нет PASS"}`);
    if (role === "judge_progression" && verdict) {
      const actualSha = crypto.createHash("sha256").update(fs.readFileSync(master)).digest("hex");
      if (String(verdict.sourceSha256 || "").toLowerCase() !== actualSha) issues.push("judge_progression: SHA-256 не совпадает с актуальными байтами final.ru.md");
      if (!verdict.comparedThrough) issues.push("judge_progression: нет границы сравнения");
      if (!Array.isArray(verdict.newWords) || verdict.newWords.length === 0) issues.push("judge_progression: не подтверждены новые слова");
      if (verdict.sceneNovel !== true) issues.push("judge_progression: новая ситуация не подтверждена");
      if (!verdict.grammarProgression) issues.push("judge_progression: grammar progression не проверена");
      if (verdict.introPracticeAligned !== true) issues.push("judge_progression: интро не готовят текущую практику");
      if (verdict.curriculumExactMatch !== true) issues.push("judge_progression: не подтверждено точное соответствие строке плана курса");
      if (!String(verdict.curriculumRow || "").trim()) issues.push("judge_progression: не приведена точная строка плана курса");
      const curriculum = verdict.curriculumEvidence;
      if (!curriculum || typeof curriculum !== "object" || Array.isArray(curriculum)) {
        issues.push("judge_progression: нет curriculumEvidence по грамматике, словам и ситуации");
      } else {
        if (!String(curriculum.grammar || "").trim()) issues.push("judge_progression: плановая грамматика не сверена");
        if (!String(curriculum.situation || "").trim()) issues.push("judge_progression: плановая ситуация не сверена");
        const declaredWords = (verdict.newWords || []).map((word) => String(word).toLowerCase()).sort();
        const evidenceWords = Array.isArray(curriculum.newWords) ? curriculum.newWords.map((word) => String(word).toLowerCase()).sort() : [];
        if (!evidenceWords.length || JSON.stringify(evidenceWords) !== JSON.stringify(declaredWords)) issues.push("judge_progression: новые слова в curriculumEvidence не совпадают с проверенным списком");
      }
      if (detailedProgressionEvidenceRequired(sessionId)) {
        const alignment = verdict.introAlignment;
        if (!Array.isArray(alignment) || alignment.length !== 3) {
          issues.push("judge_progression: нужны три постраничные цепочки introAlignment");
        } else {
          const declared = new Set(verdict.newWords.map((word) => String(word).toLowerCase()));
          for (let index = 0; index < alignment.length; index += 1) {
            const item = alignment[index] || {};
            const prefix = `judge_progression: интро ${index + 1}`;
            if (item.intro !== index + 1) issues.push(`${prefix}: неверный номер evidence`);
            if (!Array.isArray(item.newWords) || item.newWords.length === 0 || item.newWords.some((word) => !declared.has(String(word).toLowerCase()))) issues.push(`${prefix}: новые слова не подтверждены`);
            if (!item.sceneEvidence || !item.correctAnswer || !item.practiceTarget || !item.finalEvidence) issues.push(`${prefix}: неполная цепочка scene/answer/practice/final`);
            if (!Number.isInteger(item.practiceTask) || item.practiceTask < 1 || item.practiceTask > 16) issues.push(`${prefix}: practiceTask должен быть 1–16`);
            if (item.sameOperation !== true) issues.push(`${prefix}: связь операции с финалом не подтверждена`);
          }
        }
        if (!Array.isArray(verdict.foreignIntroExamples) || verdict.foreignIntroExamples.length !== 0) issues.push("judge_progression: есть чужие универсальные примеры или нет пустого foreignIntroExamples");
      }
    }
  }
  issues.push(...shortAnswerConstructionFacts(fs.readFileSync(master, "utf8"), sessionId).map((fact) => `ru: ${fact}`));
  issues.push(...ownerTasteReceiptIssues({
    sessionId,
    sourcePath: master,
    receiptPath: path.join(dir, "final.judge_taste.json"),
  }));
  const status = json("status.json");
  if (status && (status.converged !== true || status.needsHumanReview !== false)) issues.push("status.json не подтверждает принятие");
  if (status && (status.needsHumanReview || status.converged === false || status.blockedBy || status.blocked?.length || status.brokenTasks?.length || status.buildProblems?.length)) issues.push("status.json содержит незакрытые проблемы");
  let localeTime = masterTime;
  for (const locale of locales) {
    const file = path.join(dir, `final.${locale}.md`);
    if (!fs.existsSync(file)) { issues.push(`нет final.${locale}.md`); continue; }
    const localeText = fs.readFileSync(file, "utf8");
    issues.push(...shortAnswerConstructionFacts(localeText, sessionId).map((fact) => `${locale}: ${fact}`));
    issues.push(...taskInstructionIssues(localeText).map((issue) => `${locale}: ${issue}`));
    const time = fs.statSync(file).mtimeMs;
    if (time < masterTime) issues.push(`final.${locale}.md старше мастера`);
    localeTime = Math.max(localeTime, time);
  }
  if (locales.length) {
    const verdict = json("locales.judge.json", localeTime);
    for (const locale of locales) if (verdict?.locales?.[locale]?.verdict !== "PASS") issues.push(`локаль ${locale}: нет PASS`);
  }
  return { ready: issues.length === 0, issues };
}
