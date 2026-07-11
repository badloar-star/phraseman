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

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  lang: ErrorBoundaryLang;
}

interface Props {
  children: React.ReactNode;
}

const TEXTS = {
  ru: {
    title: 'Что-то пошло не так',
    body: 'Приложение столкнулось с неожиданной ошибкой. Мы автоматически отправили отчёт. Попробуй продолжить или перезапусти Phraseman.',
    retry: 'Попробовать снова',
    debugTitle: 'Технические детали:',
  },
  uk: {
    title: 'Щось пішло не так',
    body: 'Застосунок зіткнувся з несподіваною помилкою. Звіт надіслано автоматично. Спробуй продовжити або перезапусти Phraseman.',
    retry: 'Спробувати знову',
    debugTitle: 'Технічні деталі:',
  },
  es: {
    title: 'Algo salió mal',
    body: 'La app encontró un error inesperado. Ya enviamos el informe automáticamente. Intenta continuar o reinicia Phraseman.',
    retry: 'Intentar de nuevo',
    debugTitle: 'Detalles técnicos:',
  },
  'pt-BR': {
    title: 'Algo deu errado',
    body: 'O app encontrou um erro inesperado. Enviamos o relatório automaticamente. Tente continuar ou reinicie o Phraseman.',
    retry: 'Tentar novamente',
    debugTitle: 'Detalhes técnicos:',
  },
  vi: {
    title: 'Đã xảy ra lỗi',
    body: 'Ứng dụng gặp lỗi bất ngờ. Báo cáo đã được gửi tự động. Hãy thử tiếp tục hoặc khởi động lại Phraseman.',
    retry: 'Thử lại',
    debugTitle: 'Chi tiết kỹ thuật:',
  },
  'id': {
    title: 'Terjadi kesalahan',
    body: 'Aplikasi mengalami kesalahan tak terduga. Laporan sudah dikirim otomatis. Coba lanjutkan atau mulai ulang Phraseman.',
    retry: 'Coba lagi',
    debugTitle: 'Detail teknis:',
  },
  tr: {
    title: 'Bir şeyler ters gitti',
    body: 'Uygulama beklenmeyen bir hatayla karşılaştı. Raporu otomatik olarak gönderdik. Devam etmeyi dene veya Phraseman uygulamasını yeniden başlat.',
    retry: 'Tekrar dene',
    debugTitle: 'Teknik ayrıntılar:',
  },
  pl: {
    title: 'Coś poszło nie tak',
    body: 'Aplikacja napotkała nieoczekiwany błąd. Raport został wysłany automatycznie. Spróbuj kontynuować albo uruchom Phraseman ponownie.',
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
    } catch {}
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
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>{tx.title}</Text>
          <Text style={styles.body}>{tx.body}</Text>

          <Pressable
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85 }]}
            onPress={this.handleRetry}
          >
            <Text style={styles.retryText}>{tx.retry}</Text>
          </Pressable>

          {showStack ? (
            <ScrollView style={styles.debugBox} contentContainerStyle={{ paddingVertical: 8 }}>
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
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06141B',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#0F1F26',
    borderRadius: 20,
    borderWidth: 0,
    borderColor: '#1F3540',
    padding: 28,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    color: '#9AA9B2',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryBtn: {
    width: '100%',
    backgroundColor: '#C8FF00',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  retryText: {
    color: '#1A2400',
    fontSize: 17,
    fontWeight: '700',
  },
  debugBox: {
    width: '100%',
    marginTop: 18,
    maxHeight: 220,
    backgroundColor: '#000000',
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
    color: '#9AA9B2',
    fontSize: 10,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    lineHeight: 14,
  },
});
