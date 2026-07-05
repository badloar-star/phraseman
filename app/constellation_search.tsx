// ════════════════════════════════════════════════════════════════════════════
// constellation_search.tsx — экран поиска матча «Созвездий» (спек F2/F2a, B2/B6).
//
// Поток: гейт входа (те же правила, что арена: энергия/дневной лимит/Plus) →
// запись в constellation_queue → подписка на свою запись → появился matchId →
// (если матч золотой — объявление «Звездопада»: золото + метеоры + джингл,
// ЕДИНСТВЕННЫЙ звук v1) → replace на экран матча.
//
// Performance Bible: НИКАКИХ бесконечных анимаций (радар статичный, «…» через
// секундный тик с очисткой), первый кадр — финальная геометрия без спиннеров.
// B5: ничто в UI не намекает на добор ботами.
// ════════════════════════════════════════════════════════════════════════════

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DuoPressable from '../components/DuoPressable';
import { useEnergy } from '../components/EnergyContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { useLang } from '../components/LangContext';
import { useArenaRank } from '../hooks/use-arena-rank';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { canStartArenaMatch } from './arena_access_gate';
import { openPremiumPaywall } from './paywall_navigation';
import {
  joinConstellationQueue,
  leaveConstellationQueue,
  subscribeConstellationMatch,
  subscribeConstellationQueueEntry,
  subscribeConstellationSearchingCount,
} from './services/constellations_db';
import { ensureArenaAuthUid } from './user_id_policy';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Джингл «Звездопада» (F2a — единственный звук v1). Пока — торжественный
// ассет приложения; фирменный джингл заменит его тем же require.
const SND_STARFALL = require('../assets/audio/ob_plan_ready.mp3');
const STARFALL_SFX_VOLUME = 0.18;
/** Сколько держим золотое объявление до входа в матч. */
const STARFALL_ANNOUNCE_MS = 3200;

type ScreenState =
  | { kind: 'searching' }
  | { kind: 'gate_denied'; reason: 'no_energy' | 'daily_limit' }
  | { kind: 'error' }
  | { kind: 'starfall'; matchId: string };

