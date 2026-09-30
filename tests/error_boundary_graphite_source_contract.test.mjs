import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('components/ErrorBoundary.tsx', 'utf8');

const approvedCopy = {
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
  id: {
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
};

assert.equal(Object.keys(approvedCopy).length, 9, 'error boundary must retain all nine supported locales');

for (const [locale, fields] of Object.entries(approvedCopy)) {
  const key = locale === 'pt-BR' ? "'pt-BR'" : locale === 'id' ? "'id'" : locale;
  const start = source.indexOf(`${key}: {`);
  const end = source.indexOf('\n  },', start);
  assert.ok(start >= 0 && end > start, `${locale} error-boundary copy block must remain present`);
  const block = source.slice(start, end);
  for (const [field, copy] of Object.entries(fields)) {
    assert.ok(block.includes(`${field}: '${copy}'`), `${locale} ${field} must match the approved truthful fallback copy`);
  }
}

assert.match(source, /const GRAPHITE = liquidGlassTokens\('graphite'\);/, 'fallback must use static graphite tokens without ThemeProvider');
assert.doesNotMatch(source, /useTheme|useSafeAreaInsets|useStableSafeAreaInsets/, 'top-level fallback must not depend on unavailable providers');
assert.match(source, /const FALLBACK_INSETS = stableInitialWindowMetrics\.insets;/, 'fallback must use stable initial native safe-area metrics');
assert.match(source, /paddingTop: Math\.max\(24, FALLBACK_INSETS\.top\)/, 'fallback must clear the upper safe area');
assert.match(source, /paddingBottom: Math\.max\(24, FALLBACK_INSETS\.bottom\)/, 'fallback must clear the lower safe area');
assert.match(source, /<ScrollView[\s\S]*?testID="error-boundary-scroll"[\s\S]*?contentContainerStyle=\{styles\.content\}/, 'fallback content must be reachable in a bounded full-screen scroll surface');
assert.match(source, /testID="error-boundary-warning-art"/, 'compact warning art must remain addressable');
assert.match(source, /accessibilityRole="alert"[\s\S]*?accessibilityLiveRegion="assertive"[\s\S]*?accessibilityLabel=\{`\$\{tx\.title\}\. \$\{tx\.body\}`\}/, 'asynchronous crash fallback must announce the localized title and body');
assert.match(source, /backgroundColor: GRAPHITE\.cta/, 'retry action must use the light graphite CTA');
assert.match(source, /color: GRAPHITE\.ctaInk/, 'retry label must retain legible graphite CTA contrast');
assert.match(source, /accessibilityRole="button"[\s\S]*?onPress=\{this\.handleRetry\}/, 'retry must remain an accessible action wired to the existing callback');
assert.match(source, /handleRetry = \(\) => \{\s*this\.setState\(\{ hasError: false, error: null, errorInfo: null \}\);\s*\};/, 'retry callback must continue clearing only boundary error state');
assert.match(source, /AsyncStorage\.getItem\('app_lang'\)\.then\(v => \{\s*if \(v && Object\.prototype\.hasOwnProperty\.call\(TEXTS, v\)\) \{\s*this\.setState\(\{ lang: v as ErrorBoundaryLang \}\);/, 'saved supported language, including English, must be applied to the fallback');
assert.match(source, /fb\?\.recordError\?\.\(error, errorInfo\.componentStack \?\? 'render'\)/, 'Crashlytics capture must remain wired');
assert.match(source, /health\?\.logAppCritical\?\.\('react:error_boundary'/, 'critical health reporting must remain wired');
assert.match(source, /state === 'active' && this\.state\.hasError/, 'foreground reset behavior must remain intact');
assert.match(source, /this\.appStateSub\?\.remove\(\);/, 'AppState subscription must still be cleaned up');
assert.match(source, /const showStack = __DEV__ && this\.state\.error;/, 'diagnostics must remain DEV-only');
assert.match(source, /showStack \? \([\s\S]*?styles\.debugBox/, 'debug detail must remain gated by the DEV-only value');
assert.doesNotMatch(source, /#06141B|#0F1F26|#C8FF00|#1A2400/, 'legacy teal/lime crash palette must be removed');
assert.doesNotMatch(source, /Прогресс сохранён/, 'fallback must not make an unproven save-progress promise');
assert.doesNotMatch(source, /styles\.card|borderWidth:/, 'fallback must not retain the old inset card outline');
assert.doesNotMatch(source, /BlurView/, 'crash fallback must not add a fragile blur dependency');
