import fs from 'node:fs';
import { specificGuidanceForControl } from '../admin/v2/scripts/admin-guidance.js';

const source = fs.readFileSync('admin/v2/scripts/admin-core.js', 'utf8');
const tags = [...source.matchAll(/<(button|a)\b[^>]*>/g)];
const missing = [];

function attribute(tag, name) {
  return (tag.match(new RegExp(`${name}="([^"]*)"`, 'i')) || [])[1] || '';
}

for (const match of tags) {
  const tag = match[0];
  if (/(?:title|data-tooltip|aria-label)=/i.test(tag)) continue;
  const guidance = specificGuidanceForControl({
    action: attribute(tag, 'data-action'),
    href: attribute(tag, 'href'),
    supportFilter: attribute(tag, 'data-support-filter'),
    resolution: attribute(tag, 'data-resolution'),
    status: attribute(tag, 'data-status'),
    factoryStep: attribute(tag, 'data-factory-step'),
    className: attribute(tag, 'class'),
  });
  if (!guidance) {
    missing.push({
      line: source.slice(0, match.index).split(/\r?\n/).length,
      tag: tag.slice(0, 240),
    });
  }
}

console.log(JSON.stringify({ controls: tags.length, explicitOrSpecific: tags.length - missing.length, missing }, null, 2));
if (missing.length) process.exit(1);
