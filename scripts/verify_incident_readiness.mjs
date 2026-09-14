import fs from 'node:fs';

const response = fs.readFileSync('docs/operations/INCIDENT_RESPONSE.md', 'utf8');
const template = fs.readFileSync('docs/operations/INCIDENT_TEMPLATE.md', 'utf8');
const tabletop = fs.readFileSync('docs/operations/TABLETOP_LOG.md', 'utf8');
for (const heading of ['## Severity', '## Roles', '## First response', '## Alert-to-runbook map']) {
  if (!response.includes(heading)) throw new Error(`incident_section_missing:${heading}`);
}
for (const field of ['Incident ID:', 'Severity:', 'Incident commander:', 'Verified facts:', 'Evidence references/checksums:']) {
  if (!template.includes(field)) throw new Error(`incident_template_field_missing:${field}`);
}
for (const marker of ['NOT_RUN_PENDING_OWNER', 'no production state changed', 'Required lessons']) {
  if (!tabletop.includes(marker)) throw new Error(`tabletop_marker_missing:${marker}`);
}
const alertRows = [...response.matchAll(/^\| `([^`]+)` \|/gm)].map((match) => match[1]);
if (alertRows.length < 4 || new Set(alertRows).size !== alertRows.length) throw new Error('incident_alert_map_incomplete');
console.log(`incident_readiness_ok alerts=${alertRows.length} tabletop=not_run`);
