import { readFileSync } from 'node:fs';

const home = readFileSync('app/(tabs)/home.tsx', 'utf8');
const dialogueSession = readFileSync('app/ai_dialog_session.tsx', 'utf8');
const profileSystem = readFileSync('app/profile_card_system.ts', 'utf8');

if (!home.includes('home-profile-card-button')) throw new Error('profile card surface is missing');
if (!dialogueSession.includes("useFeatureAccess('ai_dialog')")) throw new Error('dialogue access gate is missing');
// зачем (TG-8A2D25725DBA, 2026-10-03): app/ai_dialog_ownership.ts (закрытая заглушка покупки диалога за руны, D124/D138) удалён —
// проверка «контракт покупки на месте» потеряла смысл; развязка карточки профиля и доступа к диалогам остаётся.
if (/profile.?card.*(dialog|unlock)|dialog.*(profile.?card|card.?price)/i.test(dialogueSession)) {
  throw new Error('profile-card/dialogue access coupling detected');
}
if (/function\s+\w*(purchase|buy)|profile.?card.*(?:writer|callable)|httpsCallable/i.test(profileSystem)) {
  throw new Error('profile-card purchase writer detected');
}

console.log('PM-185 ACCESS SEPARATION: PASS');
