import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter, useRootNavigationState } from 'expo-router';
import { useTheme } from '../components/ThemeContext';
import { monoIcon } from '../constants/monoIcon';

type RouteParams = Record<string, string | string[]>;

export default function RetiredPremiumModalV2Redirect() {
  const router = useRouter();
  const { themeMode } = useTheme();
  const params = useLocalSearchParams<RouteParams>();
  // Ждём монтирования рут-навигатора: при холодном старте по legacy deep-link этот
  // экран может оказаться первым, и replace до монтирования бросает Root Layout error.
  const rootNavReady = Boolean(useRootNavigationState()?.key);
  const dispatchedRef = useRef(false);

  useEffect(() => {
    if (!rootNavReady || dispatchedRef.current) return;
    dispatchedRef.current = true;
    router.replace({
      pathname: '/premium_modal',
      params: { ...params },
    } as any);
    // This route is retired and only forwards legacy links once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootNavReady]);

  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color={monoIcon(themeMode, '#34d399')} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090d11',
  },
});
