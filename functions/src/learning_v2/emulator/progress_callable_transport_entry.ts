import * as admin from "firebase-admin";
import { createProgressEventProductionCallable } from "../progress_event_callable";

const DISPOSABLE_PROJECT_ID = "phraseman-v2-ac-test-20260718";
const projectId = process.env.GCLOUD_PROJECT;
const googleCloudProjectId = process.env.GOOGLE_CLOUD_PROJECT;
const isFunctionsEmulator = process.env.FUNCTIONS_EMULATOR === "true";
const hasConflictingProjectEnvironment = projectId !== undefined
  && googleCloudProjectId !== undefined
  && projectId !== googleCloudProjectId;
const isAllowedDemoEmulator = !hasConflictingProjectEnvironment
  && isFunctionsEmulator
  && projectId?.startsWith("demo-") === true;
const isAllowedDisposableDeploy = !hasConflictingProjectEnvironment
  && !isFunctionsEmulator
  && projectId === DISPOSABLE_PROJECT_ID;

if (!isAllowedDemoEmulator && !isAllowedDisposableDeploy) {
  throw new Error(
    "V2 progress transport test harness refuses to load outside "
      + "a demo-project Functions emulator or its exact disposable project",
  );
}

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Test-only discovery boundary. Production index.ts intentionally does not
// export this callable until every Phase 02 gate is independently closed.
export const v2ProgressTransport = createProgressEventProductionCallable();
