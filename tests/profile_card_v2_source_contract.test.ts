// Визитка 2.0 (макет profile-card-pro.html, владелец 2026-09-30) — исходниковый
// контракт и чистые правила. Сторожит:
//  • testID всех действий визитки (закрыть, жалоба, друзья, лайк, поделиться,
//    повысить ранг, «Про визитка», «Стиль», свой текст);
//  • поле ввода своего текста видит ТОЛЬКО владелец «Про» на своей визитке;
//  • чужая визитка показывает текст только при «Про», стиль — только из списка A–F;
//  • монета не обрезается кругом (часть монет овальная);
//  • свой текст пишется только через callable, не в public_profiles напрямую.
import fs from 'node:fs';
import path from 'node:path';

import { normalizePublicProfileCard, precheckProfileCardBio } from '../app/profile_card_public';
import {
  emptyProfileCardProState,
  parseProfileCardProState,
} from '../app/profile_card_pro_state_v1';
import {
  PROFILE_CARD_PRO_STYLE_IDS,
  isProfileCardProStyle,
  resolveProfileCardLook,
} from '../app/profile_card_styles';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const modal = read('components/PlayerProfileModal.tsx');
const body = read('components/profile-card/ProfileCardBody.tsx');
const footer = read('components/profile-card/ProfileCardFooter.tsx');
const bioSheet = read('components/profile-card/ProfileCardBioSheet.tsx');
const proSheet = read('components/profile-card/ProfileCardProSheet.tsx');
const coin = read('components/profile-card/ProfileCardCoin.tsx');
const social = read('components/profile-card/usePlayerProfileSocial.ts');
const selfHook = read('components/profile-card/useSelfProfileCard.ts');
const publicClient = read('app/profile_card_public.ts');
const serverProjection = read('functions/src/public_profile_projection.ts');

describe('profile card v2: testIDs of every action', () => {
  it.each([
    [modal, 'player-profile-modal-sheet'],
    [modal, 'player-profile-close'],
    [modal, 'player-profile-report-user'],
    [modal, 'profile-card-share'],
    [modal, 'profile-card-coin'],
    [modal, 'profile-card-rankup-banner'],
    [footer, 'player-profile-add-friend'],
    [footer, 'player-profile-activity-like'],
    [footer, 'profile-card-upgrade-rank'],
    [footer, 'profile-card-upgrading'],
    [footer, 'profile-card-pro-open'],
    [footer, 'profile-card-style-open'],
    [body, 'profile-card-name'],
    [body, 'profile-card-rank-chip'],
    [body, 'profile-card-bio'],
    [body, 'profile-card-bio-edit'],
    [body, 'profile-card-bio-lock'],
    [bioSheet, 'profile-card-bio-input'],
    [bioSheet, 'profile-card-bio-save'],
    [bioSheet, 'profile-card-bio-counter'],
    [proSheet, 'profile-card-pro-buy'],
    [proSheet, 'profile-card-style-apply'],
    [proSheet, 'profile-card-style-preview'],
  ])('declares %#', (source, id) => {
    // testID задаётся строкой в JSX или аргументом помощника (topIcon('…'), testID={a ? '…' : '…'}).
    expect(source.includes(`testID="${id}"`) || source.includes(`'${id}'`)).toBe(true);
  });

  it('keeps the explicit close button contract', () => {
    expect(modal).toContain('testID="player-profile-close"');
    expect(modal).toContain('onClose: () => void;');
    expect(modal).toContain('onClose={handleClose}');
  });
});

