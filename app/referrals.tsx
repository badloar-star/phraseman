import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
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
import { generateReferralCode, getReferralCode } from './referral_system';
import { isReferralCloudEnabled } from './referral_cloud';
import { ReferralAccessActivatedModal } from './referral_access_activated_modal';
import { safeRouterBack } from './navigation_back';

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
  const [invites, setInvites] = useState<ReferralInvite[]>([]);
  const [loading, setLoading] = useState(true);
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

  const load = useCallback(async () => {
    const state = await getClaimableReferralState();
    setInvites(state.invites);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    load()
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  }, [load]);

  // Реф-код: тот же серверный код, что в /friends. Тянем с ретраем (холодная гонка auth_links),
  // пока не появится — как в friends.tsx. Пустой код просто не рисуем (без «дыры» в верстке).
  useEffect(() => {
    if (!referralEnabled || referralCode) return;
    let cancelled = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (cancelled) return;
      attempt += 1;
      try {
        await generateReferralCode('User');
        const rc = await getReferralCode();
        if (!cancelled && rc && rc.trim().length >= 4) {
          setReferralCode(rc.trim().toUpperCase());
          return;
        }
      } catch { /* ещё не готово — повторим */ }
      if (!cancelled && attempt < 5) {
        timer = setTimeout(() => { void tick(); }, 1200 * attempt);
      }
    };
    timer = setTimeout(() => { void tick(); }, 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [referralEnabled, referralCode]);

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
    hapticTap();
    setClaiming(true);
    setMessage(null);
    const result = await claimReferralVipDays();
    if (result.ok) {
      // Праздничный модал вместо сухой строки (раньше показывался только в QA-лабе).
      setActivated({
        grantedDays: result.granted,
        friendsCount: result.friends,
        untilLabel: formatUntilLabel(result.vipUntilMs, lang as Lang),
      });
      await load().catch(() => {});
    } else if (result.reason === 'nothing') {
      showNotReady();
    } else {
      setMessage(L(
        'Не получилось получить VIP. Попробуйте ещё раз.',
        'Не вдалося отримати VIP. Спробуйте ще раз.',
        'No pudimos entregar el VIP. Inténtalo de nuevo.',
        'Não foi possível receber VIP. Tente de novo.',
        'Chưa nhận được VIP. Hãy thử lại.',
        'VIP belum bisa diambil. Coba lagi.',
        'VIP alınamadı. Tekrar dene.',
        'Nie udało się odebrać VIP. Spróbuj ponownie.',
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
      ? L('VIP уже получен', 'VIP уже отримано', 'VIP recibido', 'VIP recebido', 'Đã nhận VIP', 'VIP sudah diambil', 'VIP alındı', 'VIP odebrany')
      : qualified
        ? L('Условие выполнено', 'Умову виконано', 'Condición cumplida', 'Condição cumprida', 'Đã hoàn thành điều kiện', 'Syarat terpenuhi', 'Şart tamamlandı', 'Warunek spełniony')
        : skipped
          ? L('Лимит месяца', 'Ліміт місяця', 'Límite mensual', 'Limite mensal', 'Giới hạn tháng', 'Batas bulanan', 'Aylık limit', 'Limit miesiąca')
          : L('Ждём полный урок', 'Чекаємо повний урок', 'Esperando una lección completa', 'Aguardando uma lição completa', 'Đang chờ một bài học hoàn chỉnh', 'Menunggu satu pelajaran selesai', 'Tam ders bekleniyor', 'Czekamy na ukończoną lekcję');
    const buttonText = rewarded
      ? L('Получено', 'Отримано', 'Recibido', 'Recebido', 'Đã nhận', 'Diterima', 'Alındı', 'Odebrano')
      : L('Получить VIP', 'Отримати VIP', 'Recibir VIP', 'Receber VIP', 'Nhận VIP', 'Ambil VIP', 'VIP al', 'Odbierz VIP');

    return (
      <View
        key={`${invite.refereeStableId}-${index}`}
        testID={`referrals-row-${invite.refereeStableId || index}`}
        style={{
          borderRadius: 18,
          padding: 14,
          backgroundColor: t.bgCard,
          borderWidth: 1,
          borderColor: claimable ? t.accent : t.border,
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgSurface }}>
            <Ionicons name={claimable ? 'sparkles-outline' : 'person-outline'} size={22} color={claimable ? t.accent : t.textMuted} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.body ?? 16, fontWeight: '900' }} numberOfLines={1}>
              {L(`Друг #${shortInviteName(invite)}`, `Друг #${shortInviteName(invite)}`, `Amigo #${shortInviteName(invite)}`, `Amigo #${shortInviteName(invite)}`, `Bạn #${shortInviteName(invite)}`, `Teman #${shortInviteName(invite)}`, `Arkadaş #${shortInviteName(invite)}`, `Znajomy #${shortInviteName(invite)}`)}
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
          {claiming && claimable ? <ActivityIndicator color={t.correctText} /> : <Ionicons name="diamond-outline" size={18} color={claimable && !rewarded ? t.correctText : t.textMuted} />}
          <Text style={{ color: claimable && !rewarded ? t.correctText : t.textMuted, fontSize: f.sub ?? 13, fontWeight: '900' }}>
            {buttonText}
          </Text>
        </TouchableOpacity>
      </View>
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
                borderWidth: 1,
                borderColor: t.border,
                marginRight: 12,
              }}
            >
              <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
            </TapScale>
            <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.h1 ?? 28, fontWeight: '900' }}>
              {L('Рефералы', 'Реферали', 'Referidos', 'Indicados', 'Giới thiệu', 'Referal', 'Davetler', 'Polecenia')}
            </Text>
          </View>

          <View style={{ borderRadius: 20, padding: 18, backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.border, gap: 10 }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bgSurface }}>
              <Ionicons name="people-outline" size={24} color={t.accent} />
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.h2 ?? 22, lineHeight: 28, fontWeight: '900' }}>
              {L('Твои приглашения', 'Твої запрошення', 'Tus invitaciones', 'Seus convites', 'Lời mời của bạn', 'Undanganmu', 'Davetlerin', 'Twoje zaproszenia')}
            </Text>
            <Text testID="referrals-condition-hint" style={{ color: t.textSecond, fontSize: f.body ?? 16, lineHeight: 23, fontWeight: '700' }}>
              {L(
                'Здесь появятся друзья, которым ты отправил приглашение. Как только друг поставит приложение, введёт твой код и закончит первый урок — VIP можно забирать.',
                'Тут з’являться друзі, яким ти надіслав запрошення. Щойно друг встановить застосунок, введе твій код і закінчить перший урок — VIP можна забирати.',
                'Aquí aparecerán los amigos a quienes invitaste. Cuando instalen la app, usen tu código y terminen la primera lección, podrás reclamar el VIP.',
                'Aqui aparecem os amigos que você convidou. Quando instalarem o app, usarem seu código e terminarem a primeira lição, o VIP fica pronto.',
                'Bạn bè bạn mời sẽ xuất hiện ở đây. Khi họ cài ứng dụng, nhập mã của bạn và học xong bài đầu tiên, bạn có thể nhận VIP.',
                'Teman yang kamu undang muncul di sini. Setelah mereka memasang aplikasi, memasukkan kodemu, dan menyelesaikan pelajaran pertama, VIP bisa diambil.',
                'Davet ettiğin arkadaşlar burada görünür. Uygulamayı kurup kodunu girer ve ilk dersi bitirirlerse VIP alınır.',
                'Tutaj pojawią się znajomi, których zaprosisz. Gdy zainstalują aplikację, wpiszą twój kod i skończą pierwszą lekcję, VIP będzie do odebrania.',
              )}
            </Text>
          </View>

          {referralEnabled && referralCode ? (
            <View
              testID="referrals-my-code-card"
              style={{ borderRadius: 20, padding: 18, backgroundColor: t.bgCard, borderWidth: 1, borderColor: t.accent + '40', gap: 12 }}
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
                style={{ backgroundColor: t.bgSurface, borderRadius: 12, borderWidth: 1, borderColor: t.border, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' }}
              >
                <Text testID="referrals-my-code-value" style={{ color: t.accent, fontSize: f.h2 ?? 22, fontWeight: '900', letterSpacing: 3 }} maxFontSizeMultiplier={1.2}>
                  {referralCode}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={copyReferralCode}
                accessibilityRole="button"
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.bgSurface }}
              >
                <Ionicons name={codeCopied ? 'checkmark' : 'copy-outline'} size={16} color={codeCopied ? t.accent : t.textSecond} />
                <Text style={{ color: codeCopied ? t.accent : t.textPrimary, fontSize: f.sub ?? 13, fontWeight: '800' }}>
                  {codeCopied
                    ? L('Скопировано', 'Скопійовано', 'Copiado', 'Copiado', 'Đã sao chép', 'Tersalin', 'Kopyalandı', 'Skopiowano')
                    : L('Копировать', 'Копіювати', 'Copiar', 'Copiar', 'Sao chép', 'Salin', 'Kopyala', 'Kopiuj')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {message && (
            <View style={{ borderRadius: 16, padding: 12, backgroundColor: t.bgSurface, borderWidth: 1, borderColor: t.border }}>
              <Text testID="referrals-feedback" style={{ color: t.textPrimary, fontSize: f.sub ?? 13, lineHeight: 20, fontWeight: '800' }}>{message}</Text>
            </View>
          )}

          {loading ? (
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
