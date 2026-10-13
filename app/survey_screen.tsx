// Compatibility route for older deep links and retained navigation entries.
// Home owns the primary survey sheet; this route only validates the scoped
// handoff and renders the exact same sheet surface.
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import BouncyScrollView from '../components/BouncyScrollView';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import PressableHybrid from '../components/PressableHybrid';
import SafeLinearGradient from '../components/SafeLinearGradient';
import ScreenGradient from '../components/ScreenGradient';
import SurveySheetModal from '../components/survey/SurveySheetModal';
import { FlowText } from '../components/text-integrity';
import { FONT_SCALE, useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { screenTextOnGradient } from '../constants/theme';
import { hapticTap } from '../hooks/use-haptics';
import {
  captureAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import { getUtcDayKey } from './local_date';
import { safeRouterBack } from './navigation_back';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { clearPrimedSurvey, takePrimedSurvey } from './survey_handoff';
import type { SurveyLaunch } from './survey_flow_controller';
import { getCanonicalUserId } from './user_id_policy';
import { CLOUD_SYNC_ENABLED } from './config';
import { peekStableId } from './stable_id';

type ScopeIdentityState =
  | { phase: 'checking'; key: string }
  | { phase: 'rejected'; key: string }
  | { phase: 'verified'; key: string; stableId: string; account: AccountGenerationToken };

export default function SurveyScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const { theme: t, fontSize, uiScale, liquidGlassThemeId, themeMode } = useTheme();
  const sx = useMemo(() => screenTextOnGradient(t, themeMode), [t, themeMode]);
  const insets = useStableSafeAreaInsets();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const designScale = FONT_SCALE[fontSize] / FONT_SCALE.medium * uiScale;
  const scaled = useCallback((value: number) => Math.round(value * designScale), [designScale]);
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
  // зачем (правило владельца «каждый раздел открывается мгновенно», аудит 04.10): раньше на КАЖДОМ открытии весь экран был спиннером, пока
  // шёл await getCanonicalUserId. Если stable id уже в памяти и совпадает с областью маршрута — подтверждаем в первом же кадре,
  // а каноническая проверка по-прежнему идёт фоном и закрывает маршрут при расхождении (см. эффект ниже).
  const syncVerifiedIdentity = (): ScopeIdentityState | null => {
    if (!CLOUD_SYNC_ENABLED || !scope) return null;
    const peeked = peekStableId();
    const account = captureAccountGeneration();
    if (!peeked || peeked !== scope.stableId || scope.dayKey !== getUtcDayKey()
      || account.phase !== 'active' || account.stableId !== peeked) return null;
    return { phase: 'verified', key: routeScopeKey, stableId: peeked, account };
  };
  const [scopeIdentity, setScopeIdentity] = useState<ScopeIdentityState>(
    () => syncVerifiedIdentity() ?? { phase: 'checking', key: '' },
  );
  const [routeVisible, setRouteVisible] = useState(true);
  const closeStartedRef = useRef(false);

  useEffect(() => {
    let active = true;
    closeStartedRef.current = false;
    setRouteVisible(true);
    // Первый проход: если синхронная проверка уже подтвердила область — не сбрасываем в «checking» (иначе вернётся спиннер на кадр).
    const syncVerified = syncVerifiedIdentity();
    setScopeIdentity((current) => (
      syncVerified ?? (current.key === routeScopeKey && current.phase === 'verified' ? current : { phase: 'checking', key: routeScopeKey })
    ));
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
        setScopeIdentity(valid && canonicalStableId
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
        <View style={{ flex: 1, paddingTop: insets.top, paddingRight: insets.right, paddingBottom: insets.bottom, paddingLeft: insets.left }}>
          <ContentWrap>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <ActivityIndicator color={sx.primary} />
            </View>
          </ContentWrap>
        </View>
      </ScreenGradient>
    );
  }

  if (!launch) {
    return (
      <UnavailableSurvey
        title={triLang(lang, {
          ru: 'Опрос', uk: 'Опитування', en: 'Survey', es: 'Encuesta', 'pt-BR': 'Pesquisa',
          vi: 'Khảo sát', id: 'Survei', tr: 'Anket', pl: 'Ankieta',
        })}
        closeAccessibilityLabel={triLang(lang, {
          ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar',
          vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
        })}
        message={triLang(lang, {
          ru: 'Сейчас опрос недоступен. Можно вернуться в приложение и продолжить занятия.', en: 'The survey is unavailable right now. You can return to the app and keep practicing.', uk: 'Зараз опитування недоступне. Можна повернутися в застосунок і продовжити заняття.', es: 'La encuesta no está disponible ahora. Puedes volver a la aplicación y seguir practicando.',
          'pt-BR': 'A pesquisa está indisponível agora. Você pode voltar ao aplicativo e continuar praticando.', vi: 'Khảo sát hiện không khả dụng. Bạn có thể quay lại ứng dụng và tiếp tục học.', id: 'Survei sedang tidak tersedia. Kamu bisa kembali ke aplikasi dan melanjutkan latihan.',
          tr: 'Anket şu anda kullanılamıyor. Uygulamaya dönüp çalışmaya devam edebilirsin.', pl: 'Ankieta jest teraz niedostępna. Możesz wrócić do aplikacji i kontynuować naukę.',
        })}
        // зачем: паритет с макетом PRF-13 — кнопка «Вернуться» вместо «OK»
        actionLabel={triLang(lang, {
          ru: 'Вернуться', uk: 'Повернутися', en: 'Go back', es: 'Volver', 'pt-BR': 'Voltar',
          vi: 'Quay lại', id: 'Kembali', tr: 'Geri dön', pl: 'Wróć',
        })}
        onClose={() => {
          hapticTap();
          closeRoute();
        }}
        insets={insets}
        colors={{
          text: glass.text,
          secondary: glass.secondary,
          control: glass.opaqueControl,
          icon: glass.lightTint,
          sheen: glass.selected,
          cta: glass.cta,
          ctaInk: glass.ctaInk,
        }}
        scaled={scaled}
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
  title,
  closeAccessibilityLabel,
  message,
  actionLabel,
  onClose,
  insets,
  colors,
  scaled,
}: {
  title: string;
  closeAccessibilityLabel: string;
  message: string;
  actionLabel: string;
  onClose: () => void;
  insets: { top: number; right: number; bottom: number; left: number };
  colors: {
    text: string;
    secondary: string;
    control: string;
    icon: string;
    sheen: string;
    cta: string;
    ctaInk: string;
  };
  scaled: (value: number) => number;
}) {
  const boundary = message.indexOf('. ');
  // зачем: паритет profile.html PRF-13 (13.10): заголовок пустого состояния — без точки в конце («Сейчас опрос недоступен»), во всех языках
  const heading = (boundary >= 0 ? message.slice(0, boundary + 1) : message).replace(/[.。]\s*$/, '');
  const body = boundary >= 0 ? message.slice(boundary + 2) : '';

  return (
    <ScreenGradient artBackdrop="settings">
      <View
        testID="survey-fallback-safe-frame"
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingRight: insets.right,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
        }}
      >
        <ContentWrap>
          {/* зачем: паритет profile.html PRF-13 (13.10): шапка и заголовок — в поле экрана 20 (ContentWrap полей не даёт);
              «назад» — голый шеврон 21 без круга и кромки (`.rb.bare`), зона нажатия 48×44 */}
          <View style={{ paddingHorizontal: 20 }}>
          <PressableHybrid
            testID="survey-fallback-close"
            accessibilityLabel={closeAccessibilityLabel}
            accessibilityRole="button"
            onPress={onClose}
            withHaptic={false}
            withSound={false}
            variant="icon"
            style={{ width: 48, height: 44, alignSelf: 'flex-start', marginTop: 4 }}
            contentStyle={{ width: 48, height: 44, alignItems: 'flex-start', justifyContent: 'center' }}
          >
            <Ionicons
              name="chevron-back"
              size={21}
              color={colors.text}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
          </PressableHybrid>

          <FlowText
            testID="survey-fallback-title"
            provenance="authored"
            accessibilityRole="header"
            style={{ color: colors.text, fontSize: scaled(34), lineHeight: scaled(40), fontWeight: '700', letterSpacing: -0.5, marginTop: 10 }}
          >
            {title}
          </FlowText>
          </View>

          <BouncyScrollView
            testID="survey-fallback-scroll"
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false} decelerationRate="fast"
          >
            <View
              testID="survey-fallback-empty"
              // зачем: в макете PRF-13 отступ сверху 170, но сторож survey_unavailable_* прямо запрещает paddingTop 170 (30.09) —
              // оставлено по центру до решения координатора (вопрос в docs/work/tasks/parity-profile-audit-2026-10-11.md).
              style={{ flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }}
            >
              <View
                testID="survey-fallback-icon-tile"
                // зачем (стиль «Тень»): плитка без кромки — тон фона и блик
                style={{
                  width: 61,
                  height: 61,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.control,
                  overflow: 'hidden',
                }}
              >
                <SafeLinearGradient
                  testID="survey-fallback-icon-sheen"
                  pointerEvents="none"
                  colors={[colors.sheen, 'transparent']}
                  style={{ position: 'absolute', inset: 0 }}
                />
                <Ionicons
                  name="chatbubble-outline"
                  size={25}
                  color={colors.icon}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              </View>

              <View testID="survey-fallback-message" style={{ alignItems: 'center' }}>
                <FlowText
                  testID="survey-fallback-heading"
                  provenance="authored"
                        style={{ color: colors.text, fontSize: scaled(20), lineHeight: scaled(26), fontWeight: '700', textAlign: 'center', marginTop: 17 }}
                >
                  {heading}
                </FlowText>
                {body ? (
                  <FlowText
                    testID="survey-fallback-body"
                    provenance="authored"
                            style={{ color: colors.secondary, fontSize: scaled(14), lineHeight: scaled(20), fontWeight: '400', textAlign: 'center', maxWidth: 280, marginTop: 7 }}
                  >
                    {body}
                  </FlowText>
                ) : null}
              </View>

              <PressableHybrid
                testID="survey-fallback-ok"
                accessibilityLabel={actionLabel}
                accessibilityRole="button"
                onPress={onClose}
                withHaptic={false}
                withSound={false}
                variant="primary"
                style={{ minWidth: 88, marginTop: 20 }}
                // зачем: паритет profile.html PRF-13 (13.10): малая кнопка `.cta.sm` — 42, r21, поля 18, 16/600
                contentStyle={{ minHeight: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, backgroundColor: colors.cta }}
              >
                <FlowText testID="survey-cta-label" provenance="authored" style={{ color: colors.ctaInk, fontWeight: '600', fontSize: scaled(16), lineHeight: scaled(21) }}>
                  {actionLabel}
                </FlowText>
              </PressableHybrid>
            </View>
          </BouncyScrollView>
        </ContentWrap>
      </View>
    </ScreenGradient>
  );
}
