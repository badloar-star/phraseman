import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../components/ThemeContext';
import ScreenGradient from '../components/ScreenGradient';
import { ensureArenaAuthUid } from './user_id_policy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitAppEvent } from './events';
import { triLang } from '../constants/i18n';
import { useEnergy } from '../components/EnergyContext';
import { useLang } from '../components/LangContext';
import { logEvent } from './firebase';

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
    try {
      const uid = await ensureArenaAuthUid();
      const name = (await AsyncStorage.getItem('user_name')) ?? defaultPlayerName();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const db = require('@react-native-firebase/firestore').default();

      const roomDoc = await db.collection('arena_rooms').doc(roomId).get();
      if (!roomDoc.exists) { setStatus('not_found'); return; }
      // Клиент больше не создает arena_sessions/session_players:
      // серверный trigger onArenaRoomMatched делает это авторитетно.
      await db.collection('arena_rooms').doc(roomId).update({
        guestId: uid,
        guestName: name,
        status: 'matched',
      });

      // Ждем sessionId через realtime-подписку (без polling-цикла)
      const foundSessionId = await new Promise<string | null>((resolve) => {
        let resolved = false;
        const unsub = db.collection('arena_rooms').doc(roomId).onSnapshot((snap: any) => {
          if (resolved || !snap?.exists) return;
          const data = snap.data();
          if (data?.sessionId) {
            resolved = true;
            unsub();
            resolve(data.sessionId);
          }
        }, () => {
          if (!resolved) {
            resolved = true;
            unsub();
            resolve(null);
          }
        });
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            unsub();
            resolve(null);
          }
        }, 12_000);
      });
      if (foundSessionId) {
        if (!isUnlimited) {
          const ok = await spendOne();
          if (!ok) {
            emitAppEvent('action_toast', {
              type: 'error',
              messageRu: 'Недостаточно энергии для входа в матч.',
              messageUk: 'Недостатньо енергії для входу в матч.',
              messageEs: 'No tienes suficiente energía para unirte a la partida.',
            });
            setStatus('waiting');
            return;
          }
          logEvent('arena_match_charged', { mode: 'friend', role: 'guest' });
        }
        emitAppEvent('action_toast', {
          type: 'success',
          messageRu: 'Матч готов. Удачи!',
          messageUk: 'Матч готовий. Успіхів!',
          messageEs: '¡La partida está lista! ¡Mucha suerte!',
        });
        router.replace({ pathname: '/arena_game' as any, params: { sessionId: foundSessionId, userId: uid } });
        return;
      }
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Соперник не подтвердил вход вовремя.',
        messageUk: 'Суперник не підтвердив вхід вчасно.',
        messageEs: 'Tu rival no confirmó a tiempo.',
      });
      setStatus('not_found');
    } catch {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Не удалось присоединиться к комнате.',
        messageUk: 'Не вдалося приєднатися до кімнати.',
        messageEs: 'No ha sido posible unirte a la sala. Inténtalo de nuevo.',
      });
      setStatus('not_found');
    }
  };

  return (
    <ScreenGradient>
      <View style={styles.centered}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color={t.accent} />
            <Text style={[{ color: t.textMuted, fontSize: f.body, marginTop: 16 }]}>
              {triLang(lang, {
                ru: 'Проверяем комнату...',
                uk: 'Перевіряємо кімнату...',
                es: 'Revisando la sala…',
              })}
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
            <ActivityIndicator size="large" color={t.accent} />
            <Text style={[{ color: t.textMuted, fontSize: f.body, marginTop: 16 }]}>
              {triLang(lang, {
                ru: 'Входим в комнату...',
                uk: 'Заходимо в кімнату...',
                es: 'Entrando en la sala…',
              })}
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
  title: { fontWeight: '800', textAlign: 'center' },
  btn: { borderRadius: 16, paddingHorizontal: 32, paddingVertical: 16, marginTop: 8 },
  btnText: { fontWeight: '800' },
  decline: { paddingVertical: 12 },
});

