import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useScaledTextStyles } from '../hooks/useLineScale';
import { SafeAreaView } from 'react-native-safe-area-context';

// зачем: тот же контрол обновления, что в лиге — один язык жеста по приложению.
import HybridRefreshControl from '../components/feedback/HybridRefreshControl';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useLv2Glass } from '../components/learning-v2/LearningV2Glass';
import { BackButton, FilterChips, MiniDots, Panel, PanelCta, PanelDock, PanelRing, PanelRow, ScreenTitle, type PanelChip } from '../components/mistakes-panel/PanelKit';
import { PanelSheet } from '../components/mistakes-panel/PanelSheet';
import { mpColors, themePair, mixDark } from '../components/mistakes-panel/panelPaint';
import { MISTAKE_GROUPS, mistakeGroupLabel, mistakeGroupOf, type MistakeGroupFilter } from '../components/mistakes-panel/mistakeGroups';
import { triLang, type Lang } from '../constants/i18n';
import { pluralWord } from '../constants/plural';
import { hapticTap } from '../hooks/use-haptics';
import { useMistakePracticeStartGate } from '../hooks/useMistakePracticeStartGate';
import { normalizeMistakeStudyTarget } from '../modules/mistake-practice/contracts';
import { MISTAKE_PRACTICE_MAX_SESSION, mistakePracticeSessionCostsEnergy } from '../modules/mistake-practice/session';
import { trackMistakePracticeEvent } from './mistake_practice_analytics';
import { loadMistakePracticeHubSnapshot, type MistakePracticeHubSnapshot } from './mistake_practice_insights';
import { isDevMistakesDemoOn } from './dev_mistakes_demo';
import { withoutLocallyHiddenMistakes } from './mistake_local_hidden';
import { rememberMistakeDetailDraft } from './mistake_detail_draft';
import { safeRouterBack } from './navigation_back';
import NoEnergyModal from '../components/NoEnergyModal';
import { peekStableId } from './stable_id';

