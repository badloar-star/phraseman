/**
 * ReferralAccessActivatedModal — праздничный модал после активации реферальной награды.
 * Показывается один раз, когда пользователь получил N дней полного доступа за приглашённых друзей.
 * Чисто презентационный: никаких сетевых вызовов, всё через пропсы.
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ReferralAccessActivatedModalProps {
  visible: boolean;
  /** Сколько дней полного доступа только что открылось (напр. 7, 14) */
  grantedDays: number;
  /** Сколько друзей выполнили условие и запустили начисление */
  friendsCount: number;
  /** Опциональная строка вида «до 15 июня» (уже отформатирована на клиенте) */
  untilLabel?: string;
  onClose: () => void;
  /** Локализация: ru / uk / es / pt-BR / vi / id / tr / pl */
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

// ---------------------------------------------------------------------------
// Helpers — склонение числительных
// ---------------------------------------------------------------------------

/**
 * Правильное склонение слова «день» для числа n (по правилам русского языка).
 * 1 → «день», 2–4 → «дня», 5+ → «дней»; исключение: 11–14 → «дней».
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

/**
 * Правильное склонение слова «друг» / «друга» / «друзей».
 * 1 → «друг», 2–4 → «друга», 5+ → «друзей»; исключение: 11–14 → «друзей».
 */
function pluralFriendsRu(n: number): string {
  const abs = Math.abs(n);
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 14) return 'друзей';
  if (mod10 === 1) return 'друг';
  if (mod10 >= 2 && mod10 <= 4) return 'друга';
  return 'друзей';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReferralAccessActivatedModal({
  visible,
  grantedDays,
  friendsCount,
  untilLabel,
  onClose,
  L,
  t,
}: ReferralAccessActivatedModalProps): React.ReactElement | null {
  // Анимированные значения: масштаб иконки и прозрачность карточки
  const iconScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Сбрасываем до начального состояния, затем запускаем анимацию
      iconScale.setValue(0.6);
      cardOpacity.setValue(0);

      Animated.parallel([
        Animated.spring(iconScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Сбрасываем при скрытии, чтобы следующее появление было чистым
      iconScale.setValue(0);
      cardOpacity.setValue(0);
    }
  }, [visible, iconScale, cardOpacity]);

  // ---------------------------------------------------------------------------
  // Локализованные строки
  // ---------------------------------------------------------------------------

  // Заголовок: «7 дней доступа открыто»
  const titleRu = `${grantedDays} ${pluralDaysRu(grantedDays)} доступа открыто`;
  const title = L(
    titleRu,
    `${grantedDays} ${pluralDaysRu(grantedDays)} доступу відкрито`,
    `${grantedDays} días de acceso abiertos`,
    `${grantedDays} dias de acesso abertos`,
    `${grantedDays} ngày truy cập đã mở`,
    `${grantedDays} hari akses terbuka`,
    `${grantedDays} gün erişim açıldı`,
    `${grantedDays} dni dostępu otwarte`,
  );

  // Подзаголовок зависит от количества друзей
  const subtitleRu =
    friendsCount === 1
      ? 'Твой друг прошёл первую сессию. Полный доступ — твой.'
      : `${friendsCount} ${pluralFriendsRu(friendsCount)} прошли первую сессию. Полный доступ — твой.`;

  const subtitle = L(
    subtitleRu,
    friendsCount === 1
      ? 'Твій друг пройшов першу сесію. Повний доступ — твій.'
      : `${friendsCount} друзів пройшли першу сесію. Повний доступ — твій.`,
    friendsCount === 1
      ? 'Tu amigo completó la primera sesión. El acceso completo es tuyo.'
      : `${friendsCount} amigos completaron la primera sesión. El acceso completo es tuyo.`,
    friendsCount === 1
      ? 'Seu amigo completou a primeira sessão. O acesso completo é seu.'
      : `${friendsCount} amigos completaram a primeira sessão. O acesso completo é seu.`,
    friendsCount === 1
      ? 'Bạn bè của bạn đã hoàn thành buổi đầu tiên. Quyền truy cập đầy đủ là của bạn.'
      : `${friendsCount} người bạn đã hoàn thành buổi đầu tiên. Quyền truy cập đầy đủ là của bạn.`,
    friendsCount === 1
      ? 'Temanmu menyelesaikan sesi pertama. Akses penuh milikmu.'
      : `${friendsCount} teman menyelesaikan sesi pertama. Akses penuh milikmu.`,
    friendsCount === 1
      ? 'Arkadaşın ilk oturumu tamamladı. Tam erişim senin.'
      : `${friendsCount} arkadaşın ilk oturumu tamamladı. Tam erişim senin.`,
    friendsCount === 1
      ? 'Twój znajomy ukończył pierwszą sesję. Pełny dostęp jest twój.'
      : `${friendsCount} znajomych ukończyło pierwszą sesję. Pełny dostęp jest twój.`,
  );

  // Строка срока действия (опционально)
  const untilText = untilLabel
    ? L(
        `Действует ${untilLabel}.`,
        `Діє ${untilLabel}.`,
        `Válido ${untilLabel}.`,
        `Válido até ${untilLabel}.`,
        `Có hiệu lực đến ${untilLabel}.`,
        `Berlaku hingga ${untilLabel}.`,
        `${untilLabel} tarihine kadar geçerli.`,
        `Ważny do ${untilLabel}.`,
      )
    : null;

  // Кнопка подтверждения
  const buttonLabel = L(
    'Отлично',
    'Чудово',
    'Genial',
    'Ótimo',
    'Tuyệt vời',
    'Bagus',
    'Harika',
    'Świetnie',
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Тёмный фон-димер */}
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: t.bgCard, opacity: cardOpacity },
          ]}
        >
          {/* Иконка с пружинной анимацией */}
          <Animated.Text
            style={[styles.icon, { transform: [{ scale: iconScale }] }]}
            accessibilityLabel="diamond"
          >
            💎
          </Animated.Text>

          {/* Заголовок */}
          <Text style={[styles.title, { color: t.textPrimary }]}>
            {title}
          </Text>

          {/* Акцентный разделитель */}
          <View style={[styles.divider, { backgroundColor: t.accent }]} />

          {/* Подзаголовок */}
          <Text style={[styles.subtitle, { color: t.textSecond }]}>
            {subtitle}
          </Text>

          {/* Срок действия (если передан) */}
          {untilText !== null && (
            <Text style={[styles.until, { color: t.textMuted }]}>
              {untilText}
            </Text>
          )}

          {/* Кнопка «Отлично» */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={buttonLabel}
          >
            <Text style={styles.buttonLabel}>{buttonLabel}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 28,
    alignItems: 'center',
    // Лёгкая тень для ощущения глубины
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  icon: {
    fontSize: 64,
    lineHeight: 72,
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 14,
  },
  divider: {
    width: 40,
    height: 3,
    borderRadius: 2,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  until: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 8,
  },
  button: {
    marginTop: 24,
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

// ---------------------------------------------------------------------------
// expo-router route shim — не является экраном, нужен чтобы роутер не регистрировал файл
// ---------------------------------------------------------------------------
export default function __RouteShim() { return null; }
