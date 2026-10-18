import React, { memo, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, type ImageSourcePropType, type LayoutChangeEvent } from 'react-native';
import { ThemedArtLayers } from '../../theme/ThemedArtLayers';
import V2Pressable from '../../v2/V2Pressable';
import Svg, { Circle } from 'react-native-svg';
import { V2, V2_TYPE } from '../../../constants/v2Style';
import { useV2Palette } from '../../v2/useV2Palette';
import { useHomePlateStyle } from './homePlate';
import { useShadowGlass } from '../../v2/ShadowSurface';
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
  /**
   * зачем (слово владельца 17.10, карточка «последнее место»): у диалога, набора карточек и «Начать урок 1» нет «x из N» — полосу и счётчик не рисуем,
   * строка остаётся той же высоты, стрелка справа на своём месте (геометрия карточки не меняется).
   */
  hideProgress?: boolean;
};

/**
 * Карточка «продолжить» новой Главной: название, ниже полоса прогресса со счётчиком
 * x / N и круглой стрелкой; справа арт из утверждённого ассета с плашкой номера урока.
 * зачем (владелец 04.10, по скриншоту: «этот блок в два раза ниже, убери текст
 * “Продолжить обучение”»): надписи-оверлайна нет, счётчик переехал в строку полосы —
 * две строки вместо четырёх, высота 80 вместо ≈ 158.
 */

/**
 * зачем (координатор 17.10, скорость Главной): Главная передаёт новый onPress на каждый свой рендер — карточка перерисовывалась впустую.
 * Обёртка кладёт свежие обработчики в ref, memo-вид сравнивает только данные; тап зовёт самый свежий onPress.
 */
export default function HomeV2ContinueCard(props: Props) {
  const latestRef = useRef<Props>(props);
  latestRef.current = props;
  const press = useCallback(() => latestRef.current.onPress(), []);
  const longPress = useCallback(() => latestRef.current.onLongPress?.(), []);
  return <HomeV2ContinueCardView {...props} onPress={press} onLongPress={props.onLongPress ? longPress : undefined} />;
}

