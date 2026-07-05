// ════════════════════════════════════════════════════════════════════════════
// constellation_results.tsx — финал матча «Созвездий» (спек F5, v1).
//
// Подиум мест + «Твоё именное созвездие»: контур захваченных звёзд рисуется
// линиями и получает процедурное имя от сида матча (детерминировано — у всех
// участников одно имя). v1-хвосты: шаринг картинкой (пока копи-тост),
// разбор ошибок D10 и анимации наград (Фаза 4 — награды сервера).
// ════════════════════════════════════════════════════════════════════════════

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line, RadialGradient, Stop, Defs } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { ConstellationStarfield } from './constellation_starfield';
import DuoPressable from '../components/DuoPressable';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { subscribeConstellationMatch, subscribeConstellationResult } from './services/constellations_db';
import { hapticCelebrate, hapticSuccess } from '../hooks/use-haptics';
import { ensureArenaAuthUid } from './user_id_policy';
import { CONSTELLATION_SLOT_COLORS } from './constellation_sky_map';
import { buildMapLayout } from './constellations_hex';
import { shareCardFromSvgRef } from '../components/share_cards/shareCardPng';

/** Радиус гекса для раскладки контура на результатах (масштабируется под viewBox). */
const RESULT_HEX_SIZE = 27;
import type { ConstellationMatch, ConstellationResult } from './types/constellations';

/** Детерминированное имя созвездия от сида матча (одно у всех участников). */
function constellationName(seed: string, lang: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const adjIdx = (h >>> 3) % 8;
  const animalIdx = (h >>> 11) % 8;
  const table: Record<string, { adj: string[]; animal: string[]; pattern: (a: string, b: string) => string }> = {
    ru: {
      adj: ['Хитрой', 'Смелой', 'Тихой', 'Быстрой', 'Мудрой', 'Дерзкой', 'Северной', 'Огненной'],
      animal: ['Лисы', 'Совы', 'Рыси', 'Ласточки', 'Черепахи', 'Пантеры', 'Выдры', 'Стрекозы'],
      pattern: (a, b) => `Созвездие ${a} ${b}`,
    },
    uk: {
      adj: ['Хитрої', 'Сміливої', 'Тихої', 'Швидкої', 'Мудрої', 'Зухвалої', 'Північної', 'Вогняної'],
      animal: ['Лисиці', 'Сови', 'Рисі', 'Ластівки', 'Черепахи', 'Пантери', 'Видри', 'Бабки'],
      pattern: (a, b) => `Сузір’я ${a} ${b}`,
    },
    // ES: чтобы избежать рассогласования рода (del + женское + мужское прил.),
    // паттерн без артикля рода: «Constelación: Zorro Astuto» — грамматически нейтрально.
    es: {
      adj: ['Astuto', 'Valiente', 'Silencioso', 'Veloz', 'Sabio', 'Audaz', 'Boreal', 'Ígneo'],
      animal: ['Zorro', 'Búho', 'Lince', 'Halcón', 'Lobo', 'Puma', 'Cuervo', 'Dragón'],
      pattern: (a, b) => `Constelación: ${b} ${a}`,
    },
    en: {
      adj: ['Sly', 'Brave', 'Silent', 'Swift', 'Wise', 'Bold', 'Northern', 'Fiery'],
      animal: ['Fox', 'Owl', 'Lynx', 'Swift', 'Wolf', 'Panther', 'Raven', 'Dragon'],
      pattern: (a, b) => `The ${a} ${b} Constellation`,
    },
    'pt-BR': {
      adj: ['Astuta', 'Corajosa', 'Silenciosa', 'Veloz', 'Sábia', 'Ousada', 'Boreal', 'Ígnea'],
      animal: ['Raposa', 'Coruja', 'Onça', 'Falcão', 'Lobo', 'Pantera', 'Corvo', 'Dragão'],
      pattern: (a, b) => `Constelação: ${b} ${a}`,
    },
    vi: {
      adj: ['Ranh Mãnh', 'Dũng Cảm', 'Lặng Lẽ', 'Nhanh Nhẹn', 'Khôn Ngoan', 'Táo Bạo', 'Phương Bắc', 'Rực Lửa'],
      animal: ['Cáo', 'Cú', 'Linh Miêu', 'Chim Én', 'Sói', 'Báo', 'Quạ', 'Rồng'],
      pattern: (a, b) => `Chòm Sao ${b} ${a}`,
    },
    id: {
      adj: ['Licik', 'Berani', 'Sunyi', 'Gesit', 'Bijak', 'Nekat', 'Utara', 'Berapi'],
      animal: ['Rubah', 'Burung Hantu', 'Lynx', 'Walet', 'Serigala', 'Panther', 'Gagak', 'Naga'],
      pattern: (a, b) => `Rasi ${b} ${a}`,
    },
    tr: {
      adj: ['Kurnaz', 'Cesur', 'Sessiz', 'Hızlı', 'Bilge', 'Atılgan', 'Kuzeyli', 'Ateşli'],
      animal: ['Tilki', 'Baykuş', 'Vaşak', 'Kırlangıç', 'Kurt', 'Panter', 'Karga', 'Ejderha'],
      pattern: (a, b) => `${a} ${b} Takımyıldızı`,
    },
    pl: {
      adj: ['Sprytnego', 'Odważnego', 'Cichego', 'Szybkiego', 'Mądrego', 'Zuchwałego', 'Północnego', 'Ognistego'],
      animal: ['Lisa', 'Sowy', 'Rysia', 'Jaskółki', 'Wilka', 'Pantery', 'Kruka', 'Smoka'],
      pattern: (a, b) => `Gwiazdozbiór ${a} ${b}`,
    },
  };
  // Fallback — английский (не русский): турок не должен видеть кириллицу.
  const dict = table[lang] ?? table.en;
  return dict.pattern(dict.adj[adjIdx], dict.animal[animalIdx]);
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Звезда созвездия «зажигается» с масштабом (каскад по индексу) — созвездие
 *  собирается на глазах, а не появляется готовым. Одноразово, не цикл. */
function PopStar({ x, y, delay }: { x: number; y: number; delay: number }) {
  const s = useSharedValue(0);
  useEffect(() => {
    s.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.back(1.6)) }));
  }, [s, delay]);
  const props = useAnimatedProps(() => ({ r: 10 * s.value, opacity: s.value }));
  return <AnimatedCircle cx={x} cy={y} fill="url(#resStar)" animatedProps={props} />;
}

