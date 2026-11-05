const buildReferralShareLinks = jest.fn((code: string) => ({
  https: `https://phraseman.app/invite?ref=${code}`,
}));
const getReferralCode = jest.fn(async () => 'LADDER-42');
const generateReferralCode = jest.fn(async () => 'LADDER-42');
let ladderEnabled = false;

jest.mock('../app/referral_bootstrap', () => ({ buildReferralShareLinks }));
jest.mock('../app/referral_system', () => ({ getReferralCode, generateReferralCode }));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ generation: 1 }),
  isCurrentAccountGeneration: () => true,
}));
jest.mock('../app/referral_ladder_flag', () => ({
  isReferralLadderEnabled: () => ladderEnabled,
}));

import { buildCloudReferralInviteShare } from '../app/referral_invite_share';

const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('referral share follows the active referral program', () => {
  beforeEach(() => {
    ladderEnabled = false;
    jest.clearAllMocks();
  });

  it('keeps the legacy Plus-purchase/key copy when roulette is active', async () => {
    const share = await buildCloudReferralInviteShare({ lang: 'en', userName: 'User' });
    expect(share?.message).toContain("get Plus — I'll get a key");
    expect(share?.message).toContain('Plus from 1 to 365 days');
    expect(share?.message).not.toContain('500 coins');
  });

  it.each(LANGS)('uses complete ladder copy for %s without the legacy key/roulette promise', async (lang) => {
    ladderEnabled = true;
    const share = await buildCloudReferralInviteShare({ lang, userName: 'User' });
    expect(share?.message).toContain('500');
    expect(share?.message).toContain('14');
    expect(share?.message).toContain('30');
    expect(share?.message).not.toMatch(/365|\bkey\b|ключ|ключа|llave|chave|chìa khóa|kunci|anahtar|klucz/iu);
    expect(share?.message).toContain('LADDER-42');
    expect(share?.message?.match(/https:\/\//gu)).toHaveLength(1);
    expect(share?.url).toBe('https://phraseman.app/invite?ref=LADDER-42');
  });

  it('lets a caller pin the mode instead of relying on the cached flag', async () => {
    ladderEnabled = false;
    const ladder = await buildCloudReferralInviteShare({ lang: 'en', userName: 'User', program: 'ladder' });
    expect(ladder?.message).toContain('500 coins');
    ladderEnabled = true;
    const roulette = await buildCloudReferralInviteShare({ lang: 'en', userName: 'User', program: 'roulette' });
    expect(roulette?.message).toContain("I'll get a key");
  });
});
