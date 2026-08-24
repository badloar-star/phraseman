import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PressableHybrid from '../components/PressableHybrid';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import {
  preparePhoneStateNativeSmoke,
  verifyPhoneStateNativeSmoke,
} from '../modules/phone-state/native_smoke';
import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';

const DEV_TOOLS_ENABLED = ENABLE_DEV_TOOLS && !IS_STORE_RELEASE;

const KNOWN_ERROR_CODES = new Set([
  'phone_state_native_unavailable',
  'phone_state_scope_invalid',
  'phone_state_key_invalid',
  'phone_state_sqlcipher_unavailable',
  'phone_state_cipher_integrity_failed',
  'phone_state_native_smoke_marker_missing',
  'phone_state_native_smoke_restart_required',
  'phone_state_native_smoke_open_failed',
  'phone_state_native_smoke_schema_failed',
  'phone_state_native_smoke_marker_write_failed',
  'phone_state_native_smoke_marker_read_failed',
  'phone_state_native_smoke_close_failed',
]);

type SmokeMode = 'prepare' | 'verify';
type SmokeStatus = 'IDLE' | 'RUNNING' | 'PREPARED' | 'VERIFIED' | 'FAILED';
type SmokeViewState = Readonly<{
  status: SmokeStatus;
  detail: string;
}>;

const STATUS_TEST_IDS: Record<SmokeStatus, string> = {
  IDLE: 'phone-state-smoke-status-idle',
  RUNNING: 'phone-state-smoke-status-running',
  PREPARED: 'phone-state-smoke-status-prepared',
  VERIFIED: 'phone-state-smoke-status-verified',
  FAILED: 'phone-state-smoke-status-failed',
};

function sanitizedErrorCode(error: unknown): string {
  const candidate = error instanceof Error ? error.message : '';
  return KNOWN_ERROR_CODES.has(candidate)
    ? candidate
    : 'phone_state_native_smoke_failed';
}

