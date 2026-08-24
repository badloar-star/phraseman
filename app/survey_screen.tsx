// Compatibility route for older deep links and retained navigation entries.
// Home owns the primary survey sheet; this route only validates the scoped
// handoff and renders the exact same sheet surface.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import SurveySheetModal from '../components/survey/SurveySheetModal';
import { FlowText } from '../components/text-integrity';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { screenTextOnGradient } from '../constants/theme';
import { hapticTap } from '../hooks/use-haptics';
import {
  captureAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import { getUtcDayKey } from './local_date';
import { safeRouterBack } from './navigation_back';
import { clearPrimedSurvey, takePrimedSurvey } from './survey_handoff';
import type { SurveyLaunch } from './survey_flow_controller';
import { getCanonicalUserId } from './user_id_policy';

type ScopeIdentityState =
  | { phase: 'checking'; key: string }
  | { phase: 'rejected'; key: string }
  | { phase: 'verified'; key: string; stableId: string; account: AccountGenerationToken };

export default function SurveyScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const { theme: t, f, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const directOpenDayKey = useRef(getUtcDayKey()).current;
  const params = useLocalSearchParams<{
    surveyId?: string;
    stableId?: string;
    dayKey?: string;
    lang?: string;
  }>();
  const surveyId = String(params.surveyId ?? '');
  const scope = useMemo(() => {
    const stableId = String(params.stableId ?? '');
    const dayKey = String(params.dayKey ?? '');
    return stableId && dayKey && params.lang === lang ? { stableId, dayKey, lang } : undefined;
  }, [lang, params.dayKey, params.lang, params.stableId]);
  const routeScopeKey = `${surveyId}:${String(params.stableId ?? '')}:${String(params.dayKey ?? '')}:${String(params.lang ?? '')}:${lang}`;
  const [scopeIdentity, setScopeIdentity] = useState<ScopeIdentityState>({ phase: 'checking', key: '' });
  const [routeVisible, setRouteVisible] = useState(true);
  const closeStartedRef = useRef(false);

  useEffect(() => {
    let active = true;
    closeStartedRef.current = false;
    setRouteVisible(true);
    setScopeIdentity({ phase: 'checking', key: routeScopeKey });
    void getCanonicalUserId()
      .then((canonicalStableId) => {
        if (!active) return;
        const account = captureAccountGeneration();
        const valid = Boolean(
          scope
          && canonicalStableId
          && canonicalStableId === scope.stableId
          && scope.dayKey === getUtcDayKey()
          && account.phase === 'active'
          && account.stableId === canonicalStableId,
        );
        setScopeIdentity(valid
          ? { phase: 'verified', key: routeScopeKey, stableId: canonicalStableId, account }
          : { phase: 'rejected', key: routeScopeKey });
      })
      .catch(() => {
        if (active) setScopeIdentity({ phase: 'rejected', key: routeScopeKey });
      });
    return () => {
      active = false;
    };
  }, [routeScopeKey, scope]);

  const scopeIdentityVerified = scopeIdentity.key === routeScopeKey && scopeIdentity.phase === 'verified'
    ? scopeIdentity
    : null;
  const survey = useMemo(() => {
    if (!scopeIdentityVerified || !scope) return null;
    return takePrimedSurvey(surveyId, scope);
  }, [scope, scopeIdentityVerified, surveyId]);
  const openedDayKey = scope?.dayKey ?? directOpenDayKey;
  const launch = useMemo<SurveyLaunch | null>(() => {
    if (!survey || !scopeIdentityVerified) return null;
    return { survey, stableId: scopeIdentityVerified.stableId, dayKey: openedDayKey, lang };
  }, [lang, openedDayKey, scopeIdentityVerified, survey]);
  const launchAccount = scopeIdentityVerified?.account ?? null;
  const launchKey = launch
    ? `${launch.survey.surveyId}:${launch.stableId}:${launch.dayKey}:${launch.lang}`
    : routeScopeKey;

  const closeRoute = useCallback(() => {
    if (closeStartedRef.current) return;
    closeStartedRef.current = true;
    clearPrimedSurvey();
    safeRouterBack(router);
  }, [router]);
  const requestRouteDismiss = useCallback(() => {
    setRouteVisible(false);
  }, []);

  useEffect(() => {
    if (!launch || !launchAccount) return undefined;
    const closeIfAccountChanged = (account = captureAccountGeneration()) => {
      const mismatch = account.phase !== 'active'
        || account.generation !== launchAccount.generation
        || account.stableId !== launch.stableId;
      if (mismatch) requestRouteDismiss();
    };
    closeIfAccountChanged();
    const subscription = subscribeAccountGeneration(closeIfAccountChanged);
    const now = new Date();
    const nextUtcDayMs = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
    );
    const routeUtcDayBoundaryTimeout = setTimeout(() => {
      if (getUtcDayKey() !== launch.dayKey) requestRouteDismiss();
    }, Math.max(1, nextUtcDayMs - Date.now() + 25));
    return () => {
      subscription.remove();
      clearTimeout(routeUtcDayBoundaryTimeout);
    };
  }, [launch, launchAccount, requestRouteDismiss]);

  const identityPending = scopeIdentity.key !== routeScopeKey || scopeIdentity.phase === 'checking';
  if (identityPending) {
    return (
      <ScreenGradient>
        <SafeAreaView style={styles.fill}>
          <ContentWrap>
            <View style={styles.centerBox}>
              <ActivityIndicator color={sx.primary} />
            </View>
          </ContentWrap>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  if (!launch) {
    return (
      <UnavailableSurvey
        message={triLang(lang, {
          ru: 'Опрос недоступен.', uk: 'Опитування недоступне.', es: 'Encuesta no disponible.',
          'pt-BR': 'Pesquisa indisponível.', vi: 'Khảo sát không khả dụng.', id: 'Survei tidak tersedia.',
          tr: 'Anket kullanılamıyor.', pl: 'Ankieta niedostępna.',
        })}
        onClose={() => {
          hapticTap();
          closeRoute();
        }}
        textColor={sx.primary}
        buttonTextColor={t.bgPrimary}
        fontBody={f.body}
      />
    );
  }

  return (
    <ScreenGradient>
      <SurveySheetModal
        key={launchKey}
        visible={routeVisible}
        launch={launch}
        onClose={requestRouteDismiss}
        onDismissed={closeRoute}
      />
    </ScreenGradient>
  );
}

function UnavailableSurvey({
  message,
  onClose,
  textColor,
  buttonTextColor,
  fontBody,
}: {
  message: string;
  onClose: () => void;
  textColor: string;
  buttonTextColor: string;
  fontBody: number;
}) {
  return (
    <ScreenGradient>
      <SafeAreaView style={styles.fill}>
        <ContentWrap>
          <View style={styles.centerBox}>
            <FlowText provenance="authored" style={{ color: textColor, fontSize: fontBody }}>
              {message}
            </FlowText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="OK"
              onPress={onClose}
              style={[styles.primaryBtn, { backgroundColor: textColor }]}
            >
              <FlowText provenance="authored" style={{ color: buttonTextColor, fontWeight: '700', fontSize: fontBody }}>
                OK
              </FlowText>
            </Pressable>
          </View>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  primaryBtn: { minWidth: 88, minHeight: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
});
