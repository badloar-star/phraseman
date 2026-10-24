import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import * as Crypto from 'expo-crypto';

import { DebugLogger } from './debug-logger';
import { claimPremiumThemeCondition } from './premium_theme_entitlements';
import { ensurePremiumThemePack } from './premium_theme_pack_cache';

const REGION = 'us-central1';
const CHECKPOINT_MS = 55_000;
const SESSION_GAP_MS = 2 * 60_000;
const LOG = '[PREMIUM-THEME-VIDEO]';

type ReportResponse = Readonly<{
  acceptedSeconds?: unknown;
  totalSeconds?: unknown;
  prefetchEligible?: unknown;
  unlockEligible?: unknown;
}>;

type ActiveSession = {
  videoId: string;
  sessionId: string;
  lastTickAtMs: number;
  lastReportAtMs: number;
  started: boolean;
  inFlight: boolean;
};

let active: ActiveSession | null = null;

function newSession(videoId: string, nowMs: number): ActiveSession {
  return { videoId, sessionId: Crypto.randomUUID().replace(/-/g, ''), lastTickAtMs: nowMs, lastReportAtMs: nowMs, started: false, inFlight: false };
}

async function report(session: ActiveSession, mode: 'start' | 'checkpoint'): Promise<void> {
  session.inFlight = true;
  session.lastReportAtMs = Date.now();
  try {
    const callable = httpsCallable<{ mode: 'start' | 'checkpoint'; sessionId: string }, ReportResponse>(
      getFunctions(getApp(), REGION),
      'premiumThemeVideoWatchReport',
      { timeout: 15_000 },
    );
    const response = await callable({ mode, sessionId: session.sessionId });
    if (active !== session) return;
    session.started = true;
    if (response.data.prefetchEligible === true) void ensurePremiumThemePack('grad_full_horizon', 'near_unlock');
    if (response.data.unlockEligible === true) void claimPremiumThemeCondition('video_200_hours');
  } catch (error) {
    if (active === session) session.started = false;
    DebugLogger.error(`${LOG}:${mode}`, error instanceof Error ? error : new Error(String(error)), 'warning');
  } finally {
    if (active === session) session.inFlight = false;
  }
}

/** Плеер вызывает это только во время реального воспроизведения, раз в секунду. */
export function notePremiumThemeVideoPlaybackTick(videoId: string, nowMs: number): void {
  const id = videoId.trim();
  if (!id || !Number.isFinite(nowMs)) return;
  if (!active || active.videoId !== id || nowMs - active.lastTickAtMs > SESSION_GAP_MS) active = newSession(id, nowMs);
  const session = active;
  session.lastTickAtMs = nowMs;
  if (session.inFlight) return;
  if (!session.started) { void report(session, 'start'); return; }
  if (nowMs - session.lastReportAtMs >= CHECKPOINT_MS) void report(session, 'checkpoint');
}

export function __resetPremiumThemeVideoWatchForTests(): void { active = null; }