/**
 * Хаб «Мои ошибки» — вариант Б «Панель» (макет docs/design/v2-app/mistakes-panel.html, экраны «Хаб», «Хаб — загрузка», «Перед отработкой»,
 * «Ошибок нет», «На сегодня всё», «Сейчас недоступно»; одобрен владельцем 04.10.2026).
 *
 * зачем (владелец: «1 в 1, без малейших потерь»): кольцо прогресса, ленты-фильтры по типам, одна панель с ошибками, кнопка «Отработать N»
 * и шторка выбора перед стартом. Всё из локального журнала: первый кадр — снимок прошлого открытия (peek) или каркас финальной геометрии,
 * сети нет вовсе (0 чтений Firestore). Подсказка-наблюдение и «откуда приходят» в макете «Панели» не предусмотрены — убраны вместе с их
 * вызовами ИИ (экономия).
 */

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { title: 'Мои ошибки', back: 'Назад', fixed: 'исправлено', fixedN: 'исправлено', waitN: 'ждут', all: 'Все', practice: 'Отработать', sheetTitle: 'Отработка', mistakes: { one: 'ошибка', few: 'ошибки', many: 'ошибок' }, about: 'около', mins: { one: 'минуты', few: 'минут', many: 'минут' }, start: 'Начать', loading: 'Загружаем…', emptyTitle: 'Ошибок нет', emptySub: 'Всё исправлено', emptyFresh: 'Новые ошибки из уроков и карточек появятся здесь сами', todayTitle: 'На сегодня всё', todaySub: 'Остальные ошибки вернутся завтра', waiting: 'Ждут', toLessons: 'К урокам', offlineTitle: 'Сейчас недоступно', offlineSub: 'Проверь интернет', retry: 'Попробовать снова' },
  uk: { title: 'Мої помилки', back: 'Назад', fixed: 'виправлено', fixedN: 'виправлено', waitN: 'чекають', all: 'Усі', practice: 'Відпрацювати', sheetTitle: 'Відпрацювання', mistakes: { one: 'помилка', few: 'помилки', many: 'помилок' }, about: 'близько', mins: { one: 'хвилини', few: 'хвилин', many: 'хвилин' }, start: 'Почати', loading: 'Завантажуємо…', emptyTitle: 'Помилок немає', emptySub: 'Усе виправлено', emptyFresh: 'Нові помилки з уроків і карток з’являться тут самі', todayTitle: 'На сьогодні все', todaySub: 'Решта помилок повернеться завтра', waiting: 'Чекають', toLessons: 'До уроків', offlineTitle: 'Зараз недоступно', offlineSub: 'Перевір інтернет', retry: 'Спробувати знову' },
  en: { title: 'My mistakes', back: 'Back', fixed: 'fixed', fixedN: 'fixed', waitN: 'waiting', all: 'All', practice: 'Practice', sheetTitle: 'Practice', mistakes: { one: 'mistake', few: 'mistakes', many: 'mistakes' }, about: 'about', mins: { one: 'minute', few: 'minutes', many: 'minutes' }, start: 'Start', loading: 'Loading…', emptyTitle: 'No mistakes', emptySub: 'Everything is fixed', emptyFresh: 'New mistakes from lessons and cards will show up here on their own', todayTitle: 'All done for today', todaySub: 'The rest will come back tomorrow', waiting: 'Waiting', toLessons: 'To lessons', offlineTitle: 'Unavailable right now', offlineSub: 'Check your internet', retry: 'Try again' },
  es: { title: 'Mis errores', back: 'Atrás', fixed: 'corregidos', fixedN: 'corregidos', waitN: 'esperan', all: 'Todos', practice: 'Practicar', sheetTitle: 'Práctica', mistakes: { one: 'error', few: 'errores', many: 'errores' }, about: 'unos', mins: { one: 'minuto', few: 'minutos', many: 'minutos' }, start: 'Empezar', loading: 'Cargando…', emptyTitle: 'Sin errores', emptySub: 'Todo corregido', emptyFresh: 'Los nuevos errores de lecciones y tarjetas aparecerán aquí solos', todayTitle: 'Todo por hoy', todaySub: 'El resto volverá mañana', waiting: 'Esperan', toLessons: 'A las lecciones', offlineTitle: 'No disponible ahora', offlineSub: 'Revisa tu internet', retry: 'Reintentar' },
  'pt-BR': { title: 'Meus erros', back: 'Voltar', fixed: 'corrigidos', fixedN: 'corrigidos', waitN: 'esperam', all: 'Todos', practice: 'Praticar', sheetTitle: 'Prática', mistakes: { one: 'erro', few: 'erros', many: 'erros' }, about: 'cerca de', mins: { one: 'minuto', few: 'minutos', many: 'minutos' }, start: 'Começar', loading: 'Carregando…', emptyTitle: 'Sem erros', emptySub: 'Tudo corrigido', emptyFresh: 'Novos erros de lições e cartões vão aparecer aqui sozinhos', todayTitle: 'Tudo por hoje', todaySub: 'O resto volta amanhã', waiting: 'Esperam', toLessons: 'Às lições', offlineTitle: 'Indisponível agora', offlineSub: 'Verifique a internet', retry: 'Tentar de novo' },
  vi: { title: 'Lỗi của tôi', back: 'Quay lại', fixed: 'đã sửa', fixedN: 'đã sửa', waitN: 'đang chờ', all: 'Tất cả', practice: 'Luyện', sheetTitle: 'Luyện tập', mistakes: { one: 'lỗi', few: 'lỗi', many: 'lỗi' }, about: 'khoảng', mins: { one: 'phút', few: 'phút', many: 'phút' }, start: 'Bắt đầu', loading: 'Đang tải…', emptyTitle: 'Không có lỗi', emptySub: 'Đã sửa hết', emptyFresh: 'Lỗi mới từ bài học và thẻ sẽ tự xuất hiện ở đây', todayTitle: 'Xong hôm nay', todaySub: 'Phần còn lại sẽ quay lại vào ngày mai', waiting: 'Đang chờ', toLessons: 'Tới bài học', offlineTitle: 'Hiện chưa dùng được', offlineSub: 'Kiểm tra internet', retry: 'Thử lại' },
  id: { title: 'Kesalahanku', back: 'Kembali', fixed: 'diperbaiki', fixedN: 'diperbaiki', waitN: 'menunggu', all: 'Semua', practice: 'Latih', sheetTitle: 'Latihan', mistakes: { one: 'kesalahan', few: 'kesalahan', many: 'kesalahan' }, about: 'sekitar', mins: { one: 'menit', few: 'menit', many: 'menit' }, start: 'Mulai', loading: 'Memuat…', emptyTitle: 'Tidak ada kesalahan', emptySub: 'Semua sudah diperbaiki', emptyFresh: 'Kesalahan baru dari pelajaran dan kartu akan muncul di sini', todayTitle: 'Cukup untuk hari ini', todaySub: 'Sisanya kembali besok', waiting: 'Menunggu', toLessons: 'Ke pelajaran', offlineTitle: 'Tidak tersedia sekarang', offlineSub: 'Periksa internet', retry: 'Coba lagi' },
  tr: { title: 'Hatalarım', back: 'Geri', fixed: 'düzeltildi', fixedN: 'düzeltildi', waitN: 'bekliyor', all: 'Tümü', practice: 'Çalış', sheetTitle: 'Çalışma', mistakes: { one: 'hata', few: 'hata', many: 'hata' }, about: 'yaklaşık', mins: { one: 'dakika', few: 'dakika', many: 'dakika' }, start: 'Başla', loading: 'Yükleniyor…', emptyTitle: 'Hata yok', emptySub: 'Hepsi düzeltildi', emptyFresh: 'Ders ve kartlardan gelen yeni hatalar burada kendiliğinden görünür', todayTitle: 'Bugünlük bu kadar', todaySub: 'Kalanlar yarın geri gelir', waiting: 'Bekleyen', toLessons: 'Derslere', offlineTitle: 'Şu an kullanılamıyor', offlineSub: 'İnterneti kontrol et', retry: 'Tekrar dene' },
  pl: { title: 'Moje błędy', back: 'Wstecz', fixed: 'poprawione', fixedN: 'poprawione', waitN: 'czeka', all: 'Wszystkie', practice: 'Przećwicz', sheetTitle: 'Ćwiczenie', mistakes: { one: 'błąd', few: 'błędy', many: 'błędów' }, about: 'około', mins: { one: 'minuty', few: 'minut', many: 'minut' }, start: 'Zacznij', loading: 'Ładowanie…', emptyTitle: 'Brak błędów', emptySub: 'Wszystko poprawione', emptyFresh: 'Nowe błędy z lekcji i fiszek pojawią się tu same', todayTitle: 'Na dziś wszystko', todaySub: 'Reszta wróci jutro', waiting: 'Czekają', toLessons: 'Do lekcji', offlineTitle: 'Chwilowo niedostępne', offlineSub: 'Sprawdź internet', retry: 'Spróbuj ponownie' },
});

