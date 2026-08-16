// ════════════════════════════════════════════════════════════════════════════
//  LeagueResultHybrid — «золотой путь»: гибридная (Световод+Чекан) версия тела
//  LeagueResultModal. Рендерится ВМЕСТО классического тела при
//  motionVariant==='hybrid' (см. app/LeagueResultModal.tsx). Тот же result,
//  та же группа/подиум/награды — меняется только подача и хореография.
//
//  Хореография — точная копия сцен L1/L2/L3 из .motion-mockups/phraseman-hybrid.html:
//  стеклянная колонна пути со ступенями, светящийся порог топ-7 / черта вылета,
//  камеи-соперники, мой медальон едет по пути со световым хвостом и ПРОБИВАЕТ
//  порог ударом Чекана при повышении (L1); спокойный якорь-щит при «остался»
//  (L2); мягкий спуск на бронзовую платформу при вылете (L3).
// ════════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, Text, View, type TextProps } from 'react-native';
import { Image } from 'expo-image';
import Reanimated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from '../SafeLinearGradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import {
  LeagueResult, LEAGUES, CLUBS, GroupMember,
  getLeagueResultZoneSize, orderGroupForResultDisplay,
} from '../../app/league_engine';
import { clubNamePlanned } from '../../app/league_engine';
import AvatarView from '../AvatarView';
import PremiumAvatarHalo from '../PremiumAvatarHalo';
import { getBestAvatarForLevel } from '../../constants/avatars';
import { PREMIUM_AVATAR_AURA_ID, getEffectiveAvatarAuraId } from '../../constants/avatar_auras';
import { getLevelFromXP } from '../../constants/theme';
import { readableOn, isLightSurface } from '../../constants/color_contrast';
import { triLang, type Lang, type PlannedInterfaceLang } from '../../constants/i18n';
import { hapticSuccess, hapticWarning, hapticSoftImpact, hapticLightImpact } from '../../hooks/use-haptics';
import { soundDirector } from '../../modules/audio/sound_director';
import { LUM, CHK } from '../../constants/motionHybrid';
import { noAndroidOutline } from '../../constants/androidGlow';

const { width: W } = Dimensions.get('window');
const CARD_W = Math.min(W - 24, 420);

const AnimatedText = Reanimated.createAnimatedComponent(Text);

// ─── Медальон-жетон соперника на колонне пути ──────────────────────────────
const NODE_H = 38;

interface PathNode {
  key: string;
  name: string;
  points: number;
  /** Позиция по высоте колонны, 0..1 (0 = верх/топ-1). */
  t: number;
}

/** Строит до 4 репрезентативных камей-соперников вокруг моей позиции на пути. */
function buildPathNodes(group: GroupMember[], myIndex: number): PathNode[] {
  if (group.length === 0) return [];
  const total = group.length;
  const pick = new Set<number>();
  pick.add(0);
  pick.add(Math.max(0, Math.min(total - 1, Math.round(total * 0.22))));
  pick.add(Math.max(0, Math.min(total - 1, Math.round(total * 0.55))));
  pick.add(Math.max(0, Math.min(total - 1, total - 2)));
  pick.delete(myIndex);
  const indices = Array.from(pick).filter(i => i >= 0 && i < total).sort((a, b) => a - b).slice(0, 4);
  return indices.map((i) => {
    const m = group[i];
    return {
      key: m.uid ?? m.botId ?? `${m.name}-${i}`,
      name: (m.name ?? '—').slice(0, 10),
      points: m.points ?? 0,
      t: total <= 1 ? 0.5 : i / (total - 1),
    };
  });
}

interface Props {
  visible: boolean;
  result: LeagueResult;
  onClose: () => void;
  reduceMotion: boolean;
  previewMode?: boolean;
}

/**
 * Тело модалки итогов недели, гибридная версия. Родитель (LeagueResultModal)
 * несёт Modal/scrim/крестик/handleClose — здесь только внутренняя сцена.
 */