export default function PhoneStateSqlcipherSmokeScreen() {
  const { theme: t, f, ds } = useTheme();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [viewState, setViewState] = useState<SmokeViewState>({
    status: 'IDLE',
    detail: 'No smoke operation has run in this process.',
  });
  const runningRef = useRef(false);
  const autoRunStartedRef = useRef(false);

  const run = useCallback(async (requestedMode: SmokeMode): Promise<void> => {
    if (!DEV_TOOLS_ENABLED || runningRef.current) return;

    runningRef.current = true;
    setViewState({ status: 'RUNNING', detail: `Running ${requestedMode}…` });
    try {
      if (requestedMode === 'prepare') {
        const result = await preparePhoneStateNativeSmoke();
        setViewState({
          status: 'PREPARED',
          detail: `Persisted at ${new Date(result.createdAtMs).toISOString()}.`,
        });
      } else {
        const result = await verifyPhoneStateNativeSmoke();
        setViewState({
          status: 'VERIFIED',
          detail: `Recovered record from ${new Date(result.createdAtMs).toISOString()}.`,
        });
      }
    } catch (error) {
      setViewState({ status: 'FAILED', detail: sanitizedErrorCode(error) });
    } finally {
      runningRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!DEV_TOOLS_ENABLED || autoRunStartedRef.current) return;
    if (mode === 'prepare' || mode === 'verify') {
      autoRunStartedRef.current = true;
      void run(mode);
    }
  }, [mode, run]);

  if (!DEV_TOOLS_ENABLED) {
    return <Redirect href="/" />;
  }

  const isBusy = viewState.status === 'RUNNING';
  const isSuccess = viewState.status === 'PREPARED' || viewState.status === 'VERIFIED';
  const statusBackground = isSuccess
    ? t.correct
    : viewState.status === 'FAILED'
      ? t.wrongBg
      : t.bgCard;
  const statusForeground = isSuccess
    ? t.correctText
    : viewState.status === 'FAILED'
      ? t.wrong
      : t.textPrimary;

  return (
    <ScreenGradient>
      <SafeAreaView style={styles.safeArea} testID="phone-state-smoke-screen">
        <ScrollView
          contentContainerStyle={[styles.content, { padding: ds.spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.column}>
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}
            >
              Phone-state SQLCipher smoke
            </Text>
            <Text style={[styles.body, { color: t.textMuted, fontSize: f.body }]}>
              Internal persistence check for a real Android or iOS process restart.
            </Text>

            <View
              accessibilityLiveRegion="polite"
              style={[styles.statusCard, { backgroundColor: statusBackground, borderColor: t.border }]}
            >
              <Text
                testID={STATUS_TEST_IDS[viewState.status]}
                style={[styles.statusToken, { color: statusForeground, fontSize: f.bodyLg }]}
              >
                {viewState.status}
              </Text>
              <Text style={[styles.detail, { color: statusForeground, fontSize: f.body }]}>
                {viewState.detail}
              </Text>
            </View>

            <View style={styles.instructions}>
              <View testID="phone-state-smoke-step-prepare" style={styles.instructionGroup}>
                <Text style={[styles.step, { color: t.textPrimary, fontSize: f.body }]}>
                  1. Open the Prepare deep link:
                </Text>
                <Text
                  selectable
                  testID="phone-state-smoke-link-prepare"
                  style={[
                    styles.link,
                    { color: t.textPrimary, backgroundColor: t.bgCard, borderColor: t.border },
                  ]}
                >
                  phraseman://_phone_state_sqlcipher_smoke?mode=prepare
                </Text>
              </View>
              <View testID="phone-state-smoke-step-android" style={styles.instructionGroup}>
                <Text style={[styles.step, { color: t.textPrimary, fontSize: f.body }]}>
                  2. Android: use adb to open the Prepare link. After PREPARED, force-stop the
                  process, then use adb to open the Verify link:
                </Text>
                <Text
                  selectable
                  testID="phone-state-smoke-link-verify"
                  style={[
                    styles.link,
                    { color: t.textPrimary, backgroundColor: t.bgCard, borderColor: t.border },
                  ]}
                >
                  phraseman://_phone_state_sqlcipher_smoke?mode=verify
                </Text>
              </View>
              <View testID="phone-state-smoke-step-ios" style={styles.instructionGroup}>
                <Text style={[styles.step, { color: t.textPrimary, fontSize: f.body }]}>
                  3. iOS: tap/open the Prepare link. After PREPARED, terminate the app, then
                  tap/open the Verify link above.
                </Text>
              </View>
            </View>

            <PressableHybrid
              testID="phone-state-smoke-prepare"
              variant="primary"
              busy={isBusy}
              disabled={isBusy}
              silent
              onPress={() => { void run('prepare'); }}
              accessibilityLabel="Prepare SQLCipher restart smoke test"
              accessibilityHint="Creates and closes the isolated native smoke database"
              contentStyle={[
                styles.button,
                { minHeight: 44, backgroundColor: t.accent, borderRadius: ds.radius.lg },
              ]}
            >
              <Text style={[styles.buttonText, { color: t.correctText, fontSize: f.bodyLg }]}>
                Prepare
              </Text>
            </PressableHybrid>

            <PressableHybrid
              testID="phone-state-smoke-verify"
              variant="secondary"
              busy={isBusy}
              disabled={isBusy}
              silent
              onPress={() => { void run('verify'); }}
              accessibilityLabel="Verify SQLCipher restart smoke test"
              accessibilityHint="Reopens the isolated database and verifies its persisted marker"
              contentStyle={[
                styles.button,
                styles.secondaryButton,
                {
                  minHeight: 44,
                  backgroundColor: t.bgCard,
                  borderColor: t.border,
                  borderRadius: ds.radius.lg,
                },
              ]}
            >
              <Text style={[styles.buttonText, { color: t.textPrimary, fontSize: f.bodyLg }]}>
                Verify
              </Text>
            </PressableHybrid>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  column: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 520,
    gap: 16,
  },
  title: {
    fontWeight: '900',
    lineHeight: 34,
    textAlign: 'center',
  },
  body: {
    lineHeight: 24,
    textAlign: 'center',
  },
  statusCard: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 520,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statusToken: {
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  detail: {
    lineHeight: 22,
    marginTop: 4,
    textAlign: 'center',
  },
  instructions: {
    gap: 12,
    paddingVertical: 4,
  },
  instructionGroup: {
    gap: 6,
  },
  step: {
    lineHeight: 24,
  },
  link: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondaryButton: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonText: {
    fontWeight: '800',
    textAlign: 'center',
  },
});
