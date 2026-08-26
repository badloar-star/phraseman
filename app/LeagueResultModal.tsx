import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
// ════════════════════════════════════════════════════════════════════════════
//  LeagueResultModal — итоги недели в лиге
//  Ультра-красивый дизайн: градиенты, хало, конфетти/искры, подиум, аватары,
//  премиум-подсветка, бонус новой лиги, хаптика, накат-волна на CTA.
//
//  Один источник правды для модалки. components/ClubResultModal.tsx — re-export.
// ════════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, Modal, Animated, Easing, TouchableOpacity,
  Dimensions, ScrollView, StyleSheet, Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from '../components/SafeLinearGradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import {
  LeagueResult, LEAGUES, CLUBS, clearPendingResult, GroupMember,
  clubDescPlanned, clubNamePlanned, getLeagueResultZoneSize,
  orderGroupForResultDisplay,
} from './league_engine';
import { isLeagueXpPromotionEnabled, getLeagueXpPromotionThreshold } from './remote_flags';
import AvatarView from '../components/AvatarView';
import LeagueResultHybrid from '../components/league/LeagueResultHybrid';
import PremiumAvatarHalo from '../components/PremiumAvatarHalo';
import { memberNameStatusStyle } from '../components/premiumMemberStyles';
import { getBestAvatarForLevel } from '../constants/avatars';
import { PREMIUM_AVATAR_AURA_ID, getEffectiveAvatarAuraId } from '../constants/avatar_auras';
import { getLevelFromXP } from '../constants/theme';
// Валюта лиги — руны (владелец, 2026-08-26).
import { runeWord } from '../constants/runes';
import { buttonForegroundForBackground, isLightSurface, readableOn } from '../constants/color_contrast';
import { triLang, type Lang, type PlannedInterfaceLang } from '../constants/i18n';
import { hapticSuccess, hapticWarning, hapticTap, hapticSoftImpact } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { soundDirector } from '../modules/audio/sound_director';

import { noAndroidOutline } from '../constants/androidGlow';
const { width: W, height: H } = Dimensions.get('window');
const CARD_W = Math.min(W - 24, 420);

// ─── Палитры исходов ───────────────────────────────────────────────────────
const PROMO_COLORS  = { primary: '#34C759', accent: '#FFD24A', glow: '#FFD24A' };
const DEMO_COLORS   = { primary: '#FF453A', accent: '#FF6B6B', glow: '#FF453A' };

// зачем: раньше здесь жили две системы летящих частиц — «энергошарды» (полоски,
// улетающие вверх на повышении) и поле искр ✦ на всех остальных исходах. Обе
// убраны по решению владельца 2026-08-13: они перекрывали текст, тянули на себя
// внимание с результата и обе были сломаны — у шардов из-за `% 1` над целыми
// слагаемыми все частицы получали ОДИН seed и стартовали из одной точки (та самая
// «полоска, уходящая вверх»), а координаты искр пересчитывались через Math.random()
// на каждом рендере, из-за чего они телепортировались. Празднование теперь несут
// хало вокруг иконки клуба, рост подиума и каскад появления карточки.

// Порог каскада: строки ниже этого индекса появляются волной, остальные — сразу
// (их всё равно не видно без прокрутки, а лишние интерполяции стоят кадров).
const ROW_CASCADE_LIMIT = 8;

/** Длительность общего каскада появления карточки, мс. */
const INTRO_MS = 640;

// ─── Хало вокруг иконки клуба (вращающийся conic-like glow) ────────────────
function ClubHalo({ active, reduceMotion, color, size, intensity = 1 }: {
  active: boolean;
  /** Системное «уменьшить движение»: хало замирает статичным кадром. */
  reduceMotion?: boolean;
  color: string;
  size: number;
  intensity?: number;
}) {
  const rot = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Статичный кадр вместо цикла: закрытая модалка и reduce-motion не крутят
    // хало, но и не гасят его полностью — иконка клуба остаётся в оправе.
    const freeze = () => { rot.setValue(0); pulse.setValue(0.7); };
    if (!active) return freeze();
    if (reduceMotion) return freeze();
    const r = Animated.loop(
      Animated.timing(rot, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true }),
    );
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 1300, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 1300, useNativeDriver: true }),
      ]),
    );
    r.start(); p.start();
    return () => { r.stop(); p.stop(); };
  }, [active, reduceMotion, rot, pulse]);

  const ringSize  = size * 1.7;
  const ringSize2 = size * 1.35;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', alignSelf: 'center',
        width: ringSize, height: ringSize,
        alignItems: 'center', justifyContent: 'center',
        opacity: intensity,
      }}
    >
      <Animated.View style={{
        position: 'absolute',
        width: ringSize, height: ringSize,
        transform: [{ rotate: rot.interpolate({ inputRange:[0,1], outputRange:['0deg','360deg'] }) }],
      }}>
        <LinearGradient
          colors={[color + '00', color + 'CC', color + '00', color + '88', color + '00']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={{ width: '100%', height: '100%', borderRadius: ringSize / 2 }}
        />
      </Animated.View>
      <Animated.View style={{
        position: 'absolute',
        width: ringSize2, height: ringSize2,
        borderRadius: ringSize2 / 2,
        backgroundColor: color,
        opacity: pulse.interpolate({ inputRange:[0,1], outputRange:[0.08, 0.22] }),
      }}/>
    </View>
  );
}

interface Props {
  visible: boolean;
  result:  LeagueResult;
  onClose: () => void;
  /**
   * DEV-превью с синтетическим результатом (DEV-центр → «Лига · итоги недели»).
   *
   * зачем: обычное закрытие вызывает clearPendingResult(), а он читает НАСТОЯЩИЙ
   * pending с диска, штампует его как «показанный» и удаляет. Без этого флага
   * дев-превью съедало бы реальные итоги недели пользователя. В превью закрытие
   * ничего не пишет в хранилище.
   */
  previewMode?: boolean;
  /**
   * зачем: гибридный редизайн («Световод + Чекан», см. constants/motionHybrid.ts)
   * подключается ТОЛЬКО этим пропсом — боевое поведение не меняется, пока его
   * никто не передаёт. 'hybrid' рендерит components/league/LeagueResultHybrid.tsx
   * вместо классического тела; Modal/скрим/крестик/CTA — общие для обеих версий.
   */
  motionVariant?: 'classic' | 'hybrid';
}