export default function ConstellationSearchScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { isUnlimited, energy, bonusEnergy } = useEnergy();
  const myRank = useArenaRank();
  const focused = useIsScreenFocused();

  const [state, setState] = useState<ScreenState>({ kind: 'searching' });
  const [elapsedSec, setElapsedSec] = useState(0);
  const [searchingCount, setSearchingCount] = useState(0);
  const [dots, setDots] = useState('…');

  const uidRef = useRef<string | null>(null);
  const navigatedRef = useRef(false);
  const unsubsRef = useRef<Array<() => void>>([]);
  const starfallPlayer = useAudioPlayer(SND_STARFALL);
  const goldAnim = useRef(new Animated.Value(0)).current;

  const cleanupSubs = useCallback(() => {
    for (const u of unsubsRef.current) {
      try { u(); } catch {}
    }
    unsubsRef.current = [];
  }, []);

  const goToMatch = useCallback((matchId: string) => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    cleanupSubs();
    router.replace({ pathname: '/constellation_match', params: { matchId } } as any);
  }, [cleanupSubs, router]);

  // Матч найден: узнаём, золотой ли он, и либо объявляем Звездопад, либо сразу входим.
  const onMatched = useCallback((matchId: string) => {
    let handled = false;
    const unsub = subscribeConstellationMatch(matchId, (match) => {
      if (handled || !match) return;
      handled = true;
      try { unsub(); } catch {}
      if (match.starfall?.golden) {
        setState({ kind: 'starfall', matchId });
        try {
          starfallPlayer.volume = STARFALL_SFX_VOLUME;
          starfallPlayer.seekTo(0);
          starfallPlayer.play();
        } catch {}
        Animated.timing(goldAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
        setTimeout(() => goToMatch(matchId), STARFALL_ANNOUNCE_MS);
      } else {
        goToMatch(matchId);
      }
    });
    unsubsRef.current.push(unsub);
  }, [goToMatch, goldAnim, starfallPlayer]);

  // Гейт + очередь.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const uid = await ensureArenaAuthUid();
      if (cancelled) return;
      if (!uid) { setState({ kind: 'error' }); return; }
      uidRef.current = uid;
      const gate = await canStartArenaMatch({
        isUnlimited,
        availableEnergy: energy + bonusEnergy,
        countDaily: true,
      });
      if (cancelled) return;
      if (!gate.ok) {
        setState({ kind: 'gate_denied', reason: gate.reason === 'no_energy' ? 'no_energy' : 'daily_limit' });
        return;
      }
      const name = ((await AsyncStorage.getItem('user_name')) || '').trim();
      if (cancelled) return;
      try {
        await joinConstellationQueue({
          userId: uid,
          joinedAt: Date.now(),
          ...(name ? { displayName: name } : {}),
          rankIndex: myRank.rankIndex,
        });
      } catch {
        if (!cancelled) setState({ kind: 'error' });
        return;
      }
      const unsubEntry = subscribeConstellationQueueEntry(uid, (entry) => {
        if (entry?.matchId) onMatched(entry.matchId);
      });
      const unsubCount = subscribeConstellationSearchingCount(setSearchingCount);
      unsubsRef.current.push(unsubEntry, unsubCount);
    })();
    return () => {
      cancelled = true;
      cleanupSubs();
      // Не дошли до матча — выходим из очереди (иначе подчистит cron).
      if (!navigatedRef.current && uidRef.current) {
        void leaveConstellationQueue(uidRef.current);
      }
    };
    // Гейт по значениям на момент входа на экран — пересбор эффекта на каждый тик
    // энергии пере-вступал бы в очередь.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Секундный тик: прошедшее время + «живые» точки. ≥1000мс, чистится, гейт фокусом.
  useEffect(() => {
    if (!focused || state.kind !== 'searching') return;
    const id = setInterval(() => {
      setElapsedSec((s) => s + 1);
      setDots((d) => (d.length >= 3 ? '.' : d + '.'));
    }, 1000);
    return () => clearInterval(id);
  }, [focused, state.kind]);

  const handleCancel = useCallback(() => {
    cleanupSubs();
    if (uidRef.current) void leaveConstellationQueue(uidRef.current);
    router.back();
  }, [cleanupSubs, router]);

  const title = triLang(lang, {
    ru: 'Подбираем соперников', uk: 'Підбираємо суперників', es: 'Buscando rivales',
    'pt-BR': 'Buscando rivais', vi: 'Đang tìm đối thủ', id: 'Mencari lawan',
    tr: 'Rakipler aranıyor', pl: 'Szukamy rywali',
  });

  const skyColors = useMemo(
    (): [string, string, string] => [t.bgGradient?.[0] ?? '#0A1124', '#0E1734', '#080D1F'],
    [t],
  );

  return (
    <View style={styles.root}>
      <LinearGradient colors={skyColors} style={StyleSheet.absoluteFill} />
      <StaticStars />

      {state.kind === 'searching' ? (
        <View style={styles.center}>
          <View style={[styles.radar, { borderColor: `${t.accent}55` }]}>
            <View style={[styles.radarCore, { backgroundColor: t.accent }]} />
          </View>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
            {title}{dots}
          </Text>
          <Text style={[styles.sub, { color: t.textSecond, fontSize: f.caption }]}>
            {triLang(lang, {
              ru: `в поиске сейчас: ${searchingCount} · ${elapsedSec}с`,
              uk: `у пошуку зараз: ${searchingCount} · ${elapsedSec}с`,
              es: `buscando ahora: ${searchingCount} · ${elapsedSec}s`,
              'pt-BR': `buscando agora: ${searchingCount} · ${elapsedSec}s`,
              vi: `đang tìm: ${searchingCount} · ${elapsedSec}s`,
              id: `sedang mencari: ${searchingCount} · ${elapsedSec}s`,
              tr: `şu an arıyor: ${searchingCount} · ${elapsedSec}sn`,
              pl: `szuka teraz: ${searchingCount} · ${elapsedSec}s`,
            })}
          </Text>
          <TouchableOpacity
            testID="constellation-search-cancel"
            style={[styles.cancelBtn, { borderColor: t.border }]}
            onPress={handleCancel}
            activeOpacity={0.85}
          >
            <Text style={{ color: t.textSecond, fontSize: f.body }}>
              {triLang(lang, {
                ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar', 'pt-BR': 'Cancelar',
                vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj',
              })}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {state.kind === 'gate_denied' ? (
        <View style={styles.center}>
          <Ionicons
            name={state.reason === 'no_energy' ? 'flash-off' : 'hourglass'}
            size={42}
            color={t.accent}
          />
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
            {state.reason === 'no_energy'
              ? triLang(lang, {
                ru: 'Энергия кончилась', uk: 'Енергія скінчилась', es: 'Sin energía',
                'pt-BR': 'Sem energia', vi: 'Hết năng lượng', id: 'Energi habis',
                tr: 'Enerji bitti', pl: 'Brak energii',
              })
              : triLang(lang, {
                ru: 'Дневной лимит матчей', uk: 'Денний ліміт матчів', es: 'Límite diario',
                'pt-BR': 'Limite diário', vi: 'Giới hạn ngày', id: 'Batas harian',
                tr: 'Günlük limit', pl: 'Dzienny limit',
              })}
          </Text>
          <Text style={[styles.sub, { color: t.textSecond, fontSize: f.caption }]}>
            {triLang(lang, {
              ru: 'Plus снимает лимиты Созвездий',
              uk: 'Plus знімає ліміти Сузір’їв',
              es: 'Plus quita los límites',
              'pt-BR': 'Plus remove os limites',
              vi: 'Plus bỏ giới hạn',
              id: 'Plus menghapus batas',
              tr: 'Plus limitleri kaldırır',
              pl: 'Plus znosi limity',
            })}
          </Text>
          <DuoPressable
            testID="constellation-gate-paywall"
            onPress={() => openPremiumPaywall(router, { context: 'constellations' })}
            edgeColor={t.accent}
            style={[styles.gateBtn, { backgroundColor: t.accent }]}
          >
            <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.sub }}>
              {triLang(lang, {
                ru: 'Открыть Plus', uk: 'Відкрити Plus', es: 'Ver Plus', 'pt-BR': 'Ver Plus',
                vi: 'Mở Plus', id: 'Buka Plus', tr: 'Plus’ı aç', pl: 'Otwórz Plus',
              })}
            </Text>
          </DuoPressable>
          <TouchableOpacity style={[styles.cancelBtn, { borderColor: t.border }]} onPress={() => router.back()}>
            <Text style={{ color: t.textSecond, fontSize: f.body }}>
              {triLang(lang, {
                ru: 'Назад', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar',
                vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
              })}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {state.kind === 'error' ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline" size={42} color={t.textSecond} />
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
            {triLang(lang, {
              ru: 'Нет соединения', uk: 'Немає з’єднання', es: 'Sin conexión',
              'pt-BR': 'Sem conexão', vi: 'Mất kết nối', id: 'Tidak ada koneksi',
              tr: 'Bağlantı yok', pl: 'Brak połączenia',
            })}
          </Text>
          <TouchableOpacity style={[styles.cancelBtn, { borderColor: t.border }]} onPress={() => router.back()}>
            <Text style={{ color: t.textSecond, fontSize: f.body }}>
              {triLang(lang, {
                ru: 'Назад', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar',
                vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
              })}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {state.kind === 'starfall' ? (
        <Animated.View style={[styles.center, { opacity: goldAnim }]} pointerEvents="none">
          <View style={styles.goldWash} />
          <Text style={styles.starfallTitle}>ЗВЕЗДОПАД!</Text>
          <Text style={[styles.starfallSub, { fontSize: f.body }]}>
            {triLang(lang, {
              ru: 'Золотой матч: звёзды платят осколками',
              uk: 'Золотий матч: зірки платять уламками',
              es: 'Partida dorada: las estrellas pagan fragmentos',
              'pt-BR': 'Partida dourada: estrelas pagam fragmentos',
              vi: 'Trận vàng: sao trả mảnh',
              id: 'Match emas: bintang membayar pecahan',
              tr: 'Altın maç: yıldızlar parça öder',
              pl: 'Złoty mecz: gwiazdy płacą odłamkami',
            })}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Статичные звёзды фона — сид от индекса, без Math.random в рендере. */
function StaticStars() {
  const stars = useMemo(() => Array.from({ length: 40 }, (_, i) => {
    const seed = Math.sin(i * 999.7) * 10000;
    const frac = (n: number) => n - Math.floor(n);
    return {
      left: `${(frac(seed) * 100).toFixed(1)}%` as `${number}%`,
      top: `${(frac(seed * 1.7) * 100).toFixed(1)}%` as `${number}%`,
      size: 1 + frac(seed * 2.3) * 2,
      opacity: 0.2 + frac(seed * 3.1) * 0.5,
    };
  }), []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((s, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: '#EAF2FF',
            opacity: s.opacity,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  radar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
  },
  sub: {
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 26,
    paddingVertical: 11,
    marginTop: 6,
  },
  gateBtn: {
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  goldWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 190, 60, 0.16)',
  },
  starfallTitle: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#FFD166',
    textShadowColor: 'rgba(255, 209, 102, 0.65)',
    textShadowRadius: 24,
    textShadowOffset: { width: 0, height: 0 },
  },
  starfallSub: {
    color: '#F4F7FF',
    textAlign: 'center',
    fontWeight: '600',
  },
});
