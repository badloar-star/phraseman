import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { memo, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from './SafeLinearGradient';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { triLang } from '../constants/i18n';
import { monoIcon, MONO_ICON } from '../constants/monoIcon';
import CompassDepthSurface from './CompassDepthSurface';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';

const TEXT = {
  title: {
    ru: 'PhraseMan стал удобнее',
    uk: 'PhraseMan став зручнішим',
    es: 'PhraseMan es más cómodo',
    'pt-BR': 'O PhraseMan ficou mais prático',
    vi: 'PhraseMan dễ dùng hơn',
    id: 'PhraseMan jadi lebih nyaman',
    tr: 'PhraseMan daha kullanışlı',
    pl: 'PhraseMan jest wygodniejszy',
  },
  subtitle: {
    ru: 'Небольшие улучшения, которые делают учёбу спокойнее.',
    uk: 'Невеликі покращення, які роблять навчання спокійнішим.',
    es: 'Pequeñas mejoras para estudiar con más calma.',
    'pt-BR': 'Pequenas melhorias para estudar com mais calma.',
    vi: 'Những cải tiến nhỏ giúp việc học nhẹ nhàng hơn.',
    id: 'Peningkatan kecil yang membuat belajar lebih tenang.',
    tr: 'Daha sakin çalışmak için küçük iyileştirmeler.',
    pl: 'Małe usprawnienia, dzięki którym nauka jest spokojniejsza.',
  },
  chips: {
    ru: ['Визуал', 'Карточки', 'Статистика', 'Чат лиги'],
    uk: ['Візуал', 'Картки', 'Статистика', 'Чат ліги'],
    es: ['Visual', 'Tarjetas', 'Estadísticas', 'Chat de liga'],
    'pt-BR': ['Visual', 'Cartões', 'Estatísticas', 'Chat da liga'],
    vi: ['Giao diện', 'Thẻ học', 'Thống kê', 'Chat giải đấu'],
    id: ['Tampilan', 'Kartu', 'Statistik', 'Chat liga'],
    tr: ['Görsel', 'Kartlar', 'İstatistik', 'Lig sohbeti'],
    pl: ['Wygląd', 'Fiszki', 'Statystyki', 'Czat ligi'],
  },
  body: {
    ru:
      'Мы немного обновили PhraseMan: освежили визуал уровней, лиг, подарков, энергии и статистики.\n\n'
      + 'В карточках появилось автопрослушивание — теперь можно спокойно тренировать слух без лишних нажатий.\n\n'
      + 'Статистика стала понятнее: проще следить за серией, ритмом занятий, заморозкой и прогрессом.\n\n'
      + 'Чат лиги тоже доработали: непрочитанные сообщения, жалобы, скрытие участников и более стабильное подключение.\n\n'
      + 'Ещё поправили уроки, подсказки, вызовы, Plus-доступ, синхронизацию и несколько ошибок, которые слишком уверенно мешали жить.',
    uk:
      'Ми трохи оновили PhraseMan: освіжили вигляд рівнів, ліг, подарунків, енергії та статистики.\n\n'
      + 'У картках з’явилося автопрослуховування — тепер можна спокійно тренувати слух без зайвих натискань.\n\n'
      + 'Статистика стала зрозумілішою: простіше стежити за серією, ритмом занять, заморозкою та прогресом.\n\n'
      + 'Чат ліги теж допрацювали: непрочитані повідомлення, скарги, приховування учасників і стабільніше підключення.\n\n'
      + 'Ще поправили уроки, підказки, квізи, Plus-доступ, синхронізацію і кілька помилок, які надто впевнено заважали жити.',
    es:
      'Hemos actualizado un poco PhraseMan: renovamos el aspecto de niveles, ligas, regalos, energía y estadísticas.\n\n'
      + 'Las tarjetas ahora tienen reproducción automática: puedes entrenar el oído sin tocar la pantalla todo el rato.\n\n'
      + 'Las estadísticas son más claras: es más fácil seguir la racha, el ritmo de estudio, la congelación y el progreso.\n\n'
      + 'También mejoramos el chat de liga: mensajes no leídos, reportes, ocultar participantes y una conexión más estable.\n\n'
      + 'Además ajustamos lecciones, pistas, cuestionarios, acceso Plus, sincronización y algunos errores que molestaban con demasiada confianza.',
    'pt-BR':
      'Atualizamos um pouco o PhraseMan: renovamos o visual de níveis, ligas, presentes, energia e estatísticas.\n\n'
      + 'Os cartões agora têm reprodução automática: dá para treinar o ouvido sem ficar tocando na tela toda hora.\n\n'
      + 'As estatísticas ficaram mais claras: ficou mais fácil acompanhar sequência, ritmo de estudo, congelamento e progresso.\n\n'
      + 'Também melhoramos o chat da liga: mensagens não lidas, denúncias, ocultar participantes e conexão mais estável.\n\n'
      + 'Além disso, ajustamos lições, dicas, quizzes, acesso Plus, sincronização e alguns erros que atrapalhavam com confiança demais.',
    vi:
      'Chúng tôi đã cập nhật nhẹ PhraseMan: làm mới giao diện cấp độ, giải đấu, quà tặng, năng lượng và thống kê.\n\n'
      + 'Thẻ học giờ có tự động phát âm thanh, để bạn luyện nghe bình tĩnh hơn mà không cần bấm liên tục.\n\n'
      + 'Thống kê rõ ràng hơn: dễ theo dõi chuỗi học, nhịp học, đóng băng chuỗi và tiến bộ.\n\n'
      + 'Chat giải đấu cũng được cải thiện: tin nhắn chưa đọc, báo cáo, ẩn người tham gia và kết nối ổn định hơn.\n\n'
      + 'Chúng tôi cũng chỉnh bài học, gợi ý, quiz, quyền truy cập Plus, đồng bộ và vài lỗi từng làm phiền khá tự tin.',
    id:
      'Kami sedikit memperbarui PhraseMan: tampilan level, liga, hadiah, energi, dan statistik dibuat lebih segar.\n\n'
      + 'Kartu sekarang punya pemutaran otomatis, jadi kamu bisa melatih pendengaran tanpa terlalu sering menekan tombol.\n\n'
      + 'Statistik jadi lebih jelas: lebih mudah melihat streak, ritme belajar, freeze, dan progres.\n\n'
      + 'Chat liga juga kami rapikan: pesan belum dibaca, laporan, sembunyikan peserta, dan koneksi yang lebih stabil.\n\n'
      + 'Kami juga memperbaiki pelajaran, petunjuk, kuis, akses Plus, sinkronisasi, dan beberapa bug yang terlalu percaya diri mengganggu.',
    tr:
      'PhraseMan’i biraz güncelledik: seviyeler, ligler, hediyeler, enerji ve istatistiklerin görünümünü yeniledik.\n\n'
      + 'Kartlara otomatik dinleme eklendi; artık sürekli dokunmadan sakin bir şekilde dinleme çalışması yapabilirsiniz.\n\n'
      + 'İstatistikler daha anlaşılır oldu: seri, çalışma ritmi, dondurma ve ilerlemeyi takip etmek daha kolay.\n\n'
      + 'Lig sohbetini de iyileştirdik: okunmamış mesajlar, şikayetler, katılımcı gizleme ve daha stabil bağlantı.\n\n'
      + 'Ayrıca dersleri, ipuçlarını, quizleri, Plus erişimini, senkronizasyonu ve fazla özgüvenle rahatsız eden birkaç hatayı düzelttik.',
    pl:
      'Trochę odświeżyliśmy PhraseMan: wygląd poziomów, lig, prezentów, energii i statystyk.\n\n'
      + 'Fiszki mają teraz automatyczne odtwarzanie, więc można spokojnie ćwiczyć słuch bez ciągłego klikania.\n\n'
      + 'Statystyki są czytelniejsze: łatwiej śledzić serię, rytm nauki, zamrożenie i postęp.\n\n'
      + 'Dopracowaliśmy też czat ligi: nieprzeczytane wiadomości, zgłoszenia, ukrywanie uczestników i stabilniejsze połączenie.\n\n'
      + 'Poprawiliśmy też lekcje, podpowiedzi, quizy, dostęp Plus, synchronizację i kilka błędów, które przeszkadzały z podejrzaną pewnością siebie.',
  },
  cta: {
    ru: 'Поехали дальше',
    uk: 'Поїхали далі',
    es: 'Entendido, seguimos',
    'pt-BR': 'Entendi, continuar',
    vi: 'Đã hiểu, tiếp tục',
    id: 'Mengerti, lanjut',
    tr: 'Anladım, devam',
    pl: 'Rozumiem, kontynuuj',
  },
} as const;

const pickReleaseNotesCopy = <T extends { ru: unknown }>(
  lang: string,
  copy: T,
) => (copy[lang as keyof T] ?? copy.ru) as T[keyof T];

type Props = {
  visible: boolean;
  onClose: () => void;
};

function ReleaseNotesModal({ visible, onClose }: Props) {
  const { f, themeMode } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const isCompassTheme = false;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;

  const title = useMemo(() => triLang(lang, {
    ru: TEXT.title.ru,
    uk: TEXT.title.uk,
    es: TEXT.title.es,
    'pt-BR': TEXT.title['pt-BR'],
    vi: TEXT.title.vi,
    id: TEXT.title.id,
    tr: TEXT.title.tr,
    pl: TEXT.title.pl,
  }), [lang]);
  const subtitle = useMemo(() => triLang(lang, {
    ru: TEXT.subtitle.ru,
    uk: TEXT.subtitle.uk,
    es: TEXT.subtitle.es,
    'pt-BR': TEXT.subtitle['pt-BR'],
    vi: TEXT.subtitle.vi,
    id: TEXT.subtitle.id,
    tr: TEXT.subtitle.tr,
    pl: TEXT.subtitle.pl,
  }), [lang]);
  const chips = useMemo(() => pickReleaseNotesCopy(lang, TEXT.chips), [lang]);
  const versionLabel = useMemo(() => pickReleaseNotesCopy(lang, {
    ru: 'Обновление',
    uk: 'Оновлення',
    es: 'Actualización',
    'pt-BR': 'Atualização',
    vi: 'Cập nhật',
    id: 'Pembaruan',
    tr: 'Güncelleme',
    pl: 'Aktualizacja',
  }), [lang]);
  const body = useMemo(() => triLang(lang, {
    ru: TEXT.body.ru,
    uk: TEXT.body.uk,
    es: TEXT.body.es,
    'pt-BR': TEXT.body['pt-BR'],
    vi: TEXT.body.vi,
    id: TEXT.body.id,
    tr: TEXT.body.tr,
    pl: TEXT.body.pl,
  }), [lang]);
  const paragraphs = useMemo(() => body.split('\n\n').filter(Boolean), [body]);
  const titleSize = Math.min(f.h2, 24);
  const bodySize = Math.min(f.body, 16);
  const captionSize = Math.min(f.caption, 13);
  const buttonSize = Math.min(f.bodyLg, 17);

  useEffect(() => {
    if (!visible) {
      cardAnim.setValue(0);
      glowAnim.setValue(0);
      shineAnim.setValue(0);
      return;
    }

    const enter = Animated.spring(cardAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 74,
      friction: 9,
    });
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const shineLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shineAnim, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(6800),
      ]),
    );

    enter.start();
    glowLoop.start();
    shineLoop.start();

    return () => {
      enter.stop();
      glowLoop.stop();
      shineLoop.stop();
    };
  }, [cardAnim, glowAnim, shineAnim, visible]);

  const closeOnce = () => {
    hapticTap();
    onClose();
  };

  const cardAnimatedStyle = {
    opacity: cardAnim,
    transform: [
      {
        translateY: cardAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [28, 0],
        }),
      },
      {
        scale: cardAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1],
        }),
      },
    ],
  };

  const iconAnimatedStyle = {
    transform: [
      {
        scale: glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.08],
        }),
      },
      {
        rotate: glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['-4deg', '5deg'],
        }),
      },
    ],
  };

  const shineAnimatedStyle = {
    opacity: shineAnim.interpolate({
      inputRange: [0, 0.25, 0.55, 1],
      outputRange: [0, 0.24, 0.08, 0],
    }),
    transform: [
      {
        translateX: shineAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-260, 260],
        }),
      },
      { rotate: '18deg' },
    ],
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={closeOnce}
    >
      <View style={[styles.root, { paddingBottom: bottomInset }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={closeOnce}
          accessibilityRole="button"
          accessibilityLabel={triLang(lang, {
            uk: 'Закрити',
            ru: 'Закрыть',
            es: 'Cerrar',
            'pt-BR': 'Fechar',
            vi: 'Đóng',
            id: 'Tutup',
            tr: 'Kapat',
            pl: 'Zamknij',
          })}
        />
        <Animated.View style={[styles.card, isCompassTheme && compassShadow(3), isCompassTheme && { borderRadius: 14, borderColor: COMPASS_RICH.hairlineStrong }, cardAnimatedStyle]}>
          <LinearGradient
            colors={isCompassTheme ? ['#2C2B2C', '#181819', '#050506'] : ['#111722', '#171A24', '#241F13']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {isCompassTheme && <CompassDepthSurface radius={14} selected />}
          <Animated.View pointerEvents="none" style={[styles.shine, shineAnimatedStyle]} />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollInner}
            showsVerticalScrollIndicator
            bounces
          >
          <View style={[styles.hero, isCompassTheme && { borderRadius: 10, borderColor: COMPASS_RICH.hairline, backgroundColor: COMPASS_RICH.charcoalRaised, overflow: 'hidden' }]}>
            {isCompassTheme && <CompassDepthSurface radius={10} quiet />}
            <Animated.View style={[styles.iconHalo, iconAnimatedStyle]}>
              <LinearGradient colors={isCompassTheme ? ['#FFE6B5', '#F4B978', '#B4774E'] : ['#FFF1B8', '#F7C75F', '#D68A2E']} style={[styles.iconBadge, isCompassTheme && { borderRadius: 9 }]}>
                <Ionicons name="sparkles" size={25} color={isCompassTheme ? COMPASS_RICH.textDark : monoIcon(themeMode, '#172033', MONO_ICON.onLight)} />
              </LinearGradient>
            </Animated.View>
            <View style={[styles.releasePill, isCompassTheme && { borderRadius: 8, borderColor: COMPASS_RICH.hairlineQuiet, backgroundColor: COMPASS_RICH.charcoalWarm, overflow: 'hidden' }]}>
              {isCompassTheme && <CompassDepthSurface radius={8} quiet />}
              <Ionicons name="rocket-outline" size={14} color={isCompassTheme ? COMPASS_RICH.champagne : monoIcon(themeMode, '#F9D77A')} />
              <Text style={[styles.releasePillText, { fontSize: captionSize, color: isCompassTheme ? COMPASS_RICH.champagne : monoIcon(themeMode, '#F9D77A') }]}>
                {versionLabel}
              </Text>
            </View>
            <Text style={[styles.title, { fontSize: titleSize, color: monoIcon(themeMode, '#FFF7E3') }]}>{title}</Text>
            <Text style={[styles.subtitle, { fontSize: bodySize, color: monoIcon(themeMode, '#C8D6EA') }]}>{subtitle}</Text>
          </View>

          <View style={styles.chipsWrap}>
            {chips.map((chip, index) => (
              <View key={chip} style={[styles.chip, isCompassTheme && { borderRadius: 9, borderColor: COMPASS_RICH.hairlineQuiet, backgroundColor: COMPASS_RICH.charcoalRaised, overflow: 'hidden' }]}>
                {isCompassTheme && <CompassDepthSurface radius={9} quiet />}
                <View style={[styles.chipIcon, isCompassTheme && { borderRadius: 7, backgroundColor: COMPASS_RICH.champagne }]}>
                  <Ionicons
                    name={
                      index === 0
                        ? 'color-palette-outline'
                        : index === 1
                          ? 'volume-high-outline'
                          : index === 3
                            ? 'chatbubble-ellipses-outline'
                            : 'analytics-outline'
                    }
                    size={13}
                    color={isCompassTheme ? COMPASS_RICH.textDark : monoIcon(themeMode, '#1B2330', MONO_ICON.onLight)}
                  />
                </View>
                <Text style={[styles.chipText, { fontSize: captionSize, color: monoIcon(themeMode, '#DCE8FF') }]} numberOfLines={2}>
                  {chip}
                </Text>
              </View>
            ))}
          </View>

            {paragraphs.map((paragraph, index) => {
              const featureBlock = index === 1;
              return featureBlock ? (
                <View key={paragraph} style={[styles.premiumBlock, isCompassTheme && { borderRadius: 10, borderColor: COMPASS_RICH.hairlineStrong, backgroundColor: COMPASS_RICH.washStrong, overflow: 'hidden' }]}>
                  {isCompassTheme && <CompassDepthSurface radius={10} selected />}
                  <View style={[styles.premiumBlockIcon, isCompassTheme && { borderRadius: 7, backgroundColor: COMPASS_RICH.champagne }]}>
                    <Ionicons name="volume-high-outline" size={15} color={isCompassTheme ? COMPASS_RICH.textDark : monoIcon(themeMode, '#1B2330', MONO_ICON.onLight)} />
                  </View>
                  <Text style={[styles.premiumBlockText, { fontSize: bodySize, color: monoIcon(themeMode, '#FFE9A8') }]}>{paragraph}</Text>
                </View>
              ) : (
                <Text key={paragraph} style={[styles.body, { fontSize: bodySize, color: monoIcon(themeMode, '#DDE7F6') }]}>
                  {paragraph}
                </Text>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={closeOnce}
            style={({ pressed }) => [
              styles.btn,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <LinearGradient colors={isCompassTheme ? ['#FFE6B5', '#F4B978', '#B4774E'] : ['#FFE08A', '#F7BE4F', '#E99D35']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.btnGradient, isCompassTheme && { borderRadius: 9, overflow: 'hidden' }]}>
              {isCompassTheme && <CompassDepthSurface radius={9} cream />}
              <Text style={[styles.btnText, { fontSize: buttonSize, color: monoIcon(themeMode, '#121826', MONO_ICON.onLight) }]}>
                {triLang(lang, {
                  ru: TEXT.cta.ru,
                  uk: TEXT.cta.uk,
                  es: TEXT.cta.es,
                  'pt-BR': TEXT.cta['pt-BR'],
                  vi: TEXT.cta.vi,
                  id: TEXT.cta.id,
                  tr: TEXT.cta.tr,
                  pl: TEXT.cta.pl,
                })}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default memo(ReleaseNotesModal);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(3, 7, 18, 0.82)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    height: '88%',
    maxHeight: '88%',
    borderRadius: 24,
    borderWidth: 0,
    borderColor: 'rgba(247, 199, 95, 0.34)',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.24,
    shadowRadius: 28,
    elevation: 18,
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: -80,
    bottom: -80,
    width: 96,
    backgroundColor: '#FFF7CE',
  },
  hero: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 0,
    borderColor: 'rgba(247, 199, 95, 0.22)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    paddingHorizontal: 16,
    paddingTop: 17,
    paddingBottom: 15,
    alignItems: 'center',
    marginBottom: 11,
  },
  iconHalo: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247, 199, 95, 0.13)',
    marginBottom: 10,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  releasePill: {
    minHeight: 28,
    borderRadius: 14,
    borderWidth: 0,
    borderColor: 'rgba(249, 215, 122, 0.34)',
    backgroundColor: 'rgba(249, 215, 122, 0.08)',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
  },
  releasePillText: {
    color: '#F9D77A',
    fontWeight: '800',
  },
  title: {
    textAlign: 'center',
    color: '#FFF7E3',
    fontWeight: '900',
    lineHeight: 28,
    marginBottom: 7,
  },
  subtitle: {
    color: '#C8D6EA',
    textAlign: 'center',
    lineHeight: 22,
  },
  chipsWrap: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    width: '100%',
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 0,
    borderColor: 'rgba(125, 146, 178, 0.23)',
    backgroundColor: 'rgba(255,255,255,0.052)',
    paddingHorizontal: 9,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#74A9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    color: '#DCE8FF',
    fontWeight: '700',
    lineHeight: 17,
    flexShrink: 1,
  },
  scroll: {
    alignSelf: 'stretch',
    flex: 1,
    marginBottom: 4,
  },
  scrollInner: {
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  body: {
    color: '#DDE7F6',
    textAlign: 'left',
    lineHeight: 23,
    marginBottom: 15,
  },
  premiumBlock: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(249, 215, 122, 0.38)',
    backgroundColor: 'rgba(249, 215, 122, 0.1)',
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 15,
  },
  premiumBlockIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F9D77A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  premiumBlockText: {
    flex: 1,
    color: '#FFE9A8',
    fontWeight: '800',
    lineHeight: 23,
  },
  btn: {
    width: '100%',
    borderRadius: 16,
    marginTop: 12,
    overflow: 'hidden',
    shadowColor: '#F7BE4F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    elevation: Platform.OS === 'android' ? 3 : 0,
  },
  btnGradient: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  btnText: {
    color: '#121826',
    fontWeight: '900',
    textAlign: 'center',
  },
});