export default function ConstellationResultsScreen() {
  const router = useRouter();
  const { matchId: rawMatchId } = useLocalSearchParams<{ matchId?: string }>();
  const matchId = typeof rawMatchId === 'string' ? rawMatchId : '';
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  const [uid, setUid] = useState<string | null>(null);
  const [match, setMatch] = useState<ConstellationMatch | null>(null);
  const [result, setResult] = useState<ConstellationResult | null>(null);

  useEffect(() => { void ensureArenaAuthUid().then(setUid); }, []);
  useEffect(() => {
    if (!matchId) return;
    const unsubMatch = subscribeConstellationMatch(matchId, setMatch);
    const unsubResult = subscribeConstellationResult(matchId, setResult);
    return () => { unsubMatch(); unsubResult(); };
  }, [matchId]);

  // Моя строка наград из results-дока (появляется после серверной финализации).
  const myReward = useMemo(
    () => result?.players.find((p) => p.uid === uid) ?? null,
    [result, uid],
  );

  // Хаптика финала (8.2): празднование за 1 место, успех за призовое — весь
  // экран результатов раньше был без единой вибрации. Один раз на появление.
  const celebratedRef = React.useRef(false);
  useEffect(() => {
    if (!myReward || celebratedRef.current) return;
    celebratedRef.current = true;
    if (myReward.place === 1) hapticCelebrate();
    else if (myReward.place <= 3) hapticSuccess();
  }, [myReward]);

  const ranked = useMemo(() => {
    if (!match) return [];
    return [...match.players].sort((a, b) => (a.place ?? 4) - (b.place ?? 4));
  }, [match]);

  const mySlot = useMemo(
    () => match?.players.find((p) => p.uid === uid)?.slot ?? null,
    [match, uid],
  );

  // Контур моего созвездия: центры моих звёзд той же геометрией, что карта матча
  // (единый buildMapLayout — иначе контур не совпадал с тем, что игрок видел, 0.3).
  const myOutline = useMemo(() => {
    if (!match || mySlot === null) return [];
    // Раскладка карты + масштаб/сдвиг под viewBox 320×190.
    const layout = buildMapLayout(RESULT_HEX_SIZE, 6);
    const scale = Math.min(320 / layout.width, 190 / layout.height);
    const dx = 320 / 2;
    const dy = 190 / 2;
    const pts: Array<{ x: number; y: number }> = [];
    for (const [key, star] of Object.entries(match.stars)) {
      if (star.owner !== mySlot) continue;
      const c = layout.centers[key];
      if (!c) continue;
      pts.push({ x: c.x * scale + dx, y: c.y * scale + dy });
    }
    if (pts.length < 2) return pts;
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return [...pts].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  }, [match, mySlot]);

  const name = useMemo(
    () => (match ? constellationName(match.mapSeed || match.id, lang) : ''),
    [match, lang],
  );

  const skyColors = useMemo(
    (): [string, string, string] => [t.bgGradient?.[0] ?? '#0A1124', '#0E1734', '#080D1F'],
    [t],
  );

  const myColor = mySlot !== null ? CONSTELLATION_SLOT_COLORS[mySlot] : '#5AC8FA';

  // Реальный шаринг именного созвездия картинкой (аудит: была заглушка «скоро»).
  const constSvgRef = React.useRef<InstanceType<typeof Svg> | null>(null);
  const shareConstellation = React.useCallback(() => {
    hapticSuccess();
    void shareCardFromSvgRef(constSvgRef, {
      fileNamePrefix: 'constellation',
      textFallback: triLang(lang, {
        ru: `Собрал созвездие «${name}» в Phraseman ⭐`,
        uk: `Зібрав сузір’я «${name}» у Phraseman ⭐`,
        es: `Formé la constelación «${name}» en Phraseman ⭐`,
        'pt-BR': `Montei a constelação «${name}» no Phraseman ⭐`,
        vi: `Đã tạo chòm sao «${name}» trên Phraseman ⭐`,
        id: `Membentuk rasi «${name}» di Phraseman ⭐`,
        tr: `Phraseman’de «${name}» takımyıldızını kurdum ⭐`,
        pl: `Ułożyłem gwiazdozbiór «${name}» w Phraseman ⭐`,
      }),
    });
  }, [lang, name]);

  if (!match) {
    return <LinearGradient colors={skyColors} style={styles.root} />;
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={skyColors} style={StyleSheet.absoluteFill} />
      <ConstellationStarfield count={44} />
      <View style={styles.body}>
        <Text style={[styles.header, { color: t.textPrimary, fontSize: f.h2 }]}>
          {triLang(lang, {
            ru: 'Матч завершён', uk: 'Матч завершено', es: 'Partida terminada',
            'pt-BR': 'Partida encerrada', vi: 'Trận kết thúc', id: 'Match selesai',
            tr: 'Maç bitti', pl: 'Mecz zakończony',
          })}
          {match.starfall.golden ? ' ✨' : ''}
        </Text>

        {/* Подиум */}
        <View style={styles.podium}>
          {ranked.map((p) => (
            <View
              key={p.slot}
              style={[styles.pod, {
                borderColor: (p.place ?? 4) === 1 ? 'rgba(255,209,102,0.55)' : t.border,
                backgroundColor: (p.place ?? 4) === 1 ? 'rgba(255,209,102,0.07)' : 'rgba(5,9,20,0.5)',
              }]}
            >
              <Text style={[styles.podPlace, { color: t.textSecond, fontSize: f.caption - 3 }]}>#{p.place ?? '–'}</Text>
              <View style={[styles.podAva, { backgroundColor: CONSTELLATION_SLOT_COLORS[p.slot] }]}>
                <Text style={styles.podAvaText}>{(p.name[0] ?? '?').toUpperCase()}</Text>
              </View>
              <Text numberOfLines={1} style={[styles.podName, { color: t.textPrimary, fontSize: f.caption - 2 }]}>
                {p.uid === uid
                  ? triLang(lang, {
                    ru: 'Ты', uk: 'Ти', es: 'Tú', 'pt-BR': 'Você',
                    vi: 'Bạn', id: 'Kamu', tr: 'Sen', pl: 'Ty',
                  })
                  : p.name}
              </Text>
              <Text style={[styles.podPts, { fontSize: f.caption }]}>
                {result?.players.find((r) => r.uid === p.uid)?.points ?? p.liveScore ?? p.bonusPoints}
              </Text>
              {match.starfall.golden && p.starfallEarned > 0 ? (
                <Text style={[styles.podShards, { fontSize: f.caption - 3 }]}>◆ {p.starfallEarned}</Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* Мои награды: полёт XP/осколков/★ (F5, появляется после финализации) */}
        {myReward ? (
          <View style={styles.rewardRow}>
            <View style={styles.rewardChip}>
              <Text style={[styles.rewardVal, { fontSize: f.h2 }]}>+{myReward.xpGained}</Text>
              <Text style={[styles.rewardLab, { color: t.textSecond, fontSize: f.caption - 3 }]}>XP</Text>
            </View>
            {myReward.shardsGained > 0 ? (
              <View style={styles.rewardChip}>
                <Text style={[styles.rewardVal, { color: '#FFD166', fontSize: f.h2 }]}>◆ {myReward.shardsGained}</Text>
                <Text style={[styles.rewardLab, { color: t.textSecond, fontSize: f.caption - 3 }]}>
                  {triLang(lang, {
                    ru: 'осколки', uk: 'уламки', es: 'fragmentos', 'pt-BR': 'fragmentos',
                    vi: 'mảnh', id: 'pecahan', tr: 'parça', pl: 'odłamki',
                  })}
                </Text>
              </View>
            ) : null}
            {myReward.starDelta !== 0 ? (
              <View style={styles.rewardChip}>
                <Text style={[styles.rewardVal, { color: myReward.starDelta > 0 ? '#63E6A4' : '#FF7A9E', fontSize: f.h2 }]}>
                  {myReward.starDelta > 0 ? '+' : ''}{myReward.starDelta}★
                </Text>
                <Text style={[styles.rewardLab, { color: t.textSecond, fontSize: f.caption - 3 }]}>
                  {triLang(lang, {
                    ru: 'ранг', uk: 'ранг', es: 'rango', 'pt-BR': 'rank',
                    vi: 'hạng', id: 'peringkat', tr: 'rütbe', pl: 'ranga',
                  })}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Именное созвездие */}
        <View style={[styles.constCard, { borderColor: '#2A3A6A' }]}>
          <Svg ref={constSvgRef} width="100%" height={190} viewBox="0 0 320 190">
            <Defs>
              <RadialGradient id="resStar">
                <Stop offset="0" stopColor="#FFFFFF" />
                <Stop offset="0.3" stopColor={myColor} />
                <Stop offset="1" stopColor={myColor} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            {myOutline.map((p, i) => {
              const next = myOutline[(i + 1) % myOutline.length];
              if (!next || myOutline.length < 3) return null;
              return (
                <React.Fragment key={`l${i}`}>
                  <Line x1={p.x} y1={p.y} x2={next.x} y2={next.y}
                    stroke={myColor} strokeOpacity={0.18} strokeWidth={4} />
                  <Line x1={p.x} y1={p.y} x2={next.x} y2={next.y}
                    stroke={myColor} strokeOpacity={0.9} strokeWidth={1.4} />
                </React.Fragment>
              );
            })}
            {myOutline.map((p, i) => (
              <PopStar key={`s${i}`} x={p.x} y={p.y} delay={i * 120} />
            ))}
          </Svg>
          <Text style={[styles.constName, { color: t.textPrimary, fontSize: f.sub + 1 }]}>{name}</Text>
          <Text style={[styles.constSub, { color: t.textSecond, fontSize: f.caption - 1 }]}>
            {triLang(lang, {
              ru: `контур твоих звёзд · ${myOutline.length} шт.`,
              uk: `контур твоїх зірок · ${myOutline.length}`,
              es: `contorno de tus estrellas · ${myOutline.length}`,
              'pt-BR': `contorno das suas estrelas · ${myOutline.length}`,
              vi: `đường viền sao của bạn · ${myOutline.length}`,
              id: `garis bintangmu · ${myOutline.length}`,
              tr: `yıldızlarının hattı · ${myOutline.length}`,
              pl: `kontur twoich gwiazd · ${myOutline.length}`,
            })}
          </Text>
        </View>

        {/* CTA */}
        <View style={styles.btnRow}>
          <DuoPressable
            testID="constellation-results-again"
            onPress={() => router.replace('/constellation_search' as any)}
            edgeColor={t.accent}
            wrapStyle={{ flex: 1 }}
            style={[styles.cta, { backgroundColor: t.accent }]}
          >
            <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.sub }}>
              {triLang(lang, {
                ru: '⭐ Ещё матч', uk: '⭐ Ще матч', es: '⭐ Otra partida', 'pt-BR': '⭐ Outra partida',
                vi: '⭐ Trận nữa', id: '⭐ Main lagi', tr: '⭐ Bir maç daha', pl: '⭐ Jeszcze raz',
              })}
            </Text>
          </DuoPressable>
          <TouchableOpacity
            testID="constellation-results-share"
            style={[styles.ghost, { borderColor: t.border }]}
            onPress={shareConstellation}
          >
            <Ionicons name="share-social" size={16} color={t.textSecond} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="constellation-results-home"
            style={[styles.ghost, { borderColor: t.border }]}
            onPress={() => router.replace('/(tabs)/arena' as any)}
          >
            <Ionicons name="home" size={16} color={t.textSecond} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    flex: 1,
    paddingTop: 64,
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 14,
  },
  header: { fontWeight: '900', textAlign: 'center' },
  podium: { flexDirection: 'row', gap: 8 },
  pod: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 3,
  },
  podPlace: { fontSize: 10, fontVariant: ['tabular-nums'] },
  podAva: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podAvaText: { color: '#06122B', fontWeight: '800', fontSize: 11 },
  podName: { fontSize: 11, fontWeight: '700', maxWidth: '100%' },
  podPts: { color: '#FFD166', fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  podShards: { color: '#FFD166', fontSize: 10, opacity: 0.8 },
  rewardRow: { flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 4 },
  rewardChip: { alignItems: 'center' },
  rewardVal: { color: '#EAF2FF', fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  rewardLab: { fontSize: 10, marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.4 },
  constCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(8,13,31,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 12,
  },
  constName: { fontWeight: '800', letterSpacing: 0.4 },
  constSub: { marginTop: 2 },
  btnRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  cta: {
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
  },
  ghost: {
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
