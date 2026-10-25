// ═════════════════════════════════════════════════════════════════════
// DialogueV2ThemeScreen.tsx — тема Диалогов ОТДЕЛЬНЫМ экраном: шапка (мир, «k /n»), переключатель тем, дорожка и компактные строки диалогов.
//
// зачем (владелец 22.10, «Да, переносить», макет dialogs-hub-v4.html, кадры 3 и 6; решение (г)): мир больше не раскрывается секцией на хабе — тап по плитке темы или «Все диалоги» открывает этот экран со ScreenBackButton
// (одно место на всех экранах, содержимое под кнопкой — полоса SCREEN_BACK_ZONE). Строки — компактные («выбор компактнее и красивее»): значок сценки, название до двух строк, уровень, ✓ или ›;
// закрытая по рангу — замок, серое название и ДОСЛОВНО «монета ранга + Откроется на ранге N» (число из таблицы рангов приложения). Тап по любой строке ведёт на брифинг (закрытая — тоже, ранг показывает сам брифинг).
// Данные — только локальные (use_dialogue_v2_hub_catalogue): экран открывается мгновенно, чтений Firestore нет. Цвета — токены dialogs_hub_tokens.
// ═════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Image as RNImage, StyleSheet, Text, View } from 'react-native';

import { coinRankRowForDisplay } from '../../../app/coin_rank_table_v1';
import { markDialogueV2OptimisticTap } from '../../../app/dialogue_v2_optimistic_trace';
import { prestartDialogueV2TextSession } from '../../../app/dialogue_v2_turn_client';
import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import ScreenGradient from '../../ScreenGradient';
import { LinearGradient } from '../../SafeLinearGradient';
import { useLang } from '../../LangContext';
import { useLv2Glass } from '../../learning-v2/LearningV2Glass';
import { lv2Mix } from '../../learning-v2/learning_v2_task_theme_tokens';
import ScreenBackButton, { ScreenBackSlot, SCREEN_BACK_SIZE } from '../../v2/ScreenBackButton';
import V2Pressable from '../../v2/V2Pressable';
import { dialogueScenarioIcon, dialogueWorldIcon } from '../dialogue_scenario_icons';
import { dialogueWorldSubtitle } from '../dialogue_world_subtitle';
import { glueRankNumber, type DialogueV2CatalogueLearnerItem } from '../DialogueV2CatalogueSection';
import { dialogsHubTokens, type DialogsHubTokens } from '../scene/dialogs_hub_tokens';
import { dialogsSceneText } from '../scene/dialogs_scene_copy';
import { DIALOGS_HUB_ALL, dialogsHubItemsOf, dialogsHubProgress, dialogsHubTotals, dialogsHubWorldCounts } from './dialogs_hub_model';
import DialogsHubWorldSwitch from './DialogsHubWorldSwitch';
import { useDialogueV2HubCatalogue } from './use_dialogue_v2_hub_catalogue';

const LOG = '[DIALOGS-THEME]';

type RowProps = Readonly<{
  item: DialogueV2CatalogueLearnerItem;
  tokens: DialogsHubTokens;
  worldIcon: ReturnType<typeof dialogueWorldIcon>;
  lockedLabel: string | null;
  onPress: (item: DialogueV2CatalogueLearnerItem) => void;
}>;