/** Peek-кэш: повторный вход рисует прошлое состояние сразу, без каркаса. */
let hubSnapshotPeek: Readonly<{ key: string; snapshot: MistakePracticeHubSnapshot }> | null = null;

/**
 * зачем (аудит «каждый раздел открывается мгновенно», 04.10): список ошибок на каждом открытии показывал скелетон, хотя хаб уже держит снимок.
 * Ключ включает аккаунт (stable id из памяти): снимок другого аккаунта первым кадром не показываем.
 */
export function mistakesHubPeekKey(target: string, lang: string): string {
  return `${peekStableId() ?? ''}:${target}:${lang}`;
}
export function peekMistakesHubSnapshot(target: string, lang: string): MistakePracticeHubSnapshot | null {
  return hubSnapshotPeek?.key === mistakesHubPeekKey(target, lang) ? hubSnapshotPeek.snapshot : null;
}

const SECONDS_PER_MISTAKE = 20;

type HubMode = 'loading' | 'failed' | 'fresh' | 'allFixed' | 'todayDone' | 'normal';

export default function MistakesHubScreen() {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const router = useRouter();
  const g = useLv2Glass();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const copy = useMemo(() => copyFor(lang), [lang]);
  // зачем (22.09): было `studyTarget === 'fr' ? 'fr' : 'en'` — испанский и немецкий молча превращались в английский, и человек
  // видел ЧУЖИЕ ошибки вместо своих. Журнал разложен по языковым ключам, язык нельзя подменять.
  const target = normalizeMistakeStudyTarget(studyTarget);
  const peekKey = mistakesHubPeekKey(target, lang);
  const [snapshot, setSnapshot] = useState<MistakePracticeHubSnapshot | null>(() => (hubSnapshotPeek?.key === peekKey ? hubSnapshotPeek.snapshot : null));
  const [failed, setFailed] = useState(false);
  const [group, setGroup] = useState<MistakeGroupFilter>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetGroup, setSheetGroup] = useState<MistakeGroupFilter>('all');
  const gate = useMistakePracticeStartGate('mistakes_hub_start');
  const openingRef = useRef(false);

  const load = useCallback((reason: string, isCancelled: () => boolean) => {
    const startedAt = Date.now();
    return loadMistakePracticeHubSnapshot(target)
      .then((next) => {
        if (isCancelled()) return;
        hubSnapshotPeek = { key: peekKey, snapshot: next };
        setSnapshot(next);
        setFailed(false);
        // guard-ok: трассировка входа экрана (правило «сперва логи»)
        console.log('[MISTAKES-HUB] open', JSON.stringify({ reason, ready: next.readyCount, active: next.insights.active, corrected: next.insights.corrected, ms: Date.now() - startedAt }));
      })
      .catch((error: unknown) => {
        // guard-ok: лог в catch обязателен; журнал локальный, отказ почти невозможен — но причина должна быть видна.
        console.warn('[MISTAKES-HUB] open:catch', reason, error instanceof Error ? error.message : String(error));
        if (!isCancelled()) setFailed(true);
      });
  }, [peekKey, target]);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    openingRef.current = false;
    void load('focus', () => cancelled);
    return () => { cancelled = true; };
  }, [load]));

  // зачем (владелец 18.10 07:45: «экранов-ошибок нигде»; правило п.2): снимок журнала не прочитался — без экрана
  // «Сейчас недоступно». Показываем спокойное пустое состояние раздела, а чтение тихо повторяем: 3 попытки с паузами
  // 2/5/10 с, затем — при возврате в приложение. Журнал локальный, сеть и Firestore не трогаются.
  const silentRetryRef = useRef(0);
  useEffect(() => {
    if (!failed) {
      silentRetryRef.current = 0;
      return undefined;
    }
    const attempt = silentRetryRef.current;
    const delays = [2000, 5000, 10000];
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (attempt < delays.length) {
      console.warn(`[NO-ERROR-SCREEN] screen=mistakes_hub reason=snapshot_failed shown=calm_empty retry=${attempt + 1}/${delays.length} in=${delays[attempt]}ms`); // guard-ok: тихий повтор называет причину
      timer = setTimeout(() => {
        silentRetryRef.current = attempt + 1;
        void load('silent_retry', () => false);
      }, delays[attempt]);
    } else {
      console.warn('[NO-ERROR-SCREEN] screen=mistakes_hub reason=snapshot_failed shown=calm_empty retry=on_foreground'); // guard-ok: повторы исчерпаны, ждём возврата в приложение
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      silentRetryRef.current = 0;
      void load('foreground', () => false);
    });
    return () => {
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [failed, load]);

  // зачем (аудит 2026-09-21, одобрено владельцем): pull-to-refresh ставим ТОЛЬКО там, где жест стоит 0 чтений Firestore.
  // Журнал ошибок лежит на устройстве, поэтому жест пересчитывает локальный снимок и в сеть не идёт вовсе.
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const onPullRefresh = useCallback(() => {
    if (refreshingRef.current) {
      // guard-ok: ранний выход объясняет причину навсегда.
      console.warn('[MISTAKES-HUB] refresh:ignored_already_running');
      return;
    }
    refreshingRef.current = true;
    setRefreshing(true);
    void load('pull', () => false).finally(() => {
      refreshingRef.current = false;
      setRefreshing(false);
    });
  }, [load]);

  // зачем (аудит Optimistic UI п.2): строки без локально скрытых — запись журнала могла ещё не дойти.
  const items = withoutLocallyHiddenMistakes(snapshot?.items ?? []);
  const active = snapshot?.insights.active ?? 0;
  const corrected = snapshot?.insights.corrected ?? 0;
  const readyCount = snapshot?.readyCount ?? 0;
  const progress = active + corrected > 0 ? corrected / (active + corrected) : 0;
  const percent = Math.round(progress * 100);

  const mode: HubMode = !snapshot ? (failed ? 'failed' : 'loading')
    : active === 0 ? (corrected > 0 ? 'allFixed' : 'fresh')
    : readyCount === 0 ? 'todayDone'
    : 'normal';

  const activeItems = useMemo(() => items.filter((item) => item.status === 'active'), [items]);
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { all: activeItems.length, meaning: 0, grammar: 0, sound: 0 };
    for (const item of activeItems) counts[mistakeGroupOf(item.facet)] += 1;
    return counts;
  }, [activeItems]);
  const chips = useMemo<PanelChip[]>(() => [
    { id: 'all', label: `${copy.all} ${groupCounts.all}` },
    ...MISTAKE_GROUPS.filter((id) => (groupCounts[id] ?? 0) > 0).map((id) => ({ id, label: `${mistakeGroupLabel(lang, id)} ${groupCounts[id]}` })),
  ], [copy.all, groupCounts, lang]);
  const rows = useMemo(() => activeItems.filter((item) => group === 'all' || mistakeGroupOf(item.facet) === group).slice(0, 12), [activeItems, group]);

  // Число ошибок в шторке «Перед отработкой»: готовые к повтору в выбранной группе, не больше предела сессии.
  const sheetReady = useMemo(
    () => Math.min(MISTAKE_PRACTICE_MAX_SESSION, activeItems.filter((item) => item.ready && (sheetGroup === 'all' || mistakeGroupOf(item.facet) === sheetGroup)).length),
    [activeItems, sheetGroup],
  );
  const sheetChips = useMemo<PanelChip[]>(() => [
    { id: 'all', label: `${copy.all} ${Math.min(MISTAKE_PRACTICE_MAX_SESSION, readyCount)}` },
    ...MISTAKE_GROUPS.map((id) => ({ id, n: activeItems.filter((item) => item.ready && mistakeGroupOf(item.facet) === id).length }))
      .filter((entry) => entry.n > 0)
      .map((entry) => ({ id: entry.id, label: `${mistakeGroupLabel(lang, entry.id)} ${entry.n}` })),
  ], [activeItems, copy.all, lang, readyCount]);

  const openSheet = useCallback(() => {
    hapticTap();
    setSheetGroup(group);
    setSheetOpen(true);
  }, [group]);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const startSession = useCallback(() => {
    if (openingRef.current || sheetReady < 1) return;
    hapticTap();
    if (!gate.tryStartSession(sheetReady)) return;
    openingRef.current = true;
    const costsEnergy = mistakePracticeSessionCostsEnergy(sheetReady);
    trackMistakePracticeEvent('mistake_practice_setup_started', {
      study_target: target,
      entry_source: 'mistakes_hub',
      requested_length: 'all',
      ready_count: readyCount,
      session_count: sheetReady,
      costs_energy: costsEnergy,
    });
    setSheetOpen(false);
    // зачем (бета-тест Б8, координатор 15.10; сперва логи): шторка обещает N ошибок — тренировка сверит это с тем, что получила
    // (expect), а крестик вернёт в хаб, а не на «Карточки» (from=hub). Источник числа: демо-снимок dev или настоящий журнал.
    console.log(`[MISTAKES-FLOW] хаб → тренировка: шторка=${sheetReady} готово=${readyCount} группа=${sheetGroup} источник=${isDevMistakesDemoOn() ? 'демо-снимок dev (mistakes=demo)' : 'журнал ошибок'}`); // guard-ok: журнал входа
    // quotaReceipt — id списанной попытки дня этого тапа: тренировка вернёт её, если не стартует (Ревизор 15.10)
    const flowParams = { length: 'all', from: 'hub', expect: String(sheetReady), ...gate.takeQuotaReceiptParam() };
    router.push({ pathname: '/mistake_practice_session', params: sheetGroup === 'all' ? flowParams : { ...flowParams, facetGroup: sheetGroup } } as never);
  }, [gate, readyCount, router, sheetGroup, sheetReady, target]);

  const openList = useCallback((filter: 'ready' | 'all' | 'corrected') => {
    hapticTap();
    router.push({ pathname: '/mistakes_list', params: { filter } } as never);
  }, [router]);
  const openOne = useCallback((mistakeId: string) => {
    hapticTap();
    // зачем (аудит Optimistic UI п.3): деталь рисует шапку из строки хаба на первом кадре.
    const item = snapshot?.items.find((row) => row.mistakeId === mistakeId);
    if (item) rememberMistakeDetailDraft({ mistakeId, phrase: item.phrase, meaning: item.meaning, captureCount: item.captureCount, qualifyingDays: item.qualifyingDays, status: item.status });
    router.push({ pathname: '/mistake_detail', params: { mistakeId } } as never);
  }, [router, snapshot]);
  const goBack = useCallback(() => safeRouterBack(router, '/' as never), [router]);

  const [accentA, accentB] = themePair(g);
  const iconTile = (name: keyof typeof Ionicons.glyphMap, color: string) => (
    <View style={styles.bigTile}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: mixDark(accentA, g.deepBase, 0.6) }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: mixDark(accentB, g.deepBaseAlt, 0.32), opacity: 0.55 }]} />
      <Ionicons name={name} size={32} color={color} />
    </View>
  );

  const centerRing = (full: boolean, node: React.ReactNode) => (
    <PanelRing g={g} progress={full ? 1 : 0}>{node}</PanelRing>
  );

  const legend = (
    <View style={styles.legend}>
      <Pressable testID="mistakes-hub-corrected" accessibilityRole="button" onPress={() => openList('corrected')} style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: g.accentGraphic }]} />
        <Text style={[styles.legendText, { color: g.secondary }]}>{`${corrected} ${copy.fixedN}`}</Text>
      </Pressable>
      <Pressable testID="mistakes-hub-ready" accessibilityRole="button" onPress={() => openList('all')} style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: `${g.text}40` }]} />
        <Text style={[styles.legendText, { color: g.secondary }]}>{`${active} ${copy.waitN}`}</Text>
      </Pressable>
    </View>
  );

  const body = (() => {
    if (mode === 'loading') {
      return (
        <>
          <PanelRing g={g} progress={0} />
          <Text style={[styles.loadingText, { color: g.secondary }]}>{copy.loading}</Text>
          <View style={styles.dimmed}><FilterChips g={g} chips={[{ id: 'a', label: copy.all }, { id: 'b', label: mistakeGroupLabel(lang, 'meaning') }, { id: 'c', label: mistakeGroupLabel(lang, 'grammar') }]} activeId="a" onChange={() => undefined} testIDPrefix="mistakes-hub-chip-skeleton" /></View>
          <Panel g={g}>
            {[0, 1, 2].map((i) => (
              <View key={`sk-${i}`} style={styles.skelRow}>
                {i > 0 ? <View pointerEvents="none" style={[styles.skelLine, { backgroundColor: g.hairlineSoft }]} /> : null}
                <View style={[styles.skel, { backgroundColor: g.line, height: 16, width: '50%' }]} />
                <View style={[styles.skel, { backgroundColor: g.line, height: 12, width: '30%', marginTop: 8 }]} />
              </View>
            ))}
          </Panel>
        </>
      );
    }
    if (mode === 'failed') {
      // зачем (владелец 18.10): вместо «Сейчас недоступно / Проверь интернет» — тот же спокойный вид, что у пустого журнала,
      // без заголовка «Ошибок нет» (мы этого не знаем); чтение повторяется тихо (эффект выше).
      return (
        <View testID="mistakes-hub-calm-empty" style={styles.stateWrap}>
          {centerRing(true, iconTile('checkmark', mpColors(g).ok))}
          <Text style={[styles.stateSub, { color: g.secondary }]}>{copy.emptyFresh}</Text>
        </View>
      );
    }
    if (mode === 'fresh' || mode === 'allFixed') {
      return (
        <View style={styles.stateWrap}>
          {centerRing(true, iconTile('checkmark', mpColors(g).ok))}
          <Text style={[styles.stateTitle, { color: g.text }]}>{copy.emptyTitle}</Text>
          <Text style={[styles.stateSub, { color: g.secondary }]}>{mode === 'fresh' ? copy.emptyFresh : copy.emptySub}</Text>
        </View>
      );
    }
    if (mode === 'todayDone') {
      return (
        <View style={styles.stateWrap}>
          {centerRing(false, iconTile('flag-outline', g.text))}
          <Text style={[styles.stateTitle, { color: g.text }]}>{copy.todayTitle}</Text>
          <Text style={[styles.stateSub, { color: g.secondary }]}>{copy.todaySub}</Text>
          <Panel g={g} style={styles.waitPanel}>
            <PanelRow g={g} first title={copy.waiting} right={<Text style={[styles.waitNum, { color: g.text }]}>{active}</Text>} />
          </Panel>
        </View>
      );
    }
    return (
      <>
        <PanelRing g={g} progress={progress}>
          <Text style={[styles.percent, { color: g.text }]}>{`${percent}%`}</Text>
          <Text style={[styles.percentLabel, { color: g.secondary }]}>{copy.fixed}</Text>
        </PanelRing>
        {legend}
        <FilterChips g={g} chips={chips} activeId={group} onChange={(id) => { hapticTap(); setGroup(id as MistakeGroupFilter); }} testIDPrefix="mistakes-hub-chip" />
        <Panel g={g}>
          {rows.map((item, index) => (
            <PanelRow
              key={item.mistakeId}
              g={g}
              first={index === 0}
              testID={`mistakes-hub-row-${item.mistakeId}`}
              title={item.phrase}
              subtitle={item.meaning}
              right={<MiniDots g={g} n={item.qualifyingDays} />}
              onPress={() => openOne(item.mistakeId)}
            />
          ))}
        </Panel>
      </>
    );
  })();

  const showDock = mode === 'normal' || mode === 'loading' || mode === 'fresh' || mode === 'allFixed' || mode === 'todayDone' || mode === 'failed';
  const dockCta = (() => {
    if (mode === 'normal') return <PanelCta g={g} testID="mistakes-hub-start" label={`${copy.practice} ${Math.min(MISTAKE_PRACTICE_MAX_SESSION, readyCount)}`} onPress={openSheet} />;
    if (mode === 'loading') return <PanelCta g={g} label={copy.practice} onPress={() => undefined} disabled />;
    return <PanelCta g={g} testID="mistakes-hub-to-lessons" label={copy.toLessons} onPress={() => { hapticTap(); router.push('/lessons_list' as never); }} />;
  })();

  const minutes = Math.max(1, Math.ceil((sheetReady * SECONDS_PER_MISTAKE) / 60));
  const sheetCosts = mistakePracticeSessionCostsEnergy(sheetReady);

  return (
    <ScreenGradient>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<HybridRefreshControl refreshing={refreshing} onRefresh={onPullRefresh} />} decelerationRate="fast"
        >
          <View style={styles.topbar}><BackButton g={g} label={copy.back} onPress={goBack} /></View>
          <ScreenTitle g={g} text={copy.title} />
          {body}
        </ScrollView>
        {showDock ? <PanelDock>{dockCta}</PanelDock> : null}
        <PanelSheet visible={sheetOpen} onClose={closeSheet} testID="mistakes-hub-sheet">
          <View style={styles.sheetHead}>
            <Text style={[styles.sheetTitle, { color: g.text }]}>{copy.sheetTitle}</Text>
            <Text style={[styles.sheetSub, { color: g.secondary }]}>
              {`${sheetReady} ${pluralWord(lang, sheetReady, copy.mistakes)} · ${copy.about} ${minutes} ${pluralWord(lang, minutes, copy.mins)}`}
            </Text>
          </View>
          <FilterChips g={g} chips={sheetChips} activeId={sheetGroup} onChange={(id) => { hapticTap(); setSheetGroup(id as MistakeGroupFilter); }} testIDPrefix="mistakes-hub-sheet-chip" />
          <View style={styles.sheetCta}>
            <PanelCta
              g={g}
              testID="mistakes-hub-sheet-start"
              label={copy.start}
              disabled={sheetReady < 1}
              onPress={startSession}
              trailing={sheetCosts ? (
                <View style={styles.energy}>
                  <Ionicons name="flash" size={18} color={g.accentInk} />
                  <Text style={[styles.energyNum, { color: g.accentInk }]}>1</Text>
                </View>
              ) : null}
            />
          </View>
        </PanelSheet>
      </SafeAreaView>
      {/* зачем (аудит R48): платная сессия при нехватке энергии — шторка вместо молчаливого закрытия тренировки; попытка дня цела */}
      <NoEnergyModal variant="learn" visible={gate.noEnergy} activity="mistake_practice" onBeforeOpenPremium={gate.dismissNoEnergy} onClose={gate.dismissNoEnergy} />
    </ScreenGradient>
  );
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  // зачем: нижний отступ под панель-кнопку (52 + поля), чтобы последняя строка не уходила под неё.
  content: { paddingHorizontal: 20, paddingBottom: 140 },
  topbar: { minHeight: 44, marginTop: 4, flexDirection: 'row', alignItems: 'center' },
  percent: { fontSize: 60, lineHeight: 62, fontWeight: '800', letterSpacing: -1.5 },
  percentLabel: { marginTop: 2, fontSize: 16, lineHeight: 21 },
  legend: { marginTop: 14, flexDirection: 'row', justifyContent: 'center', gap: 22 },
  legendItem: { flexDirection: 'row', alignItems: 'center', minHeight: 19 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendText: { fontSize: 16, lineHeight: 21 },
  loadingText: { marginTop: 14, fontSize: 16, lineHeight: 21, textAlign: 'center' },
  dimmed: { opacity: 0.5 },
  skelRow: { minHeight: 64, justifyContent: 'center' },
  skelLine: { position: 'absolute', left: 0, right: 0, top: 0, height: 1 },
  skel: { borderRadius: 10 },
  stateWrap: { alignItems: 'stretch' },
  stateTitle: { marginTop: 24, fontSize: 26, lineHeight: 32, fontWeight: '700', textAlign: 'center' },
  stateSub: { marginTop: 8, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  waitPanel: { marginTop: 26 },
  waitNum: { marginLeft: 'auto', fontSize: 22, lineHeight: 28, fontWeight: '700' },
  bigTile: { width: 76, height: 76, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  sheetHead: { alignItems: 'center' },
  sheetTitle: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  sheetSub: { marginTop: 6, fontSize: 16, lineHeight: 22 },
  sheetCta: { marginTop: 10 },
  energy: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  energyNum: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
});
