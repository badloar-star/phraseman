#!/usr/bin/env node

import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const RETIRED_RESPONSE_FIELDS = new Set([
  'senderBalanceAfter',
  'callerShards',
  'shardsBalance',
  'shardsUpdatedAtMs',
]);

const LEGITIMATE_SHARD_RECEIVERS = new Set([
  'broadcast', 'bySource', 'claim', 'message', 'original', 'pack', 'prev', 'row', 'settled',
]);

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function receiverLooksPersonal(expression) {
  const text = expression.getText().replaceAll(' ', '');
  if (LEGITIMATE_SHARD_RECEIVERS.has(text)) return false;
  return /(?:user|account)(?:snap(?:\.data\(\))?|row|data)?$/i.test(text)
    || /(?:^|\.)(?:user|account)[A-Za-z0-9_$]*(?:\?\.data\(\))?$/i.test(text);
}

function propertyName(node, shardKeyAliases) {
  if (!node) return null;
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) return node.text;
  if (!ts.isComputedPropertyName(node)) return null;
  const expression = node.expression;
  if (ts.isStringLiteralLike(expression)) return expression.text;
  if (ts.isIdentifier(expression) && shardKeyAliases.has(expression.text)) return 'shards';
  return null;
}

function elementKey(node, shardKeyAliases) {
  const argument = node.argumentExpression;
  if (!argument) return null;
  if (ts.isStringLiteralLike(argument)) return argument.text;
  if (ts.isIdentifier(argument) && shardKeyAliases.has(argument.text)) return 'shards';
  return null;
}

function isMutationTarget(node) {
  const parent = node.parent;
  return (ts.isBinaryExpression(parent) && parent.left === node && ts.isAssignmentOperator(parent.operatorToken.kind))
    || (ts.isDeleteExpression(parent) && parent.expression === node)
    || (ts.isPrefixUnaryExpression(parent) && parent.operand === node)
    || (ts.isPostfixUnaryExpression(parent) && parent.operand === node);
}

