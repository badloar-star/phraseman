import React, { useState } from 'react';
import { PixelRatio, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLang } from '../components/LangContext';
import { ArenaScreen } from '../components/arena/ArenaScreen';
import { V2Card, V2Cta } from '../components/tournament/tournament_v2_ui';
import { useTournamentPalette } from '../components/tournament/tournament_theme';
import { arenaText } from '../modules/arena/copy';
import { arenaV2InviteAccept, arenaV2InviteDecline } from './arena_client';

/**
 * Системный масштаб шрифта — для высоты строки.
 *
 * В React Native крупный системный шрифт увеличивает `fontSize`, но `lineHeight`
 * задан числом и остаётся прежним: строки наезжают друг на друга и обрезаются.
 * Высота строки умножается на масштаб, поэтому при обычном размере вёрстка та
 * же, а при увеличении — правильная.
 *
 * На главных экранах Арены то же самое делает хук `useArenaFontScale`: он
 * реагирует на смену настройки на ходу. Здесь взято значение на момент
 * загрузки модуля — стили лежат в `StyleSheet`, а часть строк рисуется внутри
 * колбэков списка, где хук вызвать нельзя. Разница видна только если менять
 * системный шрифт, не выходя из приложения.
 */
const FONT_SCALE = PixelRatio.getFontScale();


export default function ArenaInviteScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const P = useTournamentPalette();
  const params = useLocalSearchParams<{ inviteId?: string }>();
  const [inviteId, setInviteId] = useState(typeof params.inviteId === 'string' ? params.inviteId : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const accept = () => {
    if (!inviteId.trim() || busy) return;
    setBusy(true);
    setError(false);
    void arenaV2InviteAccept(inviteId.trim())
      .then((result) => router.replace({ pathname: '/arena_match', params: { matchId: result.matchId, viewerSeat: result.viewerSeat } } as never))
      .catch(() => { setError(true); setBusy(false); });
  };
  /**
   * Отказ от приглашения. Раньше экран уходил домой ЧЕРЕЗ `finally` — то есть
   * и тогда, когда отказ не дошёл. Гость был уверен, что отказался, а хозяин
   * продолжал ждать ответа, которого уже никто не пришлёт.
   */
  const [declineFailed, setDeclineFailed] = useState(false);
  const decline = () => {
    if (!inviteId.trim()) return router.replace('/arena' as never);
    setDeclineFailed(false);
    void arenaV2InviteDecline(inviteId.trim())
      .then(() => router.replace('/arena' as never))
      .catch(() => setDeclineFailed(true));
  };
  return (
    <ArenaScreen title={arenaText(lang, 'join')} variant="tickets" onBack={() => router.replace('/arena' as never)}>
      <V2Card style={styles.card}>
        <Text style={[styles.label, { color: P.text }]}>{arenaText(lang, 'inviteTitle')}</Text>
        <TextInput
          accessibilityLabel={arenaText(lang, 'inviteTitle')}
          autoCapitalize="none"
          autoCorrect={false}
          value={inviteId}
          onChangeText={setInviteId}
          editable={!busy}
          style={[styles.input, { backgroundColor: P.elev, color: P.text }]}
        />
        <V2Cta disabled={!inviteId.trim() || busy} onPress={accept}>{arenaText(lang, 'join')}</V2Cta>
        <V2Cta tone="ghost" onPress={decline}>{arenaText(lang, 'decline')}</V2Cta>
        {declineFailed ? (
          <View style={styles.failure}>
            <Text accessibilityLiveRegion="polite" style={[styles.failureTitle, { color: P.text }]}>{arenaText(lang, 'declineFailed')}</Text>
            <Text style={[styles.failureHint, { color: P.muted }]}>{arenaText(lang, 'declineFailedHint')}</Text>
          </View>
        ) : null}
        {error ? (
          <View style={styles.failure}>
            <Text accessibilityLiveRegion="polite" style={[styles.failureTitle, { color: P.text }]}>{arenaText(lang, 'joinFailed')}</Text>
            <Text style={[styles.failureHint, { color: P.muted }]}>{arenaText(lang, 'joinFailedHint')}</Text>
          </View>
        ) : null}
      </V2Card>
    </ArenaScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  label: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  input: { minHeight: 52, borderRadius: 16, paddingHorizontal: 14, fontSize: 16, fontWeight: '700' },
  error: { textAlign: 'center', fontWeight: '700' },
  failure: { gap: 4 },
  failureTitle: { fontSize: 16, fontWeight: '900', textAlign: 'center' },
  failureHint: { fontSize: 13, lineHeight: 19 * FONT_SCALE, fontWeight: '600', textAlign: 'center' },
});
