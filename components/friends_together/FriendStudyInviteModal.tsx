import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { coinRankRowForDisplay, isValidCoinRank } from '../../app/coin_rank_table_v1';
import { logMemCoin } from '../coins/mem_coin_probe';
import { triLang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import HybridAlertShell from '../modal_fx/HybridAlertShell';
import DuoPressable from '../DuoPressable';
import { LinearGradient } from '../SafeLinearGradient';
import { FONT_SCALE, useTheme } from '../ThemeContext';
import { useLang } from '../LangContext';
import { pairInviteLine } from '../../app/friends_together/pair_copy';

type Props = {
  visible: boolean;
  friendCoinRank?: number | null;
  /** Серия вдвоём из зова (nav.pairStreak сервера); от 2 дней — строка «Серия вдвоём · 7 дней». Нет — окно прежнее. */
  pairStreak?: number | null;
  onStart: () => void;
  onDecline: () => void;
};

/** С какой серии окно называет её — так же, как текст пуша (PAIR_STREAK_PUSH_MIN сервера). */
const INVITE_PAIR_STREAK_MIN = 2;

function FriendStudyInviteModal({ visible, friendCoinRank = null, pairStreak = null, onStart, onDecline }: Props) {
  const { fontSize, liquidGlassThemeId, uiScale } = useTheme();
  const { lang } = useLang();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const textScale = (FONT_SCALE[fontSize] / FONT_SCALE.medium) * uiScale;
  const coinRow = isValidCoinRank(friendCoinRank) ? coinRankRowForDisplay(friendCoinRank) : null;
  const L = (ru: string, uk: string, en: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) => triLang(lang, { ru, uk, en, es, 'pt-BR': ptBr, vi, id, tr, pl });

  return (
    <HybridAlertShell visible={visible} onRequestClose={onDecline} testID="friend-study-invite-modal" shadowColor={glass.cta}>
      <LinearGradient
        colors={[glass.opaqueSheet, glass.selected, glass.opaqueSheet]}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.92, y: 1 }}
        style={[styles.card, { backgroundColor: glass.opaqueSheet }]}
      >
        <View
          accessible
          accessibilityLabel={L('Приглашение на занятие', 'Запрошення на заняття', 'Study invitation', 'Invitación para estudiar', 'Convite para estudar', 'Lời mời học', 'Undangan belajar', 'Çalışma daveti', 'Zaproszenie do nauki')}
          style={styles.hero}
        >
          {coinRow ? (
            // зачем (R129): expo-image декодирует монету 768² под размер вида (68 dp), а не целиком
            <Image
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no"
              contentFit="contain"
              source={coinRow.source}
              style={styles.heroImage}
              onLoad={() => logMemCoin('friend-study-invite', 68)}
            />
          ) : (
            <View
              pointerEvents="none"
              style={[styles.heroPlaceholder, { backgroundColor: glass.selected }]}
            >
              <View style={[styles.heroPlaceholderCore, { backgroundColor: glass.glassEdge }]} />
            </View>
          )}
        </View>
        <Text accessibilityRole="header" style={[styles.title, { color: glass.text, fontSize: 22 * textScale, lineHeight: 28 * textScale }]}>
          {/* зачем (D188-следствие, 14.10): друзья учат разные языки — приглашение без названия языка */}
          {L('Пять минут на практику?', 'П’ять хвилин на практику?', 'Five minutes of practice?', '¿Cinco minutos de práctica?', 'Cinco minutos de prática?', 'Năm phút luyện tập?', 'Lima menit latihan?', 'Beş dakika pratik?', 'Pięć minut praktyki?')}
        </Text>
        <Text style={[styles.body, { color: glass.secondary, fontSize: 13 * textScale, lineHeight: 18 * textScale }]}>
          {L('Друг зовёт тебя заниматься сегодня.', 'Друг кличе тебе позайматися сьогодні.', 'A friend is inviting you to study today.', 'Un amigo te invita a estudiar hoy.', 'Um amigo está convidando você para estudar hoje.', 'Một người bạn đang mời bạn học hôm nay.', 'Seorang teman mengajakmu belajar hari ini.', 'Bir arkadaşın seni bugün çalışmaya davet ediyor.', 'Znajomy zaprasza cię dziś do nauki.')}
          {/* зачем (идея 1, макет friendSide: «…Серия вдвоём с Алексом · 7 дней»): зов друга напоминает, что на кону общая серия */}
          {typeof pairStreak === 'number' && pairStreak >= INVITE_PAIR_STREAK_MIN ? ` ${pairInviteLine(lang, pairStreak)}.` : ''}
        </Text>
        <DuoPressable
          testID="friend-study-start"
          accessibilityLabel={L('Начать занятие', 'Почати заняття', 'Start the lesson', 'Empezar lección', 'Começar lição', 'Bắt đầu bài học', 'Mulai pelajaran', 'Derse başla', 'Zacznij lekcję')}
          onPress={onStart}
          wrapStyle={styles.primaryWrap}
          gradientColors={[glass.lightTint, glass.cta, glass.cta]}
          style={[styles.button, { backgroundColor: glass.accent }]}
        >
          <Text style={[styles.buttonText, { color: glass.accentInk, fontSize: 16 * textScale }]}>
            {L('Начать занятие', 'Почати заняття', 'Start the lesson', 'Empezar lección', 'Começar lição', 'Bắt đầu bài học', 'Mulai pelajaran', 'Derse başla', 'Zacznij lekcję')}
          </Text>
        </DuoPressable>
        <DuoPressable
          testID="friend-study-decline"
          accessibilityLabel={L('Не сейчас', 'Не зараз', 'Not now', 'Ahora no', 'Agora não', 'Không phải bây giờ', 'Jangan sekarang', 'Şimdi değil', 'Nie teraz')}
          onPress={onDecline}
          wrapStyle={styles.secondaryWrap}
          style={[styles.button, styles.secondary, { backgroundColor: glass.buttonFill }]} // зачем (владелец 12.10, стиль «Тень»): без обводки — отделяют тон и малая внешняя тень (кнопка «Не сейчас»)
        >
          <Text style={[styles.buttonText, { color: glass.text, fontSize: 16 * textScale }]}>
            {L('Не сейчас', 'Не зараз', 'Not now', 'Ahora no', 'Agora não', 'Không phải bây giờ', 'Jangan sekarang', 'Şimdi değil', 'Nie teraz')}
          </Text>
        </DuoPressable>
      </LinearGradient>
    </HybridAlertShell>
  );
}

export default memo(FriendStudyInviteModal);

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderRadius: 26,
  },
  hero: { width: 68, height: 68, alignSelf: 'center' },
  heroImage: { width: 68, height: 68 },
  heroPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderCore: { width: 22, height: 22, borderRadius: 11 },
  title: { marginTop: 14, fontWeight: '700', textAlign: 'center' },
  body: { marginTop: 8, fontWeight: '400', textAlign: 'center' },
  primaryWrap: { marginTop: 20 },
  secondaryWrap: { marginTop: 10 },
  button: { minHeight: 48, borderRadius: 24 },
  secondary: {},
  buttonText: { fontWeight: '700', textAlign: 'center' },
});
