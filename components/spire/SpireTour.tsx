// ═══════════════════════════════════════════════════════════════════════════
// SpireTour.tsx — тур первого входа в Шпиль, 3 экрана (макет §1).
//
// зачем: «Три экрана, „Пропустить“ на каждом. Показывается один раз.» Картинки —
// иллюстрации правил, не данные: башня (тот же SVG, что на главном), кольцо с
// тремя сердцами, лестница камней из tier_names. Имён людей и мест из макета тут
// нет — их неоткуда честно взять. «Показан» хранится локально (spire_local_store).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle } from 'react-native-svg';
import { triLang, type Lang } from '../../constants/i18n';
import { V2 } from '../../constants/v2Style';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { COIN_RANK_TABLE } from '../../app/coin_rank_table_v1';
import { spireTierName } from '../../modules/spire/tier_names';
import V2Pressable from '../v2/V2Pressable';
import SpireTowerSvg from './SpireTowerSvg';
import { useSpirePalette } from './useSpirePalette';
import { useSpireShadow } from './useSpireShadow';
import { spireGameText } from './spire_game_strings';
import { useSpireScene } from './useSpireScene';
import { spireStepsShort } from './spire_plurals';
import { SPIRE_TW } from './spire_tower_model';

const IMG_HEIGHT = 340;
const TOWER_WIDTH = 240;
// зачем (закон владельца 14.10, «пик башни не обрезается, свет тоже»): раньше башню сдвигали вверх на 32 dp и резали overflow:hidden — навершие и ореол уходили за край.
// Теперь сверху настоящий запас (TOP_PAD), а обрезается только низ: SVG сам берёт видимую высоту (cropHeight в единицах SVG).
const TOUR_CROP_UNITS = IMG_HEIGHT / (TOWER_WIDTH / SPIRE_TW);
const noop = () => undefined;

function TourTower({ lang }: Readonly<{ lang: Lang }>) {
  const scene = useSpireScene(); // зачем (владелец 13.10, светлая тема: «окно башни — по ТЕМЕ, а не по башне»): фон сцены тура — из темы, как у экрана
  return (
    <View style={s.towerClip} pointerEvents="none">
      <SpireTowerSvg lang={lang} myFloor={null} selected={0} onSelect={noop} width={TOWER_WIDTH} scene={scene} cropHeight={TOUR_CROP_UNITS} />
    </View>
  );
}

function TourRing() {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const r = 59;
  const c = 2 * Math.PI * r;
  return (
    <View style={s.center}>
      <View>
        <Svg width={132} height={132} viewBox="0 0 132 132">
          <Circle cx={66} cy={66} r={r} fill="none" stroke={p.control} strokeWidth={7} />
          <Circle cx={66} cy={66} r={r} fill="none" stroke={p.text} strokeWidth={7} strokeLinecap="round" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * 0.25} transform="rotate(-90 66 66)" />
        </Svg>
        {/* зачем (владелец 13.10, spire-002): в кольце тура — таймер ступени «1:42», как в макете spire.html (раньше «10» — число заданий) */}
        <View style={s.ringCenter}><Text style={[s.ringText, { color: p.text }]}>1:42</Text></View>
      </View>
      <View style={[s.heartPill, { backgroundColor: p.control }, sh.nested]}>
        <Ionicons name="heart" size={20} color={p.text} />
        <Ionicons name="heart" size={20} color={p.text} />
        <Ionicons name="heart" size={20} color={p.text} />
      </View>
    </View>
  );
}

// зачем (владелец 13.10, spire-003): арт «повышение» — три игрока с монетами ранга, стрелка вверх и число ступеней, как в макете spire.html (tourTop:
// ранги 12/9/7, 47/39/33 ступеней). Это иллюстрация правила «верхние 15% переходят выше», а не данные комнаты; имён людей нет (сторож spire_tab_gate) — нейтральное «Игрок N».
const TOUR_PLAYERS: ReadonlyArray<Readonly<{ rank: number; steps: number }>> = [
  { rank: 12, steps: 47 }, { rank: 9, steps: 39 }, { rank: 7, steps: 33 },
];
const tourPlayerLabel = (lang: Lang, n: number): string => triLang(lang, {
  ru: `Игрок\u00A0${n}`, uk: `Гравець\u00A0${n}`, en: `Player\u00A0${n}`, es: `Jugador\u00A0${n}`, 'pt-BR': `Jogador\u00A0${n}`,
  vi: `Người chơi\u00A0${n}`, id: `Pemain\u00A0${n}`, tr: `Oyuncu\u00A0${n}`, pl: `Gracz\u00A0${n}`,
});

