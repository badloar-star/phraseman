import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const TOP_LEVEL_FIELDS = Object.freeze([
  "schemaVersion",
  "targetLanguage",
  "interfaceLocales",
  "sourceDocuments",
  "requirements",
]);
const SOURCE_FIELDS = Object.freeze(["sourcePath", "sha256"]);
const REQUIREMENT_FIELDS = Object.freeze([
  "id",
  "sourcePath",
  "sourceSection",
  "phase",
  "applicability",
  "severity",
  "assertion",
  "family",
]);
const PHASES = new Set(["PRE_AUTHOR", "POST_AUTHOR", "RELEASE_PROJECTION"]);
const APPLICABILITY = new Set([
  "always",
  "teaching",
  "checkpoint",
  "voice",
  "recall",
  "release",
]);

const isRecord = (value) => typeof value === "object"
  && value !== null
  && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === "string"
  && value.trim().length > 0;
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const hasGlob = (value) => /[*?\[\]{}]/u.test(value);

function unknownFields(value, allowed, prefix) {
  if (!isRecord(value)) return [];
  return Object.keys(value)
    .filter((key) => !allowed.includes(key))
    .map((key) => `${prefix}:${key}`);
}

export function resolveRequirementSourcePath(sourcePath, {
  repoRoot,
  desktopCodexRoot,
}) {
  if (!isNonEmptyString(sourcePath)) {
    throw new Error("recenter_source_path_required");
  }
  if (hasGlob(sourcePath)) {
    throw new Error(`source_path_glob_forbidden:${sourcePath}`);
  }
  if (sourcePath.startsWith("DesktopCodex/")) {
    return path.resolve(desktopCodexRoot, sourcePath.slice("DesktopCodex/".length));
  }
  if (sourcePath.startsWith("factory/")) {
    return path.resolve(
      repoRoot,
      "content/learning-v2-course",
      sourcePath.slice("factory/".length),
    );
  }
  if (sourcePath.startsWith("repo/")) {
    return path.resolve(repoRoot, sourcePath.slice("repo/".length));
  }
  throw new Error(`recenter_source_namespace_unknown:${sourcePath}`);
}

export function loadRequirementManifest(manifestFile) {
  return JSON.parse(fs.readFileSync(manifestFile, "utf8"));
}

export function validateRequirementManifest(manifest, roots) {
  const issues = [];
  if (!isRecord(manifest)) return ["manifest_not_object"];
  issues.push(...unknownFields(manifest, TOP_LEVEL_FIELDS, "unknown_manifest_field"));
  if (manifest.schemaVersion !== "learning-v2-de-requirements.v1") {
    issues.push("schema_version_invalid");
  }
  if (manifest.targetLanguage !== "de") issues.push("target_language_invalid");
  if (JSON.stringify(manifest.interfaceLocales) !== JSON.stringify(["ru", "uk"])) {
    issues.push("interface_locales_invalid");
  }

  const sourceDocuments = Array.isArray(manifest.sourceDocuments)
    ? manifest.sourceDocuments
    : [];
  if (sourceDocuments.length === 0) issues.push("source_documents_required");
  const sourceByPath = new Map();
  const sourceContents = new Map();
  for (const [index, source] of sourceDocuments.entries()) {
    const prefix = `source_documents[${index}]`;
    if (!isRecord(source)) {
      issues.push(`${prefix}:not_object`);
      continue;
    }
    issues.push(...unknownFields(source, SOURCE_FIELDS, "unknown_source_field"));
    if (!isNonEmptyString(source.sourcePath)) {
      issues.push(`${prefix}:source_path_required`);
      continue;
    }
    if (hasGlob(source.sourcePath)) {
      issues.push(`source_path_glob_forbidden:${source.sourcePath}`);
      continue;
    }
    if (sourceByPath.has(source.sourcePath)) {
      issues.push(`duplicate_source_path:${source.sourcePath}`);
    }
    sourceByPath.set(source.sourcePath, source);
    if (!/^[a-f0-9]{64}$/u.test(String(source.sha256 || ""))) {
      issues.push(`${prefix}:source_hash_invalid`);
      continue;
    }
    try {
      const absolutePath = resolveRequirementSourcePath(source.sourcePath, roots);
      if (!fs.existsSync(absolutePath)) {
        issues.push(`source_missing:${source.sourcePath}`);
        continue;
      }
      const bytes = fs.readFileSync(absolutePath);
      const actual = sha256(bytes);
      sourceContents.set(source.sourcePath, bytes.toString("utf8"));
      if (actual !== source.sha256) {
        issues.push(`source_hash_stale:${source.sourcePath}`);
      }
    } catch (error) {
      issues.push(String(error?.message || error));
    }
  }

  const requirements = Array.isArray(manifest.requirements)
    ? manifest.requirements
    : [];
  if (requirements.length === 0) issues.push("requirements_required");
  const ids = new Set();
  for (const [index, requirement] of requirements.entries()) {
    const prefix = `requirements[${index}]`;
    if (!isRecord(requirement)) {
      issues.push(`${prefix}:not_object`);
      continue;
    }
    issues.push(...unknownFields(
      requirement,
      REQUIREMENT_FIELDS,
      "unknown_requirement_field",
    ));
    if (!/^DE-[A-Z]+-[0-9]{3}$/u.test(String(requirement.id || ""))) {
      issues.push(`${prefix}:requirement_id_invalid`);
    } else if (ids.has(requirement.id)) {
      issues.push(`duplicate_requirement_id:${requirement.id}`);
    }
    ids.add(requirement.id);
    if (!isNonEmptyString(requirement.sourcePath)) {
      issues.push(`${prefix}:source_path_required`);
    } else {
      if (hasGlob(requirement.sourcePath)) {
        issues.push(`source_path_glob_forbidden:${requirement.sourcePath}`);
      }
      if (!sourceByPath.has(requirement.sourcePath)) {
        issues.push(`requirement_source_unregistered:${requirement.sourcePath}`);
      }
    }
    if (!isNonEmptyString(requirement.sourceSection)) {
      issues.push(`${prefix}:source_section_required`);
    } else if (
      sourceContents.has(requirement.sourcePath)
      && !sourceContents.get(requirement.sourcePath).includes(requirement.sourceSection)
    ) {
      issues.push(`source_section_missing:${requirement.id}:${requirement.sourceSection}`);
    }
    if (
      !Array.isArray(requirement.phase)
      || requirement.phase.length === 0
      || requirement.phase.some((phase) => !PHASES.has(phase))
      || new Set(requirement.phase).size !== requirement.phase.length
    ) {
      issues.push(`${prefix}:phase_invalid`);
    }
    if (!APPLICABILITY.has(requirement.applicability)) {
      issues.push(`${prefix}:applicability_invalid`);
    }
    if (requirement.severity !== "HOLD") issues.push(`${prefix}:severity_invalid`);
    if (!isNonEmptyString(requirement.assertion)) {
      issues.push(`${prefix}:assertion_required`);
    }
    if (!/^[a-z][a-z0-9_]*$/u.test(String(requirement.family || ""))) {
      issues.push(`${prefix}:family_invalid`);
    }
  }
  return issues;
}

export function applicableRequirements(manifest, {
  phase,
  applicability,
}) {
  if (!PHASES.has(phase)) throw new Error(`recenter_phase_unknown:${phase}`);
  if (!APPLICABILITY.has(applicability) || applicability === "always") {
    throw new Error(`recenter_applicability_unknown:${applicability}`);
  }
  return Object.freeze(manifest.requirements.filter((requirement) => (
    requirement.phase.includes(phase)
    && ["always", applicability].includes(requirement.applicability)
  )));
}
