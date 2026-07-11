'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const PRODUCTION_ROOTS = ['app', 'components', 'constants', 'hooks', 'lib', 'modules'];
const SKIPPED_DIRECTORIES = new Set([
  '.artifacts', '.git', '.gradle', '.logs', '.superpowers', 'assets', 'build', 'builds',
  'coverage', 'dist', 'exports', 'maestro-results', 'node_modules', 'output', 'qa-artifacts',
  'report', 'reports', 'subscription-recovery', 'temp', 'tmp',
]);
const BASELINE_SCHEMA_VERSION = 1;
const BASELINE_FILENAME = path.join('config', 'text-integrity-baseline.json');
const GROUP_FIELDS = [
  'file', 'ownerName', 'ownerPath', 'ancestorPath', 'tag', 'kind', 'prop', 'value', 'testID',
  'fingerprint', 'count', 'lineHints', 'intendedMode', 'owner', 'reason', 'expiryMilestone',
];
const INTENDED_MODES = new Set(['flow', 'adaptive', 'scroll', 'expand', 'non-text', 'temporary-exception']);
const LEGACY_CLASSIFICATION = Object.freeze({
  intendedMode: 'temporary-exception',
  owner: 'text-integrity-migration',
  reason: 'Legacy raw truncation frozen pending semantic migration',
  expiryMilestone: 'text-integrity-residual-closeout',
  exception: Object.freeze({
    approvedBy: 'text-integrity-design-2026-07-10',
    scope: 'legacy-baseline-only',
  }),
});

function baselineError(detail) {
  const error = new Error(`Text integrity baseline invalid: ${detail}`);
  error.code = 'TEXT_INTEGRITY_SCHEMA_INVALID';
  return error;
}

function currentGroupsError(detail) {
  const error = new Error(`Text integrity current inventory invalid: ${detail}`);
  error.code = 'TEXT_INTEGRITY_CURRENT_INVALID';
  return error;
}

function nonemptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateExactFields(object, allowed, location) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) throw baselineError(`${location} must be an object`);
  const unknown = Object.keys(object).filter((field) => !allowed.has(field));
  if (unknown.length) throw baselineError(`${location} has unknown field`);
}

function validateBaseline(baseline) {
  validateExactFields(baseline, new Set(['schemaVersion', 'groups']), 'root');
  if (baseline.schemaVersion !== BASELINE_SCHEMA_VERSION) throw baselineError('unsupported schemaVersion');
  if (!Array.isArray(baseline.groups)) throw baselineError('groups must be an array');
  const seen = new Set();
  const allowedGroupFields = new Set([...new Set(GROUP_FIELDS), 'exception']);
  for (const group of baseline.groups) {
    validateExactFields(group, allowedGroupFields, 'group');
    for (const field of ['file', 'ownerName', 'ownerPath', 'tag', 'kind', 'prop', 'value', 'fingerprint']) {
      if (!nonemptyString(group[field])) throw baselineError(`group ${field} is required`);
    }
    if (!Array.isArray(group.ancestorPath) || group.ancestorPath.some((item) => !nonemptyString(item))) {
      throw baselineError('group ancestorPath is malformed');
    }
    if (!(group.testID === null || nonemptyString(group.testID))) throw baselineError('group testID is malformed');
    if (!/^[0-9a-f]{64}$/.test(group.fingerprint)) throw baselineError('group fingerprint is malformed');
    if (fingerprintGroup(group) !== group.fingerprint) throw baselineError('group fingerprint does not match structure');
    if (seen.has(group.fingerprint)) throw baselineError('duplicate fingerprint');
    seen.add(group.fingerprint);
    if (!Number.isSafeInteger(group.count) || group.count < 1) throw baselineError('group count is invalid');
    if (!Array.isArray(group.lineHints) || group.lineHints.length !== group.count
      || group.lineHints.some((hint) => !Number.isSafeInteger(hint) || hint < 1)) {
      throw baselineError('group lineHints are malformed');
    }
    if (!INTENDED_MODES.has(group.intendedMode)) throw baselineError('group intendedMode is invalid');
    for (const field of ['owner', 'reason', 'expiryMilestone']) {
      if (!nonemptyString(group[field])) throw baselineError(`group metadata ${field} is required`);
    }
    if (group.intendedMode === 'temporary-exception') {
      validateExactFields(group.exception, new Set(['approvedBy', 'scope']), 'exception');
      if (!nonemptyString(group.exception.approvedBy) || !nonemptyString(group.exception.scope)) {
        throw baselineError('temporary exception metadata is required');
      }
    } else if (Object.hasOwn(group, 'exception')) {
      throw baselineError('exception is forbidden for this intendedMode');
    }
  }
  return baseline;
}

