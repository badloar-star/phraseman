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
import DuoPressable from '../components/DuoPressable';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { subscribeConstellationMatch } from './services/constellations_db';
import { ensureArenaAuthUid } from './user_id_policy';
import { CONSTELLATION_SLOT_COLORS } from './constellation_sky_map';
import { parseHexKey } from './constellations_hex';
import type { ConstellationMatch } from './types/constellations';

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
    es: {
      adj: ['Astuto', 'Valiente', 'Silencioso', 'Veloz', 'Sabio', 'Audaz', 'Boreal', 'Ígneo'],
      animal: ['Zorro', 'Búho', 'Lince', 'Vencejo', 'Galápago', 'Pantera', 'Nutria', 'Libélula'],
      pattern: (a, b) => `Constelación del ${b} ${a}`,
    },
  };
  const dict = table[lang] ?? table.ru;
  return dict.pattern(dict.adj[adjIdx], dict.animal[animalIdx]);
}

export default function ConstellationResultsScreen() {
  const router = useRouter();
  const { matchId: rawMatchId } = useLocalSearchParams<{ matchId?: string }>();
  const matchId = typeof rawMatchId === 'string' ? rawMatchId : '';
  const { theme: t, f } = useTheme();
  const { lang } = useLang();

  const [uid, setUid] = useState<string | null>(null);
  const [match, setMatch] = useState<ConstellationMatch | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => { void ensureArenaAuthUid().then(setUid); }, []);
  useEffect(() => {
    if (!matchId) return;
    const unsub = subscribeConstellationMatch(matchId, setMatch);
    return unsub;
  }, [matchId]);

  const ranked = useMemo(() => {
    if (!match) return [];
    return [...match.players].sort((a, b) => (a.place ?? 4) - (b.place ?? 4));
  }, [match]);

  const mySlot = useMemo(
    () => match?.players.find((p) => p.uid === uid)?.slot ?? null,
    [match, uid],
  );

  // Контур моего созвездия: центры моих звёзд, соединённые по порядку обхода.
  const myOutline = useMemo(() => {
    if (!match || mySlot === null) return [];
    const pts: Array<{ x: number; y: number }> = [];
    for (const [key, star] of Object.entries(match.stars)) {
      if (star.owner !== mySlot) continue;
      const h = parseHexKey(key);
      if (!h) continue;
      pts.push({
        x: 26 * Math.sqrt(3) * (h.q + h.r / 2) + 160,
        y: 26 * 1.3 * h.r + 95,
      });
    }
    // Обход по углу вокруг центроида — контур без самопересечений.
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

  if (!match) {
    return <LinearGradient colors={skyColors} style={styles.root} />;
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={skyColors} style={StyleSheet.absoluteFill} />
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
              <Text style={[styles.podPlace, { color: t.textSecond }]}>#{p.place ?? '–'}</Text>
              <View style={[styles.podAva, { backgroundColor: CONSTELLATION_SLOT_COLORS[p.slot] }]}>
                <Text style={styles.podAvaText}>{(p.name[0] ?? '?').toUpperCase()}</Text>
              </View>
              <Text numberOfLines={1} style={[styles.podName, { color: t.textPrimary }]}>
                {p.uid === uid
                  ? triLang(lang, {
                    ru: 'Ты', uk: 'Ти', es: 'Tú', 'pt-BR': 'Você',
                    vi: 'Bạn', id: 'Kamu', tr: 'Sen', pl: 'Ty',
                  })
                  : p.name}
              </Text>
              <Text style={styles.podPts}>{p.bonusPoints}</Text>
              {match.starfall.golden && p.starfallEarned > 0 ? (
                <Text style={styles.podShards}>◆ {p.starfallEarned}</Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* Именное созвездие */}
        <View style={[styles.constCard, { borderColor: '#2A3A6A' }]}>
          <Svg width="100%" height={190} viewBox="0 0 320 190">
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
              <Circle key={`s${i}`} cx={p.x} cy={p.y} r={10} fill="url(#resStar)" />
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
            style={[styles.ghost, { borderColor: t.border }]}
            onPress={() => {
              setToast(triLang(lang, {
                ru: 'Шаринг картинкой — скоро ✨', uk: 'Шаринг — скоро ✨', es: 'Compartir — pronto ✨',
                'pt-BR': 'Compartilhar — em breve ✨', vi: 'Chia sẻ — sắp có ✨', id: 'Bagikan — segera ✨',
                tr: 'Paylaşım — yakında ✨', pl: 'Udostępnianie — wkrótce ✨',
              }));
              setTimeout(() => setToast(''), 2200);
            }}
          >
            <Ionicons name="share-social" size={16} color={t.textSecond} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ghost, { borderColor: t.border }]}
            onPress={() => router.dismissAll ? router.dismissAll() : router.back()}
          >
            <Ionicons name="home" size={16} color={t.textSecond} />
          </TouchableOpacity>
        </View>
      </View>
      {toast ? (
        <View style={[styles.toast, { borderColor: t.accent }]}>
          <Text style={{ color: t.textPrimary, fontSize: f.caption }}>{toast}</Text>
        </View>
      ) : null}
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
  toast: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: '#0B1330',
  },
});