export default function LeagueResultModal({ visible, result, onClose, previewMode = false, motionVariant = 'classic' }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const reduceMotion = useReduceMotion();

  const prevLeague = LEAGUES[result.prevLeagueId] ?? LEAGUES[0];
  const newLeague  = LEAGUES[result.newLeagueId]  ?? LEAGUES[0];
  const club       = CLUBS[result.newLeagueId]    ?? CLUBS[0];

  const isPromo  = result.promoted;
  const isDemo   = result.demoted;
  const isStay   = !isPromo && !isDemo;

  // ─── Светлая тема ───────────────────────────────────────────────────────
  // зачем 13.08.2026 (репорт владельца): вся палитра модалки подбиралась под
  // тёмный фон. На светлой теме зелёный #34C759 давал контраст 2.2:1, серебро
  // подиума — 1.6:1, а «геройский» блок оставался чёрно-зелёной плитой посреди
  // белой карточки. Светлость определяем по реальной яркости поверхности, а не
  // по имени темы: новая светлая тема может появиться без обновления списка.
  const onLight = isLightSurface(t.bgCard);
  /**
   * Доводит фирменный цвет до читаемости на светлой карточке, сохраняя оттенок.
   * В тёмных темах возвращает цвет БЕЗ изменений — прежний вид не трогаем.
   *
   * Опорный фон — bgPrimary (тело карточки), а запас берём 6:1, а не 4.5:1.
   * зачем: этот же цвет ложится ещё и на подложки из самого себя (чип исхода,
   * моя строка списка, полоса бонуса — все они = цвет с альфой поверх фона).
   * Считая ровно по AA на чистом фоне, на таких подложках проваливались до
   * 3.1:1. Запас в 6:1 держит AA во всех трёх местах разом.
   */
  const ink = useCallback(
    (color: string, minRatio = 6) => (onLight ? readableOn(color, t.bgPrimary, minRatio) : color),
    [onLight, t.bgPrimary],
  );

  // Цветовая схема под исход. primary несёт текст и иконки → приводим к AA;
  // glow — только свечение и заливки, оттенок оставляем исходным.
  const basePalette = isPromo ? PROMO_COLORS : isDemo ? DEMO_COLORS
    : { primary: club.color, accent: club.color, glow: club.color };
  const palette = useMemo(() => ({
    primary: ink(basePalette.primary),
    accent:  ink(basePalette.accent),
    glow:    basePalette.glow,
  }), [ink, basePalette.primary, basePalette.accent, basePalette.glow]);

  /**
   * Цвет вращающегося хало вокруг иконки клуба.
   *
   * зачем 13.08.2026 (репорт владельца): при повышении хало красилось в
   * PROMO_COLORS.glow — жёлтый #FFD24A. На светлой карточке жёлтое кольцо
   * просто не видно (1.4:1 к фону), да и по смыслу повышение в приложении
   * зелёное, а не золотое. Берём цвет исхода и целимся в 3:1 — этого хватает
   * для крупной графики, и оттенок остаётся сочным, а не уходит в почти
   * чёрный, как было бы с текстовым порогом 6:1.
   */
  const haloColor = ink(basePalette.primary, 3);

  // ─── Хореография входа ──────────────────────────────────────────────────
  // Один общий драйвер 0→1 вместо цепочки из семи Animated.sequence: раньше
  // блоки ждали полного завершения предыдущего, весь контент доезжал ~1.9 с,
  // и кнопка «Продолжить» появлялась последней — пользователь смотрел на
  // недорисованную карточку. Теперь блоки перекрываются окнами интерполяции
  // внутри одного нативного прохода: последний элемент на месте за ~640 мс,
  // а анимаций на UI-потоке ровно столько же, сколько было раньше на первый шаг.
  const intro          = useRef(new Animated.Value(0)).current;
  const cardScale      = useRef(new Animated.Value(0.92)).current;
  const cardOpacity    = useRef(new Animated.Value(0)).current;
  const heroIconScale  = useRef(new Animated.Value(0.4)).current;
  const rankScale      = useRef(new Animated.Value(0.5)).current;
  const myRowGlow      = useRef(new Animated.Value(0)).current;
  const btnShine       = useRef(new Animated.Value(0)).current;
  /** Прогресс закрытия 0→1: карточка уезжает вниз и гаснет. */
  const exitProgress   = useRef(new Animated.Value(0)).current;
  const closingRef     = useRef(false);

  // Окно каскада: [начало, конец] в долях intro. Возвращает готовый стиль.
  const introStyle = useCallback((from: number, to: number, shiftY = 14) => ({
    opacity: intro.interpolate({ inputRange: [from, to], outputRange: [0, 1], extrapolate: 'clamp' as const }),
    transform: [{
      translateY: intro.interpolate({
        inputRange: [from, to], outputRange: [shiftY, 0], extrapolate: 'clamp' as const,
      }),
    }],
  }), [intro]);

  useEffect(() => {
    if (!visible) return;
    closingRef.current = false;
    exitProgress.setValue(0);

    // Хаптика по исходу — мгновенно
    if (isPromo) hapticSuccess();
    else if (isDemo) hapticWarning();
    else hapticSoftImpact();
    if (isPromo || isDemo) {
      soundDirector.request(isPromo ? 'pm.league.promoted' : 'pm.league.demoted', {
        scope: 'league-result',
        dedupeKey: `${result.prevLeagueId}:${result.newLeagueId}`,
      });
    }

    // Reduce-motion: итоговый кадр без движения. Ставим все значения в конечные
    // и не запускаем ни одного цикла — требование use_reduce_motion.
    if (reduceMotion) {
      intro.setValue(1);
      cardScale.setValue(1); cardOpacity.setValue(1);
      heroIconScale.setValue(1); rankScale.setValue(1);
      myRowGlow.setValue(1); btnShine.setValue(0);
      return;
    }

    intro.setValue(0);
    cardScale.setValue(0.92); cardOpacity.setValue(0);
    heroIconScale.setValue(0.4); rankScale.setValue(0.5);
    myRowGlow.setValue(0); btnShine.setValue(0);

    const entrance = Animated.parallel([
      // Карточка: короткий подхват без «резинового» перелёта.
      Animated.spring(cardScale, {
        toValue: 1, friction: 9, tension: 120, useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
      // Иконка клуба — мягкий «выдох» наружу, без прежнего рывка с поворотом.
      Animated.spring(heroIconScale, {
        toValue: 1, friction: 6, tension: 90, delay: 90, useNativeDriver: true,
      }),
      // Число места — акцентный пружинный поп на своей фазе каскада.
      Animated.spring(rankScale, {
        toValue: 1, friction: 5, tension: 150, delay: 230, useNativeDriver: true,
      }),
      // Общий каскад: заголовок → чип → место → подиум → список → бонус → кнопка.
      Animated.timing(intro, {
        toValue: 1, duration: INTRO_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]);
    entrance.start();

    // Моя строка: три подсветки и покой. Бесконечный пульс раньше мигал всё
    // время, пока открыта модалка — это шум и лишние кадры на ровном месте.
    const myGlowLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(420),
        Animated.timing(myRowGlow, { toValue: 1, duration: 620, useNativeDriver: true }),
        Animated.timing(myRowGlow, { toValue: 0.45, duration: 620, useNativeDriver: true }),
      ]),
      { iterations: 3 },
    );
    myGlowLoop.start(({ finished }) => { if (finished) myRowGlow.setValue(1); });

    // Блик на CTA — три прохода, потом кнопка успокаивается.
    const shineLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(btnShine, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(btnShine, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
      { iterations: 3 },
    );
    shineLoop.start();

    return () => {
      entrance.stop();
      myGlowLoop.stop();
      shineLoop.stop();
    };
  }, [
    visible, isPromo, isDemo, reduceMotion,
    result.prevLeagueId, result.newLeagueId,
    intro, cardScale, cardOpacity, heroIconScale, rankScale,
    myRowGlow, btnShine, exitProgress,
  ]);

  const handleClose = useCallback(() => {
    // Повторные тапы во время анимации ухода игнорируем: иначе onClose ушёл бы
    // дважды и второй вызов пришёлся бы уже на размонтированного хоста.
    if (closingRef.current) return;
    closingRef.current = true;
    hapticTap();

    // ВАЖНО: сначала onClose (синхронно ставит dismissedLeagueResultRef в home.tsx
    // и setPendingLeagueResult(null)), и только потом — асинхронная очистка
    // AsyncStorage. Если делать наоборот — между clearPendingResult() и
    // onClose() помещается фокус-перезапуск loadData, который регенерит pending,
    // не видя dismiss-ref → модалка «не закрывается». Порядок сохранён и здесь:
    // анимация ухода короткая (150 мс) и идёт ДО пары onClose/clearPendingResult,
    // фокус за это время не меняется — модалка перекрывает экран.
    const finish = () => {
      onClose();
      if (!previewMode) void clearPendingResult();
    };

    if (reduceMotion) { finish(); return; }
    Animated.timing(exitProgress, {
      toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start(finish);
  }, [onClose, previewMode, reduceMotion, exitProgress]);

  // ─── Тексты ─────────────────────────────────────────────────────────────
  const titleText = triLang(lang, {
  ru: 'Итоги недели',
  en: 'Weekly results',
  uk: 'Підсумки тижня',
  es: 'Resultados de la semana',
  "pt-BR": 'Resultados da semana',
  vi: 'Kết quả tuần',
  id: 'Hasil minggu ini',
  tr: 'Haftanın sonuçları',
  pl: 'Wyniki tygodnia',
});

  const outcomeText = isPromo
    ? triLang(lang, {
  ru: `Повышен до ${newLeague.nameRU}`,
  en: `Promoted to ${newLeague.nameES}`,
  uk: `Підвищено до ${newLeague.nameUK}`,
  es: `Has ascendido a ${newLeague.nameES}`,
  "pt-BR": `Promovido para ${clubNamePlanned(newLeague.id, 'pt-BR' as PlannedInterfaceLang)}`,
  vi: `Đã thăng lên ${clubNamePlanned(newLeague.id, 'vi' as PlannedInterfaceLang)}`,
  id: `Naik ke ${clubNamePlanned(newLeague.id, 'id' as PlannedInterfaceLang)}`,
  tr: `${clubNamePlanned(newLeague.id, 'tr' as PlannedInterfaceLang)} ligine yükseldin`,
  pl: `Awans do ${clubNamePlanned(newLeague.id, 'pl' as PlannedInterfaceLang)}`,
})
    : isDemo
      ? triLang(lang, {
  ru: `Понижен до ${newLeague.nameRU}`,
  en: `Demoted to ${newLeague.nameES}`,
  uk: `Понижено до ${newLeague.nameUK}`,
  es: `Has descendido a ${newLeague.nameES}`,
  "pt-BR": `Rebaixado para ${clubNamePlanned(newLeague.id, 'pt-BR' as PlannedInterfaceLang)}`,
  vi: `Đã xuống ${clubNamePlanned(newLeague.id, 'vi' as PlannedInterfaceLang)}`,
  id: `Turun ke ${clubNamePlanned(newLeague.id, 'id' as PlannedInterfaceLang)}`,
  tr: `${clubNamePlanned(newLeague.id, 'tr' as PlannedInterfaceLang)} ligine düştün`,
  pl: `Spadek do ${clubNamePlanned(newLeague.id, 'pl' as PlannedInterfaceLang)}`,
})
      : triLang(lang, {
  ru: `Остаёшься в лиге ${newLeague.nameRU}`,
  en: `You stay in ${newLeague.nameES}`,
  uk: `Залишаєшся в лізі ${newLeague.nameUK}`,
  es: `Sigues en ${newLeague.nameES}`,
  "pt-BR": `Você continua na ${clubNamePlanned(newLeague.id, 'pt-BR' as PlannedInterfaceLang)}`,
  vi: `Bạn ở lại ${clubNamePlanned(newLeague.id, 'vi' as PlannedInterfaceLang)}`,
  id: `Kamu tetap di ${clubNamePlanned(newLeague.id, 'id' as PlannedInterfaceLang)}`,
  tr: `${clubNamePlanned(newLeague.id, 'tr' as PlannedInterfaceLang)} liginde kalıyorsun`,
  pl: `Zostajesz w ${clubNamePlanned(newLeague.id, 'pl' as PlannedInterfaceLang)}`,
});

  const outcomeIcon = isPromo ? 'trending-up' : isDemo ? 'trending-down' : 'shield-checkmark';

  const btnText = isPromo
    ? triLang(lang, {
  ru: '🚀 Вперёд!',
  en: '🚀 Let’s go!',
  uk: '🚀 Уперед!',
  es: '🚀 ¡Adelante!',
  "pt-BR": '🚀 Vamos!',
  vi: '🚀 Tiến lên!',
  id: '🚀 Maju!',
  tr: '🚀 İleri!',
  pl: '🚀 Naprzód!',
})
    : isDemo
      ? triLang(lang, {
  ru: 'Попробую ещё раз',
  en: 'I’ll try again',
  uk: 'Спробую ще раз',
  es: 'Lo intentaré de nuevo',
  "pt-BR": 'Vou tentar de novo',
  vi: 'Mình sẽ thử lại',
  id: 'Coba lagi',
  tr: 'Tekrar deneyeceğim',
  pl: 'Spróbuję jeszcze raz',
})
      : triLang(lang, {
  ru: 'Продолжить',
  en: 'Continue',
  uk: 'Продовжити',
  es: 'Continuar',
  "pt-BR": 'Continuar',
  vi: 'Tiếp tục',
  id: 'Lanjutkan',
  tr: 'Devam et',
  pl: 'Kontynuuj',
});

  const motivation = isPromo
    ? triLang(lang, {
  ru: 'Новая лига — новые вызовы и бонусы!',
  en: 'New league: new challenges and bonuses!',
  uk: 'Нова ліга — нові виклики й бонуси!',
  es: '¡Nueva liga: nuevos retos y bonificaciones!',
  "pt-BR": 'Nova liga: novos desafios e bônus!',
  vi: 'Giải đấu mới: thử thách và thưởng mới!',
  id: 'Liga baru: tantangan dan bonus baru!',
  tr: 'Yeni lig: yeni meydan okumalar ve bonuslar!',
  pl: 'Nowa liga: nowe wyzwania i bonusy!',
})
    : isDemo
      ? triLang(lang, {
  ru: 'Не сдавайся — быстро вернёшься выше.',
  en: 'Don’t give up — you’ll climb back up soon.',
  uk: 'Не здавайся — швидко повернешся вище.',
  es: 'No te rindas: pronto volverás a subir.',
  "pt-BR": 'Não desista: logo você sobe de novo.',
  vi: 'Đừng bỏ cuộc: bạn sẽ sớm leo lên lại.',
  id: 'Jangan menyerah: kamu akan segera naik lagi.',
  tr: 'Vazgeçme: yakında tekrar yükselirsin.',
  pl: 'Nie poddawaj się: szybko wrócisz wyżej.',
})
      : triLang(lang, {
  ru: 'Хороший результат, держи темп!',
  en: 'Good result, keep the pace!',
  uk: 'Гарний результат, тримай темп!',
  es: 'Buen resultado, ¡mantén el ritmo!',
  "pt-BR": 'Bom resultado, mantenha o ritmo!',
  vi: 'Kết quả tốt, giữ nhịp nhé!',
  id: 'Hasil bagus, pertahankan ritmenya!',
  tr: 'İyi sonuç, tempoyu koru!',
  pl: 'Dobry wynik, trzymaj tempo!',
});

  // Старый pending-результат мог сохранить total только по живым игрокам,
  // хотя в его неизменяемом снимке группы уже есть боты. Для таких уже созданных
  // итогов чиним показ без изменения авторитетного исхода недели.
  const displayTotalInGroup = Math.max(result.totalInGroup, result.group.length);

  // Список и число «Твоё место» обязаны совпадать. Порядок собираем через общий
  // помощник движка: он сортирует по очкам и ставит мою строку ровно на
  // авторитетное серверное место. Делаем это и здесь (а не только при записи
  // pending), чтобы уже сохранённые на диске результаты из старых версий
  // приложения тоже показывались согласованно.
  const displayGroup = useMemo(
    () => orderGroupForResultDisplay(result.group, result.myRank),
    [result.group, result.myRank],
  );
  const top3 = displayGroup.slice(0, 3);
  const groupRows = displayGroup.map((member, index) => ({ member, place: index + 1 }));
  // Моё место для показа берём из той же строки, которую видно в списке.
  // Если меня в снимке группы нет (редкий сбой) — печатаем серверное число.
  const myDisplayIndex = displayGroup.findIndex(m => m?.isMe === true);
  const myDisplayRank = myDisplayIndex >= 0 ? myDisplayIndex + 1 : result.myRank;
  // Серверный total может быть больше снимка комнаты: тогда честно пишем,
  // сколько участников не поместилось, вместо молчаливого расхождения чисел.
  const hiddenMembers = Math.max(0, displayTotalInGroup - displayGroup.length);
  const zoneSize = getLeagueResultZoneSize(displayTotalInGroup);
  const relegationStartRank = displayTotalInGroup >= 2 && zoneSize > 0
    ? displayTotalInGroup - zoneSize + 1
    : displayTotalInGroup + 1;
  // XP-режим: повышение по набранным очкам, а не по месту. Тогда подпись зоны
  // не должна обещать «повышение с топ-N» (это правило про место) —
  // показываем XP-правило. Иначе текст противоречит исходу «Остаёшься».
  const xpPromotionMode = isLeagueXpPromotionEnabled();
  const xpPromotionThreshold = getLeagueXpPromotionThreshold();
  const modalPadTop = Math.max(12, insets.top + 8);
  const modalPadBottom = Math.max(12, bottomInset + 8);
  const modalMaxHeight = Math.min(H - 24, Math.max(280, H - modalPadTop - modalPadBottom));

  // ─── Подцвет градиентов ─────────────────────────────────────────────────
  // На светлой теме «герой» — не тёмная плита, а мягкая подложка в цвет исхода:
  // тёмный блок посреди белой карточки читался как дыра и резал её пополам.
  // Последняя остановка градиента = фон карточки под «героем», иначе на стыке
  // блоков появляется видимая горизонтальная граница.
  const cardGradient: [string, string, string] = isPromo
    ? (onLight
      ? ['#E2F2E7', '#EFF7F1', t.bgPrimary]
      : ['#0F2818', '#0A1F12', '#06140A'])
    : isDemo
      ? (onLight
        ? ['#FAE4E3', '#FBEFEE', t.bgPrimary]
        : ['#2A0E0C', '#1A0907', '#100404'])
      : [t.bgCard, t.bgCard, t.bgPrimary];

  const borderGradient: [string, string, string] = isPromo
    ? (onLight
      ? ['#C79A18', '#2E9B54', '#C79A18']
      : ['#FFD24A', '#34C759', '#FFD24A'])
    : isDemo
      ? (onLight
        ? ['#C4392F', '#7A1A1A', '#C4392F']
        : ['#FF453A', '#7A1A1A', '#FF453A'])
      : [palette.primary + 'AA', palette.primary + '55', palette.primary + 'AA'];

  const heroGradient: [string, string] = isPromo
    ? (onLight
      ? ['rgba(31,124,69,0.13)', 'rgba(31,124,69,0)']
      : ['rgba(52,199,89,0.22)', 'rgba(52,199,89,0)'])
    : isDemo
      ? (onLight
        ? ['rgba(176,42,36,0.12)', 'rgba(176,42,36,0)']
        : ['rgba(255,69,58,0.22)', 'rgba(255,69,58,0)'])
      : [club.color + (onLight ? '26' : '33'), club.color + '00'];

  // Заливка CTA: на светлой теме доводим её до того уровня, при котором белая
  // надпись держит AA. Иначе «Продолжить» тонуло в светло-зелёной кнопке.
  const ctaBase = isPromo ? '#34C759' : isDemo ? '#FF6B6B' : club.color;
  const ctaFill = onLight ? readableOn(ctaBase, '#FFFFFF', 4.5) : ctaBase;
  const ctaGradient: [string, string] = onLight
    ? [ctaFill, readableOn(ctaFill, '#FFFFFF', 6.5)]
    : isPromo
      ? ['#34C759', '#1FA34A']
      : isDemo
        ? ['#FF6B6B', '#D93B30']
        : [club.color, club.color];
  // Цвет надписи на кнопке считаем от реальной заливки, а не «всегда белый».
  const ctaTextColor = onLight ? buttonForegroundForBackground(ctaFill) : '#FFFFFF';

  // Подложки, которые раньше были «белым по прозрачному» — на светлом фоне их
  // просто не было видно.
  const scrimColor      = onLight ? 'rgba(23,32,29,0.55)' : 'rgba(0,0,0,0.86)';
  const closeButtonBg   = onLight ? 'rgba(23,32,29,0.08)' : 'rgba(255,255,255,0.06)';
  const transitionChipBg = onLight ? 'rgba(23,32,29,0.06)' : 'rgba(0,0,0,0.32)';
  const motivationBg    = onLight ? t.bgSurface : 'rgba(255,255,255,0.04)';

  // ─── Гибридная («Световод + Чекан») версия тела ────────────────────────
  // зачем: v2 включается ТОЛЬКО этим пропсом (владелец, план гибридного
  // редизайна) — боевой Modal/scrim/крестик/CTA переиспользуются один в один
  // из классической ветки ниже, меняется только содержимое карточки.
  if (motionVariant === 'hybrid') {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose} statusBarTranslucent>
        <View
          testID="league-result-modal"
          accessible={false}
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingTop: modalPadTop,
            paddingBottom: modalPadBottom,
          }}
        >
          {/* guard-ok: декоративный backdrop-тап, идентичен классической ветке — крестик рядом уже озвучен accessibilityLabel «Закрыть» */}
          <Pressable
            onPress={handleClose}
            style={StyleSheet.absoluteFill}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: scrimColor }]} />

          <View>
            <Animated.View
              style={{
                opacity: Animated.multiply(
                  cardOpacity,
                  exitProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                ),
                transform: [
                  { scale: cardScale },
                  { scale: exitProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) },
                  { translateY: exitProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) },
                ],
                shadowColor: palette.glow,
                shadowOffset: { width: 0, height: 16 },
                shadowOpacity: 0.45,
                shadowRadius: 28, // guard-ok: тень унаследована 1:1 из классической ветки (уже прод), не новый расход
                elevation: 24,
              }}
            >
              <LinearGradient
                colors={borderGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ borderRadius: 28, padding: 1.5 }}
              >
                <View style={{
                  width: CARD_W,
                  height: modalMaxHeight,
                  borderRadius: 26,
                  overflow: 'hidden',
                  backgroundColor: t.bgPrimary,
                }}>
                  <LeagueResultHybrid
                    visible={visible}
                    result={result}
                    onClose={handleClose}
                    reduceMotion={reduceMotion}
                    previewMode={previewMode}
                  />

                  {/* Кнопка-крестик — общая с классической версией */}
                  <TouchableOpacity
                    testID="league-result-close-button"
                    onPress={handleClose}
                    accessibilityLabel={triLang(lang, {
  ru: 'Закрыть',
  en: 'Close',
  uk: 'Закрити',
  es: 'Cerrar',
  "pt-BR": 'Fechar',
  vi: 'Đóng',
  id: 'Tutup',
  tr: 'Kapat',
  pl: 'Zamknij',
})}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={{
                      position: 'absolute', top: 10, right: 10, zIndex: 4,
                      width: 30, height: 30, borderRadius: 15,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: closeButtonBg,
                    }}
                  >
                    <Ionicons name="close" size={18} color={onLight ? t.textPrimary : t.textMuted} />
                  </TouchableOpacity>

                  {/* CTA — общий с классической версией (тот же текст/цвета/блик) */}
                  <Animated.View style={{
                    position: 'absolute', left: 0, right: 0, bottom: 0,
                    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 20,
                    opacity: intro.interpolate({ inputRange: [0.7, 0.94], outputRange: [0, 1], extrapolate: 'clamp' }),
                    transform: [{
                      translateY: intro.interpolate({ inputRange: [0.7, 0.94], outputRange: [12, 0], extrapolate: 'clamp' }),
                    }],
                  }}>
                    <TouchableOpacity
                      testID="league-result-continue-button"
                      activeOpacity={0.9}
                      onPress={handleClose}
                      accessibilityRole="button"
                      accessibilityLabel={btnText}
                    >
                      <View style={{
                        borderRadius: 16,
                        overflow: 'hidden',
                        shadowColor: palette.primary,
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.45,
                        shadowRadius: 10,
                        ...noAndroidOutline,
                      }}>
                        <LinearGradient
                          colors={ctaGradient}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={{ paddingVertical: 16, alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{
                            color: ctaTextColor,
                            fontSize: f.bodyLg,
                            fontWeight: '900',
                            letterSpacing: 0.5,
                          }}>
                            {btnText}
                          </Text>
                        </LinearGradient>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </LinearGradient>
            </Animated.View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose} statusBarTranslucent>
      <View
        testID="league-result-modal"
        accessible={false}
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingTop: modalPadTop,
          paddingBottom: modalPadBottom,
        }}
      >
        <Pressable onPress={handleClose} style={StyleSheet.absoluteFill} />
        {/* ─── Фон-затемнение + цветной радиальный отблеск ──────────────── */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: scrimColor }]} />
          <LinearGradient
            colors={[palette.glow + (onLight ? '1F' : '33'), 'transparent']}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.7 }}
            style={[StyleSheet.absoluteFill]}
          />
          <LinearGradient
            colors={['transparent', palette.glow + (onLight ? '0D' : '14')]}
            start={{ x: 0.5, y: 0.5 }} end={{ x: 0.5, y: 1 }}
            style={[StyleSheet.absoluteFill]}
          />
        </View>

        {/* ─── Карточка с градиентной обводкой ───────────────────────────── */}
        <View>
          <Animated.View
            style={{
              opacity: Animated.multiply(
                cardOpacity,
                exitProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              ),
              transform: [
                { scale: cardScale },
                { scale: exitProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) },
                { translateY: exitProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) },
              ],
              shadowColor: palette.glow,
              shadowOffset: { width: 0, height: 16 },
              shadowOpacity: 0.45,
              shadowRadius: 28,
              elevation: 24,
            }}
          >
            {/* Градиентная рамка */}
            <LinearGradient
              colors={borderGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={{ borderRadius: 28, padding: 1.5 }}
            >
              <View style={{
                width: CARD_W,
                height: modalMaxHeight,
                borderRadius: 26,
                overflow: 'hidden',
                backgroundColor: t.bgPrimary,
              }}>
                {/* ── HERO (заголовок + иконка клуба + переход лиг) ─── */}
                <View style={{ paddingTop: 22, paddingBottom: 14, alignItems: 'center', overflow: 'hidden' }}>
                  <LinearGradient
                    colors={cardGradient}
                    style={StyleSheet.absoluteFill}
                  />
                  <LinearGradient
                    colors={heroGradient}
                    style={StyleSheet.absoluteFill}
                  />

                  {/* Кнопка-крестик */}
                  <TouchableOpacity
                    testID="league-result-close-button"
                    onPress={handleClose}
                    accessibilityLabel={triLang(lang, {
  ru: 'Закрыть',
  en: 'Close',
  uk: 'Закрити',
  es: 'Cerrar',
  "pt-BR": 'Fechar',
  vi: 'Đóng',
  id: 'Tutup',
  tr: 'Kapat',
  pl: 'Zamknij',
})}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={{
                      position: 'absolute', top: 10, right: 10, zIndex: 4,
                      width: 30, height: 30, borderRadius: 15,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: closeButtonBg,
                    }}
                  >
                    <Ionicons name="close" size={18} color={onLight ? t.textPrimary : t.textMuted} />
                  </TouchableOpacity>

                  {/* Заголовок */}
                  <Animated.Text
                    style={{
                      ...introStyle(0, 0.22, 10),
                      color: t.textMuted,
                      fontSize: f.label,
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                      fontWeight: '700',
                      marginBottom: 12,
                    }}
                  >
                    {titleText}
                  </Animated.Text>

                  {/* Иконка клуба + хало */}
                  <View style={{ width: 132, height: 132, alignItems: 'center', justifyContent: 'center' }}>
                    <ClubHalo
                      active={visible}
                      reduceMotion={reduceMotion}
                      color={haloColor}
                      size={84}
                      intensity={isStay ? 0.7 : 1}
                    />
                    <Animated.View style={{ transform: [{ scale: heroIconScale }] }}>
                      <Image
                        source={club.imageUri}
                        style={{ width: 104, height: 104 }}
                        contentFit="contain"
                      />
                    </Animated.View>
                  </View>

                  {/* Чип исхода */}
                  <Animated.View
                    style={{
                      ...introStyle(0.12, 0.38, 12),
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: palette.primary + (onLight ? '1A' : '22'),
                      marginTop: 8,
                    }}
                  >
                    <Ionicons name={outcomeIcon as any} size={16} color={palette.primary} />
                    <Text style={{
                      color: palette.primary,
                      fontSize: f.body,
                      fontWeight: '800',
                      letterSpacing: 0.3,
                    }}>
                      {outcomeText}
                    </Text>
                  </Animated.View>

                  {/* Переход лиг (если меняется) */}
                  {(isPromo || isDemo) && (
                    <Animated.View
                      style={{
                        ...introStyle(0.2, 0.46, 10),
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 12,
                        paddingHorizontal: 12, paddingVertical: 6,
                        borderRadius: 12,
                        backgroundColor: transitionChipBg,
                      }}
                    >
                      <Image source={prevLeague.imageUri} style={{ width: 18, height: 18, opacity: 0.7 }} contentFit="contain" />
                      <Text style={{ color: t.textMuted, fontSize: f.caption }}>
                        {triLang(lang, {
  ru: prevLeague.nameRU,
  en: prevLeague.nameES,
  uk: prevLeague.nameUK,
  es: prevLeague.nameES,
  "pt-BR": clubNamePlanned(prevLeague.id, 'pt-BR' as PlannedInterfaceLang),
  vi: clubNamePlanned(prevLeague.id, 'vi' as PlannedInterfaceLang),
  id: clubNamePlanned(prevLeague.id, 'id' as PlannedInterfaceLang),
  tr: clubNamePlanned(prevLeague.id, 'tr' as PlannedInterfaceLang),
  pl: clubNamePlanned(prevLeague.id, 'pl' as PlannedInterfaceLang),
})}
                      </Text>
                      <Ionicons
                        name={isPromo ? 'arrow-forward' : 'arrow-back'}
                        size={14}
                        color={palette.primary}
                      />
                      <Image source={newLeague.imageUri} style={{ width: 18, height: 18 }} contentFit="contain" />
                      <Text style={{ color: palette.primary, fontSize: f.caption, fontWeight: '700' }}>
                        {triLang(lang, {
  ru: newLeague.nameRU,
  en: newLeague.nameES,
  uk: newLeague.nameUK,
  es: newLeague.nameES,
  "pt-BR": clubNamePlanned(newLeague.id, 'pt-BR' as PlannedInterfaceLang),
  vi: clubNamePlanned(newLeague.id, 'vi' as PlannedInterfaceLang),
  id: clubNamePlanned(newLeague.id, 'id' as PlannedInterfaceLang),
  tr: clubNamePlanned(newLeague.id, 'tr' as PlannedInterfaceLang),
  pl: clubNamePlanned(newLeague.id, 'pl' as PlannedInterfaceLang),
})}
                      </Text>
                    </Animated.View>
                  )}
                </View>

                {/* ── RANK + RESULT ZONE ─────────────────────────── */}
                <ScrollView
                  style={{ flex: 1 }}
                  decelerationRate="fast"
                  contentContainerStyle={{ paddingBottom: 4 }}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                <Animated.View
                  style={{
                    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8,
                    alignItems: 'center',
                    opacity: intro.interpolate({
                      inputRange: [0.24, 0.48], outputRange: [0, 1], extrapolate: 'clamp',
                    }),
                    transform: [{ scale: rankScale }],
                  }}
                >
                  <Text style={{
                    color: t.textMuted,
                    fontSize: f.label,
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                    fontWeight: '700',
                  }}>
                    {triLang(lang, {
  ru: 'Твоё место',
  en: 'Your rank',
  uk: 'Твоє місце',
  es: 'Tu puesto',
  "pt-BR": 'Sua posição',
  vi: 'Vị trí của bạn',
  id: 'Posisimu',
  tr: 'Sıralaman',
  pl: 'Twoje miejsce',
})}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 2 }}>
                    <Text style={{
                      color: palette.primary,
                      fontSize: 64,
                      fontWeight: '900',
                      lineHeight: 70,
                      letterSpacing: -1.5,
                      // Свечение под цифрой на светлом фоне только размывает её.
                      ...(onLight ? null : {
                        textShadowColor: palette.glow + '99',
                        textShadowRadius: 12,
                      }),
                    }}>
                      {myDisplayRank}
                    </Text>
                    <Text style={{
                      color: t.textMuted,
                      fontSize: f.body,
                      fontWeight: '600',
                      marginLeft: 6,
                    }}>
                      / {displayTotalInGroup}
                    </Text>
                  </View>

                  {/* Зона результата */}
                  {(zoneSize > 0 || xpPromotionMode) && (
                    <View style={{
                      marginTop: 8,
                      paddingHorizontal: 10, paddingVertical: 5,
                      borderRadius: 10,
                      backgroundColor: t.bgSurface,
                      flexDirection: 'row', alignItems: 'center', gap: 6,
                    }}>
                      <Ionicons
                        name={(isPromo ? 'trending-up' : isDemo ? 'trending-down' : 'flag') as any}
                        size={12}
                        color={isDemo
                          ? ink('#FF6B6B', 4.5)
                          : isPromo
                            ? ink('#34C759', 4.5)
                            : (onLight ? readableOn(t.gold, t.bgSurface, 4.5) : t.gold)}
                      />
                      <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '700' }}>
                        {(() => {
                          const xpLabel = xpPromotionThreshold.toLocaleString();
                          // Порог повышения — руны за неделю (владелец,
                          // 2026-08-26: «весь раздел лига переходит на руны»).
                          const xpWord = runeWord(lang, xpPromotionThreshold);
                          if (isPromo) {
                            // В XP-режиме повышение объясняем набранными очками, а не местом.
                            return xpPromotionMode
                              ? triLang(lang, {
  ru: `Повышение: ${xpLabel} ${xpWord}`,
  en: `Promotion: ${xpLabel} ${xpWord}`,
  uk: `Підвищення: ${xpLabel} ${xpWord}`,
  es: `Ascenso: ${xpLabel} ${xpWord}`,
  "pt-BR": `Promoção: ${xpLabel} ${xpWord}`,
  vi: `Thăng hạng: ${xpLabel} ${xpWord}`,
  id: `Naik: ${xpLabel} ${xpWord}`,
  tr: `Yükselme: ${xpLabel} ${xpWord}`,
  pl: `Awans: ${xpLabel} ${xpWord}`,
})
                              : triLang(lang, {
  ru: `Повышение: топ-${zoneSize}`,
  en: `Promotion: top ${zoneSize}`,
  uk: `Підвищення: топ-${zoneSize}`,
  es: `Ascenso: top ${zoneSize}`,
  "pt-BR": `Promoção: top ${zoneSize}`,
  vi: `Thăng hạng: top ${zoneSize}`,
  id: `Naik: top ${zoneSize}`,
  tr: `Yükselme: ilk ${zoneSize}`,
  pl: `Awans: top ${zoneSize}`,
});
                          }
                          if (isDemo) {
                            return triLang(lang, {
  ru: `Зона понижения: ${relegationStartRank}-${displayTotalInGroup}`,
  en: `Relegation zone: ${relegationStartRank}-${displayTotalInGroup}`,
  uk: `Зона пониження: ${relegationStartRank}-${displayTotalInGroup}`,
  es: `Descenso: ${relegationStartRank}-${displayTotalInGroup}`,
  "pt-BR": `Rebaixamento: ${relegationStartRank}-${displayTotalInGroup}`,
  vi: `Xuống hạng: ${relegationStartRank}-${displayTotalInGroup}`,
  id: `Turun: ${relegationStartRank}-${displayTotalInGroup}`,
  tr: `Düşme: ${relegationStartRank}-${displayTotalInGroup}`,
  pl: `Spadek: ${relegationStartRank}-${displayTotalInGroup}`,
});
                          }
                          // isStay: описываем УСЛОВИЕ повышения, а не утверждаем, что юзер повышен.
                          // XP-режим → нужно набрать N XP; rank-режим → войти в топ-N.
                          return xpPromotionMode
                            ? triLang(lang, {
  ru: `Для повышения: ${xpLabel} ${xpWord}`,
  en: `To be promoted: ${xpLabel} ${xpWord}`,
  uk: `Для підвищення: ${xpLabel} ${xpWord}`,
  es: `Para ascender: ${xpLabel} ${xpWord}`,
  "pt-BR": `Para subir: ${xpLabel} ${xpWord}`,
  vi: `Để thăng hạng: ${xpLabel} ${xpWord}`,
  id: `Untuk naik: ${xpLabel} ${xpWord}`,
  tr: `Yükselmek için: ${xpLabel} ${xpWord}`,
  pl: `Aby awansować: ${xpLabel} ${xpWord}`,
})
                            : triLang(lang, {
  ru: `Зона повышения: топ-${zoneSize}`,
  en: `Promotion zone: top ${zoneSize}`,
  uk: `Зона підвищення: топ-${zoneSize}`,
  es: `Zona de ascenso: top ${zoneSize}`,
  "pt-BR": `Zona de promoção: top ${zoneSize}`,
  vi: `Vùng thăng hạng: top ${zoneSize}`,
  id: `Zona naik: top ${zoneSize}`,
  tr: `Yükselme bölgesi: ilk ${zoneSize}`,
  pl: `Strefa awansu: top ${zoneSize}`,
});
                        })()}
                      </Text>
                    </View>
                  )}
                </Animated.View>

                {/* ── PODIUM (top-3) ──────────────────────────────── */}
                {top3.length === 3 && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      gap: 8,
                      paddingHorizontal: 18,
                      marginTop: 8,
                    }}
                  >
                    {/* Колонны вырастают снизу и по очереди: серебро → золото → бронза.
                        Раньше весь подиум просто выезжал одним блоком. */}
                    <PodiumColumn member={top3[1]} place={2} intro={intro} from={0.40} onLight={onLight} themeMode={themeMode} f={f} t={t} lang={lang} />
                    <PodiumColumn member={top3[0]} place={1} intro={intro} from={0.46} onLight={onLight} themeMode={themeMode} f={f} t={t} lang={lang} />
                    <PodiumColumn member={top3[2]} place={3} intro={intro} from={0.52} onLight={onLight} themeMode={themeMode} f={f} t={t} lang={lang} />
                  </View>
                )}

                {/* ── СПИСОК ГРУППЫ ───────────────────────────────── */}
                <Animated.View style={{ ...introStyle(0.5, 0.72, 10), marginTop: 12 }}>
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 18, marginBottom: 4,
                  }}>
                    <Text style={{
                      color: t.textMuted,
                      fontSize: f.label,
                      letterSpacing: 1.2,
                      textTransform: 'uppercase',
                      fontWeight: '700',
                    }}>
                      {triLang(lang, {
  ru: 'Группа недели',
  en: 'Weekly group',
  uk: 'Група тижня',
  es: 'Grupo de la semana',
  "pt-BR": 'Grupo da semana',
  vi: 'Nhóm tuần này',
  id: 'Grup minggu ini',
  tr: 'Haftanın grubu',
  pl: 'Grupa tygodnia',
})}
                    </Text>
                    <Text style={{ color: t.textGhost, fontSize: f.caption, fontWeight: '600' }}>
                      {displayTotalInGroup} {triLang(lang, {
  ru: 'чел.',
  en: 'people',
  uk: 'осіб',
  es: 'pers.',
  "pt-BR": 'pess.',
  vi: 'người',
  id: 'org',
  tr: 'kişi',
  pl: 'os.',
})}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingBottom: 4 }}>
                    {groupRows.map(({ member, place }, i) => (
                      <GroupRow
                        key={`${member.uid ?? member.botId ?? member.name}-${i}`}
                        member={member}
                        place={place}
                        index={i}
                        intro={intro}
                        onLight={onLight}
                        palette={palette}
                        myRowGlow={myRowGlow}
                        themeMode={themeMode}
                        t={t}
                        f={f}
                        lang={lang}
                      />
                    ))}
                    {hiddenMembers > 0 && (
                      <Text style={{
                        color: t.textGhost, fontSize: f.caption,
                        textAlign: 'center', paddingVertical: 8,
                      }}>
                        {`+${hiddenMembers} `}{triLang(lang, {
  ru: 'участников',
  en: 'participants',
  uk: 'учасників',
  es: 'participantes',
  "pt-BR": 'participantes',
  vi: 'người tham gia',
  id: 'peserta',
  tr: 'katılımcı',
  pl: 'uczestników',
})}
                      </Text>
                    )}
                  </View>
                </Animated.View>

                {/* ── REWARD STRIP (бонус новой лиги) ─────────────── */}
                {(isPromo || isStay) && (
                  <Animated.View
                    style={{
                      marginHorizontal: 18,
                      marginTop: 10,
                      borderRadius: 14,
                      overflow: 'hidden',
                      ...introStyle(0.62, 0.84, 12),
                    }}
                  >
                    <LinearGradient
                      colors={onLight
                        ? [palette.primary + '0F', palette.primary + '06']
                        : [palette.primary + '20', palette.primary + '08']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10,
                        paddingHorizontal: 12, paddingVertical: 10,
                        borderRadius: 14,
                      }}
                    >
                      <View style={{
                        width: 32, height: 32, borderRadius: 10,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: palette.primary + '33',
                      }}>
                        <Ionicons name="flash" size={18} color={palette.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                          {triLang(lang, {
  ru: newLeague.tagRU,
  en: newLeague.tagES,
  uk: newLeague.tagUK,
  es: newLeague.tagES,
  "pt-BR": clubDescPlanned(newLeague.id, 'pt-BR' as PlannedInterfaceLang),
  vi: clubDescPlanned(newLeague.id, 'vi' as PlannedInterfaceLang),
  id: clubDescPlanned(newLeague.id, 'id' as PlannedInterfaceLang),
  tr: clubDescPlanned(newLeague.id, 'tr' as PlannedInterfaceLang),
  pl: clubDescPlanned(newLeague.id, 'pl' as PlannedInterfaceLang),
})}
                        </Text>
                        <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 1 }}>
                          {isPromo
                            ? triLang(lang, {
  ru: 'Бонус активирован — новая лига!',
  en: 'Bonus activated — new league!',
  uk: 'Бонус активовано — нової ліги!',
  es: '¡Bonificación activada: nueva liga!',
  "pt-BR": 'Bônus ativado: nova liga!',
  vi: 'Đã kích hoạt thưởng: giải đấu mới!',
  id: 'Bonus aktif: liga baru!',
  tr: 'Bonus aktif: yeni lig!',
  pl: 'Bonus aktywowany: nowa liga!',
})
                            : triLang(lang, {
  ru: 'Бонус лиги действует',
  en: 'League bonus is active',
  uk: 'Бонус ліги діє',
  es: 'La bonificación de la liga está activa',
  "pt-BR": 'O bônus da liga está ativo',
  vi: 'Thưởng giải đấu đang hoạt động',
  id: 'Bonus liga aktif',
  tr: 'Lig bonusu aktif',
  pl: 'Bonus ligi jest aktywny',
})}
                        </Text>
                      </View>
                    </LinearGradient>
                  </Animated.View>
                )}

                {isDemo && (
                  <Animated.View
                    style={{
                      marginHorizontal: 18,
                      marginTop: 10,
                      borderRadius: 14,
                      paddingHorizontal: 14, paddingVertical: 10,
                      backgroundColor: motivationBg,
                      ...introStyle(0.62, 0.84, 12),
                    }}
                  >
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                      {motivation}
                    </Text>
                  </Animated.View>
                )}

                {/* ── CTA ─────────────────────────────────────────── */}
                </ScrollView>

                <Animated.View style={{ ...introStyle(0.7, 0.94, 12), paddingHorizontal: 18, paddingTop: 14, paddingBottom: 20 }}>
                  <TouchableOpacity
                    testID="league-result-continue-button"
                    activeOpacity={0.9}
                    onPress={handleClose}
                    accessibilityRole="button"
                    accessibilityLabel={btnText}
                  >
                    <View style={{
                      borderRadius: 16,
                      overflow: 'hidden',
                      shadowColor: palette.primary,
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.45,
                      shadowRadius: 10,
                      ...noAndroidOutline,
                    }}>
                      <LinearGradient
                        colors={ctaGradient}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{ paddingVertical: 16, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{
                          color: ctaTextColor,
                          fontSize: f.bodyLg,
                          fontWeight: '900',
                          letterSpacing: 0.5,
                        }}>
                          {btnText}
                        </Text>

                        {/* Блик-волна */}
                        <Animated.View
                          pointerEvents="none"
                          style={{
                            position: 'absolute',
                            top: 0, bottom: 0,
                            left: -80,
                            width: 80,
                            transform: [{
                              translateX: btnShine.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, CARD_W],
                              }),
                            }, { skewX: '-20deg' }],
                          }}
                        >
                          <LinearGradient
                            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
                            start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                            style={{ flex: 1 }}
                          />
                        </Animated.View>
                      </LinearGradient>
                    </View>
                  </TouchableOpacity>
                </Animated.View>

              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  PodiumColumn — мини-колонка подиума (1/2/3 место)
