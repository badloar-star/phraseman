import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const ADMIN_INDEX = path.join(ROOT, 'admin', 'index.html');
const OUT_DIR = path.join(ROOT, 'docs', 'gustav', 'generated', 'admin_parity');
const OUT_JSON = path.join(OUT_DIR, 'admin_website_parity_atlas.json');
const OUT_MD = path.join(OUT_DIR, 'admin_website_parity_atlas.md');

const LEARNING_KEYWORDS = [
  'lesson',
  'lessons',
  'course',
  'pack',
  'packs',
  'quiz',
  'quizzes',
  'prompt',
  'ai',
  'audio',
  'flashcard',
  'card',
  'arena',
  'practice',
  'training',
  'trainer',
  'review',
  'reviewer',
  'diagnostic',
  'exam',
  'vocabulary',
  'word',
  'daily',
  'phrase',
  'french',
  'fr',
  'english',
  'en',
  'upload',
  'download',
  'activation',
  'activate',
  'rollback',
  'firebase',
  'storage',
  'server',
];

const ACTION_KEYWORDS = [
  'onclick',
  'data-action',
  'upload',
  'download',
  'publish',
  'activate',
  'rollback',
  'review',
  'validate',
  'refresh',
  'load',
  'save',
  'delete',
  'close',
  'cleanup',
];

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function cleanText(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function attr(tag, name) {
  const re = new RegExp(`${name}\\s*=\\s*(["'])(.*?)\\1`, 'is');
  return tag.match(re)?.[2] ?? '';
}

function keywordHits(text) {
  const lower = text.toLowerCase();
  return LEARNING_KEYWORDS.filter((keyword) => lower.includes(keyword));
}

function actionHits(text) {
  const lower = text.toLowerCase();
  return ACTION_KEYWORDS.filter((keyword) => lower.includes(keyword));
}

function collectTabs(html) {
  const tabs = [];
  const re = /<(?:button|a|div)\b[^>]*class=["'][^"']*\btab\b[^"']*["'][^>]*>[\s\S]*?<\/(?:button|a|div)>/gi;
  for (const match of html.matchAll(re)) {
    const raw = match[0];
    const switchTab = raw.match(/switchTab\((["'])(.*?)\1\)/i)?.[2] ?? '';
    const id = switchTab ? `tab-${switchTab}` : attr(raw, 'data-tab') || attr(raw, 'id');
    const group = attr(raw, 'data-admin-group');
    const title = cleanText(raw);
    const hits = keywordHits(`${id} ${group} ${title}`);
    tabs.push({
      id,
      group,
      title,
      line: lineNumberForIndex(html, match.index ?? 0),
      learningContentRelevant: hits.length > 0,
      keywordHits: hits,
    });
  }
  return tabs;
}

function collectSections(html) {
  const sections = [];
  const re = /<div\b[^>]*id=(["'])(tab-[^"']+)\1[^>]*class=(["'])(?:(?!\3).)*\b(?:reports-tab|users-tab)\b(?:(?!\3).)*\3[^>]*>/gi;
  for (const match of html.matchAll(re)) {
    const id = match[2];
    const start = match.index ?? 0;
    const next = html.slice(start + match[0].length).search(/<div\b[^>]*id=(["'])tab-/i);
    const end = next >= 0 ? start + match[0].length + next : Math.min(html.length, start + 12000);
    const slice = html.slice(start, end);
    const hits = keywordHits(slice);
    const actions = actionHits(slice);
    const buttonCount = (slice.match(/<button\b/gi) || []).length;
    sections.push({
      id,
      line: lineNumberForIndex(html, start),
      byteStart: start,
      byteEnd: end,
      learningContentRelevant: hits.length > 0,
      keywordHits: hits,
      actionHits: actions,
      buttonCount,
      titleSample: cleanText(slice.slice(0, 800)).slice(0, 160),
    });
  }
  return sections;
}

function collectButtons(html) {
  const buttons = [];
  const re = /<button\b[\s\S]*?<\/button>/gi;
  for (const match of html.matchAll(re)) {
    const raw = match[0];
    const id = attr(raw, 'id');
    const dataAction = attr(raw, 'data-action');
    const onclick = attr(raw, 'onclick');
    const tab = nearestTabId(html, match.index ?? 0);
    const label = cleanText(raw);
    const hits = keywordHits(`${id} ${dataAction} ${onclick} ${label} ${tab}`);
    const actions = actionHits(`${id} ${dataAction} ${onclick} ${label}`);
    if (!hits.length && !actions.length) continue;
    buttons.push({
      id,
      tab,
      line: lineNumberForIndex(html, match.index ?? 0),
      label: label.slice(0, 120),
      dataAction,
      onclick: onclick.slice(0, 180),
      learningContentRelevant: hits.length > 0,
      keywordHits: hits,
      actionHits: actions,
    });
  }
  return buttons;
}

function nearestTabId(html, index) {
  const before = html.slice(Math.max(0, index - 20000), index);
  const matches = [...before.matchAll(/<section\b[^>]*id=(["'])(tab-[^"']+)\1[^>]*>/gi)];
  return matches.length ? matches[matches.length - 1][2] : '';
}

function buildReport() {
  const html = fs.readFileSync(ADMIN_INDEX, 'utf8');
  const tabs = collectTabs(html);
  const sections = collectSections(html);
  const buttons = collectButtons(html);
  const learningTabs = tabs.filter((tab) => tab.learningContentRelevant);
  const learningSections = sections.filter((section) => section.learningContentRelevant);
  const learningButtons = buttons.filter((button) => button.learningContentRelevant);
  const frenchHits = sections.filter((section) => section.keywordHits.includes('french') || section.keywordHits.includes('fr'));
  const englishHits = sections.filter((section) => section.keywordHits.includes('english') || section.keywordHits.includes('en'));

  return {
    schemaVersion: 'gustav-admin-website-parity-atlas-v1',
    generatedAt: new Date().toISOString(),
    adminIndex: path.relative(ROOT, ADMIN_INDEX).replace(/\\/g, '/'),
    adminIndexSha256: sha256(html),
    status: 'HOLD',
    activationApproved: false,
    summary: {
      tabCount: tabs.length,
      sectionCount: sections.length,
      actionButtonCount: buttons.length,
      learningRelevantTabCount: learningTabs.length,
      learningRelevantSectionCount: learningSections.length,
      learningRelevantButtonCount: learningButtons.length,
      frenchMentionSectionCount: frenchHits.length,
      englishMentionSectionCount: englishHits.length,
    },
    blockers: [
      'Admin website parity is not proven until each learning-relevant English admin section/action has an explicit target-aware French equivalent or global-only exception.',
      'This atlas is discovery only; it does not authorize admin writes, server upload, runtime activation or production approval.',
    ],
    tabs,
    sections,
    buttons,
    nextRequiredPackets: [
      'admin_english_learning_surface_matrix',
      'admin_french_target_equivalence_matrix',
      'admin_write_path_isolation_gate',
      'admin_activation_rollback_french_gate',
      'admin_ui_bible_compliance_check',
    ],
  };
}

function renderMarkdown(report) {
  const lines = [
    '# Gustav Admin Website Parity Atlas',
    '',
    `Status: \`${report.status}\``,
    '',
    `Admin index: \`${report.adminIndex}\``,
    '',
    `SHA-256: \`${report.adminIndexSha256}\``,
    '',
    '## Summary',
    '',
    `- Tabs: ${report.summary.tabCount}`,
    `- Sections: ${report.summary.sectionCount}`,
    `- Action buttons: ${report.summary.actionButtonCount}`,
    `- Learning-relevant tabs: ${report.summary.learningRelevantTabCount}`,
    `- Learning-relevant sections: ${report.summary.learningRelevantSectionCount}`,
    `- Learning-relevant buttons: ${report.summary.learningRelevantButtonCount}`,
    `- Sections mentioning French/fr: ${report.summary.frenchMentionSectionCount}`,
    `- Sections mentioning English/en: ${report.summary.englishMentionSectionCount}`,
    '',
    '## Blockers',
    '',
    ...report.blockers.map((item) => `- ${item}`),
    '',
    '## Learning-Relevant Sections',
    '',
  ];

  for (const section of report.sections.filter((item) => item.learningContentRelevant).slice(0, 80)) {
    lines.push(`- \`${section.id}\` line ${section.line}: hits=${section.keywordHits.join(', ') || '-'} buttons=${section.buttonCount}`);
  }

  lines.push('', '## Next Required Packets', '');
  for (const packet of report.nextRequiredPackets) lines.push(`- \`${packet}\``);
  lines.push('');
  return lines.join('\n');
}

const report = buildReport();
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(OUT_MD, renderMarkdown(report));
console.log(`Gustav admin website parity atlas: ${report.status}`);
console.log(`Learning sections: ${report.summary.learningRelevantSectionCount}`);
console.log(`Learning buttons: ${report.summary.learningRelevantButtonCount}`);
console.log(path.relative(ROOT, OUT_JSON).replace(/\\/g, '/'));
