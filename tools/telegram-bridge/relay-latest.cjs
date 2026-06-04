#!/usr/bin/env node

const crypto = require('crypto');
const path = require('path');
const {
  collectTelegramAttachments,
  collectFreshFinalAgentMessages,
  findLatestCodexSessionFile,
  getSessionTitle,
  loadConfig,
  loadState,
  readLatestFinalAgentMessageRecord,
  readSessionMeta,
  saveState,
  upsertRoute,
  withTelegramSendLock,
} = require('./core.cjs');
const { sendCleanSessionReport } = require('./delivery.cjs');
const { renderReportScreenshot } = require('./report-screenshot.cjs');
const { writeControlCenter } = require('./control-center.cjs');

function messageHash(sessionId, timestamp, text) {
  return crypto
    .createHash('sha256')
    .update(`${sessionId}\n${timestamp || ''}\n${text}`)
    .digest('hex');
}

function legacyMessageHash(sessionId, text) {
  return crypto
    .createHash('sha256')
    .update(`${sessionId}\n${text}`)
    .digest('hex');
}

function mergeRelayState(target, source) {
  target.routes = {
    ...(target.routes || {}),
    ...(source.routes || {}),
  };
  target.relayedAgentMessages = {
    ...(target.relayedAgentMessages || {}),
    ...(source.relayedAgentMessages || {}),
  };
  target.lastUpdateId = Math.max(Number(target.lastUpdateId || 0), Number(source.lastUpdateId || 0));
  target.updatedAt = source.updatedAt || target.updatedAt;
}

async function relayRecord(config, state, record) {
  const hash = messageHash(record.sessionId, record.timestamp, record.text);
  const oldHash = legacyMessageHash(record.sessionId, record.text);
  if (!state.relayedAgentMessages) state.relayedAgentMessages = {};
  if (state.relayedAgentMessages[hash] || state.relayedAgentMessages[oldHash]) return false;

  let sentRecord = false;
  await withTelegramSendLock(config, async () => {
    const lockedState = loadState(config.statePath);
    if (!lockedState.relayedAgentMessages) lockedState.relayedAgentMessages = {};
    if (lockedState.relayedAgentMessages[hash] || lockedState.relayedAgentMessages[oldHash]) {
      mergeRelayState(state, lockedState);
      return;
    }

    let screenshot = null;
    if (config.telegramReportScreenshots === true) {
      screenshot = await renderReportScreenshot({
        chatTitle: record.chatTitle,
        sessionId: record.sessionId,
        text: record.text,
        outputDir: path.join(path.dirname(config.statePath), 'report-screenshots'),
      });
    }
    const materials = (record.attachments || []).filter((attachment) => attachment.path !== screenshot?.path);
    await sendCleanSessionReport(config, lockedState, config.defaultChatId, {
      text: record.text,
      screenshotPath: screenshot?.path,
      route: {
        sessionId: record.sessionId,
        projectRoot: record.projectRoot || config.projectRoot,
        projectName: record.projectName || config.projectName,
        chatTitle: record.chatTitle,
      },
      chatTitle: record.chatTitle,
      summary: 'Финальный ответ Codex',
      materials,
    });
    writeControlCenter(config, lockedState);
    lockedState.relayedAgentMessages[hash] = new Date().toISOString();
    saveState(config.statePath, lockedState);
    mergeRelayState(state, lockedState);
    sentRecord = true;
  });
  return sentRecord;
}

async function relayFreshFinalMessages(config = loadConfig()) {
  if (process.env.TELEGRAM_BRIDGE_SUPPRESS_RELAY === '1') {
    console.log('[telegram-bridge] relay skipped: suppressed by parent bridge process.');
    return 0;
  }

  if (!config.botToken || !config.defaultChatId) {
    console.log('[telegram-bridge] relay skipped: Telegram is not configured.');
    return 0;
  }

  let records = [];
  if (config.relayAllSessions) {
    records = collectFreshFinalAgentMessages({
      sessionsRoot: config.codexSessionsRoot,
      sessionIndexPath: config.sessionIndexPath,
      maxAgeMs: config.relayMaxAgeMs,
      maxAttachmentBytes: config.telegramAttachmentMaxBytes,
      photoMaxBytes: config.telegramPhotoMaxBytes,
      attachmentLimit: config.telegramAttachmentLimit,
      artifactRoots: config.telegramArtifactScanRoots,
      artifactScanWindowMs: config.telegramArtifactScanWindowMs,
      artifactScanMaxFiles: config.telegramArtifactScanMaxFiles,
    });
  } else {
    const sessionFile = findLatestCodexSessionFile({
      sessionsRoot: config.codexSessionsRoot,
      cwd: config.projectRoot,
    });
    if (sessionFile) {
      const meta = readSessionMeta(sessionFile);
      const finalRecord = readLatestFinalAgentMessageRecord(sessionFile);
      const text = finalRecord?.message?.trim() || '';
      const ageMs = finalRecord?.timestamp ? Date.now() - Date.parse(finalRecord.timestamp) : NaN;
      if (meta?.id && text && Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= config.relayMaxAgeMs) {
        records.push({
          filePath: sessionFile,
          sessionId: meta.id,
          projectRoot: meta.cwd || config.projectRoot,
          projectName: config.projectName,
          chatTitle: getSessionTitle(meta.id, { sessionIndexPath: config.sessionIndexPath, projectName: config.projectName }),
          text,
          attachments: collectTelegramAttachments({
            projectRoot: meta.cwd || config.projectRoot,
            text,
            includeRecentArtifacts: true,
            artifactRoots: config.telegramArtifactScanRoots,
            recentNowMs: Date.parse(finalRecord.timestamp),
            recentWindowMs: config.telegramArtifactScanWindowMs,
            recentMaxFiles: config.telegramArtifactScanMaxFiles,
            maxBytes: config.telegramAttachmentMaxBytes,
            photoMaxBytes: config.telegramPhotoMaxBytes,
            limit: config.telegramAttachmentLimit,
          }),
          timestamp: finalRecord.timestamp,
        });
      }
    }
  }

  if (records.length === 0) {
    console.log('[telegram-bridge] relay skipped: no fresh final assistant messages found.');
    return 0;
  }
  const state = loadState(config.statePath);
  let sentCount = 0;
  for (const record of records) {
    if (await relayRecord(config, state, record)) sentCount += 1;
  }
  saveState(config.statePath, state);
  if (sentCount === 0) {
    console.log('[telegram-bridge] relay skipped: fresh final assistant messages already sent.');
  } else {
    console.log(`[telegram-bridge] relayed ${sentCount} final assistant message(s).`);
  }
  return sentCount;
}

async function main() {
  await relayFreshFinalMessages(loadConfig());
}

if (require.main === module) {
  main().catch((error) => {
    console.log(`[telegram-bridge] relay failed: ${error.message}`);
    process.exitCode = 0;
  });
}

module.exports = {
  legacyMessageHash,
  messageHash,
  relayRecord,
  relayFreshFinalMessages,
};