function personalFirestoreWrite(property) {
  let cursor = property.parent;
  while (cursor && !ts.isCallExpression(cursor) && !ts.isSourceFile(cursor)) cursor = cursor.parent;
  if (!cursor || !ts.isCallExpression(cursor) || !ts.isPropertyAccessExpression(cursor.expression)) return false;
  if (!['set', 'update', 'create'].includes(cursor.expression.name.text)) return false;
  const target = cursor.arguments[0]?.getText() ?? '';
  return /(?:userRef|target\.ref|refereeRef|referrerRef|winner\.ref|accountKey\(|userRefs\[)/.test(target);
}

function personalFirestoreCall(node) {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return false;
  if (!['set', 'update', 'create'].includes(node.expression.name.text)) return false;
  const target = node.arguments[0]?.getText() ?? '';
  return /(?:userRef|target\.ref|refereeRef|referrerRef|winner\.ref|accountKey\(|userRefs\[)/.test(target);
}

/** Parse source instead of regex-matching it so computed keys and destructuring
 * cannot silently reintroduce a personal users.shards authority path. */
export function personalShardAuthorityViolations(source, fileName = 'probe.ts') {
  const kind = fileName.endsWith('.js') ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind);
  const violations = [];
  const shardKeyAliases = new Set();
  const shardPatchAliases = new Set();

  const collectAliases = (node) => {
    if (ts.isVariableDeclaration(node)
      && ts.isIdentifier(node.name)
      && node.initializer
      && ts.isStringLiteralLike(node.initializer)
      && node.initializer.text === 'shards') {
      shardKeyAliases.add(node.name.text);
    }
    ts.forEachChild(node, collectAliases);
  };
  collectAliases(sourceFile);

  const objectContainsShardPatch = (object) => object.properties.some((property) => {
    if (ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)) {
      return propertyName(property.name, shardKeyAliases) === 'shards';
    }
    return ts.isSpreadAssignment(property)
      && ts.isIdentifier(property.expression)
      && shardPatchAliases.has(property.expression.text);
  });
  // Propagate taint through `const alias = patch` and `{ ...patch }`. Iterate to
  // a fixed point so multiple alias/spread layers cannot hide a wallet write.
  let changed = true;
  while (changed) {
    changed = false;
    const collectPatchAliases = (node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        const tainted = (ts.isObjectLiteralExpression(node.initializer) && objectContainsShardPatch(node.initializer))
          || (ts.isIdentifier(node.initializer) && shardPatchAliases.has(node.initializer.text));
        if (tainted && !shardPatchAliases.has(node.name.text)) {
          shardPatchAliases.add(node.name.text);
          changed = true;
        }
      }
      ts.forEachChild(node, collectPatchAliases);
    };
    collectPatchAliases(sourceFile);
  }

  const add = (node, reason) => violations.push(`${fileName}:${lineOf(sourceFile, node)}:${reason}`);
  const visit = (node) => {
    if (ts.isPropertyAccessExpression(node) && node.name.text === 'shards') {
      if (receiverLooksPersonal(node.expression) || isMutationTarget(node)) add(node, 'personal-shards-property-access');
    }
    if (ts.isElementAccessExpression(node) && elementKey(node, shardKeyAliases) === 'shards') {
      add(node, isMutationTarget(node) ? 'computed-shards-write' : 'computed-shards-read');
    }
    if (ts.isBindingElement(node)
      && ts.isObjectBindingPattern(node.parent)
      && propertyName(node.propertyName ?? node.name, shardKeyAliases) === 'shards') {
      add(node, 'destructured-shards-read');
    }
    if (ts.isPropertyAssignment(node)) {
      const name = propertyName(node.name, shardKeyAliases);
      if (name === 'shards' && personalFirestoreWrite(node)) add(node, 'personal-firestore-shards-write');
      if (name && RETIRED_RESPONSE_FIELDS.has(name)) add(node, `retired-balance-response:${name}`);
    }
    if (ts.isShorthandPropertyAssignment(node)) {
      if (node.name.text === 'shards' && personalFirestoreWrite(node)) add(node, 'personal-firestore-shards-write');
      if (RETIRED_RESPONSE_FIELDS.has(node.name.text)) add(node, `retired-balance-response:${node.name.text}`);
    }
    if (personalFirestoreCall(node)) {
      const patch = node.arguments[1];
      if (patch && ts.isIdentifier(patch) && shardPatchAliases.has(patch.text)) {
        add(node, `tainted-personal-firestore-shards-write:${patch.text}`);
      }
    }
    if (ts.isPropertySignature(node) && RETIRED_RESPONSE_FIELDS.has(propertyName(node.name, shardKeyAliases) ?? '')) {
      add(node, `retired-balance-response:${propertyName(node.name, shardKeyAliases)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (source.includes('insufficient_balance')) violations.push(`${fileName}:legacy-personal-affordability-error`);
  return violations;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const probeIndex = process.argv.indexOf('--source-base64');
  const fileIndex = process.argv.indexOf('--file');
  const treeIndex = process.argv.indexOf('--tree');
  const fileName = fileIndex >= 0 ? process.argv[fileIndex + 1] : 'probe.ts';
  const treeFiles = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = new URL(entry.name, `${pathToFileURL(directory).href.replace(/\/$/, '')}/`);
    if (entry.isDirectory()) return treeFiles(absolute.pathname);
    return entry.isFile() && /\.(?:ts|js)$/.test(entry.name) && !/\.(?:test|d)\.(?:ts|js)$/.test(entry.name)
      ? [absolute.pathname]
      : [];
  });
  const inputs = treeIndex >= 0
    ? treeFiles(process.argv[treeIndex + 1])
    : [{ fileName, source: probeIndex >= 0
      ? Buffer.from(process.argv[probeIndex + 1] ?? '', 'base64').toString('utf8')
      : readFileSync(fileName, 'utf8') }];
  const violations = inputs.flatMap((input) => typeof input === 'string'
    ? personalShardAuthorityViolations(readFileSync(input, 'utf8'), input)
    : personalShardAuthorityViolations(input.source, input.fileName));
  if (violations.length) {
    console.error(violations.join('\n'));
    process.exit(1);
  }
}
