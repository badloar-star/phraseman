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
  /** Сколько дней полного доступа только что открылось у пригласившего */
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
  const titleEs = `${grantedDays} días de acceso abiertos`;
  const title = L(
    titleRu,
    `${grantedDays} ${pluralDaysRu(grantedDays)} доступу відкрито`,
    titleEs,
    `${grantedDays} dias de acesso abertos`,
    `${grantedDays} ngày truy cập đã mở`,
    `${grantedDays} hari akses terbuka`,
    `${grantedDays} gün erişim açıldı`,
    `${grantedDays} dni dostępu otwarte`,
  );

  // Подзаголовок зависит от количества друзей
  // Кол-во дней награды берём из grantedDays (admin-tunable referral_reward_days),
  // НЕ хардкодим 7 — иначе при изменении срока в «Пульте» текст соврёт пользователю.
  const D = grantedDays;
  const subtitleRu =
    friendsCount === 1
      ? `Друг выполнил условие: установил приложение, ввёл ваш код и прошёл один урок полностью. Вы получили свои ${D} ${pluralDaysRu(D)}.`
      : `${friendsCount} ${pluralFriendsRu(friendsCount)} выполнили условие. Вы получили свои дни полного доступа.`;
  const subtitleEs =
    friendsCount === 1
      ? `Tu amigo cumplió la condición: instaló la app, introdujo tu código y completó una lección. Recibiste tus ${D} días.`
      : `${friendsCount} amigos cumplieron la condición. Recibiste tus días de acceso completo.`;

  const subtitle = L(
    subtitleRu,
    friendsCount === 1
      ? `Друг виконав умову: встановив застосунок, ввів ваш код і повністю пройшов один урок. Ви отримали свої ${D} ${pluralDaysRu(D)}.`
      : `${friendsCount} друзів виконали умову. Ви отримали свої дні повного доступу.`,
    subtitleEs,
    friendsCount === 1
      ? `Seu amigo cumpriu a condição: instalou o app, inseriu seu código e concluiu uma lição. Você recebeu seus ${D} dias.`
      : `${friendsCount} amigos cumpriram a condição. Você recebeu seus dias de acesso completo.`,
    friendsCount === 1
      ? `Bạn của bạn đã hoàn thành điều kiện: cài ứng dụng, nhập mã và hoàn thành một bài học. Bạn đã nhận ${D} ngày.`
      : `${friendsCount} người bạn đã hoàn thành điều kiện. Bạn đã nhận ngày truy cập đầy đủ.`,
    friendsCount === 1
      ? `Temanmu memenuhi syarat: memasang aplikasi, memasukkan kodemu, dan menyelesaikan satu pelajaran. Kamu mendapat ${D} hari.`
      : `${friendsCount} teman memenuhi syarat. Kamu mendapat hari akses penuh.`,
    friendsCount === 1
      ? `Arkadaşın şartı tamamladı: uygulamayı kurdu, kodunu girdi ve bir dersi bitirdi. ${D} gününü aldın.`
      : `${friendsCount} arkadaşın şartı tamamladı. Tam erişim günlerini aldın.`,
    friendsCount === 1
      ? `Znajomy spełnił warunek: zainstalował aplikację, wpisał twój kod i ukończył jedną lekcję. Masz swoje ${D} dni.`
      : `${friendsCount} znajomych spełniło warunek. Masz swoje dni pełnego dostępu.`,
  );

  // «X+X не равно 2X»: две отдельные награды двум людям, не одна двойная.
  const D2 = D * 2;
  const splitRewardNoteEs = `${D}+${D} no son ${D2}: tu amigo recibió sus ${D} días por separado.`;
  const splitRewardNote = L(
    `${D}+${D} не равно ${D2}: друг получил свои ${D} ${pluralDaysRu(D)} отдельно.`,
    `${D}+${D} не дорівнює ${D2}: друг отримав свої ${D} ${pluralDaysRu(D)} окремо.`,
    splitRewardNoteEs,
    `${D}+${D} não vira ${D2}: o amigo recebeu os ${D} dias separadamente.`,
    `${D}+${D} không phải ${D2}: bạn của bạn đã nhận ${D} ngày riêng.`,
    `${D}+${D} bukan ${D2}: temanmu mendapat ${D} harinya secara terpisah.`,
    `${D}+${D}, ${D2} değildir: arkadaşın kendi ${D} gününü ayrı aldı.`,
    `${D}+${D} to nie ${D2}: znajomy dostał swoje ${D} dni osobno.`,
  );

  // Строка срока действия (опционально)
  const untilTextEs = untilLabel ? `Abierto hasta ${untilLabel}.` : null;
  const untilText = untilLabel
    ? L(
        `Открыто до ${untilLabel}.`,
        `Відкрито до ${untilLabel}.`,
        untilTextEs ?? '',
        `Aberto até ${untilLabel}.`,
        `Mở đến ${untilLabel}.`,
        `Terbuka hingga ${untilLabel}.`,
        `${untilLabel} tarihine kadar açık.`,
        `Otwarte do ${untilLabel}.`,
      )
    : null;

  // Кнопка подтверждения — по Библии: глагол завершения «Готово» (не «Отлично»)
  const buttonLabelEs = 'Listo';
  const buttonLabel = L(
    'Готово',
    'Готово',
    buttonLabelEs,
    'Pronto',
    'Xong',
    'Selesai',
    'Tamam',
    'Gotowe',
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

          <Text style={[styles.until, { color: t.accent, fontWeight: '800' }]}>
            {splitRewardNote}
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
