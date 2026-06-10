/**
 * ReferralExplainerCard — карточка реферальной программы на экране «Друзья».
 *
 * Объясняет механику (7 дней полного доступа за друга) и предоставляет действия:
 *  1. «Пригласить друга» — всегда видна.
 *  2. «Открыть N дней доступа» — всегда видна: активная при claimableDays > 0,
 *     иначе серая «Получить 7 дней» → onClaimHint (подсказка, почему пока нельзя).
 *  3. «Мои рефералы (N)» — список приглашённых (ReferralsListModal).
 *  4. «Ввести код» — ручной ввод реферального кода приглашённым (фолбэк для iOS).
 *
 * Чисто презентационный компонент: никаких сетевых вызовов, только пропсы.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ── Интерфейс пропсов ─────────────────────────────────────────────────────────

export interface ReferralExplainerCardProps {
  /** Количество дней доступа, готовых к открытию (0 = кнопка серая). */
  claimableDays: number;
  /** Всего приглашённых (pending+qualified+rewarded) — счётчик кнопки «Мои рефералы». */
  invitesTotal: number;
  /** Нажатие «Пригласить друга» — шеринг реферальной ссылки. */
  onInvite: () => void;
  /** Нажатие «Открыть N дней» — запуск flow начисления. */
  onClaim: () => void;
  /** Нажатие на СЕРУЮ кнопку (claimableDays = 0) — показать подсказку почему. */
  onClaimHint: () => void;
  /** Открыть список «Мои рефералы». */
  onOpenReferrals: () => void;
  /** Открыть ввод реферального кода (для приглашённого). */
  onEnterCode: () => void;
  /** true = начисление в процессе → кнопку задизейблить, показать «Открываю…». */
  claiming?: boolean;
  /**
   * Функция локализации из LangContext.
   * Порядок: ru, uk, es, pt-BR, vi, id, tr, pl.
   */
  L: (
    ru: string,
    uk: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => string;
  /** Объект темы из useTheme(). */
  t: {
    bgCard: string;
    bgSurface: string;
    bgSurface2: string;
    textPrimary: string;
    textSecond: string;
    textMuted: string;
    accent: string;
  };
}

// ── Вспомогательная функция: склонение «день» для русского ────────────────────

/**
 * Правильное склонение слова «день» для русского языка.
 * Правило: 11–14 → «дней» (исключение), иначе по последней цифре:
 *   1 → «день», 2-4 → «дня», 5-0 → «дней».
 */
function pluralDaysRu(n: number): string {
  const abs = Math.abs(n);
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'дней';
  if (mod10 === 1) return 'день';
  if (mod10 >= 2 && mod10 <= 4) return 'дня';
  return 'дней';
}

// ── Компонент ─────────────────────────────────────────────────────────────────