const HomeV2ContinueCardView = memo(function HomeV2ContinueCardView({ title, done, total, art, artAccent = null, artWide = false, badge, accessibilityLabel, onPress, onLongPress, pending = false, busy = false, hideProgress = false }: Props) {
  useRenderCause('home:continue', () => ({ title, done, total, art, artAccent, artWide, badge, accessibilityLabel, onPress, onLongPress, pending, busy, hideProgress }), renderWindowEpoch()); // зачем (координатор 15.10): причина каждой перерисовки в окне 10 с, [HOME-RENDERS]; в релизе пустая функция
  const p = useV2Palette();
  const glass = useHomePlateStyle(); // зачем: приказ владельца 11.10 19:2x — плашки Главной с фоном 50 % (альфа цвета фона), без блика/дымки; общий хук стекла остальных экранов не менялся
  const shadowGlass = useShadowGlass(); // зачем («Тень» 12.10): значок-плашка и стрелка — вложенные, с малой тенью вместо кромки
  const safeTotal = Math.max(1, total);
  const ratio = Math.max(0, Math.min(1, done / safeTotal));
  // строка под названием: у урока «9 / 50 · Урок 1», у диалога/набора — только метка места, у «Начать урок 1» — пусто
  const showRing = !hideProgress;
  const subLine = [showRing ? `${done} / ${total}` : null, badge ?? null].filter(Boolean).join(' · ');
  // зачем (владелец 15.10, «сперва логи»): размеры карточки, колонки арта и плашки на экране — по одной строке на смену, чтобы видеть реальную геометрию на 360/393/430 и длинных языках
  const layoutLogRef = useRef<Record<string, string>>({});
  const logLayout = useCallback((node: string) => (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    const line = JSON.stringify({ node, x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height) });
    if (layoutLogRef.current[node] === line) return;
    layoutLogRef.current[node] = line;
    console.log('[HOME-CONTINUE-ART] layout', line, JSON.stringify({ pending, artWide, accent: artAccent !== null, badge: badge ?? null, artSize: ART_SIZE, ring: RING_SIZE })); // guard-ok: одна строка на смену геометрии
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
      {/* зачем (слово владельца 18.10, «вариант Г» из docs/design/v2-app/continue-card-variants.html): слева название и одна строка «9 / 50 · Урок 1»,
          справа прогресс — кольцо вокруг иконки. Высота прежняя (96), иконка та же; кольцо и трек — токены ТЕКУЩЕЙ темы («они обязаны слушаться цвета темы»):
          дуга accentGraphic (≥ 3:1 к плашкам и фону в каждой теме), трек buttonFill. Полосы и стрелки нет. */}
      <View style={s.copy}>
        {pending ? (
          <>
            <View style={[s.titleBar, { backgroundColor: p.control }]} />
            <View style={[s.counterBar, { backgroundColor: p.control }]} />
          </>
        ) : (
          <>
            <Text testID="home-continue-lesson-title" numberOfLines={2} ellipsizeMode="tail" style={[s.title, { color: p.text }]}>{title}</Text>
            {/* зачем: обрезка разрешена только названию (сторож A4 15.10); строка «9 / 50 · Урок 1» короткая и при крупном шрифте переносится, не режется */}
            {subLine ? <Text style={[s.sub, { color: p.textSecondary }]}>{subLine}</Text> : null}
          </>
        )}
      </View>
      <View pointerEvents="none" onLayout={logLayout('ring')} style={[s.ring, pending ? s.artPending : null]}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
          <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} stroke={shadowGlass.buttonFill} strokeWidth={RING_STROKE} fill="none" />
          {showRing && ratio > 0 ? (
            <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} stroke={shadowGlass.accentGraphic} strokeWidth={RING_STROKE} fill="none" strokeLinecap="round"
              strokeDasharray={`${ratio * RING_LEN} ${RING_LEN}`} rotation={-90} originX={RING_SIZE / 2} originY={RING_SIZE / 2} />
          ) : null}
        </Svg>
        <ThemedArtLayers source={art} accent={artAccent} style={s.artImage} contentFit="contain" contentPosition="center" />
      </View>
    </V2Pressable>
  );
});

// зачем (координатор 15.10, эталон Главной: карточка «Продолжить» 96, не 80): рисунок 64 + плашка 22 + зазор 3 = 89 из 96 (по 3–4 сверху и снизу); без плашки рисунок 80
const CARD_HEIGHT = 96;
// кольцо вокруг иконки (вариант Г): 74 по внешнему краю, толщина 4, иконка 50 внутри
const RING_SIZE = 74;
const RING_STROKE = 4;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_LEN = 2 * Math.PI * RING_R;
const ART_SIZE = 50;

const s = StyleSheet.create({
  cardBusy: { opacity: 0.72 },
  // зачем (Ревизор 15.10, R03): высота — minHeight 96, при шрифте 1,3 карточка растёт, а не режет текст
  card: {
    minHeight: CARD_HEIGHT,
    borderRadius: V2.radius.card,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 16,
    paddingRight: 11,
  },
  copy: { flex: 1, minWidth: 0, justifyContent: 'center', paddingVertical: 14 },
  title: { fontSize: 16, lineHeight: 20, fontWeight: '700', letterSpacing: -0.3 },
  sub: { ...V2_TYPE.subtitle, marginTop: 5, fontVariant: ['tabular-nums'] },
  ring: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  artImage: { width: ART_SIZE, height: ART_SIZE },
  artPending: { opacity: 0.35 },
  // заготовки повторяют строки: заголовок 20, строка «9 / 50 · Урок 1»
  titleBar: { height: 14, width: '78%', borderRadius: 7, marginTop: 3, marginBottom: 3 },
  counterBar: { height: 12, width: 90, borderRadius: 6, marginTop: 8 },
});
