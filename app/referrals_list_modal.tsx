/**
 * ReferralsListModal — модалка «Мои рефералы» на экране «Друзья».
 *
 * Показывает список приглашённых друзей со статусом:
 *   • pending   — приглашён, ещё не прошёл первый урок;
 *   • qualified — прошёл первый урок, награда готова к открытию;
 *   • rewarded  — доступ уже открыт (+7 дней начислены).
 *
 * Внизу — кнопка «Открыть N дней доступа» (всегда видна: активная при qualified-друзьях,
 * иначе серая — тап объясняет, чего не хватает) и «Пригласить друга». Пустое состояние —
 * когда рефералов нет.
 *
 * Презентационный компонент: данные и обработчики приходят пропсами. Имён друзей
 * у нас нет (приватность — сервер отдаёт только refereeStableId), поэтому строка
 * показывает короткий id-хвост + статус.
 *
 * Структура (Modal pageSheet → ScreenGradient → header → ScrollView) повторяет
 * AddFriendModal для визуальной консистентности.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenGradient from '../components/ScreenGradient';
import TapScale from '../components/TapScale';
import { triLang, type Lang } from '../constants/i18n';
import type { ReferralInvite, ReferralInviteStatus } from './referral_cloud';

type L8 = (
  ru: string, uk: string, es: string, ptBr: string,
  vi: string, id: string, tr: string, pl: string,
) => string;

export interface ReferralsListModalProps {
  visible: boolean;
  onClose: () => void;
  invites: ReferralInvite[];
  claimableDays: number;
  claiming: boolean;
  onClaim: () => void;
  onInvite: () => void;
  lang: string;
  // Тема/шрифты/chrome приходят из friends.tsx как есть (там типизированы как any) —
  // у объектов есть нестроковые поля (например bgGradient: [string,string]).
  t: any;
  f: any;
  chrome: any;
}

/** Правильное склонение слова «день» для русского. */
function pluralDaysRu(n: number): string {
  const mod100 = Math.abs(n) % 100;
  const mod10 = Math.abs(n) % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'дней';
  if (mod10 === 1) return 'день';
  if (mod10 >= 2 && mod10 <= 4) return 'дня';
  return 'дней';
}

/** Визуальная конфигурация статуса: цвет, иконка, подпись. */
function statusMeta(status: ReferralInviteStatus, t: any, L: L8) {
  switch (status) {
    case 'qualified':
      return {
        color: t.correct ?? '#34C759',
        icon: 'gift' as const,
        label: L(
          'Готов открыть доступ', 'Готовий відкрити доступ', 'Listo para abrir acceso',
          'Pronto para abrir acesso', 'Sẵn sàng mở quyền', 'Siap buka akses',
          'Erişim açmaya hazır', 'Gotowy otworzyć dostęp',
        ),
      };
    case 'rewarded':
      return {
        color: t.accent ?? '#0A84FF',
        icon: 'checkmark-done' as const,
        label: L(
          'Доступ открыт', 'Доступ відкрито', 'Acceso abierto',
          'Acesso aberto', 'Đã mở quyền', 'Akses dibuka',
          'Erişim açıldı', 'Dostęp otwarty',
        ),
      };
    case 'skipped_referrer_cap':
      return {
        color: t.textMuted ?? '#8E8E93',
        icon: 'time-outline' as const,
        label: L(
          'Откроется в следующем месяце', 'Відкриється наступного місяця', 'Se abrirá el próximo mes',
          'Abre no próximo mês', 'Mở vào tháng sau', 'Terbuka bulan depan',
          'Gelecek ay açılır', 'Otworzy się w przyszłym miesiącu',
        ),
      };
    case 'pending':
    default:
      return {
        color: t.textMuted ?? '#8E8E93',
        icon: 'hourglass-outline' as const,
        label: L(
          'Ещё не прошёл первый урок', 'Ще не пройшов перший урок', 'Aún no completó la lección 1',
          'Ainda não fez a lição 1', 'Chưa xong bài đầu', 'Belum selesai pelajaran 1',
          'İlk dersi bitirmedi', 'Nie ukończył pierwszej lekcji',
        ),
      };
  }
}

