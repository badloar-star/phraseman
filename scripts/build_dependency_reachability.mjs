import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const targets = [
  'shell-quote', 'websocket-driver', '@grpc/grpc-js', '@xmldom/xmldom', 'brace-expansion',
  'fast-uri', 'image-size', 'js-yaml', 'nanoid', 'postcss', 'protobufjs', 'ws',
];
const npmArgs = ['ls', ...targets, '--all', '--json', '--silent'];
const result = process.platform === 'win32'
  ? spawnSync('cmd.exe', ['/d', '/s', '/c', ['npm', ...npmArgs].join(' ')], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 12 * 1024 * 1024,
  })
  : spawnSync('npm', npmArgs, {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 12 * 1024 * 1024,
  });
if (!result.stdout) throw new Error(`npm_ls_no_output:${result.status}`);
const tree = JSON.parse(result.stdout);
const matches = [];
function walk(dependencies, parentPath) {
  for (const [name, node] of Object.entries(dependencies ?? {})) {
    const currentPath = [...parentPath, name];
    if (targets.includes(name)) {
      const topLevel = currentPath[0] ?? 'unknown';
      const category = ['expo', 'expo-router', 'react-native', '@remotion', 'eslint', 'archiver'].some((prefix) => topLevel === prefix || topLevel.startsWith(`${prefix}/`))
        ? 'build-or-tooling'
        : ['firebase-admin', '@react-native-firebase', 'react-native'].some((prefix) => topLevel === prefix || topLevel.startsWith(`${prefix}/`))
          ? 'runtime-or-platform'
          : 'unknown';
      matches.push({ name, version: node.version ?? 'unknown', path: currentPath.join(' > '), topLevel, category });
    }
    walk(node?.dependencies, currentPath);
  }
}
walk(tree.dependencies, []);
const deduped = [...new Map(matches.map((entry) => [`${entry.name}|${entry.path}`, entry])).values()]
  .sort((a, b) => `${a.name}|${a.path}`.localeCompare(`${b.name}|${b.path}`));
const report = {
  schemaVersion: 1,
  generatedFrom: 'npm ls --all --json',
  status: 'evidence_only',
  targets,
  packages: deduped,
  unknownTargets: targets.filter((name) => !deduped.some((entry) => entry.name === name)),
};
const output = path.join(root, 'docs/security/DEPENDENCY_REACHABILITY.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`dependency_reachability_ok packages=${deduped.length} unknown=${report.unknownTargets.length}`);
