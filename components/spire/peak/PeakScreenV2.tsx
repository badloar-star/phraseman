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
import V2Pressable from '../../v2/V2Pressable';
import type { SpireMemberRow } from '../spire_room_types';
import { spireText } from '../spire_strings';
import { spireGameText } from '../spire_game_strings';
import { spireTierName } from '../../../modules/spire/tier_names';
import { spireTimeLeft } from '../spire_tower_model';
import { spireWeekStartMs } from '../../../modules/spire/residents';
import PeakMyCounter from './PeakMyCounter';
import PeakTopRow from './PeakTopRow';
import SpirePlayerCard from '../scene/SpirePlayerCard';
import type { PlayerInfo } from '../../PlayerProfileModal';
import type { PeakRow } from '../../../modules/spire/peak_model';
import PeakTopSkeleton from './PeakTopSkeleton';
import { peakTourDevOff } from './peak_screen_flag';
import PeakStepSheet from './PeakStepSheet';
import PeakFloorStepper from './PeakFloorStepper';
import PeakStepChips from './PeakStepChips';
import PeakTourFull from './PeakTourFull'; // зачем (владелец 05.11, макет peak_tour_full_approved): полноэкранный тур первого входа в Пик, 3 страницы со свайпом, вместо прежнего оверлея-подсветки
import { usePeakTourGate } from './use_peak_tour_gate';
import { useOverlayBypassLog, useOverlayVisible } from '../../OverlayArbiter';
import { useSpireTowerTheme } from '../use_spire_tower_theme';
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
  const towerTheme = useSpireTowerTheme(p);
  // зачем (владелец 05.11 ~19:12: «наложения зелёная полоска на иконку — убери… и с башни убирай иконки юзеров»): на башне НЕТ монет участников и метки «я»;
  // слой монет и данные для него удалены. Журнал [PEAK-LINE-MARKER] — что рисуется на башне и по какому условию (одна строка на смену этажа).
  useEffect(() => {
    console.log('[PEAK-LINE-MARKER]', JSON.stringify({ tower: 'clean', participantCoins: 'removed', ownMarker: 'hidden (myCoinRank=null: метка пустая)', myFloor: towerProps.myFloor, upLine: 'peak-up-line, left 0 width 3 в панели списка, ничего не перекрывает', reason: 'owner_05_11_no_user_icons_on_tower' })); // guard-ok: трассировка решения по башне
  }, [towerProps.myFloor]);
  // зачем: участники приходят порядком комнаты (уже по рубильнику); weekCoins в документе может отсутствовать — считаем 0
  // зачем (владелец 05.11 ~19:15: «монета абсолютно во всех местах обязана соответствовать рангу строго»; аудит RANK_COIN_AUDIT): ранг в документе комнаты пишется только при входе —
  // пустой кэш давал бронзу, после повышения монета устаревала. У своей строки берём ТЕКУЩИЙ ранг (useMyCoinRank из экрана Пика), ранга ещё нет — значение комнаты. 0 новых чтений.
  const myRank = towerProps.myCoinRank;
  // зачем (владелец 06.11, TestFlight 150: «юзеры в топе должны быть кликабельны ВСЕ — по нажатию визитка»): та же визитка, что в «Все участники»
  // (SpirePlayerCard → PlayerProfileModal). Открывается сразу по тапу из данных строки, без сети; V2Pressable даёт отклик нажатия.
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const openRow = useCallback((row: PeakRow) => {
    console.log('[PEAK-PROFILE]', JSON.stringify({ event: 'open', isMe: row.isMe, place: row.place, coinRank: row.coinRank })); // guard-ok: тап по строке ТОП, без имени и uid
    setPlayer({ uid: row.uid, name: row.name, isMe: row.isMe, points: row.weekCoins, coinRank: row.coinRank, isPremium: row.isPremium, plusTier: row.plusTier });
  }, []);
  const closePlayer = useCallback(() => setPlayer(null), []);
  const myName = useMemo(() => (members ?? []).find((m) => m.isMe)?.name ?? '', [members]);
  const model = useMemo(() => buildPeakModel((members ?? []).map((m) => ({ ...m, weekCoins: m.weekCoins ?? 0, ...(m.isMe && myRank !== null ? { coinRank: myRank } : null) })), rankBy), [members, rankBy, myRank]);
  // зачем (тур первого входа): окна затемнения считаются от измеренных блоков; меряем только когда тур показывается (в обычной жизни — ноль работы)
  const headRef = useRef<View>(null);
  const pillRef = useRef<View>(null);
  const railRef = useRef<View>(null);
  const topRef = useRef<View>(null);
  const counterRef = useRef<View>(null);
  const forcedPage = typeof tour === 'object' ? tour.page : null;
  const gate = usePeakTourGate(tour === 'auto' && model.top.length > 0);
  // зачем (владелец 05.11: приветствие и тур Пика на одном кадре — «такое нельзя допускать»): тур ждёт слот арбитра окон, пока держит приветствие/открытие раздела.
  // Замер блоков и показ начинаются только после выдачи слота. Принудительная страница (dev-съёмка) идёт мимо арбитра.
  const tourSlot = useOverlayVisible('peakTour', forcedPage === null && gate.visible);
  const tourOn = forcedPage !== null || tourSlot;
  // зачем: полноэкранный тур не подсвечивает блоки экрана — замер не нужен, показ сразу после выдачи слота арбитром
  useOverlayBypassLog('peakTour', forcedPage !== null && tourOn); // зачем: принудительный показ (dev-съёмка) мимо арбитра виден в журнале как bypass
  const finishTour = useCallback(() => { if (forcedPage === null) gate.finish(); }, [forcedPage, gate]);
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
        {/* зачем: variant="scene" — башня без плиты-панели и без подписей этажей; монет «+N» слева нет (rivalsByFloor не передаём), иконок участников и метки «я» на башне нет (владелец 05.11 ~19:12) */}
        <View style={[s.towerBox, { width: towerFit.width, height: towerFit.height, left: towerFit.offsetLeft, bottom: -towerFit.sinkDown }]} testID="peak-tower-box">
          <SpireTower {...towerProps} variant="scene" hideFloorWords rivalsByFloor={undefined} myCoinRank={null} onPressMe={undefined} themeColors={towerTheme} lang={lang} selected={floor} onSelect={onSelectFloor} windowHeight={towerFit.height} />
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
          {members === null ? <PeakTopSkeleton /> : model.top.map((row) => <PeakTopRow key={row.uid} lang={lang} row={row} coinSize={PEAK_ROW_COIN_SIZE} onPress={openRow} />)}
          {/* зачем (макет): шестая строка — «я» с кольцом на монете сразу под топ-5; если я уже в топ-5, кольцо у моей строки */}
          {members !== null && meRow && !meInTop ? <PeakTopRow key={`me-${meRow.uid}`} lang={lang} row={meRow} coinSize={PEAK_ROW_COIN_SIZE} onPress={openRow} /> : null}
        </View>
        {model.summiters.length > 0 ? (
          <View testID="peak-summiters">
            <Text style={[s.group, { color: p.textSecondary }]}>{spireGameText(lang, 'peakReachedTop')}</Text>
            {model.summiters.map((row) => <PeakTopRow key={row.uid} lang={lang} row={row} coinSize={PEAK_ROW_COIN_SIZE} onPress={openRow} />)}
          </View>
        ) : null}
        <V2Pressable accessibilityRole="button" onPress={onOpenAll} style={[s.all, { backgroundColor: p.control }]} testID="peak-all-button">
          <Ionicons name="people-outline" size={24} color={p.text} />
          <Text style={[s.allText, { color: p.text }]}>{spireGameText(lang, 'peakAllParticipants')}</Text>
          <Ionicons name="chevron-forward" size={22} color={p.text} />
        </V2Pressable>
      </View>
      {tourOn ? <PeakTourFull lang={lang} initialPage={forcedPage ?? 0} onDone={finishTour} /> : null}
      <SpirePlayerCard player={player} myName={myName} onClose={closePlayer} />
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
