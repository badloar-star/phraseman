import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { arenaText } from '../../modules/arena/copy';
import { useLang } from '../LangContext';
import { useTournamentPalette } from '../tournament/tournament_theme';

export function ArenaConnectionNotice({ onRetry }: { onRetry: () => void }) {
  const { lang } = useLang();
  const P = useTournamentPalette();
  const retryLabel = arenaText(lang, 'retry');

  return (
    <View
      testID="arena-hub-offline"
      accessibilityLiveRegion="polite"
      style={[styles.notice, { backgroundColor: P.elev }]}
    >
      <Ionicons name="cloud-offline-outline" size={20} color={P.muted} />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: P.text }]}>{arenaText(lang, 'hubOffline')}</Text>
        <Text style={[styles.body, { color: P.muted }]}>{arenaText(lang, 'hubOfflineHint')}</Text>
      </View>
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={retryLabel}
        onPress={onRetry}
        style={[styles.retry, { backgroundColor: P.accent }]}
      >
        <Text style={[styles.retryText, { color: P.okInk }]}>{retryLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, padding: 12 },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '900' },
  body: { marginTop: 2, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  retry: { minHeight: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingHorizontal: 12 },
  retryText: { fontSize: 13, fontWeight: '900' },
});