function validateCurrentGroups(groups) {
  if (!Array.isArray(groups)) throw currentGroupsError('groups must be an array');
  const allowed = new Set(['file', 'ownerName', 'ownerPath', 'ancestorPath', 'tag', 'kind', 'prop', 'value', 'testID', 'fingerprint', 'count', 'lineHints']);
  const seen = new Set();
  for (const group of groups) {
    if (!group || typeof group !== 'object' || Array.isArray(group)) throw currentGroupsError('group must be an object');
    if (Object.keys(group).some((field) => !allowed.has(field))) throw currentGroupsError('group has unknown field');
    const canonical = canonicalGroup(group);
    for (const field of ['file', 'ownerName', 'ownerPath', 'tag', 'kind', 'prop', 'value']) {
      if (!nonemptyString(group[field]) || group[field] !== canonical[field]) throw currentGroupsError(`group ${field} is malformed`);
    }
    if (JSON.stringify(group.ancestorPath) !== JSON.stringify(canonical.ancestorPath)) throw currentGroupsError('group ancestorPath is malformed');
    if (group.testID !== canonical.testID) throw currentGroupsError('group testID is malformed');
    if (!/^[0-9a-f]{64}$/.test(group.fingerprint) || fingerprintGroup(group) !== group.fingerprint) {
      throw currentGroupsError('group fingerprint does not match structure');
    }
    if (seen.has(group.fingerprint)) throw currentGroupsError('duplicate fingerprint');
    seen.add(group.fingerprint);
    if (!Number.isSafeInteger(group.count) || group.count < 1) throw currentGroupsError('group count is invalid');
    if (!Array.isArray(group.lineHints) || group.lineHints.length !== group.count
      || group.lineHints.some((hint) => !Number.isSafeInteger(hint) || hint < 1)) {
      throw currentGroupsError('group lineHints are malformed');
    }
  }
  return groups;
}

function resolveBaselinePath(rootOrPath) {
  if (path.extname(rootOrPath).toLowerCase() === '.json') return path.resolve(rootOrPath);
  return path.resolve(rootOrPath, BASELINE_FILENAME);
}

function loadAndValidateBaseline(rootOrPath) {
  const target = resolveBaselinePath(rootOrPath);
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(target, 'utf8')); } catch (error) {
    throw baselineError(error && error.code === 'ENOENT' ? 'file is missing' : 'file is not valid JSON');
  }
  return validateBaseline(parsed);
}

function auditAgainstBaseline(baseline, currentGroups) {
  validateBaseline(baseline);
  validateCurrentGroups(currentGroups);
  const expected = new Map(baseline.groups.map((group) => [group.fingerprint, group]));
  const current = new Map(currentGroups.map((group) => [group.fingerprint, group]));
  const added = [...current.keys()].filter((fingerprint) => !expected.has(fingerprint)).sort();
  const removed = [...expected.keys()].filter((fingerprint) => !current.has(fingerprint)).sort();
  const countIncreased = [...current.keys()].filter((fingerprint) => expected.has(fingerprint)
    && current.get(fingerprint).count > expected.get(fingerprint).count).sort();
  const countDecreased = [...current.keys()].filter((fingerprint) => expected.has(fingerprint)
    && current.get(fingerprint).count < expected.get(fingerprint).count).sort();
  return {
    ok: added.length + removed.length + countIncreased.length + countDecreased.length === 0,
    added, removed, countIncreased, countDecreased,
  };
}

function publishNoClobber(temporaryPath, targetPath, filesystem = fs) {
  try {
    filesystem.linkSync(temporaryPath, targetPath);
  } finally {
    try { filesystem.unlinkSync(temporaryPath); } catch {}
  }
}

