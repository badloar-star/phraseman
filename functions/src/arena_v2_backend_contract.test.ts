import { readFileSync } from 'node:fs';
import path from 'node:path';

// зачем: сторож режет исходник по многострочным маякам ('privateDoc,\n  };').
// На Windows файл лежит с CRLF, маяк не находится, indexOf возвращает -1 и
// slice молча захватывает весь остаток файла — проверка приватности начинает
// падать на коде, который её не нарушает. Нормализуем переводы строк при
// чтении: содержимое то же, стиль переносов на договор не влияет.
const readSource = (file: string): string => readFileSync(path.join(__dirname, file), 'utf8').replace(/\r\n/g, '\n');

const source = readSource('arena_v2.ts');
const core = readSource('arena_v2_core.ts');

describe('Arena V2 backend source contract', () => {
  it('marks a server-created bot seat accepted at match creation', () => {
    expect(source).toContain("participantStableUids.find((uid) => uid.startsWith('bot_'))");
    expect(source).toContain('const acceptedBy = botSeat ? [botSeat] : [];');
  });

  it('exports the complete isolated callable surface', () => {
    for (const name of [
      'arenaV2Home', 'arenaV2FindMatch', 'arenaV2QueueCancel', 'arenaV2QuickBotFallback',
      'arenaV2MatchAccept', 'arenaV2MatchDecline', 'arenaV2SubmitAnswer',
      'arenaV2SubmitSpeedAttempt', 'arenaV2SyncMatch', 'arenaV2Forfeit',
      'arenaV2InviteCreate', 'arenaV2InviteAccept', 'arenaV2InviteDecline',
      'arenaV2SeasonClaim', 'arenaV2SpinStatus', 'arenaV2SpinClaim', 'arenaV2CleanupHourly',
    ]) expect(source).toContain(`export const ${name} =`);
  });

  it('reuses only pure Tournament publication contracts and never imports runtime', () => {
    expect(source).not.toMatch(/from ['"]\.\/tournaments['"]/);
    expect(source).toContain("from './tournament_pool_publication'");
    expect(source).not.toContain('buildNewTournamentPool(');
    expect(source).toContain(".where('poolVersion', '==', NEW_TOURNAMENT_POOL_VERSION)");
    expect(source).toContain('verifyTournamentPoolTaskProof(raw, NEW_TOURNAMENT_POOL_MERKLE_ROOT_SHA256)');
    expect(source).toContain('.startAt(cursor).limit(cell.count)');
    expect(source).toContain('tasks.length > ARENA_V2_MAX_TASK_DOC_READS');
    expect(core).toContain('ARENA_V2_MAX_TASK_DOC_READS = 10');
  });

  it('keeps task secrets and identities out of the persisted public match', () => {
    expect(core).toContain('toPublicTournamentTask(task)');
    expect(core).not.toContain('toPublicTournamentTask(task,');
    expect(source).toContain("uid: index === 0 ? 'a' : 'b'");
    expect(source).toContain('.collection(ARENA_V2_COLLECTIONS.members).doc(authUid)');
    const publicBuilder = source.slice(source.indexOf('publicDoc: {'), source.indexOf('privateDoc,\n  };', source.indexOf('publicDoc: {')));
    expect(publicBuilder).not.toContain('participantStableUids');
    expect(publicBuilder).not.toContain('participantAuthUids');
    expect(source).toContain('closedField =');
    expect(source).toContain('seatAwards:');
    const publicReward = source.match(/rewards\[publicSeat\] = \{\s+starsEarned,[\s\S]*?\n\s+\};/)?.[0] ?? '';
    expect(publicReward).toContain('ratingDelta');
    expect(publicReward).not.toContain('seasonStarsAfter');
    expect(publicReward).not.toContain('spinAwarded');
    expect(publicReward).not.toContain('xpBreakdown');
    const privateReward = source.slice(
      source.indexOf('const reward = {'),
      source.indexOf('privateRewards[entry.uid] = reward;'),
    );
    expect(privateReward).toContain('xpBreakdown: settle.xpBreakdown');
  });

  it('returns and persists only the submitting viewer review before settlement', () => {
    const finish = source.slice(
      source.indexOf('export const arenaV2MatchFinish ='),
      source.indexOf('export const arenaV2MatchSettle ='),
    );
    expect(finish).toContain('arenaBuildViewerReviewSnapshot({');
    expect(finish).toContain('evidenceByTask: privateDoc.answers[who.stableUid] ?? {}');
    expect(finish).toContain(".collection(ARENA_EXPANSION_COLLECTIONS.matchLabs).doc(matchId)");
    expect(finish).toContain('viewerReview: viewerLab.tasks');
    expect(finish).toContain('if (!viewerLabSnap.exists) tx.create(viewerLabRef');
    expect(finish).not.toContain('privateDoc.answers[opponentStableUid]');
    // Settlement may replace the reporter's early snapshot with the same
    // canonical document; create would fail once the first reporter owns it.
    expect(source).toContain('tx.set(db.collection(\'users\').doc(entry.uid).collection(ARENA_EXPANSION_COLLECTIONS.matchLabs)');
  });

  /**
   * Инцидент 2026-08-16: конфиг стоял с minClientVersion '0.0.0' («подходит
   * любая сборка»), но версию клиента всё равно разбирали. Android присылал
   * 'unknown' (nativeAppVersion пустой), разбор падал, и сервер отвечал
   * `arena_client_update_required`. Хаб рисует на любой отказ карточку
   * «Арена ещё не включена на сервере» — раздел выглядел невключённым при
   * полностью рабочем сервере.
   *
   * Функции приватные, поэтому вырезаем их из исходника и исполняем: проверяем
   * поведение, а не совпадение текста.
   */
  it('treats 0.0.0 as "any build" and tolerates two- and four-part versions', () => {
    const cut = (name: string): string => {
      const start = source.indexOf(`function ${name}(`);
      const end = source.indexOf('\n}\n', start);
      expect(start).toBeGreaterThan(-1);
      return source.slice(start, end + 3)
        // Вырезанное — TypeScript; для исполнения снимаем аннотации типов:
        // параметры, возвращаемые типы и приведения.
        .replace(/: \[number, number, number\] \| null/g, '')
        .replace(/(\w+): unknown/g, '$1')
        .replace(/\): boolean \{/g, ') {');
    };
    // eslint-disable-next-line no-new-func
    const versionAtLeast = new Function(
      `${cut('comparableVersion')}${cut('versionAtLeast')}return versionAtLeast;`,
    )() as (a: unknown, b: unknown) => boolean;

    // Минимум '0.0.0' никого не отсекает — даже нечитаемую версию.
    for (const actual of ['unknown', '', null, undefined, '1.6.7']) {
      expect(versionAtLeast(actual, '0.0.0')).toBe(true);
    }
    // Обычные форматы магазинов разбираются, а не считаются поломкой.
    expect(versionAtLeast('1.6', '1.5.0')).toBe(true);
    expect(versionAtLeast('1.6.7.1', '1.6.7')).toBe(true);
    // Настоящий минимум по-прежнему отсекает старое и мусорное.
    expect(versionAtLeast('1.4.9', '1.5.0')).toBe(false);
    expect(versionAtLeast('unknown', '1.5.0')).toBe(false);
    // Опечатка администратора в минимуме не закрывает Арену всем.
    expect(versionAtLeast('1.6.7', '1.0.0-beta')).toBe(true);
  });

  it('has bounded queue/cleanup operations and a six-second bot recheck', () => {
    expect(source).not.toMatch(/\.limit\((?:1[1-9]|[2-9]\d+)\).*queue/);
    expect(source).toContain(".orderBy('joinedAtMs', 'asc').limit(10)");
    expect(source).toContain('arena_quick_bot_too_early');
    expect(source).toContain(".where('mode', '==', 'quick').where('status', '==', 'waiting')");
    expect(source).toContain('CLEANUP_BATCH_LIMIT = 100');
    expect(source).toContain('reconcileOrphanMatch(orphan.id, now)');
    expect(source).toContain('const MAX_SPEED_ATTEMPT_IDS = 40');
    expect(source).toContain('const equivalent = Object.values');
  });

  it('uses stable auth, release gates, HMAC pair/invite/spin inputs and exactly-once receipts', () => {
    expect(source).toContain('resolveStableUidForAuth');
    expect(source).toContain("collection(ARENA_V2_COLLECTIONS.config).doc('current')");
    /**
     * Публикацию содержимого проверяет единый валидатор конфига — тот же
     * модуль, которым админка строит документ и показывает его состояние.
     *
     * Раньше здесь стоял свой, отдельно написанный список условий, и он был
     * КОРОЧЕ: не смотрел ни корень Меркла, ни формат минимальной версии
     * клиента, ни то, что флаги вообще булевы. Два разных списка на один
     * договор — это ошибка, ждущая своего часа, поэтому список остался один.
     */
    expect(source).toContain('arenaConfigProblems(config)');
    const contract = readFileSync(path.join(__dirname, 'arena_config_contract.ts'), 'utf8');
    expect(contract).toContain('NEW_TOURNAMENT_POOL_CONTENT_SHA256');
    expect(contract).toContain('NEW_TOURNAMENT_POOL_MERKLE_ROOT_SHA256');
    expect(source).toContain('request.data?.clientVersion, config.minClientVersion');
    expect(source).toContain("arenaActor(request, 'home', true)");
    expect(source).toContain('availability: {');
    expect(source).toContain('ARENA_V2_PAIR_HMAC_KEY');
    expect(source).toContain('ARENA_V2_INVITE_HMAC_KEY');
    expect(source).toContain('ARENA_V2_SPIN_HMAC_KEY');
    expect(source).toContain('tx.create(entry.receipt');
    expect(source).toContain("expireAt: timestamp(now + 400 * 24 * 60 * 60 * 1_000)");
    expect(source).toContain("throw new HttpsError('failed-precondition', 'arena_spin_credit_expired')");
    expect(source).toContain('tx.get(availableQuery)');
    expect(source).toContain("closeReason: 'friend_match'");
    expect(source).toContain("throw new HttpsError('failed-precondition', 'arena_invite_host_unavailable')");
    expect(source).not.toContain('randomInt(');
  });

  it('publishes season and spin pearls as deterministic external facts only', () => {
    expect(source).toContain("source: 'arena_v2_season'");
    expect(source).toContain("source: 'arena_v2_spin'");
    expect(source).toContain('appendExternalEconomyEvent(tx, userRef');
    expect(source).not.toMatch(/(?:user|userSnap\.data\(\))\.shards\b/);
    expect(source).not.toMatch(/\bshards\s*:/);
  });

  it('keeps ranked human-only, strict range, pair reservations and server settlement guards', () => {
    expect(core).toContain("return mode === 'ranked' ? 1 : 3");
    // Публичный opponentKind теперь всегда 'human' (бот не раскрывается),
    // поэтому целостность рейтинга держится на числе живых участников.
    expect(source).toContain('humans.length !== 2');
    expect(source).not.toContain("match.opponentKind !== 'human'");
    expect(source).not.toContain('Training opponent');
    expect(source).not.toContain('Arena Bot');
    expect(source).toContain("Math.abs(divisions[0] - divisions[1]) > 1");
    expect(source).toContain('reservationExpiresAtMs');
    expect(source).toContain('pairLimitCommitted');
    expect(source).toContain('if (possibleProfile.activeMatchId || !arenaRanksCompatible');
    expect(source).toContain('!arenaAcceptanceOpen(now, Number(match.stateDeadlineAtMs))');
  });

  it('does not let a closed old match clear the next match queue', () => {
    const terminalGuard = "if (match.terminal === true || match.state === 'settled' || match.state === 'aborted')";
    const accept = source.slice(source.indexOf('export const arenaV2MatchAccept ='), source.indexOf('export const arenaV2MatchDecline ='));
    const sync = source.slice(source.indexOf('export const arenaV2SyncMatch ='), source.indexOf('/* ══════════════════════ Дуэль v3'));
    expect(accept).toContain(terminalGuard);
    expect(sync).toContain(terminalGuard);
    expect(accept.indexOf(terminalGuard)).toBeLessThan(accept.indexOf('closeMatchQueues('));
    expect(sync.indexOf(terminalGuard)).toBeLessThan(sync.indexOf('closeMatchQueues('));
  });

  it('keeps pity across 63-day season boundaries in the Arena profile', () => {
    expect(core).toContain('ARENA_V2_SEASON_LENGTH_DAYS = 63');
    expect(source).toContain('pityBefore: profile.spinPity');
    expect(source).toContain('spinPity: spin.pityAfter');
  });
});