export function ReferralExplainerCard({
  claimableDays,
  invitesTotal,
  onInvite,
  onClaim,
  onClaimHint,
  onOpenReferrals,
  onEnterCode,
  claiming = false,
  L,
  t,
}: ReferralExplainerCardProps) {
  const hasClaimable = claimableDays > 0;
  // Текст кнопки «Открыть» с правильным склонением; при 0 — «Получить 7 дней».
  const claimLabel = claiming
    ? L(
        'Открываю…',
        'Відкриваю…',
        'Abriendo…',
        'Abrindo…',
        'Đang mở…',
        'Membuka…',
        'Açılıyor…',
        'Otwieram…',
      )
    : hasClaimable
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
    : L(
        'Получить 7 дней',
        'Отримати 7 днів',
        'Obtener 7 días',
        'Ganhar 7 dias',
        'Nhận 7 ngày',
        'Dapatkan 7 hari',
        '7 gün kazan',
        'Odbierz 7 dni',
      );

  return (
    <View style={[styles.card, { backgroundColor: t.bgCard }]}>
      {/* Иконка-акцент */}
      <View style={[styles.iconWrap, { backgroundColor: t.bgSurface }]}>
        <Ionicons name="gift-outline" size={24} color={t.accent} />
      </View>

      {/* Заголовок */}
      <Text style={[styles.title, { color: t.textPrimary }]}>
        {L(
          'Приглашай друзей — открывай доступ',
          'Запрошуй друзів — відкривай доступ',
          'Invita amigos y obtén acceso',
          'Convide amigos e abra o acesso',
          'Mời bạn bè — mở quyền truy cập',
          'Undang teman — buka akses',
          'Arkadaşlarını davet et — erişimi aç',
          'Zapraszaj znajomych — otwieraj dostęp',
        )}
      </Text>

      {/* Описание механики */}
      <View style={[styles.bodyBlock, { backgroundColor: t.bgSurface2 }]}>
        <Text style={[styles.bodyText, { color: t.textMuted }]}>
          {L(
            'Друг прошёл первую сессию — ты открываешь 7 дней полного доступа.',
            'Друг пройшов першу сесію — ти відкриваєш 7 днів повного доступу.',
            'Tu amigo completó la primera sesión: abres 7 días de acceso completo.',
            'Seu amigo completou a primeira sessão: você abre 7 dias de acesso completo.',
            'Bạn của bạn xong phiên đầu — bạn mở 7 ngày truy cập đầy đủ.',
            'Temanmu selesai sesi pertama — kamu buka 7 hari akses penuh.',
            'Arkadaşın ilk oturumu bitirdi — 7 günlük tam erişim açarsın.',
            'Znajomy ukończył pierwszą sesję — otwierasz 7 dni pełnego dostępu.',
          )}
        </Text>
        <Text style={[styles.bodyText, styles.bodyTextSecond, { color: t.textMuted }]}>
          {L(
            'Дни копятся — зови больше, открывай больше.',
            'Дні накопичуються — запрошуй більше, відкривай більше.',
            'Los días se acumulan — invita más, abre más.',
            'Os dias se acumulam — convide mais, abra mais.',
            'Ngày cộng dồn — mời thêm, mở thêm.',
            'Hari bertambah — undang lebih banyak, buka lebih banyak.',
            'Günler birikir — daha fazla davet et, daha fazla aç.',
            'Dni się sumują — zapraszaj więcej, otwieraj więcej.',
          )}
        </Text>
      </View>

      {/* Кнопка «Пригласить друга» — основная */}
      <TouchableOpacity
        style={[styles.btnPrimary, { backgroundColor: t.accent }]}
        onPress={onInvite}
        activeOpacity={0.8}
      >
        <Ionicons name="person-add-outline" size={18} color="#fff" style={styles.btnIcon} />
        <Text style={styles.btnPrimaryText}>
          {L(
            'Пригласить друга',
            'Запросити друга',
            'Invitar a un amigo',
            'Convidar um amigo',
            'Mời một người bạn',
            'Undang teman',
            'Arkadaş davet et',
            'Zaproś znajomego',
          )}
        </Text>
      </TouchableOpacity>

      {/* Кнопка «Открыть N дней» — всегда видна: серая, пока некого открывать.
          Серая остаётся нажимаемой: тап объясняет, что друг ещё не прошёл урок. */}
      <TouchableOpacity
        testID="referral-claim-button"
        style={[
          styles.btnSecondary,
          { borderColor: hasClaimable ? t.accent : t.textMuted },
          (claiming || !hasClaimable) && styles.btnDisabled,
        ]}
        onPress={hasClaimable ? onClaim : onClaimHint}
        disabled={claiming}
        activeOpacity={0.75}
      >
        <Ionicons
          name="sparkles-outline"
          size={16}
          color={hasClaimable && !claiming ? t.accent : t.textMuted}
          style={styles.btnIcon}
        />
        <Text
          style={[
            styles.btnSecondaryText,
            { color: hasClaimable && !claiming ? t.accent : t.textMuted },
          ]}
        >
          {claimLabel}
        </Text>
      </TouchableOpacity>

      {/* Нижний ряд: список рефералов + ручной ввод кода приглашённым */}
      <View style={styles.linkRow}>
        <TouchableOpacity
          testID="referral-open-list"
          style={styles.linkBtn}
          onPress={onOpenReferrals}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Ionicons name="people-outline" size={15} color={t.accent} style={styles.btnIcon} />
          <Text style={[styles.linkText, { color: t.accent }]} numberOfLines={1}>
            {L(
              `Мои рефералы${invitesTotal > 0 ? ` (${invitesTotal})` : ''}`,
              `Мої реферали${invitesTotal > 0 ? ` (${invitesTotal})` : ''}`,
              `Mis referidos${invitesTotal > 0 ? ` (${invitesTotal})` : ''}`,
              `Meus indicados${invitesTotal > 0 ? ` (${invitesTotal})` : ''}`,
              `Lời mời của tôi${invitesTotal > 0 ? ` (${invitesTotal})` : ''}`,
              `Referal saya${invitesTotal > 0 ? ` (${invitesTotal})` : ''}`,
              `Davetlerim${invitesTotal > 0 ? ` (${invitesTotal})` : ''}`,
              `Moje polecenia${invitesTotal > 0 ? ` (${invitesTotal})` : ''}`,
            )}
          </Text>
        </TouchableOpacity>
        <View style={[styles.linkDivider, { backgroundColor: t.textMuted }]} />
        <TouchableOpacity
          testID="referral-enter-code"
          style={styles.linkBtn}
          onPress={onEnterCode}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Ionicons name="ticket-outline" size={15} color={t.accent} style={styles.btnIcon} />
          <Text style={[styles.linkText, { color: t.accent }]} numberOfLines={1}>
            {L(
              'Ввести код', 'Ввести код', 'Ingresar código', 'Inserir código',
              'Nhập mã', 'Masukkan kode', 'Kod gir', 'Wpisz kod',
            )}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Стили ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 23,
    marginBottom: 12,
  },
  bodyBlock: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 6,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bodyTextSecond: {
    marginTop: 2,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0)',
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  btnIcon: {
    marginRight: 7,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 12,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    flexShrink: 1,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  linkDivider: {
    width: 1,
    height: 14,
    opacity: 0.35,
  },
});

// ── expo-router shim ──────────────────────────────────────────────────────────
// Файл лежит в app/, поэтому expo-router требует default-экспорт.
// Реальный компонент экспортируется именованно выше.
export default function __RouteShim() { return null; }
