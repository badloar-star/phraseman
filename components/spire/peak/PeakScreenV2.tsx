// PeakScreenV2 — экран Пика, вариант B «Рельса» (выбор владельца 04.11): башня слева на всю высоту, справа этаж, пилюля «Гранит · время»,
// мои монеты и место, топ-5 строками, вершинники сверх топ-5, широкая кнопка «Все участники». Тап по этажу — шторка рекорда ступени.
// зачем: чисто презентационный — все данные приходят пропсами из SpireHomeScreen (0 новых чтений); башня — прежний SpireTower (интерактивна и локализована),
// только в узкой левой колонке. Включается флагом PEAK_SCREEN_V2_ENABLED (по умолчанию выключен), старый экран остаётся.
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Lang } from '../../../constants/i18n';
import { buildPeakModel, peakStepRecord, type PeakRankBy, type PeakStepRecord } from '../../../modules/spire/peak_model';
import { useSpirePalette } from '../useSpirePalette';
import SpireTower from '../SpireTower';
import { spireSkinForTier } from '../../../modules/spire/tower_skins';
import { SPIRE_FLOOR_COUNT } from '../spire_tower_model';
import { spireTowerHeadroom } from '../spire_tower_bounds';
import { peakTowerFit } from './peak_tower_fit';
import { pickPeakTowerPlayers } from './peak_tower_players';
import PeakTowerPlayers from './PeakTowerPlayers';
import V2Pressable from '../../v2/V2Pressable';
import type { SpireMemberRow } from '../spire_room_types';
import { spireText } from '../spire_strings';
import { spireGameText } from '../spire_game_strings';
import { spireTierName } from '../../../modules/spire/tier_names';
import { spireTimeLeft } from '../spire_tower_model';
import { spireWeekStartMs } from '../../../modules/spire/residents';
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
/** Высота строки топ-5 (PeakTopRow.minHeight) — по ней считается зелёная линия зоны повышения. */
export const PEAK_ROW_HEIGHT = 56;

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
  // зачем (владелец 05.11: «Макеты как были одобрены», «цифры этажей слева — убрать, я сказал»; «1 в 1» с variant_B_*): башня крупная, ~31 % ширины экрана, чистая — без колонки цифр, подписей ВЕРШИНА/СТРАЖ/НАД ОБЛАКАМИ и монет «+N» соперников
  const railWidth = Math.max(PEAK_RAIL_WIDTH_NARROW, Math.round(width * 0.31));
  const rail = railHeight ?? Math.max(420, Math.min(640, Math.round(height * 0.72)));
  // зачем (владелец 05.11 07:4x: «башню сделать больше по возможности и опустить вниз»): масштаб — от высоты колонки (вся башня с короной), основание у низа; тело не шире колонки
  const towerSkin = spireSkinForTier(towerProps.tier ?? null);
  const towerFit = useMemo(
    () => peakTowerFit({ railWidth, railHeight: rail, headroomUnits: spireTowerHeadroom(towerSkin, towerProps.myFloor === SPIRE_FLOOR_COUNT) }),
    [railWidth, rail, towerSkin, towerProps.myFloor],
  );
  // зачем (Макеты 05.11, кадр 07:43: «башня тёмно-серая на светлом экране — башня и экран разных цветов»; макет variant_B: камень башни — оттенок темы): наряд лиги в цветах темы экрана
  const towerTheme = useMemo(() => {
    const hex = (c: unknown): c is string => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
    return hex(p.accentGraphic) && hex(p.bgTop) && hex(p.bg) ? { accent: p.accentGraphic, sceneTop: p.bgTop, sceneBottom: p.bg } : undefined;
  }, [p.accentGraphic, p.bgTop, p.bg]);
  // зачем (владелец 05.11 07:38: «на башне все еще надо показывать иконки юзеров кто где»): иконки из уже загруженной комнаты (0 новых чтений)
  const towerPlayers = useMemo(() => pickPeakTowerPlayers(towerProps.rivalsByFloor, towerProps.myFloor), [towerProps.rivalsByFloor, towerProps.myFloor]);
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
    // зачем (Эмулятор 05.11, кадры tour-p1..p3: «светлые блоки» вместо окон подсветки — замер на 60 мс шёл ДО раскладки башни и прокрутки, окна ставились в верх экрана):
    // меряем после раскладки (250 мс), затем перемеряем (900 мс) и обновляем окна, только если блоки сдвинулись.
    let last = '';
    const measure = (phase: string) => {
      void Promise.all([measureBlock(headRef), measureBlock(pillRef), measureBlock(railRef), measureBlock(topRef), measureBlock(counterRef)]).then(([head, pill, rail, top, counter]) => {
        const next = { head, pill, rail, top, counter };
        const key = JSON.stringify(next);
        console.log('[PEAK-TOUR]', 'measured', JSON.stringify({ phase, changed: key !== last, head, top, counter })); // guard-ok: итог замера (диагностика окон подсветки)
        if (alive && key !== last) { last = key; setTourRects(next); }
      });
    };
    const t1 = setTimeout(() => measure('layout'), 250);
    const t2 = setTimeout(() => measure('settled'), 900);
    return () => { alive = false; clearTimeout(t1); clearTimeout(t2); };
  }, [tourOn]);
  const finishTour = useCallback(() => { if (forcedPage === null) gate.finish(); else setTourRects(null); }, [forcedPage, gate]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetFloor, setSheetFloor] = useState(floor);
  const [sheetStep, setSheetStep] = useState(1);
  const floorWord = spireText(lang, 'floor');
  // зачем (макет: «Гранит • ⏱ 4 д 5 ч» одной короткой пилюлей): лига и срок до конца недели — те же источники, что у подзаголовка экрана, но коротко и без слов «до конца недели»
  const leagueName = towerProps.tier !== null && towerProps.tier !== undefined ? spireTierName(towerProps.tier, lang) : '—';
  const left = spireTimeLeft(Date.now(), spireWeekStartMs(Date.now()));
  const nb = ' ';
  const timeShort = `${left.days}${nb}${spireText(lang, 'dayUnit')}${nb}${left.hours}${nb}${spireText(lang, 'hourUnit')}`;
  const openSheet = () => { setSheetFloor(floor); setSheetStep(1); setSheetOpen(true); };
  const moveFloor = (next: number) => { const f = Math.max(1, Math.min(15, next)); setSheetFloor(f); setSheetStep((st) => Math.min(st, peakMaxStep(f))); };
  const record = peakStepRecord(records, sheetFloor, sheetStep);
  const upRows = model.top.filter((r) => r.zone === 'up').length;
  const meRow = model.all.find((r) => r.isMe) ?? null;
  const meInTop = meRow ? model.top.some((r) => r.uid === meRow.uid) : false;
  const stepper = (
    <View style={s.sheetControls}>
      <PeakFloorStepper label={`${floorWord} ${sheetFloor}`} canDown={sheetFloor > 1} canUp={sheetFloor < 15} onDown={() => moveFloor(sheetFloor - 1)} onUp={() => moveFloor(sheetFloor + 1)} downLabel={`${floorWord} ${sheetFloor - 1}`} upLabel={`${floorWord} ${sheetFloor + 1}`} />
      <PeakStepChips max={peakMaxStep(sheetFloor)} selected={sheetStep} onSelect={setSheetStep} />
    </View>
  );
  return (
    <View style={s.root} testID="peak-screen-v2">
      <View ref={railRef} collapsable={false} style={[s.rail, { width: railWidth, height: rail }]} testID="peak-tower-rail">
        {/* зачем: variant="scene" — башня без плиты-панели и без подписей этажей; монет «+N» слева нет (rivalsByFloor не передаём), вместо них — компактные иконки на теле башни (PeakTowerPlayers), «я» — метка SpireTower */}
        <View style={[s.towerBox, { width: towerFit.width, height: towerFit.height, left: towerFit.offsetLeft, bottom: -towerFit.sinkDown }]} testID="peak-tower-box">
          <SpireTower {...towerProps} variant="scene" hideFloorWords rivalsByFloor={undefined} themeColors={towerTheme} lang={lang} selected={floor} onSelect={onSelectFloor} windowHeight={towerFit.height} />
          <PeakTowerPlayers players={towerPlayers} scale={towerFit.scale} />
        </View>
      </View>
      <View style={s.panel}>
        <View ref={headRef} collapsable={false} style={s.head}>
        <V2Pressable accessibilityRole="button" onPress={openSheet} style={s.floorBtn} testID="peak-floor-title">
          <Text style={[s.floor, { color: p.text }]}>{`${floorWord} ${floor}`}</Text>
        </V2Pressable>
        <View ref={pillRef} collapsable={false} style={[s.pill, { backgroundColor: p.cardRaised }]} accessible accessibilityLabel={pillText}>
          <Text numberOfLines={1} style={[s.pillText, { color: p.text }]}>{leagueName}</Text>
          <Text style={[s.pillDot, { color: p.textSecondary }]}>•</Text>
          <Ionicons name="time-outline" size={20} color={p.text} />
          <Text numberOfLines={1} style={[s.pillText, { color: p.text }]}>{timeShort}</Text>
        </View>
        </View>
        <View ref={counterRef} collapsable={false} style={s.counter}><PeakMyCounter lang={lang} me={model.me} rankBy={rankBy} loading={members === null} /></View>
        <View ref={topRef} collapsable={false} testID="peak-top" style={s.topWrap}>
          {/* зачем (макет): слева от зоны повышения — зелёная вертикальная линия; номеров и стрелок в строках нет */}
          {members !== null && upRows > 0 ? <View pointerEvents="none" style={[s.upLine, { backgroundColor: p.correct, height: upRows * PEAK_ROW_HEIGHT - 12 }]} testID="peak-up-line" /> : null}
          {members === null ? <PeakTopSkeleton /> : model.top.map((row) => <PeakTopRow key={row.uid} lang={lang} row={row} coinSize={PEAK_ROW_COIN_SIZE} />)}
          {/* зачем (макет): шестая строка — «я» с кольцом на монете сразу под топ-5; если я уже в топ-5, кольцо у моей строки */}
          {members !== null && meRow && !meInTop ? <PeakTopRow key={`me-${meRow.uid}`} lang={lang} row={meRow} coinSize={PEAK_ROW_COIN_SIZE} /> : null}
        </View>
        {model.summiters.length > 0 ? (
          <View testID="peak-summiters">
            <Text style={[s.group, { color: p.textSecondary }]}>{spireGameText(lang, 'peakReachedTop')}</Text>
            {model.summiters.map((row) => <PeakTopRow key={row.uid} lang={lang} row={row} coinSize={PEAK_ROW_COIN_SIZE} />)}
          </View>
        ) : null}
        <V2Pressable accessibilityRole="button" onPress={onOpenAll} style={[s.all, { backgroundColor: p.control }]} testID="peak-all-button">
          <Ionicons name="people-outline" size={24} color={p.text} />
          <Text style={[s.allText, { color: p.text }]}>{spireGameText(lang, 'peakAllParticipants')}</Text>
          <Ionicons name="chevron-forward" size={22} color={p.text} />
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
  towerBox: { position: 'absolute' },
  panel: { flex: 1, minWidth: 0 },
  head: { alignSelf: 'flex-start' },
  floorBtn: { minHeight: PEAK_TAP_TARGET, justifyContent: 'center', alignSelf: 'flex-start' },
  floor: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.4 },
  // зачем (кадр peak-b 23:35): «Нефрит · до конца неде…» обрезалось в одну строку — пилюля растёт до двух строк (панель справа узкая), паддинг по вертикали
  pill: { alignSelf: 'flex-start', maxWidth: '100%', minHeight: 40, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  pillText: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  pillDot: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  topWrap: { position: 'relative' },
  upLine: { position: 'absolute', left: 0, top: 6, width: 3, borderRadius: 2 },
  counter: { marginTop: 18, marginBottom: 14 },
  group: { fontSize: 15, lineHeight: 20, fontWeight: '700', marginTop: 14, marginBottom: 4, marginLeft: 12 },
  all: { minHeight: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12, marginTop: 18, paddingHorizontal: 18 },
  allText: { fontSize: 17, fontWeight: '800' },
  sheetControls: { gap: 14, alignItems: 'center' },
});

export default memo(PeakScreenV2);
