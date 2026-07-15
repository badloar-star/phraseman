const fs = require('fs');
const childProcess = require('child_process');
const os = require('os');
const path = require('path');

const ALLOW_SOURCE_WRITES_ENV = 'PHRASEMAN_ALLOW_SOURCE_WRITES';

(function installJestSourceWriteGuard() {
if (process.env[ALLOW_SOURCE_WRITES_ENV] === '1') {
  return;
}

const root = path.resolve(__dirname, '..');

const normalizePath = (target) => {
  if (typeof target === 'number') return null;
  if (target instanceof URL) return path.resolve(target.pathname);
  if (Buffer.isBuffer(target)) return path.resolve(target.toString());
  if (typeof target !== 'string') return null;
  return path.resolve(target);
};

const withTrailingSeparator = (value) => {
  const normalized = path.resolve(value);
  return normalized.endsWith(path.sep) ? normalized : `${normalized}${path.sep}`;
};

const allowedRoots = [
  os.tmpdir(),
  path.join(root, 'tmp'),
  path.join(root, '.codex-tmp'),
  path.join(root, 'coverage'),
  path.join(root, '.artifacts'),
  path.join(root, '.logs'),
  path.join(root, 'docs', 'reports'),
  path.join(root, 'docs', 'gustav', 'runs'),
  path.join(root, 'maestro-results'),
  path.join(root, 'qa-artifacts'),
].map(withTrailingSeparator);

const rootWithSep = withTrailingSeparator(root);

const isInside = (target, parentWithSep) => (
  target === parentWithSep.slice(0, -1) || target.startsWith(parentWithSep)
);

const isAllowedWriteTarget = (target) => (
  !isInside(target, rootWithSep) || allowedRoots.some((allowedRoot) => isInside(target, allowedRoot))
);

const assertWriteAllowed = (target, operation) => {
  const normalized = normalizePath(target);
  if (!normalized || isAllowedWriteTarget(normalized)) return;
  throw new Error(`Jest source write guard blocked ${operation}: ${path.relative(root, normalized)}`);
};

const guardRequireOption = `--require=${__filename.replace(/\\/g, '/')}`;
const nodeOptions = process.env.NODE_OPTIONS ?? '';
if (!nodeOptions.split(/\s+/).includes(guardRequireOption)) {
  process.env.NODE_OPTIONS = `${guardRequireOption} ${nodeOptions}`.trim();
}

const withGuardedEnv = (options) => ({
  ...(options ?? {}),
  env: {
    ...process.env,
    ...((options && typeof options === 'object' && options.env) ? options.env : {}),
    NODE_OPTIONS: process.env.NODE_OPTIONS,
  },
});

const wrapChildProcessWithOptions = (original) => function guardedChildProcess(command, argsOrOptions, maybeOptions) {
  if (Array.isArray(argsOrOptions)) {
    return original.call(this, command, argsOrOptions, withGuardedEnv(maybeOptions));
  }
  return original.call(this, command, withGuardedEnv(argsOrOptions));
};

const wrapChildProcessCommand = (original) => function guardedChildProcessCommand(command, optionsOrCallback, maybeCallback) {
  if (typeof optionsOrCallback === 'function') {
    return original.call(this, command, withGuardedEnv(undefined), optionsOrCallback);
  }
  return original.call(this, command, withGuardedEnv(optionsOrCallback), maybeCallback);
};

childProcess.spawn = wrapChildProcessWithOptions(childProcess.spawn);
childProcess.spawnSync = wrapChildProcessWithOptions(childProcess.spawnSync);
childProcess.execFile = wrapChildProcessWithOptions(childProcess.execFile);
childProcess.execFileSync = wrapChildProcessWithOptions(childProcess.execFileSync);
childProcess.fork = wrapChildProcessWithOptions(childProcess.fork);
childProcess.exec = wrapChildProcessCommand(childProcess.exec);
childProcess.execSync = wrapChildProcessCommand(childProcess.execSync);

const wrapSinglePath = (operation, original) => function guardedSinglePath(target, ...args) {
  assertWriteAllowed(target, operation);
  return original.call(this, target, ...args);
};

const wrapCopyOrRename = (operation, original) => function guardedCopyOrRename(from, to, ...args) {
  assertWriteAllowed(from, operation);
  assertWriteAllowed(to, operation);
  return original.call(this, from, to, ...args);
};

fs.writeFileSync = wrapSinglePath('writeFileSync', fs.writeFileSync);
fs.appendFileSync = wrapSinglePath('appendFileSync', fs.appendFileSync);
fs.rmSync = wrapSinglePath('rmSync', fs.rmSync);
fs.unlinkSync = wrapSinglePath('unlinkSync', fs.unlinkSync);
fs.mkdirSync = wrapSinglePath('mkdirSync', fs.mkdirSync);
fs.copyFileSync = wrapCopyOrRename('copyFileSync', fs.copyFileSync);
fs.renameSync = wrapCopyOrRename('renameSync', fs.renameSync);

if (fs.promises) {
  fs.promises.writeFile = wrapSinglePath('promises.writeFile', fs.promises.writeFile);
  fs.promises.appendFile = wrapSinglePath('promises.appendFile', fs.promises.appendFile);
  fs.promises.rm = wrapSinglePath('promises.rm', fs.promises.rm);
  fs.promises.unlink = wrapSinglePath('promises.unlink', fs.promises.unlink);
  fs.promises.mkdir = wrapSinglePath('promises.mkdir', fs.promises.mkdir);
  fs.promises.copyFile = wrapCopyOrRename('promises.copyFile', fs.promises.copyFile);
  fs.promises.rename = wrapCopyOrRename('promises.rename', fs.promises.rename);
}
})();
