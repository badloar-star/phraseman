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
    owner: String(input.owner || '<module>'),
    ownerPath: String(input.ownerPath || input.owner || '<module>'),
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
    owner: owners.at(-1) || '<module>',
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
    owner: owners.at(-1) || '<module>',
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
  canonicalGroup,
  collectProductionFiles,
  fingerprintGroup,
  scanTextIntegrity,
  structuralIdentityFromEslint,
};