/** Короткий читабельный хвост stableId для подписи строки (имён друзей у нас нет). */
function shortId(id: string): string {
  const tail = (id || '').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
  return tail || '????';
}

function statusRank(s: ReferralInviteStatus): number {
  // qualified сверху (требует действия), затем pending, rewarded, capped.
  if (s === 'qualified') return 0;
  if (s === 'pending') return 1;
  if (s === 'rewarded') return 2;
  return 3;
}

const Row = React.memo(function Row({
  invite, t, f, chrome, L,
}: {
  invite: ReferralInvite;
  t: any;
  f: any;
  chrome: any;
  L: L8;
}) {
  const meta = statusMeta(invite.status, t, L);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: chrome.surface,
        borderRadius: 14,
        borderWidth: 0.5,
        borderColor: chrome.border,
        paddingVertical: 12,
        paddingHorizontal: 14,
      }}
    >
      <View
        style={{
          width: 40, height: 40, borderRadius: 20,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: meta.color + '22',
          borderWidth: 1, borderColor: meta.color + '55',
        }}
      >
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.textPrimary, fontSize: f.body ?? 15, fontWeight: '700' }}>
          {L(
            'Друг', 'Друг', 'Amigo', 'Amigo', 'Bạn', 'Teman', 'Arkadaş', 'Znajomy',
          )}{' '}
          <Text style={{ color: t.textMuted, fontWeight: '600' }}>#{shortId(invite.refereeStableId)}</Text>
        </Text>
        <Text style={{ color: meta.color, fontSize: f.sub ?? 13, fontWeight: '600', marginTop: 2 }}>
          {meta.label}
        </Text>
      </View>
      {invite.status === 'qualified' && (
        <View
          style={{
            backgroundColor: meta.color,
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text style={{ color: t.correctText ?? '#fff', fontSize: 12, fontWeight: '800' }}>+7</Text>
        </View>
      )}
    </View>
  );
});

