import React, { useCallback, useRef } from 'react';
import { StyleSheet, Text, View, type ImageSourcePropType, type LayoutChangeEvent } from 'react-native';
import { ThemedArtLayers } from '../../theme/ThemedArtLayers';
import Ionicons from '@expo/vector-icons/Ionicons';
import V2Pressable from '../../v2/V2Pressable';
import { V2, V2_TYPE } from '../../../constants/v2Style';
import { useV2Palette } from '../../v2/useV2Palette';
import { colorWithAlpha } from '../../v2/plateAlpha';
import { HOME_PLATE_ALPHA, useHomePlateStyle } from './homePlate';
import { nestedBoxShadow, useShadowGlass } from '../../v2/ShadowSurface';
import { renderWindowEpoch, useRenderCause } from '../../../app/render_cause_probe';

type Props = {
  title: string;
  done: number;
  total: number;
  /** Реальный тематически-независимый арт продолжения либо арт состояния ошибок. */
  art: ImageSourcePropType;
  /** Слой `.accent` (цвет темы) из того же resolveThemedArt; нет — один слой. */
  artAccent?: ImageSourcePropType | null;
  /**
   * зачем (владелец 15.10, скрин: «рисунок вылезает за рамки, плашка налезает на рисунок»; правило «не обрезается»): раньше `artWide` включал cover — арт
   * резался и выходил за карточку. Теперь рисунок ВСЕГДА целиком (contain) внутри карточки с отступом, а плашка стоит под ним. Проп оставлен для вызова Главной, значение не влияет.
   */
  artWide?: boolean;
  /** «Урок 4» — плашка поверх арта справа. */
  badge?: string;
  accessibilityLabel: string;
  onPress: () => void;
  onLongPress?: () => void;
  /**
   * зачем (координатор 01.10, эмулятор: карточка появлялась позже и сдвигала Главную на ~290 px):
   * урок ещё читается с диска — карточка стоит на своём месте той же геометрии, вместо текста
   * заготовки. Первый кадр = финальная геометрия (Performance Bible).
   */
  pending?: boolean;
  /**
   * зачем (Ревизор по R09, 🟡; Моменты 15.10): занятие V2 готовится до 12 с — карточка не молчит: приглушена (0.72, как primaryBusy итога занятия) и помечена занятой для скринридера.
   * Геометрия не меняется (это не скелет), повторные тапы гасит сам запуск.
   */
  busy?: boolean;
};

/**
 * Карточка «продолжить» новой Главной: название, ниже полоса прогресса со счётчиком
 * x / N и круглой стрелкой; справа арт из утверждённого ассета с плашкой номера урока.
 * зачем (владелец 04.10, по скриншоту: «этот блок в два раза ниже, убери текст
 * “Продолжить обучение”»): надписи-оверлайна нет, счётчик переехал в строку полосы —
 * две строки вместо четырёх, высота 80 вместо ≈ 158.
 */
