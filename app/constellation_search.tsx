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
import { triLang, type Lang } from '../constants/i18n';
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
import { CONSTELLATION_INTRO_SEEN_KEY } from './constellation_intro';

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

/** Живые подсказки во время поиска (голос Компаса). Крутятся ~7с каждая.
 *  Пул из основ/стратегии/драмы/обучения — новичок цепляет знания уже в ожидании. */
type Hint = { title: (l: Lang) => string; body: (l: Lang) => string };
const SEARCH_HINTS: Hint[] = [
  {
    title: (l) => triLang(l, { ru: 'Как играть', uk: 'Як грати', es: 'Cómo jugar', 'pt-BR': 'Como jogar', vi: 'Cách chơi', id: 'Cara main', tr: 'Nasıl oynanır', pl: 'Jak grać' }),
    body: (l) => triLang(l, { ru: 'Ответил верно — звезда твоя. Ошибся — попытка сгорела, жди следующий раунд.', uk: 'Відповів вірно — зірка твоя. Помилився — чекай наступний раунд.', es: 'Aciertas y la estrella es tuya. Fallas y esperas la siguiente ronda.', 'pt-BR': 'Acertou, a estrela é sua. Errou, espere a próxima rodada.', vi: 'Đúng thì sao là của bạn. Sai thì chờ vòng sau.', id: 'Benar, bintang jadi milikmu. Salah, tunggu ronde berikutnya.', tr: 'Doğru cevap yıldızı senin yapar. Yanlışta sonraki turu bekle.', pl: 'Dobra odpowiedź — gwiazda twoja. Błąd — czekaj na następną rundę.' }),
  },
  {
    title: (l) => triLang(l, { ru: 'Совет', uk: 'Порада', es: 'Consejo', 'pt-BR': 'Dica', vi: 'Mẹo', id: 'Tips', tr: 'İpucu', pl: 'Wskazówka' }),
    body: (l) => triLang(l, { ru: 'Захватывай звёзды рядом со своими — созвездие растёт и даёт бонус очков.', uk: 'Захоплюй зірки поруч зі своїми — сузір’я росте й дає бонус.', es: 'Captura estrellas junto a las tuyas: la constelación crece y da puntos.', 'pt-BR': 'Capture estrelas perto das suas: a constelação cresce e dá pontos.', vi: 'Chiếm sao gần sao của bạn — chòm sao lớn lên và cho điểm.', id: 'Rebut bintang dekat milikmu — rasi tumbuh dan beri poin.', tr: 'Kendi yıldızlarının yanındakileri al — takımyıldız büyür, puan verir.', pl: 'Zdobywaj gwiazdy obok swoich — gwiazdozbiór rośnie i daje punkty.' }),
  },
  {
    title: (l) => triLang(l, { ru: 'Полярная', uk: 'Полярна', es: 'Estrella Polar', 'pt-BR': 'Estrela Polar', vi: 'Sao Bắc Cực', id: 'Bintang Kutub', tr: 'Kutup Yıldızı', pl: 'Gwiazda Polarna' }),
    body: (l) => triLang(l, { ru: 'Звезда в центре приносит очки каждый раунд. К ней стремятся все.', uk: 'Зірка в центрі дає очки щораунду. До неї прагнуть усі.', es: 'La estrella central da puntos cada ronda. Todos van por ella.', 'pt-BR': 'A estrela central dá pontos toda rodada. Todos querem ela.', vi: 'Sao trung tâm cho điểm mỗi vòng. Ai cũng muốn có nó.', id: 'Bintang tengah beri poin tiap ronde. Semua mengincarnya.', tr: 'Merkez yıldız her tur puan verir. Herkes onu ister.', pl: 'Środkowa gwiazda daje punkty co rundę. Wszyscy do niej dążą.' }),
  },
  {
    title: (l) => triLang(l, { ru: 'Не сдавайся', uk: 'Не здавайся', es: 'No te rindas', 'pt-BR': 'Não desista', vi: 'Đừng bỏ cuộc', id: 'Jangan menyerah', tr: 'Pes etme', pl: 'Nie poddawaj się' }),
    body: (l) => triLang(l, { ru: 'Выбили? Стань падающей звездой и вернись в игру двумя верными ответами.', uk: 'Вибили? Стань падаючою зіркою й повернись двома вірними відповідями.', es: '¿Te eliminaron? Vuelve como estrella fugaz con dos aciertos.', 'pt-BR': 'Eliminado? Volte como estrela cadente com dois acertos.', vi: 'Bị loại? Thành sao băng và quay lại với hai câu đúng.', id: 'Tereliminasi? Jadi bintang jatuh dan kembali dengan dua jawaban benar.', tr: 'Elendin mi? Kayan yıldız ol, iki doğru cevapla geri dön.', pl: 'Wybity? Zostań spadającą gwiazdą i wróć dwiema dobrymi odpowiedziami.' }),
  },
  {
    title: (l) => triLang(l, { ru: 'Дуэль', uk: 'Дуель', es: 'Duelo', 'pt-BR': 'Duelo', vi: 'Đấu', id: 'Duel', tr: 'Düello', pl: 'Pojedynek' }),
    body: (l) => triLang(l, { ru: 'Целитесь в одну звезду вдвоём? Будет блиц — решает знание, не скорость связи.', uk: 'Двоє на одну зірку? Буде бліц — вирішує знання.', es: '¿Dos por la misma estrella? Habrá duelo: gana el saber, no el ping.', 'pt-BR': 'Dois na mesma estrela? Haverá duelo: vence o saber, não o ping.', vi: 'Hai người một sao? Sẽ có đấu nhanh — kiến thức quyết định.', id: 'Dua orang satu bintang? Ada duel — pengetahuan yang menentukan.', tr: 'İki kişi tek yıldıza mı? Düello olur — bilgi kazandırır.', pl: 'Dwóch na jedną gwiazdę? Będzie pojedynek — liczy się wiedza.' }),
  },
  {
    title: (l) => triLang(l, { ru: 'Ошибка — не беда', uk: 'Помилка — не біда', es: 'Errar está bien', 'pt-BR': 'Errar tudo bem', vi: 'Sai cũng ổn', id: 'Salah tak apa', tr: 'Hata sorun değil', pl: 'Błąd to nie problem' }),
    body: (l) => triLang(l, { ru: 'Ответил неверно — сразу покажем правило. Так и учишься.', uk: 'Відповів неправильно — одразу покажемо правило. Так і вчишся.', es: 'Si fallas, te mostramos la regla al instante. Así aprendes.', 'pt-BR': 'Se errar, mostramos a regra na hora. É assim que se aprende.', vi: 'Trả lời sai — hiện quy tắc ngay. Học là vậy.', id: 'Jawab salah — aturan langsung muncul. Begitu caranya belajar.', tr: 'Yanlış cevapta kuralı hemen gösteririz. Böyle öğrenirsin.', pl: 'Zła odpowiedź — od razu pokażemy zasadę. Tak się uczysz.' }),
  },
];

