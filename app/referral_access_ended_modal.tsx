/**
 * Модальное окно: реферальный период доступа завершился.
 *
 * Показывается когда vip_until < now и доступ был открыт через реферальную программу.
 * Фрейминг — только «что осталось» и «как получить больше» (без страха и потерь).
 * Два пути: позвать ещё друга (бесплатно) или открыть полный доступ (пейвол).
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

// ─── Типы ────────────────────────────────────────────────────────────────────

interface ReferralAccessEndedModalProps {
  visible: boolean;
  onInviteFriend: () => void;   // первичное действие: поделиться инвайтом
  onOpenFullAccess: () => void; // вторичное действие: открыть пейвол
  onClose: () => void;          // закрыть / отложить
  /** Переводчик: ru / uk / es / pt-BR / vi / id / tr / pl */
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
  /** Токены темы — только из этого набора */
  t: {
    bgCard: string;
    bgSurface: string;
    bgSurface2: string;
    textPrimary: string;
    textSecond: string;
    textMuted: string;
    accent: string;
    correctText: string;
  };
}

// ─── Компонент ───────────────────────────────────────────────────────────────

export function ReferralAccessEndedModal({
  visible,
  onInviteFriend,
  onOpenFullAccess,
  onClose,
  L,
  t,
}: ReferralAccessEndedModalProps) {
  // Копия — строго по «Библии»: глагольные кнопки, gain-framing, без «потеряешь»
  const title = L(
    'Доступ можно открыть снова',
    'Доступ можна відкрити знову',
    'Puedes abrir el acceso de nuevo',
    'Você pode abrir o acesso de novo',
    'Bạn có thể mở lại quyền truy cập',
    'Kamu bisa buka akses lagi',
    'Erişimi yeniden açabilirsin',
    'Możesz znów otworzyć dostęp',
  );

  // Reassurance: что уже твоё — останется твоим
  const bodyKeep = L(
    'Всё, что ты открыл — осталось с тобой.',
    'Все, що ти відкрив — залишилось з тобою.',
    'Todo lo que abriste sigue siendo tuyo.',
    'Tudo o que você abriu continua com você.',
    'Mọi thứ bạn đã mở khoá vẫn là của bạn.',
    'Semua yang kamu buka tetap milikmu.',
    'Açtığın her şey seninle kalmaya devam ediyor.',
    'Wszystko, co otworzyłeś, wciąż jest Twoje.',
  );

  // Invitation path — как вернуть доступ бесплатно
  const bodyInvite = L(
    'Позови ещё друга — и доступ вернётся.',
    'Запроси ще друга — і доступ повернеться.',
    'Invita a otro amigo y el acceso regresará.',
    'Convide mais um amigo e o acesso voltará.',
    'Mời thêm một người bạn và quyền truy cập sẽ trở lại.',
    'Ajak satu teman lagi dan aksesmu akan kembali.',
    'Bir arkadaşını daha davet et, erişim geri gelsin.',
    'Zaproś kolejnego znajomego — dostęp wróci.',
  );

  // Кнопка 1: пригласить (глагол)
  const btnInvite = L(
    'Пригласить друга',
    'Запросити друга',
    'Invitar a un amigo',
    'Convidar um amigo',
    'Mời một người bạn',
    'Ajak teman',
    'Arkadaş davet et',
    'Zaproś znajomego',
  );

  // Кнопка 2: открыть полный доступ — глагол «Открыть», никогда «Купить»
  const btnFullAccess = L(
    'Открыть полный доступ',
    'Відкрити повний доступ',
    'Abrir acceso completo',
    'Abrir acesso completo',
    'Mở quyền truy cập đầy đủ',
    'Buka akses penuh',
    'Tam erişimi aç',
    'Otwórz pełny dostęp',
  );

  const closeLabel = L(
    'Закрыть',
    'Закрити',
    'Cerrar',
    'Fechar',
    'Đóng',
    'Tutup',
    'Kapat',
    'Zamknij',
  );

  const styles = makeStyles(t);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Тёмный оверлей */}
      <View style={styles.backdrop}>
        {/* Карточка */}
        <View style={styles.card}>

          {/* Кнопка закрытия — верхний правый угол */}
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
          >
            <Ionicons name="close" size={22} color={t.textMuted} />
          </Pressable>

          {/* Иконка-акцент */}
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-circle" size={48} color={t.accent} />
          </View>

          {/* Заголовок */}
          <Text style={[styles.title, { color: t.textPrimary }]}>
            {title}
          </Text>

          {/* Строка 1: gain-reassurance */}
          <Text style={[styles.body, { color: t.textSecond }]}>
            {bodyKeep}
          </Text>

          {/* Строка 2: как получить больше */}
          <Text style={[styles.body, styles.bodySpaced, { color: t.textSecond }]}>
            {bodyInvite}
          </Text>

          {/* Разделитель */}
          <View style={styles.divider} />

          {/* Первичная кнопка: пригласить друга (глагол, filled accent) */}
          <Pressable
            style={({ pressed }) => [
              styles.btnPrimary,
              { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={onInviteFriend}
            accessibilityRole="button"
          >
            <Ionicons name="person-add-outline" size={18} color={t.correctText} style={styles.btnIcon} />
            <Text style={[styles.btnPrimaryText, { color: t.correctText }]}>{btnInvite}</Text>
          </Pressable>

          {/* Вторичная кнопка: открыть полный доступ (глагол, outlined) */}
          <Pressable
            style={({ pressed }) => [
              styles.btnSecondary,
              {
                backgroundColor: pressed ? t.bgSurface2 : t.bgSurface,
              },
            ]}
            onPress={onOpenFullAccess}
            accessibilityRole="button"
          >
            <Text style={[styles.btnSecondaryText, { color: t.accent }]}>
              {btnFullAccess}
            </Text>
          </Pressable>

        </View>
      </View>
    </Modal>
  );
}

// ─── Стили ───────────────────────────────────────────────────────────────────

function makeStyles(t: ReferralAccessEndedModalProps['t']) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: t.bgCard,
      borderRadius: 22,
      paddingTop: 48,
      paddingBottom: 28,
      paddingHorizontal: 24,
      alignItems: 'center',
      // Лёгкая тень для восприятия слоёв
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 20,
      elevation: 10,
    },
    closeButton: {
      position: 'absolute',
      top: 14,
      right: 14,
      padding: 4,
    },
    iconWrap: {
      marginBottom: 16,
    },
    title: {
      fontSize: 19,
      fontWeight: '700',
      textAlign: 'center',
      lineHeight: 26,
      marginBottom: 10,
    },
    body: {
      fontSize: 15,
      textAlign: 'center',
      lineHeight: 22,
    },
    bodySpaced: {
      marginTop: 6,
    },
    divider: {
      height: 1,
      backgroundColor: 'rgba(128, 128, 128, 0.15)',
      width: '100%',
      marginTop: 24,
      marginBottom: 20,
    },
    btnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 28,
      width: '100%',
      marginBottom: 12,
    },
    btnIcon: {
      marginRight: 8,
    },
    btnPrimaryText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    btnSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      borderWidth: 0,
      paddingVertical: 13,
      paddingHorizontal: 28,
      width: '100%',
    },
    btnSecondaryText: {
      fontSize: 15,
      fontWeight: '600',
    },
  });
}

// ─── expo-router route shim ───────────────────────────────────────────────────
// Этот файл живёт в app/ — шим нужен, чтобы expo-router не считал его экраном.
export default function __RouteShim() { return null; }
