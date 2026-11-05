// PeakScreenV2 — экран Пика, вариант B «Рельса» (выбор владельца 04.11): башня слева на всю высоту, справа этаж, пилюля «Гранит · время»,
// мои монеты и место, топ-5 строками, вершинники сверх топ-5, широкая кнопка «Все участники». Тап по этажу — шторка рекорда ступени.
// зачем: чисто презентационный — все данные приходят пропсами из SpireHomeScreen (0 новых чтений); башня — прежний SpireTower (интерактивна и локализована),
// только в узкой левой колонке. Включается флагом PEAK_SCREEN_V2_ENABLED (по умолчанию выключен), старый экран остаётся.
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { Lang } from '../../../constants/i18n';
import { buildPeakModel, peakStepRecord, type PeakRankBy, type PeakStepRecord } from '../../../modules/spire/peak_model';
import { useSpirePalette } from '../useSpirePalette';
import SpireTower from '../SpireTower';
import V2Pressable from '../../v2/V2Pressable';
import type { SpireMemberRow } from '../spire_room_types';
import { spireText } from '../spire_strings';
import { spireGameText } from '../spire_game_strings';
import PeakMyCounter from './PeakMyCounter';
import PeakTopRow from './PeakTopRow';
import PeakTopSkeleton from './PeakTopSkeleton';
import { peakTourDevOff } from './peak_screen_flag';
import PeakStepSheet from './PeakStepSheet';
import PeakFloorStepper from './PeakFloorStepper';
import PeakStepChips from './PeakStepChips';
import PeakTour from './PeakTour'; // зачем (тур утверждён владельцем 04.11): оверлей первого входа поверх этого экрана
import { usePeakTourGate } from './use_peak_tour_gate';
import type { PeakTourRect, PeakTourRects } from './peak_tour_core';
import { PEAK_TAP_TARGET, peakMaxStep } from './peak_text';

type TowerProps = React.ComponentProps<typeof SpireTower>;

type Props = Readonly<{
  lang: Lang;
  members: readonly SpireMemberRow[] | null;
  rankBy: PeakRankBy;
  /** Этаж, выбранный на башне. */
  floor: number;
  onSelectFloor: (floor: number) => void;
  /** «Гранит · 3 д 4 ч» — одной пилюлей. */
  pillText: string;
  towerProps: Omit<TowerProps, 'lang' | 'selected' | 'onSelect' | 'windowHeight'>;
  onOpenAll: () => void;
  records?: Readonly<Record<string, PeakStepRecord>> | null;
  /** Высота колонки башни; нет — 72 % высоты окна в пределах 420–640 dp. */
  railHeight?: number;
  /** Тур первого входа: 'auto' — один раз на аккаунт; 'off' — нет; { page } — dev-съёмка: показать сразу с этой страницы (флаг «показан» не трогаем). */
  tour?: 'auto' | 'off' | Readonly<{ page: number }>;
}>;

export const PEAK_RAIL_WIDTH = 150;
/** Узкая колонка башни: крупный шрифт системы или узкий экран — панели справа нужно место для имён (аудит дизайна 05.11). */
export const PEAK_RAIL_WIDTH_NARROW = 112;
export const PEAK_ROW_COIN_SIZE = 36;

function measureBlock(ref: React.RefObject<View | null>): Promise<PeakTourRect | null> {
  return new Promise((resolve) => {
    const node = ref.current;
    if (!node) { console.warn('[PEAK-TOUR] measure: блока нет'); resolve(null); return; }
    const timer = setTimeout(() => { console.warn('[PEAK-TOUR] measure: таймаут'); resolve(null); }, 400);
    node.measureInWindow((x, y, width, height) => { clearTimeout(timer); resolve(width > 0 && height > 0 ? { x, y, width, height } : null); });
  });
}