function LeagueResultHybrid({ visible, result, reduceMotion }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();

  const prevLeague = LEAGUES[result.prevLeagueId] ?? LEAGUES[0];
  const newLeague  = LEAGUES[result.newLeagueId]  ?? LEAGUES[0];
  const club       = CLUBS[result.newLeagueId]    ?? CLUBS[0];

  const isPromo = result.promoted;
  const isDemo  = result.demoted;
  const isStay  = !isPromo && !isDemo;

  const onLight = isLightSurface(t.bgCard);
  const ink = useCallback(
    (color: string, minRatio = 6) => (onLight ? readableOn(color, t.bgPrimary, minRatio) : color),
    [onLight, t.bgPrimary],
  );

  // Цвет исхода: золото — повышение, тёплая бронза — вылет, акцент — остался.
  const glowColor = isPromo ? '#FFD24A' : isDemo ? '#C08A50' : ink(t.gold, 3);
  const outColor  = isPromo ? ink('#FFD24A', 4.5) : isDemo ? '#E8C49A' : t.textPrimary;

  const displayGroup = useMemo(
    () => orderGroupForResultDisplay(result.group, result.myRank),
    [result.group, result.myRank],
  );
  const myIndex = displayGroup.findIndex(m => m?.isMe === true);
  const myDisplayRank = myIndex >= 0 ? myIndex + 1 : result.myRank;
  const totalInGroup = Math.max(result.totalInGroup, displayGroup.length);
  const zoneSize = getLeagueResultZoneSize(totalInGroup);
  const relegationStartRank = totalInGroup >= 2 && zoneSize > 0
    ? totalInGroup - zoneSize + 1 : totalInGroup + 1;

  const pathNodes = useMemo(
    () => buildPathNodes(displayGroup, myIndex),
    [displayGroup, myIndex],
  );

  // Позиция медальона на колонне (0 сверху..1 снизу), от текущего/итогового места.
  const rankToT = useCallback((rank: number) => {
    if (totalInGroup <= 1) return 0.5;
    return Math.max(0.04, Math.min(0.94, (rank - 1) / (totalInGroup - 1)));
  }, [totalInGroup]);
  const startRank = isPromo ? Math.min(totalInGroup, myDisplayRank + 2) : myDisplayRank;
  const endRank = myDisplayRank;
  const startT = rankToT(startRank);
  const endT = rankToT(endRank);
  const thresholdT = isDemo
    ? rankToT(relegationStartRank)
    : rankToT(Math.max(1, zoneSize));

  // ─── Драйверы (Reanimated) ────────────────────────────────────────────
  const sceneOpacity = useSharedValue(0);
  const outLabelOpacity = useSharedValue(0);
  const midOpacity = useSharedValue(0);
  const medallionOpacity = useSharedValue(0);
  const medallionT = useSharedValue(startT);
  const medallionSquashY = useSharedValue(1);
  const trailOpacity = useSharedValue(0);
  const trailScaleY = useSharedValue(0);
  const thresholdFlash = useSharedValue(0);
  const anchorOpacity = useSharedValue(0);
  const anchorY = useSharedValue(10);
  const plateOpacity = useSharedValue(0);
  const rewardsOpacity = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);
  const ctaY = useSharedValue(10);
  const progressBarWidth = useSharedValue(0);
  const rankTick = useSharedValue(startRank);
  const [displayRank, setDisplayRank] = useState(startRank);

  useEffect(() => {
    if (!visible) return;

    if (reduceMotion) {
      sceneOpacity.value = 1;
      outLabelOpacity.value = 1;
      midOpacity.value = 1;
      medallionOpacity.value = 1;
      medallionT.value = endT;
      trailOpacity.value = 0;
      thresholdFlash.value = 0;
      anchorOpacity.value = isStay ? 1 : 0;
      anchorY.value = 0;
      plateOpacity.value = isDemo ? 1 : 0;
      rewardsOpacity.value = 1;
      ctaOpacity.value = 1; ctaY.value = 0;
      progressBarWidth.value = isStay ? 68 : 0;
      setDisplayRank(endRank);
      if (isPromo) hapticSuccess(); else if (isDemo) hapticWarning(); else hapticSoftImpact();
      return;
    }

    // Сброс к начальному кадру на каждое открытие.
    sceneOpacity.value = 0;
    outLabelOpacity.value = 0;
    midOpacity.value = 0;
    medallionOpacity.value = 0;
    medallionT.value = startT;
    trailOpacity.value = 0;
    trailScaleY.value = 0;
    thresholdFlash.value = 0;
    anchorOpacity.value = 0;
    anchorY.value = 10;
    plateOpacity.value = 0;
    rewardsOpacity.value = 0;
    ctaOpacity.value = 0; ctaY.value = 10;
    progressBarWidth.value = 0;
    rankTick.value = startRank;
    setDisplayRank(startRank);

    if (isPromo) hapticSuccess();
    else if (isDemo) hapticWarning();
    else hapticSoftImpact();
    soundDirector.request(isPromo ? 'pm.league.promoted' : isDemo ? 'pm.league.demoted' : 'pm.league.demoted', {
      scope: 'league-result-hybrid',
      dedupeKey: `hy:${result.prevLeagueId}:${result.newLeagueId}:${isPromo ? 'up' : isDemo ? 'down' : 'stay'}`,
    });

    // Атмосфера появляется первой (закон: свет рождает форму).
    sceneOpacity.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) });
    outLabelOpacity.value = withDelay(200, withTiming(1, { duration: LUM.resolveMs }));
    midOpacity.value = withDelay(isPromo ? 460 : isDemo ? 420 : 340, withTiming(1, { duration: 380 }));

    const medallionDelay = isPromo ? 1000 : isDemo ? 860 : 820;
    medallionOpacity.value = withDelay(medallionDelay, withTiming(1, { duration: 240 }));

    if (isPromo) {
      const travelDelay = 1100;
      const impact = () => {
        thresholdFlash.value = 1;
        thresholdFlash.value = withTiming(0, { duration: 620, easing: Easing.linear });
        medallionSquashY.value = withSequence(
          withTiming(0.82, { duration: 0 }),
          withSpring(1, CHK.squash),
        );
        hapticLightImpact();
      };
      const travel = withDelay(travelDelay, withTiming(endT, {
        duration: 1180,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      }, (finished) => {
        if (finished) runOnJS(impact)();
      }));
      medallionT.value = travel;

      trailOpacity.value = withDelay(travelDelay, withSequence(
        withTiming(0.85, { duration: 0 }),
        withDelay(220, withTiming(0, { duration: 1500, easing: Easing.linear })),
      ));
      trailScaleY.value = withDelay(travelDelay, withTiming(1, {
        duration: 1080, easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      }));

      // Тики места на торможении: 8→7→6→…→финал, лёгкий импакт-тик.
      const ranks: number[] = [];
      for (let r = startRank - 1; r >= endRank; r -= 1) ranks.push(r);
      ranks.forEach((r, k) => {
        rankTick.value = withDelay(travelDelay + 360 + k * 215, withTiming(r, { duration: 0 }, (finished) => {
          if (finished) { runOnJS(setDisplayRank)(r); runOnJS(hapticLightImpact)(); }
        }));
      });

      rewardsOpacity.value = withDelay(travelDelay + 1180 + 300, withTiming(1, { duration: 260 }));
      ctaOpacity.value = withDelay(travelDelay + 1180 + 640, withTiming(1, { duration: 260 }));
      ctaY.value = withDelay(travelDelay + 1180 + 640, withSpring(0, LUM.settle));
    } else if (isStay) {
      medallionT.value = withDelay(0, withTiming(endT, { duration: 0 }));
      anchorOpacity.value = withDelay(950, withTiming(1, { duration: 220 }));
      anchorY.value = withDelay(950, withSpring(0, { mass: 0.55, damping: 12, stiffness: 200 }));
      medallionSquashY.value = withDelay(1120, withSequence(
        withTiming(1.06, { duration: 0 }),
        withSpring(1, { mass: 0.55, damping: 14, stiffness: 210 }),
      ));
      thresholdFlash.value = withDelay(1450, withSequence(
        withTiming(0.9, { duration: 0 }),
        withTiming(0, { duration: 700, easing: Easing.linear }),
      ));
      rewardsOpacity.value = withDelay(1750, withTiming(1, { duration: 260 }));
      progressBarWidth.value = withDelay(1950, withTiming(68, { duration: 700, easing: Easing.out(Easing.cubic) }));
      ctaOpacity.value = withDelay(2260, withTiming(1, { duration: 260 }));
      ctaY.value = withDelay(2260, withSpring(0, LUM.settle));
      hapticSoftImpact();
    } else {
      // isDemo: спуск без удара, приземление на платформу.
      const descentDelay = 1100;
      const land = () => {
        plateOpacity.value = withTiming(1, { duration: 340 });
        hapticWarning();
      };
      medallionT.value = withDelay(descentDelay, withTiming(endT, {
        duration: 1340,
        easing: Easing.bezier(0.4, 0, 0.3, 1),
      }, (finished) => {
        if (finished) runOnJS(land)();
      }));
      rewardsOpacity.value = withDelay(descentDelay + 1340 + 360, withTiming(1, { duration: 260 }));
      ctaOpacity.value = withDelay(descentDelay + 1340 + 720, withTiming(1, { duration: 280 }));
      ctaY.value = withDelay(descentDelay + 1340 + 720, withSpring(0, LUM.settle));
    }

    return () => {
      cancelAnimation(sceneOpacity); cancelAnimation(outLabelOpacity); cancelAnimation(midOpacity);
      cancelAnimation(medallionOpacity); cancelAnimation(medallionT); cancelAnimation(medallionSquashY);
      cancelAnimation(trailOpacity); cancelAnimation(trailScaleY); cancelAnimation(thresholdFlash);
      cancelAnimation(anchorOpacity); cancelAnimation(anchorY); cancelAnimation(plateOpacity);
      cancelAnimation(rewardsOpacity); cancelAnimation(ctaOpacity); cancelAnimation(ctaY);
      cancelAnimation(progressBarWidth); cancelAnimation(rankTick);
    };
    // зачем: пересобираем всю хореографию только на смену видимости/исхода —
    // не на каждый ре-рендер темы/языка (эффект держит явный список входов).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isPromo, isDemo, isStay, reduceMotion, result.prevLeagueId, result.newLeagueId, startT, endT, startRank, endRank]);

  // ─── Стили ──────────────────────────────────────────────────────────────
  const sceneStyle = useAnimatedStyle(() => ({ opacity: sceneOpacity.value }));
  const outLabelStyle = useAnimatedStyle(() => ({ opacity: outLabelOpacity.value }));
  const midStyle = useAnimatedStyle(() => ({ opacity: midOpacity.value }));

  const MID_H = 300; // логическая высота колонны для расчёта смещений (View измеряется реально ниже)
  const [midHeight, setMidHeight] = useState(MID_H);

  const medallionStyle = useAnimatedStyle(() => ({
    opacity: medallionOpacity.value,
    top: medallionT.value * (midHeight - NODE_H) - 4,
    transform: [{ scaleY: medallionSquashY.value }],
  }));
  const trailStyle = useAnimatedStyle(() => {
    const dist = Math.abs(medallionT.value - startT) * midHeight;
    return {
      opacity: trailOpacity.value,
      height: Math.max(4, dist),
      transform: [{ scaleY: trailScaleY.value }],
      top: Math.min(startT, medallionT.value) * (midHeight - NODE_H) + NODE_H / 2,
    };
  });
  const thresholdFlashStyle = useAnimatedStyle(() => ({
    opacity: thresholdFlash.value,
    transform: [{ scaleX: thresholdFlash.value > 0 ? 1 : 0 }],
  }));
  const anchorStyle = useAnimatedStyle(() => ({
    opacity: anchorOpacity.value,
    transform: [{ translateY: anchorY.value }],
  }));
  const plateStyle = useAnimatedStyle(() => ({
    opacity: plateOpacity.value,
    transform: [{ translateY: (1 - plateOpacity.value) * 8 }],
  }));
  const rewardsStyle = useAnimatedStyle(() => ({
    opacity: rewardsOpacity.value,
    transform: [{ translateY: (1 - rewardsOpacity.value) * 10 }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaY.value }],
  }));
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressBarWidth.value}%`,
  }));

  // зачем: AnimatedText — Reanimated-обёртка над RN Text, а не TextInput, поэтому
  // нативных пропов `text`/`defaultValue` в её типах нет — паттерн из
  // ResultsSequence.tsx (AnimatedTextInput) здесь неприменим напрямую. Пишем
  // тем же способом (UI-поток, без ре-рендера JS), но приводим результат к
  // `Partial<TextProps>` — единственному пропу, который useAnimatedProps
  // реально обязан вернуть по типу для AnimatedText.
  const rankTextProps = useAnimatedProps<Partial<TextProps>>(() => ({
    text: String(Math.round(rankTick.value)),
    defaultValue: String(Math.round(rankTick.value)),
  } as Partial<TextProps>));

  const outcomeText = isPromo
    ? triLang(lang, {
        ru: `Серебряная лига`, uk: `Срібна ліга`, es: `Liga de plata`, "pt-BR": `Liga de prata`,
        vi: `Giải bạc`, id: `Liga perak`, tr: `Gümüş lig`, pl: `Srebrna liga`,
      }).replace('Серебряная лига', triLang(lang, {
        ru: newLeague.nameRU, uk: newLeague.nameUK, es: newLeague.nameES,
        "pt-BR": clubNamePlanned(newLeague.id, 'pt-BR' as PlannedInterfaceLang),
        vi: clubNamePlanned(newLeague.id, 'vi' as PlannedInterfaceLang),
        id: clubNamePlanned(newLeague.id, 'id' as PlannedInterfaceLang),
        tr: clubNamePlanned(newLeague.id, 'tr' as PlannedInterfaceLang),
        pl: clubNamePlanned(newLeague.id, 'pl' as PlannedInterfaceLang),
      }))
    : isDemo
      ? triLang(lang, {
          ru: newLeague.nameRU, uk: newLeague.nameUK, es: newLeague.nameES,
          "pt-BR": clubNamePlanned(newLeague.id, 'pt-BR' as PlannedInterfaceLang),
          vi: clubNamePlanned(newLeague.id, 'vi' as PlannedInterfaceLang),
          id: clubNamePlanned(newLeague.id, 'id' as PlannedInterfaceLang),
          tr: clubNamePlanned(newLeague.id, 'tr' as PlannedInterfaceLang),
          pl: clubNamePlanned(newLeague.id, 'pl' as PlannedInterfaceLang),
        })
      : triLang(lang, {
          ru: `${newLeague.nameRU} держит тебя`,
          uk: `${newLeague.nameUK} тримає тебе`,
          es: `${newLeague.nameES} te sostiene`,
          "pt-BR": `${clubNamePlanned(newLeague.id, 'pt-BR' as PlannedInterfaceLang)} segura você`,
          vi: `${clubNamePlanned(newLeague.id, 'vi' as PlannedInterfaceLang)} giữ chân bạn`,
          id: `${clubNamePlanned(newLeague.id, 'id' as PlannedInterfaceLang)} menahanmu`,
          tr: `${clubNamePlanned(newLeague.id, 'tr' as PlannedInterfaceLang)} seni tutuyor`,
          pl: `${clubNamePlanned(newLeague.id, 'pl' as PlannedInterfaceLang)} cię trzyma`,
        });

  const kickerText = triLang(lang, {
    ru: 'Итоги недели', uk: 'Підсумки тижня', es: 'Resultados de la semana',
    "pt-BR": 'Resultados da semana', vi: 'Kết quả tuần', id: 'Hasil minggu ini',
    tr: 'Haftanın sonuçları', pl: 'Wyniki tygodnia',
  });

  const thresholdLabel = isDemo
    ? triLang(lang, { ru: 'Черта вылета', uk: 'Межа вильоту', es: 'Línea de descenso', "pt-BR": 'Linha de descenso', vi: 'Ranh giới xuống hạng', id: 'Batas turun', tr: 'Düşme sınırı', pl: 'Linia spadku' })
    : isStay
      ? triLang(lang, { ru: `Топ-${zoneSize} · цель недели`, uk: `Топ-${zoneSize} · ціль тижня`, es: `Top ${zoneSize} · meta semanal`, "pt-BR": `Top ${zoneSize} · meta da semana`, vi: `Top ${zoneSize} · mục tiêu tuần`, id: `Top ${zoneSize} · target minggu`, tr: `İlk ${zoneSize} · haftalık hedef`, pl: `Top ${zoneSize} · cel tygodnia` })
      : triLang(lang, { ru: `Топ-${zoneSize} · повышение`, uk: `Топ-${zoneSize} · підвищення`, es: `Top ${zoneSize} · ascenso`, "pt-BR": `Top ${zoneSize} · promoção`, vi: `Top ${zoneSize} · thăng hạng`, id: `Top ${zoneSize} · naik`, tr: `İlk ${zoneSize} · yükselme`, pl: `Top ${zoneSize} · awans` });

  const platformLabel = triLang(lang, {
    ru: `${newLeague.nameRU} · старт с чистого листа`,
    uk: `${newLeague.nameUK} · старт з чистого аркуша`,
    es: `${newLeague.nameES} · empieza de cero`,
    "pt-BR": `${clubNamePlanned(newLeague.id, 'pt-BR' as PlannedInterfaceLang)} · recomeço`,
    vi: `${clubNamePlanned(newLeague.id, 'vi' as PlannedInterfaceLang)} · bắt đầu lại`,
    id: `${clubNamePlanned(newLeague.id, 'id' as PlannedInterfaceLang)} · mulai baru`,
    tr: `${clubNamePlanned(newLeague.id, 'tr' as PlannedInterfaceLang)} · sıfırdan başlangıç`,
    pl: `${clubNamePlanned(newLeague.id, 'pl' as PlannedInterfaceLang)} · start od nowa`,
  });

  const progressToTopLabel = triLang(lang, {
    ru: 'До топ-7', uk: 'До топ-7', es: 'Al top 7', "pt-BR": 'Ao top 7',
    vi: 'Đến top 7', id: 'Ke top 7', tr: 'İlk 7’ye', pl: 'Do top 7',
  });

  const savedLabel = triLang(lang, {
    ru: 'Звёзды и уроки сохранены · ничего не сгорело',
    uk: 'Зірки та уроки збережено · нічого не згоріло',
    es: 'Estrellas y lecciones guardadas · nada se perdió',
    "pt-BR": 'Estrelas e lições salvas · nada foi perdido',
    vi: 'Sao và bài học đã lưu · không mất gì',
    id: 'Bintang dan pelajaran tersimpan · tidak ada yang hilang',
    tr: 'Yıldızlar ve dersler kaydedildi · hiçbir şey kaybolmadı',
    pl: 'Gwiazdki i lekcje zapisane · nic nie przepadło',
  });

  const bonusLabel = triLang(lang, {
    ru: newLeague.tagRU, uk: newLeague.tagUK, es: newLeague.tagES,
    "pt-BR": newLeague.tagRU, vi: newLeague.tagRU, id: newLeague.tagRU, tr: newLeague.tagRU, pl: newLeague.tagRU,
  });

  const zoneBonusLabel = triLang(lang, {
    ru: '+5 жемчужин', uk: '+5 перлин', es: '+5 perlas', "pt-BR": '+5 pérolas',
    vi: '+5 ngọc trai', id: '+5 mutiara', tr: '+5 inci', pl: '+5 pereł',
  });

  const zoneBonusSub = triLang(lang, {
    ru: 'за топ-7', uk: 'за топ-7', es: 'por top 7', "pt-BR": 'pelo top 7',
    vi: 'cho top 7', id: 'untuk top 7', tr: 'ilk 7 için', pl: 'za top 7',
  });

  const meLabel = triLang(lang, { ru: 'М', uk: 'Я', es: 'Y', "pt-BR": 'E', vi: 'T', id: 'S', tr: 'B', pl: 'J' });

  return (
    <Reanimated.View style={[styles.scene, sceneStyle, { backgroundColor: t.bgPrimary }]}>
      {/* Атмосфера: радиальные глоу-слои, тон исхода. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={[glowColor + (onLight ? '22' : '33'), 'transparent']}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.6 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* ── Верх: заголовок исхода ── */}
      <View style={styles.top}>
        <Text style={{ color: t.textMuted, fontSize: f.label, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700' }}>
          {kickerText}
        </Text>
        <Reanimated.Text style={[outLabelStyle, { color: outColor, fontSize: 22, fontWeight: '700', letterSpacing: -0.4, marginTop: 4, textAlign: 'center' }]}>
          {outcomeText}
        </Reanimated.Text>

        {/* Арка лиг: только на смену лиги (повышение/вылет). Обе эмблемы — чисто
            декоративный акцент рядом со стрелкой; смысл перехода уже несёт
            outcomeText выше (текст экрана), поэтому accessible={false}. */}
        {(isPromo || isDemo) && (
          <View style={styles.arcRow}>
            <Image accessible={false} source={prevLeague.imageUri} style={{ width: 34, height: 34, opacity: 0.5 }} contentFit="contain" />
            <Ionicons name={isPromo ? 'arrow-forward' : 'arrow-back'} size={16} color={glowColor} />
            <Image accessible={false} source={newLeague.imageUri} style={{ width: 34, height: 34 }} contentFit="contain" />
          </View>
        )}
      </View>

      {/* ── Середина: колонна пути ── */}
      <Reanimated.View
        style={[styles.mid, midStyle]}
        onLayout={(e) => setMidHeight(Math.max(180, e.nativeEvent.layout.height))}
      >
        {/* Стеклянная колонна: тон+тень, БЕЗ обводок */}
        <LinearGradient
          colors={[glowColor + '1F', onLight ? 'rgba(0,0,0,0.05)' : 'rgba(3,5,10,0.5)', onLight ? 'rgba(0,0,0,0.03)' : 'rgba(3,5,10,0.55)']}
          style={styles.path}
        />

        {/* Ступени-риски */}
        {[0.12, 0.24, 0.36, 0.48, 0.60, 0.72, 0.84].map((tt) => (
          <View key={tt} style={[styles.step, { top: `${tt * 100}%`, backgroundColor: onLight ? 'rgba(23,32,29,0.14)' : 'rgba(138,180,154,0.22)' }]} />
        ))}

        {/* Порог топ-7 / черта вылета */}
        <View
          style={[
            styles.threshold,
            { top: `${thresholdT * 100}%`, backgroundColor: isDemo ? '#C0392B55' : glowColor + 'CC' },
          ]}
        />
        <Reanimated.View pointerEvents="none" style={[styles.thresholdFlash, thresholdFlashStyle, { top: `${thresholdT * 100}%`, backgroundColor: '#FFF6D8' }]} />
        <Text style={[styles.thresholdLabel, { top: `${thresholdT * 100}%`, color: isDemo ? '#E8A87C' : glowColor }]} numberOfLines={1}>
          {thresholdLabel}
        </Text>

        {/* Камеи-соперники */}
        {pathNodes.map((node) => (
          <View key={node.key} style={[styles.node, { top: `${node.t * 100}%`, backgroundColor: t.bgSurface }]}>
            <View style={[styles.nodeDot, { backgroundColor: t.bgSurface2 }]}>
              <Text style={{ color: t.textPrimary, fontSize: 11, fontWeight: '700' }}>{node.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text numberOfLines={1} style={{ flex: 1, color: t.textPrimary, fontSize: f.caption, fontWeight: '700', marginLeft: 8 }}>
              {node.name}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.caption, fontVariant: ['tabular-nums'] }}>
              {node.points} XP
            </Text>
          </View>
        ))}

        {/* Световой хвост медальона (только повышение) */}
        {isPromo && (
          <Reanimated.View pointerEvents="none" style={[styles.trail, trailStyle, { backgroundColor: glowColor }]} />
        )}

        {/* Мой медальон */}
        <Reanimated.View style={[styles.medallionWrap, medallionStyle]}>
          <LinearGradient
            colors={isDemo ? ['#E8C49A', '#8A6238'] : ['#FDF3D0', glowColor]}
            style={styles.medallion}
          >
            <Text style={{ color: '#3A2A06', fontSize: 15, fontWeight: '900' }}>{meLabel}</Text>
          </LinearGradient>
          <AnimatedText
            animatedProps={rankTextProps}
            style={{ marginLeft: 8, color: glowColor, fontSize: 18, fontWeight: '900' }}
          >
            {displayRank}
          </AnimatedText>
        </Reanimated.View>

        {/* Якорь-щит (только «остался») */}
        {isStay && (
          <Reanimated.View style={[
            styles.anchor, anchorStyle,
            { top: `${endT * 100}%`, marginTop: NODE_H + 6, backgroundColor: t.bgSurface2 },
          ]}>
            <Ionicons name="shield-checkmark" size={13} color={ink('#34C759', 3)} />
          </Reanimated.View>
        )}

        {/* Бронзовая платформа (только вылет) */}
        {isDemo && (
          <Reanimated.View style={[styles.plate, plateStyle, { backgroundColor: t.bgSurface }]}>
            <Ionicons name="shield" size={16} color="#C08A50" />
            <Text style={{ color: '#E8C49A', fontSize: f.caption, fontWeight: '700', marginLeft: 8, flex: 1 }} numberOfLines={1}>
              {platformLabel}
            </Text>
          </Reanimated.View>
        )}
      </Reanimated.View>

      {/* ── Низ: награды/прогресс + место для CTA (кнопку рисует родитель) ── */}
      <View style={styles.bottom}>
        {isPromo && (
          <Reanimated.View style={[styles.rewardsRow, rewardsStyle]}>
            <RewardChip icon="star" color={t.gold} title="+10% XP" sub={triLang(lang, { ru: 'бонус новой лиги', uk: 'бонус нової ліги', es: 'bono de nueva liga', "pt-BR": 'bônus da nova liga', vi: 'thưởng giải mới', id: 'bonus liga baru', tr: 'yeni lig bonusu', pl: 'bonus nowej ligi' })} t={t} f={f} />
            <RewardChip icon="water" color={ink('#4A90D9', 3)} title={zoneBonusLabel} sub={zoneBonusSub} t={t} f={f} />
          </Reanimated.View>
        )}
        {isStay && (
          <Reanimated.View style={[styles.progressRow, rewardsStyle]}>
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>{progressToTopLabel}</Text>
            <View style={[styles.progressTrack, { backgroundColor: t.bgSurface2 }]}>
              <Reanimated.View style={[styles.progressFill, progressBarStyle, { backgroundColor: glowColor }]} />
            </View>
            <Text style={{ color: glowColor, fontSize: f.body, fontWeight: '800' }}>120 XP</Text>
          </Reanimated.View>
        )}
        {isDemo && (
          <Reanimated.View style={[styles.rewardsRow, rewardsStyle]}>
            <RewardChip icon="ribbon" color="#C08A50" title={savedLabel} sub="" t={t} f={f} wide />
          </Reanimated.View>
        )}

        <Reanimated.View style={[styles.ctaAnchor, ctaStyle]} pointerEvents="none" />
      </View>
    </Reanimated.View>
  );
}

const RewardChip = memo(function RewardChip({ icon, color, title, sub, t, f, wide }: {
  icon: any; color: string; title: string; sub: string; t: any; f: any; wide?: boolean;
}) {
  return (
    <View style={[styles.rewardChip, { backgroundColor: t.bgSurface, flex: wide ? 1 : undefined, minWidth: wide ? undefined : 0 }, wide ? { width: '100%' } : { flex: 1 }]}>
      <View style={[styles.rewardIcon, { backgroundColor: color + '26' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ color: t.textPrimary, fontSize: t.fontBody ?? 13, fontWeight: '800' }}>{title}</Text>
        {/* guard-ok: второе ЗНАЧЕНИЕ чипа (за топ-7 / bonus new league), не расшифровка title */}
        {!!sub && <Text numberOfLines={1} style={{ color: t.textMuted, fontSize: 11, marginTop: 1 }}>{sub}</Text>}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  scene: {
    width: CARD_W,
    flex: 1,
    ...noAndroidOutline,
  },
  top: { paddingTop: 18, paddingHorizontal: 16, alignItems: 'center' },
  arcRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  mid: { flex: 1, marginTop: 14, marginHorizontal: 16, minHeight: 220 },
  path: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 56, borderRadius: 28 },
  step: { position: 'absolute', left: 12, width: 32, height: 1.5, borderRadius: 1 },
  threshold: { position: 'absolute', left: 4, width: 64, height: 3, borderRadius: 2 },
  thresholdFlash: { position: 'absolute', left: 4, width: 64, height: 3, borderRadius: 2 },
  thresholdLabel: {
    position: 'absolute', left: 70, fontSize: 9, fontWeight: '700',
    letterSpacing: 0.6, textTransform: 'uppercase', maxWidth: 140,
  },
  node: {
    position: 'absolute', left: 76, right: 0, height: NODE_H,
    flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 10,
  },
  nodeDot: { width: 22, height: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  trail: { position: 'absolute', left: 20, width: 24, borderRadius: 12, opacity: 0.5 },
  medallionWrap: { position: 'absolute', left: 0, flexDirection: 'row', alignItems: 'center', height: NODE_H },
  medallion: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  anchor: {
    position: 'absolute', left: 14, width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  plate: {
    position: 'absolute', left: 76, right: 0, bottom: 6, height: 42, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10,
  },
  bottom: { paddingHorizontal: 16, paddingBottom: 4 },
  rewardsRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  rewardChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 10 },
  rewardIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 4 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  ctaAnchor: { height: 0 },
});

export default memo(LeagueResultHybrid);
