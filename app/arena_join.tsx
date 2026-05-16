import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import ScreenGradient from '../components/ScreenGradient';
import { emitAppEvent } from './events';
import { triLang } from '../constants/i18n';
import { useEnergy } from '../components/EnergyContext';
import { useLang } from '../components/LangContext';
import { joinArenaFriendRoomAsGuest } from './arena_friend_room_guest';

type RoomStatus = 'loading' | 'waiting' | 'not_found' | 'expired' | 'joining';

export default function DuelJoinScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { spendOne, isUnlimited } = useEnergy();
  const { lang } = useLang();
  const defaultPlayerName = () => triLang(lang, { ru: 'Игрок', uk: 'Гравець', es: 'Jugador' });
  const [status, setStatus] = useState<RoomStatus>('loading');
  const [hostName, setHostName] = useState('');

  const checkRoom = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const db = require('@react-native-firebase/firestore').default();
      const doc = await db.collection('arena_rooms').doc(roomId).get();
      if (!doc.exists) { setStatus('not_found'); return; }
      const data = doc.data();
      if (data.expiresAt < Date.now()) { setStatus('expired'); return; }
      setHostName(data.hostName ?? defaultPlayerName());
      setStatus('waiting');
    } catch {
      setStatus('not_found');
    }
  }, [roomId, lang]);

  useEffect(() => {
    if (!roomId) { setStatus('not_found'); return; }
    checkRoom();
  }, [roomId, checkRoom]);

  const handleJoin = async () => {
    setStatus('joining');
    const dn = defaultPlayerName();
    const res = await joinArenaFriendRoomAsGuest(String(roomId), {
      defaultPlayerName: dn,
      spendOne,
      isUnlimited,
    });
    if (res.ok) {
      emitAppEvent('action_toast', {
        type: 'success',
        messageRu: 'Матч готов. Удачи!',
        messageUk: 'Матч готовий. Успіхів!',
        messageEs: '¡La partida está lista! ¡Mucha suerte!',
      });
      router.replace({ pathname: '/arena_game' as any, params: { sessionId: res.sessionId, userId: res.uid } });
      return;
    }
    if (res.code === 'no_energy') {
      setStatus('waiting');
      return;
    }
    if (res.code === 'session_timeout') {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Соперник не подтвердил вход вовремя.',
        messageUk: 'Суперник не підтвердив вхід вчасно.',
        messageEs: 'Tu rival no confirmó a tiempo.',
      });
      setStatus('not_found');
      return;
    }
    emitAppEvent('action_toast', {
      type: 'error',
      messageRu: 'Не удалось присоединиться к комнате.',
      messageUk: 'Не вдалося приєднатися до кімнати.',
      messageEs: 'No ha sido posible unirte a la sala. Inténtalo de nuevo.',
    });
    setStatus('not_found');
  };

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/home' as any);
  }, [router]);

  return (
    <ScreenGradient>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Volver' })}
        activeOpacity={0.85}
        onPress={goBack}
        style={[styles.backBtn, { backgroundColor: t.bgCard, borderColor: t.border }]}
      >
        <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
      </TouchableOpacity>
      <View style={styles.centered}>
        {status === 'loading' && (
          <>
            <Text style={{ fontSize: 64 }}>⚔️</Text>
            <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h1 }]}>
              {triLang(lang, { ru: 'Арена', uk: 'Арена', es: 'Arena' })}
            </Text>
          </>
        )}

        {status === 'waiting' && (
          <>
            <Text style={{ fontSize: 64 }}>⚔️</Text>
            <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h1 }]}>
              {triLang(lang, {
                ru: `Арена с ${hostName}`,
                uk: `Арена з ${hostName}`,
                es: `Duelo con ${hostName}`,
              })}
            </Text>
            <Text style={[{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }]}>
              {triLang(lang, {
                ru: 'Тебя вызвали на арену по английскому!',
                uk: 'Тебе викликали на арену з англійської!',
                es: 'Te han invitado a un duelo de inglés en la Arena.',
              })}
            </Text>
            <TouchableOpacity onPress={handleJoin} activeOpacity={0.85} style={[styles.btn, { backgroundColor: t.accent }]}>
              <Text style={[styles.btnText, { color: t.correctText, fontSize: f.h2 }]}>
                {triLang(lang, {
                  ru: 'Принять вызов',
                  uk: 'Прийняти виклик',
                  es: 'Aceptar el reto',
                })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/(tabs)/' as any)} style={styles.decline}>
              <Text style={[{ color: t.textMuted, fontSize: f.body }]}>
                {triLang(lang, { ru: 'Отказаться', uk: 'Відмовитися', es: 'Rechazar' })}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'joining' && (
          <>
            <Text style={{ fontSize: 64 }}>⚔️</Text>
            <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h1 }]}>
              {triLang(lang, { ru: `Арена с ${hostName}`, uk: `Арена з ${hostName}`, es: `Duelo con ${hostName}` })}
            </Text>
          </>
        )}

        {status === 'not_found' && (
          <>
            <Text style={{ fontSize: 48 }}>😕</Text>
            <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
              {triLang(lang, {
                ru: 'Комната не найдена',
                uk: 'Кімнату не знайдено',
                es: 'No se encontró la sala',
              })}
            </Text>
            <TouchableOpacity onPress={checkRoom} style={[styles.btn, { backgroundColor: t.accent }]}>
              <Text style={[{ color: t.correctText, fontSize: f.body, fontWeight: '700' }]}>
                {triLang(lang, { ru: 'Повторить', uk: 'Повторити', es: 'Reintentar' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/(tabs)/' as any)} style={[styles.btn, { backgroundColor: t.bgSurface }]}>
              <Text style={[{ color: t.textPrimary, fontSize: f.body }]}>
                {triLang(lang, { ru: 'На главную', uk: 'На головну', es: 'Volver al inicio' })}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'expired' && (
          <>
            <Text style={{ fontSize: 48 }}>⏰</Text>
            <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
              {triLang(lang, {
                ru: 'Комната устарела',
                uk: 'Кімната застаріла',
                es: 'La sala ha caducado',
              })}
            </Text>
            <Text style={[{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }]}>
              {triLang(lang, {
                ru: 'Попроси друга создать новую',
                uk: 'Попроси друга створити нову',
                es: 'Pídele a tu amigo que cree otra sala.',
              })}
            </Text>
            <TouchableOpacity onPress={() => router.replace('/(tabs)/' as any)} style={[styles.btn, { backgroundColor: t.bgSurface }]}>
              <Text style={[{ color: t.textPrimary, fontSize: f.body }]}>
                {triLang(lang, { ru: 'На главную', uk: 'На головну', es: 'Volver al inicio' })}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  backBtn: {
    position: 'absolute',
    zIndex: 10,
    top: 54,
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontWeight: '800', textAlign: 'center' },
  btn: { borderRadius: 16, paddingHorizontal: 32, paddingVertical: 16, marginTop: 8 },
  btnText: { fontWeight: '800' },
  decline: { paddingVertical: 12 },
});
