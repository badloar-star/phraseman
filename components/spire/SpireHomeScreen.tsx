// ═══════════════════════════════════════════════════════════════════════════
// SpireHomeScreen.tsx — главный экран «Шпиль» (пакеты A + C, без игры).
//
// зачем (владелец): перенести макет spire.html «1 в 1», но только на РЕАЛЬНЫХ данных и
// за двумя замками. Замок 1 — сегмент в «Сообществе» (app/spire_tab_flag.ts). Замок 2 —
// этот экран: пока config.enabled из config/spire_v1 выключен, он показывает
// «откроется чуть позже» и не читает ни локальную неделю, ни сервер. Здесь нет вызовов
// комнаты недели, отправки очереди и загрузки пакета недели — это пакет B/D; клиент не
// должен дёргать серверные функции, которые сами флаг Шпиля не проверяют.
//
// Firebase-экономия: единственное чтение — loadSpireConfig() (кэш 6 часов). Локальная
// неделя — AsyncStorage. Новых обращений к сети нет.
//
// СПЕРВА ЛОГИ: префикс [SPIRE] — вход, откуда данные, причина каждого раннего выхода.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { spireReadWeekLocal } from '../../app/spire_report_client';
import { loadSpireConfig } from '../../app/spire_config_client';
import { DebugLogger } from '../../app/debug-logger';
import { getCanonicalUserId } from '../../app/user_id_policy';
import { useTabNav } from '../../app/TabContext';
import { V2, V2_TYPE } from '../../constants/v2Style';
import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import { useTabContentBottomPad } from '../../hooks/use-tab-content-bottom-pad';
import { SPIRE_CONFIG_DEFAULTS, type SpireConfigDoc } from '../../modules/spire/config_contract';
import type { SpireLang, SpireWeekLocal } from '../../modules/spire/report_queue';
import { spireWeekStartMs } from '../../modules/spire/residents';
import { spireTierName } from '../../modules/spire/tier_names';
import EnergyBar from '../EnergyBar';
import { useLang } from '../LangContext';
import { usePremium } from '../PremiumContext';
import { useStudyTarget } from '../StudyTargetContext';
import V2Pressable from '../v2/V2Pressable';
import { useSpirePalette } from './useSpirePalette';
import { lv2Alpha } from '../learning-v2/LearningV2Glass';
import SpireAllMembers from './SpireAllMembers';
import SpireFloorInfo from './SpireFloorInfo';
import SpireFriendsRow from './SpireFriendsRow';
import SpireLockedState from './SpireLockedState';
import SpirePodium from './SpirePodium';
import SpireTower from './SpireTower';
import type { SpireFriendChip, SpireMemberRow } from './spire_room_types';
import { spireText, spireTimeLeftText } from './spire_strings';
import { SPIRE_FLOOR_COUNT, spireCurrentWeekKey, spireTimeLeft } from './spire_tower_model';

const LOG = '[SPIRE]';
const DASH = '—';
const SPIRE_LANGS: readonly SpireLang[] = ['en', 'es', 'de', 'fr'];

function asSpireLang(value: unknown): SpireLang | null {
  return SPIRE_LANGS.includes(value as SpireLang) ? (value as SpireLang) : null;
}

/** Локальная неделя текущей ISO-недели или null (чужая/старая неделя — не показываем как свою). */
async function readCurrentLocalWeek(lang: SpireLang): Promise<SpireWeekLocal | null> {
  const uid = await getCanonicalUserId();
  if (!uid) {
    DebugLogger.info(LOG, 'home: локальная неделя не читается — нет канонического uid (облако выключено)');
    return null;
  }
  const local = await spireReadWeekLocal(uid, lang);
  if (!local) {
    DebugLogger.info(LOG, `home: локальной недели нет (lang=${lang}) — маркер не рисуем`);
    return null;
  }
  const expected = spireCurrentWeekKey(Date.now());
  if (local.weekKey !== expected) {
    DebugLogger.info(LOG, `home: локальная неделя устарела (local=${local.weekKey} сейчас=${expected}) — маркер не рисуем`);
    return null;
  }
  DebugLogger.info(LOG, `home: локальная неделя ok (tier=${local.tier} floor=${local.floor} stepInFloor=${local.stepInFloor} steps=${local.stepsCleared}) из AsyncStorage`);
  return local;
}

