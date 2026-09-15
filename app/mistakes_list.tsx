import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import SkeletonBlock from '../components/SkeletonShimmer';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { mistakeFacetLabel } from './mistake_facet_copy';
import MistakeTitleShelf from '../components/mistake-practice/MistakeTitleShelf';
import { buildMistakeRewardsSnapshot, type MistakeRewardsSnapshot } from '../modules/mistake-practice/rewards_model';
import { loadMistakeEventJournal } from './mistake_practice_store';
import { getStableId } from './stable_id';
import { loadMistakePracticeHubSnapshot, type MistakePracticeListItem } from './mistake_practice_insights';
import { safeRouterBack } from './navigation_back';

/**
 * Список ошибок (макет: хаб В). Три фильтра: готовы / все / исправлены.
 * Строка: число промахов, фраза, перевод и тип, три точки цепочки дней.
 * Тап по активной ошибке открывает сессию из одной этой ошибки (бесплатно,
 * без энергии - правило «меньше 5 без энергии»).
 */

type Filter = 'ready' | 'all' | 'corrected';

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { title: 'Мои ошибки', back: 'Назад', ready: 'Готовы', all: 'Все', corrected: 'Исправлены', empty: 'Здесь пока пусто', fixed: 'навсегда', one: 'Отработать одну' },
  uk: { title: 'Мої помилки', back: 'Назад', ready: 'Готові', all: 'Усі', corrected: 'Виправлені', empty: 'Тут поки порожньо', fixed: 'назавжди', one: 'Відпрацювати одну' },
  en: { title: 'My mistakes', back: 'Back', ready: 'Ready', all: 'All', corrected: 'Fixed', empty: 'Nothing here yet', fixed: 'for good', one: 'Practise this one' },
  es: { title: 'Mis errores', back: 'Atrás', ready: 'Listos', all: 'Todos', corrected: 'Corregidos', empty: 'Aún no hay nada', fixed: 'para siempre', one: 'Practicar este' },
  'pt-BR': { title: 'Meus erros', back: 'Voltar', ready: 'Prontos', all: 'Todos', corrected: 'Corrigidos', empty: 'Ainda não há nada', fixed: 'para sempre', one: 'Praticar este' },
  vi: { title: 'Lỗi của tôi', back: 'Quay lại', ready: 'Sẵn sàng', all: 'Tất cả', corrected: 'Đã sửa', empty: 'Chưa có gì ở đây', fixed: 'mãi mãi', one: 'Luyện lỗi này' },
  id: { title: 'Kesalahanku', back: 'Kembali', ready: 'Siap', all: 'Semua', corrected: 'Diperbaiki', empty: 'Belum ada apa-apa', fixed: 'selamanya', one: 'Latih yang ini' },
  tr: { title: 'Hatalarım', back: 'Geri', ready: 'Hazır', all: 'Tümü', corrected: 'Düzeltilen', empty: 'Burası şimdilik boş', fixed: 'kalıcı', one: 'Bunu çalış' },
  pl: { title: 'Moje błędy', back: 'Wstecz', ready: 'Gotowe', all: 'Wszystkie', corrected: 'Poprawione', empty: 'Na razie pusto', fixed: 'na zawsze', one: 'Przećwicz ten' },
});

const FILTERS: readonly Filter[] = ['ready', 'all', 'corrected'];

