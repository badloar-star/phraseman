import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENABLE_DEV_TOOLS } from './config';

const VIP_SURVEY_DEV_AUTH_EMAIL_KEY = 'vip_survey_e2e_email';
const VIP_SURVEY_DEV_AUTH_PASSWORD_KEY = 'vip_survey_e2e_password';
const ADMIN_VIP_DEV_AUTH_EMAIL_KEY = 'admin_vip_e2e_email';
const ADMIN_VIP_DEV_AUTH_PASSWORD_KEY = 'admin_vip_e2e_password';

function credentialUid(credential: unknown, auth: any): string {
  const row = credential as { user?: { uid?: unknown } } | null | undefined;
  return String(row?.user?.uid || auth?.currentUser?.uid || '').trim();
}

export async function readSavedDevCredential(): Promise<{ email: string; password: string } | null> {
  if (!ENABLE_DEV_TOOLS) return null;
  const pairs = await AsyncStorage.multiGet([
    VIP_SURVEY_DEV_AUTH_EMAIL_KEY,
    VIP_SURVEY_DEV_AUTH_PASSWORD_KEY,
    ADMIN_VIP_DEV_AUTH_EMAIL_KEY,
    ADMIN_VIP_DEV_AUTH_PASSWORD_KEY,
  ]);
  const get = (key: string) => String(pairs.find((pair) => pair[0] === key)?.[1] || '').trim();
  const email = get(VIP_SURVEY_DEV_AUTH_EMAIL_KEY) || get(ADMIN_VIP_DEV_AUTH_EMAIL_KEY);
  const password = get(VIP_SURVEY_DEV_AUTH_PASSWORD_KEY) || get(ADMIN_VIP_DEV_AUTH_PASSWORD_KEY);
  return email && password ? { email, password } : null;
}

export async function signInWithDevEmailCredential(auth: any, createIfMissing: boolean): Promise<string> {
  if (!ENABLE_DEV_TOOLS) throw new Error('dev_auth_disabled');
  const saved = await readSavedDevCredential();
  const email = saved?.email || `vip-survey-e2e-${Date.now()}@phraseman.test`;
  const password = saved?.password || `VipSurveyE2E-${Date.now()}-local`;
  let credential: unknown = null;
  if (saved && typeof auth?.signInWithEmailAndPassword === 'function') {
    credential = await auth.signInWithEmailAndPassword(email, password);
  } else if (createIfMissing && typeof auth?.createUserWithEmailAndPassword === 'function') {
    credential = await auth.createUserWithEmailAndPassword(email, password);
    await AsyncStorage.multiSet([
      [VIP_SURVEY_DEV_AUTH_EMAIL_KEY, email],
      [VIP_SURVEY_DEV_AUTH_PASSWORD_KEY, password],
    ]);
  } else {
    throw new Error('dev_email_auth_unavailable');
  }
  const uid = credentialUid(credential, auth);
  if (!uid) throw new Error('dev_email_auth_missing_uid');
  return uid;
}