function writeBootstrapAtomic(targetPath, baseline, filesystem = fs) {
  filesystem.mkdirSync(path.dirname(targetPath), { recursive: true });
  const temporary = `${targetPath}.tmp-${process.pid}-${crypto.randomBytes(8).toString('hex')}`;
  try {
    filesystem.writeFileSync(temporary, `${JSON.stringify(baseline, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    publishNoClobber(temporary, targetPath, filesystem);
  } catch (error) {
    if (error && error.code === 'EEXIST') throw new Error('Text integrity baseline target already exists');
    throw error;
  } finally {
    try { filesystem.rmSync(temporary, { force: true }); } catch {}
  }
}

function writeBaselineAtomic(targetPath, baseline) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const temporary = `${targetPath}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(baseline, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temporary, targetPath);
  } catch (error) {
    try { fs.rmSync(temporary, { force: true }); } catch {}
    throw error;
  }
}

function classifiedGroup(group) {
  return { ...group, ...LEGACY_CLASSIFICATION, exception: { ...LEGACY_CLASSIFICATION.exception } };
}

function bootstrapBaseline(targetPath, currentGroups) {
  const target = path.resolve(targetPath);
  validateCurrentGroups(currentGroups);
  const baseline = validateBaseline({
    schemaVersion: BASELINE_SCHEMA_VERSION,
    groups: currentGroups.map(classifiedGroup).sort((left, right) => left.fingerprint.localeCompare(right.fingerprint)),
  });
  writeBootstrapAtomic(target, baseline);
}

function updateBaselineShrinkOnly(targetPath, currentGroups) {
  const target = path.resolve(targetPath);
  const baseline = loadAndValidateBaseline(target);
  const audit = auditAgainstBaseline(baseline, currentGroups);
  if (audit.added.length || audit.countIncreased.length) {
    const error = new Error('Text integrity baseline update refuses additions or count increases');
    error.code = 'TEXT_INTEGRITY_UPDATE_REFUSED';
    throw error;
  }
  const current = new Map(currentGroups.map((group) => [group.fingerprint, group]));
  const groups = baseline.groups.filter((group) => current.has(group.fingerprint)).map((group) => ({
    ...group,
    count: current.get(group.fingerprint).count,
    lineHints: [...current.get(group.fingerprint).lineHints],
  }));
  writeBaselineAtomic(target, validateBaseline({ schemaVersion: BASELINE_SCHEMA_VERSION, groups }));
}

function shouldSkipDirectory(name) {
  const normalized = name.toLowerCase();
  return SKIPPED_DIRECTORIES.has(normalized)
    || normalized.startsWith('.claude')
    || normalized.startsWith('.codex')
    || normalized.startsWith('lingman-');
}

function normalizeRelativePath(file) {
  return String(file).replace(/\\/g, '/').replace(/^\.\//, '');
}

function canonicalGroup(input) {
  return {
    file: normalizeRelativePath(input.file || input.filename || ''),
    ownerName: String(input.ownerName || '<module>'),
    ownerPath: String(input.ownerPath || input.ownerName || '<module>'),
    ancestorPath: Array.isArray(input.ancestorPath) ? input.ancestorPath.map(String) : [],
    tag: String(input.tag || ''),
    kind: String(input.kind || ''),
    prop: String(input.prop || ''),
    value: String(input.value || ''),
    testID: input.testID == null || input.testID === '' ? null : String(input.testID),
  };
}

function fingerprintGroup(group) {
  const json = JSON.stringify(canonicalGroup(group));
  return crypto.createHash('sha256').update(json, 'utf8').digest('hex');
}

function collectProductionFiles(root) {
  const files = [];

  function walk(absoluteDirectory, relativeDirectory) {
    if (!fs.existsSync(absoluteDirectory)) return;
    const entries = fs.readdirSync(absoluteDirectory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relative = normalizeRelativePath(path.join(relativeDirectory, entry.name));
      if (entry.isDirectory()) {
        if (!shouldSkipDirectory(entry.name)) {
          walk(path.join(absoluteDirectory, entry.name), relative);
        }
      } else if (/\.tsx?$/.test(entry.name) && !/\.gen\.tsx?$/.test(entry.name)) {
        files.push(relative);
      }
    }
  }

  for (const directory of PRODUCTION_ROOTS) {
    walk(path.join(root, directory), directory);
  }
  return files.sort();
}

function typescriptJsxName(name) {
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isJsxNamespacedName(name)) return `${name.namespace.text}:${name.name.text}`;
  if (ts.isPropertyAccessExpression(name)) return `${typescriptJsxName(name.expression)}.${name.name.text}`;
  return name.getText().replace(/\s+/g, '');
}

function eslintJsxName(name) {
  if (!name) return '';
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXNamespacedName') return `${eslintJsxName(name.namespace)}:${eslintJsxName(name.name)}`;
  if (name.type === 'JSXMemberExpression') return `${eslintJsxName(name.object)}.${eslintJsxName(name.property)}`;
  return '';
}

function quoteLiteral(value) {
  return typeof value === 'string' ? JSON.stringify(value) : String(value);
}

function normalizeTsExpression(expression) {
  if (ts.isParenthesizedExpression(expression)) return normalizeTsExpression(expression.expression);
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return quoteLiteral(expression.text);
  if (ts.isNumericLiteral(expression)) return expression.text;
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return 'true';
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return 'false';
  if (expression.kind === ts.SyntaxKind.NullKeyword) return 'null';
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return `${normalizeTsExpression(expression.expression)}.${expression.name.text}`;
  return expression.getText().replace(/\s+/g, '');
}

function normalizeEslintExpression(expression, sourceCode) {
  if (!expression) return '';
  if (expression.type === 'Literal') return quoteLiteral(expression.value);
  if (expression.type === 'Identifier') return expression.name;
  if (expression.type === 'MemberExpression' && !expression.computed) {
    return `${normalizeEslintExpression(expression.object, sourceCode)}.${normalizeEslintExpression(expression.property, sourceCode)}`;
  }
  return sourceCode.getText(expression).replace(/\s+/g, '');
}

function tsAttributeValue(attribute) {
  if (!attribute.initializer) return 'true';
  if (ts.isStringLiteral(attribute.initializer)) return quoteLiteral(attribute.initializer.text);
  if (ts.isJsxExpression(attribute.initializer)) {
    return attribute.initializer.expression ? normalizeTsExpression(attribute.initializer.expression) : '';
  }
  return attribute.initializer.getText().replace(/\s+/g, '');
}

function eslintAttributeValue(attribute, sourceCode) {
  if (!attribute.value) return 'true';
  if (attribute.value.type === 'Literal') return quoteLiteral(attribute.value.value);
  if (attribute.value.type === 'JSXExpressionContainer') {
    return normalizeEslintExpression(attribute.value.expression, sourceCode);
  }
  return sourceCode.getText(attribute.value).replace(/\s+/g, '');
}

function violationFor(prop, value) {
  if (prop === 'numberOfLines') return { kind: 'truncation', prop, value };
  if (prop === 'ellipsizeMode') return { kind: 'ellipsis', prop, value };
  if (prop === 'allowFontScaling' && value === 'false') return { kind: 'font-scaling-disabled', prop, value };
  return null;
}

function tsOwnerName(node) {
  if (ts.isFunctionDeclaration(node) && node.name) return node.name.text;
  if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node))) {
    if (node.name) return node.name.text;
    if (node.parent && ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) {
      return node.parent.name.text;
    }
    if (node.parent && ts.isPropertyAssignment(node.parent)) return node.parent.name.getText();
  }
  if (ts.isMethodDeclaration(node) && node.name) return node.name.getText();
  return null;
}