export default function MistakesListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const copy = useMemo(() => copyFor(lang), [lang]);
  const target = studyTarget === 'fr' ? 'fr' : 'en';
  const [filter, setFilter] = useState<Filter>(params.filter === 'corrected' || params.filter === 'all' ? params.filter : 'ready');
  const [items, setItems] = useState<readonly MistakePracticeListItem[] | null>(null);
  // Полка «Исправлены» носит шапку со званием и лестницей (макет полки А).
  const [rewards, setRewards] = useState<MistakeRewardsSnapshot | null>(null);
  const openingRef = useRef(false);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    openingRef.current = false;
    void loadMistakePracticeHubSnapshot(target)
      .then((snapshot) => { if (!cancelled) setItems(snapshot.items); })
      .then(async () => {
        const accountScope = await getStableId();
        const journal = await loadMistakeEventJournal({ accountScope, studyTarget: target });
        if (!cancelled) setRewards(buildMistakeRewardsSnapshot(journal.events));
      })
      .catch((error: unknown) => {
        // guard-ok: лог в catch обязателен
        console.warn('[MISTAKES-HUB] list:catch', error instanceof Error ? error.message : String(error));
        if (!cancelled) setItems([]);
      });
    return () => { cancelled = true; };
  }, [target]));

  const visible = useMemo(() => (items ?? []).filter((item) =>
    filter === 'ready' ? item.ready : filter === 'corrected' ? item.status === 'corrected' : item.status === 'active'),
  [filter, items]);

  // зачем (макет Б): строка ведёт в КАРТОЧКУ ошибки — там хроника и разбор,
  // а отработка одной ошибки запускается уже оттуда осознанной кнопкой.
  const openOne = useCallback((item: MistakePracticeListItem) => {
    if (openingRef.current) return;
    openingRef.current = true;
    hapticTap();
    router.push({ pathname: '/mistake_detail', params: { mistakeId: item.mistakeId } } as never);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: MistakePracticeListItem }) => {
    const corrected = item.status === 'corrected';
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${item.phrase}${item.meaning ? `, ${item.meaning}` : ''}`}
        onPress={() => openOne(item)}
        style={({ pressed }) => [styles.row, { backgroundColor: t.bgCard, opacity: pressed ? 0.86 : 1 }]}
      >
        <View style={[styles.count, { backgroundColor: corrected ? t.correctBg : t.wrongBg }]}>
          {corrected
            ? <Ionicons name="checkmark" size={18} color={t.correct} />
            : <Text style={[styles.countText, { color: t.wrong, fontSize: f.body }]}>×{item.captureCount}</Text>}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <Text style={[styles.phrase, { color: t.textPrimary, fontSize: f.body }]} numberOfLines={2}>{item.phrase}</Text>
          <Text style={[styles.meaning, { color: t.textMuted, fontSize: f.sub }]} numberOfLines={1}>
            {[item.meaning, corrected ? copy.fixed : mistakeFacetLabel(lang, item.facet)].filter(Boolean).join(' · ')}
          </Text>
          {!corrected ? (
            <View style={styles.dots}>
              {[0, 1, 2].map((index) => (
                <View key={`day-${index}`} style={[styles.dot, { backgroundColor: index < item.qualifyingDays ? t.accent : t.bgSurface2 }]} />
              ))}
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
      </Pressable>
    );
  }, [copy.fixed, f.body, f.sub, lang, openOne, t]);

  return (
    <ScreenGradient>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={copy.back} hitSlop={10} onPress={() => safeRouterBack(router, '/mistakes_hub' as never)} style={[styles.iconButton, { backgroundColor: t.bgCard }]}>
            <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
          </Pressable>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h3 }]} numberOfLines={1}>{copy.title}</Text>
        </View>
        <View style={[styles.segment, { backgroundColor: t.bgCard }]}>
          {FILTERS.map((id) => {
            const on = id === filter;
            const count = items ? items.filter((item) => id === 'ready' ? item.ready : id === 'corrected' ? item.status === 'corrected' : item.status === 'active').length : null;
            return (
              <Pressable key={id} testID={`mistakes-list-filter-${id}`} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => { hapticTap(); setFilter(id); }} style={[styles.segmentItem, on && { backgroundColor: t.bgSurface2 }]}>
                <Text style={{ color: on ? t.textPrimary : t.textMuted, fontSize: f.sub, fontWeight: '800' }} numberOfLines={1}>
                  {copy[id]}{count !== null ? ` ${count}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {items === null ? (
          <View style={styles.list}>
            {[0, 1, 2, 3, 4].map((index) => <SkeletonBlock key={`skeleton-${index}`} width="100%" height={78} borderRadius={18} />)}
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(item) => item.mistakeId}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            initialNumToRender={12}
            windowSize={7}
            ListHeaderComponent={filter === 'corrected' ? <MistakeTitleShelf lang={lang} rewards={rewards} /> : null}
            ListEmptyComponent={
              <View style={[styles.emptyBox, { backgroundColor: t.bgCard }]}>
                <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700' }}>{copy.empty}</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
  iconButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontWeight: '900', letterSpacing: -0.4 },
  segment: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: 18, marginHorizontal: 16, marginBottom: 10 },
  segmentItem: { flex: 1, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
  row: { minHeight: 78, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  count: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  countText: { fontWeight: '900', fontVariant: ['tabular-nums'] },
  phrase: { fontWeight: '800' },
  meaning: { fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 5, marginTop: 3 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  emptyBox: { borderRadius: 18, minHeight: 72, alignItems: 'center', justifyContent: 'center', padding: 18 },
});