function PeakScreenV2({ lang, members, rankBy, floor, onSelectFloor, pillText, towerProps, onOpenAll, records = null, railHeight, tour: tourProp }: Props) {
  const tour = tourProp ?? (peakTourDevOff() ? 'off' : 'auto');
  const p = useSpirePalette();
  const { height, width, fontScale } = useWindowDimensions();
  // зачем (аудит 05.11, экран 375×667 при шрифте ×1,3): в панели справа оставалось ~180 dp, имя сжималось до 2–3 букв — рельса уже, строки крупнее
  const railWidth = fontScale > 1.15 || width < 360 ? PEAK_RAIL_WIDTH_NARROW : PEAK_RAIL_WIDTH;
  const rail = railHeight ?? Math.max(420, Math.min(640, Math.round(height * 0.72)));
  // зачем: участники приходят порядком комнаты (уже по рубильнику); weekCoins в документе может отсутствовать — считаем 0
  const model = useMemo(() => buildPeakModel((members ?? []).map((m) => ({ ...m, weekCoins: m.weekCoins ?? 0 })), rankBy), [members, rankBy]);
  // зачем (тур первого входа): окна затемнения считаются от измеренных блоков; меряем только когда тур показывается (в обычной жизни — ноль работы)
  const headRef = useRef<View>(null);
  const pillRef = useRef<View>(null);
  const railRef = useRef<View>(null);
  const topRef = useRef<View>(null);
  const counterRef = useRef<View>(null);
  const forcedPage = typeof tour === 'object' ? tour.page : null;
  const gate = usePeakTourGate(tour === 'auto' && model.top.length > 0);
  const tourOn = forcedPage !== null || gate.visible;
  const [tourRects, setTourRects] = useState<PeakTourRects | null>(null);
  useEffect(() => {
    if (!tourOn) { setTourRects(null); return undefined; }
    let alive = true;
    const timer = setTimeout(() => {
      void Promise.all([measureBlock(headRef), measureBlock(pillRef), measureBlock(railRef), measureBlock(topRef), measureBlock(counterRef)]).then(([head, pill, rail, top, counter]) => {
        console.log('[PEAK-TOUR]', 'measured', JSON.stringify({ head: head !== null, pill: pill !== null, rail: rail !== null, top: top !== null, counter: counter !== null })); // guard-ok: итог замера
        if (alive) setTourRects({ head, pill, rail, top, counter });
      });
    }, 60); // зачем: один кадр на раскладку, потом замер
    return () => { alive = false; clearTimeout(timer); };
  }, [tourOn]);
  const finishTour = useCallback(() => { if (forcedPage === null) gate.finish(); else setTourRects(null); }, [forcedPage, gate]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetFloor, setSheetFloor] = useState(floor);
  const [sheetStep, setSheetStep] = useState(1);
  const floorWord = spireText(lang, 'floor');
  const openSheet = () => { setSheetFloor(floor); setSheetStep(1); setSheetOpen(true); };
  const moveFloor = (next: number) => { const f = Math.max(1, Math.min(15, next)); setSheetFloor(f); setSheetStep((st) => Math.min(st, peakMaxStep(f))); };
  const record = peakStepRecord(records, sheetFloor, sheetStep);
  const stepper = (
    <View style={s.sheetControls}>
      <PeakFloorStepper label={`${floorWord} ${sheetFloor}`} canDown={sheetFloor > 1} canUp={sheetFloor < 15} onDown={() => moveFloor(sheetFloor - 1)} onUp={() => moveFloor(sheetFloor + 1)} downLabel={`${floorWord} ${sheetFloor - 1}`} upLabel={`${floorWord} ${sheetFloor + 1}`} />
      <PeakStepChips max={peakMaxStep(sheetFloor)} selected={sheetStep} onSelect={setSheetStep} />
    </View>
  );
  return (
    <View style={s.root} testID="peak-screen-v2">
      <View ref={railRef} collapsable={false} style={[s.rail, { width: railWidth }]}>
        <SpireTower {...towerProps} lang={lang} selected={floor} onSelect={onSelectFloor} windowHeight={rail} />
      </View>
      <View style={s.panel}>
        <View ref={headRef} collapsable={false} style={s.head}>
        <V2Pressable accessibilityRole="button" onPress={openSheet} style={s.floorBtn} testID="peak-floor-title">
          <Text style={[s.floor, { color: p.text }]}>{`${floorWord} ${floor}`}</Text>
        </V2Pressable>
        <View ref={pillRef} collapsable={false} style={[s.pill, { backgroundColor: p.cardRaised }]}><Text numberOfLines={2} style={[s.pillText, { color: p.text }]}>{pillText}</Text></View>
        </View>
        <View ref={counterRef} collapsable={false} style={s.counter}><PeakMyCounter lang={lang} me={model.me} rankBy={rankBy} loading={members === null} /></View>
        <View ref={topRef} collapsable={false} testID="peak-top">{members === null ? <PeakTopSkeleton /> : model.top.map((row) => <PeakTopRow key={row.uid} lang={lang} row={row} coinSize={PEAK_ROW_COIN_SIZE} />)}</View>
        {model.summiters.length > 0 ? (
          <View testID="peak-summiters">
            <Text style={[s.group, { color: p.textSecondary }]}>{spireGameText(lang, 'peakReachedTop')}</Text>
            {model.summiters.map((row) => <PeakTopRow key={row.uid} lang={lang} row={row} coinSize={PEAK_ROW_COIN_SIZE} />)}
          </View>
        ) : null}
        <V2Pressable accessibilityRole="button" onPress={onOpenAll} style={[s.all, { backgroundColor: p.cta }]} testID="peak-all-button">
          <Text style={[s.allText, { color: p.ctaText }]}>{spireGameText(lang, 'peakAllParticipants')}</Text>
        </V2Pressable>
      </View>
      {tourOn && tourRects ? (
        <PeakTour lang={lang} rankBy={rankBy} rects={tourRects} topCount={model.top.length} upCount={model.top.filter((r) => r.zone === 'up').length} initialPage={forcedPage ?? 0} onDone={finishTour} />
      ) : null}
      <PeakStepSheet lang={lang} visible={sheetOpen} title={`${floorWord} ${sheetFloor} · ${sheetStep}`} record={record} onClose={() => setSheetOpen(false)} stepper={stepper} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rail: { marginLeft: -8 },
  panel: { flex: 1, minWidth: 0 },
  head: { alignSelf: 'flex-start' },
  floorBtn: { minHeight: PEAK_TAP_TARGET, justifyContent: 'center', alignSelf: 'flex-start' },
  floor: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.4 },
  // зачем (кадр peak-b 23:35): «Нефрит · до конца неде…» обрезалось в одну строку — пилюля растёт до двух строк (панель справа узкая), паддинг по вертикали
  pill: { alignSelf: 'flex-start', maxWidth: '100%', minHeight: 36, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 6, justifyContent: 'center', marginTop: 2 },
  pillText: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  counter: { marginTop: 18, marginBottom: 14 },
  group: { fontSize: 15, lineHeight: 20, fontWeight: '700', marginTop: 14, marginBottom: 4, marginLeft: 12 },
  all: { minHeight: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  allText: { fontSize: 17, fontWeight: '800' },
  sheetControls: { gap: 14, alignItems: 'center' },
});

export default memo(PeakScreenV2);