function tsOwnerAncestry(node) {
  const owners = [];
  for (let current = node; current; current = current.parent) {
    const owner = tsOwnerName(current);
    if (owner) owners.unshift(owner);
  }
  return owners;
}

function tsAncestorPath(opening) {
  const names = [typescriptJsxName(opening.tagName)];
  for (let current = opening.parent; current; current = current.parent) {
    if (ts.isJsxElement(current) && current.openingElement !== opening) {
      names.push(typescriptJsxName(current.openingElement.tagName));
    } else if (ts.isJsxSelfClosingElement(current) && current !== opening) {
      names.push(typescriptJsxName(current.tagName));
    }
  }
  return names.reverse();
}

function structuralIdentitiesFromTypescript(opening, file) {
  const attributes = opening.attributes.properties.filter(ts.isJsxAttribute);
  const testIdAttribute = attributes.find((attribute) => attribute.name.text === 'testID');
  const owners = tsOwnerAncestry(opening);
  const base = {
    file,
    ownerName: owners.at(-1) || '<module>',
    ownerPath: owners.join('>') || '<module>',
    ancestorPath: tsAncestorPath(opening),
    tag: typescriptJsxName(opening.tagName),
    testID: testIdAttribute ? tsAttributeValue(testIdAttribute) : null,
  };
  const identities = [];
  for (const attribute of attributes) {
    const prop = attribute.name.text;
    const value = tsAttributeValue(attribute);
    const violation = violationFor(prop, value);
    if (violation) identities.push(canonicalGroup({ ...base, ...violation }));
  }
  return identities;
}

