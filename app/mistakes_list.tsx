import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { withoutLocallyHiddenMistakes } from './mistake_local_hidden';
import { rememberMistakeDetailDraft } from './mistake_detail_draft';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { GlassRim } from '../components/mistakes-panel/GlassRim';
import { useScaledTextStyles } from '../hooks/useLineScale';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useLv2Glass, type Lv2Glass } from '../components/learning-v2/LearningV2Glass';
import { BackButton, FilterChips, MiniDots, Panel, PanelCta, PanelDock, PanelRow, ScreenTitle, type PanelChip } from '../components/mistakes-panel/PanelKit';
import { MISTAKE_GROUPS, mistakeGroupLabel, mistakeGroupOf, type MistakeGroupFilter } from '../components/mistakes-panel/mistakeGroups';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { useMistakePracticeStartGate } from '../hooks/useMistakePracticeStartGate';
import { normalizeMistakeStudyTarget } from '../modules/mistake-practice/contracts';
import { MISTAKE_PRACTICE_MAX_SESSION } from '../modules/mistake-practice/session';
import { peekMistakesHubSnapshot } from './mistakes_hub';
import { loadMistakePracticeHubSnapshot, type MistakePracticeListItem } from './mistake_practice_insights';
import { trackMistakePracticeEvent } from './mistake_practice_analytics';
import { safeRouterBack } from './navigation_back';
import NoEnergyModal from '../components/NoEnergyModal';

/**
 * Список ошибок — «Все ошибки» (макет docs/design/v2-app/mistakes-panel.html, экраны «Все ошибки — ждут» и «Все ошибки — исправлены», вариант Б «Панель»).
 *
 * зачем (владелец: «1 в 1, без малейших потерь»): две вкладки «Ждут · N» / «Исправлены · N», под ними ленты-фильтры по типам и одна панель:
 * слово, перевод и три полоски дней. Тап по строке открывает карточку ошибки. Данные — снимок хаба (локальный журнал, 0 чтений Firestore).
 */

type Tab = 'waiting' | 'corrected';

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { title: 'Все ошибки', back: 'Назад', waiting: 'Ждут', corrected: 'Исправлены', all: 'Все', empty: 'Здесь пока пусто', practice: 'Отработать', repeatFixed: 'Повторить исправленные', search: 'Поиск', clear: 'Очистить' },
  uk: { title: 'Усі помилки', back: 'Назад', waiting: 'Чекають', corrected: 'Виправлені', all: 'Усі', empty: 'Тут поки порожньо', practice: 'Відпрацювати', repeatFixed: 'Повторити виправлені', search: 'Пошук', clear: 'Очистити' },
  en: { title: 'All mistakes', back: 'Back', waiting: 'Waiting', corrected: 'Fixed', all: 'All', empty: 'Nothing here yet', practice: 'Practice', repeatFixed: 'Review fixed mistakes', search: 'Search', clear: 'Clear' },
  es: { title: 'Todos los errores', back: 'Atrás', waiting: 'Esperan', corrected: 'Corregidos', all: 'Todos', empty: 'Aún no hay nada', practice: 'Practicar', repeatFixed: 'Repasar los corregidos', search: 'Buscar', clear: 'Borrar' },
  'pt-BR': { title: 'Todos os erros', back: 'Voltar', waiting: 'Esperam', corrected: 'Corrigidos', all: 'Todos', empty: 'Ainda não há nada', practice: 'Praticar', repeatFixed: 'Revisar os corrigidos', search: 'Buscar', clear: 'Limpar' },
  vi: { title: 'Tất cả lỗi', back: 'Quay lại', waiting: 'Đang chờ', corrected: 'Đã sửa', all: 'Tất cả', empty: 'Chưa có gì ở đây', practice: 'Luyện', repeatFixed: 'Ôn lại lỗi đã sửa', search: 'Tìm', clear: 'Xóa' },
  id: { title: 'Semua kesalahan', back: 'Kembali', waiting: 'Menunggu', corrected: 'Diperbaiki', all: 'Semua', empty: 'Belum ada apa-apa', practice: 'Latih', repeatFixed: 'Ulangi yang diperbaiki', search: 'Cari', clear: 'Hapus' },
  tr: { title: 'Tüm hatalar', back: 'Geri', waiting: 'Bekleyen', corrected: 'Düzeltilen', all: 'Tümü', empty: 'Burası şimdilik boş', practice: 'Çalış', repeatFixed: 'Düzeltilenleri tekrarla', search: 'Ara', clear: 'Temizle' },
  pl: { title: 'Wszystkie błędy', back: 'Wstecz', waiting: 'Czekają', corrected: 'Poprawione', all: 'Wszystkie', empty: 'Na razie pusto', practice: 'Przećwicz', repeatFixed: 'Powtórz poprawione', search: 'Szukaj', clear: 'Wyczyść' },
});

