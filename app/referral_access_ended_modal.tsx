/**
 * Модальное окно: реферальный период доступа завершился.
 *
 * Показывается когда vip_until < now и доступ был открыт через реферальную программу.
 * Фрейминг — только «что осталось» и «как получить больше» (без страха и потерь).
 * Два пути: позвать ещё друга (бесплатно, D99) или открыть полный доступ (пейвол).
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
   * Главное действие кадра OM-REFERRAL-ACCESS-ENDED — «Пригласить друга». Рулетка
   * приглашений вернулась решением D99 (30.09), поэтому кнопка снова есть. Вызов
   * (friends.tsx) передаёт её только пока раздел приглашений включён; нет пропса —
   * нет кнопки, остаётся один путь к полному доступу.
   */
  onInviteFriend?: () => void;
  onOpenFullAccess: () => void; // открыть пейвол
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
  onInviteFriend,
  onOpenFullAccess,
  onClose,
  L,
}: ReferralAccessEndedModalProps) {
  // зачем: макет OM-REFERRAL-ACCESS-ENDED (overlays-more, кадр 15) — сцена 202×160 с галочкой,
  // заголовок 25/31, две строки текста, «Пригласить друга» (главная) и «Открыть полный доступ»
  // (тёмная капсула). Материал — из активной темы, CTA нейтральный. Текст 16/22 — шкала D145.
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);

  const title = L(
    'Доступ можно открыть снова',
    'Доступ можна відкрити знову',
    'You can unlock access again',
    'Puedes volver a abrir el acceso',
    'Você pode abrir o acesso de novo',
    'Bạn có thể mở lại quyền truy cập',
    'Akses bisa dibuka lagi',
    'Erişimi yeniden açabilirsin',
    'Dostęp możesz otworzyć ponownie',
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

  // Вторая строка кадра: как вернуть доступ бесплатно (только когда есть кнопка приглашения).
  const bodyRestore = L(
    'Позови ещё друга — и доступ вернётся.',
    'Запроси ще друга — і доступ повернеться.',
    'Invite one more friend and access will return.',
    'Invita a otro amigo y el acceso regresará.',
    'Convide mais um amigo e o acesso voltará.',
    'Mời thêm một người bạn và quyền truy cập sẽ trở lại.',
    'Ajak satu teman lagi dan aksesmu akan kembali.',
    'Bir arkadaşını daha davet et, erişim geri gelsin.',
    'Zaproś kolejnego znajomego — dostęp wróci.',
  );

  const inviteLabel = L(
    'Пригласить друга',
    'Запросити друга',
    'Invite a friend',
    'Invitar a un amigo',
    'Convidar um amigo',
    'Mời một người bạn',
    'Ajak teman',
    'Arkadaş davet et',
    'Zaproś znajomego',
  );

  // Полный доступ — глагол «Открыть», никогда «Купить»
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
        {/* Карточка `.om-modal`: непрозрачная основа темы, радиус 26, поля 21 */}
        <View
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: 440,
            backgroundColor: glass.opaqueSheet,
            borderRadius: 26,
            padding: 21,
            alignItems: 'center',
          }}
        >
          {/* `.om-close`: круглая кнопка в углу (14 от краёв), область нажатия 44dp */}
          <Pressable
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              zIndex: 1,
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
            <Ionicons name="close" size={18} color={glass.text} />
          </Pressable>

          {/* `.om-art`: сцена 202×160, радиус 22, галочка 28 */}
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              width: 202,
              height: 160,
              borderRadius: 22,
              marginTop: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: glass.selected,
            }}
          >
            <Ionicons name="checkmark" size={28} color={glass.text} />
          </View>

          {/* `.om-title` 25/31 */}
          <Text
            accessibilityRole="header"
            style={{ color: glass.text, fontSize: 25, lineHeight: 31, fontWeight: '800', textAlign: 'center', marginTop: 7 }}
          >
            {title}
          </Text>

          {/* `.om-copy` — шкала D145 16/22 */}
          <Text style={{ color: glass.secondary, fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 9 }}>
            {bodyKeep}
          </Text>
          {onInviteFriend ? (
            <Text style={{ color: glass.secondary, fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 9 }}>
              {bodyRestore}
            </Text>
          ) : null}

          <View style={{ alignSelf: 'stretch', marginTop: 18, gap: 10 }}>
            {/* `.cta`: главная — пригласить (если раздел включён), иначе полный доступ */}
            <Pressable
              testID={onInviteFriend ? 'referral-ended-invite' : 'referral-ended-full-access'}
              style={({ pressed }) => ({
                minHeight: 48,
                paddingHorizontal: 20,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: glass.accent,
                opacity: pressed ? 0.85 : 1,
              })}
              onPress={onInviteFriend ?? onOpenFullAccess}
              accessibilityRole="button"
              accessibilityLabel={onInviteFriend ? inviteLabel : btnFullAccess}
            >
              <Text style={{ color: glass.accentInk, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                {onInviteFriend ? inviteLabel : btnFullAccess}
              </Text>
            </Pressable>
            {/* `.cta.gh`: тёмная капсула тоном (рамок в этом файле нет — сторож) */}
            {onInviteFriend ? (
              <Pressable
                testID="referral-ended-full-access"
                style={({ pressed }) => ({
                  minHeight: 48,
                  paddingHorizontal: 20,
                  borderRadius: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: glass.selected,
                  opacity: pressed ? 0.85 : 1,
                })}
                onPress={onOpenFullAccess}
                accessibilityRole="button"
                accessibilityLabel={btnFullAccess}
              >
                <Text style={{ color: glass.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
                  {btnFullAccess}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ResponsiveModalScrollView>
    </Modal>
  );
}

// ─── expo-router route shim ───────────────────────────────────────────────────
// Этот файл живёт в app/ — шим нужен, чтобы expo-router не считал его экраном.
export default function __RouteShim() { return null; }
