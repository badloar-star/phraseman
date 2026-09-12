import fs from "node:fs";
import path from "node:path";
import { ownerTasteReceiptIssues, scopedOwnerQualityRequired, sessionIdFromDirectory, shortAnswerConstructionFacts } from "./owner_quality.mjs";

export const REQUIRED_JUDGES = ["judge_learner", "judge_pedagogy", "judge_nonsense", "judge_reader"];

export function requiredJudgesForSession(sessionId) {
  return scopedOwnerQualityRequired(sessionId) ? [...REQUIRED_JUDGES, "judge_taste"] : REQUIRED_JUDGES;
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
  for (const role of REQUIRED_JUDGES) {
    const verdict = json(`final.${role}.json`);
    if (verdict?.verdict !== "PASS") issues.push(`${role}: ${verdict?.verdict ?? "нет PASS"}`);
  }
  const sessionId = sessionIdFromDirectory(dir);
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
    issues.push(...shortAnswerConstructionFacts(fs.readFileSync(file, "utf8"), sessionId).map((fact) => `${locale}: ${fact}`));
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
