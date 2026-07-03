#!/usr/bin/env node

console.error([
  'Rejected generator.',
  'Do not use local SVG/PIL/canvas rendering for new Chains preview packs.',
  'Use Codex/DALL-E generation, then package the exported results with:',
  '  npm run chains:preview-fresh -- --export-report <export-report.json>',
  '',
  'Required formula: premium_metaphor_v1',
  'Reference source: C:\\Users\\badlo\\OneDrive\\Desktop\\preview examples',
  'Final bank: C:\\Users\\badlo\\OneDrive\\Desktop\\банк превью',
].join('\n'));

process.exit(1);