/** Цвета слотов игроков (совпадают с CONSTELLATION_SLOT_COLORS матча). */
const SLOT_COLORS = ['#8B7BFF', '#37E0C8', '#FFB454', '#FF6B8A'] as const;
/** Орбитальные соперники: угол/радиус/цвет для точек вокруг ядра. */
const ORBIT_DOTS = [
  { angle: 20, radius: 92, color: SLOT_COLORS[1] },
  { angle: 165, radius: 92, color: SLOT_COLORS[2] },
  { angle: 270, radius: 78, color: SLOT_COLORS[3] },
] as const;

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
  // Поэтапное подключение: слот 0 — ты (сразу), остальные «находятся» в
  // случайные моменты (презентация ожидания; реальный состав придёт с матчем).
  const [slotsFilled, setSlotsFilled] = useState(1);
  const [hintIdx, setHintIdx] = useState(0);

  const uidRef = useRef<string | null>(null);
  const navigatedRef = useRef(false);
  const unsubsRef = useRef<Array<() => void>>([]);
  const starfallPlayer = useAudioPlayer(SND_STARFALL);
  const goldAnim = useRef(new Animated.Value(0)).current;

  // Анимации «зарождения звезды». Все гейтятся фокусом (Performance Bible):
  // при уходе с экрана циклы останавливаются, не жгут кадры в фоне.
  const corePulse = useRef(new Animated.Value(0)).current;
  const sweepSpin = useRef(new Animated.Value(0)).current;
  const progAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!focused || state.kind !== 'searching') return;
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(corePulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(corePulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ]));
    const spin = Animated.loop(
      Animated.timing(sweepSpin, { toValue: 1, duration: 3400, useNativeDriver: true }),
    );
    pulse.start();
    spin.start();
    return () => { pulse.stop(); spin.stop(); };
  }, [focused, state.kind, corePulse, sweepSpin]);

  // Полоса сборки тянется к «числу собранных слотов» (плавно, JS-драйвер для width).
  useEffect(() => {
    Animated.timing(progAnim, {
      toValue: slotsFilled / 4,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [slotsFilled, progAnim]);

  const coreScale = corePulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });
  const coreOpacity = corePulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const sweepDeg = sweepSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const progWidth = progAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

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
      // Матч найден → визуально «собрали 4/4», короткая пауза «Все в сборе!»,
      // потом вход. Раньше был мгновенный переход — «бац» без ощущения сбора.
      setSlotsFilled(4);
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
        setTimeout(() => goToMatch(matchId), 850);
      }
    });
    unsubsRef.current.push(unsub);
  }, [goToMatch, goldAnim, starfallPlayer]);

  // Гейт + очередь.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Первый вход в режим → онбординг (F6). Один раз, флаг в AsyncStorage.
      const introSeen = await AsyncStorage.getItem(CONSTELLATION_INTRO_SEEN_KEY);
      if (cancelled) return;
      if (introSeen !== '1') {
        router.replace('/constellation_intro' as any);
        return;
      }
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
    }, 1000);
    return () => clearInterval(id);
  }, [focused, state.kind]);

  // Ротация подсказок каждые ~7с (голос Компаса). Гейт фокусом.
  useEffect(() => {
    if (!focused || state.kind !== 'searching') return;
    const id = setInterval(() => {
      setHintIdx((i) => (i + 1) % SEARCH_HINTS.length);
    }, 7000);
    return () => clearInterval(id);
  }, [focused, state.kind]);

  // Слоты 2–4 «подключаются» БЫСТРО (1.5с / 3.5с / 6с) — раньше были 4/11/20с,
  // и при быстром матче игрок видел «1 из 4», а потом «бац» — игра. Теперь сбор
  // визуально успевает даже при мгновенном матче на 4 живых.
  useEffect(() => {
    if (state.kind !== 'searching') return;
    const delays = [
      1500 + Math.random() * 800,
      3200 + Math.random() * 1000,
      5500 + Math.random() * 1200,
    ];
    const timers = delays.map((ms, i) => setTimeout(() => setSlotsFilled((v) => Math.max(v, 2 + i)), ms));
    return () => timers.forEach(clearTimeout);
  }, [state.kind]);

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
          {/* Зарождение звезды: разгорающееся ядро + орбиты соперников (концепт B). */}
          <View style={styles.forge}>
            <Animated.View style={[styles.orbitRing, styles.orbitOuter, { borderColor: `${t.accent}22` }]} />
            <View style={[styles.orbitRing, styles.orbitInner, { borderColor: `${t.accent}18` }]} />
            <Animated.View
              style={[
                styles.orbitSweep,
                { transform: [{ rotate: sweepDeg }] },
              ]}
              pointerEvents="none"
            >
              <View style={styles.sweepBlade} />
            </Animated.View>
            {/* Орбитальные точки-соперники: появляются по мере «сбора». */}
            {ORBIT_DOTS.map((dot, i) => (
              i < slotsFilled - 1 ? (
                <Animated.View
                  key={i}
                  style={[
                    styles.orbDot,
                    {
                      backgroundColor: dot.color,
                      transform: [
                        { rotate: `${dot.angle}deg` },
                        { translateX: dot.radius },
                      ],
                    },
                  ]}
                />
              ) : null
            ))}
            <Animated.View style={[styles.forgeCore, { transform: [{ scale: coreScale }], opacity: coreOpacity }]}>
              <View style={styles.coreInner} />
            </Animated.View>
          </View>

          <Text style={[styles.kicker, { color: '#F6B24B' }]}>
            {triLang(lang, {
              ru: 'МАТЧ РОЖДАЕТСЯ', uk: 'МАТЧ НАРОДЖУЄТЬСЯ', es: 'NACE LA PARTIDA',
              'pt-BR': 'A PARTIDA NASCE', vi: 'TRẬN ĐẤU HÌNH THÀNH', id: 'MATCH LAHIR',
              tr: 'MAÇ DOĞUYOR', pl: 'MECZ SIĘ RODZI',
            })}
          </Text>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h2 }]}>
            {title}
          </Text>

          {/* Полоса сборки. */}
          <View style={[styles.progTrack, { backgroundColor: `${t.textSecond}22` }]}>
            <Animated.View style={[styles.progFill, { width: progWidth }]} />
          </View>

          {/* Ряд мини-аватаров: заполняется поэтапно. */}
          <View style={styles.miniRow}>
            {[0, 1, 2, 3].map((i) => {
              const filled = i < slotsFilled;
              return (
                <View
                  key={i}
                  style={[
                    styles.mini,
                    filled
                      ? { backgroundColor: SLOT_COLORS[i] }
                      : { backgroundColor: 'transparent', borderColor: t.border, borderWidth: 1.5, borderStyle: 'dashed' },
                  ]}
                >
                  {filled
                    ? <Text style={styles.miniText}>{i === 0 ? 'Т' : ''}</Text>
                    : <Text style={{ color: t.textSecond, fontSize: f.caption }}>…</Text>}
                  {filled && i !== 0 ? (
                    <Ionicons name="person" size={15} color="#fff" style={{ position: 'absolute' }} />
                  ) : null}
                </View>
              );
            })}
          </View>

          <Text style={[styles.sub, { color: t.textSecond, fontSize: f.caption }]}>
            {triLang(lang, {
              ru: `${searchingCount} в поиске · ${elapsedSec}с`,
              uk: `${searchingCount} у пошуку · ${elapsedSec}с`,
              es: `${searchingCount} buscando · ${elapsedSec}s`,
              'pt-BR': `${searchingCount} buscando · ${elapsedSec}s`,
              vi: `${searchingCount} đang tìm · ${elapsedSec}s`,
              id: `${searchingCount} mencari · ${elapsedSec}s`,
              tr: `${searchingCount} arıyor · ${elapsedSec}sn`,
              pl: `${searchingCount} szuka · ${elapsedSec}s`,
            })}
          </Text>

          {/* Живая подсказка (голос Компаса). Иконка Компаса НАД плашкой справа,
              плашка крупная — текст не втискивается (просьба владельца). */}
          <View style={styles.hintWrap}>
            <View style={styles.hintCompass}>
              <Text style={styles.hintCompassIcon}>🧭</Text>
            </View>
            <View style={styles.hintCard}>
              <Text style={[styles.hintTitle, { color: '#8B7BFF' }]}>
                {SEARCH_HINTS[hintIdx].title(lang)}
              </Text>
              <Text style={[styles.hintBody, { color: t.textSecond }]}>
                {SEARCH_HINTS[hintIdx].body(lang)}
              </Text>
            </View>
          </View>

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
  // «Зарождение звезды»
  forge: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  orbitRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  orbitOuter: { width: 200, height: 200 },
  orbitInner: { width: 148, height: 148, borderStyle: 'dashed' },
  orbitSweep: {
    position: 'absolute',
    width: 200,
    height: 200,
    alignItems: 'center',
  },
  sweepBlade: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 100,
    backgroundColor: 'rgba(255,209,102,0.55)',
    shadowColor: '#FFD166',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  orbDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  forgeCore: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#FFD166',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD166',
    shadowOpacity: 0.9,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  coreInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF3D0',
    opacity: 0.85,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: 8,
  },
  progTrack: {
    width: 210,
    height: 6,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 6,
  },
  progFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#F6B24B',
  },
  miniRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  mini: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
  },
  sub: {
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  hintWrap: {
    width: '100%',
    maxWidth: 380,
    marginTop: 18,
    alignItems: 'stretch',
  },
  hintCompass: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(139,123,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(139,123,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginBottom: -14,
    zIndex: 2,
  },
  hintCompassIcon: { fontSize: 20 },
  hintCard: {
    backgroundColor: 'rgba(12,18,44,0.86)',
    borderWidth: 1,
    borderColor: 'rgba(140,160,220,0.15)',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
  },
  hintTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  hintBody: { fontSize: 13.5, lineHeight: 19, marginTop: 5 },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 26,
    paddingVertical: 11,
    marginTop: 16,
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
