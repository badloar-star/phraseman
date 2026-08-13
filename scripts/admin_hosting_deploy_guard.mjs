#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const LIVE_ADMIN = path.join("admin", "legacy.html");
const ADMIN_ENTRY = path.join("admin", "index.html");
const ADMIN_PUBLIC_DIR = "admin";
const FORBIDDEN_ADMIN_SUBTREE_GLOB = "v2/**";
const LINKED_RELEASE_OVERRIDE = "1";
const LINKED_RELEASE_BRANCH = "codex/admin-analytics-current";
const LINKED_RELEASE_ROOT = "C:/Users/badlo/.codex/worktrees/d920/phraseman";

function normalized(value) {
  const resolved = path.resolve(value).replaceAll("\\", "/");
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

export function evaluateAdminHostingWorkspace(input) {
  const errors = [];
  const root = path.resolve(input.root);
  const topLevel = path.resolve(input.gitTopLevel);
  const commonDir = path.resolve(root, input.gitCommonDir);
  const primaryRoot =
    path.basename(commonDir).toLowerCase() === ".git"
      ? path.dirname(commonDir)
      : "";
  const isPrimaryWorktree =
    !!primaryRoot && normalized(primaryRoot) === normalized(root);
  const isAuthorizedLinkedRelease =
    input.linkedReleaseOverride === LINKED_RELEASE_OVERRIDE &&
    input.branch === LINKED_RELEASE_BRANCH &&
    String(input.statusPorcelain ?? "") === "" &&
    normalized(root) === normalized(LINKED_RELEASE_ROOT) &&
    normalized(topLevel) === normalized(root);

  if (normalized(topLevel) !== normalized(root)) {
    errors.push("Admin hosting deploy must run from the repository root.");
  }
  if (!isPrimaryWorktree && !isAuthorizedLinkedRelease) {
    errors.push(
      "Admin hosting deploy is allowed only from the primary worktree; linked or stale release worktrees are blocked.",
    );
  }

  const hosting = Array.isArray(input.firebaseConfig?.hosting)
    ? input.firebaseConfig.hosting
    : [input.firebaseConfig?.hosting].filter(Boolean);
  const adminTarget = hosting.find((entry) => entry?.target === "admin");
  if (adminTarget?.public !== ADMIN_PUBLIC_DIR) {
    errors.push(
      `Firebase hosting target admin must publish ${ADMIN_PUBLIC_DIR}.`,
    );
  }
  const ignore = Array.isArray(adminTarget?.ignore) ? adminTarget.ignore : [];
  if (!ignore.includes(FORBIDDEN_ADMIN_SUBTREE_GLOB)) {
    errors.push(
      `Firebase hosting target admin must exclude ${FORBIDDEN_ADMIN_SUBTREE_GLOB}.`,
    );
  }
  const redirects = Array.isArray(adminTarget?.redirects)
    ? adminTarget.redirects
    : [];
  for (const source of ["/v2", "/v2/**"]) {
    const redirect = redirects.find((entry) => entry?.source === source);
    if (redirect?.destination !== "/legacy.html") {
      errors.push(
        `Forbidden admin route ${source} must redirect to /legacy.html.`,
      );
    }
  }
  if (!input.liveAdminExists) {
    errors.push(`Live admin source is missing: ${LIVE_ADMIN}.`);
  }
  if (!input.adminEntryExists) {
    errors.push(`Admin root entry is missing: ${ADMIN_ENTRY}.`);
  }

  return { ok: errors.length === 0, errors };
}

function git(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function runCli() {
  const root = process.cwd();
  let result;
  try {
    const firebaseConfig = JSON.parse(
      fs.readFileSync(path.join(root, "firebase.json"), "utf8"),
    );
    result = evaluateAdminHostingWorkspace({
      root,
      gitTopLevel: git(root, "rev-parse", "--show-toplevel"),
      gitCommonDir: git(root, "rev-parse", "--git-common-dir"),
      branch: git(root, "branch", "--show-current"),
      statusPorcelain: git(
        root,
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
      ),
      linkedReleaseOverride: process.env.PHRASEMAN_ALLOW_LINKED_ADMIN_RELEASE,
      firebaseConfig,
      liveAdminExists: fs.existsSync(path.join(root, LIVE_ADMIN)),
      adminEntryExists: fs.existsSync(path.join(root, ADMIN_ENTRY)),
    });
  } catch (error) {
    result = {
      ok: false,
      errors: [
        `Admin hosting guard could not inspect the workspace: ${error?.message || error}`,
      ],
    };
  }

  if (!result.ok) {
    for (const error of result.errors)
      console.error(`[admin-hosting-guard] ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `[admin-hosting-guard] OK: primary worktree, ${ADMIN_PUBLIC_DIR} -> ${LIVE_ADMIN}; ${FORBIDDEN_ADMIN_SUBTREE_GLOB} excluded`,
  );
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  runCli();
}
