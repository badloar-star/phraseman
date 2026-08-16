// ═══════════════════════════════════════════════════════════════════════════
// TournamentWelcomeModal.tsx — приветственный модал раздела «Турниры».
//
// зачем 2026-08-04 (владелец: «первый раз открыл раздел турниры — красивый
// анимированный модал с объяснением, что это и что за это дают, один раз
// после онбординга и больше никогда, у старых игроков тоже»): показывается
// РОВНО один раз на устройство (флаг в tournament_welcome_seen.ts), поверх
// уже открытого хаба турниров — второй Modal поверх первого, без навигации.
//
// Анимация входа собственная (spring scale + пара звёзд по дуге), а не через
// общий TournamentFxHost — тот висит постоянным absolute-слоем поверх экрана
// и заводить его ради одного одноразового показа не имеет смысла.
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { FlowText } from '../text-integrity';
import { StarGlyph } from './TournamentFx';
import { V2Cta } from './tournament_v2_ui';
import { METAL, radius, useTournamentPalette } from './tournament_theme';
import { noAndroidOutline } from '../../constants/androidGlow';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';
import FullscreenHybridEntrance from '../feedback/FullscreenHybridEntrance';

type Props = {
  visible: boolean;
  onClose: () => void;
  /**
   * зачем: гибрид «Световод + Чекан» (.motion-mockups/phraseman-hybrid.html,
   * семья «Полноэкранные») — сцена входит из света, контент каскадом. Боевой
   * дефолт — 'classic', ничего не меняется без явного включения.
   */
  motionVariant?: 'classic' | 'hybrid';
};

