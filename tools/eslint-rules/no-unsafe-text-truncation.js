'use strict';

const path = require('node:path');
const {
  fingerprintGroup,
  loadAndValidateBaseline,
  structuralIdentityFromEslint,
} = require('../../scripts/text-integrity/inventory-core.cjs');

function normalizeFilename(filename, projectRoot) {
  const absolute = path.isAbsolute(filename) ? filename : path.resolve(projectRoot, filename);
  return path.relative(projectRoot, absolute).replace(/\\/g, '/').replace(/^\.\//, '');
}

function filenameKey(filename) {
  return process.platform === 'win32' ? filename.toLowerCase() : filename;
}

function createNoUnsafeTextTruncationRule({ baselinePath, projectRoot = process.cwd() } = {}) {
  const validatedBaseline = loadAndValidateBaseline(baselinePath || projectRoot);
  const allowedCounts = new Map(validatedBaseline.groups.map((group) => [group.fingerprint, group.count]));
  const baselineByFile = new Map();
  for (const group of validatedBaseline.groups) {
    const key = filenameKey(group.file);
    const entry = baselineByFile.get(key);
    if (entry) entry.groups.push(group);
    else baselineByFile.set(key, { canonicalFile: group.file, groups: [group] });
  }

  return {
    meta: {
      type: 'problem',
      docs: {
        description: 'Reject new raw text truncation and disabled font scaling sites',
      },
      schema: [],
      messages: {
        unsafe: 'Unsafe text integrity prop {{prop}} ({{kind}}). Choose an explicit semantic text primitive.',
        baselineMissing: 'Committed text integrity baseline site is missing. Review and shrink the baseline explicitly.',
        baselineReduced: 'Committed text integrity baseline count is reduced. Review and shrink the baseline explicitly.',
      },
    },
    create(context) {
      const seenCounts = new Map();
      const filename = normalizeFilename(context.getFilename(), projectRoot);
      const baselineFile = baselineByFile.get(filenameKey(filename));
      const identityFilename = baselineFile ? baselineFile.canonicalFile : filename;
      const expectedForFile = baselineFile ? baselineFile.groups : [];
      return {
        JSXOpeningElement(node) {
          const identities = structuralIdentityFromEslint(node, {
            filename: identityFilename,
            sourceCode: context.sourceCode,
          });
          for (const identity of identities) {
            const fingerprint = fingerprintGroup(identity);
            const seen = (seenCounts.get(fingerprint) || 0) + 1;
            seenCounts.set(fingerprint, seen);
            if (seen > (allowedCounts.get(fingerprint) || 0)) {
              context.report({
                node,
                messageId: 'unsafe',
                data: { prop: identity.prop, kind: identity.kind },
              });
            }
          }
        },
        'Program:exit'(node) {
          for (const group of expectedForFile) {
            const seen = seenCounts.get(group.fingerprint) || 0;
            if (seen < group.count) {
              context.report({
                node,
                messageId: seen === 0 ? 'baselineMissing' : 'baselineReduced',
              });
            }
          }
        },
      };
    },
  };
}

module.exports = { createNoUnsafeTextTruncationRule };