const PAGE = 40;

// зачем (аудит скорости Авторизации 13.10, п.3): PanelRow уже в memo, но onPress и right создавались заново в каждом рендере экрана — каждый ввод в поиске
// перерисовывал все строки. Строка-обёртка в memo получает item и стабильный onOpen, остальное собирает внутри.
const MistakeListRow = memo(function MistakeListRow({ g, item, first, onOpen }: Readonly<{ g: Lv2Glass; item: MistakePracticeListItem; first: boolean; onOpen: (item: MistakePracticeListItem) => void }>) {
  const open = useCallback(() => onOpen(item), [item, onOpen]);
  return (
    <PanelRow
      g={g}
      first={first}
      testID={`mistakes-list-row-${item.mistakeId}`}
      title={item.phrase}
      subtitle={item.meaning}
      right={<MiniDots g={g} n={item.status === 'corrected' ? 3 : item.qualifyingDays} />}
      onPress={open}
    />
  );
});

export default function MistakesListScreen() {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const g = useLv2Glass();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const copy = useMemo(() => copyFor(lang), [lang]);
  // зачем (22.09): подмена испанского/немецкого на английский — человек видел чужой список ошибок. Журнал ключуется по языку.
  const target = normalizeMistakeStudyTarget(studyTarget);
  const [tab, setTab] = useState<Tab>(params.filter === 'corrected' ? 'corrected' : 'waiting');
  const [group, setGroup] = useState<MistakeGroupFilter>('all');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  // зачем (аудит 04.10): первый кадр — из снимка хаба (если он есть для этого аккаунта/цели/языка), загрузка идёт фоном и заменяет строки.
  // зачем (аудит Optimistic UI п.2): локально скрытые (запись журнала ещё идёт) не показываем ни в первом кадре, ни после перечитывания.
  const [items, setItems] = useState<readonly MistakePracticeListItem[] | null>(() => {
    const peeked = peekMistakesHubSnapshot(target, lang)?.items;
    return peeked ? withoutLocallyHiddenMistakes(peeked) : null;
  });
  const openingRef = useRef(false);
  const gate = useMistakePracticeStartGate('mistakes_hub_start');

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    openingRef.current = false;
    void loadMistakePracticeHubSnapshot(target)
      .then((snapshot) => { if (!cancelled) setItems(withoutLocallyHiddenMistakes(snapshot.items)); })
      .catch((error: unknown) => {
        // guard-ok: лог в catch обязателен
        console.warn('[MISTAKES-HUB] list:catch', error instanceof Error ? error.message : String(error));
        if (!cancelled) setItems([]);
      });
    return () => { cancelled = true; };
  }, [target]));

  const inTab = useMemo(() => (items ?? []).filter((item) => (tab === 'corrected' ? item.status === 'corrected' : item.status === 'active')), [items, tab]);
  const waitingCount = useMemo(() => (items ?? []).filter((item) => item.status === 'active').length, [items]);
  const correctedCount = (items?.length ?? 0) - waitingCount;
  const counts = useMemo(() => {
    const result: Record<string, number> = { all: inTab.length, meaning: 0, grammar: 0, sound: 0 };
    for (const item of inTab) result[mistakeGroupOf(item.facet)] += 1;
    return result;
  }, [inTab]);
  const chips = useMemo<PanelChip[]>(() => [
    { id: 'all', label: `${copy.all} ${counts.all}` },
    ...MISTAKE_GROUPS.filter((id) => (counts[id] ?? 0) > 0).map((id) => ({ id, label: `${mistakeGroupLabel(lang, id)} ${counts[id]}` })),
  ], [copy.all, counts, lang]);
  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => inTab.filter((item) =>
    (group === 'all' || mistakeGroupOf(item.facet) === group)
    && (!needle || item.phrase.toLowerCase().includes(needle) || (item.meaning ?? '').toLowerCase().includes(needle))),
  [group, inTab, needle]);
  // зачем (владелец 04.10, Ядро 76242ef31): «Повторить исправленные» — отработка из пула исправленных (pool=corrected); число — те же исправленные,
  // что считает correctedMistakeCount(scheduler), берём из снимка хаба; при нуле кнопки нет. Цена: 1 ⚡ только от 5 ошибок, 1–4 бесплатно (решает экран сессии).
  const correctedInGroup = useMemo(() => Math.min(MISTAKE_PRACTICE_MAX_SESSION, (items ?? []).filter((item) => item.status === 'corrected' && (group === 'all' || mistakeGroupOf(item.facet) === group)).length), [group, items]);
  const readyInGroup = useMemo(() => Math.min(MISTAKE_PRACTICE_MAX_SESSION, (items ?? []).filter((item) => item.ready && (group === 'all' || mistakeGroupOf(item.facet) === group)).length), [group, items]);

  // зачем (макет Б): строка ведёт в КАРТОЧКУ ошибки — там хроника и разбор, а отработка одной ошибки запускается оттуда осознанной кнопкой.
  const openOne = useCallback((item: MistakePracticeListItem) => {
    if (openingRef.current) return;
    openingRef.current = true;
    hapticTap();
    // зачем (аудит Optimistic UI п.3): деталь рисует шапку из этой строки на первом кадре.
    rememberMistakeDetailDraft({ mistakeId: item.mistakeId, phrase: item.phrase, meaning: item.meaning, captureCount: item.captureCount, qualifyingDays: item.qualifyingDays, status: item.status });
    router.push({ pathname: '/mistake_detail', params: { mistakeId: item.mistakeId } } as never);
  }, [router]);

  const startPractice = useCallback(() => {
    if (openingRef.current || readyInGroup < 1) return;
    hapticTap();
    if (!gate.tryStartSession(readyInGroup)) return;
    openingRef.current = true;
    trackMistakePracticeEvent('mistake_practice_setup_started', {
      study_target: target,
      entry_source: 'mistakes_list',
      requested_length: 'all',
      ready_count: readyInGroup,
      session_count: readyInGroup,
      costs_energy: readyInGroup >= 5,
    });
    const receipt = gate.takeQuotaReceiptParam(); // id попытки дня этого тапа — для возврата, если тренировка не стартует
    router.push({ pathname: '/mistake_practice_session', params: group === 'all' ? { length: 'all', ...receipt } : { length: 'all', facetGroup: group, ...receipt } } as never);
  }, [gate, group, readyInGroup, router, target]);

  const startReview = useCallback(() => {
    if (openingRef.current || correctedInGroup < 1) return;
    hapticTap();
    if (!gate.tryStartSession(correctedInGroup)) return;
    openingRef.current = true;
    trackMistakePracticeEvent('mistake_practice_setup_started', {
      study_target: target,
      entry_source: 'mistakes_list_review',
      requested_length: 'all',
      ready_count: correctedInGroup,
      session_count: correctedInGroup,
      costs_energy: correctedInGroup >= 5,
    });
    const receipt = gate.takeQuotaReceiptParam(); // id попытки дня этого тапа — для возврата, если тренировка не стартует
    router.push({ pathname: '/mistake_practice_session', params: group === 'all' ? { pool: 'corrected', length: 'all', ...receipt } : { pool: 'corrected', length: 'all', facetGroup: group, ...receipt } } as never);
  }, [correctedInGroup, gate, group, router, target]);

  // зачем (аудит скорости 13.10): подскролл у низа срабатывал на КАЖДОЕ событие и даже при показанных всех строках двигал limit — лишние перерисовки всего экрана.
  // Теперь при limit ≥ числа строк состояние не меняется (React пропускает перерисовку для того же значения).
  const visibleCountRef = useRef(0);
  visibleCountRef.current = visible.length;
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 400) setLimit((value) => (value >= visibleCountRef.current ? value : value + PAGE));
  }, []);

  const goBack = useCallback(() => safeRouterBack(router, '/mistakes_hub' as never), [router]);
  const closeSearch = useCallback(() => { setSearching(false); setQuery(''); }, []);

  const tabs = [
    { id: 'waiting' as const, label: `${copy.waiting} · ${waitingCount}` },
    { id: 'corrected' as const, label: `${copy.corrected} · ${correctedCount}` },
  ];

  return (
    <ScreenGradient>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={64} keyboardShouldPersistTaps="handled" decelerationRate="fast">
          {searching ? (
            <View style={styles.topbar}>
              <BackButton g={g} label={copy.back} onPress={closeSearch} />
              <View style={[styles.field, { backgroundColor: g.hairlineSoft }]}>
                <Ionicons name="search" size={20} color={g.secondary} />
                <TextInput
                  testID="mistakes-list-search"
                  value={query}
                  onChangeText={(value) => { setQuery(value); setLimit(PAGE); }}
                  accessibilityLabel={copy.search}
                  placeholder={copy.search}
                  placeholderTextColor={g.secondary}
                  autoFocus
                  style={[styles.fieldInput, { color: g.text }]}
                />
                {query ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={copy.clear} hitSlop={10} onPress={() => setQuery('')}>
                    <Ionicons name="close" size={18} color={g.secondary} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={styles.topbar}>
              <BackButton g={g} label={copy.back} onPress={goBack} />
              <Pressable testID="mistakes-list-search-open" accessibilityRole="button" accessibilityLabel={copy.search} hitSlop={8} onPress={() => { hapticTap(); setSearching(true); }} style={({ pressed }) => [styles.round, { backgroundColor: g.buttonFill }, pressed && styles.pressed]}>
                <Ionicons name="search" size={20} color={g.text} />
                <GlassRim radius={21} />
              </Pressable>
            </View>
          )}
          <ScreenTitle g={g} text={copy.title} />
          <View style={styles.tabs}>
            {tabs.map((entry) => {
              const on = entry.id === tab;
              return (
                <Pressable
                  key={entry.id}
                  testID={`mistakes-list-filter-${entry.id}`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => { hapticTap(); setTab(entry.id); setGroup('all'); setLimit(PAGE); }}
                  style={({ pressed }) => [styles.tab, { backgroundColor: on ? g.accent : g.hairlineSoft }, pressed && styles.pressed]}>
                  <Text style={[styles.tabText, { color: on ? g.accentInk : g.secondary }]}>{entry.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <FilterChips g={g} chips={chips} activeId={group} onChange={(id) => { hapticTap(); setGroup(id as MistakeGroupFilter); setLimit(PAGE); }} testIDPrefix="mistakes-list-chip" />
          <Panel g={g}>
            {items !== null && visible.length === 0 ? (
              <View style={styles.empty}><Text style={[styles.emptyText, { color: g.secondary }]}>{copy.empty}</Text></View>
            ) : null}
            {items === null ? [0, 1, 2, 3, 4].map((index) => (
              <View key={`sk-${index}`} style={styles.skelRow}>
                {index > 0 ? <View pointerEvents="none" style={[styles.skelLine, { backgroundColor: g.hairlineSoft }]} /> : null}
                <View style={[styles.skel, { backgroundColor: g.line, height: 16, width: '50%' }]} />
                <View style={[styles.skel, { backgroundColor: g.line, height: 12, width: '30%', marginTop: 8 }]} />
              </View>
            )) : visible.slice(0, limit).map((item, index) => (
              <MistakeListRow key={item.mistakeId} g={g} first={index === 0} item={item} onOpen={openOne} />
            ))}
          </Panel>
        </ScrollView>
        {tab === 'corrected' && correctedInGroup > 0 ? (
          <PanelDock><PanelCta g={g} testID="mistakes-list-review" label={copy.repeatFixed} onPress={startReview} /></PanelDock>
        ) : null}
        {tab === 'waiting' && readyInGroup > 0 ? (
          <PanelDock><PanelCta g={g} testID="mistakes-list-start" label={`${copy.practice} ${readyInGroup}`} onPress={startPractice} /></PanelDock>
        ) : null}
      </SafeAreaView>
      {/* зачем (аудит R48): платная сессия при нехватке энергии — шторка вместо молчаливого закрытия тренировки; попытка дня цела */}
      <NoEnergyModal variant="learn" visible={gate.noEnergy} activity="mistake_practice" onBeforeOpenPremium={gate.dismissNoEnergy} onClose={gate.dismissNoEnergy} />
    </ScreenGradient>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: 20, paddingBottom: 140 },
  topbar: { minHeight: 44, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  pressed: { opacity: 0.82 },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  // зачем: поле поиска — как в утверждённом макете «Наборы» (packs-simple, кадр поиска): высота 46, капсула, фон 8 %.
  field: { flex: 1, minHeight: 46, borderRadius: 23, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  tabs: { marginTop: 18, flexDirection: 'row', gap: 8 },
  tab: { minHeight: 38, paddingHorizontal: 18, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  empty: { minHeight: 72, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, lineHeight: 22 },
  skelRow: { minHeight: 64, justifyContent: 'center' },
  skelLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 1 },
  skel: { borderRadius: 10 },
});
