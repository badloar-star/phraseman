import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, InteractionManager, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BouncyScrollView from '../components/BouncyScrollView';
import ScreenGradient from '../components/ScreenGradient';
import SectionSheetHeader from '../components/SectionSheetHeader';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { safeRouterBack } from './navigation_back';
import { getCachedPublicIdeasPage, getCachedPublicUserIdea, getMyUserIdeaLikeIds, getPublicUserIdea, hydratePublicUserIdeasCache, likeUserIdea, listPublicUserIdeas, reportUserIdea, unlikeUserIdea } from './ideas_client';
import type { IdeaReportReason, IdeaTab, PublicIdea } from './ideas_types';
import { isIdeasEnabled } from './remote_flags';
import { getStableId, peekStableId } from './stable_id';
import FeatureIntroEntry from '../components/feature_intro/FeatureIntroEntry';

function IdeaLifecycleIcon({ status, color }: { status: PublicIdea['status']; color: string }) {
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (status !== 'in_progress') return;
    const animation = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 1600, useNativeDriver: true }));
    animation.start();
    return () => animation.stop();
  }, [rotation, status]);
  if (status !== 'in_progress' && status !== 'implemented') return null;
  const transform = status === 'in_progress'
    ? [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }]
    : undefined;
  return <Animated.View accessibilityLabel={status === 'implemented' ? 'Implemented' : 'In development'} style={{ transform }}><Ionicons name={status === 'implemented' ? 'checkmark' : 'settings-outline'} size={20} color={color} /></Animated.View>;
}

function IdeasCatalogSkeleton({ t }: { t: ReturnType<typeof useTheme>['theme'] }) {
  const opacity = useRef(new Animated.Value(0.48)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.82, duration: 850, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.48, duration: 850, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View accessibilityLabel="Loading ideas" style={{ gap: 0, opacity }}>
      {[0, 1, 2, 3, 4].map((row) => (
        <View key={row} style={{ minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <View style={{ flex: 1, gap: 9 }}>
            <View style={{ width: row % 2 ? '58%' : '72%', height: 14, borderRadius: 7, backgroundColor: t.bgCard }} />
            <View style={{ width: row % 3 ? '40%' : '31%', height: 10, borderRadius: 5, backgroundColor: t.bgCard }} />
          </View>
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: t.bgCard }} />
          <View style={{ width: 32, height: 28, borderRadius: 10, backgroundColor: t.bgCard }} />
        </View>
      ))}
    </Animated.View>
  );
}

function IdeasDetailSkeleton({ t }: { t: ReturnType<typeof useTheme>['theme'] }) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.82, duration: 850, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.5, duration: 850, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [opacity]);
  return <Animated.View accessibilityLabel="Loading idea" style={{ opacity, padding: 20 }}>
    <View style={{ width: '72%', height: 24, borderRadius: 8, backgroundColor: t.bgCard }} />
    <View style={{ width: '38%', height: 12, borderRadius: 6, backgroundColor: t.bgCard, marginTop: 14 }} />
    <View style={{ width: '100%', height: 16, borderRadius: 8, backgroundColor: t.bgCard, marginTop: 34 }} />
    <View style={{ width: '92%', height: 16, borderRadius: 8, backgroundColor: t.bgCard, marginTop: 10 }} />
    <View style={{ width: '64%', height: 16, borderRadius: 8, backgroundColor: t.bgCard, marginTop: 10 }} />
  </Animated.View>;
}

type LikeSyncState = {
  desired: boolean;
  version: number;
  serverLiked: boolean;
  serverCount: number;
  optimisticCount: number;
};