/** Одна декоративная звезда, влетающая по дуге с задержкой и лёгким дрожанием. */
const DriftStar = memo(function DriftStar({
  delay, dx, size, color, reduceMotion,
}: { delay: number; dx: number; size: number; color: string; reduceMotion: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) { progress.value = 1; return; }
    progress.value = withDelay(delay, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [progress, delay, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    // зачем 2026-08-04 (аудит): progress идёт 0→1 через withTiming и никогда не
    // превышает 1 — ветка «затухания» ниже была мёртвой (1 - (p - 1) при p<=1
    // всегда >= 1, то есть просто клампилась бы визуально в непрозрачность).
    // Звёзды остаются полностью видимыми после влёта — это и есть задуманное
    // поведение (декор рядом со значком, не разовая вспышка).
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * 26 },
      { translateX: dx * (1 - progress.value) },
      { scale: 0.6 + progress.value * 0.4 },
      { rotate: `${(1 - progress.value) * -40}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.driftStar, style]} pointerEvents="none">
      <StarGlyph size={size} color={color} />
    </Animated.View>
  );
});

/**
 * Приветственный модал раздела «Турниры».
 *
 * зачем: заголовок и подача текста утверждены владельцем в живом обсуждении —
 * не парафраз механики, а живой рассказ, сверенный с фактами (16 игроков в
 * комнате, 4 раунда, банк недели делят призовые места, пропуск сезона растёт
 * от участия). Цифры не хардкодить заново без сверки с tournament_client.ts /
 * season_pass_model.ts, если владелец попросит поменять текст.
 */
export const TournamentWelcomeModal = memo(function TournamentWelcomeModal({ visible, onClose, motionVariant = 'classic' }: Props) {
  const P = useTournamentPalette();
  const { lang } = useLang();
  const reduceMotion = useReducedMotion();
  const isHybrid = motionVariant === 'hybrid';
  const cardScale = useSharedValue(reduceMotion ? 1 : 0.86);
  const cardOpacity = useSharedValue(reduceMotion || isHybrid ? 1 : 0);

  useEffect(() => {
    if (!visible || isHybrid) return;
    if (reduceMotion) {
      cardScale.value = 1;
      cardOpacity.value = 1;
      return;
    }
    cardOpacity.value = withTiming(1, { duration: 220 });
    cardScale.value = withSequence(
      withTiming(1.03, { duration: 260, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 14, stiffness: 220 }),
    );
  }, [visible, reduceMotion, isHybrid, cardScale, cardOpacity]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const badgeSlot = (
    <View style={styles.badgeRow}>
      <LinearGradient colors={METAL.gold} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={styles.badge}>
        <StarGlyph size={26} color={METAL.ink} />
      </LinearGradient>
      <DriftStar delay={80} dx={-34} size={14} color={P.gold} reduceMotion={reduceMotion} />
      <DriftStar delay={180} dx={30} size={11} color={P.accent} reduceMotion={reduceMotion} />
    </View>
  );

  const titleSlot = (
    <FlowText
      testID="tournament-welcome-title"
      provenance="authored"
      style={[styles.title, { color: P.text }]}
    >
      {triLang(lang, { ru: 'Турниры', uk: 'Турніри', es: 'Torneos', 'pt-BR': 'Torneios', vi: 'Giải đấu', id: 'Turnamen', tr: 'Turnuvalar', pl: 'Turnieje' })}
    </FlowText>
  );

  // зачем 2026-08-04 (аудит): был обычный Text — text-integrity гвард
  // покрывал только короткий заголовок и пропускал самый длинный и
  // самый уязвимый к обрезке текст в модале. FlowText переносит
  // вместо обрезки на крупных системных шрифтах.
  const bodySlot = (
    <FlowText
      testID="tournament-welcome-body"
      provenance="authored"
      style={[styles.body, { color: P.muted }]}
    >
      {triLang(lang, {
        ru: 'Добро пожаловать туда, где не только вы стараетесь. 16 игроков, 4 раунда, и никто не будет ждать, пока вы вспомните нужное слово — соперники отвечают прямо сейчас. Звучит жёстко, но на деле это самый живой способ проверить себя.\n\nПризовое место в соревновании приносит жемчужины. А само участие — очки в пропуск сезона, отдельную дорожку с 60 подарками, которая копится тихонько, пока вы просто соревнуетесь время от времени.',
        uk: 'Ласкаво просимо туди, де стараєтеся не лише ви. 16 гравців, 4 раунди, і ніхто не чекатиме, поки ви згадаєте потрібне слово — суперники відповідають просто зараз. Звучить жорстко, але це найживіший спосіб перевірити себе.\n\nПризове місце приносить перлини. А участь — очки до сезонного пропуску, окремої доріжки з 60 подарунками, яка поступово накопичується, поки ви час від часу змагаєтесь.',
        es: 'Te damos la bienvenida a un lugar donde no eres la única persona que se esfuerza. Hay 16 jugadores y 4 rondas; nadie esperará mientras recuerdas la palabra correcta: los rivales responden ahora mismo. Suena intenso, pero es la forma más viva de ponerte a prueba.\n\nUn puesto premiado te da perlas. Y participar suma puntos para el pase de temporada, una ruta aparte con 60 regalos que avanza mientras compites de vez en cuando.',
        'pt-BR': 'Boas-vindas a um lugar onde você não é a única pessoa se esforçando. São 16 jogadores, 4 rodadas, e ninguém vai esperar enquanto você lembra a palavra certa — os adversários respondem agora. Parece intenso, mas é a maneira mais dinâmica de se testar.\n\nUma colocação premiada rende pérolas. E participar dá pontos para o passe de temporada, uma trilha separada com 60 presentes que avança enquanto você compete de vez em quando.',
        vi: 'Chào mừng bạn đến nơi không chỉ mình bạn đang cố gắng. Có 16 người chơi, 4 vòng và không ai chờ bạn nhớ ra từ cần thiết — đối thủ đang trả lời ngay lúc này. Nghe có vẻ căng thẳng, nhưng đây là cách sống động nhất để thử sức mình.\n\nVị trí có giải mang lại ngọc trai. Còn việc tham gia sẽ cộng điểm cho vé mùa giải, một hành trình riêng với 60 phần quà tiến dần khi bạn thi đấu thỉnh thoảng.',
        id: 'Selamat datang di tempat yang bukan hanya kamu yang berusaha. Ada 16 pemain, 4 ronde, dan tidak ada yang akan menunggu saat kamu mengingat kata yang tepat — lawan menjawab sekarang. Kedengarannya menantang, tetapi inilah cara paling seru untuk menguji diri.\n\nPosisi berhadiah memberi mutiara. Keikutsertaan juga memberi poin untuk tiket musim, jalur terpisah dengan 60 hadiah yang bertambah saat kamu sesekali bertanding.',
        tr: 'Sadece sizin çaba göstermediğiniz yere hoş geldiniz. 16 oyuncu, 4 tur var ve siz doğru kelimeyi hatırlarken kimse beklemeyecek — rakipler şu anda cevap veriyor. Zor görünüyor, ama kendinizi sınamanın en canlı yolu bu.\n\nDereceye girmeniz inci kazandırır. Katılım ise sezon biletine puan ekler; ara sıra yarışırken ilerleyen 60 hediyelik ayrı bir yol.',
        pl: 'Witamy w miejscu, w którym nie tylko Ty się starasz. Jest 16 graczy, 4 rundy i nikt nie będzie czekał, aż przypomnisz sobie właściwe słowo — rywale odpowiadają właśnie teraz. Brzmi ostro, ale to najżywszy sposób, by sprawdzić siebie.\n\nMiejsce na podium przynosi perły. Sam udział daje punkty do przepustki sezonowej — osobnej ścieżki z 60 nagrodami, która rośnie, gdy od czasu do czasu rywalizujesz.',
      })}
    </FlowText>
  );

  const actionsSlot = (
    <View style={styles.actions}>
      <V2Cta tone="gold" onPress={onClose}>{triLang(lang, { ru: 'Понятно, погнали', uk: 'Зрозуміло, почнімо', es: 'Entendido, vamos', 'pt-BR': 'Entendi, vamos lá', vi: 'Đã hiểu, bắt đầu thôi', id: 'Mengerti, ayo mulai', tr: 'Anladım, başlayalım', pl: 'Rozumiem, zaczынajmy' })}</V2Cta>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType={isHybrid ? 'none' : 'fade'} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })} />
        <Animated.View style={[styles.card, cardStyle]}>
          <LinearGradient
            colors={[P.surfaceGradA, P.surfaceGradB]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.topHi, { backgroundColor: P.chipHi }]} pointerEvents="none" />

          {isHybrid ? (
            <FullscreenHybridEntrance visible={visible} bloomColor={P.gold} slots={[badgeSlot, titleSlot, bodySlot, actionsSlot]} />
          ) : (
            <>
              {badgeSlot}
              {titleSlot}
              {bodySlot}
              {actionsSlot}
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3,6,4,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.lg + 4,
    overflow: 'hidden',
    padding: 24,
    alignItems: 'center',
    // guard-ok: модал рендерится максимум один раз за жизнь установки
    // (флаг tournament_welcome_seen_v1) — тень не в горячем цикле, но радиус
    // всё равно снижен вдвое против типовых 26px карточек: тень статична, не
    // выигрывает от лишних пикселей размытия, а на Android дешевле считается.
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    ...noAndroidOutline,
  },
  topHi: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  badgeRow: {
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driftStar: {
    position: 'absolute',
  },
  title: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.2,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 14.5,
    fontWeight: '600',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 22,
  },
  actions: {
    alignSelf: 'stretch',
  },
});
