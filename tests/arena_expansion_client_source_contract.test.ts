import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('Arena Expansion UI source contract', () => {
  test('ships the four-section hub and every focused route without raster assets', () => {
    const hub = read('app/arena.tsx');
    for (const section of ['today', 'play', 'growth', 'together']) expect(hub).toContain(section);
    for (const route of ['arena_today', 'arena_match_lab', 'arena_ghost_duel', 'arena_rivalries', 'arena_mastery_map', 'arena_partner', 'arena_star_wallet']) {
      const source = read(`app/${route}.tsx`);
      expect(source).not.toMatch(/require\([^)]*\.(png|jpg|webp)/);
    }
  });

  test('fails all hub actions closed behind base and feature availability', () => {
    const hub = read('app/arena.tsx');
    expect(hub).toContain('const baseEnabled');
    expect(hub).toContain('!expansion?.availability.lab');
    expect(hub).toContain('!expansion?.availability.mastery');
    expect(hub).toContain('!home?.availability.friendEnabled');
    expect(hub).toContain('!expansion?.availability.store');
  });

  test('keeps Ghost a disclosed recording and routes its sealed run through expansion sync', () => {
    const ghost = read('app/arena_ghost_duel.tsx');
    const run = read('app/arena_today.tsx');
    expect(ghost).toContain("runKind: 'ghost'");
    expect(ghost).not.toContain("pathname: '/arena_match'");
    expect(run).toContain("params.runKind === 'ghost'");
    expect(run).toContain("arenaExpansionText(lang, 'ghostDisclosure')");
    expect(run).toContain('reward?.guestScore');
    expect(ghost).toContain('ghost.result.hostScore');
  });

  test('uses exact-once request ids and authoritative deadline/hard-expiry sync', () => {
    const today = read('app/arena_today.tsx');
    expect(today).toContain('startRequestId.current ??');
    expect(today).toContain('arenaTodaySync(match.matchId, match.version)');
    expect(today).toContain('deadlineSyncs.current.delete(key)');
    expect(today).toContain('hardExpirySync.current');
    expect(today).toContain('setCompletedRunId(home.today.sessionId ?? null)');
    expect(today).toContain("response.match.state === 'aborted'");
  });

  test('opens the latest owner Lab review from the Hub when no source id is supplied', () => {
    const lab = read('app/arena_match_lab.tsx');
    // Договор здесь — какие данные уходят в запрос, а не в каком порядке они
    // записаны. Порядок аргументов меняется при первом же рефакторинге.
    expect(lab).toContain('arenaMatchLabGet(');
    for (const part of ['sourceRunId: params.sourceRunId', 'matchId: params.matchId', 'mode']) {
      expect(lab).toContain(part);
    }
    expect(lab).not.toContain('if (!params.sourceRunId && !params.matchId)');
  });

  test('virtualizes long review, rivalry, mastery and store surfaces', () => {
    for (const route of ['arena_match_lab', 'arena_rivalries', 'arena_mastery_map', 'arena_star_wallet']) expect(read(`app/${route}.tsx`)).toContain('<FlatList');
  });

  test('uses the privacy-safe social and wallet wire', () => {
    const contract = read('modules/arena/expansion_contract.ts');
    const client = read('app/arena_client.ts');
    expect(contract).toContain('sharedDays: number');
    expect(contract).toContain('equippedBySlot');
    expect(contract).not.toContain('contributedStars');
    expect(contract).toContain('partners: readonly ArenaPartnerSummary[]');
    expect(client).toContain("'arenaGhostDecline'");
    expect(client).toContain("'arenaPartnerAccept', { partnershipId, requestId }");
  });

  test('manages up to five partners and never lets an outgoing invite accept itself', () => {
    const partner = read('app/arena_partner.tsx');
    expect(partner).toContain('home.partners');
    expect(partner).toContain('partners.length < 5');
    expect(partner).toContain("partner.direction === 'incoming'");
    expect(partner).toContain("partner.direction === 'outgoing'");
    expect(partner).toContain('partner.pausedByViewer');
    expect(partner).toContain('arenaPartnerPreferences');
    expect(partner).toContain('startHour: 22, endHour: 8');
  });

  test('allows the first Rival proposal from an otherwise empty list', () => {
    const rivalry = read('app/arena_rivalries.tsx');
    expect(rivalry).not.toContain("disabled={state !== 'ready'");
    expect(rivalry).toContain("['loading', 'unavailable', 'error'].includes(state)");
    expect(rivalry).toContain('item.leaveAllowed');
    expect(rivalry).toContain('arenaRivalMute');
  });

  test('returns a completed series game to Rivalry instead of unrelated Quick matchmaking', () => {
    const results = read('app/arena_results.tsx');
    expect(results).toContain("match?.mode === 'series'");
    expect(results).toContain("router.replace('/arena_rivalries'");
    expect(results).toContain("arenaExpansionText(lang, 'rivalryContinue')");
    expect(results).toContain('match?.result?.seriesSummary?.winsA');
  });

  test('consumes code-native cosmetics in match and results and disables unknown catalog ids', () => {
    expect(read('app/arena_client.ts')).toContain("callArena<ArenaStarStoreResponse>('arenaStarStore')");
    expect(read('app/arena_match.tsx')).toContain("entryTreatment === 'entry_trail'");
    expect(read('app/arena_match.tsx')).toContain("entryTreatment === 'entry_burst'");
    expect(read('app/arena_match.tsx')).toContain("entryTreatment === 'entry_crown'");
    expect(read('app/arena_results.tsx')).toContain('arenaResultTheme');
    expect(read('app/arena_results.tsx')).toContain('equipped.victory_stamp');
    expect(read('app/arena_results.tsx')).toContain('equipped.reaction_pack');
  });

  test('offers only eligible, fail-closed post-result actions', () => {
    const results = read('app/arena_results.tsx');
    expect(results).toContain('baseEnabled && expansion?.availability.lab && matchId');
    expect(results).toContain("sourceKind: 'arena_match'");
    expect(results).toContain("match?.opponentKind === 'human'");
    expect(results).toContain("sourceMatchId: matchId");
    expect(results).toContain('match?.rivalOffer');
    expect(results).toContain("arenaExpansionText(lang, 'rivalryIncoming')");
    expect(results).toContain('arenaRivalAccept(match.rivalOffer.seriesId');
  });

  test('opens latest no-source Lab and makes completed runs reviewable', () => {
    const lab = read('app/arena_match_lab.tsx');
    const today = read('app/arena_today.tsx');
    expect(lab).not.toContain('if (!params.sourceRunId && !params.matchId)');
    // Договор здесь — какие данные уходят в запрос, а не в каком порядке они
    // записаны. Порядок аргументов меняется при первом же рефакторинге.
    expect(lab).toContain('arenaMatchLabGet(');
    for (const part of ['sourceRunId: params.sourceRunId', 'matchId: params.matchId', 'mode']) {
      expect(lab).toContain(part);
    }
    expect(today).toContain("pathname: '/arena_match_lab'");
    expect(today).toContain('matchId: completedRunId');
  });

  test('defaults Nudge closed and resumes an expansion run before base match or queue', () => {
    const partner = read('app/arena_partner.tsx');
    const hub = read('app/arena.tsx');
    expect(partner).toContain("partner.state === 'active' && partner.nudgeEnabled");
    expect(partner).toContain("partner.spotlightAvailable ? 'claim' : 'checkProgress'");
    expect(hub.indexOf('activeRun ? (')).toBeGreaterThan(0);
    expect(hub.indexOf('activeRun ? (')).toBeLessThan(hub.indexOf("home?.activeMatch?.matchId ? ("));
    expect(hub).toContain("runKind: activeRun.runKind");
  });

  test('delivers Partner nudges through the owner-only notification center', () => {
    const model = read('app/user_notifications.ts');
    const center = read('components/NotificationCenterButton.tsx');
    expect(model).toContain("| 'arena_partner_nudge'");
    expect(model).toContain("| 'arena_partner_invite'");
    expect(model).toContain("kind: 'arena_partner'");
    expect(center).toContain("case 'arena_partner_nudge'");
    expect(center).toContain("case 'arena_partner_invite'");
    expect(center).toContain("router.push('/arena_partner'");
  });

  test('keeps three distinct finite entry treatments and local-only reaction presets', () => {
    const match = read('app/arena_match.tsx');
    const results = read('app/arena_results.tsx');
    // Косметика входа переехала с карточки принятия дуэли на заставку
    // «ты против соперника»: карточки больше нет, дуэль принимается сама, а
    // заставка и есть тот момент входа, за который косметику покупали.
    expect(match).toContain("entryTreatment === 'entry_trail' ? SlideInRight.duration(260)");
    expect(match).toContain("entryTreatment === 'entry_burst' ? ZoomIn.duration(240)");
    expect(match).toContain("entryTreatment === 'entry_crown' ? FadeInDown.duration(300)");
    expect(results).toContain("arenaExpansionText(lang, 'localReaction')");
    expect(results).toContain("['reactionRespect', 'reactionWellPlayed']");
    expect(results).toContain("['reactionComeback', 'reactionAgain']");
  });

  test('instruments every expansion detail entry with bounded Arena telemetry', () => {
    for (const route of ['arena_match_lab', 'arena_ghost_duel', 'arena_rivalries', 'arena_mastery_map', 'arena_partner']) {
      const source = read(`app/${route}.tsx`);
      expect(source).toContain('trackArenaTelemetry(arenaFeatureOpenEvent(');
    }
  });
});