// Строка диалога (макет `.dv-row`): значок 44, название до 2 строк, уровень, ✓ или ›. Закрытая — замок и «монета ранга + Откроется на ранге N».
const ThemeRow = memo(function ThemeRow({ item, tokens, worldIcon, lockedLabel, onPress }: RowProps) {
  const card = tokens.card;
  const locked = item.status === 'locked';
  const done = item.status === 'done';
  const statusLabel = locked && lockedLabel ? lockedLabel : done ? 'done' : 'available';
  return (
    <V2Pressable
      testID={`dialogs-theme-row-${item.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.cefr}, ${statusLabel}`}
      onPress={() => onPress(item)}
      style={[styles.row, { backgroundColor: locked ? card.fillLocked : card.fill }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: card.levelBg }]}>
        <Ionicons name={locked ? 'lock-closed' : dialogueScenarioIcon(item.id, worldIcon)} size={20} color={locked ? card.sub : card.icon} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: locked ? card.sub : card.title }]} numberOfLines={2} maxFontSizeMultiplier={1.3}>{item.title}</Text>
        {locked && lockedLabel ? (
          // зачем (владелец 18.10, скрин iPhone): монета ранга — отдельный элемент ряда ПЕРЕД подписью, а не inline-картинка внутри Text (на iOS она вставала не на свою строку)
          <View style={styles.rankRow}>
            <RNImage testID={`dialogs-theme-row-coin-${item.id}`} source={coinRankRowForDisplay(item.rankRequired).source} style={styles.coin} accessible={false} />
            <Text style={[styles.rankText, { color: card.sub }]} maxFontSizeMultiplier={1.3}>{glueRankNumber(lockedLabel, item.rankRequired)}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.level, { backgroundColor: card.levelBg }]}>
        <Text style={[styles.levelText, { color: card.levelInk }]} maxFontSizeMultiplier={1.3}>{item.cefr}</Text>
      </View>
      <View style={styles.status}>
        {done ? <Ionicons name="checkmark" size={20} color={card.title} /> : <Ionicons name="chevron-forward" size={20} color={card.sub} />}
      </View>
    </V2Pressable>
  );
});

