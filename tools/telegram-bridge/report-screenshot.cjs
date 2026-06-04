const crypto = require('crypto');
const path = require('path');
const { ensureDirFor, stripTelegramHtml } = require('./core.cjs');

const DEFAULT_WIDTH = 1200;
const PADDING = 48;
const LINE_HEIGHT = 32;
const TITLE_LINE_HEIGHT = 42;
const MAX_LINES = 120;

function normalizeScreenshotName(value) {
  return String(value || 'report')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'report';
}

function escapeSvg(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function plainReportText(text) {
  return stripTelegramHtml(String(text || ''))
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-zA-Z0-9_-]*/g, '').replace(/```/g, ''))
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2')
    .replace(/(^|[^_])_([^_\n]+)_/g, '$1$2')
    .trim();
}

function wrapLine(line, maxChars) {
  const words = String(line || '').split(/(\s+)/).filter((part) => part.length > 0);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (/^\s+$/.test(word)) {
      if (current && !current.endsWith(' ')) current += ' ';
      continue;
    }
    if (!current) {
      current = word;
      continue;
    }
    if ((current + word).length <= maxChars) {
      current += word;
      continue;
    }
    lines.push(current.trimEnd());
    current = word;
  }
  if (current) lines.push(current.trimEnd());
  return lines.length ? lines : [''];
}

function wrapReportText(text, maxChars = 78) {
  const lines = [];
  for (const rawLine of plainReportText(text).split(/\r?\n/)) {
    if (!rawLine.trim()) {
      lines.push('');
      continue;
    }
    lines.push(...wrapLine(rawLine, maxChars));
    if (lines.length >= MAX_LINES) break;
  }
  if (lines.length >= MAX_LINES) {
    lines[MAX_LINES - 1] = `${lines[MAX_LINES - 1].replace(/\s*$/, '')} ...`;
  }
  return lines;
}

function buildReportScreenshotSvg(chatTitle, text, options = {}) {
  const width = Number(options.width || DEFAULT_WIDTH);
  const bodyLines = wrapReportText(text, Math.max(48, Math.floor((width - PADDING * 2) / 14)));
  const height = PADDING * 2 + TITLE_LINE_HEIGHT + bodyLines.length * LINE_HEIGHT + 28;
  const title = String(chatTitle || 'Codex report').trim() || 'Codex report';
  const body = bodyLines.map((line, index) => {
    const y = PADDING + TITLE_LINE_HEIGHT + 34 + index * LINE_HEIGHT;
    const isLabel = /^[^:]{1,48}:\s*$/.test(line.trim());
    const weight = isLabel ? 700 : 400;
    return `<text x="${PADDING}" y="${y}" fill="#dbeafe" font-size="22" font-weight="${weight}">${escapeSvg(line || ' ')}</text>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" rx="28" fill="#101826"/>
  <rect x="22" y="22" width="${width - 44}" height="${height - 44}" rx="22" fill="#152235" stroke="#355172" stroke-width="2"/>
  <text x="${PADDING}" y="${PADDING + 8}" fill="#ffffff" font-size="31" font-weight="800">${escapeSvg(title)}</text>
  <text x="${PADDING}" y="${PADDING + 43}" fill="#93c5fd" font-size="18" font-weight="600">Telegram report screenshot</text>
  <line x1="${PADDING}" y1="${PADDING + 62}" x2="${width - PADDING}" y2="${PADDING + 62}" stroke="#355172" stroke-width="2"/>
  ${body}
</svg>`;
}

async function renderReportScreenshot(options = {}) {
  const text = String(options.text || '').trim();
  if (!text) return null;

  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    return null;
  }

  const outputDir = options.outputDir || path.join(process.cwd(), '.codex-tmp', 'telegram-bridge', 'report-screenshots');
  const sessionPart = normalizeScreenshotName(options.sessionId || options.chatTitle || 'report');
  const hash = crypto.createHash('sha256').update(`${options.chatTitle || ''}\n${text}`).digest('hex').slice(0, 12);
  const outputPath = path.join(outputDir, `${sessionPart}-${hash}.png`);
  ensureDirFor(outputPath);

  const svg = buildReportScreenshotSvg(options.chatTitle, text, options);
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  return {
    path: outputPath,
    name: path.basename(outputPath),
    kind: 'photo',
    size: 0,
  };
}

module.exports = {
  buildReportScreenshotSvg,
  plainReportText,
  renderReportScreenshot,
  wrapReportText,
};
