import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('help board product contract', () => {
  it('keeps Inbox separate and opens Help Board first from the dedicated chat icon', () => {
    const inbox = read(path.join('components', 'AppMessagesInbox.tsx'));
    const chatHub = read(path.join('components', 'CommunityChatHubButton.tsx'));
    const home = read(path.join('app', '(tabs)', 'home.tsx'));

    expect(home).toContain('<AppMessagesInbox />');
    expect(home).toContain('<CommunityChatHubButton />');
    expect(inbox).not.toContain('HelpBoardPanel');
    expect(inbox).not.toContain('LeagueChatPanel');
    expect(inbox).not.toContain("type MessagesHubTab = 'help' | 'league' | 'inbox'");

    expect(chatHub).toContain("type CommunityHubTab = 'help' | 'league'");
    expect(chatHub).toContain("const [tab, setTab] = useState<CommunityHubTab>('help')");
    expect(chatHub).toContain("setTab('help');\n    setVisible(true);");
    expect(chatHub).toContain('testID="home-league-chat-button"');
    expect(chatHub).toContain('testID="community-chat-hub-fullscreen"');
    expect(chatHub).toContain('HelpBoardPanel');
    expect(chatHub).toContain('LeagueChatPanel');
    expect(chatHub).toContain("renderTab('help'");
    expect(chatHub).toContain("renderTab('league'");
    const helpTab = chatHub.indexOf("renderTab('help'");
    const leagueTab = chatHub.indexOf("renderTab('league'");
    expect(helpTab).toBeLessThan(leagueTab);
    expect(chatHub).toContain("active: visible && tab === 'league'");
    expect(chatHub).toContain('const topInset = Math.max(18, insets.top + 8)');
    expect(chatHub).toContain('styles.headerTabs');
    expect(chatHub).not.toContain('styles.tabs');
    expect(chatHub).not.toContain('tabText');
  });

  it('stores each board by study language and interface language, with only callables writing data', () => {
    const service = read(path.join('app', 'firestore_help_board.ts'));
    const rules = read('firestore.rules');
    const indexes = read('firestore.indexes.json');

    expect(service).toContain('export const HELP_BOARD_POLICY_VERSION = 1');
    expect(service).toContain('helpBoardBoardKey(targetLang: string, uiLang: string)');
    expect(service).toContain('return `${target}:${ui}`');
    expect(service).toContain("'helpBoardCreateTopic'");
    expect(service).toContain("'helpBoardAddComment'");
    expect(service).toContain("'helpBoardVote'");
    expect(service).toContain("'helpBoardReport'");
    expect(service).toContain("'helpBoardDeleteMyTopic'");

    expect(rules).toContain('match /help_board_topics/{topicId}');
    expect(rules).toContain('match /help_board_comments/{commentId}');
    expect(rules).toContain('match /help_board_votes/{voteId}');
    expect(rules).toContain('match /help_board_reports/{reportId}');
    expect(rules).toContain('match /help_board_restrictions/{userId}');
    expect(rules).toContain('allow create, update, delete: if isAdmin();');

    expect(indexes).toContain('"collectionGroup": "help_board_topics"');
    expect(indexes).toContain('"fieldPath": "boardKey"');
    expect(indexes).toContain('"fieldPath": "hotScore"');
    expect(indexes).toContain('"fieldPath": "bestScore"');
    expect(indexes).toContain('"collectionGroup": "help_board_comments"');
    expect(indexes).toContain('"fieldPath": "helpfulScore"');
  });

  it('includes topic creation, Compass answer, comments and all moderation actions in the UI', () => {
    const panel = read(path.join('components', 'HelpBoardPanel.tsx'));
    const service = read(path.join('app', 'firestore_help_board.ts'));

    expect(panel).toContain('createHelpBoardTopic');
    expect(panel).toContain('testID="help-board-panel"');
    expect(panel).toContain('addHelpBoardComment');
    expect(panel).toContain('useKeyboardAvoidanceMetrics()');
    expect(panel).toContain('keyboardAvoidance.visible');
    expect(panel).toContain('getKeyboardAwareComposerBottomPadding(');
    expect(panel).toContain('testID="help-board-comment-composer"');
    expect(panel).toContain('testID="help-board-comment-input"');
    expect(panel).toContain('marginBottom: keyboardBottomInset');
    expect(panel).toContain('voteHelpBoardItem');
    expect(panel).toContain('reportHelpBoardItem');
    expect(panel).toContain('deleteHelpBoardTopicForEveryone');
    expect(panel).toContain('hideHelpBoardTopic');
    expect(panel).toContain('hideHelpBoardComment');
    expect(panel).not.toContain('hideHelpBoardCompass');
    // Тексты ошибок локализованы (triLang) — проверяем обработчики всех статусов,
    // а не английские хардкод-строки (их больше нет — тексты переведены на 8 языков).
    expect(panel).toContain('serverUnavailableMsg');
    expect(panel).toContain('offlineMsg');
    expect(panel).toContain('authMsg');
    expect(panel).toContain('couldNotSendMsg');
    expect(panel).toContain('topicSubmitErrorMessage');
    // Threads-стиль: hex-аватар автора (personAvatar) + акцентный бейдж Компаса.
    expect(panel).toContain('personAvatar');
    expect(panel).toContain('compassBadge');
    expect(panel).toContain('comment.isCompass');
    expect(panel).not.toContain("actionRow('compass'");
    expect(panel).not.toContain('>{copy.helpful}</Text>');
    expect(panel).not.toContain('>{copy.hide}</Text>');
    expect(panel).toContain('accessibilityLabel={copy.helpful}');
    // Плоский ряд действий: тап-зона сохранена через hitSlop, а не круглыми кнопками.
    expect(panel).toContain('hitSlop={HIT}');
    // Лайк: тоггл с мгновенной подсветкой «уже лайкнуто» + счётчик + откат при ошибке.
    expect(panel).toContain('toggleVote');
    expect(panel).toContain("liked ? 'heart' : 'heart-outline'");
    expect(panel).toContain('getMyHelpBoardVotes');
    expect(panel).toContain('copy.voteFailed');
    // Жалоба: диалог выбора причины + внятный фидбек (в т.ч. «уже жаловался»).
    expect(panel).toContain('reportModal');
    expect(panel).toContain('setReportTarget({ type: targetType, id: targetId })');
    expect(panel).toContain('isHelpBoardAlreadyReported');
    expect(panel).toContain('copy.reasonSpam');
    expect(panel).toContain('copy.reportSent');
    // Плейсхолдер «Компас пишет ответ…» пока генерация не завершилась.
    expect(panel).toContain('copy.compassThinking');
    expect(service).toContain("'server_unavailable'");
    expect(service).toContain("'auth'");
    expect(service).toContain('LAST_SUBMIT_ERROR_KEY');
    expect(service).toContain('rememberSubmitFailure');
    expect(service).toContain("logAppWarning('help_board:submit_failed'");
    expect(service).toContain("export type HelpBoardSort = 'hot' | 'new' | 'unanswered' | 'best'");
    expect(panel).toContain("const [sort, setSort] = useState<HelpBoardSort>('new')");
    expect(panel).toContain('optimisticTopics');
    expect(panel).toContain('setOptimisticTopics');
    expect(panel).toContain('onLongPress');
    expect(panel).toContain('deleteArmedTopicId');
    expect(panel).toContain('deleteTopicEverywhere');
    expect(panel).toContain("backgroundColor: '#E05252'");
    expect(panel).toContain("['new', copy.fresh]");
    expect(panel).toContain("['best', copy.best]");
    expect(panel).not.toContain("['hot', copy.hot]");
    expect(panel).not.toContain("['unanswered', copy.unanswered]");
    expect(panel).toContain('getHelpBoardScope(studyTarget, lang)');
    expect(panel).not.toContain('copy.subtitle');
    expect(panel).not.toContain('>{copy.title}</Text>');
    expect(panel).not.toContain('targetLabel');
    expect(panel).toContain('borderBottomWidth: 2');
    expect(panel).toContain("borderBottomColor: active ? t.accent : 'transparent'");
    expect(service).toContain(".orderBy('helpfulScore', 'desc')");
    expect(service).toContain('isCompass');
  });

  it('adds dedicated Help Board controls to admin and moderation queue', () => {
    const admin = read(path.join('admin', 'index.html'));

    expect(admin).toContain("switchTab('help-board')");
    expect(admin).toContain('id="tab-help-board"');
    expect(admin).toContain('loadHelpBoardAdmin');
    expect(admin).toContain('helpBoardModerate');
    expect(admin).toContain('helpBoardResolveReport');
    expect(admin).toContain('helpBoardQueueDecision');
    expect(admin).toContain('getHelpBoardAdminModerateCallable');
    expect(admin).toContain('helpBoardBanAuthor');
    expect(admin).toContain('helpBoardRestrictAuthor');
    expect(admin).toContain('helpBoardUnrestrictAuthor');
    expect(admin).toContain('"delete"');
    expect(admin).toContain("'ban_author'");
    expect(admin).toContain("'restrict_author'");
    expect(admin).toContain("'unrestrict_author'");
    expect(admin).toContain('help_board_topics');
    expect(admin).toContain('help_board_comments');
    expect(admin).toContain('help_board_reports');
    expect(admin).toContain('help_board_moderation_queue');
    expect(admin).toContain('help_board_restrictions');
    expect(admin).toContain("source: 'help_board'");
  });

  it('keeps Help Board server-side Compass retry and admin ban/delete standards', () => {
    const source = read(path.join('functions', 'src', 'help_board.ts'));
    const provider = read(path.join('functions', 'src', 'explain', 'explain_provider.ts'));
    const index = read(path.join('functions', 'src', 'index.ts'));
    const pkg = read(path.join('functions', 'package.json'));

    expect(source).toContain("'provider_failed'");
    // Старый LLM-судья удалён: он резал ответы борда как off_topic
    // (прод: retryCount=121). Вместо него — конверт + детерминированные проверки.
    expect(source).not.toContain("from './explain/explain_judge'");
    expect(source).toContain('parseCompassEnvelope');
    expect(source).toContain('validateCompassAnswer');
    expect(source).toContain('MAX_COMPASS_RETRIES');
    // Тон-вердикт Компаса («мозг»): 4 режима + алерт оператору по rude/dangerous.
    expect(source).toContain("'rude'");
    expect(source).toContain("'dangerous'");
    expect(source).toContain('sendHelpBoardAlert');
    expect(source).toContain('onDocumentCreated');
    expect(source).toContain('onSchedule');
    expect(source).toContain('helpBoardGenerateCompassForTopic');
    expect(source).toContain('helpBoardCompassRetryCron');
    expect(source).toContain('upsertCompassComment');
    expect(source).toContain('helpBoardDeleteMyTopic');
    expect(source).toContain("asText(topic.authorUid, 160) !== stableUid");
    expect(source).toContain("status: 'deleted' satisfies HelpBoardStatus");
    expect(source).toContain("where('topicId', '==', topicId)");
    expect(source).toContain("authorUid: 'compass'");
    expect(source).toContain('isCompass: true');
    expect(source).not.toContain('Компас пока не смог');
    expect(source).toContain("return '';");
    expect(source).toContain("compassStatus: 'pending'");
    expect(source).toContain("compassStatus: 'generating'");
    expect(source).toContain("compassAnswer: ''");
    expect(source).toContain('writeCompassBilling');
    expect(provider).toContain('OPENAI_CHAT_TIMEOUT_MS = 30_000');
    expect(provider).toContain('OPENAI_CHAT_MAX_ATTEMPTS = 3');
    expect(provider).toContain('AbortSignal.timeout(OPENAI_CHAT_TIMEOUT_MS)');
    expect(provider).toContain('isRetryableFetchError');
    expect(source).toContain("'delete'");
    expect(source).toContain("'ban_author'");
    expect(source).toContain("'restrict_author'");
    expect(source).toContain("'unrestrict_author'");
    expect(source).toContain('HELP_BOARD_RESTRICTIONS');
    expect(source).toContain('assertHelpBoardTopicCreateAllowed');
    expect(source).toContain("'help_board_topic_creation_restricted'");
    expect(source).toContain("db.collection('banned_users')");
    expect(source).toContain("db.collection('league_chat_bans')");
    expect(source).toContain("db.collection(HELP_BOARD_RESTRICTIONS)");
    expect(source).toContain("source: 'help_board'");
    expect(source).toContain('Compass answers a topic only once');
    expect(index).toContain('helpBoardGenerateCompassForTopic');
    expect(index).toContain('helpBoardCompassRetryCron');
    expect(index).toContain('helpBoardDeleteMyTopic');
    expect(pkg).toContain('functions:helpBoardGenerateCompassForTopic');
    expect(pkg).toContain('functions:helpBoardCompassRetryCron');
    expect(pkg).toContain('functions:helpBoardDeleteMyTopic');
  });

  it('keeps account deletion and legal docs aware of Help Board content', () => {
    const accountDelete = read(path.join('functions', 'src', 'account_delete.ts'));
    const terms = read(path.join('legal', 'terms_of_use_en.json'));
    const privacy = read(path.join('legal', 'privacy_policy_en.json'));
    const appTerms = read(path.join('app', 'legal', 'terms_of_use_en.json'));
    const termsHtml = read('terms.html');

    expect(accountDelete).toContain("collection: 'help_board_topics'");
    expect(accountDelete).toContain("collection: 'help_board_comments'");
    expect(accountDelete).toContain("collection: 'help_board_reports'");
    expect(accountDelete).toContain("collection: 'help_board_votes'");
    expect(accountDelete).toContain("'help_board_rate_limits'");
    expect(accountDelete).toContain("'help_board_restrictions'");

    for (const doc of [terms, privacy, appTerms, termsHtml]) {
      expect(doc).toContain('Help Board');
      expect(doc).toContain('Compass');
      expect(doc).toContain('July 1, 2026');
    }
  });
});
