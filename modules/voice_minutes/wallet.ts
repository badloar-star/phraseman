import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { withCallableTimeout } from '../../app/callable_timeout';
import { initFirebaseAppCheckIfAvailable } from '../../app/app_check_init';

const FUNCTIONS_REGION = 'us-central1';
const PENDING_PREFIX = '@phraseman/voice-minutes/pending/v1/';

export type VoiceMinuteWalletStatus = Readonly<{
  availableSeconds: number;
  reservedSeconds: number;
  purchasedSeconds: number;
  refundedSeconds: number;
  chargedSeconds: number;
  eventCount: number;
  credited: boolean;
  updatedAtMs: number | null;
}>;

export type PendingVoiceMinutePurchase = Readonly<{
  stableId: string;
  transactionId: string;
  productId: string;
  baselineEventCount: number;
  createdAtMs: number;
}>;

type WalletCallable = (data: Readonly<{
  expectedTransactionId?: string;
  expectedProductId?: string;
}>) => Promise<{ data?: unknown }>;

let walletCallable: WalletCallable | null = null;

function finiteNonNegative(raw: unknown): number {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

export function parseVoiceMinuteWalletStatus(raw: unknown): VoiceMinuteWalletStatus {
  const value = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  return Object.freeze({
    availableSeconds: finiteNonNegative(value.availableSeconds),
    reservedSeconds: finiteNonNegative(value.reservedSeconds),
    purchasedSeconds: finiteNonNegative(value.purchasedSeconds),
    refundedSeconds: finiteNonNegative(value.refundedSeconds),
    chargedSeconds: finiteNonNegative(value.chargedSeconds),
    eventCount: finiteNonNegative(value.eventCount),
    credited: value.credited === true,
    updatedAtMs: Number.isFinite(Number(value.updatedAtMs)) ? Math.floor(Number(value.updatedAtMs)) : null,
  });
}

function getWalletCallable(): WalletCallable {
  if (!walletCallable) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
    walletCallable = httpsCallable(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'voiceMinuteWalletMine',
    ) as WalletCallable;
  }
  return walletCallable;
}

export async function readVoiceMinuteWalletStatus(
  expected: Readonly<{ expectedTransactionId?: string; expectedProductId?: string }> = {},
): Promise<VoiceMinuteWalletStatus> {
  await initFirebaseAppCheckIfAvailable().catch(() => false);
  const response = await withCallableTimeout(
    getWalletCallable()(expected),
    'voiceMinuteWalletMine',
  );
  return parseVoiceMinuteWalletStatus(response?.data);
}

async function pendingStorageKey(stableId: string, transactionId: string): Promise<string> {
  const normalized = `${stableId.trim()}\n${transactionId.trim()}`;
  if (!stableId.trim() || !transactionId.trim()) throw new Error('voice_minutes_pending_identity_invalid');
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, normalized);
  return `${PENDING_PREFIX}${digest}`;
}

export async function persistPendingVoiceMinutePurchase(
  marker: PendingVoiceMinutePurchase,
): Promise<boolean> {
  const key = await pendingStorageKey(marker.stableId, marker.transactionId);
  await AsyncStorage.setItem(key, JSON.stringify({
    transactionId: marker.transactionId,
    productId: marker.productId,
    baselineEventCount: marker.baselineEventCount,
    createdAtMs: marker.createdAtMs,
  }));
  return true;
}

export async function clearPendingVoiceMinutePurchase(
  stableId: string,
  transactionId: string,
): Promise<void> {
  await AsyncStorage.removeItem(await pendingStorageKey(stableId, transactionId));
}

