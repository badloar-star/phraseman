import React, { memo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import V2Pressable from '../../v2/V2Pressable';
import { FlowText } from '../../text-integrity/FlowText';
import { V2, V2_TYPE } from '../../../constants/v2Style';
import { useV2Palette } from '../../v2/useV2Palette';
import { useHomePlateLog, useHomePlateStyle } from './homePlate';
import KitSpinner from '../../v2/KitSpinner';
import { renderWindowEpoch, useRenderCause } from '../../../app/render_cause_probe';
import { PlusAvatarRing } from '../../plus/PlusAvatarRing';
import { STORY_RING_SLOT } from '../../stories/story_ring_constants';

type StatChip = Readonly<{
  testID: string;
  icon: React.ReactNode;
  value: string;
  label: string;
  accessibilityLabel: string;
  onPress?: () => void;
  /** Справа в той же плашке через черту (энергия рядом с монетами на «Сцене»). */
  trailing?: React.ReactNode;
}>;

type Props = {
  /** Колокольчик (NotificationCenterButton) — со своей логикой и шторкой. */
  bellSlot?: React.ReactNode;
  /** Аватар профиля — со своей навигацией. */
  avatarSlot?: React.ReactNode;
  stats: readonly [StatChip, StatChip];
  /**
   * зачем (релизный пол 10.10): после входа серия и монеты догружаются в фоне до ~20 с —
   * тихий KitSpinner кита на месте значка, без сдвига разметки и без блокировки экрана.
   */
  refreshing?: boolean;
  /**
   * зачем (Главная A «Сцена», владелец 21.10): на сцене шапка лежит на цветном свете — текст белый, плашки стеклом (белый 16 %),
   * без плашек 50 % цвета фона. По умолчанию — прежний вид.
   */
  tone?: 'default' | 'scene';
  /** Кольцо Plus у аватара (общий PlusAvatarRing): plus — свой статус Plus, surface — цвет под значком ◆. Нет — аватар как был. */
  avatarPlus?: Readonly<{ plus: boolean; surface: string }>;
};

/** One compact utility row; the Home title and slogan are intentionally absent. */
/**
 * зачем (координатор 17.10, скорость Главной; «вид — ни на пиксель»): Главная на каждый рендер создаёт новые слоты-JSX, массив stats,
 * значки и onPress — шапка перерисовывалась впустую. Разметку не трогаем: memo-вид сравнивает то, что РИСУЕТСЯ (строки, наличие onPress,
 * тип и props значков/слотов на один уровень вглубь), а нажатия зовут самый свежий onPress из ref.
 */
export default function HomeV2Header(props: Props) {
  const latestRef = useRef<Props>(props);
  latestRef.current = props;
  return <HomeV2HeaderView {...props} latestRef={latestRef} />;
}

function samePlain(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const ak = Object.keys(a as object);
  const bk = Object.keys(b as object);
  return ak.length === bk.length && ak.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

/** Тот же элемент по виду: тип, ключ и props (вложенные объекты — на один уровень, как style={{ width: 20 }}); функции считаются равными. */
function sameElement(a: React.ReactNode, b: React.ReactNode): boolean {
  if (Object.is(a, b)) return true;
  if (!React.isValidElement(a) || !React.isValidElement(b)) return false;
  if (a.type !== b.type || a.key !== b.key) return false;
  const ap = a.props as Record<string, unknown>;
  const bp = b.props as Record<string, unknown>;
  const keys = new Set([...Object.keys(ap), ...Object.keys(bp)]);
  for (const k of keys) {
    const x = ap[k];
    const y = bp[k];
    if (typeof x === 'function' && typeof y === 'function') continue;
    if (!samePlain(x, y)) return false;
  }
  return true;
}

function sameHeaderData(a: ViewProps, b: ViewProps): boolean {
  if (a.refreshing !== b.refreshing || a.tone !== b.tone || a.latestRef !== b.latestRef || a.stats.length !== b.stats.length) return false;
  if ((a.avatarPlus?.plus ?? false) !== (b.avatarPlus?.plus ?? false) || a.avatarPlus?.surface !== b.avatarPlus?.surface) return false; // зачем (Ревизор 3.15): другое число показателей — не сравнивать по индексу (TypeError)
  if (!sameElement(a.bellSlot, b.bellSlot) || !sameElement(a.avatarSlot, b.avatarSlot)) return false;
  return a.stats.every((x, i) => {
    const y = b.stats[i];
    return x.testID === y.testID && x.value === y.value && x.label === y.label && x.accessibilityLabel === y.accessibilityLabel
      && Boolean(x.onPress) === Boolean(y.onPress) && sameElement(x.icon, y.icon) && sameElement(x.trailing, y.trailing);
  });
}

type ViewProps = Props & Readonly<{ latestRef: React.MutableRefObject<Props> }>;

const HomeV2HeaderView = memo(function HomeV2HeaderView({ bellSlot, avatarSlot, stats, refreshing = false, tone = 'default', avatarPlus, latestRef }: ViewProps) {
  useRenderCause('home:header', () => ({ bellSlot, avatarSlot, stats, refreshing, tone }), renderWindowEpoch()); // зачем (координатор 15.10): причина каждой перерисовки в окне 10 с, [HOME-RENDERS]; в релизе пустая функция
  const p = useV2Palette();
  const glass = useHomePlateStyle(); // зачем: приказ владельца 11.10 19:2x — плашки Главной с фоном 50 % (альфа цвета фона), без блика/дымки; общий хук стекла остальных экранов не менялся
  useHomePlateLog(); // [HOME-PLATE]: один раз на показ Главной
  const scene = tone === 'scene';
  const plate = scene ? s.scenePlate : glass;
  const textColor = scene ? '#FFFFFF' : p.text;
  const subColor = scene ? 'rgba(255,255,255,0.78)' : p.textSecondary;
  return (
    <View testID="home-v2-header" style={s.root}>
      <View style={s.topRow}>
        <View style={s.stats}>
          {stats.map((stat) => {
            const content = <>
              <View style={s.statIcon}>{refreshing ? <KitSpinner testID={`${stat.testID}-refreshing`} color={textColor} /> : stat.icon}</View>
              {/* зачем (Сверка font13, координатор 18.10): при системном шрифте 1,3 «Hoy aún no» (es/pt-BR/vi/id) уходило в 3 строки плашки (значение + 2 строки подписи); потолок роста кегля 1,1 держит 2 строки (значение + подпись), не ужатие. Расчёт по кадру: подпись ≈65 dp при 1,0 в колонке ≈72 dp */}
              <View style={s.statCopy}>
                <FlowText testID={`${stat.testID}-value`} provenance="authored" maxFontSizeMultiplier={1.1} style={[s.statValue, { color: textColor }]}>{stat.value}</FlowText>
                {stat.testID !== 'home-v2-coins' ? <FlowText testID={`${stat.testID}-label`} provenance="authored" maxFontSizeMultiplier={1.1} style={[s.statLabel, { color: subColor }]}>{stat.label}</FlowText> : null}
              </View>
              {stat.trailing ? <><View style={[s.divider, { backgroundColor: textColor }]} />{stat.trailing}</> : null}
            </>;
            return stat.onPress ? (
              <V2Pressable
                key={stat.testID}
                testID={stat.testID}
                accessibilityRole="button"
                accessibilityLabel={stat.accessibilityLabel}
                onPress={() => latestRef.current.stats.find((x) => x.testID === stat.testID)?.onPress?.()}
                scaleTo={0.96}
                outerStyle={s.statSlot}
                style={[s.stat, plate]}
              >{content}</V2Pressable>
            ) : (
              <View key={stat.testID} testID={stat.testID} accessible accessibilityRole="text"
                accessibilityLabel={stat.accessibilityLabel} style={[s.statSlot, s.stat, plate]}>
                {content}
              </View>
            );
          })}
        </View>
        <View style={s.actions}>
          {bellSlot}
          {avatarPlus?.plus ? <PlusAvatarRing plus size={STORY_RING_SLOT} surface={avatarPlus.surface}>{avatarSlot}</PlusAvatarRing> : avatarSlot}
        </View>
      </View>
    </View>
  );
}, sameHeaderData);

const s = StyleSheet.create({
  root: { paddingTop: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // зачем («Тень» 12.10): между плашками ≥ 10, иначе тени слипаются
  stats: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 10 },
  actions: { flexDirection: 'row', flexShrink: 0, alignItems: 'center', gap: 7 },
  // зачем (Макеты 18.10, memhome/cold.png; эталон home-concepts .p-pill — ширина по содержимому): равные половины давали «Сегодня ещё / нет» в 2 строки
  // и раздутую плашку. Плашка берёт ширину своего текста; на узком экране по-прежнему ужимается (flexShrink), длинное переносится, не режется.
  statSlot: { flexGrow: 0, flexShrink: 1, minWidth: 0 },
  stat: {
    flexGrow: 0,
    flexShrink: 1,
    minWidth: 0,
    minHeight: 46,
    borderRadius: V2.radius.row,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  statIcon: { width: 20, height: 20, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  statCopy: { flexShrink: 1, minWidth: 0 },
  statValue: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  statLabel: { ...V2_TYPE.caption, fontSize: 13, lineHeight: 17 },
  // зачем (эталон .hm-pill.glass): на сцене плашка — белый 16 %, без тени и без кромки
  scenePlate: { backgroundColor: 'rgba(255,255,255,0.16)' },
  // зачем (эталон .hm-pill i.dv): черта между монетами и энергией — 1 × 18, прозрачность 22 %
  divider: { width: 1, height: 18, opacity: 0.22, marginHorizontal: 4 },
});
