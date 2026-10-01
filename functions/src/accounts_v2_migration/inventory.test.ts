import {
  MIGRATION_INVENTORY,
  SAVED_CARD_FIELDS,
  classifyProgressKey,
  classifyRootField,
  classifySubcollection,
  inventorySummary,
  parseProgressKey,
} from './inventory';

/*
 * Account V2, Пакет 5 — таблица инвентаря полей старого аккаунта.
 *
 * зачем: миграция не имеет права «додумывать». Каждое поле старого документа
 * users/{uid} (корень, progress.*, подколлекции) либо переносится (carry),
 * либо отбрасывается по ЗАПИСАННОМУ решению владельца (drop + ссылка D-номер),
 * либо права Plus берутся из системы покупок (derive, без копии), либо HOLD —
 * решения нет или поле неизвестно. Тест держит эти границы.
 */

describe('accounts_v2_migration inventory — структура таблицы', () => {
  it('у каждого правила допустимая судьба, уникальный id и причина', () => {
    const ids = new Set<string>();
    for (const rule of MIGRATION_INVENTORY) {
      expect(['carry', 'carry_pending_domain', 'keep_in_place', 'drop', 'derive', 'hold', 'info']).toContain(rule.disposition);
      expect(ids.has(rule.id)).toBe(false);
      ids.add(rule.id);
      expect(rule.reason).toMatch(/^[a-z0-9_]+$/);
      expect(rule.note.length).toBeGreaterThan(0);
    }
  });

  it('каждый drop ссылается на решение владельца (D-номер или OD-номер решения в чате), без ссылки — нельзя', () => {
    const drops = MIGRATION_INVENTORY.filter((rule) => rule.disposition === 'drop');
    expect(drops.length).toBeGreaterThan(0);
    for (const rule of drops) {
      expect(rule.decisions.length).toBeGreaterThan(0);
      for (const ref of rule.decisions) expect(ref).toMatch(/^(D\d{2,3}|OD\d{1,2})$/);
    }
  });

  it('carry есть только у доменов Account V2 (урок, карточка, библиотека)', () => {
    for (const rule of MIGRATION_INVENTORY.filter((item) => item.disposition === 'carry')) {
      expect(['lesson_progress', 'flashcard', 'library_membership']).toContain(rule.domain);
    }
  });

  it('derive — только права Plus (ссылка на систему покупок, не копия)', () => {
    for (const rule of MIGRATION_INVENTORY.filter((item) => item.disposition === 'derive')) {
      expect(rule.reason).toBe('plus_entitlement_reference');
    }
  });

  it('сводка считает правила по судьбам', () => {
    const summary = inventorySummary();
    const total = Object.values(summary).reduce((sum, value) => sum + value, 0);
    expect(total).toBe(MIGRATION_INVENTORY.length);
    expect(summary.carry).toBeGreaterThan(0);
    expect(summary.hold).toBeGreaterThan(0);
  });
});

