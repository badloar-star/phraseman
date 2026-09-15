import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import EnergyCostBadge from '../components/EnergyCostBadge';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import SkeletonBlock from '../components/SkeletonShimmer';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { useMistakePracticeStartGate } from '../hooks/useMistakePracticeStartGate';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import type { MistakeFacet } from '../modules/mistake-practice/contracts';
import {
  mistakePracticeLengthOptions,
  mistakePracticeSessionCostsEnergy,
  mistakePracticeSessionCount,
  type MistakePracticeLength,
} from '../modules/mistake-practice/session';
import { mistakeFacetLabel, mistakeSourceLabel } from './mistake_facet_copy';
import {
  buildMistakeHubAdviceSummary,
  refreshMistakeHubAdvice,
  resolveMistakeHubAdvice,
  type MistakeHubAdvice,
} from './mistake_hub_advice';
import { trackMistakePracticeEvent } from './mistake_practice_analytics';
import { loadMistakePracticeHubSnapshot, type MistakePracticeHubSnapshot } from './mistake_practice_insights';
import { safeRouterBack } from './navigation_back';
import { getStableId } from './stable_id';

/**
 * Хаб «Работа над ошибками» (макет: хаб Б, утверждён владельцем 2026-09-14).
 * Карта слабых мест по типам, подсказка-наблюдение, откуда приходят ошибки,
 * запуск сессии любой длины от одной ошибки. Всё из локального журнала:
 * первый кадр - скелетон финальной геометрии, потом данные без прыжков.
 */

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { title: 'Работа над ошибками', back: 'Назад', ready: 'готовы', corrected: 'исправлено', map30: 'За 30 дней', mistakes: 'ошибок', sources: 'Откуда приходят', all: 'Все', start: 'Разобрать', startAll: 'Разобрать все', list: 'Мои ошибки', empty: 'Всё исправлено', emptyBody: 'Новые ошибки из уроков, арены и карточек появятся здесь сами.', shelf: 'Смотреть исправленные', noData: 'Ошибок пока нет' },
  uk: { title: 'Робота над помилками', back: 'Назад', ready: 'готові', corrected: 'виправлено', map30: 'За 30 днів', mistakes: 'помилок', sources: 'Звідки приходять', all: 'Усі', start: 'Розібрати', startAll: 'Розібрати всі', list: 'Мої помилки', empty: 'Усе виправлено', emptyBody: 'Нові помилки з уроків, арени та карток з’являться тут самі.', shelf: 'Дивитися виправлені', noData: 'Помилок поки немає' },
  en: { title: 'Mistake practice', back: 'Back', ready: 'ready', corrected: 'fixed', map30: 'Last 30 days', mistakes: 'mistakes', sources: 'Where they come from', all: 'All', start: 'Practise', startAll: 'Practise all', list: 'My mistakes', empty: 'Everything is fixed', emptyBody: 'New mistakes from lessons, the arena and cards will show up here on their own.', shelf: 'See fixed mistakes', noData: 'No mistakes yet' },
  es: { title: 'Trabajo con errores', back: 'Atrás', ready: 'listos', corrected: 'corregidos', map30: 'Últimos 30 días', mistakes: 'errores', sources: 'De dónde vienen', all: 'Todos', start: 'Practicar', startAll: 'Practicar todos', list: 'Mis errores', empty: 'Todo corregido', emptyBody: 'Los nuevos errores de lecciones, arena y tarjetas aparecerán aquí solos.', shelf: 'Ver corregidos', noData: 'Aún no hay errores' },
  'pt-BR': { title: 'Trabalho com erros', back: 'Voltar', ready: 'prontos', corrected: 'corrigidos', map30: 'Últimos 30 dias', mistakes: 'erros', sources: 'De onde vêm', all: 'Todos', start: 'Praticar', startAll: 'Praticar todos', list: 'Meus erros', empty: 'Tudo corrigido', emptyBody: 'Novos erros de lições, arena e cartões vão aparecer aqui sozinhos.', shelf: 'Ver corrigidos', noData: 'Ainda não há erros' },
  vi: { title: 'Luyện lỗi sai', back: 'Quay lại', ready: 'sẵn sàng', corrected: 'đã sửa', map30: '30 ngày qua', mistakes: 'lỗi', sources: 'Lỗi đến từ đâu', all: 'Tất cả', start: 'Luyện', startAll: 'Luyện tất cả', list: 'Lỗi của tôi', empty: 'Đã sửa hết', emptyBody: 'Lỗi mới từ bài học, đấu trường và thẻ sẽ tự xuất hiện ở đây.', shelf: 'Xem lỗi đã sửa', noData: 'Chưa có lỗi nào' },
  id: { title: 'Latihan kesalahan', back: 'Kembali', ready: 'siap', corrected: 'diperbaiki', map30: '30 hari terakhir', mistakes: 'kesalahan', sources: 'Asal kesalahan', all: 'Semua', start: 'Latih', startAll: 'Latih semua', list: 'Kesalahanku', empty: 'Semua sudah diperbaiki', emptyBody: 'Kesalahan baru dari pelajaran, arena, dan kartu akan muncul di sini.', shelf: 'Lihat yang diperbaiki', noData: 'Belum ada kesalahan' },
  tr: { title: 'Hata çalışması', back: 'Geri', ready: 'hazır', corrected: 'düzeltildi', map30: 'Son 30 gün', mistakes: 'hata', sources: 'Nereden geliyor', all: 'Tümü', start: 'Çalış', startAll: 'Tümünü çalış', list: 'Hatalarım', empty: 'Hepsi düzeltildi', emptyBody: 'Ders, arena ve kartlardan gelen yeni hatalar burada kendiliğinden görünür.', shelf: 'Düzeltilenleri gör', noData: 'Henüz hata yok' },
  pl: { title: 'Praca nad błędami', back: 'Wstecz', ready: 'gotowe', corrected: 'poprawione', map30: 'Ostatnie 30 dni', mistakes: 'błędów', sources: 'Skąd pochodzą', all: 'Wszystkie', start: 'Przećwicz', startAll: 'Przećwicz wszystkie', list: 'Moje błędy', empty: 'Wszystko poprawione', emptyBody: 'Nowe błędy z lekcji, areny i fiszek pojawią się tu same.', shelf: 'Zobacz poprawione', noData: 'Nie ma jeszcze błędów' },
});

