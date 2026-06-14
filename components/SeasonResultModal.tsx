/**
 * SeasonResultModal — три варианта:
 *   'ceiling_reached'  — первое попадание на Legend III (SR начинается)
 *   'season_ended'     — сезон закрылся, ранг откатился, показываем итог
 *   'ending_soon'      — до конца сезона < 7 дней, призыв к действию
 *
 * Тексты строго по docs/personal-plans-copy-style.md:
 *   живой «тренер», краткие фразы, без жаргона, без «!»-спама.
 */
import React, { memo, useCallback } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { triLang } from '../constants/i18n';
import { navigateAfterModalClose } from '../app/safe_modal_navigation';
import {
  RewardModalBackdrop,
  rewardModalSoftSurface,
  rewardModalPanelBorder,
  rewardModalAccentColor,
} from './RewardModalBackdrop';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';

export type SeasonModalKind = 'ceiling_reached' | 'season_ended' | 'ending_soon';

interface Props {
  visible: boolean;
  kind: SeasonModalKind;
  /** Текущий SR (для ceiling_reached и ending_soon). */
  sr?: number;
  /** Итоговый ранг после отката (для season_ended). */
  rankLabel?: string;
  /** Место в топе прошлого сезона (для season_ended). */
  finalPlace?: number | null;
  /** Дни до конца сезона (для ending_soon). */
  daysLeft?: number;
  onClose: () => void;
}

