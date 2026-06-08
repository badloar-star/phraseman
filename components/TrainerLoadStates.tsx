import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenGradient from './ScreenGradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { triLang, type Lang } from '../constants/i18n';
import { TRAINER_LOAD_COPY } from './trainer_load_copy';

const LOADING_LABEL = TRAINER_LOAD_COPY.loading;
const ERROR_TITLE = TRAINER_LOAD_COPY.errorTitle;
const ERROR_BODY = TRAINER_LOAD_COPY.errorBody;
const RETRY = TRAINER_LOAD_COPY.retry;
const EXIT = TRAINER_LOAD_COPY.exit;

interface LoadingProps {
  lang: Lang;
  accent?: string;
}

/** Видимый индикатор загрузки тренажёра вместо пустого экрана. */
export function TrainerLoadingView({ lang, accent = '#4A9EFF' }: LoadingProps) {
  return (
    <ScreenGradient>
      <SafeAreaView
        testID="trainer-loading"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <ActivityIndicator size="large" color={accent} />
        <Text style={{ color: '#888', marginTop: 14, fontSize: 15, fontWeight: '600' }}>
          {triLang(lang, LOADING_LABEL)}
        </Text>
      </SafeAreaView>
    </ScreenGradient>
  );
}

interface ErrorProps {
  lang: Lang;
  onRetry: () => void;
  onExit: () => void;
  accent?: string;
  mutedColor?: string;
  primaryColor?: string;
}

/** Экран ошибки загрузки тренажёра с retry и выходом — вместо вечного лоадера. */
export function TrainerErrorView({
  lang,
  onRetry,
  onExit,
  accent = '#4A9EFF',
  mutedColor = '#888',
  primaryColor = '#fff',
}: ErrorProps) {
  return (
    <ScreenGradient>
      <SafeAreaView
        testID="trainer-load-error"
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        <Ionicons name="cloud-offline-outline" size={40} color={mutedColor} />
        <Text
          style={{
            color: primaryColor,
            fontSize: 20,
            fontWeight: '900',
            textAlign: 'center',
            marginTop: 14,
          }}
        >
          {triLang(lang, ERROR_TITLE)}
        </Text>
        <Text
          style={{
            color: mutedColor,
            fontSize: 15,
            textAlign: 'center',
            marginTop: 10,
            lineHeight: 22,
          }}
        >
          {triLang(lang, ERROR_BODY)}
        </Text>
        <TouchableOpacity
          testID="trainer-load-retry"
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, RETRY)}
          style={{
            marginTop: 22,
            backgroundColor: accent,
            borderRadius: 16,
            paddingHorizontal: 28,
            paddingVertical: 12,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900' }}>
            {triLang(lang, RETRY)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="trainer-load-exit"
          onPress={onExit}
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, EXIT)}
          style={{ marginTop: 14, paddingHorizontal: 20, paddingVertical: 8 }}
        >
          <Text style={{ color: mutedColor, fontSize: 15, fontWeight: '700' }}>
            {triLang(lang, EXIT)}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </ScreenGradient>
  );
}
