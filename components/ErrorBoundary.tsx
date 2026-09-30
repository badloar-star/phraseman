// ════════════════════════════════════════════════════════════════════════════
// ErrorBoundary.tsx — Top-level React Error Boundary.
//
// Перехоплює render-помилки у дереві компонентів і показує дружній екран
// замість білого/червоного screen-of-death. Логує до Crashlytics, дозволяє
// користувачу спробувати ще раз (reset state) або вийти з додатку.
//
// Critical для Apple App Review: без error boundary будь-яка несподівана
// помилка ламає увесь додаток → reviewer бачить білий екран → reject.
// ════════════════════════════════════════════════════════════════════════════

import React from 'react';
import {
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from '../app/debug-logger';
import { stableInitialWindowMetrics } from '../app/stable_safe_area_metrics';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  lang: ErrorBoundaryLang;
}

interface Props {
  children: React.ReactNode;
}

const GRAPHITE = liquidGlassTokens('graphite');
const FALLBACK_INSETS = stableInitialWindowMetrics.insets;

const TEXTS = {
  ru: {
    title: 'Что-то пошло не так',
    body: 'Попробуй открыть экран ещё раз.',
    retry: 'Попробовать снова',
    debugTitle: 'Технические детали:',
  },
  uk: {
    title: 'Щось пішло не так',
    body: 'Спробуй відкрити екран ще раз.',
    retry: 'Спробувати знову',
    debugTitle: 'Технічні деталі:',
  },
  en: {
    title: 'Something went wrong',
    body: 'Try opening the screen again.',
    retry: 'Try again',
    debugTitle: 'Technical details:',
  },
  es: {
    title: 'Algo salió mal',
    body: 'Intenta abrir la pantalla de nuevo.',
    retry: 'Intentar de nuevo',
    debugTitle: 'Detalles técnicos:',
  },
  'pt-BR': {
    title: 'Algo deu errado',
    body: 'Tente abrir a tela novamente.',
    retry: 'Tentar novamente',
    debugTitle: 'Detalhes técnicos:',
  },
  vi: {
    title: 'Đã xảy ra lỗi',
    body: 'Hãy thử mở lại màn hình.',
    retry: 'Thử lại',
    debugTitle: 'Chi tiết kỹ thuật:',
  },
  'id': {
    title: 'Terjadi kesalahan',
    body: 'Coba buka layar lagi.',
    retry: 'Coba lagi',
    debugTitle: 'Detail teknis:',
  },
  tr: {
    title: 'Bir şeyler ters gitti',
    body: 'Ekranı yeniden açmayı dene.',
    retry: 'Tekrar dene',
    debugTitle: 'Teknik ayrıntılar:',
  },
  pl: {
    title: 'Coś poszło nie tak',
    body: 'Spróbuj ponownie otworzyć ekran.',
    retry: 'Spróbuj ponownie',
    debugTitle: 'Szczegóły techniczne:',
  },
} as const;

type ErrorBoundaryLang = keyof typeof TEXTS;

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    lang: 'ru',
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    if (__DEV__) {
      console.error('[ErrorBoundary] caught:', error);
      console.error('[ErrorBoundary] info:', errorInfo.componentStack);
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fb = require('../app/firebase');
      fb?.recordError?.(error, errorInfo.componentStack ?? 'render');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const health = require('../app/app_health');
      health?.logAppCritical?.('react:error_boundary', error, {
        feature: 'react',
        screen: 'root',
        tags: { componentStack: (errorInfo.componentStack ?? '').slice(0, 500) },
      });
    } catch (e) {
      DebugLogger.error('ErrorBoundary:health', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  componentDidMount() {
    AsyncStorage.getItem('app_lang').then(v => {
      if (v && Object.prototype.hasOwnProperty.call(TEXTS, v)) {
        this.setState({ lang: v as ErrorBoundaryLang });
      }
    }).catch(() => {});
    this.appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && this.state.hasError) {
        this.setState({ hasError: false, error: null, errorInfo: null });
      }
    });
  }

  componentWillUnmount() {
    this.appStateSub?.remove();
  }

  private appStateSub: { remove: () => void } | undefined;

  render() {
    if (!this.state.hasError) return this.props.children;

    const tx = TEXTS[this.state.lang];
    const showStack = __DEV__ && this.state.error;

    return (
      <ScrollView
        testID="error-boundary-scroll"
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.stage}>
          <View
            testID="error-boundary-warning-art"
            style={styles.warningArt}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={styles.warningMark}>×</Text>
          </View>
          <Text accessibilityRole="header" style={styles.title}>{tx.title}</Text>
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            accessibilityLabel={`${tx.title}. ${tx.body}`}
            style={styles.body}
          >
            {tx.body}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tx.retry}
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85 }]}
            onPress={this.handleRetry}
          >
            <Text style={styles.retryText}>{tx.retry}</Text>
          </Pressable>

          {showStack ? (
            <ScrollView
              decelerationRate="fast"
              style={styles.debugBox}
              contentContainerStyle={{ paddingVertical: 10 }}
              nestedScrollEnabled
            >
              <Text style={styles.debugTitle}>{tx.debugTitle}</Text>
              <Text style={styles.debugText} selectable>
                {this.state.error?.name}: {this.state.error?.message}
              </Text>
              {this.state.errorInfo?.componentStack ? (
                <Text style={styles.debugStack} selectable>
                  {this.state.errorInfo.componentStack}
                </Text>
              ) : null}
            </ScrollView>
          ) : null}
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GRAPHITE.bg,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Math.max(24, FALLBACK_INSETS.top),
    paddingBottom: Math.max(24, FALLBACK_INSETS.bottom),
    paddingLeft: Math.max(24, FALLBACK_INSETS.left),
    paddingRight: Math.max(24, FALLBACK_INSETS.right),
  },
  stage: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  warningArt: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: GRAPHITE.opaqueCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  warningMark: {
    color: GRAPHITE.lightTint,
    fontSize: 38,
    lineHeight: 40,
    fontWeight: '500',
  },
  title: {
    color: GRAPHITE.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    color: GRAPHITE.secondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 440,
    marginBottom: 22,
  },
  retryBtn: {
    width: '100%',
    maxWidth: 320,
    minHeight: 52,
    backgroundColor: GRAPHITE.cta,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: GRAPHITE.ctaInk,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  debugBox: {
    width: '100%',
    marginTop: 18,
    maxHeight: 220,
    backgroundColor: GRAPHITE.opaqueCard,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  debugTitle: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  debugText: {
    color: '#FFB4B4',
    fontSize: 11,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    marginBottom: 6,
  },
  debugStack: {
    color: GRAPHITE.mutedText,
    fontSize: 10,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    lineHeight: 14,
  },
});
