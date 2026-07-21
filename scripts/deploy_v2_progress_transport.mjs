#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DISPOSABLE_PROJECT_ID = "phraseman-v2-ac-test-20260718";
const GUARD_ENV = "PHRASEMAN_V2_PROGRESS_TRANSPORT_DEPLOY_GUARD";
const GUARD_VALUE = `validated:${DISPOSABLE_PROJECT_ID}`;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");

function fail(message) {
  console.error(`V2 progress transport deploy refused: ${message}`);
  process.exitCode = 1;
}

function validatePredeployEnvironment(args) {
  if (args.length !== 1 || args[0] !== "--predeploy") {
    fail("the predeploy hook accepts no additional arguments");
    return false;
  }
  if (process.env[GUARD_ENV] !== GUARD_VALUE) {
    fail("the Firebase command was not started by the validated deploy wrapper");
    return false;
  }
  if (process.env.GCLOUD_PROJECT !== DISPOSABLE_PROJECT_ID) {
    fail(`resolved Firebase project must be exactly ${DISPOSABLE_PROJECT_ID}`);
    return false;
  }
  if (
    process.env.GOOGLE_CLOUD_PROJECT
    && process.env.GOOGLE_CLOUD_PROJECT !== DISPOSABLE_PROJECT_ID
  ) {
    fail("conflicting Firebase project environment variables");
    return false;
  }
  return true;
}

function parseWrapperArguments(args) {
  let validateOnly = false;
  const projects = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--validate-only") {
      if (validateOnly) {
        throw new Error("--validate-only may be supplied only once");
      }
      validateOnly = true;
      continue;
    }
    if (argument === "--project") {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) {
        throw new Error("--project requires an explicit project id");
      }
      projects.push(value);
      index += 1;
      continue;
    }
    if (argument.startsWith("--project=")) {
      projects.push(argument.slice("--project=".length));
      continue;
    }
    throw new Error(`unsupported argument ${JSON.stringify(argument)}`);
  }

  if (projects.length !== 1) {
    throw new Error("exactly one explicit --project flag is required");
  }
  if (projects[0] !== DISPOSABLE_PROJECT_ID) {
    throw new Error(`only ${DISPOSABLE_PROJECT_ID} is allowed`);
  }

  return { projectId: projects[0], validateOnly };
}

function run(executable, args, environment = process.env) {
  const command = process.platform === "win32" && path.extname(executable) === ""
    ? `${executable}.cmd`
    : executable;
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    env: environment,
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${executable} exited with status ${String(result.status)}`);
  }
}

function deploy(projectId) {
  run(process.execPath, [
    path.join(repositoryRoot, "node_modules", "typescript", "bin", "tsc"),
    "--project",
    path.join(repositoryRoot, "functions", "tsconfig.v2-progress-transport.json"),
    "--pretty",
    "false",
  ]);
  run(process.execPath, [
    path.join(repositoryRoot, "scripts", "prepare_v2_progress_transport_emulator.mjs"),
  ]);

  const firebaseEnvironment = {
    ...process.env,
    [GUARD_ENV]: GUARD_VALUE,
  };
  delete firebaseEnvironment.GCLOUD_PROJECT;
  delete firebaseEnvironment.GOOGLE_CLOUD_PROJECT;

  run("firebase", [
    "deploy",
    "--config",
    "firebase.v2-progress-transport.json",
    "--only",
    "functions:v2ProgressTransport",
    "--project",
    projectId,
    "--non-interactive",
  ], firebaseEnvironment);
}

const args = process.argv.slice(2);
if (args[0] === "--predeploy") {
  validatePredeployEnvironment(args);
} else {
  try {
    const options = parseWrapperArguments(args);
    console.log(`V2 progress transport deploy guard validated project ${options.projectId}.`);
    if (!options.validateOnly) {
      deploy(options.projectId);
    }
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}
