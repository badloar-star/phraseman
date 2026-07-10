import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import TapScale from '../components/TapScale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import ScreenGradient from '../components/ScreenGradient';
import BounceView from '../components/BounceView';
import { emitAppEvent } from './events';
import { triLang } from '../constants/i18n';
import { useEnergy } from '../components/EnergyContext';
import { useLang } from '../components/LangContext';
import { joinArenaFriendRoomAsGuest } from './arena_friend_room_guest';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';
import DuoPressable from '../components/DuoPressable';
import { useStudyTarget } from '../components/StudyTargetContext';

type RoomStatus = 'loading' | 'waiting' | 'not_found' | 'expired' | 'joining';

export default function DuelJoinScreen() {
  // H9: roomId был `string`, но deep link без params отдаёт undefined → Firestore
  // .doc(undefined).get() падал. Делаем optional + ранний guard в checkRoom.
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { spendOne, isUnlimited } = useEnergy();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const defaultPlayerName = () => triLang(lang, { ru: 'Игрок', uk: 'Гравець', es: 'Jugador', 'pt-BR': 'Jogador', vi: 'Người chơi', id: 'Pemain', tr: 'Oyuncu', pl: 'Gracz' });
  const [status, setStatus] = useState<RoomStatus>('loading');
  const [hostName, setHostName] = useState('');

  const checkRoom = useCallback(async () => {
    if (!roomId) { setStatus('not_found'); return; } // H9: guard от undefined
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
      studyTarget,
      learnerSourceLocale: lang,
    });
    if (res.ok) {
      emitAppEvent('action_toast', {
        type: 'success',
        messageRu: 'Матч готов. Удачи!',
        messageUk: 'Матч готовий. Успіхів!',
        messageEs: '¡La partida está lista! ¡Mucha suerte!',
      });
      // Принят join → игра «вместо» экрана join (свап). Иначе «назад» из игры/
      // результатов вернёт на join с уже устаревшим roomId.
      markNextNavigationAsReplace();
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
    if (res.code === 'content_mismatch') {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'У вас выбраны разные языки обучения. Переключись на язык друга и открой приглашение снова.',
        messageUk: 'У вас обрані різні мови навчання. Перемкнися на мову друга й відкрий запрошення знову.',
        messageEs: 'Habéis elegido idiomas de estudio distintos. Cambia al idioma de tu amigo y vuelve a abrir la invitación.',
      });
      setStatus('waiting');
      return;
    }
    emitAppEvent('action_toast', {
      type: 'error',
      messageRu: 'Не попал в комнату. Проверь код и попробуй снова.',
      messageUk: 'Не вдалося приєднатися до кімнати.',
      messageEs: 'No ha sido posible unirte a la sala. Inténtalo de nuevo.',
    });
    setStatus('not_found');
  };

  const goBack = useCallback(() => {
    safeRouterBack(router, '/(tabs)/home' as any);
  }, [router]);

  return (
    <ScreenGradient>
      <TapScale
        accessibilityRole="button"
        accessibilityLabel={triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
        onPress={goBack}
        style={[styles.backBtn, { backgroundColor: t.bgCard, borderColor: t.border }]}
      >
        <Ionicons name="chevron-back" size={20} color={t.textPrimary} />
      </TapScale>
      <BounceView style={styles.centered}>
        {status === 'loading' && (
          <>
            <Text style={{ fontSize: 64 }}>⚔️</Text>
            <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h1 }]}>
              {triLang(lang, { ru: 'Арена', uk: 'Арена', es: 'Arena', 'pt-BR': 'Arena', vi: 'Arena', id: 'Arena', tr: 'Arena', pl: 'Arena' })}
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
                'pt-BR': `Duelo com ${hostName}`,
                vi: `Đấu với ${hostName}`,
                id: `Duel dengan ${hostName}`,
                tr: `${hostName} ile arena`,
                pl: `Pojedynek z ${hostName}`,
              })}
            </Text>
            <Text style={[{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }]}>
              {triLang(lang, {
                ru: 'Тебя вызвали на арену по английскому!',
                uk: 'Тебе викликали на арену з англійської!',
                es: 'Te han invitado a un duelo de inglés en la Arena.',
                'pt-BR': 'Você foi chamado para um duelo de inglês na Arena.',
                vi: 'Bạn được mời vào một trận đấu tiếng Anh trong Arena.',
                id: 'Kamu ditantang duel bahasa Inggris di Arena.',
                tr: 'İngilizce için Arena düellosuna davet edildin.',
                pl: 'Zaproszono cię na pojedynek z angielskiego na Arenie.',
              })}
            </Text>
            <DuoPressable onPress={handleJoin} edgeColor={t.accent} wrapStyle={{ marginTop: 8 }} style={[styles.btn, { backgroundColor: t.accent, marginTop: 0 }]}>
              <Text style={[styles.btnText, { color: t.correctText, fontSize: f.h2 }]}>
                {triLang(lang, {
                  ru: 'Принять вызов',
                  uk: 'Прийняти виклик',
                  es: 'Aceptar el reto',
                  'pt-BR': 'Aceitar desafio',
                  vi: 'Chấp nhận thử thách',
                  id: 'Terima tantangan',
                  tr: 'Meydan okumayı kabul et',
                  pl: 'Przyjmij wyzwanie',
                })}
              </Text>
            </DuoPressable>
            <TouchableOpacity onPress={() => router.replace('/(tabs)/home' as any)} style={styles.decline}>
              <Text style={[{ color: t.textMuted, fontSize: f.body }]}>
                {triLang(lang, { ru: 'Отказаться', uk: 'Відмовитися', es: 'Rechazar', 'pt-BR': 'Recusar', vi: 'Từ chối', id: 'Tolak', tr: 'Reddet', pl: 'Odrzuć' })}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'joining' && (
          <>
            <Text style={{ fontSize: 64 }}>⚔️</Text>
            <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h1 }]}>
              {triLang(lang, { ru: `Арена с ${hostName}`, uk: `Арена з ${hostName}`, es: `Duelo con ${hostName}`, 'pt-BR': `Duelo com ${hostName}`, vi: `Đấu với ${hostName}`, id: `Duel dengan ${hostName}`, tr: `${hostName} ile arena`, pl: `Pojedynek z ${hostName}` })}
            </Text>
            <ActivityIndicator size="large" color={t.accent} style={{ marginTop: 16 }} />
            <Text style={[{ color: t.textMuted, fontSize: f.body, marginTop: 12 }]}>
              {triLang(lang, { ru: 'Подключаемся…', uk: 'Підключаємось…', es: 'Conectando…', 'pt-BR': 'Conectando…', vi: 'Đang kết nối…', id: 'Menghubungkan…', tr: 'Bağlanılıyor…', pl: 'Łączenie…' })}
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
                'pt-BR': 'Sala não encontrada',
                vi: 'Không tìm thấy phòng',
                id: 'Room tidak ditemukan',
                tr: 'Oda bulunamadı',
                pl: 'Nie znaleziono pokoju',
              })}
            </Text>
            <TouchableOpacity onPress={checkRoom} style={[styles.btn, { backgroundColor: t.accent }]}>
              <Text style={[{ color: t.correctText, fontSize: f.body, fontWeight: '700' }]}>
                {triLang(lang, { ru: 'Повторить', uk: 'Повторити', es: 'Reintentar', 'pt-BR': 'Tentar novamente', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/(tabs)/home' as any)} style={[styles.btn, { backgroundColor: t.bgSurface }]}>
              <Text style={[{ color: t.textPrimary, fontSize: f.body }]}>
                {triLang(lang, { ru: 'На главную', uk: 'На головну', es: 'Volver al inicio', 'pt-BR': 'Ir para o início', vi: 'Về trang chính', id: 'Ke beranda', tr: 'Ana sayfaya dön', pl: 'Na stronę główną' })}
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
                'pt-BR': 'A sala expirou',
                vi: 'Phòng đã hết hạn',
                id: 'Room sudah kedaluwarsa',
                tr: 'Odanın süresi doldu',
                pl: 'Pokój wygasł',
              })}
            </Text>
            <Text style={[{ color: t.textMuted, fontSize: f.body, textAlign: 'center' }]}>
              {triLang(lang, {
                ru: 'Попроси друга создать новую',
                uk: 'Попроси друга створити нову',
                es: 'Pídele a tu amigo que cree otra sala.',
                'pt-BR': 'Peça ao seu amigo para criar outra sala.',
                vi: 'Hãy nhờ bạn của bạn tạo phòng mới.',
                id: 'Minta temanmu membuat room baru.',
                tr: 'Arkadaşından yeni bir oda oluşturmasını iste.',
                pl: 'Poproś znajomego o utworzenie nowego pokoju.',
              })}
            </Text>
            <TouchableOpacity onPress={() => router.replace('/(tabs)/home' as any)} style={[styles.btn, { backgroundColor: t.bgSurface }]}>
              <Text style={[{ color: t.textPrimary, fontSize: f.body }]}>
                {triLang(lang, { ru: 'На главную', uk: 'На головну', es: 'Volver al inicio', 'pt-BR': 'Ir para o início', vi: 'Về trang chính', id: 'Ke beranda', tr: 'Ana sayfaya dön', pl: 'Na stronę główną' })}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </BounceView>
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