describe('accounts_v2_migration inventory — экономика отброшена по решениям владельца', () => {
  const cases: readonly (readonly [string, string])[] = [
    ['user_total_xp', 'D02'],
    ['user_prev_xp', 'D02'],
    ['user_level', 'D02'],
    ['weekly_xp', 'D02'],
    ['weekly_xp_period_start', 'D02'],
    ['week_points', 'D90'],
    ['week_points_v2', 'D90'],
    ['level_reward_spin_balance', 'D09'],
    ['club_gift_free_boost_v1', 'D09'],
    ['shards_one_time_events', 'D70'],
    ['shards_lifetime_earned_v1', 'D70'],
    ['lesson7_words_shards_granted', 'D70'],
    ['avatar_aura_owned_v1', 'D102'],
    ['arena_last_season_seen', 'D90'],
    ['flashcards_owned_packs_v1', 'D68'],
  ];
  it.each(cases)('progress.%s → drop со ссылкой %s', (key, decision) => {
    const result = classifyProgressKey(key);
    expect(result.disposition).toBe('drop');
    expect(result.decisions).toContain(decision);
  });

  it('жемчуг в корне документа → drop D70', () => {
    for (const key of ['shards', 'shards_updated_at_ms', 'shards_updated_reason']) {
      const result = classifyRootField(key);
      expect(result.disposition).toBe('drop');
      expect(result.decisions).toContain('D70');
    }
  });

  it('спины уровня и журнал жемчуга в подколлекциях → drop', () => {
    expect(classifySubcollection('shard_log').decisions).toContain('D70');
    expect(classifySubcollection('level_spin_credits').disposition).toBe('drop');
    expect(classifySubcollection('arena_v2_star_ledger').disposition).toBe('drop');
  });

  it('руны → монеты 1:1: остаются в леджере монет (keep_in_place, решение Fable); звёзды → drop OD10', () => {
    expect(classifyRootField('stars')).toMatchObject({
      disposition: 'keep_in_place', reason: 'coins_ledger_authoritative', decisions: ['D03', 'OD10'],
    });
    for (const key of ['v2_access_stars', 'v2_access_stars_updated_at_ms']) {
      expect(classifyRootField(key)).toMatchObject({ disposition: 'drop', decisions: ['OD10'] });
    }
    for (const key of ['practice_runes_daily', 'videoWatchRunesDaily']) expect(classifyRootField(key).disposition).toBe('info');
    expect(classifySubcollection('star_operations').disposition).toBe('info');
  });

  it('служебные поля входа → drop OD11 (не HOLD); флаг слияния практики ошибок — HOLD', () => {
    for (const key of ['firebaseAuthUid', 'linkedAuth', 'identityCanonicalizedAt', 'identityMergedAt', 'identityCleanupAt',
      'identityCleanupReason', 'identityHidden', 'canonicalStableId', 'duplicateOfStableId', 'anon_merge_claim']) {
      expect(classifyRootField(key)).toMatchObject({ disposition: 'drop', decisions: ['OD11'] });
    }
    expect(classifyRootField('mistakePracticeMergePending').disposition).toBe('hold');
  });

  it('рулетка рефералов остаётся (D80/D99) — не drop, а информационно (нет домена)', () => {
    expect(classifyProgressKey('referral_spin_credits').disposition).toBe('info');
    expect(classifySubcollection('referral_spin_credit_ledger').disposition).toBe('info');
  });

  it('купленная заморозка серии → drop (решение 7: заморозка только у Plus), D101/D107', () => {
    const result = classifyProgressKey('streak_freeze');
    expect(result.disposition).toBe('drop');
    expect(result.decisions).toEqual(expect.arrayContaining(['D101', 'D107']));
  });

  it('D54 больше нигде не упоминается (лиги — D90)', () => {
    for (const rule of MIGRATION_INVENTORY) expect(rule.decisions).not.toContain('D54');
    expect(classifyProgressKey('week_points_v2').decisions).toContain('D90');
  });
});