// ════════════════════════════════════════════════════════════════════════════
const PODIUM_HEIGHTS = { 1: 58, 2: 44, 3: 36 } as const;
const PODIUM_COLORS  = {
  1: { primary: '#FFD24A', glow: '#FFD24A' },
  2: { primary: '#C7CCD1', glow: '#C7CCD1' },
  3: { primary: '#E0915C', glow: '#E0915C' },
} as const;
// Металлические жетоны мест (золото/серебро/бронза) вместо эмодзи-медалей.
const MEDAL_TOKEN: Record<1 | 2 | 3, { grad: [string, string]; ink: string; ring: string }> = {
  1: { grad: ['#FFE89A', '#E0A124'], ink: '#5A3C06', ring: '#FFF1CC' },
  2: { grad: ['#EAEEF3', '#A9B2BD'], ink: '#3A4150', ring: '#FFFFFF' },
  3: { grad: ['#F0C29A', '#B4774A'], ink: '#4A2D14', ring: '#FBE0CC' },
};

/** Круглый металлический жетон места — замена эмодзи-медали. */
const MedalToken = memo(function MedalToken({ place, size = 22, onLight = false }: {
  place: 1 | 2 | 3;
  size?: number;
  /** На светлой карточке белая обводка жетона исчезает — берём тёмную. */
  onLight?: boolean;
}) {
  const cfg = MEDAL_TOKEN[place];
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2, overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: onLight ? 'rgba(23,32,29,0.24)' : cfg.ring,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
    }}>
      <LinearGradient colors={cfg.grad} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', backgroundColor: 'rgba(255,255,255,0.35)' }} />
      <Text style={{ color: cfg.ink, fontSize: size * 0.55, fontWeight: '900' }}>{place}</Text>
    </View>
  );
});