function TourTop({ lang }: Readonly<{ lang: Lang }>) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  return (
    <View style={s.stones}>
      {TOUR_PLAYERS.map((player, i) => {
        const coin = COIN_RANK_TABLE.find((row) => row.rank === player.rank);
        return (
          <View key={`top-${player.rank}`} style={[s.player, { backgroundColor: p.cardRaised }, sh.nested]}>
            <Text style={[s.place, { color: p.textSecondary }]}>{i + 1}</Text>
            {coin ? <Image source={coin.source} contentFit="contain" style={s.coin} accessible={false} /> : null}
            <Text style={[s.playerName, { color: p.text }]}>{tourPlayerLabel(lang, i + 1)}</Text>
            <Ionicons name="arrow-up" size={18} color={p.correct} />
            <Text style={[s.steps, { color: p.text }]}>{player.steps}<Text style={[s.stepsUnit, { color: p.textSecondary }]}> {spireStepsShort(lang, player.steps)}</Text></Text>
          </View>
        );
      })}
    </View>
  );
}

type Props = Readonly<{ lang: Lang; visible: boolean; onDone: () => void }>;

function SpireTour({ lang, visible, onDone }: Props) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const insets = useStableSafeAreaInsets();
  const [page, setPage] = useState(0);
  const last = page === 2;
  const next = useCallback(() => {
    if (last) { onDone(); return; }
    setPage((n) => Math.min(2, n + 1));
  }, [last, onDone]);
  const title = spireGameText(lang, page === 0 ? 'tour1Title' : page === 1 ? 'tour2Title' : 'tour3Title');
  const text = page === 2
    ? spireGameText(lang, 'tour3Text', { a: spireTierName(0, lang), b: spireTierName(1, lang), c: spireTierName(2, lang), z: spireTierName(11, lang) })
    : spireGameText(lang, page === 0 ? 'tour1Text' : 'tour2Text');
  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={onDone} statusBarTranslucent>
      <View style={[s.root, { backgroundColor: p.bg, paddingTop: insets.top + 6, paddingBottom: insets.bottom + 20 }]} testID="spire-tour">
        <View style={s.top}>
          <V2Pressable onPress={onDone} accessibilityRole="button" style={s.skip} testID="spire-tour-skip">
            <Text style={[s.skipText, { color: p.textSecondary }]}>{spireGameText(lang, 'skip')}</Text>
          </V2Pressable>
        </View>
        <View style={s.img}>
          {page === 0 ? <TourTower lang={lang} /> : page === 1 ? <TourRing /> : <TourTop lang={lang} />}
        </View>
        <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{title}</Text>
        <Text style={[s.text, { color: p.textSecondary }]}>{text}</Text>
        <View style={s.dots} accessible accessibilityLabel={`${page + 1} / 3`}>
          {[0, 1, 2].map((i) => <View key={`dot-${i}`} style={[s.dot, i === page && s.dotOn, { backgroundColor: i === page ? p.text : p.control }]} />)}
        </View>
        <View style={s.spacer} />
        <V2Pressable onPress={next} accessibilityRole="button" style={[s.cta, { backgroundColor: p.cta }, sh.action(p.cta)]} testID="spire-tour-next">
          <Text style={[s.ctaText, { color: p.ctaText }]}>{spireGameText(lang, last ? 'start' : 'next')}</Text>
          {/* зачем (Сверка spire-013, kit.css `.cta .ar`): стрелка у правого края кнопки */}
          <View pointerEvents="none" style={s.arrow}><Ionicons name="arrow-forward" size={20} color={p.ctaText} /></View>
        </V2Pressable>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: V2.screenPad },
  top: { flexDirection: 'row', justifyContent: 'flex-end' },
  skip: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  skipText: { fontSize: 16, fontWeight: '600' },
  img: { height: IMG_HEIGHT, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  towerClip: { height: IMG_HEIGHT, width: TOWER_WIDTH, alignSelf: 'center' },
  center: { alignItems: 'center', gap: 26 },
  ringCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  ringText: { fontSize: 30, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  heartPill: { height: 40, borderRadius: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 9 },
  stones: { width: '100%', gap: 12, paddingHorizontal: 34 },
  player: { minHeight: 62, borderRadius: 14, paddingVertical: 8, paddingLeft: 12, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  place: { width: 26, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  coin: { width: 40, height: 40 },
  playerName: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: '600' }, // зачем: шкала Шпиля 16/13 (spire_design_layer_contract); в макете 17 px, ближайшая ступень шкалы — 16
  steps: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  stepsUnit: { fontSize: 13, fontWeight: '600' },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.4, marginTop: 34 },
  text: { fontSize: 16, lineHeight: 23, marginTop: 12 },
  // зачем (Сверка spire-001, spire.html `.dots`): активная точка — вытянутая пилюля 22×7, прочие 7×7, зазор 7, отступ 26
  dots: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 26 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotOn: { width: 22 },
  spacer: { flex: 1 },
  cta: { minHeight: V2.cta.height, borderRadius: V2.cta.radius, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { fontSize: 16, fontWeight: '700' },
  arrow: { position: 'absolute', right: 22 },
});

export default memo(SpireTour);