export default function HomeV2ContinueCard({ title, done, total, art, artAccent = null, artWide = false, badge, accessibilityLabel, onPress, onLongPress, pending = false, busy = false }: Props) {
  useRenderCause('home:continue', () => ({ title, done, total, art, artAccent, artWide, badge, accessibilityLabel, onPress, onLongPress, pending, busy }), renderWindowEpoch()); // зачем (координатор 15.10): причина каждой перерисовки в окне 10 с, [HOME-RENDERS]; в релизе пустая функция
  const p = useV2Palette();
  const glass = useHomePlateStyle(); // зачем: приказ владельца 11.10 19:2x — плашки Главной с фоном 50 % (альфа цвета фона), без блика/дымки; общий хук стекла остальных экранов не менялся
  const shadowGlass = useShadowGlass(); // зачем («Тень» 12.10): значок-плашка и стрелка — вложенные, с малой тенью вместо кромки
  const safeTotal = Math.max(1, total);
  const ratio = Math.max(0, Math.min(1, done / safeTotal));
  // зачем (владелец 15.10, «сперва логи»): размеры карточки, колонки арта и плашки на экране — по одной строке на смену, чтобы видеть реальную геометрию на 360/393/430 и длинных языках
  const layoutLogRef = useRef<Record<string, string>>({});
  const logLayout = useCallback((node: string) => (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    const line = JSON.stringify({ node, x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height) });
    if (layoutLogRef.current[node] === line) return;
    layoutLogRef.current[node] = line;
    console.log('[HOME-CONTINUE-ART] layout', line, JSON.stringify({ pending, artWide, accent: artAccent !== null, badge: badge ?? null, artSize: badge ? ART_SIZE : ART_SIZE_SOLO })); // guard-ok: одна строка на смену геометрии
  }, [artAccent, artWide, badge, pending]);
  return (
    <V2Pressable
      testID={pending ? 'home-continue-lesson-pending' : 'home-continue-lesson'}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: pending || busy }}
      // зачем (координатор 12.10, Optimistic UI R1): на скелете тап раньше был «мёртвым» (disabled — ни сжатия, ни следа). Теперь карточка
      // нажимается (scale 0.98) и ничего не открывает; журнал press:ignored остаётся.
      onPress={pending ? () => { console.warn('[HOME-CONTINUE] press:ignored', JSON.stringify({ reason: 'pending_skeleton' })); } : onPress} // guard-ok: ранний выход называет причину
      onLongPress={pending ? undefined : onLongPress}
      scaleTo={0.98}
      style={[s.card, glass, busy ? s.cardBusy : null]}
      onLayout={logLayout('card')}
    >
      <View pointerEvents="none" onLayout={logLayout('artColumn')} style={[s.art, pending ? s.artPending : null]}>
        <ThemedArtLayers source={art} accent={artAccent} style={badge && !pending ? s.artImage : s.artImageSolo} contentFit="contain" contentPosition="center" />
        {badge && !pending ? (
          <View
            onLayout={logLayout('badge')}
            style={[s.badge, { backgroundColor: colorWithAlpha(p.control, HOME_PLATE_ALPHA), boxShadow: nestedBoxShadow(shadowGlass) }]}
          >
            <Text style={[s.badgeText, { color: p.text }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={s.copy}>
        {pending ? (
          <View style={[s.titleBar, { backgroundColor: p.control }]} />
        ) : (
          <Text testID="home-continue-lesson-title" numberOfLines={2} ellipsizeMode="tail" style={[s.title, { color: p.text }]}>{title}</Text> /* зачем (бета-тест А4, 15.10): карточка фиксированной высоты 96 с overflow hidden — длинное название обрезалось без многоточия; теперь два ряда и «…» */
        )}
        <View style={s.progressRow}>
          <View style={[s.track, { backgroundColor: p.track }]}>
            {/* Ширина задаётся сразу — первый кадр = финальная геометрия. */}
            {pending ? null : <View style={[s.fill, { width: `${ratio * 100}%`, backgroundColor: p.progressFill }]} />}
          </View>
          {pending ? (
            <View style={[s.counterBar, { backgroundColor: p.control }]} />
          ) : (
            <Text style={[s.counter, { color: p.textSecondary }]}>{`${done} / ${total}`}</Text>
          )}
          <View style={[s.arrow, { backgroundColor: colorWithAlpha(p.glassRaised, HOME_PLATE_ALPHA), boxShadow: nestedBoxShadow(shadowGlass) }]}>
            <Ionicons name="chevron-forward" size={16} color={p.text} />
          </View>
        </View>
      </View>
    </V2Pressable>
  );
}

// зачем (координатор 15.10, эталон Главной: карточка «Продолжить» 96, не 80): рисунок 64 + плашка 22 + зазор 3 = 89 из 96 (по 3–4 сверху и снизу); без плашки рисунок 80
const CARD_HEIGHT = 96;
const ART_SIZE = 64;
const ART_SIZE_SOLO = 80;

const s = StyleSheet.create({
  cardBusy: { opacity: 0.72 },
  // зачем (Ревизор 15.10, R03): при крупном системном шрифте (1.3) фиксированные 96 с overflow hidden резали текст — теперь 96 это минимум, высота растёт по содержимому
  card: {
    minHeight: CARD_HEIGHT,
    borderRadius: V2.radius.card,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  // зачем (владелец 15.10): колонка арта — рисунок (contain, целиком) и под ним плашка «Урок N», друг на друга не заходят: 64 + 3 + 22 = 89 из 96
  art: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '32%', opacity: 0.95, alignItems: 'center', justifyContent: 'center' },
  artImage: { width: ART_SIZE, height: ART_SIZE },
  // без плашки (нет последнего урока) рисунок крупнее — 80 из 96
  artImageSolo: { width: ART_SIZE_SOLO, height: ART_SIZE_SOLO },
  artPending: { opacity: 0.35 },
  // Заготовки повторяют строки: заголовок 20, счётчик — в строке полосы.
  titleBar: { height: 14, width: '78%', borderRadius: 7, marginTop: 3, marginBottom: 3 },
  counterBar: { height: 12, width: 40, borderRadius: 6 },
  // плашка в потоке под рисунком (не absolute): ширина по тексту, не шире колонки — «Pelajaran 12» / «Lección 12» не заходят на рисунок и на текст слева
  badge: {
    marginTop: 3,
    maxWidth: '100%',
    minHeight: 22,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  copy: { flex: 1, justifyContent: 'center', paddingVertical: 14, paddingLeft: 16, paddingRight: '34%' },
  title: { fontSize: 16, lineHeight: 20, fontWeight: '700', letterSpacing: -0.3 },
  counter: { ...V2_TYPE.subtitle, fontVariant: ['tabular-nums'] },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  track: { flex: 1, height: V2.progress.height, borderRadius: V2.progress.height / 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: V2.progress.height / 2, minWidth: V2.progress.height * 2 },
  arrow: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