/** Peek-кэш: повторный вход рисует прошлое состояние сразу, без скелетона. */
let hubSnapshotPeek: Readonly<{ key: string; snapshot: MistakePracticeHubSnapshot }> | null = null;

function FacetBar({ share, index, top, reduceMotion }: Readonly<{ share: number; index: number; top: boolean; reduceMotion: boolean }>) {
  const { theme: t } = useTheme();
  const progress = useSharedValue(reduceMotion ? share : 0);
  useEffect(() => {
    progress.value = reduceMotion ? share : withDelay(index * 90, withTiming(share, { duration: 720 }));
  }, [index, progress, reduceMotion, share]);
  const style = useAnimatedStyle(() => ({ width: `${Math.max(0, Math.min(100, progress.value * 100))}%` }));
  return (
    <View style={[styles.barTrack, { backgroundColor: t.bgSurface2 }]}>
      <Reanimated.View style={[styles.barFill, { backgroundColor: top ? t.wrong : t.accent }, style]} />
    </View>
  );
}

export default function MistakesHubScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const reduceMotion = useReduceMotion();
  const copy = useMemo(() => copyFor(lang), [lang]);
  const target = studyTarget === 'fr' ? 'fr' : 'en';
  const peekKey = `${target}:${lang}`;
  const [snapshot, setSnapshot] = useState<MistakePracticeHubSnapshot | null>(() =>
    hubSnapshotPeek?.key === peekKey ? hubSnapshotPeek.snapshot : null);
  const [advice, setAdvice] = useState<MistakeHubAdvice | null>(null);
  const [length, setLength] = useState<MistakePracticeLength>('5');
  const gate = useMistakePracticeStartGate('mistakes_hub_start');
  const openingRef = useRef(false);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    openingRef.current = false;
    void (async () => {
      const startedAt = Date.now();
      const [accountScope, next] = await Promise.all([getStableId(), loadMistakePracticeHubSnapshot(target)]);
      if (cancelled) return;
      hubSnapshotPeek = { key: peekKey, snapshot: next };
      setSnapshot(next);
      const summary = buildMistakeHubAdviceSummary({ insights: next.insights, readyCount: next.readyCount, studyTarget: target, lang });
      // Сначала то, что уже готово (кэш ИИ на сегодня или правило), сеть - фоном.
      const shown = await resolveMistakeHubAdvice({ accountScope, summary });
      if (cancelled) return;
      setAdvice(shown);
      // guard-ok: трассировка входа экрана (правило «сперва логи»)
      console.log('[MISTAKES-HUB] open', JSON.stringify({ ready: next.readyCount, active: next.insights.active, adviceSource: shown.source, ms: Date.now() - startedAt }));
      void refreshMistakeHubAdvice({ accountScope, summary }).then((fresh) => {
        if (!cancelled && fresh) setAdvice(fresh);
      });
    })().catch((error: unknown) => {
      // guard-ok: лог в catch обязателен
      console.warn('[MISTAKES-HUB] open:catch', error instanceof Error ? error.message : String(error));
    });
    return () => { cancelled = true; };
  }, [lang, peekKey, target]));

  const readyCount = snapshot?.readyCount ?? 0;
  const options = useMemo(() => mistakePracticeLengthOptions(readyCount), [readyCount]);
  useEffect(() => {
    if (options.some((option) => option.id === length && option.enabled)) return;
    setLength(options.find((option) => option.enabled)?.id ?? 'all');
  }, [length, options]);
  const sessionCount = mistakePracticeSessionCount(length, readyCount);
  const costsEnergy = mistakePracticeSessionCostsEnergy(sessionCount);
  const showSegments = readyCount >= 5;

  const facetTotal = snapshot?.insights.frequentFacets.reduce((sum, item) => sum + item.count, 0) ?? 0;
  const facets = snapshot?.insights.frequentFacets ?? [];
  const sources = (snapshot?.insights.frequentSources ?? []).slice(0, 3);
  const active = snapshot?.insights.active ?? 0;
  const corrected = snapshot?.insights.corrected ?? 0;
  const loaded = snapshot !== null;
  const allFixed = loaded && active === 0 && corrected > 0;
  const nothingYet = loaded && active === 0 && corrected === 0;

  const startSession = useCallback(() => {
    if (openingRef.current || sessionCount < 1) return;
    hapticTap();
    if (!gate.tryStartSession()) return;
    openingRef.current = true;
    trackMistakePracticeEvent('mistake_practice_setup_started', {
      study_target: target,
      entry_source: 'mistakes_hub',
      requested_length: length,
      ready_count: readyCount,
      session_count: sessionCount,
      costs_energy: costsEnergy,
    });
    router.push({ pathname: '/mistake_practice_session', params: { length } } as never);
  }, [costsEnergy, gate, length, readyCount, router, sessionCount, target]);

  const openList = useCallback((filter: 'ready' | 'all' | 'corrected') => {
    hapticTap();
    router.push({ pathname: '/mistakes_list', params: { filter } } as never);
  }, [router]);

  return (
    <ScreenGradient>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={copy.back} hitSlop={10} onPress={() => safeRouterBack(router, '/' as never)} style={[styles.iconButton, { backgroundColor: t.bgCard }]}>
            <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
          </Pressable>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h3 }]} numberOfLines={2}>{copy.title}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Сводка: готовы / исправлено. Тап ведёт в список с нужным фильтром. */}
          <View style={styles.pillRow}>
            {loaded ? (
              <>
                <Pressable testID="mistakes-hub-ready" accessibilityRole="button" onPress={() => openList('ready')} style={[styles.pill, { backgroundColor: t.wrongBg }]}>
                  <Text style={[styles.pillNum, { color: t.textPrimary, fontSize: f.body }]}>{readyCount}</Text>
                  <Text style={[styles.pillText, { color: t.textPrimary, fontSize: f.label }]}>{copy.ready}</Text>
                </Pressable>
                <Pressable testID="mistakes-hub-corrected" accessibilityRole="button" onPress={() => openList('corrected')} style={[styles.pill, { backgroundColor: t.correctBg }]}>
                  <Text style={[styles.pillNum, { color: t.textPrimary, fontSize: f.body }]}>{corrected}</Text>
                  <Text style={[styles.pillText, { color: t.textPrimary, fontSize: f.label }]}>{copy.corrected}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <SkeletonBlock width={110} height={36} borderRadius={18} />
                <SkeletonBlock width={130} height={36} borderRadius={18} />
              </>
            )}
          </View>

          {allFixed || nothingYet ? (
            <View style={[styles.card, { backgroundColor: t.bgCard }]}>
              <View style={[styles.emptyIcon, { backgroundColor: t.correctBg }]}>
                <Ionicons name="checkmark" size={36} color={t.correct} />
              </View>
              <Text style={[styles.emptyTitle, { color: t.textPrimary, fontSize: f.h3 }]}>{allFixed ? copy.empty : copy.noData}</Text>
              <Text style={[styles.body, { color: t.textMuted, fontSize: f.body }]}>{copy.emptyBody}</Text>
              {allFixed ? (
                <Pressable accessibilityRole="button" onPress={() => openList('corrected')} style={[styles.secondary, { backgroundColor: t.bgSurface2 }]}>
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>{copy.shelf}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <>
              {/* Карта слабых мест: тип → доля за 30 дней. */}
              <View style={[styles.card, { backgroundColor: t.bgCard }]}>
                <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.bodyLg }]}>
                  {loaded ? `${copy.map30} · ${facetTotal} ${copy.mistakes}` : copy.map30}
                </Text>
                <View style={styles.facets}>
                  {loaded ? facets.map((item, index) => (
                    <View key={item.facet} style={styles.facet}>
                      <View style={styles.facetRow}>
                        <Text style={[styles.facetName, { color: t.textPrimary, fontSize: f.body }]}>{mistakeFacetLabel(lang, item.facet as MistakeFacet)}</Text>
                        <Text style={[styles.facetVal, { color: t.textMuted, fontSize: f.body }]}>{facetTotal > 0 ? Math.round((item.count / facetTotal) * 100) : 0}%</Text>
                      </View>
                      <FacetBar share={facetTotal > 0 ? item.count / facetTotal : 0} index={index} top={index === 0} reduceMotion={reduceMotion} />
                    </View>
                  )) : [0, 1, 2].map((index) => (
                    <View key={`skeleton-${index}`} style={styles.facet}>
                      <View style={styles.facetRow}><SkeletonBlock width={140} height={16} /><SkeletonBlock width={40} height={16} /></View>
                      <SkeletonBlock width="100%" height={10} />
                    </View>
                  ))}
                </View>
              </View>

              {/* Наблюдение: готово до открытия (кэш ИИ на сегодня или правило). Без подписи «ИИ». */}
              <View style={[styles.card, { backgroundColor: t.bgSurface }]}>
                {advice ? (
                  <Text testID="mistakes-hub-advice" style={[styles.advice, { color: t.textPrimary, fontSize: f.bodyLg }]}>{advice.hub}</Text>
                ) : (
                  <View style={{ gap: 10 }}><SkeletonBlock width="92%" height={18} /><SkeletonBlock width="70%" height={18} /></View>
                )}
              </View>

              {/* Откуда приходят. */}
              <View style={[styles.card, { backgroundColor: t.bgCard }]}>
                <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.bodyLg }]}>{copy.sources}</Text>
                <View style={styles.sourceRow}>
                  {loaded ? sources.map((item) => (
                    <View key={item.source} style={[styles.sourceTile, { backgroundColor: t.bgSurface2 }]}>
                      <Text style={[styles.sourceNum, { color: t.textPrimary }]}>{item.count}</Text>
                      <Text style={[styles.sourceLabel, { color: t.textMuted, fontSize: f.label }]} numberOfLines={1}>{mistakeSourceLabel(lang, item.source)}</Text>
                    </View>
                  )) : [0, 1, 2].map((index) => <SkeletonBlock key={`skeleton-source-${index}`} width="31%" height={76} borderRadius={18} />)}
                  {loaded && advice?.map ? (
                    <Text style={[styles.body, { color: t.textMuted, fontSize: f.sub, width: '100%' }]}>{advice.map}</Text>
                  ) : null}
                </View>
              </View>

              <Pressable testID="mistakes-hub-list" accessibilityRole="button" onPress={() => openList('all')} style={[styles.listLink, { backgroundColor: t.bgCard }]}>
                <Text style={[styles.cardTitle, { color: t.textPrimary, fontSize: f.body, flex: 1 }]}>{copy.list}</Text>
                <Text style={[styles.facetVal, { color: t.textMuted, fontSize: f.body }]}>{active}</Text>
                <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
              </Pressable>
            </>
          )}
        </ScrollView>

        {loaded && readyCount > 0 ? (
          <View style={styles.dock}>
            {showSegments ? (
              <View style={[styles.segment, { backgroundColor: t.bgCard }]}>
                {options.map((option) => {
                  const on = option.id === length;
                  return (
                    <Pressable
                      key={option.id}
                      testID={`mistakes-hub-length-${option.id}`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on, disabled: !option.enabled }}
                      disabled={!option.enabled}
                      hitSlop={4}
                      onPress={() => { hapticTap(); setLength(option.id); }}
                      style={[styles.segmentItem, on && { backgroundColor: t.bgSurface2 }, !option.enabled && { opacity: 0.38 }]}
                    >
                      <Text style={{ color: on ? t.textPrimary : t.textMuted, fontSize: f.body, fontWeight: '800' }}>
                        {option.id === 'all' ? `${copy.all} ${option.count}` : option.id}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            <View style={styles.startWrap}>
              <Pressable
                testID="mistakes-hub-start"
                accessibilityRole="button"
                onPress={startSession}
                style={({ pressed }) => [styles.start, { backgroundColor: t.accent, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
              >
                <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '800' }}>
                  {showSegments ? `${copy.start} ${sessionCount}` : `${copy.startAll} ${sessionCount}`}
                </Text>
              </Pressable>
              {costsEnergy ? <EnergyCostBadge activity="mistake_practice" testID="mistakes-hub-energy-cost" /> : null}
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
  iconButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontWeight: '900', letterSpacing: -0.4 },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 160, gap: 12 },
  pillRow: { flexDirection: 'row', gap: 8, minHeight: 36 },
  pill: { height: 36, borderRadius: 18, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillNum: { fontWeight: '900', fontVariant: ['tabular-nums'] },
  pillText: { fontWeight: '800' },
  card: { borderRadius: 22, padding: 18, gap: 12 },
  cardTitle: { fontWeight: '900', letterSpacing: -0.2 },
  facets: { gap: 12 },
  facet: { gap: 7 },
  facetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 20 },
  facetName: { fontWeight: '800', flexShrink: 1 },
  facetVal: { fontWeight: '900', fontVariant: ['tabular-nums'] },
  barTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  advice: { fontWeight: '700', lineHeight: 26 },
  body: { fontWeight: '600', lineHeight: 22 },
  sourceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sourceTile: { width: '31%', flexGrow: 1, minHeight: 76, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 6 },
  sourceNum: { fontSize: 28, fontWeight: '900', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  sourceLabel: { fontWeight: '800' },
  listLink: { borderRadius: 18, paddingHorizontal: 18, minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 26, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  emptyTitle: { fontWeight: '900', textAlign: 'center' },
  secondary: { minHeight: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  dock: { position: 'absolute', left: 16, right: 16, bottom: 22, gap: 10 },
  segment: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: 18 },
  segmentItem: { flex: 1, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  startWrap: { position: 'relative' },
  start: { minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