export default function SpireHomeScreen() {
  const { lang } = useLang();
  const p = useSpirePalette();
  const { studyTarget } = useStudyTarget();
  const { runtimeOwnerId } = useTabNav();
  const { hasPremiumAccess } = usePremium();
  const myCoinRank = useMyCoinRank();
  const bottomPad = useTabContentBottomPad();

  // Замок 2: null = конфиг ещё не прочитан (кэш), дальше решает config.enabled.
  const [config, setConfig] = useState<SpireConfigDoc | null>(null);
  const [week, setWeek] = useState<SpireWeekLocal | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let alive = true;
    DebugLogger.info(LOG, 'home: вход, читаем конфиг (кэш 6 ч)');
    loadSpireConfig()
      .then((next) => {
        if (!alive) return;
        DebugLogger.info(LOG, `home: config.enabled=${String(next.enabled)}`);
        setConfig(next);
      })
      .catch((error: unknown) => {
        // зачем: при сбое остаёмся под замком — дефолт выключен.
        DebugLogger.warn(LOG, `home: конфиг не прочитался, остаёмся под замком (${String(error)})`);
        if (alive) setConfig(SPIRE_CONFIG_DEFAULTS);
      });
    return () => { alive = false; };
  }, []);

  const unlocked = config !== null && config.enabled === true;
  const spireLang = asSpireLang(studyTarget);

  useEffect(() => {
    if (!unlocked) return undefined;
    if (!spireLang) {
      DebugLogger.info(LOG, `home: язык изучения ${String(studyTarget)} без пула Шпиля — недели нет`);
      setWeek(null);
      return undefined;
    }
    let alive = true;
    readCurrentLocalWeek(spireLang)
      .then((local) => {
        if (!alive) return;
        setWeek(local);
        setSelected((prev) => prev ?? (local ? Math.min(local.floor, SPIRE_FLOOR_COUNT) : 1));
      })
      .catch((error: unknown) => {
        DebugLogger.warn(LOG, `home: локальная неделя не прочиталась (${String(error)})`);
        if (alive) setWeek(null);
      });
    return () => { alive = false; };
  }, [unlocked, spireLang, studyTarget]);

  const myFloor = week ? Math.min(week.floor, SPIRE_FLOOR_COUNT) : null;
  const shownFloor = selected ?? myFloor ?? 1;
  const onSelect = useCallback((floor: number) => setSelected(floor), []);
  const openAll = useCallback(() => setShowAll(true), []);
  const closeAll = useCallback(() => setShowAll(false), []);

  const subtitle = useMemo(() => {
    const stone = week ? spireTierName(week.tier, lang) : DASH;
    const left = spireTimeLeft(Date.now(), spireWeekStartMs(Date.now()));
    return `${stone} · ${spireTimeLeftText(lang, left.days, left.hours)}`;
  }, [week, lang]);

  // Источников нет (комнату недели и друзей подключит пакет B) — ничего не выдумываем.
  const members: readonly SpireMemberRow[] | null = null;
  const friends: readonly SpireFriendChip[] = [];

  if (config === null) return <View style={s.root} testID="spire-loading" />;
  if (!unlocked) return <View style={s.root}><SpireLockedState lang={lang} /></View>;
  if (showAll && members) return <View style={s.root}><SpireAllMembers lang={lang} members={members} onBack={closeAll} /></View>;

  // Кнопка «Подняться»: игры-ступени в приложении ещё нет и маршрута к ней тоже — кнопка
  // честно неактивна (пакет D). Без выдуманной «Энергии через 6:40»: цена ступени не заведена.
  const climbEnabled = false;

  return (
    <View style={s.root} testID="spire-home">
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomPad + 88 }]} showsVerticalScrollIndicator={false}>
        <View style={s.head}>
          <View style={s.headText}>
            <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{spireText(lang, 'title')}</Text>
            <Text style={[s.subtitle, { color: p.textSecondary }]}>{subtitle}</Text>
          </View>
          {hasPremiumAccess ? null : <EnergyBar ownerActive={runtimeOwnerId === 'spire'} glass />}
        </View>
        <View style={s.towerWrap}>
          <SpireTower lang={lang} myFloor={myFloor} selected={shownFloor} onSelect={onSelect} myCoinRank={myCoinRank} />
        </View>
        <SpireFloorInfo lang={lang} floor={shownFloor} myFloor={myFloor} stepInFloor={week ? week.stepInFloor : null} coins={config.coins} />
        <SpireFriendsRow lang={lang} friends={friends} />
        <SpirePodium lang={lang} members={members} onOpenAll={openAll} />
      </ScrollView>
      <View pointerEvents="box-none" style={[s.dock, { bottom: bottomPad - 24 }]}>
        <LinearGradient pointerEvents="none" colors={[lv2Alpha(p.bg, 0), lv2Alpha(p.bg, 0.96)]} style={s.scrim} />
        <V2Pressable
          disabled={!climbEnabled}
          accessibilityLabel={spireText(lang, 'climb')}
          accessibilityState={{ disabled: !climbEnabled }}
          style={[s.cta, { backgroundColor: p.cta, opacity: climbEnabled ? 1 : 0.4 }]}
          testID="spire-climb"
        >
          <Text style={[s.ctaText, { color: p.ctaText }]}>{spireText(lang, 'climb')}</Text>
          <Ionicons name="arrow-forward" size={20} color={p.ctaText} />
        </V2Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: V2.screenPad, paddingTop: 6 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginTop: 6 },
  headText: { flex: 1, minWidth: 0 },
  title: { ...V2_TYPE.largeTitle, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, lineHeight: 20, marginTop: 6 },
  towerWrap: { marginTop: 18 },
  dock: { position: 'absolute', left: V2.screenPad, right: V2.screenPad },
  scrim: { position: 'absolute', left: -V2.screenPad, right: -V2.screenPad, top: -40, bottom: -40 },
  cta: { minHeight: V2.cta.height, borderRadius: V2.cta.radius, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  ctaText: { fontSize: 17, fontWeight: '700' },
});
