import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function read(...parts: string[]) {
  return fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
}

// Фаза 4 (статус V Platinum): золотое имя владельца V в списках + тост «праздника
// легенды». app/arena_leaderboard.tsx в рабочем дереве отсутствует (арена выведена
// из эксплуатации) — контракт покрывает 3 живых списка; если файл вернётся, золото
// надо повторить и там (см. tests/profile_card_badge_layout_contract.test.ts).
const LIST_FILES: { name: string; source: string }[] = [
  { name: 'top_helpers', source: read('app', 'top_helpers.tsx') },
  { name: 'friends', source: read('app', '(tabs)', 'friends.tsx') },
  { name: 'club_screen', source: read('app', 'club_screen.tsx') },
];

describe('legend status — золотое имя владельца карточки V в списках', () => {
  test.each(LIST_FILES.map((f) => [f.name, f.source] as const))(
    '%s: gold accent gated on profileCardLevel >= 5',
    (_name, source) => {
      expect(source).toContain('LEGEND_CARD_NAME_GOLD');
      expect(source).toContain("color: '#F5C842',");
      expect(source).toContain("textShadowColor: 'rgba(245,200,66,0.45)',");
      expect(source).toMatch(/\.{3}\(\(.*profileCardLevel \?\? 0\) >= 5 \? LEGEND_CARD_NAME_GOLD : null\)/);
    },
  );

  test.each(LIST_FILES.map((f) => [f.name, f.source] as const))(
    '%s: badge compact-layout contract lines are untouched',
    (_name, source) => {
      expect(source).toContain("style={{ flexShrink: 1, minWidth: 0, overflow: 'hidden' }}");
      expect(source).toMatch(/style=\{\{ minWidth: 0,(?: maxWidth: '100%',)? overflow: 'hidden' \}\}/);
      expect(source).toMatch(/<ProfileCardBadge level=\{[a-z.]+profileCardLevel\} theme=\{[a-z.]+profileCardTheme\} style=\{\{ marginTop: 3(?:, maxWidth: '100%')? \}\} \/>/);
    },
  );

  it('every Plus identity uses the gold component and no live list uses the green VIP name', () => {
    for (const { source } of LIST_FILES) {
      expect(source).toMatch(/PremiumGoldUserName/);
      expect(source).not.toMatch(/VipGreenUserName/);
      expect(source).toMatch(/isPremium\s*\|\|\s*\w+\.isVip|\.isPremium\s*\|\|\s*\.isVip/);
    }
  });

  it('the shared profile/result text style maps paid and granted Plus to the same gold style', () => {
    const memberStyles = read('components', 'premiumMemberStyles.ts');
    expect(memberStyles).toContain('if (opts.isPremium || opts.isVip) return premiumMemberNameStyle(base, true, opts.themeMode);');
    expect(memberStyles).not.toContain('VIP_MEMBER_NAME_GREEN');
  });
});

describe('legend status — тост «праздника легенды» в модалке (source contract)', () => {
  const modal = read('components', 'PlayerProfileModal.tsx');

  it('fires a separate celebration toast after a fresh V upgrade', () => {
    expect(modal).toContain('if (result.legendNo) {');
    expect(modal).toContain('setTimeout(() => {');
    expect(modal).toContain('Ты стал Легендой № ${legendNo}! Друзья получили +5 💠');
  });

  it('localizes the celebration into all 8 app languages', () => {
    for (const seg of [
      'Ты стал Легендой',
      'Ти став Легендою',
      'Te convertiste en Leyenda',
      'Você virou Lenda',
      'Bạn đã trở thành Huyền thoại',
      'Kamu menjadi Legenda',
      'Efsane № ${legendNo} oldun',
      'Zostałeś Legendą',
    ]) {
      expect(modal).toContain(seg);
    }
    expect(modal.match(/\+5 💠/g)!.length).toBeGreaterThanOrEqual(8);
  });
});

describe('legend status — серверный «праздник легенды» (source contract)', () => {
  const fn = read('functions', 'src', 'profile_card_upgrade.ts');

  it('celebrates only on a fresh V grant, never on an idempotent replay', () => {
    expect(fn).toContain('result.ok && !result.alreadyApplied && result.level === PROFILE_CARD_LEGEND_LEVEL && result.legendNo');
    expect(fn).toContain("const LEGEND_FRIEND_GIFT_REASON = 'legend_celebration_gift';");
  });

  it('credits friends with the same shard markers the other server flows use', () => {
    expect(fn).toContain("shards_updated_op: 'earn',");
    expect(fn).toContain('shards_updated_reason: LEGEND_FRIEND_GIFT_REASON,');
    expect(fn).toContain("friendRef.collection('shard_log').doc()");
  });

  it('announces into the friends feed with a stable doc id', () => {
    expect(fn).toContain(".collection('my_events').doc('legend_celebration')");
    expect(fn).toContain("type: 'achievement',");
    expect(fn).toContain("payload: { icon: '👑', nameRu: `Легенда №${legendNo}` },");
  });
});
