#!/usr/bin/env node

const path = require('path');
const {
  buildReportText,
  collectTelegramAttachments,
  getSessionTitle,
  loadConfig,
  loadState,
  normalizeHookInput,
  saveState,
  withTelegramSendLock,
} = require('./core.cjs');
const { sendCleanSessionReport } = require('./delivery.cjs');
const { writeControlCenter } = require('./control-center.cjs');
const { renderReportScreenshot } = require('./report-screenshot.cjs');

async function readStdin() {
  if (process.stdin.isTTY) return '';
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => resolve(data), 600);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(data); });
    process.stdin.resume();
  });
}

function parseInput(raw) {
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { message: raw.trim() };
  }
}

async function main() {
  const config = loadConfig();
  if (!config.botToken || !config.defaultChatId) {
    console.log('[telegram-bridge] Skipped: botToken/defaultChatId is not configured.');
    return;
  }

  const raw = await readStdin();
  const hookInput = parseInput(raw);
  const report = normalizeHookInput(hookInput, config);
  const text = buildReportText(report);
  const state = loadState(config.statePath);
  const chatTitle = getSessionTitle(report.sessionId, {
    sessionIndexPath: config.sessionIndexPath,
    projectName: report.projectName,
  });
  let sent = null;
  await withTelegramSendLock(config, async () => {
    let screenshot = null;
    if (config.telegramReportScreenshots === true) {
      screenshot = await renderReportScreenshot({
        chatTitle,
        sessionId: report.sessionId,
        text,
        outputDir: path.join(path.dirname(config.statePath), 'report-screenshots'),
      });
    }
    const materials = collectTelegramAttachments({
      projectRoot: report.projectRoot || config.projectRoot,
      files: report.filesChanged,
      text,
      includeRecentArtifacts: true,
      artifactRoots: config.telegramArtifactScanRoots,
      recentWindowMs: config.telegramArtifactScanWindowMs,
      recentMaxFiles: config.telegramArtifactScanMaxFiles,
      maxBytes: config.telegramAttachmentMaxBytes,
      photoMaxBytes: config.telegramPhotoMaxBytes,
      limit: config.telegramAttachmentLimit,
    }).filter((attachment) => attachment.path !== screenshot?.path);
    sent = await sendCleanSessionReport(config, state, config.defaultChatId, {
      text,
      screenshotPath: screenshot?.path,
      route: {
        sessionId: report.sessionId,
        projectRoot: report.projectRoot,
        projectName: report.projectName,
        chatTitle,
      },
      chatTitle,
      summary: report.summary,
      materials,
    });
    writeControlCenter(config, state);
  });
  saveState(config.statePath, state);

  console.log(`[telegram-bridge] Sent clean report to Telegram message ${sent?.message_id || 'unknown'}.`);
}

main().catch((error) => {
  console.log(`[telegram-bridge] ${error.message}`);
  process.exitCode = 0;
});