export default function IdeasCatalogScreen() {
  const router = useRouter();
  const ideasEnabled = isIdeasEnabled();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const [tab, setTab] = useState<IdeaTab>('new');
  const [ideas, setIdeas] = useState<PublicIdea[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [detail, setDetail] = useState<PublicIdea | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);
  const likeSyncStatesRef = useRef(new Map<string, LikeSyncState>());
  const [likeError, setLikeError] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<PublicIdea | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportedIdeaIds, setReportedIdeaIds] = useState<Set<string>>(new Set());
  const [myStableId, setMyStableId] = useState<string | null>(peekStableId());
  useEffect(() => {
    if (!ideasEnabled) return;
    if (myStableId) return;
    let active = true;
    void getStableId().then((id) => { if (active) setMyStableId(id); }).catch(() => undefined);
    return () => { active = false; };
  }, [ideasEnabled, myStableId]);
  useEffect(() => {
    if (!ideasEnabled) return;
    let active = true;
    const interaction = InteractionManager.runAfterInteractions(() => {
      void getMyUserIdeaLikeIds().then((ids) => { if (active) setLiked(ids); }).catch(() => undefined);
    });
    return () => { active = false; interaction.cancel(); };
  }, [ideasEnabled]);
  useEffect(() => { if (!ideasEnabled) router.replace('/(tabs)/settings' as never); }, [ideasEnabled, router]);

  const L = useCallback((ru: string, uk: string, en: string, es: string, ptBR: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl }), [lang]);

  const load = useCallback(async (force = false) => {
    const requestId = ++listRequestIdRef.current;
    await hydratePublicUserIdeasCache();
    if (requestId !== listRequestIdRef.current) return;
    const cached = getCachedPublicIdeasPage(tab);
    setIdeas(cached?.ideas ?? []);
    setNextCursor(cached?.nextCursor ?? null);
    setLoadMoreError(null);
    setLoadingMore(false);
    const hasVisibleData = Boolean(cached);
    setLoading(!hasVisibleData);
    setRefreshing(hasVisibleData);
    setError(null);
    try {
      const page = await listPublicUserIdeas(tab, { force });
      if (requestId !== listRequestIdRef.current) return;
      setIdeas(page.ideas);
      setNextCursor(page.nextCursor);
    } catch (e) {
      if (requestId === listRequestIdRef.current && !hasVisibleData) setError(String((e as { code?: string })?.code || 'unknown'));
    } finally {
      if (requestId === listRequestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [tab]);

  useEffect(() => { if (ideasEnabled) void load(); }, [ideasEnabled, load]);

  const loadMore = useCallback(async () => {
    const cursor = nextCursor;
    const expectedTab = tab;
    const requestId = listRequestIdRef.current;
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await listPublicUserIdeas(expectedTab, { cursor });
      if (requestId !== listRequestIdRef.current) return;
      setIdeas((previous) => {
        const existingIds = new Set(previous.map((idea) => idea.id));
        return [...previous, ...page.ideas.filter((idea) => !existingIds.has(idea.id))];
      });
      setNextCursor(page.nextCursor);
    } catch (error: unknown) {
      if (requestId === listRequestIdRef.current) setLoadMoreError(String((error as { code?: string })?.code || 'unknown'));
    } finally {
      if (requestId === listRequestIdRef.current) setLoadingMore(false);
    }
  }, [loadingMore, nextCursor, tab]);

  const openIdea = useCallback(async (id: string) => {
    const requestId = ++detailRequestIdRef.current;
    const cached = getCachedPublicUserIdea(id);
    setDetail(cached);
    setDetailLoading(!cached);
    setError(null);
    try {
      const loaded = await getPublicUserIdea(id, { force: true });
      if (requestId === detailRequestIdRef.current) setDetail(loaded);
    } catch (e) {
      const code = String((e as { code?: string })?.code || 'not-found');
      if (requestId !== detailRequestIdRef.current) return;
      if (!cached || code === 'not-found') {
        setDetail(null);
        setError(code);
      }
    } finally {
      if (requestId === detailRequestIdRef.current) setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    detailRequestIdRef.current += 1;
    setDetail(null);
    setDetailLoading(false);
    setError(null);
  }, []);

  const syncLike = useCallback(async (ideaId: string) => {
    while (true) {
      const state = likeSyncStatesRef.current.get(ideaId);
      if (!state) return;
      const version = state.version;
      const desired = state.desired;
      try {
        const result = desired ? await likeUserIdea(ideaId) : await unlikeUserIdea(ideaId);
        const current = likeSyncStatesRef.current.get(ideaId);
        if (!current) return;
        current.serverLiked = desired ? result.liked !== false : false;
        current.serverCount = result.likeCount;
        if (current.version !== version) continue;
        setIdeas((previous) => previous.map((item) => item.id === ideaId ? { ...item, likeCount: result.likeCount } : item));
        setDetail((previous) => previous?.id === ideaId ? { ...previous, likeCount: result.likeCount } : previous);
        likeSyncStatesRef.current.delete(ideaId);
        return;
      } catch (error: unknown) {
        const current = likeSyncStatesRef.current.get(ideaId);
        if (!current) return;
        if (current.version !== version) continue;
        setLiked((previous) => {
          const next = new Set(previous);
          if (current.serverLiked) next.add(ideaId); else next.delete(ideaId);
          return next;
        });
        setIdeas((previous) => previous.map((item) => item.id === ideaId ? { ...item, likeCount: current.serverCount } : item));
        setDetail((previous) => previous?.id === ideaId ? { ...previous, likeCount: current.serverCount } : previous);
        setLikeError(String((error as { code?: string })?.code || 'unknown'));
        likeSyncStatesRef.current.delete(ideaId);
        return;
      }
    }
  }, []);

  const toggleLike = useCallback((idea: PublicIdea) => {
    if (myStableId && idea.authorUid === myStableId) return;
    const existing = likeSyncStatesRef.current.get(idea.id);
    const isLiked = existing ? existing.desired : liked.has(idea.id);
    const nextLiked = !isLiked;
    const currentCount = existing ? existing.optimisticCount : idea.likeCount;
    const optimisticLikeCount = Math.max(0, currentCount + (nextLiked ? 1 : -1));
    const state = existing ?? {
      desired: isLiked,
      version: 0,
      serverLiked: isLiked,
      serverCount: idea.likeCount,
      optimisticCount: idea.likeCount,
    };
    state.desired = nextLiked;
    state.version += 1;
    state.optimisticCount = optimisticLikeCount;
    likeSyncStatesRef.current.set(idea.id, state);
    setLikeError(null);

    // The heart and count respond immediately. The callable only reconciles
    // the optimistic state in the background and rolls it back on failure.
    setLiked((previous) => {
      const next = new Set(previous);
      if (nextLiked) next.add(idea.id); else next.delete(idea.id);
      return next;
    });
    setIdeas((previous) => previous.map((item) => item.id === idea.id ? { ...item, likeCount: optimisticLikeCount } : item));
    setDetail((previous) => previous?.id === idea.id ? { ...previous, likeCount: optimisticLikeCount } : previous);
    if (!existing) void syncLike(idea.id);
  }, [liked, myStableId, syncLike]);

  const reportReasons = useMemo(() => [
    { value: 'inappropriate' as const, label: L('Оскорбительный или неприемлемый контент', 'Образливий або неприйнятний контент', 'Inappropriate content', 'Contenido inapropiado', 'Conteúdo inadequado', 'Nội dung không phù hợp', 'Konten tidak pantas', 'Uygunsuz içerik', 'Niewłaściwa treść') },
    { value: 'spam' as const, label: L('Спам или бессмысленная публикация', 'Спам або беззмістовна публікація', 'Spam or meaningless post', 'Spam o publicación sin sentido', 'Spam ou publicação sem sentido', 'Spam hoặc bài đăng vô nghĩa', 'Spam atau postingan tidak bermakna', 'Spam veya anlamsız gönderi', 'Spam lub bezsensowny wpis') },
    { value: 'personal_data' as const, label: L('Чужие личные данные', 'Чужі персональні дані', 'Someone’s personal data', 'Datos personales de otra persona', 'Dados pessoais de outra pessoa', 'Dữ liệu cá nhân của người khác', 'Data pribadi orang lain', 'Başkasının kişisel verileri', 'Dane osobowe innej osoby') },
    { value: 'other' as const, label: L('Другое', 'Інше', 'Other', 'Otro', 'Outro', 'Khác', 'Lainnya', 'Diğer', 'Inne') },
  ], [L]);

  const submitIdeaReport = useCallback(async (reason: IdeaReportReason) => {
    if (!reportTarget || reportBusy) return;
    const target = reportTarget;
    setReportBusy(true);
    setReportError(null);
    try {
      const result = await reportUserIdea(target.id, reason);
      setReportedIdeaIds((previous) => new Set(previous).add(target.id));
      setReportTarget(null);
      if (result.autoHidden) {
        setIdeas((previous) => previous.filter((idea) => idea.id !== target.id));
        setDetail((previous) => previous?.id === target.id ? null : previous);
      }
    } catch (error: unknown) {
      setReportError(String((error as { code?: string })?.code || 'unknown'));
    } finally {
      setReportBusy(false);
    }
  }, [reportBusy, reportTarget]);

  const errorText = useMemo(() => {
    if (error === 'offline') return L('Не удалось загрузить идеи', 'Не вдалося завантажити ідеї', 'Could not load ideas', 'No se pudieron cargar las ideas', 'Não foi possível carregar as ideias', 'Không tải được ý tưởng', 'Ide tidak dapat dimuat', 'Fikirler yüklenemedi', 'Nie udało się załadować pomysłów');
    if (error === 'not-found') return L('Идея больше недоступна', 'Ідея більше недоступна', 'This idea is no longer available', 'Esta idea ya no está disponible', 'Esta ideia não está mais disponível', 'Ý tưởng này không còn khả dụng', 'Ide ini sudah tidak tersedia', 'Bu fikir artık kullanılamıyor', 'Ten pomysł jest już niedostępny');
    if (error === 'service-unavailable') return L('Раздел идей временно недоступен. Попробуй ещё раз.', 'Розділ ідей тимчасово недоступний. Спробуй ще раз.', 'Ideas are temporarily unavailable. Try again.', 'Las ideas no están disponibles temporalmente. Inténtalo de nuevo.', 'As ideias estão temporariamente indisponíveis. Tente novamente.', 'Ý tưởng tạm thời không khả dụng. Hãy thử lại.', 'Ide untuk sementara tidak tersedia. Coba lagi.', 'Fikirler geçici olarak kullanılamıyor. Tekrar dene.', 'Pomysły są tymczasowo niedostępne. Spróbuj ponownie.');
    return L('Что-то пошло не так', 'Щось пішло не так', 'Something went wrong', 'Algo salió mal', 'Algo deu errado', 'Đã xảy ra lỗi', 'Ada yang bermasalah', 'Bir şeyler ters gitti', 'Coś poszło nie tak');
  }, [L, error]);

  const likeErrorText = useMemo(() => {
    if (likeError === 'offline') return L('Лайк не сохранился. Проверь связь.', 'Лайк не зберігся. Перевір зв’язок.', 'Like not saved. Check your connection.', 'No se guardó el like. Revisa la conexión.', 'O like não foi salvo. Verifique a conexão.', 'Like chưa được lưu. Hãy kiểm tra kết nối.', 'Like belum tersimpan. Periksa koneksi.', 'Beğeni kaydedilmedi. Bağlantıyı kontrol et.', 'Nie udało się zapisać polubienia. Sprawdź połączenie.');
    return L('Лайк не сохранился. Попробуй ещё раз.', 'Лайк не зберігся. Спробуй ще раз.', 'Like not saved. Try again.', 'No se guardó el like. Inténtalo de nuevo.', 'O like não foi salvo. Tente novamente.', 'Like chưa được lưu. Hãy thử lại.', 'Like belum tersimpan. Coba lagi.', 'Beğeni kaydedilmedi. Tekrar dene.', 'Nie udało się zapisać polubienia. Spróbuj ponownie.');
  }, [L, likeError]);

  if (!ideasEnabled) return null;

  const title = L('Идеи', 'Ідеї', 'Ideas', 'Ideas', 'Ideias', 'Ý tưởng', 'Ide', 'Fikirler', 'Pomysły');
  return (
    <ScreenGradient artBackdrop="settings">
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <SectionSheetHeader title={title} onClose={() => safeRouterBack(router, '/(tabs)/settings' as never)} />
        {detail ? (
          <BouncyScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 + Math.max(bottomInset, 16) }} showsVerticalScrollIndicator={false}>
            <Pressable accessibilityRole="button" accessibilityLabel={L('Назад', 'Назад', 'Back', 'Atrás', 'Voltar', 'Quay lại', 'Kembali', 'Geri', 'Wstecz')} onPress={closeDetail} style={{ minHeight: 44, justifyContent: 'center', marginBottom: 12 }}>
              <Ionicons name="chevron-back" size={24} color={t.textSecond} />
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '800', lineHeight: f.h1 * 1.15, flex: 1 }}>{detail.title}</Text>
              {myStableId && detail.authorUid !== myStableId && !reportedIdeaIds.has(detail.id) ? <Pressable accessibilityRole="button" accessibilityLabel={L('Пожаловаться на идею', 'Поскаржитися на ідею', 'Report idea', 'Reportar idea', 'Denunciar ideia', 'Báo cáo ý tưởng', 'Laporkan ide', 'Fikri bildir', 'Zgłoś pomysł')} onPress={() => { setReportError(null); setReportTarget(detail); }} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="flag-outline" size={21} color={t.textSecond} /></Pressable> : null}
            </View>
            <Text style={{ color: t.textSecond, fontSize: f.caption, marginTop: 8 }}>{detail.authorName} · {new Date(detail.createdAtMs).toLocaleDateString()}</Text>
            <IdeaLifecycleIcon status={detail.status} color={detail.status === 'implemented' ? t.correct : t.accent} />
            <Text style={{ color: t.textPrimary, fontSize: f.body, lineHeight: f.body * 1.5, marginTop: 24 }}>{detail.description}</Text>
            {detail.benefit ? <View style={{ marginTop: 16, padding: 13, borderRadius: 14, backgroundColor: t.bgCard }}><Text style={{ color: t.textSecond, fontSize: f.caption, lineHeight: f.caption * 1.45 }}>{L('Польза: ', 'Користь: ', 'Benefit: ', 'Beneficio: ', 'Benefício: ', 'Lợi ích: ', 'Manfaat: ', 'Fayda: ', 'Korzyść: ')}<Text style={{ color: t.textPrimary }}>{detail.benefit}</Text></Text></View> : null}
            {myStableId && detail.authorUid === myStableId ? <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/ideas_submit', params: { editIdeaId: detail.id } } as never)} style={{ minHeight: 48, borderRadius: 15, marginTop: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgCard }}><Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>{L('Редактировать идею', 'Редагувати ідею', 'Edit idea', 'Editar idea', 'Editar ideia', 'Chỉnh sửa ý tưởng', 'Edit ide', 'Fikri düzenle', 'Edytuj pomysł')}</Text></Pressable> : null}
            {(!myStableId || detail.authorUid !== myStableId) ? <Pressable accessibilityRole="button" accessibilityLabel={liked.has(detail.id) ? 'Unlike idea' : 'Like idea'} onPress={() => toggleLike(detail)} style={{ minHeight: 52, borderRadius: 16, marginTop: 26, paddingHorizontal: 16, backgroundColor: liked.has(detail.id) ? t.correctBg : t.bgCard, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
              <Ionicons name={liked.has(detail.id) ? 'heart' : 'heart-outline'} size={20} color={liked.has(detail.id) ? t.correct : t.textPrimary} />
              <Text style={{ color: liked.has(detail.id) ? t.correct : t.textPrimary, fontSize: f.body, fontWeight: '800' }}>{detail.likeCount}</Text>
            </Pressable> : null}
            {likeError ? <Text style={{ color: t.wrong, fontSize: f.caption, marginTop: 10, textAlign: 'center' }}>{likeErrorText}</Text> : null}
            {error ? <Text style={{ color: t.wrong, fontSize: f.caption, marginTop: 14 }}>{errorText}</Text> : null}
          </BouncyScrollView>
        ) : detailLoading ? <BouncyScrollView contentContainerStyle={{ paddingBottom: 32 + Math.max(bottomInset, 16) }} showsVerticalScrollIndicator={false}><IdeasDetailSkeleton t={t} /></BouncyScrollView> : (
          <BouncyScrollView contentContainerStyle={{ padding: 20, paddingBottom: 104 + Math.max(bottomInset, 16) }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <View style={{ flex: 1 }}><Text style={{ color: t.textPrimary, fontSize: f.h1, fontWeight: '800' }}>{L('Идеи сообщества', 'Ідеї спільноти', 'Community ideas', 'Ideas de la comunidad', 'Ideias da comunidade', 'Ý tưởng cộng đồng', 'Ide komunitas', 'Topluluk fikirleri', 'Pomysły społeczności')}</Text></View>
            </View>
            {refreshing ? <View accessibilityLabel="Refreshing ideas" style={{ height: 2, borderRadius: 1, backgroundColor: t.accent, opacity: 0.7, marginBottom: 10 }} /> : null}
            {likeError ? <Text style={{ color: t.wrong, fontSize: f.caption, marginBottom: 10 }}>{likeErrorText}</Text> : null}
            {/* eslint-disable-next-line text-integrity/no-unsafe-text-truncation -- one-line idea titles keep the compact feed rows stable; the full title is available on the detail screen */}
            {loading ? <IdeasCatalogSkeleton t={t} /> : error ? <View style={{ paddingVertical: 60, alignItems: 'center' }}><Ionicons name="cloud-offline-outline" size={36} color={t.textSecond} /><Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800', marginTop: 14 }}>{errorText}</Text><Pressable accessibilityRole="button" accessibilityLabel={L('Повторить загрузку идей', 'Повторити завантаження ідей', 'Retry loading ideas', 'Reintentar carga de ideas', 'Tentar carregar ideias novamente', 'Thử tải lại ý tưởng', 'Coba muat ide lagi', 'Fikirleri yeniden yükle', 'Spróbuj ponownie załadować pomysły')} onPress={() => void load(true)} style={{ marginTop: 18, paddingHorizontal: 18, minHeight: 44, justifyContent: 'center', borderRadius: 13, backgroundColor: t.accent }}><Text style={{ color: t.correctText, fontWeight: '800' }}>{L('Повторить', 'Повторити', 'Retry', 'Reintentar', 'Tentar de novo', 'Thử lại', 'Coba lagi', 'Tekrar dene', 'Spróbuj ponownie')}</Text></Pressable></View> : ideas.length === 0 ? <View style={{ paddingVertical: 70, alignItems: 'center' }}><Ionicons name="bulb-outline" size={40} color={t.accent} /><Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800', marginTop: 14 }}>{L('Пока идей нет', 'Поки ідей немає', 'No ideas yet', 'Aún no hay ideas', 'Ainda não há ideias', 'Chưa có ý tưởng', 'Belum ada ide', 'Henüz fikir yok', 'Brak pomysłów')}</Text><Text style={{ color: t.textSecond, fontSize: f.caption, textAlign: 'center', marginTop: 7 }}>{L('Стань первым, кто предложит улучшение.', 'Стань першим, хто запропонує покращення.', 'Be the first to suggest an improvement.', 'Sé el primero en proponer una mejora.', 'Seja o primeiro a sugerir uma melhoria.', 'Hãy là người đầu tiên đề xuất cải tiến.', 'Jadi yang pertama menyarankan perbaikan.', 'Bir iyileştirme öneren ilk kişi ol.', 'Zaproponuj pierwsze ulepszenie.')}</Text></View> : <>{ideas.map((idea) => <View key={idea.id} style={{ minHeight: 70, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: t.border, gap: 11 }}><Pressable accessibilityRole="button" onPress={() => void openIdea(idea.id)} style={{ flex: 1, minHeight: 70, flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text numberOfLines={1} style={{ color: t.textPrimary, fontSize: f.body, fontWeight: 700, flex: 1 }}>{idea.title}</Text><IdeaLifecycleIcon status={idea.status} color={idea.status === 'implemented' ? t.correct : t.accent} /></View><Text style={{ color: t.textSecond, fontSize: f.caption, marginTop: 5 }}>{idea.authorName} · {new Date(idea.createdAtMs).toLocaleDateString()}</Text></View><Ionicons name="chevron-forward" size={18} color={t.textGhost} /></Pressable>{(!myStableId || idea.authorUid !== myStableId) ? <Pressable accessibilityRole="button" accessibilityLabel={liked.has(idea.id) ? 'Unlike idea' : 'Like idea'} onPress={() => toggleLike(idea)} style={{ width: 44, minHeight: 52, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={liked.has(idea.id) ? 'heart' : 'heart-outline'} size={20} color={liked.has(idea.id) ? t.correct : t.textSecond} /><Text style={{ color: liked.has(idea.id) ? t.correct : t.textSecond, fontSize: f.caption, fontWeight: '800' }}>{idea.likeCount}</Text></Pressable> : null}</View>)}{nextCursor ? <View style={{ alignItems: 'center', paddingTop: 18, paddingBottom: 8 }}>{loadMoreError ? <Text style={{ color: t.wrong, fontSize: f.caption, textAlign: 'center', marginBottom: 8 }}>{L('Не удалось загрузить ещё идеи.', 'Не вдалося завантажити ще ідеї.', 'Could not load more ideas.', 'No se pudieron cargar más ideas.', 'Não foi possível carregar mais ideias.', 'Không thể tải thêm ý tưởng.', 'Tidak dapat memuat ide lagi.', 'Daha fazla fikir yüklenemedi.', 'Nie udało się załadować kolejnych pomysłów.')}</Text> : null}<Pressable accessibilityRole="button" accessibilityLabel={L('Показать ещё идеи', 'Показати ще ідеї', 'Show more ideas', 'Mostrar más ideas', 'Mostrar mais ideias', 'Tải thêm ý tưởng', 'Tampilkan ide lainnya', 'Daha fazla fikir göster', 'Pokaż więcej pomysłów')} disabled={loadingMore} onPress={() => void loadMore()} style={{ minHeight: 44, minWidth: 160, paddingHorizontal: 18, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgCard }}>{loadingMore ? <ActivityIndicator color={t.accent} /> : <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800' }}>{L('Показать ещё', 'Показати ще', 'Show more', 'Mostrar más', 'Mostrar mais', 'Tải thêm', 'Tampilkan lainnya', 'Daha fazla göster', 'Pokaż więcej')}</Text>}</Pressable></View> : null}</>}
          </BouncyScrollView>
        )}
        {!detail && !detailLoading ? <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: Math.max(bottomInset, 12) }}><View style={{ minHeight: 68, borderRadius: 20, backgroundColor: t.bgCard, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8 }}>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === 'new' }} onPress={() => setTab('new')} style={{ minWidth: 88, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: tab === 'new' ? t.bgSurface : 'transparent' }}><Ionicons name="sparkles-outline" size={20} color={tab === 'new' ? t.textPrimary : t.textSecond} /><Text style={{ color: tab === 'new' ? t.textPrimary : t.textSecond, fontSize: f.caption, fontWeight: '800', marginTop: 3 }}>{L('Новые', 'Нові', 'New', 'Nuevas', 'Novas', 'Mới', 'Baru', 'Yeni', 'Nowe')}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={L('Добавить идею', 'Додати ідею', 'Add idea', 'Añadir idea', 'Adicionar ideia', 'Thêm ý tưởng', 'Tambah ide', 'Fikir ekle', 'Dodaj pomysł')} onPress={() => router.push('/ideas_submit' as never)} style={{ width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: t.accent }}><Ionicons name="add" size={30} color={t.correctText} /></Pressable>
          <Pressable accessibilityRole="tab" accessibilityState={{ selected: tab === 'top' }} onPress={() => setTab('top')} style={{ minWidth: 88, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: tab === 'top' ? t.bgSurface : 'transparent' }}><Ionicons name="trophy-outline" size={20} color={tab === 'top' ? t.textPrimary : t.textSecond} /><Text style={{ color: tab === 'top' ? t.textPrimary : t.textSecond, fontSize: f.caption, fontWeight: '800', marginTop: 3 }}>{L('Топ', 'Топ', 'Top', 'Top', 'Top', 'Top', 'Teratas', 'En iyi', 'Top')}</Text></Pressable>
        </View></View> : null}
      </SafeAreaView>
      <FeatureIntroEntry id="ideas_first_visit" enabled={ideasEnabled && !detail && !detailLoading} />
      <Modal visible={Boolean(reportTarget)} transparent animationType="fade" onRequestClose={() => { if (!reportBusy) setReportTarget(null); }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(3, 5, 16, 0.72)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: t.bgSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 28 + Math.max(bottomInset, 12) }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800' }}>{L('Пожаловаться на идею', 'Поскаржитися на ідею', 'Report an idea', 'Reportar una idea', 'Denunciar uma ideia', 'Báo cáo ý tưởng', 'Laporkan ide', 'Fikri bildir', 'Zgłoś pomysł')}</Text>
            <Text style={{ color: t.textSecond, fontSize: f.body, marginTop: 8, marginBottom: 16 }}>{L('Что не так?', 'Що не так?', 'What is wrong?', '¿Qué ocurre?', 'O que há de errado?', 'Có vấn đề gì?', 'Apa yang salah?', 'Sorun ne?', 'Co jest nie tak?')}</Text>
            {reportReasons.map((option) => <Pressable key={option.value} accessibilityRole="button" disabled={reportBusy} onPress={() => void submitIdeaReport(option.value)} style={{ minHeight: 48, justifyContent: 'center', borderBottomWidth: 0.5, borderBottomColor: t.border }}><Text style={{ color: t.textPrimary, fontSize: f.body }}>{option.label}</Text></Pressable>)}
            {reportError ? <Text style={{ color: t.wrong, fontSize: f.caption, marginTop: 12 }}>{reportError === 'rate-limited' ? L('Слишком много жалоб подряд. Попробуй позже.', 'Забагато скарг поспіль. Спробуй пізніше.', 'Too many reports in a row. Try later.', 'Demasiados reportes seguidos. Inténtalo más tarde.', 'Muitos relatos seguidos. Tente mais tarde.', 'Quá nhiều báo cáo liên tiếp. Hãy thử lại sau.', 'Terlalu banyak laporan berturut-turut. Coba lagi nanti.', 'Arka arkaya çok fazla bildirim. Daha sonra dene.', 'Za dużo zgłoszeń z rzędu. Spróbuj później.') : L('Не удалось отправить жалобу. Попробуй ещё раз.', 'Не вдалося надіслати скаргу. Спробуй ще раз.', 'Could not send the report. Try again.', 'No se pudo enviar el reporte. Inténtalo de nuevo.', 'Não foi possível enviar a denúncia. Tente novamente.', 'Không thể gửi báo cáo. Hãy thử lại.', 'Laporan tidak terkirim. Coba lagi.', 'Bildirim gönderilemedi. Tekrar dene.', 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie.')}</Text> : null}
            <Pressable accessibilityRole="button" disabled={reportBusy} onPress={() => setReportTarget(null)} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 10 }}><Text style={{ color: t.textSecond, fontSize: f.body, fontWeight: '800' }}>{L('Отмена', 'Скасувати', 'Cancel', 'Cancelar', 'Cancelar', 'Hủy', 'Batal', 'İptal', 'Anuluj')}</Text></Pressable>
          </View>
        </View>
      </Modal>
    </ScreenGradient>
  );
}