export function ReferralsListModal({
  visible, onClose, invites, claimableDays, claiming,
  onClaim, onInvite, lang, t, f, chrome,
}: ReferralsListModalProps) {
  const L: L8 = (ru, uk, es, ptBr, vi, id, tr, pl) =>
    triLang(lang as Lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });

  const sorted = [...invites].sort((a, b) => {
    const r = statusRank(a.status) - statusRank(b.status);
    return r !== 0 ? r : b.createdAtMs - a.createdAtMs;
  });

  const qualifiedCount = invites.filter((i) => i.status === 'qualified').length;
  const pendingCount = invites.filter((i) => i.status === 'pending').length;
  const canClaim = claimableDays > 0 && qualifiedCount > 0 && !claiming;

  // Подсказка при тапе на серую claim-кнопку: почему открыть пока нечего.
  const [hint, setHint] = useState<string | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current); }, []);
  const showHint = (text: string) => {
    setHint(text);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHint(null), 3000);
  };
  const onClaimHint = () => {
    showHint(pendingCount > 0
      ? L(
          'Друг установил приложение, но ещё не прошёл первый урок. Дни откроются после этого.',
          'Друг встановив застосунок, але ще не пройшов перший урок. Дні відкриються після цього.',
          'Tu amigo instaló la app pero aún no completó la primera lección. Los días se abrirán después.',
          'Seu amigo instalou o app, mas ainda não fez a primeira lição. Os dias abrem depois disso.',
          'Bạn của bạn đã cài ứng dụng nhưng chưa xong bài đầu. Sau đó ngày sẽ mở.',
          'Temanmu sudah memasang aplikasi tapi belum selesai pelajaran pertama. Hari terbuka setelah itu.',
          'Arkadaşın uygulamayı yükledi ama ilk dersi bitirmedi. Günler ondan sonra açılır.',
          'Znajomy zainstalował aplikację, ale nie ukończył pierwszej lekcji. Dni otworzą się po tym.',
        )
      : L(
          'Пока некого открывать — пригласи друга. Как только он пройдёт первый урок, получишь 7 дней.',
          'Поки нікого відкривати — запроси друга. Щойно він пройде перший урок, отримаєш 7 днів.',
          'Aún no hay nadie: invita a un amigo. En cuanto complete la primera lección, recibirás 7 días.',
          'Ainda não há ninguém — convide um amigo. Assim que ele fizer a primeira lição, você ganha 7 dias.',
          'Chưa có ai — hãy mời một người bạn. Khi họ xong bài đầu, bạn nhận 7 ngày.',
          'Belum ada siapa pun — undang teman. Begitu ia selesai pelajaran pertama, kamu dapat 7 hari.',
          'Henüz kimse yok — bir arkadaşını davet et. İlk dersi bitirince 7 gün kazanırsın.',
          'Jeszcze nikogo nie ma — zaproś znajomego. Gdy ukończy pierwszą lekcję, dostaniesz 7 dni.',
        ));
  };

  const claimLabel = claiming
    ? L('Открываю…', 'Відкриваю…', 'Abriendo…', 'Abrindo…', 'Đang mở…', 'Membuka…', 'Açılıyor…', 'Otwieram…')
    : claimableDays > 0
    ? L(
        `Открыть ${claimableDays} ${pluralDaysRu(claimableDays)} доступа`,
        `Відкрити ${claimableDays} дн. доступу`,
        `Abrir ${claimableDays} días de acceso`,
        `Abrir ${claimableDays} dias de acesso`,
        `Mở ${claimableDays} ngày truy cập`,
        `Buka ${claimableDays} hari akses`,
        `${claimableDays} gün erişimi aç`,
        `Otwórz ${claimableDays} dni dostępu`,
      )
    : L('Получить 7 дней', 'Отримати 7 днів', 'Obtener 7 días', 'Ganhar 7 dias', 'Nhận 7 ngày', 'Dapatkan 7 hari', '7 gün kazan', 'Odbierz 7 dni');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ScreenGradient forceFullBleed artBackdrop="friends">
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'right', 'bottom', 'left']}>
            <View style={{ flex: 1 }}>
              {/* Хедер */}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
                <Text style={{ flex: 1, fontSize: f.h2 ?? 22, fontWeight: '800', color: t.textPrimary }}>
                  {L('Мои рефералы', 'Мої реферали', 'Mis referidos', 'Meus indicados', 'Lời mời của tôi', 'Referal saya', 'Davetlerim', 'Moje polecenia')}
                </Text>
                <TapScale onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                  <Ionicons name="close" size={26} color={t.textMuted} />
                </TapScale>
              </View>

              <ScrollView
                decelerationRate="normal"
                contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 10 }}
                showsVerticalScrollIndicator={false}
              >
                {sorted.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 16, gap: 12 }}>
                    <View
                      style={{
                        width: 72, height: 72, borderRadius: 36,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: (t.accent ?? '#0A84FF') + '22',
                        borderWidth: 1, borderColor: (t.accent ?? '#0A84FF') + '55',
                      }}
                    >
                      <Ionicons name="paper-plane-outline" size={32} color={t.accent} />
                    </View>
                    <Text style={{ color: t.textPrimary, fontSize: f.body ?? 15, fontWeight: '800', textAlign: 'center' }}>
                      {L(
                        'Пока никого нет', 'Поки нікого немає', 'Aún no hay nadie',
                        'Ainda ninguém', 'Chưa có ai', 'Belum ada siapa pun',
                        'Henüz kimse yok', 'Jeszcze nikogo',
                      )}
                    </Text>
                    <Text style={{ color: t.textMuted, fontSize: f.sub ?? 13, textAlign: 'center', lineHeight: Math.round((f.sub ?? 13) * 1.45), maxWidth: 300 }}>
                      {L(
                        'Пригласи друга — как только он пройдёт первый урок, ты откроешь 7 дней полного доступа.',
                        'Запроси друга — щойно він пройде перший урок, ти відкриєш 7 днів повного доступу.',
                        'Invita a un amigo: en cuanto complete la primera lección, abrirás 7 días de acceso completo.',
                        'Convide um amigo: assim que ele fizer a primeira lição, você abre 7 dias de acesso completo.',
                        'Mời một người bạn — khi họ xong bài đầu, bạn mở 7 ngày truy cập đầy đủ.',
                        'Undang teman — begitu ia selesai pelajaran pertama, kamu buka 7 hari akses penuh.',
                        'Bir arkadaşını davet et — ilk dersi bitirince 7 gün tam erişim açarsın.',
                        'Zaproś znajomego — gdy ukończy pierwszą lekcję, otworzysz 7 dni pełnego dostępu.',
                      )}
                    </Text>
                  </View>
                ) : (
                  <>
                    {qualifiedCount > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <Ionicons name="sparkles" size={15} color={t.correct ?? '#34C759'} />
                        <Text style={{ color: t.textSecond, fontSize: f.sub ?? 13, fontWeight: '700' }}>
                          {L(
                            `Готово к открытию: ${qualifiedCount}`,
                            `Готово відкрити: ${qualifiedCount}`,
                            `Listos para abrir: ${qualifiedCount}`,
                            `Prontos para abrir: ${qualifiedCount}`,
                            `Sẵn sàng mở: ${qualifiedCount}`,
                            `Siap dibuka: ${qualifiedCount}`,
                            `Açmaya hazır: ${qualifiedCount}`,
                            `Gotowe do otwarcia: ${qualifiedCount}`,
                          )}
                        </Text>
                      </View>
                    )}
                    {sorted.map((inv) => (
                      <Row key={inv.refereeStableId} invite={inv} t={t} f={f} chrome={chrome} L={L} />
                    ))}
                  </>
                )}
              </ScrollView>

              {/* Низ: claim всегда виден (серый, пока нечего открывать) + приглашение */}
              <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, gap: 10 }}>
                {hint && (
                  <Text
                    testID="referrals-claim-hint"
                    style={{
                      color: t.textMuted,
                      fontSize: f.sub ?? 13,
                      lineHeight: Math.round((f.sub ?? 13) * 1.4),
                      textAlign: 'center',
                    }}
                  >
                    {hint}
                  </Text>
                )}
                <TouchableOpacity
                  testID="referrals-claim-button"
                  onPress={canClaim ? onClaim : onClaimHint}
                  disabled={claiming}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    backgroundColor: t.accent ?? '#0A84FF',
                    borderRadius: 16, paddingVertical: 16,
                    opacity: canClaim ? 1 : 0.55,
                  }}
                >
                  {claiming
                    ? <ActivityIndicator color={t.correctText ?? '#fff'} />
                    : <Ionicons name="sparkles" size={18} color={t.correctText ?? '#fff'} />}
                  <Text style={{ color: t.correctText ?? '#fff', fontSize: f.bodyLg ?? 16, fontWeight: '800' }}>
                    {claimLabel}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onInvite}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    backgroundColor: 'transparent',
                    borderWidth: 1.5, borderColor: t.accent ?? '#0A84FF',
                    borderRadius: 16, paddingVertical: 14,
                  }}
                >
                  <Ionicons name="person-add-outline" size={18} color={t.accent ?? '#0A84FF'} />
                  <Text style={{ color: t.accent ?? '#0A84FF', fontSize: f.bodyLg ?? 16, fontWeight: '800' }}>
                    {L('Пригласить друга', 'Запросити друга', 'Invitar a un amigo', 'Convidar um amigo', 'Mời một người bạn', 'Undang teman', 'Arkadaş davet et', 'Zaproś znajomego')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </ScreenGradient>
      </SafeAreaProvider>
    </Modal>
  );
}

/* expo-router shim: файл в app/, нужен default-экспорт. */
export default function __RouteShim() { return null; }