describe('profile card v2: only a Pro owner sees the text input', () => {
  it('renders the text sheet only for the own Pro card', () => {
    expect(modal).toContain("{sheet === 'bio' && isMe && myProOwned ? (");
    expect(modal).toContain('canEditBio={isMe && myProOwned}');
    expect(modal).toContain('showLock={isMe && myPro !== null && !myProOwned}');
    expect(selfHook).toContain("const myProOwned = isMe && myPro?.owned === true && !!myPro.style;");
  });

  it('keeps the only TextInput inside the Pro text sheet', () => {
    for (const source of [modal, body, footer, proSheet]) {
      expect(source).not.toMatch(/<TextInput\b/);
    }
    expect(bioSheet).toMatch(/<TextInput\b/);
  });

  it('gates the pencil by the Pro flag and hides it during the rank-up ceremony', () => {
    expect(body).toContain('const editable = canEditBio && !ceremony;');
    const editIndex = body.indexOf('testID="profile-card-bio-edit"');
    expect(body.lastIndexOf('editable ?', editIndex)).toBeGreaterThan(-1);
  });

  it('shows another player text only when the card is Pro', () => {
    expect(modal).toContain("(isPro ? (otherCard?.bio ?? player.profileCardBio ?? '') : '')");
  });

  it('writes the bio only through the callable, never into public_profiles', () => {
    expect(publicClient).toContain("'profileCardBioSetMine'");
    expect(publicClient).not.toMatch(/public_profiles'\)\.doc\([^)]*\)\.(set|update)\(/);
    expect(serverProjection).toContain('profileCardBio) здесь НЕ принимается');
  });
});

describe('profile card v2: owner rules', () => {
  it('never crops the rank coin into a circle', () => {
    const coinImage = coin.slice(coin.indexOf('export function CoinImage'), coin.indexOf('function Sheen'));
    expect(coinImage).toContain('contentFit="contain"');
    expect(coinImage).not.toMatch(/overflow:\s*'hidden'/);
    // Блик кладётся по силуэту монеты, а не по кругу.
    expect(coin).toContain('maskElement={<CoinImage rank={rank} size={size} />}');
  });

  it('keeps the shared friends store and persistent likes', () => {
    expect(social).toContain('friends_account_store');
    expect(social).toContain('fetchActivityLikeState(uid)');
    expect(social).not.toMatch(/catch\s*\{\s*\}/);
  });

  it('has no cosmetics (D108): no aura or bought avatar rendering', () => {
    expect(modal).not.toMatch(/AvatarAura|auraId|custom:/);
  });

  it('has no silent catch blocks in the card', () => {
    for (const source of [modal, body, footer, bioSheet, proSheet, selfHook]) {
      expect(source).not.toMatch(/catch\s*\{\s*\}/);
      expect(source).not.toMatch(/\.catch\(\(\)\s*=>\s*(\{\s*\}|null|undefined)\)/);
    }
  });
});

describe('profile card v2: pure rules', () => {
  it('lists exactly the six Pro styles A–F, same as the server', () => {
    expect([...PROFILE_CARD_PRO_STYLE_IDS]).toEqual(['holo', 'obs', 'aura', 'ice', 'space', 'neon']);
    expect(serverProjection).toContain("['holo', 'obs', 'aura', 'ice', 'space', 'neon']");
    expect(isProfileCardProStyle('gold')).toBe(false);
  });

  it('resolves the look: Pro with a known style → style, otherwise normal', () => {
    expect(resolveProfileCardLook({ pro: true, style: 'neon' })).toBe('neon');
    expect(resolveProfileCardLook({ pro: false, style: 'neon' })).toBe('normal');
    expect(resolveProfileCardLook({ pro: true, style: 'gold' })).toBe('normal');
    expect(resolveProfileCardLook({ pro: 'true', style: 'obs' })).toBe('normal');
  });

  it('hides another player text when the card is not Pro and caps it at 80 characters', () => {
    expect(normalizePublicProfileCard({ profileCardPro: false, profileCardBio: 'привет' }))
      .toEqual({ pro: false, style: null, bio: '' });
    const long = normalizePublicProfileCard({ profileCardPro: true, profileCardStyle: 'obs', profileCardBio: 'я'.repeat(120) });
    expect(long.pro).toBe(true);
    expect(long.style).toBe('obs');
    expect(Array.from(long.bio)).toHaveLength(80);
    expect(normalizePublicProfileCard(null)).toEqual({ pro: false, style: null, bio: '' });
  });

  it('pre-checks the bio before the network like the server does', () => {
    expect(precheckProfileCardBio('одна строка')).toBeNull();
    expect(precheckProfileCardBio('две\nстроки')).toBe('line_break');
    expect(precheckProfileCardBio('a'.repeat(81))).toBe('too_long');
  });

  it('parses the Pro state strictly: empty = not owned, foreign/corrupt rows throw', () => {
    expect(parseProfileCardProState(null, 'owner-a')).toEqual(emptyProfileCardProState('owner-a'));
    const owned = {
      schemaVersion: 'profile-card-pro.v1', ownerStableId: 'owner-a', owned: true, style: 'space',
      purchase: { operationId: 'profile_card_pro:v1', price: 10000, atMs: 1, style: 'space' },
    };
    expect(parseProfileCardProState(JSON.stringify(owned), 'owner-a').style).toBe('space');
    expect(() => parseProfileCardProState(JSON.stringify(owned), 'owner-b')).toThrow('profile_card_pro_state_corrupt');
    expect(() => parseProfileCardProState('{', 'owner-a')).toThrow('profile_card_pro_state_corrupt');
    expect(() => parseProfileCardProState(JSON.stringify({ ...owned, style: null }), 'owner-a'))
      .toThrow('profile_card_pro_state_corrupt');
  });
});
