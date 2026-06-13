import { buildReferralShareLinks } from './referral_bootstrap';
import { generateReferralCode, getReferralCode } from './referral_system';
import type { Lang } from '../constants/i18n';

export type InviteShareLang = Lang;

export type ReferralInviteShare = { message: string; url: string };

function buildReferralInviteShare(inviteHttps: string): ReferralInviteShare {
  return {
    message: inviteHttps,
    url: inviteHttps,
  };
}

/**
 * Готовит чистую invite-ссылку для системного Share.
 * `message` намеренно равен только URL, без текста перед ссылкой.
 */
export async function buildCloudReferralInviteShare(params: {
  lang: InviteShareLang;
  userName: string;
}): Promise<ReferralInviteShare | null> {
  await generateReferralCode(params.userName || 'User');
  const refCode = await getReferralCode();
  if (!refCode) return null;
  const { https: inviteHttps } = buildReferralShareLinks(refCode);
  return buildReferralInviteShare(inviteHttps);
}

/* expo-router route shim: utility module under app/ */
export default function __RouteShim() {
  return null;
}