function eslintOwnerName(node, parent) {
  if ((node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') && node.id) {
    return node.id.name;
  }
  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
    if (parent && parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') return parent.id.name;
    if (parent && (parent.type === 'Property' || parent.type === 'MethodDefinition')) {
      return parent.key.name || String(parent.key.value || '<anonymous>');
    }
  }
  return null;
}

function eslintOwnerAncestry(ancestors) {
  const owners = [];
  for (let index = 0; index < ancestors.length; index += 1) {
    const owner = eslintOwnerName(ancestors[index], ancestors[index - 1]);
    if (owner) owners.push(owner);
  }
  return owners;
}

function structuralIdentityFromEslint(node, options) {
  const sourceCode = options.sourceCode;
  const ancestors = sourceCode.getAncestors(node);
  const tag = eslintJsxName(node.name);
  const ancestorPath = ancestors
    .filter((ancestor) => ancestor.type === 'JSXElement' && ancestor.openingElement !== node)
    .map((ancestor) => eslintJsxName(ancestor.openingElement.name));
  ancestorPath.push(tag);
  const attributes = node.attributes.filter((attribute) => attribute.type === 'JSXAttribute');
  const testIdAttribute = attributes.find((attribute) => attribute.name.name === 'testID');
  const owners = eslintOwnerAncestry(ancestors);
  const base = {
    file: options.filename,
    ownerName: owners.at(-1) || '<module>',
    ownerPath: owners.join('>') || '<module>',
    ancestorPath,
    tag,
    testID: testIdAttribute ? eslintAttributeValue(testIdAttribute, sourceCode) : null,
  };
  const identities = [];
  for (const attribute of attributes) {
    const prop = attribute.name.name;
    const value = eslintAttributeValue(attribute, sourceCode);
    const violation = violationFor(prop, value);
    if (violation) identities.push(canonicalGroup({ ...base, ...violation }));
  }
  return identities;
}

function scanTextIntegrity(root, relativeFiles) {
  const groupsByFingerprint = new Map();
  const files = [...new Set(relativeFiles.map(normalizeRelativePath))].sort();
  let unsafeSites = 0;

  for (const relativeFile of files) {
    const absoluteFile = path.resolve(root, ...relativeFile.split('/'));
    const source = fs.readFileSync(absoluteFile, 'utf8');
    const sourceFile = ts.createSourceFile(
      relativeFile,
      source,
      ts.ScriptTarget.Latest,
      true,
      relativeFile.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    if (sourceFile.parseDiagnostics.length > 0) {
      const diagnostic = [...sourceFile.parseDiagnostics].sort((left, right) => {
        return (left.start ?? 0) - (right.start ?? 0) || left.code - right.code;
      })[0];
      const location = sourceFile.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
      throw new Error(
        `Text integrity parse error: ${relativeFile} TS${diagnostic.code} ${location.line + 1}:${location.character + 1}`,
      );
    }
    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        for (const identity of structuralIdentitiesFromTypescript(node, relativeFile)) {
          unsafeSites += 1;
          const fingerprint = fingerprintGroup(identity);
          const lineHint = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
          const existing = groupsByFingerprint.get(fingerprint);
          if (existing) {
            existing.count += 1;
            existing.lineHints.push(lineHint);
          } else {
            groupsByFingerprint.set(fingerprint, { ...identity, fingerprint, count: 1, lineHints: [lineHint] });
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }

  const groups = [...groupsByFingerprint.values()]
    .map((group) => ({ ...group, lineHints: group.lineHints.sort((a, b) => a - b) }))
    .sort((left, right) => left.fingerprint.localeCompare(right.fingerprint));
  return { files: files.length, unsafeSites, unsafeGroups: groups.length, groups };
}

module.exports = {
  auditAgainstBaseline,
  bootstrapBaseline,
  canonicalGroup,
  collectProductionFiles,
  fingerprintGroup,
  loadAndValidateBaseline,
  publishNoClobber,
  scanTextIntegrity,
  structuralIdentityFromEslint,
  updateBaselineShrinkOnly,
  writeBootstrapAtomic,
};
