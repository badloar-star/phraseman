#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const REQUIRED_FIELDS = [
  'Priority',
  'Severity',
  'Status',
  'Asset',
  'Threat',
  'Impact',
  'Likelihood',
  'Treatment',
  'Owner',
  'Owner status',
  'Due/review date',
  'Linked control',
  'Acceptance decision',
  'Acceptance expiry',
];

const REQUIRED_AUDIT_IDS = [
  'AUDIT-P1-DEPENDENCIES',
  'AUDIT-P1-CONTROL-SYSTEM',
  'AUDIT-P1-ADMIN-MONOLITH',
  'AUDIT-P1-RELEASE-CONTRACT',
  'AUDIT-P1-RESPONSE-RECOVERY',
  'AUDIT-P2-WEBSITE-HEADERS',
  'AUDIT-P2-DOM-SINKS',
  'AUDIT-P2-PERFORMANCE-BUDGET',
  'AUDIT-P2-REPO-GOVERNANCE',
  'AUDIT-P2-ARCHITECTURE-MAP',
  'AUDIT-P2-UX-JOURNEYS',
];

function parseCli(argv) {
  const allowed = new Set(['--file', '--as-of']);
  const seen = new Set();
  const values = {
    file: 'docs/security/RISK_REGISTER.md',
    asOf: new Date().toISOString().slice(0, 10),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!allowed.has(flag)) throw new Error(`unknown argument: ${flag}`);
    if (seen.has(flag)) throw new Error(`duplicate argument: ${flag}`);
    seen.add(flag);

    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`missing value for ${flag}`);
    }
    if (flag === '--file') values.file = value;
    if (flag === '--as-of') values.asOf = value;
    index += 1;
  }

  return values;
}

function parseDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function parseRecords(markdown) {
  const headings = [...markdown.matchAll(/^##\s+([A-Z0-9-]+)\s*$/gm)];
  return headings.map((heading, index) => {
    const id = heading[1];
    const start = heading.index + heading[0].length;
    const end = headings[index + 1]?.index ?? markdown.length;
    const body = markdown.slice(start, end);
    const fields = new Map();
    const duplicates = [];

    for (const match of body.matchAll(/^- ([^:\n]+):[ \t]*(.*)$/gm)) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (fields.has(key)) duplicates.push(key);
      fields.set(key, value);
    }

    return { id, fields, duplicates };
  });
}

function validate(markdown, asOfText) {
  const errors = [];
  const asOf = parseDate(asOfText);
  if (!asOf) return [`invalid --as-of date: ${asOfText}`];

  const records = parseRecords(markdown);
  const ids = new Set();

  for (const record of records) {
    if (ids.has(record.id)) errors.push(`${record.id}: duplicate risk ID`);
    ids.add(record.id);

    for (const duplicate of record.duplicates) {
      errors.push(`${record.id}: duplicate ${duplicate}`);
    }
    for (const field of REQUIRED_FIELDS) {
      if (!record.fields.get(field)?.trim()) errors.push(`${record.id}: missing ${field}`);
    }

    const priority = record.fields.get('Priority');
    if (priority && !['P0', 'P1', 'P2', 'P3'].includes(priority)) {
      errors.push(`${record.id}: invalid Priority ${priority}`);
    }
    const idPriority = /^AUDIT-(P[0-3])-/.exec(record.id)?.[1];
    if (idPriority && priority && priority !== idPriority) {
      errors.push(`${record.id}: Priority ${priority} does not match ID priority ${idPriority}`);
    }

    const severity = record.fields.get('Severity');
    if (severity && !['Critical', 'High', 'Medium', 'Low'].includes(severity)) {
      errors.push(`${record.id}: invalid Severity ${severity}`);
    }

    const status = record.fields.get('Status');
    if (status && !['Open', 'Blocked', 'Contained', 'Closed'].includes(status)) {
      errors.push(`${record.id}: invalid Status ${status}`);
    }

    const likelihood = record.fields.get('Likelihood');
    if (likelihood && !['Rare', 'Unlikely', 'Possible', 'Likely', 'AlmostCertain'].includes(likelihood)) {
      errors.push(`${record.id}: invalid Likelihood ${likelihood}`);
    }

    const treatment = record.fields.get('Treatment');
    if (treatment && !['Mitigate', 'Accept', 'Avoid', 'Transfer'].includes(treatment)) {
      errors.push(`${record.id}: invalid Treatment ${treatment}`);
    }

    const owner = record.fields.get('Owner')?.trim() ?? '';
    const ownerStatus = record.fields.get('Owner status');
    if (ownerStatus && !['Assigned', 'Blocked'].includes(ownerStatus)) {
      errors.push(`${record.id}: invalid Owner status ${ownerStatus}`);
    }
    const normalizedOwner = owner.toLowerCase().replace(/\s+/g, ' ');
    const hasOwnerPlaceholder = /\b(?:pending|blocked|tbd|unknown|unassigned|none)\b/i.test(normalizedOwner)
      || /\b(?:no accountable owner|to be determined)\b/i.test(normalizedOwner);
    if (
      ['Critical', 'High'].includes(severity)
      && (ownerStatus !== 'Assigned' || hasOwnerPlaceholder)
    ) {
      errors.push(`${record.id}: high risk has no accountable owner`);
    }

    const dateText = record.fields.get('Due/review date');
    const dueDate = dateText ? parseDate(dateText) : null;
    if (dateText && !dueDate) errors.push(`${record.id}: invalid Due/review date ${dateText}`);

    const acceptanceDecision = record.fields.get('Acceptance decision');
    const acceptanceExpiryText = record.fields.get('Acceptance expiry');
    if (acceptanceDecision && !['NotAccepted', 'Pending', 'Approved', 'Rejected'].includes(acceptanceDecision)) {
      errors.push(`${record.id}: invalid Acceptance decision ${acceptanceDecision}`);
    }
    if (treatment === 'Accept' && acceptanceDecision !== 'Approved') {
      errors.push(`${record.id}: acceptance treatment is not approved`);
    }
    if (acceptanceDecision === 'Approved') {
      const acceptanceExpiry = acceptanceExpiryText ? parseDate(acceptanceExpiryText) : null;
      if (!acceptanceExpiry) {
        errors.push(`${record.id}: approved acceptance requires explicit expiry`);
      } else if (acceptanceExpiry < asOf) {
        errors.push(`${record.id}: approved acceptance expired`);
      } else if (acceptanceExpiry.getTime() === asOf.getTime()) {
        errors.push(`${record.id}: approved acceptance expiry must be in the future`);
      }
    }
  }

  for (const id of REQUIRED_AUDIT_IDS) {
    if (!ids.has(id)) errors.push(`missing audit finding ${id}`);
  }

  return errors;
}

try {
  const cli = parseCli(process.argv.slice(2));
  const file = path.resolve(cli.file);
  const asOf = cli.asOf;
  const markdown = await readFile(file, 'utf8');
  const errors = validate(markdown, asOf);
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else {
    const risks = parseRecords(markdown).length;
    console.log(`risk_register_ok risks=${risks} audit_findings=${REQUIRED_AUDIT_IDS.length}`);
  }
} catch (error) {
  console.error(`risk register unavailable: ${error.message}`);
  process.exitCode = 1;
}