function DialogueV2ThemeScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const g = useLv2Glass();
  const tokens = dialogsHubTokens(g);
  const insets = useStableSafeAreaInsets();
  const cat = useDialogueV2HubCatalogue();
  const params = useLocalSearchParams<{ world?: string | string[] }>();
  const worldParam = Array.isArray(params.world) ? params.world[0] : params.world;

  const counts = useMemo(() => dialogsHubWorldCounts(cat.worlds, cat.items), [cat.items, cat.worlds]);
  const initial = worldParam && counts.some((w) => w.id === worldParam) ? worldParam : DIALOGS_HUB_ALL;
  // выбор — локальное состояние: переключение мгновенно, без сети и без перехода
  const [selected, setSelected] = useState(initial);
  const items = useMemo(() => dialogsHubItemsOf(cat.items, selected), [cat.items, selected]);
  const done = useMemo(() => items.filter((i) => i.status === 'done').length, [items]);
  const world = counts.find((w) => w.id === selected) ?? null;
  const totals = dialogsHubTotals(items);
  const hair = lv2Mix(g.bg, g.text, 0.14);

  if (worldParam && initial === DIALOGS_HUB_ALL && cat.ready) console.log(LOG, 'screen:world_param_unknown_fallback_all', JSON.stringify({ worldParam, worlds: counts.map((w) => w.id) })); // guard-ok: значение, решившее ветку

  const onSelect = useCallback((id: string) => {
    console.log(LOG, 'switch', JSON.stringify({ from: selected, to: id })); // guard-ok: одна строка на тап
    setSelected(id);
  }, [selected]);

  const onPressItem = useCallback((item: DialogueV2CatalogueLearnerItem) => {
    // зачем: тот же путь, что у тапа по строке каталога хаба (DialogsTabContent): замер, прогрев сессии фоном только для доступной, переход на брифинг; энергия и квота здесь НЕ тратятся
    const st = cat.studyTarget;
    const supported = st === 'en' || st === 'es' || st === 'fr' || st === 'de';
    const prestart = item.status === 'available' && supported;
    markDialogueV2OptimisticTap('hub_tap', item.id, { status: item.status, prestart, studyTarget: String(st), via: 'theme' });
    if (prestart) prestartDialogueV2TextSession({ studyTarget: st as 'en' | 'es' | 'fr' | 'de', scenarioId: item.id });
    router.push({ pathname: '/dialogue_v2_briefing', params: { scenarioId: item.id } } as never);
  }, [cat.studyTarget, router]);

  const renderItem = useCallback(({ item }: { item: DialogueV2CatalogueLearnerItem }) => (
    <ThemeRow item={item} tokens={tokens} worldIcon={dialogueWorldIcon(item.worldId)} lockedLabel={item.status === 'locked' ? cat.lockedAtRank(item.rankRequired) : null} onPress={onPressItem} />
  ), [cat, onPressItem, tokens]);

  const title = world ? world.title : dialogsSceneText(lang, 'allDialogs');
  const kicker = world ? dialogueWorldSubtitle(lang, world.id) : null;

  return (
    <ScreenGradient>
      {/* ЗАМОК ВЛАДЕЛЬЦА 22.10: тема — отдельный экран со ScreenBackButton (решение (г)); кнопка — слой экрана, шапка оставляет под неё место */}
      <ScreenBackButton screen="dialogs_theme" fallback="/ai_dialog_home" />
      <View style={[styles.root, { paddingTop: insets.top }]} testID="dialogs-theme-screen">
        <View style={styles.headRow}>
          <ScreenBackSlot />
          <View style={styles.headText}>
            {kicker ? <Text style={[styles.kicker, { color: g.secondary }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{kicker}</Text> : null}
            <Text accessibilityRole="header" style={[styles.headTitle, { color: g.text }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{title}</Text>
          </View>
          <Text testID="dialogs-theme-counter" style={[styles.counter, { color: g.text }]} maxFontSizeMultiplier={1.2}>
            {done}<Text style={[styles.counterSmall, { color: g.secondary }]}> /{totals.total}</Text>
          </Text>
        </View>
        <View style={styles.switchWrap}>
          <DialogsHubWorldSwitch worlds={counts} selected={selected} onSelect={onSelect} />
        </View>
        <View testID="dialogs-theme-track" style={[styles.track, { backgroundColor: hair }]}>
          <View style={[styles.dot, { left: `${Math.round(dialogsHubProgress(done, totals.total) * 100)}%`, backgroundColor: g.text }]} />
        </View>
        <FlatList decelerationRate="fast"
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          initialNumToRender={12}
          windowSize={7}
          showsVerticalScrollIndicator={false}
        />
        {/* зачем (макет dialogs-hub-v4 `.dv-fade`, координатор 22.10): нижнее затухание списка — строки уходят под низ плавно, а не обрезаются; слой не ловит нажатия */}
        <LinearGradient testID="dialogs-theme-fade" pointerEvents="none" colors={[`${g.bg}00`, g.bg]} locations={[0, 0.85]} style={[styles.fade, { height: 70 + insets.bottom }]} />
      </View>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // шапка: строка 48 (место под ScreenBackButton слева, название, счётчик «k /n»)
  headRow: { height: SCREEN_BACK_SIZE, paddingLeft: 20, paddingRight: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headText: { flex: 1, minWidth: 0 },
  kicker: { fontSize: 13, lineHeight: 17 },
  headTitle: { fontSize: 22, lineHeight: 27, fontWeight: '800', letterSpacing: -0.3 },
  counter: { fontSize: 28, lineHeight: 34, fontWeight: '700', fontVariant: ['tabular-nums'] },
  counterSmall: { fontSize: 16, fontWeight: '400' },
  switchWrap: { marginTop: 14, paddingHorizontal: 16 },
  track: { marginTop: 12, marginHorizontal: 22, height: 7, borderRadius: 4 },
  dot: { position: 'absolute', top: -0.5, width: 8, height: 8, borderRadius: 4, marginLeft: -8 },
  list: { flex: 1, marginTop: 12 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  listContent: { paddingHorizontal: 16, gap: 6 },
  // макет `.dv-row`: высота от 58, радиус 18, поля 6·14·6·8
  row: { minHeight: 58, borderRadius: 18, paddingLeft: 8, paddingRight: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 16, lineHeight: 21, fontWeight: '600' },
  rankRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 2 },
  coin: { width: 16, height: 16, marginTop: 1 },
  rankText: { flexShrink: 1, fontSize: 13, lineHeight: 18 },
  level: { minWidth: 38, height: 26, paddingHorizontal: 9, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  levelText: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  status: { width: 20, alignItems: 'flex-end' },
});

export default memo(DialogueV2ThemeScreen);
