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
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import ResponsiveModalScrollView from '../components/ResponsiveModalScrollView';
import { useTheme } from '../components/ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';

// ─── Типы ────────────────────────────────────────────────────────────────────

interface ReferralAccessEndedModalProps {
  visible: boolean;
  /**
   * Оставлен ради совместимости вызова (friends.tsx). Награды рефералки удалены
   * (REMOVAL.md / PM-202), поэтому окно больше НЕ зовёт друга ради возврата доступа —
   * это чисто уведомление о прошлом доступе (макет OM-REFERRAL-ACCESS-ENDED).
   */
  onInviteFriend?: () => void;
  onOpenFullAccess: () => void; // единственное действие: открыть пейвол
  onClose: () => void;          // закрыть / отложить
  /** Переводчик: ru / uk / en / es / pt-BR / vi / id / tr / pl */
  L: (
    ru: string,
    uk: string,
    en: string,
    es: string,
    ptBr: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => string;
  /** Токены темы — оставлены в API вызова; вид берётся из активной темы Liquid Glass. */
  t?: {
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
  onOpenFullAccess,
  onClose,
  L,
}: ReferralAccessEndedModalProps) {
  // зачем: макет OM-REFERRAL-ACCESS-ENDED — «compatibility notice» для ранее открытого
  // доступа: сохранённые права + один путь (полный доступ) + закрытие. Материал — из
  // активной темы (13 тем), CTA нейтральный, без зелёного.
  const { liquidGlassThemeId, f } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);

  const title = L(
    'Реферальный доступ закончился',
    'Реферальний доступ закінчився',
    'Referral access has ended',
    'El acceso por referidos terminó',
    'O acesso por indicação terminou',
    'Quyền truy cập giới thiệu đã kết thúc',
    'Akses referral telah berakhir',
    'Davet erişimi sona erdi',
    'Dostęp z polecenia zakończył się',
  );

  // Reassurance: что уже твоё — останется твоим
  const bodyKeep = L(
    'Всё, что ты открыл — осталось с тобой.',
    'Все, що ти відкрив — залишилось з тобою.',
    'Everything you unlocked stays with you.',
    'Todo lo que abriste sigue siendo tuyo.',
    'Tudo o que você abriu continua com você.',
    'Mọi thứ bạn đã mở khoá vẫn là của bạn.',
    'Semua yang kamu buka tetap milikmu.',
    'Açtığın her şey seninle kalmaya devam ediyor.',
    'Wszystko, co otworzyłeś, wciąż jest Twoje.',
  );

  // Единственная кнопка: открыть полный доступ — глагол «Открыть», никогда «Купить»
  const btnFullAccess = L(
    'Открыть полный доступ',
    'Відкрити повний доступ',
    'Open full access',
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
    'Close',
    'Cerrar',
    'Fechar',
    'Đóng',
    'Tutup',
    'Kapat',
    'Zamknij',
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Тёмный оверлей */}
      <ResponsiveModalScrollView style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
        {/* Карточка: непрозрачная основа темы */}
        <View
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: glass.opaqueSheet,
            borderRadius: 28,
            paddingTop: 22,
            paddingBottom: 22,
            paddingHorizontal: 22,
            alignItems: 'center',
          }}
        >
          {/* Кнопка закрытия — верхний правый угол, область нажатия 44dp */}
          <Pressable
            style={{
              alignSelf: 'flex-end',
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: glass.selected,
            }}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
          >
            <Ionicons name="close" size={20} color={glass.text} />
          </Pressable>

          {/* Иконка-арт: нейтральный круг темы */}
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: glass.selected,
              marginTop: 4,
            }}
          >
            <Ionicons name="checkmark" size={32} color={glass.text} />
          </View>

          {/* Заголовок */}
          <Text
            accessibilityRole="header"
            style={{ color: glass.text, fontSize: f.h2, fontWeight: '700', textAlign: 'center', marginTop: 16 }}
          >
            {title}
          </Text>

          {/* Reassurance */}
          <Text
            style={{ color: glass.secondary, fontSize: f.body, lineHeight: f.body * 1.5, textAlign: 'center', marginTop: 10 }}
          >
            {bodyKeep}
          </Text>

          {/* Единственное действие: полный доступ (нейтральный CTA темы) */}
          <Pressable
            style={({ pressed }) => ({
              alignSelf: 'stretch',
              minHeight: 48,
              marginTop: 22,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: glass.cta,
              opacity: pressed ? 0.85 : 1,
            })}
            onPress={onOpenFullAccess}
            accessibilityRole="button"
            accessibilityLabel={btnFullAccess}
          >
            <Text style={{ color: glass.ctaInk, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}>
              {btnFullAccess}
            </Text>
          </Pressable>
        </View>
      </ResponsiveModalScrollView>
    </Modal>
  );
}

// ─── expo-router route shim ───────────────────────────────────────────────────
// Этот файл живёт в app/ — шим нужен, чтобы expo-router не считал его экраном.
export default function __RouteShim() { return null; }
