import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import SkeletonBlock from '../components/SkeletonShimmer';
import TapScale from '../components/TapScale';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import {
  claimReferralVipDays,
  getClaimableReferralState,
  type ReferralInvite,
} from './referral_vip';
import { claimReferralSpins, readCachedSpinCredits } from './roulette_spin_client';
import { ensureInviteCodeShared } from './invite_code_singleton';
import { buildCloudReferralInviteShare } from './referral_invite_share';
import { isReferralCloudEnabled } from './referral_cloud';
import { ReferralAccessActivatedModal } from './referral_access_activated_modal';
import { safeRouterBack } from './navigation_back';
import { glassFill } from '../components/GlassSurface';
import TonalSurface from '../components/TonalSurface';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import {
  beginReferralInvitesRequest, commitReferralInvites, hydrateReferralInvitesIfEmpty,
  invalidateReferralInvites, isReferralInvitesRequestCurrent, parsePersistedReferralInvites,
  readReferralInvites, serializeReferralInvites,
} from './referrals_cache';

function makeL(lang: Lang) {
  return (
    ru: string,
    uk: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

function shortInviteName(invite: ReferralInvite): string {
  const id = String(invite.refereeStableId || '').trim();
  if (!id) return '----';
  return id.length <= 6 ? id : id.slice(-6).toUpperCase();
}

function inviteDisplayName(invite: ReferralInvite, fallbackPrefix: string): string {
  const name = String(invite.refereeName ?? '').trim().replace(/\s+/g, ' ');
  if (name) return name;
  return `${fallbackPrefix} #${shortInviteName(invite)}`;
}

/** Кэш последнего успешного списка приглашений — экран рисуется мгновенно, без скелетонов. */
const REFERRALS_INVITES_CACHE_KEY = 'referrals_invites_cache_v2';

const UNTIL_LOCALE: Record<Lang, string> = {
  ru: 'ru-RU', uk: 'uk-UA', es: 'es-ES', 'pt-BR': 'pt-BR',
  vi: 'vi-VN', id: 'id-ID', tr: 'tr-TR', pl: 'pl-PL',
};

/** «до 20 июня» из vip_until (ms). Пусто, если даты нет. */
function formatUntilLabel(untilMs: number, lang: Lang): string | undefined {
  if (!Number.isFinite(untilMs) || untilMs <= 0) return undefined;
  try {
    const d = new Date(untilMs);
    const formatted = d.toLocaleDateString(UNTIL_LOCALE[lang] ?? 'en-US', { day: 'numeric', month: 'long' });
    return triLang(lang, {
      ru: `до ${formatted}`, uk: `до ${formatted}`, es: `hasta el ${formatted}`,
      'pt-BR': `até ${formatted}`, vi: `đến ${formatted}`, id: `sampai ${formatted}`,
      tr: `${formatted} tarihine kadar`, pl: `do ${formatted}`,
    });
  } catch {
    return undefined;
  }
}

export default function ReferralsScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const L = makeL(lang as Lang);
  const renderToken = captureAccountGeneration();
  const renderAccountScope = accountScopeKey(renderToken);
  const initialWarm = readReferralInvites(renderToken);
  const [loadedAccountScope, setLoadedAccountScope] = useState<string | null>(() => renderAccountScope);
  const [inviteState, setInvites] = useState<ReferralInvite[]>(() => initialWarm?.value ?? []);
  const invites = loadedAccountScope === renderAccountScope ? inviteState : [];
  const [loading, setLoading] = useState(() => initialWarm === null);
  const visibleLoading = loading || loadedAccountScope !== renderAccountScope;
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** Дубликат реф-кода из /friends — чтобы код можно было найти, когда в Друзьях уже есть люди. */
  const referralEnabled = isReferralCloudEnabled();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const copyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Праздничный модал после успешного начисления (раньше показывался только в QA-лабе). */
  const [activated, setActivated] = useState<{ grantedDays: number; friendsCount: number; untilLabel?: string } | null>(null);

  const load = useCallback(async (options: { force?: boolean } = {}) => {
    const token = captureAccountGeneration();
    const requestScope = accountScopeKey(token);
    if (requestScope !== renderAccountScope) return;
    const warm = readReferralInvites(token);
    const request = beginReferralInvitesRequest(token);
    if (warm) {
      setLoadedAccountScope(requestScope);
      setInvites(warm.value);
      setLoading(false);
    } else {
      setLoading(true);
    }
    if (!options.force && warm?.isFresh) return;
    try {
      const state = await getClaimableReferralState({ force: options.force });
    // ok:false = сеть/сервер не ответили — не затираем показанный кэш пустотой.
      if (!state.ok || !commitReferralInvites(request, state.invites)) return;
      setLoadedAccountScope(requestScope);
      setInvites(state.invites);
      const persisted = serializeReferralInvites(token, state.invites);
      if (persisted) void AsyncStorage.setItem(REFERRALS_INVITES_CACHE_KEY, persisted).catch(() => {});
    } finally {
      if (isReferralInvitesRequestCurrent(request)) setLoading(false);
    }
  }, [renderAccountScope]);

  useEffect(() => {
    let alive = true;
    const persistenceToken = captureAccountGeneration();
    // Мгновенная гидрация из кэша: экран не «грузится каждый раз», сервер обновляет фоном.
    void AsyncStorage.getItem(REFERRALS_INVITES_CACHE_KEY)
      .then(raw => {
        if (!alive || !raw) return;
        try {
          const token = persistenceToken;
          const cached = parsePersistedReferralInvites(raw, token);
          if (cached && isCurrentAccountGeneration(token)) {
            hydrateReferralInvitesIfEmpty(token, cached.value, cached.updatedAt);
            const current = readReferralInvites(token);
            if (!current) return;
            setLoadedAccountScope(accountScopeKey(token));
            setInvites(current.value);
            setLoading(false);
          }
        } catch { /* битый кэш — просто ждём сеть */ }
      })
      .catch(() => {});
    load()
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [load, renderAccountScope]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load({ force: true }).catch(() => {});
    setRefreshing(false);
  }, [load]);

  // Прокруты рулетки Plus: конвертируем qualified-приглашения (капы на сервере),
  // счётчик — мгновенно из кэша, затем сеть.
  const [spinCredits, setSpinCredits] = useState(0);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const claim = await claimReferralSpins().catch(() => null);
      if (!alive) return;
      if (claim && typeof claim.spinsTotal === 'number') setSpinCredits(claim.spinsTotal);
      else setSpinCredits(await readCachedSpinCredits());
    })();
    return () => { alive = false; };
  }, []);

  // Реф-код: тот же серверный код, что в /friends. Ретрай/бэкофф — внутри синглтона
  // (dedupe с friends.tsx — один сетевой проход на процесс).
  useEffect(() => {
    if (!referralEnabled || referralCode) return;
    let cancelled = false;
    void ensureInviteCodeShared('User').then(code => {
      if (!cancelled && code) setReferralCode(code);
    });
    return () => { cancelled = true; };
  }, [referralEnabled, referralCode]);

  /** «Пригласить» — системный Share; с кэшированным кодом открывается мгновенно. */
  const [inviteBusy, setInviteBusy] = useState(false);
  const handleInvite = useCallback(async () => {
    if (inviteBusy) return;
    hapticTap();
    setInviteBusy(true);
    try {
      const share = await buildCloudReferralInviteShare({ lang: lang as Lang, userName: 'User' }).catch(() => null);
      if (share?.message) {
        await Share.share({ message: share.message });
      } else {
        setMessage(L(
          'Код ещё готовится — проверь сеть и попробуй через пару секунд.',
          'Код ще готується — перевір мережу і спробуй за кілька секунд.',
          'Tu código aún se está preparando: revisa la conexión e inténtalo en unos segundos.',
          'Seu código ainda está sendo preparado — verifique a conexão e tente em alguns segundos.',
          'Mã của bạn đang được chuẩn bị — kiểm tra mạng và thử lại sau vài giây.',
          'Kodemu masih disiapkan — periksa jaringan dan coba lagi beberapa detik lagi.',
          'Kodun hazırlanıyor — bağlantıyı kontrol edip birkaç saniye sonra tekrar dene.',
          'Twój kod jest jeszcze przygotowywany — sprawdź sieć i spróbuj za kilka sekund.',
        ));
      }
    } finally {
      setInviteBusy(false);
    }
  }, [L, inviteBusy, lang]);

  const copyReferralCode = useCallback(async () => {
    if (!referralCode) return;
    hapticTap();
    try {
      await Clipboard.setStringAsync(referralCode);
      setCodeCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCodeCopied(false), 1600);
    } catch { /* буфер недоступен — код всё равно виден на экране */ }
  }, [referralCode]);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const showNotReady = useCallback(() => {
    hapticTap();
    setMessage(L(
      'друг не выполнил условие',
      'друг не виконав умову',
      'tu amigo aún no cumplió la condición',
      'o amigo ainda não cumpriu a condição',
      'bạn của bạn chưa hoàn thành điều kiện',
      'teman belum memenuhi syarat',
      'arkadaşın şartı tamamlamadı',
      'znajomy nie spełnił warunku',
    ));
  }, [L]);

  const claim = useCallback(async () => {
    if (claiming) return;
    const claimToken = captureAccountGeneration();
    hapticTap();
    setClaiming(true);
    setMessage(null);
    const result = await claimReferralVipDays();
    if (!isCurrentAccountGeneration(claimToken)) {
      setClaiming(false);
      return;
    }
    if (result.ok) {
      // Праздничный модал вместо сухой строки (раньше показывался только в QA-лабе).
      setActivated({
        grantedDays: result.granted,
        friendsCount: result.friends,
        untilLabel: formatUntilLabel(result.vipUntilMs, lang as Lang),
      });
      invalidateReferralInvites(claimToken);
      await load({ force: true }).catch(() => {});
    } else if (result.reason === 'nothing') {
      showNotReady();
    } else {
      setMessage(L(
        'Не получилось получить Plus. Попробуйте ещё раз.',
        'Не вдалося отримати Plus. Спробуйте ще раз.',
        'No pudimos entregar Plus. Inténtalo de nuevo.',
        'Não foi possível receber Plus. Tente de novo.',
        'Chưa nhận được Plus. Hãy thử lại.',
        'Plus belum bisa diambil. Coba lagi.',
        'Plus alınamadı. Tekrar dene.',
        'Nie udało się odebrać Plus. Spróbuj ponownie.',
      ));
    }
    setClaiming(false);
  }, [L, claiming, lang, load, showNotReady]);

  const renderInvite = (invite: ReferralInvite, index: number) => {
    const qualified = invite.status === 'qualified';
    const rewarded = invite.status === 'rewarded';
    const skipped = invite.status === 'skipped_referrer_cap';
    // skipped (legacy «лимит месяца») теперь тоже claimable — сервер принимает эти строки (M1).
    const claimable = qualified || skipped;
    const statusText = rewarded
      ? L('Plus уже получен', 'Plus уже отримано', 'Plus recibido', 'Plus recebido', 'Đã nhận Plus', 'Plus sudah diambil', 'Plus alındı', 'Plus odebrany')
      : qualified
        ? L('Условие выполнено', 'Умову виконано', 'Condición cumplida', 'Condição cumprida', 'Đã hoàn thành điều kiện', 'Syarat terpenuhi', 'Şart tamamlandı', 'Warunek spełniony')
        : skipped
          ? L('Лимит месяца', 'Ліміт місяця', 'Límite mensual', 'Limite mensal', 'Giới hạn tháng', 'Batas bulanan', 'Aylık limit', 'Limit miesiąca')
          : L('Ждём полный урок', 'Чекаємо повний урок', 'Esperando una lección completa', 'Aguardando uma lição completa', 'Đang chờ một bài học hoàn chỉnh', 'Menunggu satu pelajaran selesai', 'Tam ders bekleniyor', 'Czekamy na ukończoną lekcję');
    const buttonText = rewarded
      ? L('Получено', 'Отримано', 'Recibido', 'Recebido', 'Đã nhận', 'Diterima', 'Alındı', 'Odebrano')
      : L('Получить Plus', 'Отримати Plus', 'Recibir Plus', 'Receber Plus', 'Nhận Plus', 'Ambil Plus', 'Plus al', 'Odbierz Plus');
    const displayName = inviteDisplayName(invite, L('Друг', 'Друг', 'Amigo', 'Amigo', 'Bạn', 'Teman', 'Arkadaş', 'Znajomy'));

    return (
      <TonalSurface
        key={`${invite.refereeStableId}-${index}`}
        testID={`referrals-row-${invite.refereeStableId || index}`}
        radius={18}
        tone={claimable ? 'raised' : 'subtle'}
        backgroundColor={claimable ? `${t.accent}22` : glassFill(t.bgSurface, 0.46)}
        style={{
          padding: 14,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgSurface }}>
            <Ionicons name={claimable ? 'sparkles-outline' : 'person-outline'} size={22} color={claimable ? t.accent : t.textMuted} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body ?? 16, fontWeight: '900' }} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={{ color: claimable ? t.accent : t.textMuted, fontSize: f.sub ?? 13, fontWeight: '800', marginTop: 2 }}>
              {statusText}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          testID={`referrals-row-claim-${invite.refereeStableId || index}`}
          accessibilityRole="button"
          activeOpacity={0.82}
          disabled={claiming || rewarded}
          onPress={claimable ? claim : showNotReady}
          style={{
            minHeight: 48,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
            backgroundColor: claimable && !rewarded ? t.accent : t.bgSurface,
            opacity: rewarded ? 0.62 : 1,
          }}
        >
          <Ionicons name="diamond-outline" size={18} color={claimable && !rewarded ? t.correctText : t.textMuted} />
          <Text style={{ color: claimable && !rewarded ? t.correctText : t.textMuted, fontSize: f.sub ?? 13, fontWeight: '900' }}>
            {buttonText}
          </Text>
        </TouchableOpacity>
        {qualified && !rewarded && (
          <TouchableOpacity
            testID={`referrals-row-spin-${invite.refereeStableId || index}`}
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={() => router.push('/roulette' as any)}
            style={{ marginTop: 8, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.accent }}
          >
            <Text style={{ color: t.accent, fontSize: f.sub ?? 13, fontWeight: '900' }}>Крутить 🎡</Text>
          </TouchableOpacity>
        )}
      </TonalSurface>
    );
  };

  return (
    <ScreenGradient artBackdrop="friends">
      <SafeAreaView testID="screen-referrals" style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={t.accent} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34, gap: 16 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TapScale
              accessibilityRole="button"
              accessibilityLabel={L('Назад', 'Назад', 'Atrás', 'Voltar', 'Quay lại', 'Kembali', 'Geri', 'Wstecz')}
              onPress={() => safeRouterBack(router, '/(tabs)/friends' as any)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.bgSurface,
                marginRight: 12,
              }}
            >
              <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
            </TapScale>
            <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.h1 ?? 28, fontWeight: '900' }}>
              {L('Рефералы', 'Реферали', 'Referidos', 'Indicados', 'Giới thiệu', 'Referal', 'Davetler', 'Polecenia')}
            </Text>
            {spinCredits > 0 && (
              <TouchableOpacity
                testID="referrals-spin-badge"
                accessibilityRole="button"
                activeOpacity={0.82}
                onPress={() => router.push('/roulette' as any)}
                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: t.bgSurface, borderWidth: 1, borderColor: t.accent }}
              >
                <Text style={{ color: t.accent, fontSize: f.sub ?? 13, fontWeight: '900' }}>🎡 {spinCredits}</Text>
              </TouchableOpacity>
            )}
          </View>

          <TonalSurface radius={20} tone="raised" backgroundColor={glassFill(t.bgSurface, 0.46)} style={{ padding: 18, gap: 10 }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgSurface }}>
              <Ionicons name="people-outline" size={24} color={t.accent} />
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.h2 ?? 22, lineHeight: 28, fontWeight: '900' }}>
              {L('Твои приглашения', 'Твої запрошення', 'Tus invitaciones', 'Seus convites', 'Lời mời của bạn', 'Undanganmu', 'Davetlerin', 'Twoje zaproszenia')}
            </Text>
            <Text testID="referrals-condition-hint" style={{ color: t.textSecond, fontSize: f.body ?? 16, lineHeight: 23, fontWeight: '700' }}>
              {L(
                'Здесь появятся друзья, которым ты отправил приглашение. Как только друг поставит приложение, введёт твой код и закончит первый урок — Plus можно забирать.',
                'Тут з’являться друзі, яким ти надіслав запрошення. Щойно друг встановить застосунок, введе твій код і закінчить перший урок — Plus можна забирати.',
                'Aquí aparecerán los amigos a quienes invitaste. Cuando instalen la app, usen tu código y terminen la primera lección, podrás reclamar Plus.',
                'Aqui aparecem os amigos que você convidou. Quando instalarem o app, usarem seu código e terminarem a primeira lição, o Plus fica pronto.',
                'Bạn bè bạn mời sẽ xuất hiện ở đây. Khi họ cài ứng dụng, nhập mã của bạn và học xong bài đầu tiên, bạn có thể nhận Plus.',
                'Teman yang kamu undang muncul di sini. Setelah mereka memasang aplikasi, memasukkan kodemu, dan menyelesaikan pelajaran pertama, Plus bisa diambil.',
                'Davet ettiğin arkadaşlar burada görünür. Uygulamayı kurup kodunu girer ve ilk dersi bitirirlerse Plus alınır.',
                'Tutaj pojawią się znajomi, których zaprosisz. Gdy zainstalują aplikację, wpiszą twój kod i skończą pierwszą lekcję, Plus będzie do odebrania.',
              )}
            </Text>
          </TonalSurface>

          {referralEnabled && (
            <TouchableOpacity
              testID="referrals-invite"
              accessibilityRole="button"
              activeOpacity={0.84}
              disabled={inviteBusy}
              onPress={() => { void handleInvite(); }}
              style={{
                minHeight: 54,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: t.accent,
                opacity: inviteBusy ? 0.7 : 1,
              }}
            >
              {inviteBusy
                ? <ActivityIndicator color={t.correctText} />
                : <Ionicons name="share-social" size={20} color={t.correctText} />}
              <Text style={{ color: t.correctText, fontSize: f.body ?? 16, fontWeight: '900' }}>
                {L('Пригласить друга', 'Запросити друга', 'Invitar a un amigo', 'Convidar um amigo', 'Mời bạn bè', 'Undang teman', 'Arkadaş davet et', 'Zaproś znajomego')}
              </Text>
            </TouchableOpacity>
          )}

          {referralEnabled && referralCode ? (
            <TonalSurface
              testID="referrals-my-code-card"
              radius={20}
              style={{ padding: 18, gap: 12 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="gift-outline" size={18} color={t.accent} />
                <Text style={{ color: t.textPrimary, fontSize: f.body ?? 16, fontWeight: '900', flex: 1 }} numberOfLines={2}>
                  {L('Твой код для друзей', 'Твій код для друзів', 'Tu código para amigos', 'Seu código para amigos', 'Mã của bạn cho bạn bè', 'Kode untuk temanmu', 'Arkadaşların için kodun', 'Twój kod dla znajomych')}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={copyReferralCode}
                accessibilityRole="button"
                accessibilityLabel={L('Скопировать код', 'Скопіювати код', 'Copiar código', 'Copiar código', 'Sao chép mã', 'Salin kode', 'Kodu kopyala', 'Skopiuj kod')}
                style={{ backgroundColor: t.bgSurface, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' }}
              >
                <Text testID="referrals-my-code-value" style={{ color: t.accent, fontSize: f.h2 ?? 22, fontWeight: '900', letterSpacing: 3 }} maxFontSizeMultiplier={1.2}>
                  {referralCode}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={copyReferralCode}
                accessibilityRole="button"
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12, backgroundColor: t.bgSurface }}
              >
                <Ionicons name={codeCopied ? 'checkmark' : 'copy-outline'} size={16} color={codeCopied ? t.accent : t.textSecond} />
                <Text style={{ color: codeCopied ? t.accent : t.textPrimary, fontSize: f.sub ?? 13, fontWeight: '800' }}>
                  {codeCopied
                    ? L('Скопировано', 'Скопійовано', 'Copiado', 'Copiado', 'Đã sao chép', 'Tersalin', 'Kopyalandı', 'Skopiowano')
                    : L('Копировать', 'Копіювати', 'Copiar', 'Copiar', 'Sao chép', 'Salin', 'Kopyala', 'Kopiuj')}
                </Text>
              </TouchableOpacity>
            </TonalSurface>
          ) : null}

          {message && (
            <View style={{ borderRadius: 16, padding: 12, backgroundColor: t.bgSurface }}>
              <Text testID="referrals-feedback" style={{ color: t.textPrimary, fontSize: f.sub ?? 13, lineHeight: 20, fontWeight: '800' }}>{message}</Text>
            </View>
          )}

          {claiming ? (
            <View testID="referrals-claim-pending" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={t.accent} />
            </View>
          ) : null}

          {visibleLoading ? (
            <View style={{ gap: 12 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonBlock key={`referral-skeleton-${i}`} width="100%" height={76} borderRadius={18} />
              ))}
            </View>
          ) : invites.length > 0 ? (
            <View style={{ gap: 12 }}>
              {invites.map(renderInvite)}
            </View>
          ) : null}

          <TouchableOpacity
            testID="referrals-roulette-about"
            accessibilityRole="button"
            activeOpacity={0.8}
            onPress={() => router.push('/roulette_about' as any)}
            style={{ alignItems: 'center', paddingVertical: 10 }}
          >
            <Text style={{ color: t.textSecond, fontSize: f.sub ?? 13, fontWeight: '800' }}>
              {L('О рулетке Plus', 'Про рулетку Plus', 'Sobre la ruleta Plus', 'Sobre a roleta Plus', 'Về vòng quay Plus', 'Tentang roulette Plus', 'Plus ruleti hakkında', 'O ruletce Plus')}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <ReferralAccessActivatedModal
          visible={activated !== null}
          grantedDays={activated?.grantedDays ?? 0}
          friendsCount={activated?.friendsCount ?? 0}
          untilLabel={activated?.untilLabel}
          onClose={() => setActivated(null)}
          L={L}
          t={t}
        />
      </SafeAreaView>
    </ScreenGradient>
  );
}
