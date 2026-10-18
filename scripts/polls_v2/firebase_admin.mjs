import { createRequire } from 'node:module';

const requireFromFunctions = createRequire(new URL('../../functions/package.json', import.meta.url));
const { applicationDefault, getApps, initializeApp } = requireFromFunctions('firebase-admin/app');
const { getFirestore } = requireFromFunctions('firebase-admin/firestore');

export function projectArg(argv = process.argv.slice(2)) {
  const value = argv.find((arg) => arg.startsWith('--project='))?.slice('--project='.length).trim();
  if (!value) throw new Error('Pass an explicit --project=<firebase-project-id>.');
  return value;
}

export function firestoreForProject(projectId) {
  const app = getApps().find((candidate) => candidate.options.projectId === projectId)
    ?? initializeApp({ credential: applicationDefault(), projectId }, `polls-v2-${projectId}`);
  return getFirestore(app);
}

export function hasArg(name, argv = process.argv.slice(2)) {
  return argv.includes(name);
}