function SeasonResultModal({
  visible, kind, sr = 0, rankLabel, finalPlace, daysLeft = 7, onClose,
}: Props) {
  const router = useRouter();
  const { lang } = useLang();
  const { theme: t, f, themeMode } = useTheme();

  const accent = rewardModalAccentColor(themeMode, t);
  const soft = rewardModalSoftSurface(themeMode, t);
  const border = rewardModalPanelBorder(themeMode, t);

  const goLeaderboard = useCallback(() => {
    hapticTap();
    navigateAfterModalClose(onClose, () => {
      router.push('/arena_season_leaderboard' as any);
    });
  }, [onClose, router]);

  const dismiss = useCallback(() => {
    hapticTap();
    onClose();
  }, [onClose]);

  const content = buildContent({ kind, sr, rankLabel, finalPlace, daysLeft, lang });

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <RewardModalBackdrop themeMode={themeMode} />
        <View style={[styles.panel, { backgroundColor: soft, borderColor: border }]}>
          <Text style={[styles.emoji]}>{content.emoji}</Text>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h3 }]}>{content.title}</Text>
          <Text style={[styles.subtitle, { color: t.textSecond, fontSize: f.body }]}>
            {content.subtitle}
          </Text>

          {kind === 'season_ended' && (
            <Pressable
              style={[styles.btn, { backgroundColor: accent }]}
              onPress={() => { hapticSuccess(); goLeaderboard(); }}
            >
              <Text style={[styles.btnText, { fontSize: f.body }]}>{content.actionLabel}</Text>
            </Pressable>
          )}

          {kind === 'ceiling_reached' && (
            <Pressable
              style={[styles.btn, { backgroundColor: accent }]}
              onPress={() => { hapticSuccess(); goLeaderboard(); }}
            >
              <Text style={[styles.btnText, { fontSize: f.body }]}>{content.actionLabel}</Text>
            </Pressable>
          )}

          {kind === 'ending_soon' && (
            <Pressable
              style={[styles.btn, { backgroundColor: accent }]}
              onPress={() => { hapticTap(); dismiss(); }}
            >
              <Text style={[styles.btnText, { fontSize: f.body }]}>{content.actionLabel}</Text>
            </Pressable>
          )}

          <Pressable onPress={dismiss} style={styles.close} hitSlop={12}>
            <Text style={[styles.closeText, { color: t.textSecond, fontSize: f.sub }]}>
              {triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── тексты ──────────────────────────────────────────────────────────────────
function buildContent({
  kind, sr, rankLabel, finalPlace, daysLeft, lang,
}: Pick<Props, 'kind' | 'sr' | 'rankLabel' | 'finalPlace' | 'daysLeft'> & { lang: any }) {
  if (kind === 'ceiling_reached') {
    return {
      emoji: '🏆',
      title: triLang(lang, {
        ru: 'Добрался до Legend III',
        uk: 'Досяг Legend III',
        es: 'Alcanzaste Legend III',
        'pt-BR': 'Você chegou ao Legend III',
        vi: 'Bạn đã đạt Legend III',
        id: 'Kamu mencapai Legend III',
        tr: 'Legend III\'e ulaştın',
        pl: 'Osiągnąłeś Legend III',
      }),
      subtitle: triLang(lang, {
        ru: `Здесь начинается сезонный рейтинг (SR). Сейчас у тебя ${sr} SR — побеждай и набирай очки до конца сезона.`,
        uk: `Тут починається сезонний рейтинг (SR). Зараз у тебе ${sr} SR — перемагай і набирай очки до кінця сезону.`,
        es: `Aquí empieza el SR de temporada. Tienes ${sr} SR ahora: gana partidas y acumula hasta el fin de temporada.`,
        'pt-BR': `Aqui começa o SR de temporada. Você tem ${sr} SR agora: vença partidas e acumule até o fim da temporada.`,
        vi: `Đây là nơi SR mùa giải bắt đầu. Bạn có ${sr} SR lúc này — hãy chiến thắng để tích lũy đến cuối mùa.`,
        id: `Di sini SR musim dimulai. Kamu punya ${sr} SR sekarang — menangkan pertandingan sampai akhir musim.`,
        tr: `Sezon SR'si burada başlıyor. Şu an ${sr} SR'ın var — sezon sonuna kadar kazan ve puan topla.`,
        pl: `Tutaj zaczyna się SR sezonu. Masz teraz ${sr} SR — wygrywaj mecze aż do końca sezonu.`,
      }),
      actionLabel: triLang(lang, {
        ru: 'Смотреть топ сезона',
        uk: 'Дивитися топ сезону',
        es: 'Ver el ranking de temporada',
        'pt-BR': 'Ver o ranking da temporada',
        vi: 'Xem bảng xếp hạng mùa',
        id: 'Lihat peringkat musim',
        tr: 'Sezon sıralamasını gör',
        pl: 'Zobacz ranking sezonu',
      }),
    };
  }

  if (kind === 'season_ended') {
    const placeText = finalPlace
      ? triLang(lang, {
          ru: `#${finalPlace} в сезоне`,
          uk: `#${finalPlace} у сезоні`,
          es: `#${finalPlace} en la temporada`,
          'pt-BR': `#${finalPlace} na temporada`,
          vi: `#${finalPlace} trong mùa`,
          id: `#${finalPlace} musim ini`,
          tr: `Sezonda #${finalPlace}`,
          pl: `#${finalPlace} w sezonie`,
        })
      : '';
    const rankText = rankLabel ? ` · ${rankLabel}` : '';
    return {
      emoji: '🎖',
      title: triLang(lang, {
        ru: 'Сезон завершён',
        uk: 'Сезон завершено',
        es: 'Temporada finalizada',
        'pt-BR': 'Temporada encerrada',
        vi: 'Mùa giải kết thúc',
        id: 'Musim berakhir',
        tr: 'Sezon bitti',
        pl: 'Sezon zakończony',
      }),
      subtitle: triLang(lang, {
        ru: `${placeText}${rankText}. Награды уже в твоём профиле — проверь их.`,
        uk: `${placeText}${rankText}. Нагороди вже в твоєму профілі — перевір їх.`,
        es: `${placeText}${rankText}. Las recompensas ya están en tu perfil.`,
        'pt-BR': `${placeText}${rankText}. As recompensas já estão no seu perfil.`,
        vi: `${placeText}${rankText}. Phần thưởng đã có trong hồ sơ của bạn.`,
        id: `${placeText}${rankText}. Hadiahnya sudah ada di profilmu.`,
        tr: `${placeText}${rankText}. Ödüller profilinde seni bekliyor.`,
        pl: `${placeText}${rankText}. Nagrody są już w Twoim profilu.`,
      }),
      actionLabel: triLang(lang, {
        ru: 'Итоги сезона',
        uk: 'Підсумки сезону',
        es: 'Resultados de temporada',
        'pt-BR': 'Resultados da temporada',
        vi: 'Kết quả mùa giải',
        id: 'Hasil musim',
        tr: 'Sezon sonuçları',
        pl: 'Wyniki sezonu',
      }),
    };
  }

  // ending_soon
  return {
    emoji: '⏳',
    title: triLang(lang, {
      ru: `До конца сезона ${daysLeft} дн.`,
      uk: `До кінця сезону ${daysLeft} дн.`,
      es: `Faltan ${daysLeft} días para el fin`,
      'pt-BR': `Faltam ${daysLeft} dias para o fim`,
      vi: `Còn ${daysLeft} ngày đến cuối mùa`,
      id: `${daysLeft} hari lagi menuju akhir musim`,
      tr: `Sezon bitmesine ${daysLeft} gün kaldı`,
      pl: `Jeszcze ${daysLeft} dni do końca sezonu`,
    }),
    subtitle: triLang(lang, {
      ru: 'Успей поднять SR — от него зависит твоя награда.',
      uk: 'Встигни підняти SR — від нього залежить твоя нагорода.',
      es: 'Sube tu SR antes de que acabe — determina tu recompensa.',
      'pt-BR': 'Aumente seu SR antes do fim — ele define sua recompensa.',
      vi: 'Hãy tăng SR trước khi kết thúc — nó quyết định phần thưởng của bạn.',
      id: 'Tingkatkan SR sebelum habis — itu menentukan hadiahmu.',
      tr: 'SR\'ını yükselt — ödülünü o belirliyor.',
      pl: 'Zwiększ swój SR przed końcem — to decyduje o nagrodzie.',
    }),
    actionLabel: triLang(lang, {
      ru: 'Понятно',
      uk: 'Зрозуміло',
      es: 'Entendido',
      'pt-BR': 'Entendido',
      vi: 'Đã hiểu',
      id: 'Mengerti',
      tr: 'Anladım',
      pl: 'Rozumiem',
    }),
  };
}

export default memo(SeasonResultModal);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 52,
    lineHeight: 60,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: {
    marginTop: 4,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
  },
  close: {
    marginTop: 4,
    paddingVertical: 4,
  },
  closeText: {
    textDecorationLine: 'underline',
  },
});
