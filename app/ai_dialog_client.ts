/**
 * Клиент для премиум-функции ИИ-диалогов (premiumDialogSend).
 * Паттерн скопирован с community_packs/functionsClient.ts.
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';

const FUNCTIONS_REGION = 'us-central1';

export type DialogChatRole = 'user' | 'assistant';

export interface DialogChatTurn {
  role: DialogChatRole;
  content: string;
}

/** Память коуча для режима companion (собирается из профиля + SRS-истории). */
export interface DialogMemory {
  profile?: string;
  weakWords?: string[];
  summary?: string;
}

export interface PremiumDialogRequest {
  mode: 'scenario' | 'companion';
  userText: string;
  cefr?: string;
  history?: DialogChatTurn[];
  /** scenario-режим */
  role?: string;
  setting?: string;
  goalEn?: string;
  scenarioId?: string;
  /** companion-режим */
  memory?: DialogMemory;
  isPremium?: boolean;
}

export interface PremiumDialogResponse {
  ok: boolean;
  assistantMessage: string;
  remainingQuota: number;
  model: string;
}

export async function callPremiumDialogSend(req: PremiumDialogRequest): Promise<PremiumDialogResponse> {
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = httpsCallable<PremiumDialogRequest, PremiumDialogResponse>(
    getFunctions(getApp(), FUNCTIONS_REGION),
    'premiumDialogSend',
  );
  const res = await fn(req);
  return res.data;
}