describe('accounts_v2_migration inventory — перенос, Plus и неизвестное', () => {
  it('лучший результат урока EN и FR → carry lesson_progress', () => {
    expect(classifyProgressKey('lesson5_best_score')).toMatchObject({
      disposition: 'carry', domain: 'lesson_progress', target: 'en', rawKey: 'lesson5_best_score', lessonId: 5,
    });
    expect(classifyProgressKey('lesson_progress_v2::fr::lesson12_best_score')).toMatchObject({
      disposition: 'carry', domain: 'lesson_progress', target: 'fr', lessonId: 12,
    });
  });

  it('карточки и наборы сообщества → carry; пустые FR-ключи разбираются', () => {
    expect(classifyProgressKey('flashcards_v1')).toMatchObject({ disposition: 'carry', domain: 'flashcard' });
    expect(classifyProgressKey('flashcards')).toMatchObject({ disposition: 'carry', domain: 'flashcard' });
    expect(classifyProgressKey('flashcards_v2::fr::custom_flashcards_v2')).toMatchObject({
      disposition: 'carry', domain: 'flashcard', target: 'fr',
    });
    expect(classifyProgressKey('flashcards_v2::fr::community_owned_pack_ids_v1')).toMatchObject({
      disposition: 'carry', domain: 'library_membership', target: 'fr',
    });
    expect(classifySubcollection('flashcard_pages')).toMatchObject({ disposition: 'carry', domain: 'flashcard' });
  });

  it('SRS-память свайпов → carry в карточку (решение 9), черновик сессии — info', () => {
    expect(classifyProgressKey('flashcards_swipe_memory_v1')).toMatchObject({ disposition: 'carry', domain: 'flashcard' });
    expect(classifyProgressKey('flashcards_v2::fr::flashcards_swipe_memory_v1')).toMatchObject({
      disposition: 'carry', domain: 'flashcard', target: 'fr',
    });
    expect(classifyProgressKey('flashcards_swipe_session_draft_v1').disposition).toBe('info');
  });

  it('серия, активные дни, экзамены, достижения, статистика → keep_in_place (OD8, решение Fable)', () => {
    for (const key of ['streak_count', 'active_days_v1', 'premium_free_freeze_used', 'level_exam_A1_pct', 'lingman_certificate_v1',
      'achievements_state', 'user_stats_v1', 'daily_stats']) {
      expect(classifyProgressKey(key)).toMatchObject({ disposition: 'keep_in_place', reason: 'kept_in_v2_store', decisions: ['OD8'] });
    }
  });

  it('открытые уроки → keep_in_place со ссылкой D121 (не закрываются, не удаляются)', () => {
    const result = classifyProgressKey('unlocked_lessons');
    expect(result.disposition).toBe('keep_in_place');
    expect(result.decisions).toContain('D121');
  });

  it('carry_pending_domain в таблице не осталось: всё решённое — keep_in_place', () => {
    expect(MIGRATION_INVENTORY.filter((rule) => rule.disposition === 'carry_pending_domain')).toEqual([]);
  });

  it('no_v2_domain — информационная судьба, не блокирующий hold', () => {
    expect(classifyProgressKey('user_name')).toMatchObject({ disposition: 'info', reason: 'no_v2_domain' });
    expect(classifySubcollection('friends')).toMatchObject({ disposition: 'info', reason: 'no_v2_domain' });
  });

  it('права Plus из progress (intro/loyalty/had_premium_ever) — derive с пометкой «лежат в progress»', () => {
    for (const key of ['intro_access_until_ms', 'loyalty_gift_until_ms', 'had_premium_ever']) {
      const found = MIGRATION_INVENTORY.find((rule) => rule.id === classifyProgressKey(key).ruleId);
      expect(found?.disposition).toBe('derive');
      expect(found?.note).toContain('users/{uid}.progress');
    }
  });

  it('права Plus → derive, в том числе топ-уровневое зеркало', () => {
    for (const key of ['premium_plan', 'premium_expiry', 'premium_rc_product_id', 'vip_until', 'had_premium_ever']) {
      expect(classifyProgressKey(key).disposition).toBe('derive');
    }
    expect(classifyRootField('premium').disposition).toBe('derive');
    expect(classifyRootField('premiumExpiry').disposition).toBe('derive');
    expect(classifySubcollection('access_projection').disposition).toBe('derive');
  });

  it('неизвестное поле → HOLD unknown_field (корень, progress, подколлекция)', () => {
    expect(classifyProgressKey('totally_new_key_v9')).toMatchObject({ disposition: 'hold', reason: 'unknown_field', ruleId: null });
    expect(classifyRootField('someFutureField')).toMatchObject({ disposition: 'hold', reason: 'unknown_field' });
    expect(classifySubcollection('mystery_docs')).toMatchObject({ disposition: 'hold', reason: 'unknown_field' });
  });

  it('разбор ключа с областью цели: домен, цель, декодированный id', () => {
    expect(parseProgressKey('lesson_progress_v2::fr::7')).toEqual({ target: 'fr', rawKey: 'lesson7_progress' });
    expect(parseProgressKey('lesson12_best_score')).toEqual({ target: 'en', rawKey: 'lesson12_best_score', lessonId: 12 });
    expect(parseProgressKey('lesson_progress_v2::fr::lesson3_best_score')).toEqual({
      target: 'fr', rawKey: 'lesson3_best_score', lessonId: 3,
    });
    expect(parseProgressKey('level_exams_v2::fr::level_exam_A1_pct')).toEqual({ target: 'fr', rawKey: 'level_exam_A1_pct' });
    expect(parseProgressKey('language_profile_v1::fr')).toEqual({ target: 'en', rawKey: 'language_profile_v1::fr' });
    expect(parseProgressKey('flashcards_v2::fr::%E2%9C%93bad%')).toEqual({ target: 'fr', rawKey: null });
  });

  it('разрешённые поля карточки не содержат SRS-полей', () => {
    expect(SAVED_CARD_FIELDS).toContain('id');
    expect(SAVED_CARD_FIELDS).not.toContain('srs');
    expect(SAVED_CARD_FIELDS).not.toContain('srsPolicy');
    // 7E р1: время правки карточки (клиент 7E) — иначе перенос вставал в HOLD всего аккаунта.
    expect(SAVED_CARD_FIELDS).toContain('updatedAt');
  });
});
