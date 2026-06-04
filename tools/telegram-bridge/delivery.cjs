const {
  buildTelegramCommandKeyboard,
  escapeTelegramHtml,
  extractShortReportSummary,
  formatTelegramMessageWithHeader,
  formatTelegramReportCaption,
  getSessionTitle,
  isGenericReportSummary,
  saveState,
  upsertRoute,
} = require('./core.cjs');
const { editMessageReplyMarkup, sendDocument, sendMessage, sendPhoto } = require('./telegram-api.cjs');

function buildAttachmentCaption(chatTitle, attachment) {
  return `<b>${escapeTelegramHtml(chatTitle || 'Codex-чат')}</b>\n\n${escapeTelegramHtml(attachment.name || 'материал')}`;
}

async function attachKeyboard(config, target, route) {
  if (!target?.chat?.id || !target?.message_id) return false;
  try {
    await editMessageReplyMarkup(
      config.botToken,
      target.chat.id,
      target.message_id,
      buildTelegramCommandKeyboard(Boolean(route))
    );
    return true;
  } catch (error) {
    if (/message is not modified/i.test(error.message || '')) return true;
    console.log(`[telegram-bridge] could not attach keyboard to message ${target.message_id}: ${error.message}`);
    return false;
  }
}

async function sendTelegramAttachments(config, state, chatId, attachments, route, options = {}) {
  const attachmentList = Array.isArray(attachments) ? attachments : [];
  const includeKeyboard = options.includeKeyboard === true;
  if (attachmentList.length === 0 && !includeKeyboard) return [];
  const fallbackKeyboardMessage = options.fallbackKeyboardMessage;
  const chatTitle = getSessionTitle(route?.sessionId, {
    chatTitle: route?.chatTitle,
    sessionIndexPath: config.sessionIndexPath,
    projectName: route?.projectName || config.projectName,
  });
  const sentMessages = [];
  for (let index = 0; index < attachmentList.length; index += 1) {
    const attachment = attachmentList[index];
    const sendOptions = {
      caption: buildAttachmentCaption(chatTitle, attachment),
      parse_mode: 'HTML',
    };
    let sent;
    try {
      sent = attachment.kind === 'photo'
        ? await sendPhoto(config.botToken, chatId, attachment.path, sendOptions)
        : await sendDocument(config.botToken, chatId, attachment.path, sendOptions);
    } catch (error) {
      console.log(`[telegram-bridge] skipped attachment ${attachment.path}: ${error.message}`);
      continue;
    }
    sentMessages.push(sent);
    if (route) {
      upsertRoute(state, {
        telegramChatId: sent.chat.id,
        telegramMessageId: sent.message_id,
        sessionId: route.sessionId,
        projectRoot: route.projectRoot,
        projectName: route.projectName,
        chatTitle,
        summary: `Материал Codex: ${attachment.name}`,
      });
      saveState(config.statePath, state);
    }
  }
  if (includeKeyboard && sentMessages.length > 0) {
    await attachKeyboard(config, sentMessages[sentMessages.length - 1], route);
  }
  return sentMessages;
}

async function sendCleanSessionReport(config, state, chatId, report) {
  const route = report.route;
  const chatTitle = report.chatTitle || getSessionTitle(route?.sessionId, {
    chatTitle: route?.chatTitle,
    sessionIndexPath: config.sessionIndexPath,
    projectName: route?.projectName || config.projectName,
  });
  const text = String(report.text || '');
  const materials = Array.isArray(report.materials) ? report.materials : [];
  const replyMarkup = route ? buildTelegramCommandKeyboard(true, { hasMaterials: materials.length > 0 }) : undefined;
  const options = {
    parse_mode: 'HTML',
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  };
  let sent;

  if (report.screenshotPath) {
    sent = await sendPhoto(config.botToken, chatId, report.screenshotPath, {
      ...options,
      caption: formatTelegramReportCaption(chatTitle, text, 1000, { materialCount: materials.length }),
    });
  } else {
    const [message] = formatTelegramMessageWithHeader(chatTitle, text, 3900);
    sent = await sendMessage(config.botToken, chatId, message, options);
  }

  if (route) {
    const routeSummary = isGenericReportSummary(report.summary)
      ? extractShortReportSummary(text, 220)
      : report.summary;
    upsertRoute(state, {
      telegramChatId: sent.chat.id,
      telegramMessageId: sent.message_id,
      sessionId: route.sessionId,
      projectRoot: route.projectRoot,
      projectName: route.projectName,
      chatTitle,
      summary: routeSummary,
      materials,
    });
    saveState(config.statePath, state);
  }

  return sent;
}

module.exports = {
  sendCleanSessionReport,
  sendTelegramAttachments,
};
