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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from './SafeLinearGradient';
import { useRouter } from 'expo-router';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { triLang } from '../constants/i18n';
import { navigateAfterModalClose } from '../app/safe_modal_navigation';
import {
  RewardModalBackdrop,
  rewardModalSoftSurface,
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

  const soft = rewardModalSoftSurface(themeMode, t);

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
  // Цвет-по-контексту: достижение/итог = золото, «скоро конец» = янтарь (не тревога).
  const tone = content.tone === 'amber'
    ? { accent: '#F4D889', cta: ['#FBE6A4', '#E0A124'] as [string, string], ink: '#3A2C06' }
    : { accent: '#E8C36C', cta: ['#FFE7A6', '#E0A124'] as [string, string], ink: '#3A2606' };
  const eyebrow = triLang(lang, {
    ru: 'Сезон', uk: 'Сезон', es: 'Temporada', 'pt-BR': 'Temporada',
    vi: 'Mùa giải', id: 'Musim', tr: 'Sezon', pl: 'Sezon',
  });
  const isAction = kind === 'season_ended' || kind === 'ceiling_reached';
  const onPrimary = isAction
    ? () => { hapticSuccess(); goLeaderboard(); }
    : () => { hapticTap(); dismiss(); };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <RewardModalBackdrop themeMode={themeMode} />
        <View style={[styles.panel, { backgroundColor: soft, borderColor: `${tone.accent}55` }]}>
          {/* Верхняя линия-свечение акцента */}
          <View pointerEvents="none" style={[styles.topGlow, { backgroundColor: tone.accent }]} />

          {/* Медальон-иконка вместо эмодзи */}
          <View style={[styles.medallion, { borderColor: `${tone.accent}66` }]}>
            <LinearGradient
              pointerEvents="none"
              colors={[`${tone.accent}33`, 'transparent']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name={content.icon} size={34} color={tone.accent} />
          </View>

          <Text style={[styles.eyebrow, { color: tone.accent }]}>{eyebrow}</Text>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h3 }]}>{content.title}</Text>
          <Text style={[styles.subtitle, { color: t.textSecond, fontSize: f.body }]}>
            {content.subtitle}
          </Text>

          <Pressable style={styles.btn} onPress={onPrimary}>
            <LinearGradient
              colors={tone.cta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={styles.btnTopSheen} />
            <Text style={[styles.btnText, { color: tone.ink, fontSize: f.body }]}>{content.actionLabel}</Text>
          </Pressable>

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
      icon: 'trophy' as const,
      tone: 'gold' as const,
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
      icon: 'medal' as const,
      tone: 'gold' as const,
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
    icon: 'time' as const,
    tone: 'amber' as const,
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
    borderRadius: 24,
    borderWidth: 1,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 26,
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 30,
    right: 30,
    height: 1.5,
    opacity: 0.5,
  },
  medallion: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 28,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 2,
  },
  btn: {
    marginTop: 14,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 28,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  btnTopSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  btnText: {
    fontWeight: '800',
  },
  close: {
    marginTop: 10,
    paddingVertical: 4,
  },
  closeText: {
    fontWeight: '600',
  },
});