const PodiumColumn = memo(function PodiumColumn({
  member, place, intro, from, onLight, themeMode, t, f, lang,
}: {
  member: GroupMember;
  place: 1 | 2 | 3;
  /** Общий драйвер каскада модалки (0→1). */
  intro: Animated.Value;
  /** Точка старта этой колонны на шкале каскада. */
  from: number;
  /** Светлая ли карточка — от этого зависят читаемые тона металлов. */
  onLight: boolean;
  themeMode: string;
  t: any;
  f: any;
  lang: Lang;
}) {
  const cfg    = PODIUM_COLORS[place];
  const height = PODIUM_HEIGHTS[place];
  // Металлы придуманы для тёмного фона: серебро на белом даёт 1.6:1. Для
  // ТЕКСТА берём затемнённый тон (AA), для САМОЙ КОЛОННЫ — чуть притушенный,
  // иначе светлая плашка сливается с карточкой.
  const inkColor = onLight ? readableOn(cfg.primary, t.bgPrimary, 4.5) : cfg.primary;
  const barColor = onLight ? readableOn(cfg.primary, '#FFFFFF', 2.2) : cfg.primary;
  const to     = Math.min(from + 0.2, 1);
  const headStyle = useMemo(() => ({
    opacity: intro.interpolate({ inputRange: [from, to], outputRange: [0, 1], extrapolate: 'clamp' as const }),
    transform: [{
      translateY: intro.interpolate({
        inputRange: [from, to], outputRange: [10, 0], extrapolate: 'clamp' as const,
      }),
    }],
  }), [intro, from, to]);
  // Рост колонны снизу вверх. У RN нет transformOrigin, поэтому классический
  // приём: сдвинуть на половину высоты, масштабировать, вернуть обратно.
  const growStyle = useMemo(() => ({
    transform: [
      { translateY: height / 2 },
      {
        scaleY: intro.interpolate({
          inputRange: [from, to], outputRange: [0.02, 1], extrapolate: 'clamp' as const,
        }),
      },
      { translateY: -height / 2 },
    ],
  }), [intro, from, to, height]);
  const xp     = member?.totalXp ?? 0;
  const avatar = member?.avatar ?? String(getBestAvatarForLevel(getLevelFromXP(xp)));
  const effectiveAura = getEffectiveAvatarAuraId(member?.aura, member?.isPremium, member?.isVip);
  const usesPremiumAura = effectiveAura === PREMIUM_AVATAR_AURA_ID;
  const name   = (member?.name ?? '—').slice(0, 10);

  return (
    <View style={{ flex: 1, alignItems: 'center', maxWidth: 110 }}>
      {/* Аватар + медаль */}
      <Animated.View style={{ ...headStyle, alignItems: 'center', marginBottom: 6 }}>
        <PremiumAvatarHalo
          enabled={usesPremiumAura}
          avatarSize={place === 1 ? 44 : 36}
          maskColor={t.bgCard}
        >
          <AvatarView
            avatar={avatar}
            totalXP={xp}
            size={place === 1 ? 44 : 36}
            auraId={usesPremiumAura ? undefined : effectiveAura}
          />
        </PremiumAvatarHalo>
        <View style={{ position: 'absolute', top: -8, right: -8 }}>
          <MedalToken place={place} size={place === 1 ? 24 : 20} onLight={onLight} />
        </View>
      </Animated.View>

      {/* Имя */}
      {/* зачем: убран авто-сжимающий пропс шрифта (запрещённый паттерн, контракт layout
          stability) — имя уже обрезано до 10 символов выше (name = member?.name?.slice(0, 10)),
          так что при f.caption и maxWidth 104 оно и без сжатия помещается в одну строку;
          numberOfLines=1 подстрахует. guard-ok */}
      <Animated.Text
        numberOfLines={1}
        style={[memberNameStatusStyle(
          {
            color: member?.isMe ? inkColor : t.textPrimary,
            fontSize: f.caption,
            fontWeight: member?.isMe ? '900' : '700',
            maxWidth: 104,
            textAlign: 'center',
          },
          // surface: под ником лежит тело карточки — по нему и подбирается
          // читаемый оттенок золота для Plus/VIP.
          { isPremium: !!member?.isPremium, isVip: !!member?.isVip, themeMode, surface: t.bgPrimary },
        ), headStyle]}
      >
        {name}{member?.isMe ? triLang(lang, {
  ru: ' (ты)',
  en: ' (you)',
  uk: ' (ти)',
  es: ' (tú)',
  "pt-BR": ' (você)',
  vi: ' (bạn)',
  id: ' (kamu)',
  tr: ' (sen)',
  pl: ' (ty)',
}) : ''}
      </Animated.Text>

      {/* Очки */}
      <Animated.Text style={{ ...headStyle, color: inkColor, fontSize: f.caption, fontWeight: '800', marginTop: 1 }}>
        {member?.points ?? 0}
      </Animated.Text>

      {/* Колонна */}
      <Animated.View style={{ ...growStyle, width: '92%', marginTop: 6 }}>
        <LinearGradient
          colors={[barColor, barColor + (onLight ? 'BB' : '88')]}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
          style={{
            width: '100%',
            height,
            borderTopLeftRadius: 8, borderTopRightRadius: 8,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: cfg.glow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 6,
          }}
        >
          <Text style={{ color: 'rgba(0,0,0,0.55)', fontSize: 18, fontWeight: '900' }}>{place}</Text>
        </LinearGradient>
      </Animated.View>
    </View>
  );
});

// ════════════════════════════════════════════════════════════════════════════
//  GroupRow — строка участника группы
// ════════════════════════════════════════════════════════════════════════════
const GroupRow = memo(function GroupRow({
  member, place, index, intro, onLight, palette, myRowGlow, themeMode, t, f, lang,
}: {
  member: GroupMember;
  place: number;
  /** Порядковый номер строки — задаёт задержку в каскаде появления. */
  index: number;
  intro: Animated.Value;
  onLight: boolean;
  palette: { primary: string; accent: string; glow: string };
  myRowGlow: Animated.Value;
  themeMode: string;
  t: any;
  f: any;
  lang: Lang;
}) {
  const xp     = member.totalXp ?? 0;
  const avatar = member.avatar ?? String(getBestAvatarForLevel(getLevelFromXP(xp)));
  const effectiveAura = getEffectiveAvatarAuraId(member.aura, member.isPremium, member.isVip);
  const usesPremiumAura = effectiveAura === PREMIUM_AVATAR_AURA_ID;
  const isTop3 = place <= 3;
  const rowBg  = member.isMe
    ? palette.primary + (onLight ? '1A' : '22')
    : 'transparent';
  // t.gold в светлой теме (#8B6320) даёт на теле карточки 4.05:1 — чуть ниже AA.
  // Дотягиваем локально, не трогая токен темы: он используется десятками экранов.
  const pointsColor = isTop3
    ? (onLight ? readableOn(t.gold, t.bgPrimary, 4.5) : t.gold)
    : member.isMe ? palette.primary : t.textMuted;

  const glowOpacity = useMemo(
    () => myRowGlow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.95] }),
    [myRowGlow],
  );

  // Каскад строк: первые ROW_CASCADE_LIMIT выезжают волной, остальные видны
  // сразу — ниже сгиба их всё равно не видно, а интерполяции стоят кадров.
  const rowStyle = useMemo(() => {
    if (index >= ROW_CASCADE_LIMIT) return null;
    const from = Math.min(0.54 + index * 0.035, 0.94);
    const to = Math.min(from + 0.14, 1);
    return {
      opacity: intro.interpolate({ inputRange: [from, to], outputRange: [0, 1], extrapolate: 'clamp' as const }),
      transform: [{
        translateX: intro.interpolate({
          inputRange: [from, to], outputRange: [14, 0], extrapolate: 'clamp' as const,
        }),
      }],
    };
  }, [intro, index]);

  return (
    <Animated.View style={{
      ...(rowStyle ?? {}),
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 10, paddingVertical: 8,
      marginVertical: 2,
      borderRadius: 12,
      backgroundColor: rowBg,
      overflow: 'hidden',
    }}>
      {/* Светящийся бордер моей строки */}
      {member.isMe && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: 3, borderRadius: 2,
            backgroundColor: palette.primary,
            opacity: glowOpacity,
            shadowColor: palette.glow,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9, shadowRadius: 4,
          }}
        />
      )}

      {/* Место */}
      <View style={{ width: 28, alignItems: 'center', marginRight: 6 }}>
        {isTop3 ? (
          <MedalToken place={place as 1 | 2 | 3} size={22} onLight={onLight} />
        ) : (
          <Text style={{
            color: t.textMuted, fontSize: f.body, fontWeight: '700',
          }}>
            {place}
          </Text>
        )}
      </View>

      {/* Аватар */}
      <PremiumAvatarHalo
        enabled={usesPremiumAura}
        avatarSize={32}
        maskColor={member.isMe ? t.bgCard : t.bgPrimary}
        style={{ marginRight: 10 }}
      >
        <AvatarView avatar={avatar} totalXP={xp} size={32} auraId={usesPremiumAura ? undefined : effectiveAura} />
      </PremiumAvatarHalo>

      {/* Имя */}
      <Text
        numberOfLines={1}
        style={memberNameStatusStyle(
          {
            flex: 1,
            fontSize: f.body,
            color: member.isMe ? t.textPrimary : t.textPrimary,
            fontWeight: member.isMe ? '800' : '600',
          },
          { isPremium: !!member.isPremium, isVip: !!member.isVip, themeMode, surface: t.bgPrimary },
        )}
      >
        {member.name}{member.isMe ? triLang(lang, {
  ru: ' (ты)',
  en: ' (you)',
  uk: ' (ти)',
  es: ' (tú)',
  "pt-BR": ' (você)',
  vi: ' (bạn)',
  id: ' (kamu)',
  tr: ' (sen)',
  pl: ' (ty)',
}) : ''}
      </Text>

      {/* Очки */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Ionicons
          name="star"
          size={12}
          color={pointsColor}
        />
        <Text style={{
          color: pointsColor,
          fontSize: f.body,
          fontWeight: '800',
        }}>
          {member.points}
        </Text>
      </View>
    </Animated.View>
  );
});
